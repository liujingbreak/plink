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
// let downloadCount = 0;
function downloadZip(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFFMUIscUNBQXFDO0FBRXJDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQW1CM0UsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxNQUFNLGVBQWUsR0FBYTtJQUNqQyxPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUNGLElBQUksS0FBbUIsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBRWpCLFNBQWdCLEtBQUs7SUFDcEIsT0FBTyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO0lBQ2xDLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtRQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxDQUFDLENBQUM7UUFDNUQsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7S0FDekI7SUFFRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLElBQUksSUFBSTtRQUM3QixPQUFPLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztJQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sV0FB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QUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNaLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNSO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFlLEtBQUssQ0FBSSxJQUFvQyxFQUFFLEdBQUcsSUFBVzs7UUFDM0UsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUk7WUFDbkIsSUFBSTtnQkFDSCxPQUFPLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDM0I7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDYixHQUFHLEVBQUUsQ0FBQztnQkFDTixJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO29CQUM5QixNQUFNLEdBQUcsQ0FBQztpQkFDVjtnQkFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNmLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQzthQUN6QztZQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDaEQ7SUFDRixDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcblxuLy8gY29uc3QgQWRtWmlwID0gcmVxdWlyZSgnYWRtLXppcCcpO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUnKTtcblxuaW50ZXJmYWNlIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbjogbnVtYmVyO1xuXHRwYXRoOiBzdHJpbmc7XG5cdGNoYW5nZUZldGNoVXJsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2hlY2tzdW0gZXh0ZW5kcyBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb25zPzoge1trZXk6IHN0cmluZ106IHt2ZXJzaW9uOiBudW1iZXIsIHBhdGg6IHN0cmluZ319O1xufVxuXG5pbnRlcmZhY2UgU2V0dGluZyB7XG5cdGZldGNoVXJsOiBzdHJpbmc7XG5cdGZldGNoUmV0cnk6IG51bWJlcjtcblx0ZmV0Y2hMb2dFcnJQZXJUaW1lczogbnVtYmVyO1xuXHRmZXRjaEludGVydmFsU2VjOiBudW1iZXI7XG59XG5cbmxldCBzZXR0aW5nOiBTZXR0aW5nO1xuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5jb25zdCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoKSB7XG5cdHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXHRjb25zdCBmZXRjaFVybCA9IHNldHRpbmcuZmV0Y2hVcmw7XG5cdGlmIChmZXRjaFVybCA9PSBudWxsKSB7XG5cdFx0bG9nLmluZm8oJ05vIGZldGNoVXJsIGNvbmZpZ3VyZWQsIHNraXAgZmV0Y2hpbmcgcmVzb3VyY2UuJyk7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0aWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuXHRcdHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cdGxvZy5pbmZvKHNldHRpbmcpO1xuXHRyZXR1cm4gcnVuUmVwZWF0bHkoc2V0dGluZyk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuXHRzdG9wcGVkID0gdHJ1ZTtcblx0aWYgKHRpbWVyKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0fVxufVxuXG5mdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdGlmIChzdG9wcGVkKVxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0cmV0dXJuIHJ1bihzZXR0aW5nKVxuXHQuY2F0Y2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSlcblx0LnRoZW4oKCkgPT4ge1xuXHRcdGlmIChzdG9wcGVkKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRydW5SZXBlYXRseShzZXR0aW5nKTtcblx0XHR9LCBzZXR0aW5nLmZldGNoSW50ZXJ2YWxTZWMgKiAxMDAwKTtcblx0fSk7XG59XG5hc3luYyBmdW5jdGlvbiBydW4oc2V0dGluZzogU2V0dGluZykge1xuXHRsZXQgY2hlY2tzdW1PYmo6IENoZWNrc3VtO1xuXHR0cnkge1xuXHRcdGNoZWNrc3VtT2JqID0gYXdhaXQgcmV0cnkoZmV0Y2gsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRpZiAoZXJyQ291bnQrKyAlIHNldHRpbmcuZmV0Y2hMb2dFcnJQZXJUaW1lcyA9PT0gMCkge1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqID09IG51bGwpXG5cdFx0cmV0dXJuO1xuXHRpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcblx0XHRzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG5cdFx0bG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fVxuXHRsZXQgZG93bmxvYWRlZCA9IGZhbHNlO1xuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uKSB7XG5cdFx0YXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCk7XG5cdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0Y3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuXHRcdGNvbnN0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRhd2FpdCBkb3dubG9hZFppcCh0YXJnZXRWZXJzaW9uc1trZXldLnBhdGgpO1xuXHRcdFx0XHRcdGN1cnJWZXJzaW9uc1trZXldID0gdGFyZ2V0VmVyc2lvbnNba2V5XTtcblx0XHRcdFx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fVxuXHRpZiAoZG93bmxvYWRlZClcblx0XHRhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKTtcbn1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcpIHtcblx0Y29uc3QgcmVzb3VyY2UgPSBVcmwucmVzb2x2ZSggc2V0dGluZy5mZXRjaFVybCwgcGF0aCArICc/JyArIE1hdGgucmFuZG9tKCkpO1xuXHRjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LnppcGApO1xuXHRsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG5cdGF3YWl0IHJldHJ5KCgpID0+IHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuXHRcdFx0cmVxdWVzdC5nZXQocmVzb3VyY2UpLm9uKCdlcnJvcicsIGVyciA9PiB7XG5cdFx0XHRcdHJlaihlcnIpO1xuXHRcdFx0fSlcblx0XHRcdC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRvd25sb2FkVG8pKVxuXHRcdFx0Lm9uKCdmaW5pc2gnLCAoKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuXHRcdH0pO1xuXHR9KTtcblx0Y29uc3QgemlwID0gbmV3IEFkbVppcChkb3dubG9hZFRvKTtcblxuXHRsZXQgcmV0cnlDb3VudCA9IDA7XG5cdGRvIHtcblx0XHR0cnkge1xuXHRcdFx0bG9nLmluZm8oJ2V4dHJhY3QgdG8gJXMnLCBkb3dubG9hZFRvKTtcblx0XHRcdGF3YWl0IHRyeUV4dHJhY3QoKTtcblx0XHRcdGxvZy5pbmZvKCdleHRyYWN0IGRvbmUnKTtcblx0XHRcdGZzLnVubGlua1N5bmMoZG93bmxvYWRUbyk7XG5cdFx0XHRicmVhaztcblx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0YXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcblx0XHR9XG5cdH0gd2hpbGUgKCsrcmV0cnlDb3VudCA8PTMpO1xuXHRpZiAocmV0cnlDb3VudCA+IDMpIHtcblx0XHRsb2cuaW5mbygnR2l2ZSB1cCBvbiBleHRyYWN0aW5nIHppcCcpO1xuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRyeUV4dHJhY3QoKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdHppcC5leHRyYWN0QWxsVG9Bc3luYyhhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLCB0cnVlLCAoZXJyKSA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRpZiAoKGVyciBhcyBhbnkpLmNvZGUgPT09ICdFTk9NRU0nIHx8IGVyci50b1N0cmluZygpLmluZGV4T2YoJ25vdCBlbm91Z2ggbWVtb3J5JykgPj0gMCkge1xuXHRcdFx0XHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRcdFx0XHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdFx0XHRcdGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCkgKyAnICcgKyBvcy51c2VySW5mbygpLnVzZXJuYW1lfSBGcmVlIG1lbTogJHtvcy5mcmVlbWVtKCl9LCB0b3RhbCBtZW06ICR7b3MudG90YWxtZW0oKX0sIHJldHJ5aW5nLi4uYCk7XG5cdFx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGZldGNoKGZldGNoVXJsOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRjb25zdCBjaGVja1VybCA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcblx0bG9nLmRlYnVnKCdjaGVjaycsIGNoZWNrVXJsKTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRyZXF1ZXN0LmdldChjaGVja1VybCxcblx0XHRcdHtoZWFkZXJzOiB7UmVmZXJlcjogVXJsLnJlc29sdmUoY2hlY2tVcmwsICcvJyl9fSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiByZXF1ZXN0LlJlc3BvbnNlLCBib2R5OiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihlcnJvcikpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+IDMwMikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihgc3RhdHVzIGNvZGUgJHtyZXNwb25zZS5zdGF0dXNDb2RlfVxcbnJlc3BvbnNlOlxcbiR7cmVzcG9uc2V9XFxuYm9keTpcXG4ke2JvZHl9YCkpO1xuXHRcdFx0fVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdHJlaihleCk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKGJvZHkpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuXHRmb3IgKGxldCBjbnQgPSAwOzspIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjbnQrKztcblx0XHRcdGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGxvZy5kZWJ1ZyhlcnIpO1xuXHRcdFx0bG9nLmRlYnVnKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCA1MDAwKSk7XG5cdH1cbn1cbiJdfQ==
