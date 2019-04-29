"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const request_1 = tslib_1.__importDefault(require("request"));
const Url = tslib_1.__importStar(require("url"));
const _ = tslib_1.__importStar(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const child_process_1 = require("child_process");
// const chokidar = require('chokidar');
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
let zipDownloadDir;
let watcher;
function start(serveStaticZip) {
    zipDownloadDir = __api_1.default.config.resolve('destDir', 'assets-processer');
    if (!fs_extra_1.default.existsSync(zipDownloadDir))
        fs_extra_1.default.mkdirpSync(zipDownloadDir);
    const fileNames = fs_extra_1.default.readdirSync(zipDownloadDir);
    for (const name of fileNames) {
        const file = path_1.default.resolve(zipDownloadDir, name);
        updateServerStatic(file, serveStaticZip);
    }
    // watcher = chokidar.watch('**/*.zip', {
    // 	cwd: zipDownloadDir
    // });
    // const updateServerStatic = (path: string) => {
    // 	log.info('read %s', path);
    // 	try {
    // 		serveStaticZip.updateZip(fs.readFileSync(Path.resolve(zipDownloadDir, path)));
    // 		api.eventBus.emit(api.packageName + '.downloaded');
    // 	} catch (e) {
    // 		log.warn('Failed to update from ' + path, e);
    // 	}
    // };
    // log.info('watch ', zipDownloadDir.replace(/\\/g, '/') + '/**/*.zip');
    // watcher.on('add', updateServerStatic);
    // watcher.on('change', updateServerStatic);
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
    // zipExtractDir = api.config.resolve('destDir', 'assets-processer');
    // if (!fs.existsSync(zipExtractDir))
    // 	fs.mkdirpSync(zipExtractDir);
    if (setting.fetchRetry == null)
        setting.fetchRetry = 3;
    if (fs_extra_1.default.existsSync(currChecksumFile)) {
        currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(currChecksumFile));
        log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
    }
    return runRepeatly(setting, serveStaticZip);
}
exports.start = start;
/**
 * It seems ok to quit process without calling this function
 */
