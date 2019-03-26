"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const request_1 = tslib_1.__importDefault(require("request"));
const Url = tslib_1.__importStar(require("url"));
const _ = tslib_1.__importStar(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const child_process_1 = require("child_process");
const log = require('log4js').getLogger(__api_1.default.packageName + '.fetch-remote');
const pm2InstanceId = process.env.NODE_APP_INSTANCE;
const isPm2 = cluster_1.default.isWorker && pm2InstanceId != null;
const isMainProcess = !isPm2 || pm2InstanceId === '0';
let setting;
// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum = {
    version: Number.NEGATIVE_INFINITY,
    path: '',
    versions: {}
};
const currChecksumFile = __api_1.default.config.resolve('destDir', 'assets-processer.checksum.json');
let timer;
let stopped = false;
let errCount = 0;
function start(serveStaticZip) {
    setting = __api_1.default.config.get(__api_1.default.packageName);
    const fetchUrl = setting.fetchUrl;
    if (fetchUrl == null) {
        log.info('No fetchUrl configured, skip fetching resource.');
        return Promise.resolve();
    }
    if (setting.downloadMode !== 'memory' && !isMainProcess) {
        // non inMemory mode means extracting zip file to local directory dist/static,
        // in case of cluster mode, we only want single process do zip extracting and file writing task to avoid conflict.
        log.info('This process is not main process');
        return;
    }
    if (setting.fetchRetry == null)
        setting.fetchRetry = 3;
    if (fs_extra_1.default.existsSync(currChecksumFile)) {
        currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(currChecksumFile));
        log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
    }
    return runRepeatly(setting, setting.downloadMode === 'memory' ? serveStaticZip : null);
}
exports.start = start;
/**
 * It seems ok to quit process without calling this function
 */
