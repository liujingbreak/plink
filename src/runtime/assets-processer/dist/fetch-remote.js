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
                if (err.code === 'ENOMEM' || err.message.indexOf('not enough memory') >= 0) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIseURBQW1DO0FBQ25DLGlEQUEyQjtBQUMzQix5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLG9EQUFvQjtBQUVwQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFbEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDO0FBbUIzRSxJQUFJLE9BQWdCLENBQUM7QUFDckIsc0RBQXNEO0FBQ3RELE1BQU0sZUFBZSxHQUFhO0lBQ2pDLE9BQU8sRUFBRSxNQUFNLENBQUMsaUJBQWlCO0lBQ2pDLElBQUksRUFBRSxFQUFFO0lBQ1IsUUFBUSxFQUFFLEVBQUU7Q0FDWixDQUFDO0FBQ0YsSUFBSSxLQUFtQixDQUFDO0FBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNwQixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFFakIsU0FBZ0IsS0FBSztJQUNwQixPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1FBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUM1RCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUN6QjtJQUVELElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQzdCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEIsT0FBTyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsQ0FBQztBQVpELHNCQVlDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixJQUFJO0lBQ25CLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDZixJQUFJLEtBQUssRUFBRTtRQUNWLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNwQjtBQUNGLENBQUM7QUFMRCxvQkFLQztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQWdCO0lBQ3BDLElBQUksT0FBTztRQUNWLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQztTQUNsQixLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2hDLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDVixJQUFJLE9BQU87WUFDVixPQUFPO1FBQ1IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDdkIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLENBQUMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBQ0QsU0FBZSxHQUFHLENBQUMsT0FBZ0I7O1FBQ2xDLElBQUksV0FBcUIsQ0FBQztRQUMxQixJQUFJO1lBQ0gsV0FBVyxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDbkQ7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNiLElBQUksUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixLQUFLLENBQUMsRUFBRTtnQkFDbkQsTUFBTSxHQUFHLENBQUM7YUFDVjtZQUNELE9BQU87U0FDUDtRQUNELElBQUksV0FBVyxJQUFJLElBQUk7WUFDdEIsT0FBTztRQUNSLElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRTtZQUMvQixPQUFPLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUM7WUFDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDbEQ7UUFDRCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxXQUFXLENBQUMsT0FBTyxJQUFJLElBQUksSUFBSSxlQUFlLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQyxPQUFPLEVBQUU7WUFDbkYsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDbEIsZUFBZSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1NBQzlDO1FBQ0QsSUFBSSxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQ3pCLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUM7WUFDOUMsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztZQUM1QyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNwRCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3ZFLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3hDLE1BQU0sV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDNUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDeEMsVUFBVSxHQUFHLElBQUksQ0FBQztpQkFDbEI7YUFDRjtTQUNEO1FBQ0QsSUFBSSxVQUFVO1lBQ2IsZUFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQUE7QUFFRCxTQUFlLFdBQVcsQ0FBQyxJQUFZOztRQUN0QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM1RSxNQUFNLFVBQVUsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDL0QsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDNUIsTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ2hCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtvQkFDdkMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLENBQUMsQ0FBQztxQkFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO3FCQUN0QyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbkMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLFVBQVUsRUFBRSxDQUFDO1FBRWIsU0FBUyxVQUFVO1lBQ2xCLElBQUksRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFO2dCQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQ3RDLE9BQU87YUFDUDtZQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlCLElBQUk7Z0JBQ0gsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN4RDtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNiLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzNFLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2YsMkJBQTJCO29CQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEdBQUcsR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxjQUFjLFlBQUUsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLFlBQUUsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7b0JBQ2hJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQzdCO2FBQ0Q7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUFBO0FBRUQsU0FBUyxLQUFLLENBQUMsUUFBZ0I7SUFDOUIsTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEQsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFDbkIsRUFBQyxPQUFPLEVBQUUsRUFBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUMsRUFBQyxFQUFFLENBQUMsS0FBVSxFQUFFLFFBQTBCLEVBQUUsSUFBUyxFQUFFLEVBQUU7WUFDeEcsSUFBSSxLQUFLLEVBQUU7Z0JBQ1YsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUM3QjtZQUNELElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxHQUFHLElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxHQUFHLEVBQUU7Z0JBQzNELE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsUUFBUSxDQUFDLFVBQVUsZ0JBQWdCLFFBQVEsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDcEc7WUFDRCxJQUFJO2dCQUNILElBQUksT0FBTyxJQUFJLEtBQUssUUFBUTtvQkFDM0IsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDekI7WUFBQyxPQUFPLEVBQUUsRUFBRTtnQkFDWixHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDUjtZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBZSxLQUFLLENBQUksSUFBb0MsRUFBRSxHQUFHLElBQVc7O1FBQzNFLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJO1lBQ25CLElBQUk7Z0JBQ0gsT0FBTyxNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQzNCO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ2IsR0FBRyxFQUFFLENBQUM7Z0JBQ04sSUFBSSxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRTtvQkFDOUIsTUFBTSxHQUFHLENBQUM7aUJBQ1Y7Z0JBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZixHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7YUFDekM7WUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ2hEO0lBQ0YsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgZnMgPSByZXF1aXJlKCdmcycpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuY29uc3QgQWRtWmlwID0gcmVxdWlyZSgnYWRtLXppcCcpO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5mZXRjaC1yZW1vdGUnKTtcblxuaW50ZXJmYWNlIE9sZENoZWNrc3VtIHtcblx0dmVyc2lvbjogbnVtYmVyO1xuXHRwYXRoOiBzdHJpbmc7XG5cdGNoYW5nZUZldGNoVXJsPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2hlY2tzdW0gZXh0ZW5kcyBPbGRDaGVja3N1bSB7XG5cdHZlcnNpb25zPzoge1trZXk6IHN0cmluZ106IHt2ZXJzaW9uOiBudW1iZXIsIHBhdGg6IHN0cmluZ319O1xufVxuXG5pbnRlcmZhY2UgU2V0dGluZyB7XG5cdGZldGNoVXJsOiBzdHJpbmc7XG5cdGZldGNoUmV0cnk6IG51bWJlcjtcblx0ZmV0Y2hMb2dFcnJQZXJUaW1lczogbnVtYmVyO1xuXHRmZXRjaEludGVydmFsU2VjOiBudW1iZXI7XG59XG5cbmxldCBzZXR0aW5nOiBTZXR0aW5nO1xuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5jb25zdCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuXHR2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG5cdHBhdGg6ICcnLFxuXHR2ZXJzaW9uczoge31cbn07XG5sZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbmxldCBzdG9wcGVkID0gZmFsc2U7XG5sZXQgZXJyQ291bnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoKSB7XG5cdHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXHRjb25zdCBmZXRjaFVybCA9IHNldHRpbmcuZmV0Y2hVcmw7XG5cdGlmIChmZXRjaFVybCA9PSBudWxsKSB7XG5cdFx0bG9nLmluZm8oJ05vIGZldGNoVXJsIGNvbmZpZ3VyZWQsIHNraXAgZmV0Y2hpbmcgcmVzb3VyY2UuJyk7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXHR9XG5cblx0aWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuXHRcdHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cdGxvZy5pbmZvKHNldHRpbmcpO1xuXHRyZXR1cm4gcnVuUmVwZWF0bHkoc2V0dGluZyk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuXHRzdG9wcGVkID0gdHJ1ZTtcblx0aWYgKHRpbWVyKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0fVxufVxuXG5mdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdGlmIChzdG9wcGVkKVxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblx0cmV0dXJuIHJ1bihzZXR0aW5nKVxuXHQuY2F0Y2goZXJyb3IgPT4gbG9nLmVycm9yKGVycm9yKSlcblx0LnRoZW4oKCkgPT4ge1xuXHRcdGlmIChzdG9wcGVkKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRydW5SZXBlYXRseShzZXR0aW5nKTtcblx0XHR9LCBzZXR0aW5nLmZldGNoSW50ZXJ2YWxTZWMgKiAxMDAwKTtcblx0fSk7XG59XG5hc3luYyBmdW5jdGlvbiBydW4oc2V0dGluZzogU2V0dGluZykge1xuXHRsZXQgY2hlY2tzdW1PYmo6IENoZWNrc3VtO1xuXHR0cnkge1xuXHRcdGNoZWNrc3VtT2JqID0gYXdhaXQgcmV0cnkoZmV0Y2gsIHNldHRpbmcuZmV0Y2hVcmwpO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRpZiAoZXJyQ291bnQrKyAlIHNldHRpbmcuZmV0Y2hMb2dFcnJQZXJUaW1lcyA9PT0gMCkge1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblx0XHRyZXR1cm47XG5cdH1cblx0aWYgKGNoZWNrc3VtT2JqID09IG51bGwpXG5cdFx0cmV0dXJuO1xuXHRpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcblx0XHRzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG5cdFx0bG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcblx0fVxuXHRsZXQgZG93bmxvYWRlZCA9IGZhbHNlO1xuXHRpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uKSB7XG5cdFx0YXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCk7XG5cdFx0ZG93bmxvYWRlZCA9IHRydWU7XG5cdFx0Y3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuXHR9XG5cdGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuXHRcdGNvbnN0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcblx0XHRjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuXHRcdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNoZWNrc3VtT2JqLnZlcnNpb25zKSkge1xuXHRcdFx0aWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuXHRcdFx0XHRfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcblx0XHRcdFx0XHRhd2FpdCBkb3dubG9hZFppcCh0YXJnZXRWZXJzaW9uc1trZXldLnBhdGgpO1xuXHRcdFx0XHRcdGN1cnJWZXJzaW9uc1trZXldID0gdGFyZ2V0VmVyc2lvbnNba2V5XTtcblx0XHRcdFx0XHRkb3dubG9hZGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdH1cblx0fVxuXHRpZiAoZG93bmxvYWRlZClcblx0XHRhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAocGF0aDogc3RyaW5nKSB7XG5cdGNvbnN0IHJlc291cmNlID0gVXJsLnJlc29sdmUoIHNldHRpbmcuZmV0Y2hVcmwsIHBhdGggKyAnPycgKyBNYXRoLnJhbmRvbSgpKTtcblx0Y29uc3QgZG93bmxvYWRUbyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdyZW1vdGUuemlwJyk7XG5cdGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcblx0YXdhaXQgcmV0cnkoKCkgPT4ge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0XHRyZXF1ZXN0LmdldChyZXNvdXJjZSkub24oJ2Vycm9yJywgZXJyID0+IHtcblx0XHRcdFx0cmVqKGVycik7XG5cdFx0XHR9KVxuXHRcdFx0LnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZG93bmxvYWRUbykpXG5cdFx0XHQub24oJ2ZpbmlzaCcsICgpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG5cdFx0fSk7XG5cdH0pO1xuXHRjb25zdCB6aXAgPSBuZXcgQWRtWmlwKGRvd25sb2FkVG8pO1xuXG5cdGxldCByZXRyeUNvdW50ID0gMDtcblx0dHJ5RXh0cmFjdCgpO1xuXG5cdGZ1bmN0aW9uIHRyeUV4dHJhY3QoKSB7XG5cdFx0aWYgKCsrcmV0cnlDb3VudCA+IDMpIHtcblx0XHRcdGxvZy5pbmZvKCdHaXZlIHVwIG9uIGV4dHJhY3RpbmcgemlwJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGxvZy5pbmZvKCdleHRyYWN0JywgcmVzb3VyY2UpO1xuXHRcdHRyeSB7XG5cdFx0XHR6aXAuZXh0cmFjdEFsbFRvKGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyksIHRydWUpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0aWYgKGVyci5jb2RlID09PSAnRU5PTUVNJyB8fCBlcnIubWVzc2FnZS5pbmRleE9mKCdub3QgZW5vdWdoIG1lbW9yeScpID49IDApIHtcblx0XHRcdFx0bG9nLmVycm9yKGVycik7XG5cdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0XHRsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpICsgJyAnICsgb3MudXNlckluZm8oKS51c2VybmFtZX0gRnJlZSBtZW06ICR7b3MuZnJlZW1lbSgpfSwgdG90YWwgbWVtOiAke29zLnRvdGFsbWVtKCl9LCByZXRyeWluZy4uLmApO1xuXHRcdFx0XHRzZXRUaW1lb3V0KHRyeUV4dHJhY3QsIDEwMDApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcblx0Y29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG5cdGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG5cdFx0cmVxdWVzdC5nZXQoY2hlY2tVcmwsXG5cdFx0XHR7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcblx0XHRcdH1cblx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcblx0XHRcdFx0cmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcblx0XHRcdH1cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0Ym9keSA9IEpTT04ucGFyc2UoYm9keSk7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRyZWooZXgpO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZShib2R5KTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcblx0Zm9yIChsZXQgY250ID0gMDs7KSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y250Kys7XG5cdFx0XHRpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHRsb2cuZGVidWcoZXJyKTtcblx0XHRcdGxvZy5kZWJ1ZygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG5cdFx0fVxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgNTAwMCkpO1xuXHR9XG59XG4iXX0=
