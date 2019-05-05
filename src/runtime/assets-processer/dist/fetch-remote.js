"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const request_1 = tslib_1.__importDefault(require("request"));
const Url = tslib_1.__importStar(require("url"));
const _ = tslib_1.__importStar(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
// import AdmZip from 'adm-zip';
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        log.info(`[memory status] total ${Math.floor(os_1.default.totalmem() / 1048576)}Mb, free ${Math.floor(os_1.default.freemem() / 1048576)}Mb\n` +
            `[num of CPU] ${os_1.default.cpus().length}`);
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
        zipDownloadDir = __api_1.default.config.resolve('destDir', 'assets-processer');
        if (!fs_extra_1.default.existsSync(zipDownloadDir))
            fs_extra_1.default.mkdirpSync(zipDownloadDir);
        const fileNames = fs_extra_1.default.readdirSync(zipDownloadDir).filter(name => path_1.default.extname(name) === '.zip');
        if (fileNames.length > 0) {
            yield retry(20, forkExtractExstingZip);
        }
        if (setting.fetchRetry == null)
            setting.fetchRetry = 3;
        if (fs_extra_1.default.existsSync(currChecksumFile)) {
            currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(currChecksumFile));
            log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
        }
        return runRepeatly(setting, serveStaticZip);
    });
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
// function updateServerStatic(path: string, serveStaticZip: ZipResourceMiddleware) {
// 	log.info('read %s', path);
// 	try {
// 		serveStaticZip.updateZip(fs.readFileSync(Path.resolve(zipDownloadDir, path)));
// 	} catch (e) {
// 		log.warn('Failed to update from ' + path, e);
// 	}
// }
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
            fs_extra_1.default.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, '  '), 'utf8');
            // downloads.forEach(file => updateServerStatic(file, szip));
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
        // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
        const newName = path.replace(/[\\/]/g, '_');
        const downloadTo = path_1.default.resolve(zipDownloadDir, newName);
        log.info('fetch', resource);
        yield retry(setting.fetchRetry, forkDownloadzip, resource, downloadTo);
        return downloadTo;
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
function forkExtractExstingZip() {
    return forkProcess('extract', 'node_modules/' + __api_1.default.packageName + '/dist/extract-zip-process.js', [
        zipDownloadDir,
        __api_1.default.config.resolve('staticDir')
    ]);
}
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4QixnQ0FBZ0M7QUFDaEMsZ0VBQTBCO0FBQzFCLDhEQUE4QjtBQUU5QixpREFBaUQ7QUFDakQsd0NBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW9CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYTtJQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDekYsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDakIsSUFBSSxjQUFzQixDQUFDO0FBQzNCLElBQUksT0FBWSxDQUFDO0FBRWpCLFNBQXNCLEtBQUssQ0FBQyxjQUFxQzs7UUFDaEUsMkJBQTJCO1FBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNO1lBQ3hILGdCQUFnQixZQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUVyQyxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDbEMsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaURBQWlELENBQUMsQ0FBQztZQUM1RCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUN6QjtRQUVELElBQUksT0FBTyxDQUFDLFlBQVksS0FBSyxRQUFRLElBQUssQ0FBQyxhQUFhLEVBQUU7WUFDekQsOEVBQThFO1lBQzlFLGtIQUFrSDtZQUNsSCxHQUFHLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7WUFDN0MsT0FBTztTQUNQO1FBQ0QsY0FBYyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7WUFDakMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDL0IsTUFBTSxTQUFTLEdBQUcsa0JBQUUsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQztRQUMvRixJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3pCLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1NBQ3ZDO1FBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUk7WUFDN0IsT0FBTyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3BDLGVBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxrQkFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDcEYsR0FBRyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNsRztRQUNELE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQUE7QUFqQ0Qsc0JBaUNDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixJQUFJO0lBQ25CLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDZixJQUFJLE9BQU87UUFDVixPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakIsSUFBSSxLQUFLLEVBQUU7UUFDVixZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDcEI7QUFDRixDQUFDO0FBUEQsb0JBT0M7QUFFRCxxRkFBcUY7QUFDckYsOEJBQThCO0FBQzlCLFNBQVM7QUFDVCxtRkFBbUY7QUFDbkYsaUJBQWlCO0FBQ2pCLGtEQUFrRDtBQUNsRCxLQUFLO0FBQ0wsSUFBSTtBQUVKLFNBQVMsV0FBVyxDQUFDLE9BQWdCLEVBQUUsSUFBMkI7SUFDakUsSUFBSSxPQUFPO1FBQ1YsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztTQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2hDLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDVixJQUFJLE9BQU87WUFDVixPQUFPO1FBQ1IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDdkIsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELFNBQWUsR0FBRyxDQUFDLE9BQWdCLEVBQUUsSUFBMkI7O1FBQy9ELElBQUksV0FBcUIsQ0FBQztRQUMxQixJQUFJO1lBQ0gsV0FBVyxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUN2RTtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ2IsSUFBSSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxFQUFFO2dCQUNuRCxNQUFNLEdBQUcsQ0FBQzthQUNWO1lBQ0QsT0FBTztTQUNQO1FBQ0QsSUFBSSxXQUFXLElBQUksSUFBSTtZQUN0QixPQUFPO1FBRVIsSUFBSSxXQUFXLENBQUMsY0FBYyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQztZQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNsRDtRQUNELElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQztRQUM3QixJQUFJLFdBQVcsQ0FBQyxPQUFPLElBQUksSUFBSSxJQUFJLGVBQWUsQ0FBQyxPQUFPLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRTtZQUNuRixNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsZUFBZSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1NBQzlDO1FBQ0QsSUFBSSxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQ3pCLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUM7WUFDOUMsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztZQUM1QyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNwRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3ZFLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3hDLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9ELFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3JCO2FBQ0Y7U0FDRDtRQUVELElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDekIsa0JBQUUsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLDZEQUE2RDtZQUM3RCxJQUFJLE9BQU8sQ0FBQyxZQUFZLEtBQUssTUFBTSxFQUFFO2dCQUNwQyxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUscUJBQXFCLENBQUMsQ0FBQzthQUN2QztZQUNELGVBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7U0FDbkQ7SUFDRixDQUFDO0NBQUE7QUFFRCx5QkFBeUI7QUFFekIsU0FBZSxXQUFXLENBQUMsSUFBWSxFQUFFLElBQTJCOztRQUNuRSwyQkFBMkI7UUFDM0IsK0tBQStLO1FBQy9LLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLHdHQUF3RztRQUN4RyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RCxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1QixNQUFNLEtBQUssQ0FBUyxPQUFPLENBQUMsVUFBVSxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0UsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztDQUFBO0FBRUQsU0FBUyxLQUFLLENBQUMsUUFBZ0I7SUFDOUIsTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEQsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNuQyxpQkFBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQ25CLEVBQUMsT0FBTyxFQUFFLEVBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFDLEVBQUMsRUFBRSxDQUFDLEtBQVUsRUFBRSxRQUEwQixFQUFFLElBQVMsRUFBRSxFQUFFO1lBQ3hHLElBQUksS0FBSyxFQUFFO2dCQUNWLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDN0I7WUFDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEdBQUcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFO2dCQUMzRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxlQUFlLFFBQVEsQ0FBQyxVQUFVLGdCQUFnQixRQUFRLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3BHO1lBQ0QsSUFBSTtnQkFDSCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVE7b0JBQzNCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pCO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ1I7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQWUsS0FBSyxDQUFJLEtBQWEsRUFBRSxJQUFvQyxFQUFFLEdBQUcsSUFBVzs7UUFDMUYsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUk7WUFDbkIsSUFBSTtnQkFDSCxPQUFPLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDM0I7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDYixHQUFHLEVBQUUsQ0FBQztnQkFDTixJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO29CQUM5QixNQUFNLEdBQUcsQ0FBQztpQkFDVjtnQkFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQzthQUN4QztZQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO0lBQ0YsQ0FBQztDQUFBO0FBRUQsU0FBUyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxVQUFrQjtJQUM1RCxPQUFPLFdBQVcsQ0FBQyxVQUFVLEVBQUUsZUFBZSxHQUFHLGVBQUcsQ0FBQyxXQUFXLEdBQUcsK0JBQStCLEVBQUU7UUFDbkcsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUU7S0FDN0MsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELFNBQVMscUJBQXFCO0lBQzdCLE9BQU8sV0FBVyxDQUFDLFNBQVMsRUFBRSxlQUFlLEdBQUcsZUFBRyxDQUFDLFdBQVcsR0FBRyw4QkFBOEIsRUFBRTtRQUNqRyxjQUFjO1FBQ2QsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0tBQy9CLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFlLFdBQVcsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxJQUFjLEVBQUUsU0FBeUM7O1FBQ25ILE9BQU8sSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDOUMsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQzNCLE1BQU0sS0FBSyxHQUFHLG9CQUFJLENBQUMsUUFBUSxFQUMxQixJQUFJLEVBQUU7Z0JBQ04sTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQUM7WUFDSCxJQUFJLFNBQVMsRUFBRTtnQkFDZCxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDakI7WUFDRCxLQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDekIsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFO29CQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbkQsT0FBTztpQkFDUDtxQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3BCLGNBQWMsR0FBRyxJQUFJLENBQUM7aUJBQ3RCO3FCQUFNLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtvQkFDckIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3JCO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDdkIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDakMsR0FBRyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3BGLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtvQkFDZixJQUFJLGNBQWMsRUFBRTt3QkFDbkIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ3ZCO29CQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxHQUFHLEtBQUssSUFBSSxpQ0FBaUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUM3RyxJQUFJLE1BQU07d0JBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDbEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNmO3FCQUFNO29CQUNOLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxHQUFHLEtBQUssSUFBSSxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDMUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNoQjtZQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5pbXBvcnQge1ppcFJlc291cmNlTWlkZGxld2FyZX0gZnJvbSAnc2VydmUtc3RhdGljLXppcCc7XG5pbXBvcnQge2ZvcmssIENoaWxkUHJvY2Vzc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBjb25zdCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3QgcG0ySW5zdGFuY2VJZCA9IHByb2Nlc3MuZW52Lk5PREVfQVBQX0lOU1RBTkNFO1xuY29uc3QgaXNQbTIgPSBjbHVzdGVyLmlzV29ya2VyICYmIHBtMkluc3RhbmNlSWQgIT0gbnVsbDtcbmNvbnN0IGlzTWFpblByb2Nlc3MgPSAhaXNQbTIgfHwgcG0ySW5zdGFuY2VJZCA9PT0gJzAnO1xuXG5pbnRlcmZhY2UgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9uOiBudW1iZXI7XG5cdHBhdGg6IHN0cmluZztcblx0Y2hhbmdlRmV0Y2hVcmw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDaGVja3N1bSBleHRlbmRzIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbnM/OiB7W2tleTogc3RyaW5nXToge3ZlcnNpb246IG51bWJlciwgcGF0aDogc3RyaW5nfX07XG59XG5cbmludGVyZmFjZSBTZXR0aW5nIHtcblx0ZmV0Y2hVcmw6IHN0cmluZztcblx0ZmV0Y2hSZXRyeTogbnVtYmVyO1xuXHRmZXRjaExvZ0VyclBlclRpbWVzOiBudW1iZXI7XG5cdGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcblx0ZG93bmxvYWRNb2RlOiAnbWVtb3J5JyB8ICdmb3JrJyB8IG51bGw7XG59XG5cbmxldCBzZXR0aW5nOiBTZXR0aW5nO1xuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5sZXQgY3VycmVudENoZWNrc3VtOiBDaGVja3N1bSA9IHtcblx0dmVyc2lvbjogTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuXHRwYXRoOiAnJyxcblx0dmVyc2lvbnM6IHt9XG59O1xuXG5jb25zdCBjdXJyQ2hlY2tzdW1GaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2Fzc2V0cy1wcm9jZXNzZXIuY2hlY2tzdW0uanNvbicpO1xubGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG5sZXQgc3RvcHBlZCA9IGZhbHNlO1xubGV0IGVyckNvdW50ID0gMDtcbmxldCB6aXBEb3dubG9hZERpcjogc3RyaW5nO1xubGV0IHdhdGNoZXI6IGFueTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KHNlcnZlU3RhdGljWmlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdGxvZy5pbmZvKGBbbWVtb3J5IHN0YXR1c10gdG90YWwgJHtNYXRoLmZsb29yKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYiwgZnJlZSAke01hdGguZmxvb3Iob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TWJcXG5gICtcblx0XHRgW251bSBvZiBDUFVdICR7b3MuY3B1cygpLmxlbmd0aH1gKTtcblxuXHRzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKTtcblx0Y29uc3QgZmV0Y2hVcmwgPSBzZXR0aW5nLmZldGNoVXJsO1xuXHRpZiAoZmV0Y2hVcmwgPT0gbnVsbCkge1xuXHRcdGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXG5cdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG5cdFx0Ly8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG5cdFx0Ly8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG5cdFx0bG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHppcERvd25sb2FkRGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2Fzc2V0cy1wcm9jZXNzZXInKTtcblx0aWYgKCFmcy5leGlzdHNTeW5jKHppcERvd25sb2FkRGlyKSlcblx0XHRmcy5ta2RpcnBTeW5jKHppcERvd25sb2FkRGlyKTtcblx0Y29uc3QgZmlsZU5hbWVzID0gZnMucmVhZGRpclN5bmMoemlwRG93bmxvYWREaXIpLmZpbHRlcihuYW1lID0+IFBhdGguZXh0bmFtZShuYW1lKSA9PT0gJy56aXAnKTtcblx0aWYgKGZpbGVOYW1lcy5sZW5ndGggPiAwKSB7XG5cdFx0YXdhaXQgcmV0cnkoMjAsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG5cdFx0c2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblx0aWYgKGZzLmV4aXN0c1N5bmMoY3VyckNoZWNrc3VtRmlsZSkpIHtcblx0XHRjdXJyZW50Q2hlY2tzdW0gPSBPYmplY3QuYXNzaWduKGN1cnJlbnRDaGVja3N1bSwgZnMucmVhZEpTT05TeW5jKGN1cnJDaGVja3N1bUZpbGUpKTtcblx0XHRsb2cuaW5mbygnRm91bmQgc2F2ZWQgY2hlY2tzdW0gZmlsZSBhZnRlciByZWJvb3RcXG4nLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpKTtcblx0fVxuXHRyZXR1cm4gcnVuUmVwZWF0bHkoc2V0dGluZywgc2VydmVTdGF0aWNaaXApO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcblx0c3RvcHBlZCA9IHRydWU7XG5cdGlmICh3YXRjaGVyKVxuXHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0aWYgKHRpbWVyKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0fVxufVxuXG4vLyBmdW5jdGlvbiB1cGRhdGVTZXJ2ZXJTdGF0aWMocGF0aDogc3RyaW5nLCBzZXJ2ZVN0YXRpY1ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG4vLyBcdGxvZy5pbmZvKCdyZWFkICVzJywgcGF0aCk7XG4vLyBcdHRyeSB7XG4vLyBcdFx0c2VydmVTdGF0aWNaaXAudXBkYXRlWmlwKGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIHBhdGgpKSk7XG4vLyBcdH0gY2F0Y2ggKGUpIHtcbi8vIFx0XHRsb2cud2FybignRmFpbGVkIHRvIHVwZGF0ZSBmcm9tICcgKyBwYXRoLCBlKTtcbi8vIFx0fVxuLy8gfVxuXG5mdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcsIHN6aXApXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcsIHN6aXApO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0bGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcblx0dHJ5IHtcblx0XHRjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KHNldHRpbmcuZmV0Y2hSZXRyeSwgZmV0Y2gsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRpZiAoZXJyQ291bnQrKyAlIHNldHRpbmcuZmV0Y2hMb2dFcnJQZXJUaW1lcyA9PT0gMCkge1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqID09IG51bGwpXG5cdFx0cmV0dXJuO1xuXG5cdGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuXHRcdHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcblx0XHRsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9XG5cdGxldCBkb3dubG9hZHM6IHN0cmluZ1tdID0gW107XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24pIHtcblx0XHRjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCwgc3ppcCk7XG5cdFx0ZG93bmxvYWRzLnB1c2goZmlsZSk7XG5cdFx0Y3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuXHRcdGNvbnN0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoLCBzemlwKTtcblx0XHRcdFx0XHRjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG5cdFx0XHRcdFx0ZG93bmxvYWRzLnB1c2goZmlsZSk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZG93bmxvYWRzLmxlbmd0aCA+IDApIHtcblx0XHRmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJyksICd1dGY4Jyk7XG5cdFx0Ly8gZG93bmxvYWRzLmZvckVhY2goZmlsZSA9PiB1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc3ppcCkpO1xuXHRcdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG5cdFx0XHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0XHR9XG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdH1cbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG5cdGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcblx0Y29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0YXdhaXQgcmV0cnk8c3RyaW5nPihzZXR0aW5nLmZldGNoUmV0cnksIGZvcmtEb3dubG9hZHppcCwgcmVzb3VyY2UsIGRvd25sb2FkVG8pO1xuXHRyZXR1cm4gZG93bmxvYWRUbztcbn1cblxuZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHRsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuXHRcdFx0e2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0cmVqKGV4KTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoYm9keSk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPih0aW1lczogbnVtYmVyLCBmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSBzZXR0aW5nLmZldGNoUmV0cnkpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0bG9nLndhcm4oZXJyKTtcblx0XHRcdGxvZy5pbmZvKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDApKTtcblx0fVxufVxuXG5mdW5jdGlvbiBmb3JrRG93bmxvYWR6aXAocmVzb3VyY2U6IHN0cmluZywgdG9GaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0cmV0dXJuIGZvcmtQcm9jZXNzKCdkb3dubG9hZCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9kb3dubG9hZC16aXAtcHJvY2Vzcy5qcycsIFtcblx0XHRyZXNvdXJjZSwgdG9GaWxlTmFtZSwgc2V0dGluZy5mZXRjaFJldHJ5ICsgJydcblx0XSk7XG59XG5mdW5jdGlvbiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoKSB7XG5cdHJldHVybiBmb3JrUHJvY2VzcygnZXh0cmFjdCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9leHRyYWN0LXppcC1wcm9jZXNzLmpzJywgW1xuXHRcdHppcERvd25sb2FkRGlyLFxuXHRcdGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJylcblx0XSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10sIG9uUHJvY2Vzcz86IChjaGlsZDogQ2hpbGRQcm9jZXNzKSA9PiB2b2lkKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRsZXQgZXh0cmFjdGluZ0RvbmUgPSBmYWxzZTtcblx0XHRjb25zdCBjaGlsZCA9IGZvcmsoZmlsZVBhdGgsXG5cdFx0XHRhcmdzLCB7XG5cdFx0XHRzaWxlbnQ6IHRydWVcblx0XHR9KTtcblx0XHRpZiAob25Qcm9jZXNzKSB7XG5cdFx0XHRvblByb2Nlc3MoY2hpbGQpO1xuXHRcdH1cblx0XHRjaGlsZC5vbignbWVzc2FnZScsIG1zZyA9PiB7XG5cdFx0XHRpZiAobXNnLmxvZykge1xuXHRcdFx0XHRsb2cuaW5mbygnW2NoaWxkIHByb2Nlc3NdICVzIC0gJXMnLCBuYW1lLCBtc2cubG9nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIGlmIChtc2cuZG9uZSkge1xuXHRcdFx0XHRleHRyYWN0aW5nRG9uZSA9IHRydWU7XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5lcnJvcikge1xuXHRcdFx0XHRsb2cuZXJyb3IobXNnLmVycm9yKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjaGlsZC5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHR9KTtcblx0XHRjaGlsZC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcblx0XHRcdGxvZy5pbmZvKCdwcm9jZXNzIFtwaWQ6JXNdICVzIC0gZXhpdCB3aXRoOiAlZCAtICVzJywgY2hpbGQucGlkLCBuYW1lLCBjb2RlLCBzaWduYWwpO1xuXHRcdFx0aWYgKGNvZGUgIT09IDApIHtcblx0XHRcdFx0aWYgKGV4dHJhY3RpbmdEb25lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc29sdmUob3V0cHV0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2cuZXJyb3IoYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZXhpdCB3aXRoIGVycm9yIGNvZGUgJWQgLSBcIiVzXCJgLCBKU09OLnN0cmluZ2lmeShjb2RlKSwgc2lnbmFsKTtcblx0XHRcdFx0aWYgKG91dHB1dClcblx0XHRcdFx0XHRsb2cuZXJyb3IoYFtjaGlsZCBwcm9jZXNzXVtwaWQ6JHtjaGlsZC5waWR9XSR7bmFtZX0gLSBgLCBvdXRwdXQpO1xuXHRcdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZy5pbmZvKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGRvbmUgc3VjY2Vzc2Z1bGx5OmAsIG91dHB1dCk7XG5cdFx0XHRcdHJlc29sdmUob3V0cHV0KTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRsZXQgb3V0cHV0ID0gJyc7XG5cdFx0Y2hpbGQuc3Rkb3V0LnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdGNoaWxkLnN0ZG91dC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0b3V0cHV0ICs9IGNodW5rO1xuXHRcdH0pO1xuXHRcdGNoaWxkLnN0ZGVyci5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHRjaGlsZC5zdGRlcnIub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdG91dHB1dCArPSBjaHVuaztcblx0XHR9KTtcblx0fSk7XG59XG4iXX0=