function stop() {
    stopped = true;
    if (watcher)
        watcher.close();
    if (timer) {
        clearTimeout(timer);
    }
}
exports.stop = stop;
function updateServerStatic(path, serveStaticZip) {
    log.info('read %s', path);
    try {
        serveStaticZip.updateZip(fs_extra_1.default.readFileSync(path_1.default.resolve(zipDownloadDir, path)));
    }
    catch (e) {
        log.warn('Failed to update from ' + path, e);
    }
}
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
        let downloads = [];
        if (checksumObj.version != null && currentChecksum.version !== checksumObj.version) {
            const file = yield downloadZip(checksumObj.path, szip);
            downloads.push(file);
            currentChecksum.version = checksumObj.version;
        }
        if (checksumObj.versions) {
            const currVersions = currentChecksum.versions;
            const targetVersions = checksumObj.versions;
            for (const key of Object.keys(checksumObj.versions)) {
                if (!_.has(targetVersions, key) || _.get(currVersions, [key, 'version']) !==
                    _.get(targetVersions, [key, 'version'])) {
                    const file = yield downloadZip(targetVersions[key].path, szip);
                    currVersions[key] = targetVersions[key];
                    downloads.push(file);
                }
            }
        }
        if (downloads.length > 0) {
            yield retry(setting.fetchRetry, () => {
                return forkProcess('write-checksum', 'node_modules/' + __api_1.default.packageName + '/dist/write-checksum-process.js', [currChecksumFile], child => {
                    log.info('write checksum');
                    child.send({ checksum: currentChecksum });
                });
            });
            downloads.forEach(file => updateServerStatic(file, szip));
            // fs.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, ' '), 'utf8');
            // if (setting.downloadMode === 'fork') {
            // 	await retry(20, forkExtractExstingZip);
            // }
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
        // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        const newName = path.replace(/[\\/]/g, '_');
        const downloadTo = path_1.default.resolve(zipDownloadDir, newName);
        log.info('fetch', resource);
        if (setting.downloadMode === 'memory') {
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
            yield retry(setting.fetchRetry, forkDownloadzip, resource, downloadTo);
            return downloadTo;
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
function forkDownloadzip(resource, toFileName) {
    return forkProcess('download', 'node_modules/' + __api_1.default.packageName + '/dist/download-zip-process.js', [
        resource, toFileName, setting.fetchRetry + ''
    ]);
}
// function forkExtractExstingZip() {
// 	return forkProcess('extract', 'node_modules/' + api.packageName + '/dist/extract-zip-process.js', [
// 		api.config.resolve('destDir'),
// 		zipExtractDir
// 	]);
// }
function forkProcess(name, filePath, args, onProcess) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let extractingDone = false;
            const child = child_process_1.fork(filePath, args, {
                silent: true
            });
            if (onProcess) {
                onProcess(child);
            }
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
                log.info('process [pid:%s] %s - exit with: %d - %s', child.pid, name, code, signal);
                if (code !== 0) {
                    if (extractingDone) {
                        return resolve(output);
                    }
                    log.error(`process [pid:${child.pid}] ${name} exit with error code %d - "%s"`, JSON.stringify(code), signal);
                    if (output)
                        log.error(`[child process][pid:${child.pid}]${name} - `, output);
                    reject(output);
                }
                else {
                    log.info(`process [pid:${child.pid}] ${name} done successfully:`, output);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4Qiw4REFBNkI7QUFDN0IsZ0VBQTBCO0FBQzFCLDhEQUE4QjtBQUU5QixpREFBaUQ7QUFDakQsd0NBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW9CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYTtJQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDekYsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDakIsSUFBSSxjQUFzQixDQUFDO0FBQzNCLElBQUksT0FBWSxDQUFDO0FBRWpCLFNBQWdCLEtBQUssQ0FBQyxjQUFxQztJQUMxRCxjQUFj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QyxDQUFDO29CQUM3RyxJQUFJLE1BQU07d0JBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDbEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNmO3FCQUFNO29CQUNOLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxHQUFHLEtBQUssSUFBSSxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDMUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNoQjtZQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5pbXBvcnQge1ppcFJlc291cmNlTWlkZGxld2FyZX0gZnJvbSAnc2VydmUtc3RhdGljLXppcCc7XG5pbXBvcnQge2ZvcmssIENoaWxkUHJvY2Vzc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBjb25zdCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3QgcG0ySW5zdGFuY2VJZCA9IHByb2Nlc3MuZW52Lk5PREVfQVBQX0lOU1RBTkNFO1xuY29uc3QgaXNQbTIgPSBjbHVzdGVyLmlzV29ya2VyICYmIHBtMkluc3RhbmNlSWQgIT0gbnVsbDtcbmNvbnN0IGlzTWFpblByb2Nlc3MgPSAhaXNQbTIgfHwgcG0ySW5zdGFuY2VJZCA9PT0gJzAnO1xuXG5pbnRlcmZhY2UgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9uOiBudW1iZXI7XG5cdHBhdGg6IHN0cmluZztcblx0Y2hhbmdlRmV0Y2hVcmw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDaGVja3N1bSBleHRlbmRzIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbnM/OiB7W2tleTogc3RyaW5nXToge3ZlcnNpb246IG51bWJlciwgcGF0aDogc3RyaW5nfX07XG59XG5cbmludGVyZmFjZSBTZXR0aW5nIHtcblx0ZmV0Y2hVcmw6IHN0cmluZztcblx0ZmV0Y2hSZXRyeTogbnVtYmVyO1xuXHRmZXRjaExvZ0VyclBlclRpbWVzOiBudW1iZXI7XG5cdGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcblx0ZG93bmxvYWRNb2RlOiAnbWVtb3J5JyB8ICdmb3JrJyB8IG51bGw7XG59XG5cbmxldCBzZXR0aW5nOiBTZXR0aW5nO1xuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5sZXQgY3VycmVudENoZWNrc3VtOiBDaGVja3N1bSA9IHtcblx0dmVyc2lvbjogTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuXHRwYXRoOiAnJyxcblx0dmVyc2lvbnM6IHt9XG59O1xuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2Fzc2V0cy1wcm9jZXNzZXIuY2hlY2tzdW0uanNvbicpO1xubGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG5sZXQgc3RvcHBlZCA9IGZhbHNlO1xubGV0IGVyckNvdW50ID0gMDtcbmxldCB6aXBEb3dubG9hZERpcjogc3RyaW5nO1xubGV0IHdhdGNoZXI6IGFueTtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KHNlcnZlU3RhdGljWmlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0emlwRG93bmxvYWREaXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3NlcicpO1xuXHRpZiAoIWZzLmV4aXN0c1N5bmMoemlwRG93bmxvYWREaXIpKVxuXHRcdGZzLm1rZGlycFN5bmMoemlwRG93bmxvYWREaXIpO1xuXHRjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyh6aXBEb3dubG9hZERpcik7XG5cdGZvciAoY29uc3QgbmFtZSBvZiBmaWxlTmFtZXMpIHtcblx0XHRjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBuYW1lKTtcblx0XHR1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc2VydmVTdGF0aWNaaXApO1xuXHR9XG5cdC8vIHdhdGNoZXIgPSBjaG9raWRhci53YXRjaCgnKiovKi56aXAnLCB7XG5cdC8vIFx0Y3dkOiB6aXBEb3dubG9hZERpclxuXHQvLyB9KTtcblx0Ly8gY29uc3QgdXBkYXRlU2VydmVyU3RhdGljID0gKHBhdGg6IHN0cmluZykgPT4ge1xuXHQvLyBcdGxvZy5pbmZvKCdyZWFkICVzJywgcGF0aCk7XG5cdC8vIFx0dHJ5IHtcblx0Ly8gXHRcdHNlcnZlU3RhdGljWmlwLnVwZGF0ZVppcChmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBwYXRoKSkpO1xuXHQvLyBcdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdC8vIFx0fSBjYXRjaCAoZSkge1xuXHQvLyBcdFx0bG9nLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgZnJvbSAnICsgcGF0aCwgZSk7XG5cdC8vIFx0fVxuXHQvLyB9O1xuXHQvLyBsb2cuaW5mbygnd2F0Y2ggJywgemlwRG93bmxvYWREaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qLnppcCcpO1xuXHQvLyB3YXRjaGVyLm9uKCdhZGQnLCB1cGRhdGVTZXJ2ZXJTdGF0aWMpO1xuXHQvLyB3YXRjaGVyLm9uKCdjaGFuZ2UnLCB1cGRhdGVTZXJ2ZXJTdGF0aWMpO1xuXG5cblx0c2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cdGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcblx0aWYgKGZldGNoVXJsID09IG51bGwpIHtcblx0XHRsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgIT09ICdtZW1vcnknICAmJiAhaXNNYWluUHJvY2Vzcykge1xuXHRcdC8vIG5vbiBpbk1lbW9yeSBtb2RlIG1lYW5zIGV4dHJhY3RpbmcgemlwIGZpbGUgdG8gbG9jYWwgZGlyZWN0b3J5IGRpc3Qvc3RhdGljLFxuXHRcdC8vIGluIGNhc2Ugb2YgY2x1c3RlciBtb2RlLCB3ZSBvbmx5IHdhbnQgc2luZ2xlIHByb2Nlc3MgZG8gemlwIGV4dHJhY3RpbmcgYW5kIGZpbGUgd3JpdGluZyB0YXNrIHRvIGF2b2lkIGNvbmZsaWN0LlxuXHRcdGxvZy5pbmZvKCdUaGlzIHByb2Nlc3MgaXMgbm90IG1haW4gcHJvY2VzcycpO1xuXHRcdHJldHVybjtcblx0fVxuXHQvLyB6aXBFeHRyYWN0RGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2Fzc2V0cy1wcm9jZXNzZXInKTtcblx0Ly8gaWYgKCFmcy5leGlzdHNTeW5jKHppcEV4dHJhY3REaXIpKVxuXHQvLyBcdGZzLm1rZGlycFN5bmMoemlwRXh0cmFjdERpcik7XG5cblx0aWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuXHRcdHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cdGlmIChmcy5leGlzdHNTeW5jKGN1cnJDaGVja3N1bUZpbGUpKSB7XG5cdFx0Y3VycmVudENoZWNrc3VtID0gT2JqZWN0LmFzc2lnbihjdXJyZW50Q2hlY2tzdW0sIGZzLnJlYWRKU09OU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSk7XG5cdFx0bG9nLmluZm8oJ0ZvdW5kIHNhdmVkIGNoZWNrc3VtIGZpbGUgYWZ0ZXIgcmVib290XFxuJywgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSk7XG5cdH1cblx0cmV0dXJuIHJ1blJlcGVhdGx5KHNldHRpbmcsIHNlcnZlU3RhdGljWmlwKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG5cdHN0b3BwZWQgPSB0cnVlO1xuXHRpZiAod2F0Y2hlcilcblx0XHR3YXRjaGVyLmNsb3NlKCk7XG5cdGlmICh0aW1lcikge1xuXHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VydmVyU3RhdGljKHBhdGg6IHN0cmluZywgc2VydmVTdGF0aWNaaXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHRsb2cuaW5mbygncmVhZCAlcycsIHBhdGgpO1xuXHR0cnkge1xuXHRcdHNlcnZlU3RhdGljWmlwLnVwZGF0ZVppcChmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBwYXRoKSkpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0bG9nLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgZnJvbSAnICsgcGF0aCwgZSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKTogUHJvbWlzZTx2b2lkPiB7XG5cdGlmIChzdG9wcGVkKVxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0cmV0dXJuIHJ1bihzZXR0aW5nLCBzemlwKVxuXHQuY2F0Y2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSlcblx0LnRoZW4oKCkgPT4ge1xuXHRcdGlmIChzdG9wcGVkKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRydW5SZXBlYXRseShzZXR0aW5nLCBzemlwKTtcblx0XHR9LCBzZXR0aW5nLmZldGNoSW50ZXJ2YWxTZWMgKiAxMDAwKTtcblx0fSk7XG59XG5hc3luYyBmdW5jdGlvbiBydW4oc2V0dGluZzogU2V0dGluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG5cdGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG5cdHRyeSB7XG5cdFx0Y2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksIGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0aWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcblx0XHRcdHRocm93IGVycjtcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuXHRcdHJldHVybjtcblxuXHRpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcblx0XHRzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG5cdFx0bG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fVxuXHRsZXQgZG93bmxvYWRzOiBzdHJpbmdbXSA9IFtdO1xuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uKSB7XG5cdFx0Y29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKGNoZWNrc3VtT2JqLnBhdGgsIHN6aXApO1xuXHRcdGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuXHRcdGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uID0gY2hlY2tzdW1PYmoudmVyc2lvbjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcblx0XHRjb25zdCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG5cdFx0Y29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjaGVja3N1bU9iai52ZXJzaW9ucykpIHtcblx0XHRcdGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cblx0XHRcdFx0Xy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG5cdFx0XHRcdFx0Y29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCwgc3ppcCk7XG5cdFx0XHRcdFx0Y3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuXHRcdFx0XHRcdGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKGRvd25sb2Fkcy5sZW5ndGggPiAwKSB7XG5cdFx0YXdhaXQgcmV0cnkoc2V0dGluZy5mZXRjaFJldHJ5LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4gZm9ya1Byb2Nlc3MoJ3dyaXRlLWNoZWNrc3VtJywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L3dyaXRlLWNoZWNrc3VtLXByb2Nlc3MuanMnLFxuXHRcdFx0XHRbY3VyckNoZWNrc3VtRmlsZV0sIGNoaWxkID0+IHtcblx0XHRcdFx0XHRsb2cuaW5mbygnd3JpdGUgY2hlY2tzdW0nKTtcblx0XHRcdFx0XHRjaGlsZC5zZW5kKHtjaGVja3N1bTogY3VycmVudENoZWNrc3VtfSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0ZG93bmxvYWRzLmZvckVhY2goZmlsZSA9PiB1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc3ppcCkpO1xuXHRcdC8vIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICcpLCAndXRmOCcpO1xuXHRcdC8vIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG5cdFx0Ly8gXHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0XHQvLyB9XG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdH1cbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG5cdGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcblx0Y29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0aWYgKHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnbWVtb3J5Jykge1xuXHRcdGF3YWl0IHJldHJ5KHNldHRpbmcuZmV0Y2hSZXRyeSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdFx0cmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJpOiByZXNvdXJjZSwgbWV0aG9kOiAnR0VUJywgZW5jb2Rpbmc6IG51bGxcblx0XHRcdFx0fSwgKGVyciwgcmVzLCBib2R5KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlaihlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocmVzLnN0YXR1c0NvZGUgPiAyOTkgfHwgcmVzLnN0YXR1c0NvZGUgPCAyMDApXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihyZXMuc3RhdHVzQ29kZSArICcgJyArIHJlcy5zdGF0dXNNZXNzYWdlKSk7XG5cdFx0XHRcdFx0Y29uc3Qgc2l6ZSA9IChib2R5IGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aDtcblx0XHRcdFx0XHRsb2cuaW5mbygnemlwIGxvYWRlZCwgbGVuZ3RoOicsIHNpemUgPiAxMDI0ID8gTWF0aC5yb3VuZChzaXplIC8gMTAyNCkgKyAnaycgOiBzaXplKTtcblx0XHRcdFx0XHRzemlwLnVwZGF0ZVppcChib2R5KTtcblx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuXHRcdGF3YWl0IHJldHJ5PHN0cmluZz4oc2V0dGluZy5mZXRjaFJldHJ5LCBmb3JrRG93bmxvYWR6aXAsIHJlc291cmNlLCBkb3dubG9hZFRvKTtcblx0XHRyZXR1cm4gZG93bmxvYWRUbztcblx0fSBlbHNlIHtcblx0XHRhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksICgpID0+IHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0XHRcdHJlcXVlc3QuZ2V0KHJlc291cmNlKS5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0XHRcdHJlaihlcnIpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShkb3dubG9hZFRvKSlcblx0XHRcdFx0Lm9uKCdmaW5pc2gnLCAoKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0Y29uc3QgemlwID0gbmV3IEFkbVppcChkb3dubG9hZFRvKTtcblx0XHRsZXQgcmV0cnlDb3VudCA9IDA7XG5cdFx0ZG8ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bG9nLmluZm8oJ2V4dHJhY3QgJXMnLCBkb3dubG9hZFRvKTtcblx0XHRcdFx0YXdhaXQgdHJ5RXh0cmFjdCgpO1xuXHRcdFx0XHRsb2cuaW5mbyhgZXh0cmFjdCAke2Rvd25sb2FkVG99IGRvbmVgKTtcblx0XHRcdFx0ZnMudW5saW5rU3luYyhkb3dubG9hZFRvKTtcblx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdC8vIGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgZG9uZVtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcblx0XHRcdH1cblx0XHR9IHdoaWxlICgrK3JldHJ5Q291bnQgPD0zKTtcblx0XHRpZiAocmV0cnlDb3VudCA+IDMpIHtcblx0XHRcdGxvZy5pbmZvKCdHaXZlIHVwIG9uIGV4dHJhY3RpbmcgemlwJyk7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHRyeUV4dHJhY3QoKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0XHR6aXAuZXh0cmFjdEFsbFRvQXN5bmMoYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSwgdHJ1ZSwgKGVycikgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdGxvZy5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdFx0aWYgKChlcnIgYXMgYW55KS5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIudG9TdHJpbmcoKS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcblx0XHRcdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0XHRcdGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcblx0Y29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG5cdGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0cmVxdWVzdC5nZXQoY2hlY2tVcmwsXG5cdFx0XHR7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0Ym9keSA9IEpTT04ucGFyc2UoYm9keSk7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRyZWooZXgpO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZShib2R5KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KHRpbWVzOiBudW1iZXIsIGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcblx0Zm9yIChsZXQgY250ID0gMDs7KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y250Kys7XG5cdFx0XHRpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHRsb2cud2FybihlcnIpO1xuXHRcdFx0bG9nLmluZm8oJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeScpO1xuXHRcdH1cblx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIGNudCAqIDUwMCkpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGZvcmtEb3dubG9hZHppcChyZXNvdXJjZTogc3RyaW5nLCB0b0ZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRyZXR1cm4gZm9ya1Byb2Nlc3MoJ2Rvd25sb2FkJywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzJywgW1xuXHRcdHJlc291cmNlLCB0b0ZpbGVOYW1lLCBzZXR0aW5nLmZldGNoUmV0cnkgKyAnJ1xuXHRdKTtcbn1cbi8vIGZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCgpIHtcbi8vIFx0cmV0dXJuIGZvcmtQcm9jZXNzKCdleHRyYWN0JywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMnLCBbXG4vLyBcdFx0YXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksXG4vLyBcdFx0emlwRXh0cmFjdERpclxuLy8gXHRdKTtcbi8vIH1cblxuYXN5bmMgZnVuY3Rpb24gZm9ya1Byb2Nlc3MobmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSwgb25Qcm9jZXNzPzogKGNoaWxkOiBDaGlsZFByb2Nlc3MpID0+IHZvaWQpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGxldCBleHRyYWN0aW5nRG9uZSA9IGZhbHNlO1xuXHRcdGNvbnN0IGNoaWxkID0gZm9yayhmaWxlUGF0aCxcblx0XHRcdGFyZ3MsIHtcblx0XHRcdHNpbGVudDogdHJ1ZVxuXHRcdH0pO1xuXHRcdGlmIChvblByb2Nlc3MpIHtcblx0XHRcdG9uUHJvY2VzcyhjaGlsZCk7XG5cdFx0fVxuXHRcdGNoaWxkLm9uKCdtZXNzYWdlJywgbXNnID0+IHtcblx0XHRcdGlmIChtc2cubG9nKSB7XG5cdFx0XHRcdGxvZy5pbmZvKCdbY2hpbGQgcHJvY2Vzc10gJXMgLSAlcycsIG5hbWUsIG1zZy5sb2cpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5kb25lKSB7XG5cdFx0XHRcdGV4dHJhY3RpbmdEb25lID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAobXNnLmVycm9yKSB7XG5cdFx0XHRcdGxvZy5lcnJvcihtc2cuZXJyb3IpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdHJlamVjdChvdXRwdXQpO1xuXHRcdH0pO1xuXHRcdGNoaWxkLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuXHRcdFx0bG9nLmluZm8oJ3Byb2Nlc3MgW3BpZDolc10gJXMgLSBleGl0IHdpdGg6ICVkIC0gJXMnLCBjaGlsZC5waWQsIG5hbWUsIGNvZGUsIHNpZ25hbCk7XG5cdFx0XHRpZiAoY29kZSAhPT0gMCkge1xuXHRcdFx0XHRpZiAoZXh0cmFjdGluZ0RvbmUpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzb2x2ZShvdXRwdXQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxvZy5lcnJvcihgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBleGl0IHdpdGggZXJyb3IgY29kZSAlZCAtIFwiJXNcImAsIEpTT04uc3RyaW5naWZ5KGNvZGUpLCBzaWduYWwpO1xuXHRcdFx0XHRpZiAob3V0cHV0KVxuXHRcdFx0XHRcdGxvZy5lcnJvcihgW2NoaWxkIHByb2Nlc3NdW3BpZDoke2NoaWxkLnBpZH1dJHtuYW1lfSAtIGAsIG91dHB1dCk7XG5cdFx0XHRcdHJlamVjdChvdXRwdXQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bG9nLmluZm8oYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZG9uZSBzdWNjZXNzZnVsbHk6YCwgb3V0cHV0KTtcblx0XHRcdFx0cmVzb2x2ZShvdXRwdXQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGxldCBvdXRwdXQgPSAnJztcblx0XHRjaGlsZC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG5cdFx0Y2hpbGQuc3Rkb3V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG5cdFx0XHRvdXRwdXQgKz0gY2h1bms7XG5cdFx0fSk7XG5cdFx0Y2hpbGQuc3RkZXJyLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdGNoaWxkLnN0ZGVyci5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0b3V0cHV0ICs9IGNodW5rO1xuXHRcdH0pO1xuXHR9KTtcbn1cbiJdfQ==
