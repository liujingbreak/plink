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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsOERBQThCO0FBQzlCLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLHdEQUF3QjtBQUN4QixnQ0FBZ0M7QUFDaEMsZ0VBQTBCO0FBQzFCLDhEQUE4QjtBQUU5QixpREFBaUQ7QUFDakQsd0NBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW9CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYTtJQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDekYsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDakIsSUFBSSxjQUFzQixDQUFDO0FBQzNCLElBQUksT0FBWSxDQUFDO0FBRWpCLFNBQXNCLEtBQUssQ0FBQyxjQUFxQzs7UUFDaEUsMkJB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LElBQUksS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNsRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQ2Y7cUJBQU07b0JBQ04sR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLEdBQUcsS0FBSyxJQUFJLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUMxRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQ2hCO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDaEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IEFkbVppcCBmcm9tICdhZG0temlwJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcbmltcG9ydCB7WmlwUmVzb3VyY2VNaWRkbGV3YXJlfSBmcm9tICdzZXJ2ZS1zdGF0aWMtemlwJztcbmltcG9ydCB7Zm9yaywgQ2hpbGRQcm9jZXNzfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZScpO1xuXG5jb25zdCBwbTJJbnN0YW5jZUlkID0gcHJvY2Vzcy5lbnYuTk9ERV9BUFBfSU5TVEFOQ0U7XG5jb25zdCBpc1BtMiA9IGNsdXN0ZXIuaXNXb3JrZXIgJiYgcG0ySW5zdGFuY2VJZCAhPSBudWxsO1xuY29uc3QgaXNNYWluUHJvY2VzcyA9ICFpc1BtMiB8fCBwbTJJbnN0YW5jZUlkID09PSAnMCc7XG5cbmludGVyZmFjZSBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb246IG51bWJlcjtcblx0cGF0aDogc3RyaW5nO1xuXHRjaGFuZ2VGZXRjaFVybD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENoZWNrc3VtIGV4dGVuZHMgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9ucz86IHtba2V5OiBzdHJpbmddOiB7dmVyc2lvbjogbnVtYmVyLCBwYXRoOiBzdHJpbmd9fTtcbn1cblxuaW50ZXJmYWNlIFNldHRpbmcge1xuXHRmZXRjaFVybDogc3RyaW5nO1xuXHRmZXRjaFJldHJ5OiBudW1iZXI7XG5cdGZldGNoTG9nRXJyUGVyVGltZXM6IG51bWJlcjtcblx0ZmV0Y2hJbnRlcnZhbFNlYzogbnVtYmVyO1xuXHRkb3dubG9hZE1vZGU6ICdtZW1vcnknIHwgJ2ZvcmsnIHwgbnVsbDtcbn1cblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmxldCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3Nlci5jaGVja3N1bS5qc29uJyk7XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xubGV0IHppcERvd25sb2FkRGlyOiBzdHJpbmc7XG5sZXQgd2F0Y2hlcjogYW55O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnQoc2VydmVTdGF0aWNaaXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0bG9nLmluZm8oYFttZW1vcnkgc3RhdHVzXSB0b3RhbCAke01hdGguZmxvb3Iob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1iLCBmcmVlICR7TWF0aC5mbG9vcihvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NYlxcbmAgK1xuXHRcdGBbbnVtIG9mIENQVV0gJHtvcy5jcHVzKCkubGVuZ3RofWApO1xuXG5cdHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXHRjb25zdCBmZXRjaFVybCA9IHNldHRpbmcuZmV0Y2hVcmw7XG5cdGlmIChmZXRjaFVybCA9PSBudWxsKSB7XG5cdFx0bG9nLmluZm8oJ05vIGZldGNoVXJsIGNvbmZpZ3VyZWQsIHNraXAgZmV0Y2hpbmcgcmVzb3VyY2UuJyk7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0aWYgKHNldHRpbmcuZG93bmxvYWRNb2RlICE9PSAnbWVtb3J5JyAgJiYgIWlzTWFpblByb2Nlc3MpIHtcblx0XHQvLyBub24gaW5NZW1vcnkgbW9kZSBtZWFucyBleHRyYWN0aW5nIHppcCBmaWxlIHRvIGxvY2FsIGRpcmVjdG9yeSBkaXN0L3N0YXRpYyxcblx0XHQvLyBpbiBjYXNlIG9mIGNsdXN0ZXIgbW9kZSwgd2Ugb25seSB3YW50IHNpbmdsZSBwcm9jZXNzIGRvIHppcCBleHRyYWN0aW5nIGFuZCBmaWxlIHdyaXRpbmcgdGFzayB0byBhdm9pZCBjb25mbGljdC5cblx0XHRsb2cuaW5mbygnVGhpcyBwcm9jZXNzIGlzIG5vdCBtYWluIHByb2Nlc3MnKTtcblx0XHRyZXR1cm47XG5cdH1cblx0emlwRG93bmxvYWREaXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3NlcicpO1xuXHRpZiAoIWZzLmV4aXN0c1N5bmMoemlwRG93bmxvYWREaXIpKVxuXHRcdGZzLm1rZGlycFN5bmMoemlwRG93bmxvYWREaXIpO1xuXHRjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyh6aXBEb3dubG9hZERpcikuZmlsdGVyKG5hbWUgPT4gUGF0aC5leHRuYW1lKG5hbWUpID09PSAnLnppcCcpO1xuXHRpZiAoZmlsZU5hbWVzLmxlbmd0aCA+IDApIHtcblx0XHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0fVxuXG5cdGlmIChzZXR0aW5nLmZldGNoUmV0cnkgPT0gbnVsbClcblx0XHRzZXR0aW5nLmZldGNoUmV0cnkgPSAzO1xuXHRpZiAoZnMuZXhpc3RzU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSkge1xuXHRcdGN1cnJlbnRDaGVja3N1bSA9IE9iamVjdC5hc3NpZ24oY3VycmVudENoZWNrc3VtLCBmcy5yZWFkSlNPTlN5bmMoY3VyckNoZWNrc3VtRmlsZSkpO1xuXHRcdGxvZy5pbmZvKCdGb3VuZCBzYXZlZCBjaGVja3N1bSBmaWxlIGFmdGVyIHJlYm9vdFxcbicsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJykpO1xuXHR9XG5cdHJldHVybiBydW5SZXBlYXRseShzZXR0aW5nLCBzZXJ2ZVN0YXRpY1ppcCk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuXHRzdG9wcGVkID0gdHJ1ZTtcblx0aWYgKHdhdGNoZXIpXG5cdFx0d2F0Y2hlci5jbG9zZSgpO1xuXHRpZiAodGltZXIpIHtcblx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHR9XG59XG5cbi8vIGZ1bmN0aW9uIHVwZGF0ZVNlcnZlclN0YXRpYyhwYXRoOiBzdHJpbmcsIHNlcnZlU3RhdGljWmlwOiBaaXBSZXNvdXJjZU1pZGRsZXdhcmUpIHtcbi8vIFx0bG9nLmluZm8oJ3JlYWQgJXMnLCBwYXRoKTtcbi8vIFx0dHJ5IHtcbi8vIFx0XHRzZXJ2ZVN0YXRpY1ppcC51cGRhdGVaaXAoZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgcGF0aCkpKTtcbi8vIFx0fSBjYXRjaCAoZSkge1xuLy8gXHRcdGxvZy53YXJuKCdGYWlsZWQgdG8gdXBkYXRlIGZyb20gJyArIHBhdGgsIGUpO1xuLy8gXHR9XG4vLyB9XG5cbmZ1bmN0aW9uIHJ1blJlcGVhdGx5KHNldHRpbmc6IFNldHRpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSk6IFByb21pc2U8dm9pZD4ge1xuXHRpZiAoc3RvcHBlZClcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdHJldHVybiBydW4oc2V0dGluZywgc3ppcClcblx0LmNhdGNoKGVycm9yID0+IGxvZy5lcnJvcihlcnJvcikpXG5cdC50aGVuKCgpID0+IHtcblx0XHRpZiAoc3RvcHBlZClcblx0XHRcdHJldHVybjtcblx0XHR0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0cnVuUmVwZWF0bHkoc2V0dGluZywgc3ppcCk7XG5cdFx0fSwgc2V0dGluZy5mZXRjaEludGVydmFsU2VjICogMTAwMCk7XG5cdH0pO1xufVxuYXN5bmMgZnVuY3Rpb24gcnVuKHNldHRpbmc6IFNldHRpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHRsZXQgY2hlY2tzdW1PYmo6IENoZWNrc3VtO1xuXHR0cnkge1xuXHRcdGNoZWNrc3VtT2JqID0gYXdhaXQgcmV0cnkoc2V0dGluZy5mZXRjaFJldHJ5LCBmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcblx0XHRyZXR1cm47XG5cblx0aWYgKGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsKSB7XG5cdFx0c2V0dGluZy5mZXRjaFVybCA9IGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsO1xuXHRcdGxvZy5pbmZvKCdDaGFuZ2UgZmV0Y2ggVVJMIHRvJywgc2V0dGluZy5mZXRjaFVybCk7XG5cdH1cblx0bGV0IGRvd25sb2Fkczogc3RyaW5nW10gPSBbXTtcblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb24gIT0gbnVsbCAmJiBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiAhPT0gY2hlY2tzdW1PYmoudmVyc2lvbikge1xuXHRcdGNvbnN0IGZpbGUgPSBhd2FpdCBkb3dubG9hZFppcChjaGVja3N1bU9iai5wYXRoLCBzemlwKTtcblx0XHRkb3dubG9hZHMucHVzaChmaWxlKTtcblx0XHRjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiA9IGNoZWNrc3VtT2JqLnZlcnNpb247XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG5cdFx0bGV0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRpZiAoY3VyclZlcnNpb25zID09IG51bGwpIHtcblx0XHRcdGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucyA9IHt9O1xuXHRcdH1cblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoLCBzemlwKTtcblx0XHRcdFx0XHRjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG5cdFx0XHRcdFx0ZG93bmxvYWRzLnB1c2goZmlsZSk7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZG93bmxvYWRzLmxlbmd0aCA+IDApIHtcblx0XHRmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJyksICd1dGY4Jyk7XG5cdFx0Ly8gZG93bmxvYWRzLmZvckVhY2goZmlsZSA9PiB1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc3ppcCkpO1xuXHRcdGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG5cdFx0XHRhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcblx0XHR9XG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdH1cbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcsIHN6aXA6IFppcFJlc291cmNlTWlkZGxld2FyZSkge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG5cdGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcblx0Y29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0YXdhaXQgcmV0cnk8c3RyaW5nPihzZXR0aW5nLmZldGNoUmV0cnksIGZvcmtEb3dubG9hZHppcCwgcmVzb3VyY2UsIGRvd25sb2FkVG8pO1xuXHRyZXR1cm4gZG93bmxvYWRUbztcbn1cblxuZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHRsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuXHRcdFx0e2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0cmVqKGV4KTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoYm9keSk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPih0aW1lczogbnVtYmVyLCBmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSBzZXR0aW5nLmZldGNoUmV0cnkpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0bG9nLndhcm4oZXJyKTtcblx0XHRcdGxvZy5pbmZvKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDApKTtcblx0fVxufVxuXG5mdW5jdGlvbiBmb3JrRG93bmxvYWR6aXAocmVzb3VyY2U6IHN0cmluZywgdG9GaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcblx0cmV0dXJuIGZvcmtQcm9jZXNzKCdkb3dubG9hZCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9kb3dubG9hZC16aXAtcHJvY2Vzcy5qcycsIFtcblx0XHRyZXNvdXJjZSwgdG9GaWxlTmFtZSwgc2V0dGluZy5mZXRjaFJldHJ5ICsgJydcblx0XSk7XG59XG5mdW5jdGlvbiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoKSB7XG5cdHJldHVybiBmb3JrUHJvY2VzcygnZXh0cmFjdCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9leHRyYWN0LXppcC1wcm9jZXNzLmpzJywgW1xuXHRcdHppcERvd25sb2FkRGlyLFxuXHRcdGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJylcblx0XSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10sIG9uUHJvY2Vzcz86IChjaGlsZDogQ2hpbGRQcm9jZXNzKSA9PiB2b2lkKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRsZXQgZXh0cmFjdGluZ0RvbmUgPSBmYWxzZTtcblx0XHRjb25zdCBjaGlsZCA9IGZvcmsoZmlsZVBhdGgsXG5cdFx0XHRhcmdzLCB7XG5cdFx0XHRzaWxlbnQ6IHRydWVcblx0XHR9KTtcblx0XHRpZiAob25Qcm9jZXNzKSB7XG5cdFx0XHRvblByb2Nlc3MoY2hpbGQpO1xuXHRcdH1cblx0XHRjaGlsZC5vbignbWVzc2FnZScsIG1zZyA9PiB7XG5cdFx0XHRpZiAobXNnLmxvZykge1xuXHRcdFx0XHRsb2cuaW5mbygnW2NoaWxkIHByb2Nlc3NdICVzIC0gJXMnLCBuYW1lLCBtc2cubG9nKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIGlmIChtc2cuZG9uZSkge1xuXHRcdFx0XHRleHRyYWN0aW5nRG9uZSA9IHRydWU7XG5cdFx0XHR9IGVsc2UgaWYgKG1zZy5lcnJvcikge1xuXHRcdFx0XHRsb2cuZXJyb3IobXNnLmVycm9yKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjaGlsZC5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHR9KTtcblx0XHRjaGlsZC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcblx0XHRcdGxvZy5pbmZvKCdwcm9jZXNzIFtwaWQ6JXNdICVzIC0gZXhpdCB3aXRoOiAlZCAtICVzJywgY2hpbGQucGlkLCBuYW1lLCBjb2RlLCBzaWduYWwpO1xuXHRcdFx0aWYgKGNvZGUgIT09IDApIHtcblx0XHRcdFx0aWYgKGV4dHJhY3RpbmdEb25lKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc29sdmUob3V0cHV0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2cuZXJyb3IoYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZXhpdCB3aXRoIGVycm9yIGNvZGUgJWQgLSBcIiVzXCJgLCBKU09OLnN0cmluZ2lmeShjb2RlKSwgc2lnbmFsKTtcblx0XHRcdFx0aWYgKG91dHB1dClcblx0XHRcdFx0XHRsb2cuZXJyb3IoYFtjaGlsZCBwcm9jZXNzXVtwaWQ6JHtjaGlsZC5waWR9XSR7bmFtZX0gLSBgLCBvdXRwdXQpO1xuXHRcdFx0XHRyZWplY3Qob3V0cHV0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvZy5pbmZvKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGRvbmUgc3VjY2Vzc2Z1bGx5OmAsIG91dHB1dCk7XG5cdFx0XHRcdHJlc29sdmUob3V0cHV0KTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRsZXQgb3V0cHV0ID0gJyc7XG5cdFx0Y2hpbGQuc3Rkb3V0LnNldEVuY29kaW5nKCd1dGYtOCcpO1xuXHRcdGNoaWxkLnN0ZG91dC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuXHRcdFx0b3V0cHV0ICs9IGNodW5rO1xuXHRcdH0pO1xuXHRcdGNoaWxkLnN0ZGVyci5zZXRFbmNvZGluZygndXRmLTgnKTtcblx0XHRjaGlsZC5zdGRlcnIub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcblx0XHRcdG91dHB1dCArPSBjaHVuaztcblx0XHR9KTtcblx0fSk7XG59XG4iXX0=
