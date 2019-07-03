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
            let currVersions = currentChecksum.versions;
            if (currVersions == null) {
                currVersions = currentChecksum.versions = {};
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4QixnQ0FBZ0M7QUFDaEMsZ0VBQTBCO0FBQzFCLDhEQUE4QjtBQUU5QixpREFBaUQ7QUFDakQsd0NBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW9CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYTtJQUM5QixPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ2IsQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDekYsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDakIsSUFBSSxjQUFzQixDQUFDO0FBQzNCLElBQUksT0FBWSxDQUFDO0FBRWpCLFNBQXNCLEtBQUssQ0FBQyxjQUFxQzs7UUFDL0QsMkJB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SSxJQUFJLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDbkUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNoQjtxQkFBTTtvQkFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixLQUFLLENBQUMsR0FBRyxLQUFLLElBQUkscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQzFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDakI7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztZQUNoQixLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHtmb3JrLCBDaGlsZFByb2Nlc3N9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZmV0Y2gtcmVtb3RlJyk7XG5cbmNvbnN0IHBtMkluc3RhbmNlSWQgPSBwcm9jZXNzLmVudi5OT0RFX0FQUF9JTlNUQU5DRTtcbmNvbnN0IGlzUG0yID0gY2x1c3Rlci5pc1dvcmtlciAmJiBwbTJJbnN0YW5jZUlkICE9IG51bGw7XG5jb25zdCBpc01haW5Qcm9jZXNzID0gIWlzUG0yIHx8IHBtMkluc3RhbmNlSWQgPT09ICcwJztcblxuaW50ZXJmYWNlIE9sZENoZWNrc3VtIHtcbiAgdmVyc2lvbjogbnVtYmVyO1xuICBwYXRoOiBzdHJpbmc7XG4gIGNoYW5nZUZldGNoVXJsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2hlY2tzdW0gZXh0ZW5kcyBPbGRDaGVja3N1bSB7XG4gIHZlcnNpb25zPzoge1trZXk6IHN0cmluZ106IHt2ZXJzaW9uOiBudW1iZXIsIHBhdGg6IHN0cmluZ319O1xufVxuXG5pbnRlcmZhY2UgU2V0dGluZyB7XG4gIGZldGNoVXJsOiBzdHJpbmc7XG4gIGZldGNoUmV0cnk6IG51bWJlcjtcbiAgZmV0Y2hMb2dFcnJQZXJUaW1lczogbnVtYmVyO1xuICBmZXRjaEludGVydmFsU2VjOiBudW1iZXI7XG4gIGRvd25sb2FkTW9kZTogJ21lbW9yeScgfCAnZm9yaycgfCBudWxsO1xufVxuXG5sZXQgc2V0dGluZzogU2V0dGluZztcbi8vIGxldCBjdXJyVmVyc2lvbjogbnVtYmVyID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xubGV0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSB7XG4gIHZlcnNpb246IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcbiAgcGF0aDogJycsXG4gIHZlcnNpb25zOiB7fVxufTtcblxuY29uc3QgY3VyckNoZWNrc3VtRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdhc3NldHMtcHJvY2Vzc2VyLmNoZWNrc3VtLmpzb24nKTtcbmxldCB0aW1lcjogTm9kZUpTLlRpbWVyO1xubGV0IHN0b3BwZWQgPSBmYWxzZTtcbmxldCBlcnJDb3VudCA9IDA7XG5sZXQgemlwRG93bmxvYWREaXI6IHN0cmluZztcbmxldCB3YXRjaGVyOiBhbnk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydChzZXJ2ZVN0YXRpY1ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRsb2cuaW5mbyhgW21lbW9yeSBzdGF0dXNdIHRvdGFsICR7TWF0aC5mbG9vcihvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWIsIGZyZWUgJHtNYXRoLmZsb29yKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU1iXFxuYCArXG4gICAgYFtudW0gb2YgQ1BVXSAke29zLmNwdXMoKS5sZW5ndGh9YCk7XG5cbiAgc2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG4gIGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcbiAgaWYgKGZldGNoVXJsID09IG51bGwpIHtcbiAgICBsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgIT09ICdtZW1vcnknICAmJiAhaXNNYWluUHJvY2Vzcykge1xuICAgIC8vIG5vbiBpbk1lbW9yeSBtb2RlIG1lYW5zIGV4dHJhY3RpbmcgemlwIGZpbGUgdG8gbG9jYWwgZGlyZWN0b3J5IGRpc3Qvc3RhdGljLFxuICAgIC8vIGluIGNhc2Ugb2YgY2x1c3RlciBtb2RlLCB3ZSBvbmx5IHdhbnQgc2luZ2xlIHByb2Nlc3MgZG8gemlwIGV4dHJhY3RpbmcgYW5kIGZpbGUgd3JpdGluZyB0YXNrIHRvIGF2b2lkIGNvbmZsaWN0LlxuICAgIGxvZy5pbmZvKCdUaGlzIHByb2Nlc3MgaXMgbm90IG1haW4gcHJvY2VzcycpO1xuICAgIHJldHVybjtcbiAgfVxuICB6aXBEb3dubG9hZERpciA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdhc3NldHMtcHJvY2Vzc2VyJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBEb3dubG9hZERpcikpXG4gICAgZnMubWtkaXJwU3luYyh6aXBEb3dubG9hZERpcik7XG4gIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHppcERvd25sb2FkRGlyKS5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkgPT09ICcuemlwJyk7XG4gIGlmIChmaWxlTmFtZXMubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IHJldHJ5KDIwLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICB9XG5cbiAgaWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuICAgIHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG4gIGlmIChmcy5leGlzdHNTeW5jKGN1cnJDaGVja3N1bUZpbGUpKSB7XG4gICAgY3VycmVudENoZWNrc3VtID0gT2JqZWN0LmFzc2lnbihjdXJyZW50Q2hlY2tzdW0sIGZzLnJlYWRKU09OU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSk7XG4gICAgbG9nLmluZm8oJ0ZvdW5kIHNhdmVkIGNoZWNrc3VtIGZpbGUgYWZ0ZXIgcmVib290XFxuJywgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSk7XG4gIH1cbiAgcmV0dXJuIHJ1blJlcGVhdGx5KHNldHRpbmcsIHNlcnZlU3RhdGljWmlwKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG4gIHN0b3BwZWQgPSB0cnVlO1xuICBpZiAod2F0Y2hlcilcbiAgICB3YXRjaGVyLmNsb3NlKCk7XG4gIGlmICh0aW1lcikge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gdXBkYXRlU2VydmVyU3RhdGljKHBhdGg6IHN0cmluZywgc2VydmVTdGF0aWNaaXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuLy8gXHRsb2cuaW5mbygncmVhZCAlcycsIHBhdGgpO1xuLy8gXHR0cnkge1xuLy8gXHRcdHNlcnZlU3RhdGljWmlwLnVwZGF0ZVppcChmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBwYXRoKSkpO1xuLy8gXHR9IGNhdGNoIChlKSB7XG4vLyBcdFx0bG9nLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgZnJvbSAnICsgcGF0aCwgZSk7XG4vLyBcdH1cbi8vIH1cblxuZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChzdG9wcGVkKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIHJ1bihzZXR0aW5nLCBzemlwKVxuICAuY2F0Y2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIGlmIChzdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBydW5SZXBlYXRseShzZXR0aW5nLCBzemlwKTtcbiAgICB9LCBzZXR0aW5nLmZldGNoSW50ZXJ2YWxTZWMgKiAxMDAwKTtcbiAgfSk7XG59XG5hc3luYyBmdW5jdGlvbiBydW4oc2V0dGluZzogU2V0dGluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG4gIGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG4gIHRyeSB7XG4gICAgY2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksIGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcbiAgICBzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG4gICAgbG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcbiAgfVxuICBsZXQgZG93bmxvYWRzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uKSB7XG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKGNoZWNrc3VtT2JqLnBhdGgsIHN6aXApO1xuICAgIGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuICAgIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uID0gY2hlY2tzdW1PYmoudmVyc2lvbjtcbiAgfVxuICBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcbiAgICBsZXQgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuICAgIGlmIChjdXJyVmVyc2lvbnMgPT0gbnVsbCkge1xuICAgICAgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zID0ge307XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY2hlY2tzdW1PYmoudmVyc2lvbnMpKSB7XG4gICAgICBpZiAoIV8uaGFzKHRhcmdldFZlcnNpb25zLCBrZXkpIHx8IF8uZ2V0KGN1cnJWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkgIT09XG4gICAgICAgIF8uZ2V0KHRhcmdldFZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSkge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBkb3dubG9hZFppcCh0YXJnZXRWZXJzaW9uc1trZXldLnBhdGgsIHN6aXApO1xuICAgICAgICAgIGN1cnJWZXJzaW9uc1trZXldID0gdGFyZ2V0VmVyc2lvbnNba2V5XTtcbiAgICAgICAgICBkb3dubG9hZHMucHVzaChmaWxlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChkb3dubG9hZHMubGVuZ3RoID4gMCkge1xuICAgIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSwgJ3V0ZjgnKTtcbiAgICAvLyBkb3dubG9hZHMuZm9yRWFjaChmaWxlID0+IHVwZGF0ZVNlcnZlclN0YXRpYyhmaWxlLCBzemlwKSk7XG4gICAgaWYgKHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnZm9yaycpIHtcbiAgICAgIGF3YWl0IHJldHJ5KDIwLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICAgIH1cbiAgICBhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKTtcbiAgfVxufVxuXG4vLyBsZXQgZG93bmxvYWRDb3VudCA9IDA7XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKHBhdGg6IHN0cmluZywgc3ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG4gIGNvbnN0IHJlc291cmNlID0gVXJsLnJlc29sdmUoIHNldHRpbmcuZmV0Y2hVcmwsIHBhdGggKyAnPycgKyBNYXRoLnJhbmRvbSgpKTtcbiAgLy8gY29uc3QgZG93bmxvYWRUbyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsIGByZW1vdGUtJHtNYXRoLnJhbmRvbSgpfS0ke3BhdGguc3BsaXQoJy8nKS5wb3AoKX1gKTtcbiAgY29uc3QgbmV3TmFtZSA9IHBhdGgucmVwbGFjZSgvW1xcXFwvXS9nLCAnXycpO1xuICBjb25zdCBkb3dubG9hZFRvID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBuZXdOYW1lKTtcbiAgbG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuICBhd2FpdCByZXRyeTxzdHJpbmc+KHNldHRpbmcuZmV0Y2hSZXRyeSwgZm9ya0Rvd25sb2FkemlwLCByZXNvdXJjZSwgZG93bmxvYWRUbyk7XG4gIHJldHVybiBkb3dubG9hZFRvO1xufVxuXG5mdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgY29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG4gIGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgcmVxdWVzdC5nZXQoY2hlY2tVcmwsXG4gICAgICB7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcbiAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG4gICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICByZWooZXgpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShib2R5KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KHRpbWVzOiBudW1iZXIsIGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcbiAgZm9yIChsZXQgY250ID0gMDs7KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY250Kys7XG4gICAgICBpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgICBsb2cud2FybihlcnIpO1xuICAgICAgbG9nLmluZm8oJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeScpO1xuICAgIH1cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIGNudCAqIDUwMCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvcmtEb3dubG9hZHppcChyZXNvdXJjZTogc3RyaW5nLCB0b0ZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2Rvd25sb2FkJywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzJywgW1xuICAgIHJlc291cmNlLCB0b0ZpbGVOYW1lLCBzZXR0aW5nLmZldGNoUmV0cnkgKyAnJ1xuICBdKTtcbn1cbmZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCgpIHtcbiAgcmV0dXJuIGZvcmtQcm9jZXNzKCdleHRyYWN0JywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMnLCBbXG4gICAgemlwRG93bmxvYWREaXIsXG4gICAgYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKVxuICBdKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZm9ya1Byb2Nlc3MobmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSwgb25Qcm9jZXNzPzogKGNoaWxkOiBDaGlsZFByb2Nlc3MpID0+IHZvaWQpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBleHRyYWN0aW5nRG9uZSA9IGZhbHNlO1xuICAgIGNvbnN0IGNoaWxkID0gZm9yayhmaWxlUGF0aCxcbiAgICAgIGFyZ3MsIHtcbiAgICAgIHNpbGVudDogdHJ1ZVxuICAgIH0pO1xuICAgIGlmIChvblByb2Nlc3MpIHtcbiAgICAgIG9uUHJvY2VzcyhjaGlsZCk7XG4gICAgfVxuICAgIGNoaWxkLm9uKCdtZXNzYWdlJywgbXNnID0+IHtcbiAgICAgIGlmIChtc2cubG9nKSB7XG4gICAgICAgIGxvZy5pbmZvKCdbY2hpbGQgcHJvY2Vzc10gJXMgLSAlcycsIG5hbWUsIG1zZy5sb2cpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKG1zZy5kb25lKSB7XG4gICAgICAgIGV4dHJhY3RpbmdEb25lID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLmVycm9yKSB7XG4gICAgICAgIGxvZy5lcnJvcihtc2cuZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNoaWxkLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJlamVjdChvdXRwdXQpO1xuICAgIH0pO1xuICAgIGNoaWxkLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3Byb2Nlc3MgW3BpZDolc10gJXMgLSBleGl0IHdpdGg6ICVkIC0gJXMnLCBjaGlsZC5waWQsIG5hbWUsIGNvZGUsIHNpZ25hbCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICBpZiAoZXh0cmFjdGluZ0RvbmUpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5lcnJvcihgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBleGl0IHdpdGggZXJyb3IgY29kZSAlZCAtIFwiJXNcImAsIEpTT04uc3RyaW5naWZ5KGNvZGUpLCBzaWduYWwpO1xuICAgICAgICBpZiAob3V0cHV0KVxuICAgICAgICAgIGxvZy5lcnJvcihgW2NoaWxkIHByb2Nlc3NdW3BpZDoke2NoaWxkLnBpZH1dJHtuYW1lfSAtIGAsIG91dHB1dCk7XG4gICAgICAgIHJlamVjdChvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZG9uZSBzdWNjZXNzZnVsbHk6YCwgb3V0cHV0KTtcbiAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBvdXRwdXQgPSAnJztcbiAgICBjaGlsZC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgY2hpbGQuc3Rkb3V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgfSk7XG4gICAgY2hpbGQuc3RkZXJyLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgIGNoaWxkLnN0ZGVyci5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==