function stop() {
    stopped = true;
    if (timer) {
        clearTimeout(timer);
    }
}
exports.stop = stop;
function runRepeatly(setting, szip) {
    if (stopped)
        return Promise.resolve();
    return run(setting, szip)
        .catch(error => log.error(error))
        .then(() => {
        if (stopped)
            return;
        timer = setTimeout(() => {
            runRepeatly(setting, szip);
        }, setting.fetchIntervalSec * 1000);
    });
}
function run(setting, szip) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let checksumObj;
        try {
            checksumObj = yield retry(fetch, setting.fetchUrl);
        }
        catch (err) {
            if (errCount++ % setting.fetchLogErrPerTimes === 0) {
                throw err;
            }
            return;
        }
        if (checksumObj == null)
            return;
        if (checksumObj.changeFetchUrl) {
            setting.fetchUrl = checksumObj.changeFetchUrl;
            log.info('Change fetch URL to', setting.fetchUrl);
        }
        let downloaded = false;
        if (checksumObj.version != null && currentChecksum.version !== checksumObj.version) {
            yield downloadZip(checksumObj.path, szip);
            downloaded = true;
            currentChecksum.version = checksumObj.version;
        }
        if (checksumObj.versions) {
            const currVersions = currentChecksum.versions;
            const targetVersions = checksumObj.versions;
            for (const key of Object.keys(checksumObj.versions)) {
                if (!_.has(targetVersions, key) || _.get(currVersions, [key, 'version']) !==
                    _.get(targetVersions, [key, 'version'])) {
                    yield downloadZip(targetVersions[key].path, szip);
                    currVersions[key] = targetVersions[key];
                    downloaded = true;
                }
            }
        }
        if (downloaded) {
            // fs.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, ' '), 'utf8');
            __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded');
        }
    });
}
// let downloadCount = 0;
function downloadZip(path, szip) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        // log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
        const resource = Url.resolve(setting.fetchUrl, path + '?' + Math.random());
        const downloadTo = __api_1.default.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        log.info('fetch', resource);
        if (szip) {
            log.info('downloading zip content to memory...');
            yield retry(() => {
                return new Promise((resolve, rej) => {
                    request_1.default({
                        uri: resource, method: 'GET', encoding: null
                    }, (err, res, body) => {
                        if (err) {
                            return rej(err);
                        }
                        if (res.statusCode > 299 || res.statusCode < 200)
                            return rej(new Error(res.statusCode + ' ' + res.statusMessage));
                        const size = body.byteLength;
                        log.info('zip loaded, length:', size > 1024 ? Math.round(size / 1024) + 'k' : size);
                        szip.updateZip(body);
                        resolve();
                    });
                });
            });
        }
        else if (setting.downloadMode === 'fork') {
            yield retry(forkDownloadzip, resource);
        }
        else {
            yield retry(() => {
                return new Promise((resolve, rej) => {
                    request_1.default.get(resource).on('error', err => {
                        rej(err);
                    })
                        .pipe(fs_extra_1.default.createWriteStream(downloadTo))
                        .on('finish', () => setTimeout(resolve, 100));
                });
            });
            const zip = new adm_zip_1.default(downloadTo);
            let retryCount = 0;
            do {
                try {
                    log.info('extract %s', downloadTo);
                    yield tryExtract();
                    log.info(`extract ${downloadTo} done`);
                    fs_extra_1.default.unlinkSync(downloadTo);
                    // tslint:disable-next-line
                    // log.info(`${os.hostname()} ${os.userInfo().username} download done[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
                    break;
                }
                catch (ex) {
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
            } while (++retryCount <= 3);
            if (retryCount > 3) {
                log.info('Give up on extracting zip');
            }
            function tryExtract() {
                return new Promise((resolve, reject) => {
                    zip.extractAllToAsync(__api_1.default.config.resolve('staticDir'), true, (err) => {
                        if (err) {
                            log.error(err);
                            if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                                // tslint:disable-next-line
                                log.info(`${os_1.default.hostname()} ${os_1.default.userInfo().username} [Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M`);
                            }
                            reject(err);
                        }
                        else
                            resolve();
                    });
                });
            }
        }
    });
}
function fetch(fetchUrl) {
    const checkUrl = fetchUrl + '?' + Math.random();
    log.debug('check', checkUrl);
    return new Promise((resolve, rej) => {
        request_1.default.get(checkUrl, { headers: { Referer: Url.resolve(checkUrl, '/') } }, (error, response, body) => {
            if (error) {
                return rej(new Error(error));
            }
            if (response.statusCode < 200 || response.statusCode > 302) {
                return rej(new Error(`status code ${response.statusCode}\nresponse:\n${response}\nbody:\n${body}`));
            }
            try {
                if (typeof body === 'string')
                    body = JSON.parse(body);
            }
            catch (ex) {
                rej(ex);
            }
            resolve(body);
        });
    });
}
function retry(func, ...args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        for (let cnt = 0;;) {
            try {
                return yield func(...args);
            }
            catch (err) {
                cnt++;
                if (cnt >= setting.fetchRetry) {
                    throw err;
                }
                log.warn(err);
                log.info('Encounter error, will retry');
            }
            yield new Promise(res => setTimeout(res, cnt * 5000));
        }
    });
}
function forkDownloadzip(resource) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let extractingDone = false;
            const child = child_process_1.fork('node_modules/' + __api_1.default.packageName + '/dist/download-zip-process.js', [resource, __api_1.default.config.resolve('staticDir'), setting.fetchRetry + ''], {
                silent: true
            });
            child.on('error', err => {
                log.error(err);
                reject(output);
            });
            child.on('exit', (code, signal) => {
                log.info('zip download process exit with: %d - %s', code, signal);
                if (code !== 0) {
                    log.info(code);
                    if (extractingDone) {
                        return resolve(output);
                    }
                    log.error('exit with error code %d - "%s"', JSON.stringify(code), signal);
                    if (output)
                        log.error(`[child process][pid:${child.pid}]`, output);
                    reject(output);
                }
                else {
                    log.info('"%s" download process done successfully,', resource, output);
                    resolve(output);
                }
            });
            let output = '';
            child.stdout.setEncoding('utf-8');
            child.stdout.on('data', (chunk) => {
                output += chunk;
            });
            child.stderr.setEncoding('utf-8');
            child.stderr.on('data', (chunk) => {
                output += chunk;
            });
            child.on('message', msg => {
                if (msg.log) {
                    log.info('[child process]', msg.log);
                    return;
                }
                else if (msg.done) {
                    extractingDone = true;
                }
                else if (msg.error) {
                    log.error(msg.error);
                }
            });
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFDMUIsOERBQThCO0FBRTlCLGlEQUFtQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUM7QUFFM0UsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNwRCxNQUFNLEtBQUssR0FBRyxpQkFBTyxDQUFDLFFBQVEsSUFBSSxhQUFhLElBQUksSUFBSSxDQUFDO0FBQ3hELE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBSyxJQUFJLGFBQWEsS0FBSyxHQUFHLENBQUM7QUFvQnRELElBQUksT0FBZ0IsQ0FBQztBQUNyQixzREFBc0Q7QUFDdEQsSUFBSSxlQUFlLEdBQWE7SUFDL0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7SUFDakMsSUFBSSxFQUFFLEVBQUU7SUFDUixRQUFRLEVBQUUsRUFBRTtDQUNaLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3pGLElBQUksS0FBbUIsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBRWpCLFNBQWdCLEtBQUssQ0FBQyxjQUFxQztJQUMxRCxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLE1B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LE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUN6QixJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7b0JBQ1osR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JDLE9BQU87aUJBQ1A7cUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUNwQixjQUFjLEdBQUcsSUFBSSxDQUFDO2lCQUN0QjtxQkFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7b0JBQ3JCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNyQjtZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IEFkbVppcCBmcm9tICdhZG0temlwJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcbmltcG9ydCB7WmlwUmVzb3VyY2VNaWRkbGV3YXJlfSBmcm9tICdzZXJ2ZS1zdGF0aWMtemlwJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3QgcG0ySW5zdGFuY2VJZCA9IHByb2Nlc3MuZW52Lk5PREVfQVBQX0lOU1RBTkNFO1xuY29uc3QgaXNQbTIgPSBjbHVzdGVyLmlzV29ya2VyICYmIHBtMkluc3RhbmNlSWQgIT0gbnVsbDtcbmNvbnN0IGlzTWFpblByb2Nlc3MgPSAhaXNQbTIgfHwgcG0ySW5zdGFuY2VJZCA9PT0gJzAnO1xuXG5pbnRlcmZhY2UgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9uOiBudW1iZXI7XG5cdHBhdGg6IHN0cmluZztcblx0Y2hhbmdlRmV0Y2hVcmw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDaGVja3N1bSBleHRlbmRzIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbnM/OiB7W2tleTogc3RyaW5nXToge3ZlcnNpb246IG51bWJlciwgcGF0aDogc3RyaW5nfX07XG59XG5cbmludGVyZmFjZSBTZXR0aW5nIHtcblx0ZmV0Y2hVcmw6IHN0cmluZztcblx0ZmV0Y2hSZXRyeTogbnVtYmVyO1xuXHRmZXRjaExvZ0VyclBlclRpbWVzOiBudW1iZXI7XG5cdGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcblx0ZG93bmxvYWRNb2RlOiAnbWVtb3J5JyB8ICdmb3JrJyB8IG51bGw7XG59XG5cbmxldCBzZXR0aW5nOiBTZXR0aW5nO1xuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5sZXQgY3VycmVudENoZWNrc3VtOiBDaGVja3N1bSA9IHtcblx0dmVyc2lvbjogTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuXHRwYXRoOiAnJyxcblx0dmVyc2lvbnM6IHt9XG59O1xuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2Fzc2V0cy1wcm9jZXNzZXIuY2hlY2tzdW0uanNvbicpO1xubGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG5sZXQgc3RvcHBlZCA9IGZhbHNlO1xubGV0IGVyckNvdW50ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KHNlcnZlU3RhdGljWmlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0c2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cdGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcblx0aWYgKGZldGNoVXJsID09IG51bGwpIHtcblx0XHRsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgIT09ICdtZW1vcnknICAmJiAhaXNNYWluUHJvY2Vzcykge1xuXHRcdC8vIG5vbiBpbk1lbW9yeSBtb2RlIG1lYW5zIGV4dHJhY3RpbmcgemlwIGZpbGUgdG8gbG9jYWwgZGlyZWN0b3J5IGRpc3Qvc3RhdGljLFxuXHRcdC8vIGluIGNhc2Ugb2YgY2x1c3RlciBtb2RlLCB3ZSBvbmx5IHdhbnQgc2luZ2xlIHByb2Nlc3MgZG8gemlwIGV4dHJhY3RpbmcgYW5kIGZpbGUgd3JpdGluZyB0YXNrIHRvIGF2b2lkIGNvbmZsaWN0LlxuXHRcdGxvZy5pbmZvKCdUaGlzIHByb2Nlc3MgaXMgbm90IG1haW4gcHJvY2VzcycpO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChzZXR0aW5nLmZldGNoUmV0cnkgPT0gbnVsbClcblx0XHRzZXR0aW5nLmZldGNoUmV0cnkgPSAzO1xuXHRpZiAoZnMuZXhpc3RzU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSkge1xuXHRcdGN1cnJlbnRDaGVja3N1bSA9IE9iamVjdC5hc3NpZ24oY3VycmVudENoZWNrc3VtLCBmcy5yZWFkSlNPTlN5bmMoY3VyckNoZWNrc3VtRmlsZSkpO1xuXHRcdGxvZy5pbmZvKCdGb3VuZCBzYXZlZCBjaGVja3N1bSBmaWxlIGFmdGVyIHJlYm9vdFxcbicsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJykpO1xuXHR9XG5cdHJldHVybiBydW5SZXBlYXRseShzZXR0aW5nLCBzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ21lbW9yeScgPyBzZXJ2ZVN0YXRpY1ppcCA6IG51bGwpO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcblx0c3RvcHBlZCA9IHRydWU7XG5cdGlmICh0aW1lcikge1xuXHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdH1cbn1cblxuZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKTogUHJvbWlzZTx2b2lkPiB7XG5cdGlmIChzdG9wcGVkKVxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0cmV0dXJuIHJ1bihzZXR0aW5nLCBzemlwKVxuXHQuY2F0Y2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSlcblx0LnRoZW4oKCkgPT4ge1xuXHRcdGlmIChzdG9wcGVkKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRydW5SZXBlYXRseShzZXR0aW5nLCBzemlwKTtcblx0XHR9LCBzZXR0aW5nLmZldGNoSW50ZXJ2YWxTZWMgKiAxMDAwKTtcblx0fSk7XG59XG5hc3luYyBmdW5jdGlvbiBydW4oc2V0dGluZzogU2V0dGluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG5cdGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG5cdHRyeSB7XG5cdFx0Y2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcblx0XHRyZXR1cm47XG5cblx0aWYgKGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsKSB7XG5cdFx0c2V0dGluZy5mZXRjaFVybCA9IGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsO1xuXHRcdGxvZy5pbmZvKCdDaGFuZ2UgZmV0Y2ggVVJMIHRvJywgc2V0dGluZy5mZXRjaFVybCk7XG5cdH1cblx0bGV0IGRvd25sb2FkZWQgPSBmYWxzZTtcblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb24gIT0gbnVsbCAmJiBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiAhPT0gY2hlY2tzdW1PYmoudmVyc2lvbikge1xuXHRcdGF3YWl0IGRvd25sb2FkWmlwKGNoZWNrc3VtT2JqLnBhdGgsIHN6aXApO1xuXHRcdGRvd25sb2FkZWQgPSB0cnVlO1xuXHRcdGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uID0gY2hlY2tzdW1PYmoudmVyc2lvbjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcblx0XHRjb25zdCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG5cdFx0Y29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjaGVja3N1bU9iai52ZXJzaW9ucykpIHtcblx0XHRcdGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cblx0XHRcdFx0Xy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG5cdFx0XHRcdFx0YXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoLCBzemlwKTtcblx0XHRcdFx0XHRjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG5cdFx0XHRcdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZG93bmxvYWRlZCkge1xuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICcpLCAndXRmOCcpO1xuXHRcdGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xuXHR9XG59XG5cbi8vIGxldCBkb3dubG9hZENvdW50ID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAocGF0aDogc3RyaW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdC8vIGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgemlwW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0Y29uc3QgcmVzb3VyY2UgPSBVcmwucmVzb2x2ZSggc2V0dGluZy5mZXRjaFVybCwgcGF0aCArICc/JyArIE1hdGgucmFuZG9tKCkpO1xuXHRjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuXHRsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdGlmIChzemlwKSB7XG5cdFx0bG9nLmluZm8oJ2Rvd25sb2FkaW5nIHppcCBjb250ZW50IHRvIG1lbW9yeS4uLicpO1xuXG5cdFx0YXdhaXQgcmV0cnkoKCkgPT4ge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdFx0cmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJpOiByZXNvdXJjZSwgbWV0aG9kOiAnR0VUJywgZW5jb2Rpbmc6IG51bGxcblx0XHRcdFx0fSwgKGVyciwgcmVzLCBib2R5KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlaihlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocmVzLnN0YXR1c0NvZGUgPiAyOTkgfHwgcmVzLnN0YXR1c0NvZGUgPCAyMDApXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG5cdFx0XHRcdFx0Y29uc3Qgc2l6ZSA9IChib2R5IGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aDtcblx0XHRcdFx0XHRsb2cuaW5mbygnemlwIGxvYWRlZCwgbGVuZ3RoOicsIHNpemUgPiAxMDI0ID8gTWF0aC5yb3VuZChzaXplIC8gMTAyNCkgKyAnaycgOiBzaXplKTtcblx0XHRcdFx0XHRzemlwLnVwZGF0ZVppcChib2R5KTtcblx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuXHRcdGF3YWl0IHJldHJ5PHN0cmluZz4oZm9ya0Rvd25sb2FkemlwLCByZXNvdXJjZSk7XG5cdH0gZWxzZSB7XG5cdFx0YXdhaXQgcmV0cnkoKCkgPT4ge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdFx0cmVxdWVzdC5nZXQocmVzb3VyY2UpLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRcdFx0cmVqKGVycik7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRvd25sb2FkVG8pKVxuXHRcdFx0XHQub24oJ2ZpbmlzaCcsICgpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGRvd25sb2FkVG8pO1xuXHRcdGxldCByZXRyeUNvdW50ID0gMDtcblx0XHRkbyB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsb2cuaW5mbygnZXh0cmFjdCAlcycsIGRvd25sb2FkVG8pO1xuXHRcdFx0XHRhd2FpdCB0cnlFeHRyYWN0KCk7XG5cdFx0XHRcdGxvZy5pbmZvKGBleHRyYWN0ICR7ZG93bmxvYWRUb30gZG9uZWApO1xuXHRcdFx0XHRmcy51bmxpbmtTeW5jKGRvd25sb2FkVG8pO1xuXHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCBkb25lW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuXHRcdFx0fVxuXHRcdH0gd2hpbGUgKCsrcmV0cnlDb3VudCA8PTMpO1xuXHRcdGlmIChyZXRyeUNvdW50ID4gMykge1xuXHRcdFx0bG9nLmluZm8oJ0dpdmUgdXAgb24gZXh0cmFjdGluZyB6aXAnKTtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gdHJ5RXh0cmFjdCgpIHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdHppcC5leHRyYWN0QWxsVG9Bc3luYyhhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLCB0cnVlLCAoZXJyKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRcdFx0XHRpZiAoKGVyciBhcyBhbnkpLmNvZGUgPT09ICdFTk9NRU0nIHx8IGVyci50b1N0cmluZygpLmluZGV4T2YoJ25vdCBlbm91Z2ggbWVtb3J5JykgPj0gMCkge1xuXHRcdFx0XHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0XHRcdFx0bG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0fSBlbHNlXG5cdFx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGZldGNoKGZldGNoVXJsOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRjb25zdCBjaGVja1VybCA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcblx0bG9nLmRlYnVnKCdjaGVjaycsIGNoZWNrVXJsKTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRyZXF1ZXN0LmdldChjaGVja1VybCxcblx0XHRcdHtoZWFkZXJzOiB7UmVmZXJlcjogVXJsLnJlc29sdmUoY2hlY2tVcmwsICcvJyl9fSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiByZXF1ZXN0LlJlc3BvbnNlLCBib2R5OiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihlcnJvcikpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+IDMwMikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihgc3RhdHVzIGNvZGUgJHtyZXNwb25zZS5zdGF0dXNDb2RlfVxcbnJlc3BvbnNlOlxcbiR7cmVzcG9uc2V9XFxuYm9keTpcXG4ke2JvZHl9YCkpO1xuXHRcdFx0fVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdHJlaihleCk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKGJvZHkpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuXHRmb3IgKGxldCBjbnQgPSAwOzspIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjbnQrKztcblx0XHRcdGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGxvZy53YXJuKGVycik7XG5cdFx0XHRsb2cuaW5mbygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG5cdFx0fVxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgY250ICogNTAwMCkpO1xuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtEb3dubG9hZHppcChyZXNvdXJjZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0cmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGxldCBleHRyYWN0aW5nRG9uZSA9IGZhbHNlO1xuXHRcdGNvbnN0IGNoaWxkID0gZm9yaygnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZG93bmxvYWQtemlwLXByb2Nlc3MuanMnLFxuXHRcdFx0W3Jlc291cmNlLCBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLCBzZXR0aW5nLmZldGNoUmV0cnkgKyAnJ10sIHtcblx0XHRcdHNpbGVudDogdHJ1ZVxuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdHJlamVjdChvdXRwdXQpO1xuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuXHRcdFx0bG9nLmluZm8oJ3ppcCBkb3dubG9hZCBwcm9jZXNzIGV4aXQgd2l0aDogJWQgLSAlcycsIGNvZGUsIHNpZ25hbCk7XG5cdFx0XHRpZiAoY29kZSAhPT0gMCkge1xuXHRcdFx0XHRsb2cuaW5mbyhjb2RlKTtcblx0XHRcdFx0aWYgKGV4dHJhY3RpbmdEb25lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc29sdmUob3V0cHV0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2cuZXJyb3IoJ2V4aXQgd2l0aCBlcnJvciBjb2RlICVkIC0gXCIlc1wiJywgSlNPTi5zdHJpbmdpZnkoY29kZSksIHNpZ25hbCk7XG5cdFx0XHRcdGlmIChvdXRwdXQpXG5cdFx0XHRcdFx0bG9nLmVycm9yKGBbY2hpbGQgcHJvY2Vzc11bcGlkOiR7Y2hpbGQucGlkfV1gLCBvdXRwdXQpO1xuXHRcdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdcIiVzXCIgZG93bmxvYWQgcHJvY2VzcyBkb25lIHN1Y2Nlc3NmdWxseSwnLCByZXNvdXJjZSwgb3V0cHV0KTtcblx0XHRcdFx0cmVzb2x2ZShvdXRwdXQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGxldCBvdXRwdXQgPSAnJztcblx0XHRjaGlsZC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0Y2hpbGQuc3Rkb3V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG5cdFx0XHRvdXRwdXQgKz0gY2h1bms7XG5cdFx0fSk7XG5cdFx0Y2hpbGQuc3RkZXJyLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdGNoaWxkLnN0ZGVyci5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0b3V0cHV0ICs9IGNodW5rO1xuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdtZXNzYWdlJywgbXNnID0+IHtcblx0XHRcdGlmIChtc2cubG9nKSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdbY2hpbGQgcHJvY2Vzc10nLCBtc2cubG9nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIGlmIChtc2cuZG9uZSkge1xuXHRcdFx0XHRleHRyYWN0aW5nRG9uZSA9IHRydWU7XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5lcnJvcikge1xuXHRcdFx0XHRsb2cuZXJyb3IobXNnLmVycm9yKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG59XG4iXX0=
