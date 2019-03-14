"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const request = tslib_1.__importStar(require("request"));
const Url = tslib_1.__importStar(require("url"));
const fs = require("fs");
const _ = tslib_1.__importStar(require("lodash"));
const os_1 = tslib_1.__importDefault(require("os"));
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
        let retryCount = 0;
        tryExtract();
        function tryExtract() {
            if (++retryCount > 3) {
                log.info('Give up on extracting zip');
                return;
            }
            log.info('extract', resource);
            try {
                zip.extractAllTo(__api_1.default.config.resolve('staticDir'), true);
            }
            catch (err) {
                if (err.code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
                    log.error(err);
                    // tslint:disable-next-line
                    log.info(`${os_1.default.hostname() + ' ' + os_1.default.userInfo().username} Free mem: ${os_1.default.freemem()}, total mem: ${os_1.default.totalmem()}, retrying...`);
                    setTimeout(tryExtract, 1000);
                }
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQix5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLG9EQUFvQjtBQUVwQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFbEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDO0FBbUIzRSxJQUFJLE9BQWdCLENBQUM7QUFDckIsc0RBQXNEO0FBQ3RELE1BQU0sZUFBZSxHQUFhO0lBQ2pDLE9BQU8sRUFBRSxNQUFNLENBQUMsaUJBQWlCO0lBQ2pDLElBQUksRUFBRSxFQUFFO0lBQ1IsUUFBUSxFQUFFLEVBQUU7Q0FDWixDQUFDO0FBQ0YsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFFakIsU0FBZ0IsS0FBSztJQUNwQixPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUM1RCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUN6QjtJQUVELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQzdCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFD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LENBQUMsQ0FBQzthQUN6QztZQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDaEQ7SUFDRixDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5jb25zdCBBZG1aaXAgPSByZXF1aXJlKCdhZG0temlwJyk7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmZldGNoLXJlbW90ZScpO1xuXG5pbnRlcmZhY2UgT2xkQ2hlY2tzdW0ge1xuXHR2ZXJzaW9uOiBudW1iZXI7XG5cdHBhdGg6IHN0cmluZztcblx0Y2hhbmdlRmV0Y2hVcmw/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDaGVja3N1bSBleHRlbmRzIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbnM/OiB7W2tleTogc3RyaW5nXToge3ZlcnNpb246IG51bWJlciwgcGF0aDogc3RyaW5nfX07XG59XG5cbmludGVyZmFjZSBTZXR0aW5nIHtcblx0ZmV0Y2hVcmw6IHN0cmluZztcblx0ZmV0Y2hSZXRyeTogbnVtYmVyO1xuXHRmZXRjaExvZ0VyclBlclRpbWVzOiBudW1iZXI7XG5cdGZldGNoSW50ZXJ2YWxTZWM6IG51bWJlcjtcbn1cblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmNvbnN0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSB7XG5cdHZlcnNpb246IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSxcblx0cGF0aDogJycsXG5cdHZlcnNpb25zOiB7fVxufTtcbmxldCB0aW1lcjogTm9kZUpTLlRpbWVyO1xubGV0IHN0b3BwZWQgPSBmYWxzZTtcbmxldCBlcnJDb3VudCA9IDA7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydCgpIHtcblx0c2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cdGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcblx0aWYgKGZldGNoVXJsID09IG51bGwpIHtcblx0XHRsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG5cdFx0c2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblx0bG9nLmluZm8oc2V0dGluZyk7XG5cdHJldHVybiBydW5SZXBlYXRseShzZXR0aW5nKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG5cdHN0b3BwZWQgPSB0cnVlO1xuXHRpZiAodGltZXIpIHtcblx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1blJlcGVhdGx5KHNldHRpbmc6IFNldHRpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcpXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcpO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nKSB7XG5cdGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG5cdHRyeSB7XG5cdFx0Y2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcblx0XHRyZXR1cm47XG5cdGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuXHRcdHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcblx0XHRsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9XG5cdGxldCBkb3dubG9hZGVkID0gZmFsc2U7XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24pIHtcblx0XHRhd2FpdCBkb3dubG9hZFppcChjaGVja3N1bU9iai5wYXRoKTtcblx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiA9IGNoZWNrc3VtT2JqLnZlcnNpb247XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG5cdFx0Y29uc3QgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuXHRcdGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY2hlY2tzdW1PYmoudmVyc2lvbnMpKSB7XG5cdFx0XHRpZiAoIV8uaGFzKHRhcmdldFZlcnNpb25zLCBrZXkpIHx8IF8uZ2V0KGN1cnJWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkgIT09XG5cdFx0XHRcdF8uZ2V0KHRhcmdldFZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSkge1xuXHRcdFx0XHRcdGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCk7XG5cdFx0XHRcdFx0Y3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuXHRcdFx0XHRcdGRvd25sb2FkZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGlmIChkb3dubG9hZGVkKVxuXHRcdGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcpIHtcblx0Y29uc3QgcmVzb3VyY2UgPSBVcmwucmVzb2x2ZSggc2V0dGluZy5mZXRjaFVybCwgcGF0aCArICc/JyArIE1hdGgucmFuZG9tKCkpO1xuXHRjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3JlbW90ZS56aXAnKTtcblx0bG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuXHRhd2FpdCByZXRyeSgoKSA9PiB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRcdHJlcXVlc3QuZ2V0KHJlc291cmNlKS5vbignZXJyb3InLCBlcnIgPT4ge1xuXHRcdFx0XHRyZWooZXJyKTtcblx0XHRcdH0pXG5cdFx0XHQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShkb3dubG9hZFRvKSlcblx0XHRcdC5vbignZmluaXNoJywgKCkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcblx0XHR9KTtcblx0fSk7XG5cdGNvbnN0IHppcCA9IG5ldyBBZG1aaXAoZG93bmxvYWRUbyk7XG5cblx0bGV0IHJldHJ5Q291bnQgPSAwO1xuXHR0cnlFeHRyYWN0KCk7XG5cblx0ZnVuY3Rpb24gdHJ5RXh0cmFjdCgpIHtcblx0XHRpZiAoKytyZXRyeUNvdW50ID4gMykge1xuXHRcdFx0bG9nLmluZm8oJ0dpdmUgdXAgb24gZXh0cmFjdGluZyB6aXAnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0bG9nLmluZm8oJ2V4dHJhY3QnLCByZXNvdXJjZSk7XG5cdFx0dHJ5IHtcblx0XHRcdHppcC5leHRyYWN0QWxsVG8oYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSwgdHJ1ZSk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRpZiAoZXJyLmNvZGUgPT09ICdFTk9NRU0nIHx8IGVyci50b1N0cmluZygpLmluZGV4T2YoJ25vdCBlbm91Z2ggbWVtb3J5JykgPj0gMCkge1xuXHRcdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCkgKyAnICcgKyBvcy51c2VySW5mbygpLnVzZXJuYW1lfSBGcmVlIG1lbTogJHtvcy5mcmVlbWVtKCl9LCB0b3RhbCBtZW06ICR7b3MudG90YWxtZW0oKX0sIHJldHJ5aW5nLi4uYCk7XG5cdFx0XHRcdHNldFRpbWVvdXQodHJ5RXh0cmFjdCwgMTAwMCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGZldGNoKGZldGNoVXJsOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRjb25zdCBjaGVja1VybCA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcblx0bG9nLmRlYnVnKCdjaGVjaycsIGNoZWNrVXJsKTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRyZXF1ZXN0LmdldChjaGVja1VybCxcblx0XHRcdHtoZWFkZXJzOiB7UmVmZXJlcjogVXJsLnJlc29sdmUoY2hlY2tVcmwsICcvJyl9fSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiByZXF1ZXN0LlJlc3BvbnNlLCBib2R5OiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihlcnJvcikpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+IDMwMikge1xuXHRcdFx0XHRyZXR1cm4gcmVqKG5ldyBFcnJvcihgc3RhdHVzIGNvZGUgJHtyZXNwb25zZS5zdGF0dXNDb2RlfVxcbnJlc3BvbnNlOlxcbiR7cmVzcG9uc2V9XFxuYm9keTpcXG4ke2JvZHl9YCkpO1xuXHRcdFx0fVxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdHJlaihleCk7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKGJvZHkpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4oZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuXHRmb3IgKGxldCBjbnQgPSAwOzspIHtcblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjbnQrKztcblx0XHRcdGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGxvZy5kZWJ1ZyhlcnIpO1xuXHRcdFx0bG9nLmRlYnVnKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCA1MDAwKSk7XG5cdH1cbn1cbiJdfQ==
