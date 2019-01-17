"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const request = tslib_1.__importStar(require("request"));
const Url = tslib_1.__importStar(require("url"));
const fs = require("fs");
const _ = tslib_1.__importStar(require("lodash"));
const AdmZip = require('adm-zip');
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
function downloadZip(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const resource = Url.resolve(setting.fetchUrl, path + '?' + Math.random());
        const downloadTo = __api_1.default.config.resolve('destDir', 'remote.zip');
        log.info('fetch', resource);
        yield retry(() => {
            return new Promise((resolve, rej) => {
                request.get(resource).on('error', err => {
                    rej(err);
                })
                    .pipe(fs.createWriteStream(downloadTo))
                    .on('finish', () => setTimeout(resolve, 100));
            });
        });
        const zip = new AdmZip(downloadTo);
        log.info('extract', resource);
        zip.extractAllTo(__api_1.default.config.resolve('staticDir'), true);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQix5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVsQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUM7QUFtQjNFLElBQUksT0FBZ0IsQ0FBQztBQUNyQixzREFBc0Q7QUFDdEQsTUFBTSxlQUFlLEdBQWE7SUFDakMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7SUFDakMsSUFBSSxFQUFFLEVBQUU7SUFDUixRQUFRLEVBQUUsRUFBRTtDQUNaLENBQUM7QUFDRixJQUFJLEtBQW1CLENBQUM7QUFDeEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQUVqQixTQUFnQixLQUFLO0lBQ3BCLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNsQyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7UUFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQzVELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ3pCO0lBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUk7UUFDN0IsT0FBTyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsQixP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QW9DLEVBQUUsR0FBRyxJQUFXOztRQUMzRSxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSTtZQUNuQixJQUFJO2dCQUNILE9BQU8sTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUMzQjtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNiLEdBQUcsRUFBRSxDQUFDO2dCQUNOLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7b0JBQzlCLE1BQU0sR0FBRyxDQUFDO2lCQUNWO2dCQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRDtJQUNGLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgcmVxdWVzdCBmcm9tICdyZXF1ZXN0JztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IEFkbVppcCA9IHJlcXVpcmUoJ2FkbS16aXAnKTtcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZmV0Y2gtcmVtb3RlJyk7XG5cbmludGVyZmFjZSBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb246IG51bWJlcjtcblx0cGF0aDogc3RyaW5nO1xuXHRjaGFuZ2VGZXRjaFVybD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIENoZWNrc3VtIGV4dGVuZHMgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9ucz86IHtba2V5OiBzdHJpbmddOiB7dmVyc2lvbjogbnVtYmVyLCBwYXRoOiBzdHJpbmd9fTtcbn1cblxuaW50ZXJmYWNlIFNldHRpbmcge1xuXHRmZXRjaFVybDogc3RyaW5nO1xuXHRmZXRjaFJldHJ5OiBudW1iZXI7XG5cdGZldGNoTG9nRXJyUGVyVGltZXM6IG51bWJlcjtcblx0ZmV0Y2hJbnRlcnZhbFNlYzogbnVtYmVyO1xufVxuXG5sZXQgc2V0dGluZzogU2V0dGluZztcbi8vIGxldCBjdXJyVmVyc2lvbjogbnVtYmVyID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xuY29uc3QgY3VycmVudENoZWNrc3VtOiBDaGVja3N1bSA9IHtcblx0dmVyc2lvbjogTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuXHRwYXRoOiAnJyxcblx0dmVyc2lvbnM6IHt9XG59O1xubGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG5sZXQgc3RvcHBlZCA9IGZhbHNlO1xubGV0IGVyckNvdW50ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0KCkge1xuXHRzZXR0aW5nID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKTtcblx0Y29uc3QgZmV0Y2hVcmwgPSBzZXR0aW5nLmZldGNoVXJsO1xuXHRpZiAoZmV0Y2hVcmwgPT0gbnVsbCkge1xuXHRcdGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXG5cdGlmIChzZXR0aW5nLmZldGNoUmV0cnkgPT0gbnVsbClcblx0XHRzZXR0aW5nLmZldGNoUmV0cnkgPSAzO1xuXHRsb2cuaW5mbyhzZXR0aW5nKTtcblx0cmV0dXJuIHJ1blJlcGVhdGx5KHNldHRpbmcpO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcblx0c3RvcHBlZCA9IHRydWU7XG5cdGlmICh0aW1lcikge1xuXHRcdGNsZWFyVGltZW91dCh0aW1lcik7XG5cdH1cbn1cblxuZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRpZiAoc3RvcHBlZClcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdHJldHVybiBydW4oc2V0dGluZylcblx0LmNhdGNoKGVycm9yID0+IGxvZy5lcnJvcihlcnJvcikpXG5cdC50aGVuKCgpID0+IHtcblx0XHRpZiAoc3RvcHBlZClcblx0XHRcdHJldHVybjtcblx0XHR0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0cnVuUmVwZWF0bHkoc2V0dGluZyk7XG5cdFx0fSwgc2V0dGluZy5mZXRjaEludGVydmFsU2VjICogMTAwMCk7XG5cdH0pO1xufVxuYXN5bmMgZnVuY3Rpb24gcnVuKHNldHRpbmc6IFNldHRpbmcpIHtcblx0bGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcblx0dHJ5IHtcblx0XHRjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0aWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcblx0XHRcdHRocm93IGVycjtcblx0XHR9XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuXHRcdHJldHVybjtcblx0aWYgKGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsKSB7XG5cdFx0c2V0dGluZy5mZXRjaFVybCA9IGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsO1xuXHRcdGxvZy5pbmZvKCdDaGFuZ2UgZmV0Y2ggVVJMIHRvJywgc2V0dGluZy5mZXRjaFVybCk7XG5cdH1cblx0bGV0IGRvd25sb2FkZWQgPSBmYWxzZTtcblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb24gIT0gbnVsbCAmJiBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiAhPT0gY2hlY2tzdW1PYmoudmVyc2lvbikge1xuXHRcdGF3YWl0IGRvd25sb2FkWmlwKGNoZWNrc3VtT2JqLnBhdGgpO1xuXHRcdGRvd25sb2FkZWQgPSB0cnVlO1xuXHRcdGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uID0gY2hlY2tzdW1PYmoudmVyc2lvbjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcblx0XHRjb25zdCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG5cdFx0Y29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjaGVja3N1bU9iai52ZXJzaW9ucykpIHtcblx0XHRcdGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cblx0XHRcdFx0Xy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG5cdFx0XHRcdFx0YXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoKTtcblx0XHRcdFx0XHRjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG5cdFx0XHRcdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHR9XG5cdH1cblx0aWYgKGRvd25sb2FkZWQpXG5cdFx0YXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKHBhdGg6IHN0cmluZykge1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAncmVtb3RlLnppcCcpO1xuXHRsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdGF3YWl0IHJldHJ5KCgpID0+IHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdFx0cmVxdWVzdC5nZXQocmVzb3VyY2UpLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRcdHJlaihlcnIpO1xuXHRcdFx0fSlcblx0XHRcdC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRvd25sb2FkVG8pKVxuXHRcdFx0Lm9uKCdmaW5pc2gnLCAoKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXHRcdH0pO1xuXHR9KTtcblx0Y29uc3QgemlwID0gbmV3IEFkbVppcChkb3dubG9hZFRvKTtcblx0bG9nLmluZm8oJ2V4dHJhY3QnLCByZXNvdXJjZSk7XG5cdHppcC5leHRyYWN0QWxsVG8oYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSwgdHJ1ZSk7XG59XG5cbmZ1bmN0aW9uIGZldGNoKGZldGNoVXJsOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRjb25zdCBjaGVja1VybCA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcblx0bG9nLmRlYnVnKCdjaGVjaycsIGNoZWNrVXJsKTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRyZXF1ZXN0LmdldChjaGVja1VybCxcblx0XHRcdHtoZWFkZXJzOiB7UmVmZXJlcjogVXJsLnJlc29sdmUoY2hlY2tVcmwsICcvJyl9fSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiByZXF1ZXN0LlJlc3BvbnNlLCBib2R5OiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihlcnJvcikpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+IDMwMikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihgc3RhdHVzIGNvZGUgJHtyZXNwb25zZS5zdGF0dXNDb2RlfVxcbnJlc3BvbnNlOlxcbiR7cmVzcG9uc2V9XFxuYm9keTpcXG4ke2JvZHl9YCkpO1xuXHRcdFx0fVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdHJlaihleCk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKGJvZHkpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuXHRmb3IgKGxldCBjbnQgPSAwOzspIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjbnQrKztcblx0XHRcdGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGxvZy5kZWJ1ZyhlcnIpO1xuXHRcdFx0bG9nLmRlYnVnKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCA1MDAwKSk7XG5cdH1cbn1cbiJdfQ==
