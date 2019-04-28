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
        if (setting.downloadMode === 'fork') {
            const files = fs_extra_1.default.readdirSync(__api_1.default.config.resolve('destDir'));
            if (files.filter(name => name.startsWith('download-update-')).length > 0) {
                yield retry(20, forkExtractExstingZip);
                __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded');
            }
        }
        let checksumObj;
        try {
            checksumObj = yield retry(setting.fetchRetry, fetch, setting.fetchUrl);
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
            if (setting.downloadMode === 'fork') {
                yield retry(20, forkExtractExstingZip);
            }
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
            yield retry(setting.fetchRetry, () => {
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
            yield retry(setting.fetchRetry, forkDownloadzip, resource);
        }
        else {
            yield retry(setting.fetchRetry, () => {
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
function retry(times, func, ...args) {
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
            yield new Promise(res => setTimeout(res, cnt * 500));
        }
    });
}
function forkDownloadzip(resource) {
    return forkProcess('download ' + resource, 'node_modules/' + __api_1.default.packageName + '/dist/download-zip-process.js', [
        resource, __api_1.default.config.resolve('destDir'), setting.fetchRetry + ''
    ]);
}
function forkExtractExstingZip() {
    return forkProcess('check and extract zip', 'node_modules/' + __api_1.default.packageName + '/dist/extract-zip-process.js', [
        __api_1.default.config.resolve('destDir'), __api_1.default.config.resolve('staticDir')
    ]);
}
exports.forkExtractExstingZip = forkExtractExstingZip;
function forkProcess(name, filePath, args) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let extractingDone = false;
            const child = child_process_1.fork(filePath, args, {
                silent: true
            });
            child.on('message', msg => {
                if (msg.log) {
                    log.info('[child process] %s - %s', name, msg.log);
                    return;
                }
                else if (msg.done) {
                    extractingDone = true;
                }
                else if (msg.error) {
                    log.error(msg.error);
                }
            });
            child.on('error', err => {
                log.error(err);
                reject(output);
            });
            child.on('exit', (code, signal) => {
                log.info('process [%s] %s exit with: %d - %s', child.pid, name, code, signal);
                if (code !== 0) {
                    if (extractingDone) {
                        return resolve(output);
                    }
                    log.error('exit with error code %d - "%s"', JSON.stringify(code), signal);
                    if (output)
                        log.error(`[child process][pid:${child.pid}]${name} - `, output);
                    reject(output);
                }
                else {
                    log.info('process "%s" done successfully,', name, output);
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
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFDMUIsOERBQThCO0FBRTlCLGlEQUFtQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUM7QUFFM0UsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNwRCxNQUFNLEtBQUssR0FBRyxpQkFBTyxDQUFDLFFBQVEsSUFBSSxhQUFhLElBQUksSUFBSSxDQUFDO0FBQ3hELE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBSyxJQUFJLGFBQWEsS0FBSyxHQUFHLENBQUM7QUFvQnRELElBQUksT0FBZ0IsQ0FBQztBQUNyQixzREFBc0Q7QUFDdEQsSUFBSSxlQUFlLEdBQWE7SUFDL0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7SUFDakMsSUFBSSxFQUFFLEVBQUU7SUFDUixRQUFRLEVBQUUsRUFBRTtDQUNaLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3pGLElBQUksS0FBbUIsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBRWpCLFNBQWdCLEtBQUssQ0FBQyxjQUFxQztJQUMxRCxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLE1B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QUssQ0FBQyxHQUFHLElBQUksSUFBSSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ2xFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDZjtxQkFBTTtvQkFDTixHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNoQjtZQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZScpO1xuXG5jb25zdCBwbTJJbnN0YW5jZUlkID0gcHJvY2Vzcy5lbnYuTk9ERV9BUFBfSU5TVEFOQ0U7XG5jb25zdCBpc1BtMiA9IGNsdXN0ZXIuaXNXb3JrZXIgJiYgcG0ySW5zdGFuY2VJZCAhPSBudWxsO1xuY29uc3QgaXNNYWluUHJvY2VzcyA9ICFpc1BtMiB8fCBwbTJJbnN0YW5jZUlkID09PSAnMCc7XG5cbmludGVyZmFjZSBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb246IG51bWJlcjtcblx0cGF0aDogc3RyaW5nO1xuXHRjaGFuZ2VGZXRjaFVybD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENoZWNrc3VtIGV4dGVuZHMgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9ucz86IHtba2V5OiBzdHJpbmddOiB7dmVyc2lvbjogbnVtYmVyLCBwYXRoOiBzdHJpbmd9fTtcbn1cblxuaW50ZXJmYWNlIFNldHRpbmcge1xuXHRmZXRjaFVybDogc3RyaW5nO1xuXHRmZXRjaFJldHJ5OiBudW1iZXI7XG5cdGZldGNoTG9nRXJyUGVyVGltZXM6IG51bWJlcjtcblx0ZmV0Y2hJbnRlcnZhbFNlYzogbnVtYmVyO1xuXHRkb3dubG9hZE1vZGU6ICdtZW1vcnknIHwgJ2ZvcmsnIHwgbnVsbDtcbn1cblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmxldCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3Nlci5jaGVja3N1bS5qc29uJyk7XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoc2VydmVTdGF0aWNaaXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHRzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKTtcblx0Y29uc3QgZmV0Y2hVcmwgPSBzZXR0aW5nLmZldGNoVXJsO1xuXHRpZiAoZmV0Y2hVcmwgPT0gbnVsbCkge1xuXHRcdGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXG5cdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG5cdFx0Ly8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG5cdFx0Ly8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG5cdFx0bG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuXHRcdHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cdGlmIChmcy5leGlzdHNTeW5jKGN1cnJDaGVja3N1bUZpbGUpKSB7XG5cdFx0Y3VycmVudENoZWNrc3VtID0gT2JqZWN0LmFzc2lnbihjdXJyZW50Q2hlY2tzdW0sIGZzLnJlYWRKU09OU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSk7XG5cdFx0bG9nLmluZm8oJ0ZvdW5kIHNhdmVkIGNoZWNrc3VtIGZpbGUgYWZ0ZXIgcmVib290XFxuJywgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSk7XG5cdH1cblx0cmV0dXJuIHJ1blJlcGVhdGx5KHNldHRpbmcsIHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnbWVtb3J5JyA/IHNlcnZlU3RhdGljWmlwIDogbnVsbCk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuXHRzdG9wcGVkID0gdHJ1ZTtcblx0aWYgKHRpbWVyKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0fVxufVxuXG5mdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcsIHN6aXApXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcsIHN6aXApO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblxuXHRpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuXHRcdGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJykpO1xuXHRcdGlmIChmaWxlcy5maWx0ZXIobmFtZSA9PiBuYW1lLnN0YXJ0c1dpdGgoJ2Rvd25sb2FkLXVwZGF0ZS0nKSkubGVuZ3RoID4gMCkge1xuXHRcdFx0YXdhaXQgcmV0cnkoMjAsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG5cdFx0XHRhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKTtcblx0XHR9XG5cdH1cblxuXHRsZXQgY2hlY2tzdW1PYmo6IENoZWNrc3VtO1xuXHR0cnkge1xuXHRcdGNoZWNrc3VtT2JqID0gYXdhaXQgcmV0cnkoc2V0dGluZy5mZXRjaFJldHJ5LCBmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcblx0XHRyZXR1cm47XG5cblx0aWYgKGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsKSB7XG5cdFx0c2V0dGluZy5mZXRjaFVybCA9IGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsO1xuXHRcdGxvZy5pbmZvKCdDaGFuZ2UgZmV0Y2ggVVJMIHRvJywgc2V0dGluZy5mZXRjaFVybCk7XG5cdH1cblx0bGV0IGRvd25sb2FkZWQgPSBmYWxzZTtcblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb24gIT0gbnVsbCAmJiBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiAhPT0gY2hlY2tzdW1PYmoudmVyc2lvbikge1xuXHRcdGF3YWl0IGRvd25sb2FkWmlwKGNoZWNrc3VtT2JqLnBhdGgsIHN6aXApO1xuXHRcdGRvd25sb2FkZWQgPSB0cnVlO1xuXHRcdGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uID0gY2hlY2tzdW1PYmoudmVyc2lvbjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcblx0XHRjb25zdCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG5cdFx0Y29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjaGVja3N1bU9iai52ZXJzaW9ucykpIHtcblx0XHRcdGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cblx0XHRcdFx0Xy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG5cdFx0XHRcdFx0YXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoLCBzemlwKTtcblx0XHRcdFx0XHRjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG5cdFx0XHRcdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZG93bmxvYWRlZCkge1xuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICcpLCAndXRmOCcpO1xuXHRcdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG5cdFx0XHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0XHR9XG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdH1cbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0aWYgKHN6aXApIHtcblx0XHRhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksICgpID0+IHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0XHRcdHJlcXVlc3Qoe1xuXHRcdFx0XHRcdHVyaTogcmVzb3VyY2UsIG1ldGhvZDogJ0dFVCcsIGVuY29kaW5nOiBudWxsXG5cdFx0XHRcdH0sIChlcnIsIHJlcywgYm9keSkgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdHJldHVybiByZWooZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHJlcy5zdGF0dXNDb2RlID4gMjk5IHx8IHJlcy5zdGF0dXNDb2RlIDwgMjAwKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IocmVzLnN0YXR1c0NvZGUgKyAnICcgKyByZXMuc3RhdHVzTWVzc2FnZSkpO1xuXHRcdFx0XHRcdGNvbnN0IHNpemUgPSAoYm9keSBhcyBCdWZmZXIpLmJ5dGVMZW5ndGg7XG5cdFx0XHRcdFx0bG9nLmluZm8oJ3ppcCBsb2FkZWQsIGxlbmd0aDonLCBzaXplID4gMTAyNCA/IE1hdGgucm91bmQoc2l6ZSAvIDEwMjQpICsgJ2snIDogc2l6ZSk7XG5cdFx0XHRcdFx0c3ppcC51cGRhdGVaaXAoYm9keSk7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnZm9yaycpIHtcblx0XHRhd2FpdCByZXRyeTxzdHJpbmc+KHNldHRpbmcuZmV0Y2hSZXRyeSwgZm9ya0Rvd25sb2FkemlwLCByZXNvdXJjZSk7XG5cdH0gZWxzZSB7XG5cdFx0YXdhaXQgcmV0cnkoc2V0dGluZy5mZXRjaFJldHJ5LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdFx0XHRyZXF1ZXN0LmdldChyZXNvdXJjZSkub24oJ2Vycm9yJywgZXJyID0+IHtcblx0XHRcdFx0XHRyZWooZXJyKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZG93bmxvYWRUbykpXG5cdFx0XHRcdC5vbignZmluaXNoJywgKCkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZG93bmxvYWRUbyk7XG5cdFx0bGV0IHJldHJ5Q291bnQgPSAwO1xuXHRcdGRvIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdleHRyYWN0ICVzJywgZG93bmxvYWRUbyk7XG5cdFx0XHRcdGF3YWl0IHRyeUV4dHJhY3QoKTtcblx0XHRcdFx0bG9nLmluZm8oYGV4dHJhY3QgJHtkb3dubG9hZFRvfSBkb25lYCk7XG5cdFx0XHRcdGZzLnVubGlua1N5bmMoZG93bmxvYWRUbyk7XG5cdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIGRvbmVbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG5cdFx0XHR9XG5cdFx0fSB3aGlsZSAoKytyZXRyeUNvdW50IDw9Myk7XG5cdFx0aWYgKHJldHJ5Q291bnQgPiAzKSB7XG5cdFx0XHRsb2cuaW5mbygnR2l2ZSB1cCBvbiBleHRyYWN0aW5nIHppcCcpO1xuXHRcdH1cblx0XHRmdW5jdGlvbiB0cnlFeHRyYWN0KCkge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdFx0emlwLmV4dHJhY3RBbGxUb0FzeW5jKGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyksIHRydWUsIChlcnIpID0+IHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRcdGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG5cdFx0XHRcdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRcdFx0XHRsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHR9IGVsc2Vcblx0XHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHRsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuXHRcdFx0e2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0cmVqKGV4KTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoYm9keSk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPih0aW1lczogbnVtYmVyLCBmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSBzZXR0aW5nLmZldGNoUmV0cnkpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0bG9nLndhcm4oZXJyKTtcblx0XHRcdGxvZy5pbmZvKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDApKTtcblx0fVxufVxuXG5mdW5jdGlvbiBmb3JrRG93bmxvYWR6aXAocmVzb3VyY2U6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdHJldHVybiBmb3JrUHJvY2VzcygnZG93bmxvYWQgJyArIHJlc291cmNlLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZG93bmxvYWQtemlwLXByb2Nlc3MuanMnLCBbXG5cdFx0cmVzb3VyY2UsIGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCBzZXR0aW5nLmZldGNoUmV0cnkgKyAnJ1xuXHRdKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoKSB7XG5cdHJldHVybiBmb3JrUHJvY2VzcygnY2hlY2sgYW5kIGV4dHJhY3QgemlwJywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMnLCBbXG5cdFx0YXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksIGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJylcblx0XSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10pIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGxldCBleHRyYWN0aW5nRG9uZSA9IGZhbHNlO1xuXHRcdGNvbnN0IGNoaWxkID0gZm9yayhmaWxlUGF0aCxcblx0XHRcdGFyZ3MsIHtcblx0XHRcdHNpbGVudDogdHJ1ZVxuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdtZXNzYWdlJywgbXNnID0+IHtcblx0XHRcdGlmIChtc2cubG9nKSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdbY2hpbGQgcHJvY2Vzc10gJXMgLSAlcycsIG5hbWUsIG1zZy5sb2cpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5kb25lKSB7XG5cdFx0XHRcdGV4dHJhY3RpbmdEb25lID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAobXNnLmVycm9yKSB7XG5cdFx0XHRcdGxvZy5lcnJvcihtc2cuZXJyb3IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdHJlamVjdChvdXRwdXQpO1xuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuXHRcdFx0bG9nLmluZm8oJ3Byb2Nlc3MgWyVzXSAlcyBleGl0IHdpdGg6ICVkIC0gJXMnLCBjaGlsZC5waWQsIG5hbWUsIGNvZGUsIHNpZ25hbCk7XG5cdFx0XHRpZiAoY29kZSAhPT0gMCkge1xuXHRcdFx0XHRpZiAoZXh0cmFjdGluZ0RvbmUpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShvdXRwdXQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxvZy5lcnJvcignZXhpdCB3aXRoIGVycm9yIGNvZGUgJWQgLSBcIiVzXCInLCBKU09OLnN0cmluZ2lmeShjb2RlKSwgc2lnbmFsKTtcblx0XHRcdFx0aWYgKG91dHB1dClcblx0XHRcdFx0XHRsb2cuZXJyb3IoYFtjaGlsZCBwcm9jZXNzXVtwaWQ6JHtjaGlsZC5waWR9XSR7bmFtZX0gLSBgLCBvdXRwdXQpO1xuXHRcdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdwcm9jZXNzIFwiJXNcIiBkb25lIHN1Y2Nlc3NmdWxseSwnLCBuYW1lLCBvdXRwdXQpO1xuXHRcdFx0XHRyZXNvbHZlKG91dHB1dCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0bGV0IG91dHB1dCA9ICcnO1xuXHRcdGNoaWxkLnN0ZG91dC5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHRjaGlsZC5zdGRvdXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdG91dHB1dCArPSBjaHVuaztcblx0XHR9KTtcblx0XHRjaGlsZC5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0Y2hpbGQuc3RkZXJyLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG5cdFx0XHRvdXRwdXQgKz0gY2h1bms7XG5cdFx0fSk7XG5cdH0pO1xufVxuIl19
