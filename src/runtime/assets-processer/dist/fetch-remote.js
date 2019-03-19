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
// const AdmZip = require('adm-zip');
const log = require('log4js').getLogger(__api_1.default.packageName + '.fetch-remote');
let setting;
// let currVersion: number = Number.NEGATIVE_INFINITY;
const currentChecksum = {
    version: Number.NEGATIVE_INFINITY,
    path: '',
    versions: {}
};
let timer;
let stopped = false;
let errCount = 0;
function start() {
    setting = __api_1.default.config.get(__api_1.default.packageName);
    const fetchUrl = setting.fetchUrl;
    if (fetchUrl == null) {
        log.info('No fetchUrl configured, skip fetching resource.');
        return Promise.resolve();
    }
    if (setting.fetchRetry == null)
        setting.fetchRetry = 3;
    log.info(setting);
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
        if (downloaded)
            __api_1.default.eventBus.emit(__api_1.default.packageName + '.downloaded');
    });
}
let downloadCount = 0;
function downloadZip(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const resource = Url.resolve(setting.fetchUrl, path + '?' + Math.random());
        const downloadTo = __api_1.default.config.resolve('destDir', `remote-${downloadCount++}.zip`);
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
                log.info('extract done');
                fs_extra_1.default.unlinkSync(downloadTo);
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
                            log.info(`${os_1.default.hostname() + ' ' + os_1.default.userInfo().username} Free mem: ${os_1.default.freemem()}, total mem: ${os_1.default.totalmem()}, retrying...`);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFFMUIscUNBQXFDO0FBRXJDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQW1CM0UsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxNQUFNLGVBQWUsR0FBYTtJQUNqQyxPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUNGLElBQUksS0FBbUIsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBRWpCLFNBQWdCLEtBQUs7SUFDcEIsT0FBTyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO0lBQ2xDLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxDQUFDLENBQUM7UUFDNUQsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDekI7SUFFRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLElBQUksSUFBSTtRQUM3QixPQUFPLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztJQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sV0FB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O2FBQ3pCO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ1I7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQWUsS0FBSyxDQUFJLElBQW9DLEVBQUUsR0FBRyxJQUFXOztRQUMzRSxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSTtZQUNuQixJQUFJO2dCQUNILE9BQU8sTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUMzQjtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNiLEdBQUcsRUFBRSxDQUFDO2dCQUNOLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7b0JBQzlCLE1BQU0sR0FBRyxDQUFDO2lCQUNWO2dCQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRDtJQUNGLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBBZG1aaXAgZnJvbSAnYWRtLXppcCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuXG4vLyBjb25zdCBBZG1aaXAgPSByZXF1aXJlKCdhZG0temlwJyk7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZScpO1xuXG5pbnRlcmZhY2UgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9uOiBudW1iZXI7XG5cdHBhdGg6IHN0cmluZztcblx0Y2hhbmdlRmV0Y2hVcmw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDaGVja3N1bSBleHRlbmRzIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbnM/OiB7W2tleTogc3RyaW5nXToge3ZlcnNpb246IG51bWJlciwgcGF0aDogc3RyaW5nfX07XG59XG5cbmludGVyZmFjZSBTZXR0aW5nIHtcblx0ZmV0Y2hVcmw6IHN0cmluZztcblx0ZmV0Y2hSZXRyeTogbnVtYmVyO1xuXHRmZXRjaExvZ0VyclBlclRpbWVzOiBudW1iZXI7XG5cdGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcbn1cblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmNvbnN0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSB7XG5cdHZlcnNpb246IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcblx0cGF0aDogJycsXG5cdHZlcnNpb25zOiB7fVxufTtcbmxldCB0aW1lcjogTm9kZUpTLlRpbWVyO1xubGV0IHN0b3BwZWQgPSBmYWxzZTtcbmxldCBlcnJDb3VudCA9IDA7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydCgpIHtcblx0c2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cdGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcblx0aWYgKGZldGNoVXJsID09IG51bGwpIHtcblx0XHRsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG5cdFx0c2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblx0bG9nLmluZm8oc2V0dGluZyk7XG5cdHJldHVybiBydW5SZXBlYXRseShzZXR0aW5nKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG5cdHN0b3BwZWQgPSB0cnVlO1xuXHRpZiAodGltZXIpIHtcblx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1blJlcGVhdGx5KHNldHRpbmc6IFNldHRpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcpXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcpO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nKSB7XG5cdGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG5cdHRyeSB7XG5cdFx0Y2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcblx0XHRyZXR1cm47XG5cdGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuXHRcdHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcblx0XHRsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9XG5cdGxldCBkb3dubG9hZGVkID0gZmFsc2U7XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24pIHtcblx0XHRhd2FpdCBkb3dubG9hZFppcChjaGVja3N1bU9iai5wYXRoKTtcblx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiA9IGNoZWNrc3VtT2JqLnZlcnNpb247XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG5cdFx0Y29uc3QgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuXHRcdGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY2hlY2tzdW1PYmoudmVyc2lvbnMpKSB7XG5cdFx0XHRpZiAoIV8uaGFzKHRhcmdldFZlcnNpb25zLCBrZXkpIHx8IF8uZ2V0KGN1cnJWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkgIT09XG5cdFx0XHRcdF8uZ2V0KHRhcmdldFZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSkge1xuXHRcdFx0XHRcdGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCk7XG5cdFx0XHRcdFx0Y3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuXHRcdFx0XHRcdGRvd25sb2FkZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGlmIChkb3dubG9hZGVkKVxuXHRcdGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xufVxuXG5sZXQgZG93bmxvYWRDb3VudCA9IDA7XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKHBhdGg6IHN0cmluZykge1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7ZG93bmxvYWRDb3VudCsrfS56aXBgKTtcblx0bG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuXHRhd2FpdCByZXRyeSgoKSA9PiB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdHJlcXVlc3QuZ2V0KHJlc291cmNlKS5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0XHRyZWooZXJyKTtcblx0XHRcdH0pXG5cdFx0XHQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShkb3dubG9hZFRvKSlcblx0XHRcdC5vbignZmluaXNoJywgKCkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcblx0XHR9KTtcblx0fSk7XG5cdGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZG93bmxvYWRUbyk7XG5cblx0bGV0IHJldHJ5Q291bnQgPSAwO1xuXHRkbyB7XG5cdFx0dHJ5IHtcblx0XHRcdGxvZy5pbmZvKCdleHRyYWN0IHRvICVzJywgZG93bmxvYWRUbyk7XG5cdFx0XHRhd2FpdCB0cnlFeHRyYWN0KCk7XG5cdFx0XHRsb2cuaW5mbygnZXh0cmFjdCBkb25lJyk7XG5cdFx0XHRmcy51bmxpbmtTeW5jKGRvd25sb2FkVG8pO1xuXHRcdFx0YnJlYWs7XG5cdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG5cdFx0fVxuXHR9IHdoaWxlICgrK3JldHJ5Q291bnQgPD0zKTtcblx0aWYgKHJldHJ5Q291bnQgPiAzKSB7XG5cdFx0bG9nLmluZm8oJ0dpdmUgdXAgb24gZXh0cmFjdGluZyB6aXAnKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRmdW5jdGlvbiB0cnlFeHRyYWN0KCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR6aXAuZXh0cmFjdEFsbFRvQXN5bmMoYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSwgdHJ1ZSwgKGVycikgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0aWYgKChlcnIgYXMgYW55KS5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIudG9TdHJpbmcoKS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcblx0XHRcdFx0XHRcdGxvZy5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0XHRsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpICsgJyAnICsgb3MudXNlckluZm8oKS51c2VybmFtZX0gRnJlZSBtZW06ICR7b3MuZnJlZW1lbSgpfSwgdG90YWwgbWVtOiAke29zLnRvdGFsbWVtKCl9LCByZXRyeWluZy4uLmApO1xuXHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHR9IGVsc2Vcblx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcblx0Y29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG5cdGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0cmVxdWVzdC5nZXQoY2hlY2tVcmwsXG5cdFx0XHR7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0Ym9keSA9IEpTT04ucGFyc2UoYm9keSk7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRyZWooZXgpO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZShib2R5KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcblx0Zm9yIChsZXQgY250ID0gMDs7KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y250Kys7XG5cdFx0XHRpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHRsb2cuZGVidWcoZXJyKTtcblx0XHRcdGxvZy5kZWJ1ZygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG5cdFx0fVxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgNTAwMCkpO1xuXHR9XG59XG4iXX0=
