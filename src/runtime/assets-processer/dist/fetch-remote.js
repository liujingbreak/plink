"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const request = tslib_1.__importStar(require("request"));
const Url = tslib_1.__importStar(require("url"));
const _ = tslib_1.__importStar(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.fetch-remote');
const pm2InstanceId = process.env.NODE_APP_INSTANCE;
const isPm2 = cluster_1.default.isWorker && pm2InstanceId != null;
const isMainProcess = !isPm2 || pm2InstanceId !== '0';
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
function start() {
    log.info(pm2InstanceId);
    if (!isMainProcess) {
        log.info('This process is not main process');
        return;
    }
    setting = __api_1.default.config.get(__api_1.default.packageName);
    const fetchUrl = setting.fetchUrl;
    if (fetchUrl == null) {
        log.info('No fetchUrl configured, skip fetching resource.');
        return Promise.resolve();
    }
    if (setting.fetchRetry == null)
        setting.fetchRetry = 3;
    log.info(setting);
    if (fs_extra_1.default.existsSync(currChecksumFile)) {
        currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(currChecksumFile));
        log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
    }
    return runRepeatly(setting);
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
function runRepeatly(setting) {
    if (stopped)
        return Promise.resolve();
    return run(setting)
        .catch(error => log.error(error))
        .then(() => {
        if (stopped)
            return;
        timer = setTimeout(() => {
            runRepeatly(setting);
        }, setting.fetchIntervalSec * 1000);
    });
}
function run(setting) {
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
            yield downloadZip(checksumObj.path);
            downloaded = true;
            currentChecksum.version = checksumObj.version;
        }
        if (checksumObj.versions) {
            const currVersions = currentChecksum.versions;
            const targetVersions = checksumObj.versions;
            for (const key of Object.keys(checksumObj.versions)) {
                if (!_.has(targetVersions, key) || _.get(currVersions, [key, 'version']) !==
                    _.get(targetVersions, [key, 'version'])) {
                    yield downloadZip(targetVersions[key].path);
                    currVersions[key] = targetVersions[key];
                    downloaded = true;
                }
            }
        }
        if (downloaded) {
            fs_extra_1.default.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, ' '), 'utf8');
            __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded');
        }
    });
}
// let downloadCount = 0;
function downloadZip(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        log.info(`${os_1.default.hostname()} ${os_1.default.userInfo().username} download zip[Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M`);
        const resource = Url.resolve(setting.fetchUrl, path + '?' + Math.random());
        const downloadTo = __api_1.default.config.resolve('destDir', `remote-${Math.random()}.zip`);
        log.info('fetch', resource);
        yield retry(() => {
            return new Promise((resolve, rej) => {
                request.get(resource).on('error', err => {
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
                log.info('extract to %s', downloadTo);
                yield tryExtract();
                log.info(`extract ${downloadTo} done`);
                fs_extra_1.default.unlinkSync(downloadTo);
                // tslint:disable-next-line
                log.info(`${os_1.default.hostname()} ${os_1.default.userInfo().username} download done[Free mem]: ${Math.round(os_1.default.freemem() / 1048576)}M, [total mem]: ${Math.round(os_1.default.totalmem() / 1048576)}M`);
                break;
            }
            catch (ex) {
                yield new Promise(resolve => setTimeout(resolve, 1000));
            }
        } while (++retryCount <= 3);
        if (retryCount > 3) {
            log.info('Give up on extracting zip');
            return Promise.resolve();
        }
        function tryExtract() {
            return new Promise((resolve, reject) => {
                zip.extractAllToAsync(__api_1.default.config.resolve('staticDir'), true, (err) => {
                    if (err) {
                        if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                            log.error(err);
                            // tslint:disable-next-line
                            // log.info(`${os.hostname() + ' ' + os.userInfo().username} Free mem: ${os.freemem()}, total mem: ${os.totalmem()}, retrying...`);
                            reject(err);
                        }
                        reject(err);
                    }
                    else
                        resolve();
                });
            });
        }
    });
}
function fetch(fetchUrl) {
    const checkUrl = fetchUrl + '?' + Math.random();
    log.debug('check', checkUrl);
    return new Promise((resolve, rej) => {
        request.get(checkUrl, { headers: { Referer: Url.resolve(checkUrl, '/') } }, (error, response, body) => {
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
                log.debug(err);
                log.debug('Encounter error, will retry');
            }
            yield new Promise(res => setTimeout(res, 5000));
        }
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFDMUIsOERBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW1CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYTtJQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFDekYsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFFakIsU0FBZ0IsS0FBSztJQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3hCLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDbkIsR0FBRyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FB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QUssQ0FBQyxlQUFlLFFBQVEsQ0FBQyxVQUFVLGdCQUFnQixRQUFRLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3BHO1lBQ0QsSUFBSTtnQkFDSCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVE7b0JBQzNCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pCO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ1I7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQWUsS0FBSyxDQUFJLElBQW9DLEVBQUUsR0FBRyxJQUFXOztRQUMzRSxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSTtZQUNuQixJQUFJO2dCQUNILE9BQU8sTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUMzQjtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNiLEdBQUcsRUFBRSxDQUFDO2dCQUNOLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7b0JBQzlCLE1BQU0sR0FBRyxDQUFDO2lCQUNWO2dCQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRDtJQUNGLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3QgcG0ySW5zdGFuY2VJZCA9IHByb2Nlc3MuZW52Lk5PREVfQVBQX0lOU1RBTkNFO1xuY29uc3QgaXNQbTIgPSBjbHVzdGVyLmlzV29ya2VyICYmIHBtMkluc3RhbmNlSWQgIT0gbnVsbDtcbmNvbnN0IGlzTWFpblByb2Nlc3MgPSAhaXNQbTIgfHwgcG0ySW5zdGFuY2VJZCAhPT0gJzAnO1xuXG5pbnRlcmZhY2UgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9uOiBudW1iZXI7XG5cdHBhdGg6IHN0cmluZztcblx0Y2hhbmdlRmV0Y2hVcmw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDaGVja3N1bSBleHRlbmRzIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbnM/OiB7W2tleTogc3RyaW5nXToge3ZlcnNpb246IG51bWJlciwgcGF0aDogc3RyaW5nfX07XG59XG5cbmludGVyZmFjZSBTZXR0aW5nIHtcblx0ZmV0Y2hVcmw6IHN0cmluZztcblx0ZmV0Y2hSZXRyeTogbnVtYmVyO1xuXHRmZXRjaExvZ0VyclBlclRpbWVzOiBudW1iZXI7XG5cdGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcbn1cblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmxldCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5cbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnYXNzZXRzLXByb2Nlc3Nlci5jaGVja3N1bS5qc29uJyk7XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoKSB7XG5cdGxvZy5pbmZvKHBtMkluc3RhbmNlSWQpO1xuXHRpZiAoIWlzTWFpblByb2Nlc3MpIHtcblx0XHRsb2cuaW5mbygnVGhpcyBwcm9jZXNzIGlzIG5vdCBtYWluIHByb2Nlc3MnKTtcblx0XHRyZXR1cm47XG5cdH1cblx0c2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cdGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcblx0aWYgKGZldGNoVXJsID09IG51bGwpIHtcblx0XHRsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG5cdFx0c2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblx0bG9nLmluZm8oc2V0dGluZyk7XG5cdGlmIChmcy5leGlzdHNTeW5jKGN1cnJDaGVja3N1bUZpbGUpKSB7XG5cdFx0Y3VycmVudENoZWNrc3VtID0gT2JqZWN0LmFzc2lnbihjdXJyZW50Q2hlY2tzdW0sIGZzLnJlYWRKU09OU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSk7XG5cdFx0bG9nLmluZm8oJ0ZvdW5kIHNhdmVkIGNoZWNrc3VtIGZpbGUgYWZ0ZXIgcmVib290XFxuJywgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSk7XG5cdH1cblx0cmV0dXJuIHJ1blJlcGVhdGx5KHNldHRpbmcpO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcblx0c3RvcHBlZCA9IHRydWU7XG5cdGlmICh0aW1lcikge1xuXHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdH1cbn1cblxuZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRpZiAoc3RvcHBlZClcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdHJldHVybiBydW4oc2V0dGluZylcblx0LmNhdGNoKGVycm9yID0+IGxvZy5lcnJvcihlcnJvcikpXG5cdC50aGVuKCgpID0+IHtcblx0XHRpZiAoc3RvcHBlZClcblx0XHRcdHJldHVybjtcblx0XHR0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0cnVuUmVwZWF0bHkoc2V0dGluZyk7XG5cdFx0fSwgc2V0dGluZy5mZXRjaEludGVydmFsU2VjICogMTAwMCk7XG5cdH0pO1xufVxuYXN5bmMgZnVuY3Rpb24gcnVuKHNldHRpbmc6IFNldHRpbmcpIHtcblx0bGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcblx0dHJ5IHtcblx0XHRjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0aWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcblx0XHRcdHRocm93IGVycjtcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuXHRcdHJldHVybjtcblxuXHRpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcblx0XHRzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG5cdFx0bG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fVxuXHRsZXQgZG93bmxvYWRlZCA9IGZhbHNlO1xuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uKSB7XG5cdFx0YXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCk7XG5cdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0Y3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuXHRcdGNvbnN0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRhd2FpdCBkb3dubG9hZFppcCh0YXJnZXRWZXJzaW9uc1trZXldLnBhdGgpO1xuXHRcdFx0XHRcdGN1cnJWZXJzaW9uc1trZXldID0gdGFyZ2V0VmVyc2lvbnNba2V5XTtcblx0XHRcdFx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChkb3dubG9hZGVkKSB7XG5cdFx0ZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgJyksICd1dGY4Jyk7XG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG5cdH1cbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcpIHtcblx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgemlwW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0Y29uc3QgcmVzb3VyY2UgPSBVcmwucmVzb2x2ZSggc2V0dGluZy5mZXRjaFVybCwgcGF0aCArICc/JyArIE1hdGgucmFuZG9tKCkpO1xuXHRjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LnppcGApO1xuXHRsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdGF3YWl0IHJldHJ5KCgpID0+IHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdFx0cmVxdWVzdC5nZXQocmVzb3VyY2UpLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRcdHJlaihlcnIpO1xuXHRcdFx0fSlcblx0XHRcdC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRvd25sb2FkVG8pKVxuXHRcdFx0Lm9uKCdmaW5pc2gnLCAoKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXHRcdH0pO1xuXHR9KTtcblx0Y29uc3QgemlwID0gbmV3IEFkbVppcChkb3dubG9hZFRvKTtcblxuXHRsZXQgcmV0cnlDb3VudCA9IDA7XG5cdGRvIHtcblx0XHR0cnkge1xuXHRcdFx0bG9nLmluZm8oJ2V4dHJhY3QgdG8gJXMnLCBkb3dubG9hZFRvKTtcblx0XHRcdGF3YWl0IHRyeUV4dHJhY3QoKTtcblx0XHRcdGxvZy5pbmZvKGBleHRyYWN0ICR7ZG93bmxvYWRUb30gZG9uZWApO1xuXHRcdFx0ZnMudW5saW5rU3luYyhkb3dubG9hZFRvKTtcblx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0bG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCBkb25lW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcblx0XHRcdGJyZWFrO1xuXHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuXHRcdH1cblx0fSB3aGlsZSAoKytyZXRyeUNvdW50IDw9Myk7XG5cdGlmIChyZXRyeUNvdW50ID4gMykge1xuXHRcdGxvZy5pbmZvKCdHaXZlIHVwIG9uIGV4dHJhY3RpbmcgemlwJyk7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gdHJ5RXh0cmFjdCgpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0emlwLmV4dHJhY3RBbGxUb0FzeW5jKGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyksIHRydWUsIChlcnIpID0+IHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT01FTScgfHwgZXJyLnRvU3RyaW5nKCkuaW5kZXhPZignbm90IGVub3VnaCBtZW1vcnknKSA+PSAwKSB7XG5cdFx0XHRcdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRcdFx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKSArICcgJyArIG9zLnVzZXJJbmZvKCkudXNlcm5hbWV9IEZyZWUgbWVtOiAke29zLmZyZWVtZW0oKX0sIHRvdGFsIG1lbTogJHtvcy50b3RhbG1lbSgpfSwgcmV0cnlpbmcuLi5gKTtcblx0XHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0fSBlbHNlXG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuXHRsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuXHRcdFx0e2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG5cdFx0XHRcdHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG5cdFx0XHR9XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0cmVqKGV4KTtcblx0XHRcdH1cblx0XHRcdHJlc29sdmUoYm9keSk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZXRyeTxUPihmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG5cdGZvciAobGV0IGNudCA9IDA7Oykge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNudCsrO1xuXHRcdFx0aWYgKGNudCA+PSBzZXR0aW5nLmZldGNoUmV0cnkpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0bG9nLmRlYnVnKGVycik7XG5cdFx0XHRsb2cuZGVidWcoJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeScpO1xuXHRcdH1cblx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIDUwMDApKTtcblx0fVxufVxuIl19
