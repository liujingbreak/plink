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
const currentChecksum = {
    version: Number.NEGATIVE_INFINITY,
    path: '',
    versions: {}
};
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsb0RBQW9CO0FBQ3BCLDhEQUE2QjtBQUM3QixnRUFBMEI7QUFDMUIsOERBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQztBQUUzRSxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQW1CdEQsSUFBSSxPQUFnQixDQUFDO0FBQ3JCLHNEQUFzRDtBQUN0RCxNQUFNLGVBQWUsR0FBYTtJQUNqQyxPQUFPLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtJQUNqQyxJQUFJLEVBQUUsRUFBRTtJQUNSLFFBQVEsRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUNGLElBQUksS0FBbUIsQ0FBQztBQUN4QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBRWpCLFNBQWdCLEtBQUs7SUFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUM3QyxPQUFPO0tBQ1A7SUFDRCxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdB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LENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFlLEtBQUssQ0FBSSxJQUFvQyxFQUFFLEdBQUcsSUFBVzs7UUFDM0UsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUk7WUFDbkIsSUFBSTtnQkFDSCxPQUFPLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDM0I7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDYixHQUFHLEVBQUUsQ0FBQztnQkFDTixJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO29CQUM5QixNQUFNLEdBQUcsQ0FBQztpQkFDVjtnQkFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNmLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQzthQUN6QztZQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDaEQ7SUFDRixDQUFDO0NBQUEiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIHJlcXVlc3QgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgQWRtWmlwIGZyb20gJ2FkbS16aXAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuZmV0Y2gtcmVtb3RlJyk7XG5cbmNvbnN0IHBtMkluc3RhbmNlSWQgPSBwcm9jZXNzLmVudi5OT0RFX0FQUF9JTlNUQU5DRTtcbmNvbnN0IGlzUG0yID0gY2x1c3Rlci5pc1dvcmtlciAmJiBwbTJJbnN0YW5jZUlkICE9IG51bGw7XG5jb25zdCBpc01haW5Qcm9jZXNzID0gIWlzUG0yIHx8IHBtMkluc3RhbmNlSWQgIT09ICcwJztcblxuaW50ZXJmYWNlIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbjogbnVtYmVyO1xuXHRwYXRoOiBzdHJpbmc7XG5cdGNoYW5nZUZldGNoVXJsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2hlY2tzdW0gZXh0ZW5kcyBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb25zPzoge1trZXk6IHN0cmluZ106IHt2ZXJzaW9uOiBudW1iZXIsIHBhdGg6IHN0cmluZ319O1xufVxuXG5pbnRlcmZhY2UgU2V0dGluZyB7XG5cdGZldGNoVXJsOiBzdHJpbmc7XG5cdGZldGNoUmV0cnk6IG51bWJlcjtcblx0ZmV0Y2hMb2dFcnJQZXJUaW1lczogbnVtYmVyO1xuXHRmZXRjaEludGVydmFsU2VjOiBudW1iZXI7XG59XG5cbmxldCBzZXR0aW5nOiBTZXR0aW5nO1xuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5jb25zdCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoKSB7XG5cdGxvZy5pbmZvKHBtMkluc3RhbmNlSWQpO1xuXHRpZiAoIWlzTWFpblByb2Nlc3MpIHtcblx0XHRsb2cuaW5mbygnVGhpcyBwcm9jZXNzIGlzIG5vdCBtYWluIHByb2Nlc3MnKTtcblx0XHRyZXR1cm47XG5cdH1cblx0c2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cdGNvbnN0IGZldGNoVXJsID0gc2V0dGluZy5mZXRjaFVybDtcblx0aWYgKGZldGNoVXJsID09IG51bGwpIHtcblx0XHRsb2cuaW5mbygnTm8gZmV0Y2hVcmwgY29uZmlndXJlZCwgc2tpcCBmZXRjaGluZyByZXNvdXJjZS4nKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG5cdFx0c2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblx0bG9nLmluZm8oc2V0dGluZyk7XG5cdHJldHVybiBydW5SZXBlYXRseShzZXR0aW5nKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG5cdHN0b3BwZWQgPSB0cnVlO1xuXHRpZiAodGltZXIpIHtcblx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJ1blJlcGVhdGx5KHNldHRpbmc6IFNldHRpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0aWYgKHN0b3BwZWQpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHRyZXR1cm4gcnVuKHNldHRpbmcpXG5cdC5jYXRjaChlcnJvciA9PiBsb2cuZXJyb3IoZXJyb3IpKVxuXHQudGhlbigoKSA9PiB7XG5cdFx0aWYgKHN0b3BwZWQpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHJ1blJlcGVhdGx5KHNldHRpbmcpO1xuXHRcdH0sIHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xuXHR9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nKSB7XG5cdGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG5cdHRyeSB7XG5cdFx0Y2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcblx0XHRyZXR1cm47XG5cdGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuXHRcdHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcblx0XHRsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9XG5cdGxldCBkb3dubG9hZGVkID0gZmFsc2U7XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24pIHtcblx0XHRhd2FpdCBkb3dubG9hZFppcChjaGVja3N1bU9iai5wYXRoKTtcblx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiA9IGNoZWNrc3VtT2JqLnZlcnNpb247XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG5cdFx0Y29uc3QgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuXHRcdGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY2hlY2tzdW1PYmoudmVyc2lvbnMpKSB7XG5cdFx0XHRpZiAoIV8uaGFzKHRhcmdldFZlcnNpb25zLCBrZXkpIHx8IF8uZ2V0KGN1cnJWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkgIT09XG5cdFx0XHRcdF8uZ2V0KHRhcmdldFZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSkge1xuXHRcdFx0XHRcdGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCk7XG5cdFx0XHRcdFx0Y3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuXHRcdFx0XHRcdGRvd25sb2FkZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGlmIChkb3dubG9hZGVkKVxuXHRcdGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xufVxuXG4vLyBsZXQgZG93bmxvYWRDb3VudCA9IDA7XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKHBhdGg6IHN0cmluZykge1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0bG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG5cdGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0uemlwYCk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0YXdhaXQgcmV0cnkoKCkgPT4ge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0XHRyZXF1ZXN0LmdldChyZXNvdXJjZSkub24oJ2Vycm9yJywgZXJyID0+IHtcblx0XHRcdFx0cmVqKGVycik7XG5cdFx0XHR9KVxuXHRcdFx0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZG93bmxvYWRUbykpXG5cdFx0XHQub24oJ2ZpbmlzaCcsICgpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG5cdFx0fSk7XG5cdH0pO1xuXHRjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGRvd25sb2FkVG8pO1xuXG5cdGxldCByZXRyeUNvdW50ID0gMDtcblx0ZG8ge1xuXHRcdHRyeSB7XG5cdFx0XHRsb2cuaW5mbygnZXh0cmFjdCB0byAlcycsIGRvd25sb2FkVG8pO1xuXHRcdFx0YXdhaXQgdHJ5RXh0cmFjdCgpO1xuXHRcdFx0bG9nLmluZm8oYGV4dHJhY3QgJHtkb3dubG9hZFRvfSBkb25lYCk7XG5cdFx0XHRmcy51bmxpbmtTeW5jKGRvd25sb2FkVG8pO1xuXHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIGRvbmVbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG5cdFx0fVxuXHR9IHdoaWxlICgrK3JldHJ5Q291bnQgPD0zKTtcblx0aWYgKHJldHJ5Q291bnQgPiAzKSB7XG5cdFx0bG9nLmluZm8oJ0dpdmUgdXAgb24gZXh0cmFjdGluZyB6aXAnKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdH1cblxuXHRmdW5jdGlvbiB0cnlFeHRyYWN0KCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR6aXAuZXh0cmFjdEFsbFRvQXN5bmMoYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSwgdHJ1ZSwgKGVycikgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0aWYgKChlcnIgYXMgYW55KS5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIudG9TdHJpbmcoKS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcblx0XHRcdFx0XHRcdGxvZy5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRcdFx0XHRsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpICsgJyAnICsgb3MudXNlckluZm8oKS51c2VybmFtZX0gRnJlZSBtZW06ICR7b3MuZnJlZW1lbSgpfSwgdG90YWwgbWVtOiAke29zLnRvdGFsbWVtKCl9LCByZXRyeWluZy4uLmApO1xuXHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHR9IGVsc2Vcblx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcblx0Y29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG5cdGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0cmVxdWVzdC5nZXQoY2hlY2tVcmwsXG5cdFx0XHR7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0Ym9keSA9IEpTT04ucGFyc2UoYm9keSk7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRyZWooZXgpO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZShib2R5KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcblx0Zm9yIChsZXQgY250ID0gMDs7KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y250Kys7XG5cdFx0XHRpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHRsb2cuZGVidWcoZXJyKTtcblx0XHRcdGxvZy5kZWJ1ZygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG5cdFx0fVxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgNTAwMCkpO1xuXHR9XG59XG4iXX0=
