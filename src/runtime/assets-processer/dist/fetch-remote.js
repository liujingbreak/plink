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
            if (setting.downloadMode === 'fork') {
                yield retry(forkExtractExstingZip);
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
            child.on('error', err => {
                log.error(err);
                reject(output);
            });
            child.on('exit', (code, signal) => {
                log.info('child process %s exit with: %d - %s', child.pid, code, signal);
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
                    log.info('"%s" process done successfully,', name, output);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFDMUIsOERBQThCO0FBRTlCLGlEQUFtQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUM7QUFFM0UsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNwRCxNQUFNLEtBQUssR0FBRyxpQkFBTyxDQUFDLFFBQVEsSUFBSSxhQUFhLElBQUksSUFBSSxDQUFDO0FBQ3hELE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBSyxJQUFJLGFBQWEsS0FBSyxHQUFHLENBQUM7QUFvQnRELElBQUksT0FBZ0IsQ0FBQztBQUNyQixzREFBc0Q7QUFDdEQsSUFBSSxlQUFlLEdBQWE7SUFDL0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7SUFDakMsSUFBSSxFQUFFLEVBQUU7SUFDUixRQUFRLEVBQUUsRUFBRTtDQUNaLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3pGLElBQUksS0FBbUIsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBRWpCLFNBQWdCLEtBQUssQ0FBQyxjQUFxQztJQUMxRCxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLE1B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LEVBQUU7b0JBQ3BCLGNBQWMsR0FBRyxJQUFJLENBQUM7aUJBQ3RCO3FCQUFNLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtvQkFDckIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3JCO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZScpO1xuXG5jb25zdCBwbTJJbnN0YW5jZUlkID0gcHJvY2Vzcy5lbnYuTk9ERV9BUFBfSU5TVEFOQ0U7XG5jb25zdCBpc1BtMiA9IGNsdXN0ZXIuaXNXb3JrZXIgJiYgcG0ySW5zdGFuY2VJZCAhPSBudWxsO1xuY29uc3QgaXNNYWluUHJvY2VzcyA9ICFpc1BtMiB8fCBwbTJJbnN0YW5jZUlkID09PSAnMCc7XG5cbmludGVyZmFjZSBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb246IG51bWJlcjtcblx0cGF0aDogc3RyaW5nO1xuXHRjaGFuZ2VGZXRjaFVybD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENoZWNrc3VtIGV4dGVuZHMgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9ucz86IHtba2V5OiBzdHJpbmddOiB7dmVyc2lvbjogbnVtYmVyLCBwYXRoOiBzdHJpbmd9fTtcbn1cblxuaW50ZXJmYWNlIFNldHRpbmcge1xuXHRmZXRjaFVybDogc3RyaW5nO1xuXHRmZXRjaFJldHJ5OiBudW1iZXI7XG5cdGZldGNoTG9nRXJyUGVyVGltZXM6IG51bWJlcjtcblx0ZmV0Y2hJbnRlcnZhbFNlYzogbnVtYmVyO1xuXHRkb3dubG9hZE1vZGU6ICdtZW1vcnknIHwgJ2ZvcmsnIHwgbnVsbDtcbn1cblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmxldCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3Nlci5jaGVja3N1bS5qc29uJyk7XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoc2VydmVTdGF0aWNaaXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHRzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKTtcblx0Y29uc3QgZmV0Y2hVcmwgPSBzZXR0aW5nLmZldGNoVXJsO1xuXHRpZiAoZmV0Y2hVcmwgPT0gbnVsbCkge1xuXHRcdGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXG5cdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG5cdFx0Ly8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG5cdFx0Ly8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG5cdFx0bG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuXHRcdHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cdGlmIChmcy5leGlzdHNTeW5jKGN1cnJDaGVja3N1bUZpbGUpKSB7XG5cdFx0Y3VycmVudENoZWNrc3VtID0gT2JqZWN0LmFzc2lnbihjdXJyZW50Q2hlY2tzdW0sIGZzLnJlYWRKU09OU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSk7XG5cdFx0bG9nLmluZm8oJ0ZvdW5kIHNhdmVkIGNoZWNrc3VtIGZpbGUgYWZ0ZXIgcmVib290XFxuJywgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSk7XG5cdH1cblx0cmV0dXJuIHJ1blJlcGVhdGx5KHNldHRpbmcsIHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnbWVtb3J5JyA/IHNlcnZlU3RhdGljWmlwIDogbnVsbCk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuXHRzdG9wcGVkID0gdHJ1ZTtcblx0aWYgKHRpbWVyKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0fVxufVxuXG5mdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcsIHN6aXApXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcsIHN6aXApO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0bGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcblx0dHJ5IHtcblx0XHRjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0aWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcblx0XHRcdHRocm93IGVycjtcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuXHRcdHJldHVybjtcblxuXHRpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcblx0XHRzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG5cdFx0bG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fVxuXHRsZXQgZG93bmxvYWRlZCA9IGZhbHNlO1xuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uKSB7XG5cdFx0YXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCwgc3ppcCk7XG5cdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0Y3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuXHRcdGNvbnN0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRhd2FpdCBkb3dubG9hZFppcCh0YXJnZXRWZXJzaW9uc1trZXldLnBhdGgsIHN6aXApO1xuXHRcdFx0XHRcdGN1cnJWZXJzaW9uc1trZXldID0gdGFyZ2V0VmVyc2lvbnNba2V5XTtcblx0XHRcdFx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChkb3dubG9hZGVkKSB7XG5cdFx0Ly8gZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgJyksICd1dGY4Jyk7XG5cdFx0aWYgKHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnZm9yaycpIHtcblx0XHRcdGF3YWl0IHJldHJ5KGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG5cdFx0fVxuXHRcdGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xuXHR9XG59XG5cbi8vIGxldCBkb3dubG9hZENvdW50ID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAocGF0aDogc3RyaW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdC8vIGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgemlwW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0Y29uc3QgcmVzb3VyY2UgPSBVcmwucmVzb2x2ZSggc2V0dGluZy5mZXRjaFVybCwgcGF0aCArICc/JyArIE1hdGgucmFuZG9tKCkpO1xuXHRjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuXHRsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdGlmIChzemlwKSB7XG5cdFx0bG9nLmluZm8oJ2Rvd25sb2FkaW5nIHppcCBjb250ZW50IHRvIG1lbW9yeS4uLicpO1xuXG5cdFx0YXdhaXQgcmV0cnkoKCkgPT4ge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdFx0cmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJpOiByZXNvdXJjZSwgbWV0aG9kOiAnR0VUJywgZW5jb2Rpbmc6IG51bGxcblx0XHRcdFx0fSwgKGVyciwgcmVzLCBib2R5KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlaihlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocmVzLnN0YXR1c0NvZGUgPiAyOTkgfHwgcmVzLnN0YXR1c0NvZGUgPCAyMDApXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG5cdFx0XHRcdFx0Y29uc3Qgc2l6ZSA9IChib2R5IGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aDtcblx0XHRcdFx0XHRsb2cuaW5mbygnemlwIGxvYWRlZCwgbGVuZ3RoOicsIHNpemUgPiAxMDI0ID8gTWF0aC5yb3VuZChzaXplIC8gMTAyNCkgKyAnaycgOiBzaXplKTtcblx0XHRcdFx0XHRzemlwLnVwZGF0ZVppcChib2R5KTtcblx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuXHRcdGF3YWl0IHJldHJ5PHN0cmluZz4oZm9ya0Rvd25sb2FkemlwLCByZXNvdXJjZSk7XG5cdH0gZWxzZSB7XG5cdFx0YXdhaXQgcmV0cnkoKCkgPT4ge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdFx0cmVxdWVzdC5nZXQocmVzb3VyY2UpLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRcdFx0cmVqKGVycik7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRvd25sb2FkVG8pKVxuXHRcdFx0XHQub24oJ2ZpbmlzaCcsICgpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGRvd25sb2FkVG8pO1xuXHRcdGxldCByZXRyeUNvdW50ID0gMDtcblx0XHRkbyB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsb2cuaW5mbygnZXh0cmFjdCAlcycsIGRvd25sb2FkVG8pO1xuXHRcdFx0XHRhd2FpdCB0cnlFeHRyYWN0KCk7XG5cdFx0XHRcdGxvZy5pbmZvKGBleHRyYWN0ICR7ZG93bmxvYWRUb30gZG9uZWApO1xuXHRcdFx0XHRmcy51bmxpbmtTeW5jKGRvd25sb2FkVG8pO1xuXHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCBkb25lW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuXHRcdFx0fVxuXHRcdH0gd2hpbGUgKCsrcmV0cnlDb3VudCA8PTMpO1xuXHRcdGlmIChyZXRyeUNvdW50ID4gMykge1xuXHRcdFx0bG9nLmluZm8oJ0dpdmUgdXAgb24gZXh0cmFjdGluZyB6aXAnKTtcblx0XHR9XG5cdFx0ZnVuY3Rpb24gdHJ5RXh0cmFjdCgpIHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdHppcC5leHRyYWN0QWxsVG9Bc3luYyhhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLCB0cnVlLCAoZXJyKSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRcdFx0XHRpZiAoKGVyciBhcyBhbnkpLmNvZGUgPT09ICdFTk9NRU0nIHx8IGVyci50b1N0cmluZygpLmluZGV4T2YoJ25vdCBlbm91Z2ggbWVtb3J5JykgPj0gMCkge1xuXHRcdFx0XHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0XHRcdFx0bG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0fSBlbHNlXG5cdFx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGZldGNoKGZldGNoVXJsOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRjb25zdCBjaGVja1VybCA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcblx0bG9nLmRlYnVnKCdjaGVjaycsIGNoZWNrVXJsKTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRyZXF1ZXN0LmdldChjaGVja1VybCxcblx0XHRcdHtoZWFkZXJzOiB7UmVmZXJlcjogVXJsLnJlc29sdmUoY2hlY2tVcmwsICcvJyl9fSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiByZXF1ZXN0LlJlc3BvbnNlLCBib2R5OiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihlcnJvcikpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+IDMwMikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihgc3RhdHVzIGNvZGUgJHtyZXNwb25zZS5zdGF0dXNDb2RlfVxcbnJlc3BvbnNlOlxcbiR7cmVzcG9uc2V9XFxuYm9keTpcXG4ke2JvZHl9YCkpO1xuXHRcdFx0fVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdHJlaihleCk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKGJvZHkpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuXHRmb3IgKGxldCBjbnQgPSAwOzspIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjbnQrKztcblx0XHRcdGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGxvZy53YXJuKGVycik7XG5cdFx0XHRsb2cuaW5mbygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG5cdFx0fVxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgY250ICogNTAwMCkpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGZvcmtEb3dubG9hZHppcChyZXNvdXJjZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0cmV0dXJuIGZvcmtQcm9jZXNzKCdkb3dubG9hZCAnICsgcmVzb3VyY2UsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9kb3dubG9hZC16aXAtcHJvY2Vzcy5qcycsIFtcblx0XHRyZXNvdXJjZSwgYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksIHNldHRpbmcuZmV0Y2hSZXRyeSArICcnXG5cdF0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCgpIHtcblx0cmV0dXJuIGZvcmtQcm9jZXNzKCdjaGVjayBhbmQgZXh0cmFjdCB6aXAnLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZXh0cmFjdC16aXAtcHJvY2Vzcy5qcycsIFtcblx0XHRhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKVxuXHRdKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZm9ya1Byb2Nlc3MobmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkge1xuXHRyZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0bGV0IGV4dHJhY3RpbmdEb25lID0gZmFsc2U7XG5cdFx0Y29uc3QgY2hpbGQgPSBmb3JrKGZpbGVQYXRoLFxuXHRcdFx0YXJncywge1xuXHRcdFx0c2lsZW50OiB0cnVlXG5cdFx0fSk7XG5cdFx0Y2hpbGQub24oJ2Vycm9yJywgZXJyID0+IHtcblx0XHRcdGxvZy5lcnJvcihlcnIpO1xuXHRcdFx0cmVqZWN0KG91dHB1dCk7XG5cdFx0fSk7XG5cdFx0Y2hpbGQub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG5cdFx0XHRsb2cuaW5mbygnY2hpbGQgcHJvY2VzcyAlcyBleGl0IHdpdGg6ICVkIC0gJXMnLCBjaGlsZC5waWQsIGNvZGUsIHNpZ25hbCk7XG5cdFx0XHRpZiAoY29kZSAhPT0gMCkge1xuXHRcdFx0XHRsb2cuaW5mbyhjb2RlKTtcblx0XHRcdFx0aWYgKGV4dHJhY3RpbmdEb25lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc29sdmUob3V0cHV0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2cuZXJyb3IoJ2V4aXQgd2l0aCBlcnJvciBjb2RlICVkIC0gXCIlc1wiJywgSlNPTi5zdHJpbmdpZnkoY29kZSksIHNpZ25hbCk7XG5cdFx0XHRcdGlmIChvdXRwdXQpXG5cdFx0XHRcdFx0bG9nLmVycm9yKGBbY2hpbGQgcHJvY2Vzc11bcGlkOiR7Y2hpbGQucGlkfV1gLCBvdXRwdXQpO1xuXHRcdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdcIiVzXCIgcHJvY2VzcyBkb25lIHN1Y2Nlc3NmdWxseSwnLCBuYW1lLCBvdXRwdXQpO1xuXHRcdFx0XHRyZXNvbHZlKG91dHB1dCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0bGV0IG91dHB1dCA9ICcnO1xuXHRcdGNoaWxkLnN0ZG91dC5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHRjaGlsZC5zdGRvdXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdG91dHB1dCArPSBjaHVuaztcblx0XHR9KTtcblx0XHRjaGlsZC5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0Y2hpbGQuc3RkZXJyLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG5cdFx0XHRvdXRwdXQgKz0gY2h1bms7XG5cdFx0fSk7XG5cdFx0Y2hpbGQub24oJ21lc3NhZ2UnLCBtc2cgPT4ge1xuXHRcdFx0aWYgKG1zZy5sb2cpIHtcblx0XHRcdFx0bG9nLmluZm8oJ1tjaGlsZCBwcm9jZXNzXScsIG1zZy5sb2cpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5kb25lKSB7XG5cdFx0XHRcdGV4dHJhY3RpbmdEb25lID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAobXNnLmVycm9yKSB7XG5cdFx0XHRcdGxvZy5lcnJvcihtc2cuZXJyb3IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn1cbiJdfQ==
