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
            `[CPU] ${JSON.stringify(os_1.default.cpus(), null, '  ')}`);
        zipDownloadDir = __api_1.default.config.resolve('destDir', 'assets-processer');
        if (!fs_extra_1.default.existsSync(zipDownloadDir))
            fs_extra_1.default.mkdirpSync(zipDownloadDir);
        const fileNames = fs_extra_1.default.readdirSync(zipDownloadDir).filter(name => path_1.default.extname(name) === '.zip');
        if (fileNames.length > 0) {
            yield retry(20, forkExtractExstingZip);
        }
        // for (const name of fileNames) {
        // 	const file = Path.resolve(zipDownloadDir, name);
        // 	updateServerStatic(file, serveStaticZip);
        // }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4QixnQ0FBZ0M7QUFDaEMsZ0VBQTBCO0FBQzFCLDhEQUE4QjtBQUU5QixpREFBaUQ7QUFDakQsd0NBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW9CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYTtJQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDekYsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDakIsSUFBSSxjQUFzQixDQUFDO0FBQzNCLElBQUksT0FBWSxDQUFDO0FBRWpCLFNBQXNCLEtBQUssQ0FBQyxjQUFxQzs7UUFDaEUsMkJB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SUFBSSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ2xFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDZjtxQkFBTTtvQkFDTixHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixLQUFLLENBQUMsR0FBRyxLQUFLLElBQUkscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQzFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDaEI7WUFDRixDQUFDLENBQUMsQ0FBQztZQUNILElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztZQUNoQixLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtaaXBSZXNvdXJjZU1pZGRsZXdhcmV9IGZyb20gJ3NlcnZlLXN0YXRpYy16aXAnO1xuaW1wb3J0IHtmb3JrLCBDaGlsZFByb2Nlc3N9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZmV0Y2gtcmVtb3RlJyk7XG5cbmNvbnN0IHBtMkluc3RhbmNlSWQgPSBwcm9jZXNzLmVudi5OT0RFX0FQUF9JTlNUQU5DRTtcbmNvbnN0IGlzUG0yID0gY2x1c3Rlci5pc1dvcmtlciAmJiBwbTJJbnN0YW5jZUlkICE9IG51bGw7XG5jb25zdCBpc01haW5Qcm9jZXNzID0gIWlzUG0yIHx8IHBtMkluc3RhbmNlSWQgPT09ICcwJztcblxuaW50ZXJmYWNlIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbjogbnVtYmVyO1xuXHRwYXRoOiBzdHJpbmc7XG5cdGNoYW5nZUZldGNoVXJsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2hlY2tzdW0gZXh0ZW5kcyBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb25zPzoge1trZXk6IHN0cmluZ106IHt2ZXJzaW9uOiBudW1iZXIsIHBhdGg6IHN0cmluZ319O1xufVxuXG5pbnRlcmZhY2UgU2V0dGluZyB7XG5cdGZldGNoVXJsOiBzdHJpbmc7XG5cdGZldGNoUmV0cnk6IG51bWJlcjtcblx0ZmV0Y2hMb2dFcnJQZXJUaW1lczogbnVtYmVyO1xuXHRmZXRjaEludGVydmFsU2VjOiBudW1iZXI7XG5cdGRvd25sb2FkTW9kZTogJ21lbW9yeScgfCAnZm9yaycgfCBudWxsO1xufVxuXG5sZXQgc2V0dGluZzogU2V0dGluZztcbi8vIGxldCBjdXJyVmVyc2lvbjogbnVtYmVyID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xubGV0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSB7XG5cdHZlcnNpb246IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcblx0cGF0aDogJycsXG5cdHZlcnNpb25zOiB7fVxufTtcblxuY29uc3QgY3VyckNoZWNrc3VtRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdhc3NldHMtcHJvY2Vzc2VyLmNoZWNrc3VtLmpzb24nKTtcbmxldCB0aW1lcjogTm9kZUpTLlRpbWVyO1xubGV0IHN0b3BwZWQgPSBmYWxzZTtcbmxldCBlcnJDb3VudCA9IDA7XG5sZXQgemlwRG93bmxvYWREaXI6IHN0cmluZztcbmxldCB3YXRjaGVyOiBhbnk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydChzZXJ2ZVN0YXRpY1ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG5cdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRsb2cuaW5mbyhgW21lbW9yeSBzdGF0dXNdIHRvdGFsICR7TWF0aC5mbG9vcihvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWIsIGZyZWUgJHtNYXRoLmZsb29yKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU1iXFxuYCArXG5cdFx0YFtDUFVdICR7SlNPTi5zdHJpbmdpZnkob3MuY3B1cygpLCBudWxsLCAnICAnKX1gKTtcblx0emlwRG93bmxvYWREaXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3NlcicpO1xuXHRpZiAoIWZzLmV4aXN0c1N5bmMoemlwRG93bmxvYWREaXIpKVxuXHRcdGZzLm1rZGlycFN5bmMoemlwRG93bmxvYWREaXIpO1xuXHRjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyh6aXBEb3dubG9hZERpcikuZmlsdGVyKG5hbWUgPT4gUGF0aC5leHRuYW1lKG5hbWUpID09PSAnLnppcCcpO1xuXHRpZiAoZmlsZU5hbWVzLmxlbmd0aCA+IDApIHtcblx0XHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0fVxuXHQvLyBmb3IgKGNvbnN0IG5hbWUgb2YgZmlsZU5hbWVzKSB7XG5cdC8vIFx0Y29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmFtZSk7XG5cdC8vIFx0dXBkYXRlU2VydmVyU3RhdGljKGZpbGUsIHNlcnZlU3RhdGljWmlwKTtcblx0Ly8gfVxuXG5cdHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXHRjb25zdCBmZXRjaFVybCA9IHNldHRpbmcuZmV0Y2hVcmw7XG5cdGlmIChmZXRjaFVybCA9PSBudWxsKSB7XG5cdFx0bG9nLmluZm8oJ05vIGZldGNoVXJsIGNvbmZpZ3VyZWQsIHNraXAgZmV0Y2hpbmcgcmVzb3VyY2UuJyk7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0aWYgKHNldHRpbmcuZG93bmxvYWRNb2RlICE9PSAnbWVtb3J5JyAgJiYgIWlzTWFpblByb2Nlc3MpIHtcblx0XHQvLyBub24gaW5NZW1vcnkgbW9kZSBtZWFucyBleHRyYWN0aW5nIHppcCBmaWxlIHRvIGxvY2FsIGRpcmVjdG9yeSBkaXN0L3N0YXRpYyxcblx0XHQvLyBpbiBjYXNlIG9mIGNsdXN0ZXIgbW9kZSwgd2Ugb25seSB3YW50IHNpbmdsZSBwcm9jZXNzIGRvIHppcCBleHRyYWN0aW5nIGFuZCBmaWxlIHdyaXRpbmcgdGFzayB0byBhdm9pZCBjb25mbGljdC5cblx0XHRsb2cuaW5mbygnVGhpcyBwcm9jZXNzIGlzIG5vdCBtYWluIHByb2Nlc3MnKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG5cdFx0c2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblx0aWYgKGZzLmV4aXN0c1N5bmMoY3VyckNoZWNrc3VtRmlsZSkpIHtcblx0XHRjdXJyZW50Q2hlY2tzdW0gPSBPYmplY3QuYXNzaWduKGN1cnJlbnRDaGVja3N1bSwgZnMucmVhZEpTT05TeW5jKGN1cnJDaGVja3N1bUZpbGUpKTtcblx0XHRsb2cuaW5mbygnRm91bmQgc2F2ZWQgY2hlY2tzdW0gZmlsZSBhZnRlciByZWJvb3RcXG4nLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpKTtcblx0fVxuXHRyZXR1cm4gcnVuUmVwZWF0bHkoc2V0dGluZywgc2VydmVTdGF0aWNaaXApO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcblx0c3RvcHBlZCA9IHRydWU7XG5cdGlmICh3YXRjaGVyKVxuXHRcdHdhdGNoZXIuY2xvc2UoKTtcblx0aWYgKHRpbWVyKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0fVxufVxuXG4vLyBmdW5jdGlvbiB1cGRhdGVTZXJ2ZXJTdGF0aWMocGF0aDogc3RyaW5nLCBzZXJ2ZVN0YXRpY1ppcDogWmlwUmVzb3VyY2VNaWRkbGV3YXJlKSB7XG4vLyBcdGxvZy5pbmZvKCdyZWFkICVzJywgcGF0aCk7XG4vLyBcdHRyeSB7XG4vLyBcdFx0c2VydmVTdGF0aWNaaXAudXBkYXRlWmlwKGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIHBhdGgpKSk7XG4vLyBcdH0gY2F0Y2ggKGUpIHtcbi8vIFx0XHRsb2cud2FybignRmFpbGVkIHRvIHVwZGF0ZSBmcm9tICcgKyBwYXRoLCBlKTtcbi8vIFx0fVxuLy8gfVxuXG5mdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcsIHN6aXApXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcsIHN6aXApO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nLCBzemlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcblx0bGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcblx0dHJ5IHtcblx0XHRjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KHNldHRpbmcuZmV0Y2hSZXRyeSwgZmV0Y2gsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRpZiAoZXJyQ291bnQrKyAlIHNldHRpbmcuZmV0Y2hMb2dFcnJQZXJUaW1lcyA9PT0gMCkge1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqID09IG51bGwpXG5cdFx0cmV0dXJuO1xuXG5cdGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuXHRcdHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcblx0XHRsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9XG5cdGxldCBkb3dubG9hZHM6IHN0cmluZ1tdID0gW107XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24pIHtcblx0XHRjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCwgc3ppcCk7XG5cdFx0ZG93bmxvYWRzLnB1c2goZmlsZSk7XG5cdFx0Y3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuXHRcdGNvbnN0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoLCBzemlwKTtcblx0XHRcdFx0XHRjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG5cdFx0XHRcdFx0ZG93bmxvYWRzLnB1c2goZmlsZSk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZG93bmxvYWRzLmxlbmd0aCA+IDApIHtcblx0XHRmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJyksICd1dGY4Jyk7XG5cdFx0Ly8gZG93bmxvYWRzLmZvckVhY2goZmlsZSA9PiB1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc3ppcCkpO1xuXHRcdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG5cdFx0XHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0XHR9XG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdH1cbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG5cdGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcblx0Y29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0YXdhaXQgcmV0cnk8c3RyaW5nPihzZXR0aW5nLmZldGNoUmV0cnksIGZvcmtEb3dubG9hZHppcCwgcmVzb3VyY2UsIGRvd25sb2FkVG8pO1xuXHRyZXR1cm4gZG93bmxvYWRUbztcbn1cblxuZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHRsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuXHRcdFx0e2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0cmVqKGV4KTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoYm9keSk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPih0aW1lczogbnVtYmVyLCBmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSBzZXR0aW5nLmZldGNoUmV0cnkpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0bG9nLndhcm4oZXJyKTtcblx0XHRcdGxvZy5pbmZvKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDApKTtcblx0fVxufVxuXG5mdW5jdGlvbiBmb3JrRG93bmxvYWR6aXAocmVzb3VyY2U6IHN0cmluZywgdG9GaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0cmV0dXJuIGZvcmtQcm9jZXNzKCdkb3dubG9hZCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9kb3dubG9hZC16aXAtcHJvY2Vzcy5qcycsIFtcblx0XHRyZXNvdXJjZSwgdG9GaWxlTmFtZSwgc2V0dGluZy5mZXRjaFJldHJ5ICsgJydcblx0XSk7XG59XG5mdW5jdGlvbiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoKSB7XG5cdHJldHVybiBmb3JrUHJvY2VzcygnZXh0cmFjdCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9leHRyYWN0LXppcC1wcm9jZXNzLmpzJywgW1xuXHRcdHppcERvd25sb2FkRGlyLFxuXHRcdGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJylcblx0XSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10sIG9uUHJvY2Vzcz86IChjaGlsZDogQ2hpbGRQcm9jZXNzKSA9PiB2b2lkKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRsZXQgZXh0cmFjdGluZ0RvbmUgPSBmYWxzZTtcblx0XHRjb25zdCBjaGlsZCA9IGZvcmsoZmlsZVBhdGgsXG5cdFx0XHRhcmdzLCB7XG5cdFx0XHRzaWxlbnQ6IHRydWVcblx0XHR9KTtcblx0XHRpZiAob25Qcm9jZXNzKSB7XG5cdFx0XHRvblByb2Nlc3MoY2hpbGQpO1xuXHRcdH1cblx0XHRjaGlsZC5vbignbWVzc2FnZScsIG1zZyA9PiB7XG5cdFx0XHRpZiAobXNnLmxvZykge1xuXHRcdFx0XHRsb2cuaW5mbygnW2NoaWxkIHByb2Nlc3NdICVzIC0gJXMnLCBuYW1lLCBtc2cubG9nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIGlmIChtc2cuZG9uZSkge1xuXHRcdFx0XHRleHRyYWN0aW5nRG9uZSA9IHRydWU7XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5lcnJvcikge1xuXHRcdFx0XHRsb2cuZXJyb3IobXNnLmVycm9yKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjaGlsZC5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHR9KTtcblx0XHRjaGlsZC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcblx0XHRcdGxvZy5pbmZvKCdwcm9jZXNzIFtwaWQ6JXNdICVzIC0gZXhpdCB3aXRoOiAlZCAtICVzJywgY2hpbGQucGlkLCBuYW1lLCBjb2RlLCBzaWduYWwpO1xuXHRcdFx0aWYgKGNvZGUgIT09IDApIHtcblx0XHRcdFx0aWYgKGV4dHJhY3RpbmdEb25lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc29sdmUob3V0cHV0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2cuZXJyb3IoYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZXhpdCB3aXRoIGVycm9yIGNvZGUgJWQgLSBcIiVzXCJgLCBKU09OLnN0cmluZ2lmeShjb2RlKSwgc2lnbmFsKTtcblx0XHRcdFx0aWYgKG91dHB1dClcblx0XHRcdFx0XHRsb2cuZXJyb3IoYFtjaGlsZCBwcm9jZXNzXVtwaWQ6JHtjaGlsZC5waWR9XSR7bmFtZX0gLSBgLCBvdXRwdXQpO1xuXHRcdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZy5pbmZvKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGRvbmUgc3VjY2Vzc2Z1bGx5OmAsIG91dHB1dCk7XG5cdFx0XHRcdHJlc29sdmUob3V0cHV0KTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRsZXQgb3V0cHV0ID0gJyc7XG5cdFx0Y2hpbGQuc3Rkb3V0LnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdGNoaWxkLnN0ZG91dC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0b3V0cHV0ICs9IGNodW5rO1xuXHRcdH0pO1xuXHRcdGNoaWxkLnN0ZGVyci5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHRjaGlsZC5zdGRlcnIub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdG91dHB1dCArPSBjaHVuaztcblx0XHR9KTtcblx0fSk7XG59XG4iXX0=
