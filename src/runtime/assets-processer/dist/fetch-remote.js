"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const operators_1 = require("rxjs/operators");
const child_process_1 = require("child_process");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('@dr-core/assets-processer.fetch-remote');
const { /*pm2InstanceId, isPm2,*/ isMainProcess } = getPm2Info();
// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum = [];
const setting = __api_1.default.config.get(__api_1.default.packageName);
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';
// let timer: NodeJS.Timer;
// let stopped = false;
// let errCount = 0;
const currChecksumFile = path_1.default.resolve(`checksum.${env}.json`);
exports.zipDownloadDir = path_1.default.resolve(path_1.default.dirname(currChecksumFile), 'deploy-static-' + env);
// let watcher: any;
let imap;
function start(imap) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        log.info(`[memory status] total ${Math.floor(os_1.default.totalmem() / 1048576)}Mb, free ${Math.floor(os_1.default.freemem() / 1048576)}Mb\n` +
            `[num of CPU] ${os_1.default.cpus().length}`);
        if (!setting.fetchMailServer) {
            log.info('No fetchUrl configured, skip fetching resource.');
            return;
        }
        if (setting.downloadMode !== 'memory' && !isMainProcess) {
            // non inMemory mode means extracting zip file to local directory dist/static,
            // in case of cluster mode, we only want single process do zip extracting and file writing task to avoid conflict.
            log.info('This process is not main process');
            return;
        }
        if (!fs_extra_1.default.existsSync(exports.zipDownloadDir))
            fs_extra_1.default.mkdirpSync(exports.zipDownloadDir);
        const installDir = path_1.default.resolve('install-' + setting.fetchMailServer.env);
        if (fs_extra_1.default.existsSync(installDir)) {
            fs_extra_1.default.mkdirpSync(path_1.default.resolve('dist/static'));
            const fileNames = fs_extra_1.default.readdirSync(installDir).filter(name => path_1.default.extname(name) === '.zip');
            if (fileNames.length > 0) {
                yield retry(2, () => forkExtractExstingZip(installDir, true));
            }
        }
        if (setting.fetchRetry == null)
            setting.fetchRetry = 3;
        if (fs_extra_1.default.existsSync(currChecksumFile)) {
            currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(currChecksumFile));
            log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
        }
        log.info('start poll mail');
        imap.checksumState.pipe(operators_1.filter(cs => cs != null), operators_1.switchMap(cs => checkAndDownload(cs, imap))).subscribe();
        // await imap.checkMailForUpdate();
        // await imap.startWatchMail(setting.fetchIntervalSec * 1000);
    });
}
exports.start = start;
/**
 * It seems ok to quit process without calling this function
 */
function stop() {
    imap.stopWatch();
    // stopped = true;
    // if (watcher)
    //   watcher.close();
    // if (timer) {
    //   clearTimeout(timer);
    // }
}
exports.stop = stop;
function getPm2Info() {
    const pm2InstanceId = process.env.NODE_APP_INSTANCE;
    const isPm2 = cluster_1.default.isWorker && pm2InstanceId != null;
    const isMainProcess = !isPm2 || pm2InstanceId === '0';
    return {
        isPm2,
        pm2InstanceId,
        isMainProcess
    };
}
exports.getPm2Info = getPm2Info;
// async function runRepeatly(setting: Setting): Promise<void> {
//   while (true) {
//     if (stopped)
//       return;
//     try {
//       await new Promise(resolve => setTimeout(resolve, 20000));
//     } catch (err) {
//       log.error(err);
//     }
//   }
// }
function checkAndDownload(checksumObj, imap) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // let toUpdateApps: string[] = [];
        // if (checksumObj.versions) {
        //   let currVersions = currentChecksum.versions;
        //   if (currVersions == null) {
        //     currVersions = currentChecksum.versions = {};
        //   }
        //   const targetVersions = checksumObj.versions;
        //   for (const appName of Object.keys(targetVersions)) {
        //     if (currVersions[appName] == null ||
        //       ( targetVersions[appName] &&
        //         currVersions[appName].version < targetVersions[appName].version)
        //     ) {
        //       log.info(`Find updated version of ${appName}`);
        //       toUpdateApps.push(appName);
        //     }
        //   }
        // }
        // if (toUpdateApps.length > 0) {
        //   imap.fetchAppDuringWatchAction(...toUpdateApps);
        //   log.info('waiting for zip file written');
        //   await imap.fileWritingState.pipe(
        //     skip(1),
        //     filter(writing => !writing),
        //     take(toUpdateApps.length)
        //     ).toPromise();
        //   log.info('waiting for zip file written - done');
        //   await retry(2, forkExtractExstingZip);
        //   toUpdateApps.forEach(name => {
        //     currentChecksum.versions![name] = checksumObj.versions![name];
        //   });
        // }
    });
}
// async function run(setting: Setting) {
//   let checksumObj: Checksum;
//   try {
//     checksumObj = await retry(setting.fetchRetry, fetch, setting.fetchUrl);
//   } catch (err) {
//     if (errCount++ % setting.fetchLogErrPerTimes === 0) {
//       throw err;
//     }
//     return;
//   }
//   if (checksumObj == null)
//     return;
//   if (checksumObj.changeFetchUrl) {
//     setting.fetchUrl = checksumObj.changeFetchUrl;
//     log.info('Change fetch URL to', setting.fetchUrl);
//   }
//   let downloads: string[] = [];
//   // if (checksumObj.version != null && currentChecksum.version !== checksumObj.version && checksumObj.path) {
//   //   const file = await downloadZip(checksumObj.path);
//   //   downloads.push(file);
//   //   currentChecksum.version = checksumObj.version;
//   // }
//   if (checksumObj.versions) {
//     let currVersions = currentChecksum.versions;
//     if (currVersions == null) {
//       currVersions = currentChecksum.versions = {};
//     }
//     const targetVersions = checksumObj.versions;
//     for (const key of Object.keys(targetVersions)) {
//       if (!_.has(targetVersions, key) || _.get(currVersions, [key, 'version']) !==
//         _.get(targetVersions, [key, 'version'])) {
//           const file = await downloadZip(targetVersions[key].path);
//           currVersions[key] = targetVersions[key];
//           downloads.push(file);
//         }
//     }
//   }
//   if (downloads.length > 0) {
//     fs.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, '  '), 'utf8');
//     // downloads.forEach(file => updateServerStatic(file, szip));
//     if (setting.downloadMode === 'fork') {
//       await retry(20, forkExtractExstingZip);
//     }
//     api.eventBus.emit(api.packageName + '.downloaded');
//   }
// }
// let downloadCount = 0;
// async function downloadZip(path: string) {
//   // tslint:disable-next-line
// 	// log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
//   const resource = Url.resolve( setting.fetchUrl, path + '?' + Math.random());
//   // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
//   const newName = path.replace(/[\\/]/g, '_');
//   const downloadTo = Path.resolve(zipDownloadDir, newName);
//   log.info('fetch', resource);
//   await retry<string>(setting.fetchRetry, forkDownloadzip, resource, downloadTo);
//   return downloadTo;
// }
// function fetch(fetchUrl: string): Promise<any> {
//   const checkUrl = fetchUrl + '?' + Math.random();
//   log.debug('check', checkUrl);
//   return new Promise((resolve, rej) => {
//     request.get(checkUrl,
//       {headers: {Referer: Url.resolve(checkUrl, '/')}}, (error: any, response: request.Response, body: any) => {
//       if (error) {
//         return rej(new Error(error));
//       }
//       if (response.statusCode < 200 || response.statusCode > 302) {
//         return rej(new Error(`status code ${response.statusCode}\nresponse:\n${response}\nbody:\n${body}`));
//       }
//       try {
//         if (typeof body === 'string')
//           body = JSON.parse(body);
//       } catch (ex) {
//         rej(ex);
//       }
//       resolve(body);
//     });
//   });
// }
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
exports.retry = retry;
// function forkDownloadzip(resource: string, toFileName: string): Promise<string> {
//   return forkProcess('download', 'node_modules/' + api.packageName + '/dist/download-zip-process.js', [
//     resource, toFileName, setting.fetchRetry + ''
//   ]);
// }
function forkExtractExstingZip(zipDir, doNotDelete = false) {
    const api = require('__api');
    return forkProcess('extract', 'node_modules/' + api.packageName + '/dist/extract-zip-process.js', [
        zipDir ? zipDir : exports.zipDownloadDir,
        api.config.resolve('staticDir'),
        doNotDelete ? 'keep' : 'delete'
    ]);
}
exports.forkExtractExstingZip = forkExtractExstingZip;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQSxvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw4REFBOEI7QUFDOUIsOENBQWdFO0FBQ2hFLGlEQUFpRDtBQUdqRCwwREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBRWxGLE1BQU0sRUFBQyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQztBQUUvRCxzREFBc0Q7QUFDdEQsSUFBSSxlQUFlLEdBQWEsRUFBRSxDQUFDO0FBRW5DLE1BQU0sT0FBTyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQWEsQ0FBQztBQUM3RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzVFLDJCQUEyQjtBQUMzQix1QkFBdUI7QUFDdkIsb0JBQW9CO0FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFakQsUUFBQSxjQUFjLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDbkcsb0JBQW9CO0FBQ3BCLElBQUksSUFBaUIsQ0FBQztBQUV0QixTQUFzQixLQUFLLENBQUMsSUFBaUI7O1FBQzNDLDJCQUEyQjtRQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUs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LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0Jztcbi8vIGltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtmaWx0ZXIsIHN3aXRjaE1hcCAvKnNraXAsIHRha2UqL30gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtmb3JrLCBDaGlsZFByb2Nlc3N9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtDaGVja3N1bSwgV2l0aE1haWxTZXJ2ZXJDb25maWcgYXMgU2V0dGluZ30gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQge0ltYXBNYW5hZ2VyfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyLmZldGNoLXJlbW90ZScpO1xuXG5jb25zdCB7LypwbTJJbnN0YW5jZUlkLCBpc1BtMiwqLyBpc01haW5Qcm9jZXNzfSA9IGdldFBtMkluZm8oKTtcblxuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5sZXQgY3VycmVudENoZWNrc3VtOiBDaGVja3N1bSA9IFtdO1xuXG5jb25zdCBzZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgU2V0dGluZyk7XG5jb25zdCBlbnYgPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlciA/IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyLmVudiA6ICdsb2NhbCc7XG4vLyBsZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbi8vIGxldCBzdG9wcGVkID0gZmFsc2U7XG4vLyBsZXQgZXJyQ291bnQgPSAwO1xuY29uc3QgY3VyckNoZWNrc3VtRmlsZSA9IFBhdGgucmVzb2x2ZShgY2hlY2tzdW0uJHtlbnZ9Lmpzb25gKTtcblxuZXhwb3J0IGNvbnN0IHppcERvd25sb2FkRGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSwgJ2RlcGxveS1zdGF0aWMtJyArIGVudik7XG4vLyBsZXQgd2F0Y2hlcjogYW55O1xubGV0IGltYXA6IEltYXBNYW5hZ2VyO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnQoaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdGxvZy5pbmZvKGBbbWVtb3J5IHN0YXR1c10gdG90YWwgJHtNYXRoLmZsb29yKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYiwgZnJlZSAke01hdGguZmxvb3Iob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TWJcXG5gICtcbiAgICBgW251bSBvZiBDUFVdICR7b3MuY3B1cygpLmxlbmd0aH1gKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLmluZm8oJ05vIGZldGNoVXJsIGNvbmZpZ3VyZWQsIHNraXAgZmV0Y2hpbmcgcmVzb3VyY2UuJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHNldHRpbmcuZG93bmxvYWRNb2RlICE9PSAnbWVtb3J5JyAgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAvLyBub24gaW5NZW1vcnkgbW9kZSBtZWFucyBleHRyYWN0aW5nIHppcCBmaWxlIHRvIGxvY2FsIGRpcmVjdG9yeSBkaXN0L3N0YXRpYyxcbiAgICAvLyBpbiBjYXNlIG9mIGNsdXN0ZXIgbW9kZSwgd2Ugb25seSB3YW50IHNpbmdsZSBwcm9jZXNzIGRvIHppcCBleHRyYWN0aW5nIGFuZCBmaWxlIHdyaXRpbmcgdGFzayB0byBhdm9pZCBjb25mbGljdC5cbiAgICBsb2cuaW5mbygnVGhpcyBwcm9jZXNzIGlzIG5vdCBtYWluIHByb2Nlc3MnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHppcERvd25sb2FkRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKHppcERvd25sb2FkRGlyKTtcblxuICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKCdpbnN0YWxsLScgKyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5yZXNvbHZlKCdkaXN0L3N0YXRpYycpKTtcbiAgICBjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyhpbnN0YWxsRGlyKS5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkgPT09ICcuemlwJyk7XG4gICAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCByZXRyeSgyLCAoKSA9PiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoaW5zdGFsbERpciwgdHJ1ZSkpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzZXR0aW5nLmZldGNoUmV0cnkgPT0gbnVsbClcbiAgICBzZXR0aW5nLmZldGNoUmV0cnkgPSAzO1xuXG4gIGlmIChmcy5leGlzdHNTeW5jKGN1cnJDaGVja3N1bUZpbGUpKSB7XG4gICAgY3VycmVudENoZWNrc3VtID0gT2JqZWN0LmFzc2lnbihjdXJyZW50Q2hlY2tzdW0sIGZzLnJlYWRKU09OU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSk7XG4gICAgbG9nLmluZm8oJ0ZvdW5kIHNhdmVkIGNoZWNrc3VtIGZpbGUgYWZ0ZXIgcmVib290XFxuJywgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSk7XG4gIH1cbiAgbG9nLmluZm8oJ3N0YXJ0IHBvbGwgbWFpbCcpO1xuXG4gIGltYXAuY2hlY2tzdW1TdGF0ZS5waXBlKFxuICAgIGZpbHRlcihjcyA9PiBjcyAhPSBudWxsKSxcbiAgICBzd2l0Y2hNYXAoY3MgPT4gY2hlY2tBbmREb3dubG9hZChjcyEsIGltYXApKVxuICApLnN1YnNjcmliZSgpO1xuXG4gIC8vIGF3YWl0IGltYXAuY2hlY2tNYWlsRm9yVXBkYXRlKCk7XG5cbiAgLy8gYXdhaXQgaW1hcC5zdGFydFdhdGNoTWFpbChzZXR0aW5nLmZldGNoSW50ZXJ2YWxTZWMgKiAxMDAwKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG4gIGltYXAuc3RvcFdhdGNoKCk7XG4gIC8vIHN0b3BwZWQgPSB0cnVlO1xuICAvLyBpZiAod2F0Y2hlcilcbiAgLy8gICB3YXRjaGVyLmNsb3NlKCk7XG4gIC8vIGlmICh0aW1lcikge1xuICAvLyAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gIC8vIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBtMkluZm8oKSB7XG4gIGNvbnN0IHBtMkluc3RhbmNlSWQgPSBwcm9jZXNzLmVudi5OT0RFX0FQUF9JTlNUQU5DRTtcbiAgY29uc3QgaXNQbTIgPSBjbHVzdGVyLmlzV29ya2VyICYmIHBtMkluc3RhbmNlSWQgIT0gbnVsbDtcbiAgY29uc3QgaXNNYWluUHJvY2VzcyA9ICFpc1BtMiB8fCBwbTJJbnN0YW5jZUlkID09PSAnMCc7XG4gIHJldHVybiB7XG4gICAgaXNQbTIsXG4gICAgcG0ySW5zdGFuY2VJZCxcbiAgICBpc01haW5Qcm9jZXNzXG4gIH07XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHJ1blJlcGVhdGx5KHNldHRpbmc6IFNldHRpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBpZiAoc3RvcHBlZClcbi8vICAgICAgIHJldHVybjtcblxuLy8gICAgIHRyeSB7XG4vLyAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwMDApKTtcbi8vICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgIGxvZy5lcnJvcihlcnIpO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuXG5hc3luYyBmdW5jdGlvbiBjaGVja0FuZERvd25sb2FkKGNoZWNrc3VtT2JqOiBDaGVja3N1bSwgaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgLy8gbGV0IHRvVXBkYXRlQXBwczogc3RyaW5nW10gPSBbXTtcbiAgLy8gaWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG4gIC8vICAgbGV0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcbiAgLy8gICBpZiAoY3VyclZlcnNpb25zID09IG51bGwpIHtcbiAgLy8gICAgIGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucyA9IHt9O1xuICAvLyAgIH1cbiAgLy8gICBjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuICAvLyAgIGZvciAoY29uc3QgYXBwTmFtZSBvZiBPYmplY3Qua2V5cyh0YXJnZXRWZXJzaW9ucykpIHtcbiAgLy8gICAgIGlmIChjdXJyVmVyc2lvbnNbYXBwTmFtZV0gPT0gbnVsbCB8fFxuICAvLyAgICAgICAoIHRhcmdldFZlcnNpb25zW2FwcE5hbWVdICYmXG4gIC8vICAgICAgICAgY3VyclZlcnNpb25zW2FwcE5hbWVdLnZlcnNpb24gPCB0YXJnZXRWZXJzaW9uc1thcHBOYW1lXS52ZXJzaW9uKVxuICAvLyAgICAgKSB7XG4gIC8vICAgICAgIGxvZy5pbmZvKGBGaW5kIHVwZGF0ZWQgdmVyc2lvbiBvZiAke2FwcE5hbWV9YCk7XG4gIC8vICAgICAgIHRvVXBkYXRlQXBwcy5wdXNoKGFwcE5hbWUpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGlmICh0b1VwZGF0ZUFwcHMubGVuZ3RoID4gMCkge1xuICAvLyAgIGltYXAuZmV0Y2hBcHBEdXJpbmdXYXRjaEFjdGlvbiguLi50b1VwZGF0ZUFwcHMpO1xuICAvLyAgIGxvZy5pbmZvKCd3YWl0aW5nIGZvciB6aXAgZmlsZSB3cml0dGVuJyk7XG4gIC8vICAgYXdhaXQgaW1hcC5maWxlV3JpdGluZ1N0YXRlLnBpcGUoXG4gIC8vICAgICBza2lwKDEpLFxuICAvLyAgICAgZmlsdGVyKHdyaXRpbmcgPT4gIXdyaXRpbmcpLFxuICAvLyAgICAgdGFrZSh0b1VwZGF0ZUFwcHMubGVuZ3RoKVxuICAvLyAgICAgKS50b1Byb21pc2UoKTtcbiAgLy8gICBsb2cuaW5mbygnd2FpdGluZyBmb3IgemlwIGZpbGUgd3JpdHRlbiAtIGRvbmUnKTtcbiAgLy8gICBhd2FpdCByZXRyeSgyLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuICAvLyAgIHRvVXBkYXRlQXBwcy5mb3JFYWNoKG5hbWUgPT4ge1xuICAvLyAgICAgY3VycmVudENoZWNrc3VtLnZlcnNpb25zIVtuYW1lXSA9IGNoZWNrc3VtT2JqLnZlcnNpb25zIVtuYW1lXTtcbiAgLy8gICB9KTtcbiAgLy8gfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiBydW4oc2V0dGluZzogU2V0dGluZykge1xuLy8gICBsZXQgY2hlY2tzdW1PYmo6IENoZWNrc3VtO1xuLy8gICB0cnkge1xuLy8gICAgIGNoZWNrc3VtT2JqID0gYXdhaXQgcmV0cnkoc2V0dGluZy5mZXRjaFJldHJ5LCBmZXRjaCwgc2V0dGluZy5mZXRjaFVybCk7XG4vLyAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgIGlmIChlcnJDb3VudCsrICUgc2V0dGluZy5mZXRjaExvZ0VyclBlclRpbWVzID09PSAwKSB7XG4vLyAgICAgICB0aHJvdyBlcnI7XG4vLyAgICAgfVxuLy8gICAgIHJldHVybjtcbi8vICAgfVxuLy8gICBpZiAoY2hlY2tzdW1PYmogPT0gbnVsbClcbi8vICAgICByZXR1cm47XG5cbi8vICAgaWYgKGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsKSB7XG4vLyAgICAgc2V0dGluZy5mZXRjaFVybCA9IGNoZWNrc3VtT2JqLmNoYW5nZUZldGNoVXJsO1xuLy8gICAgIGxvZy5pbmZvKCdDaGFuZ2UgZmV0Y2ggVVJMIHRvJywgc2V0dGluZy5mZXRjaFVybCk7XG4vLyAgIH1cbi8vICAgbGV0IGRvd25sb2Fkczogc3RyaW5nW10gPSBbXTtcbi8vICAgLy8gaWYgKGNoZWNrc3VtT2JqLnZlcnNpb24gIT0gbnVsbCAmJiBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiAhPT0gY2hlY2tzdW1PYmoudmVyc2lvbiAmJiBjaGVja3N1bU9iai5wYXRoKSB7XG4vLyAgIC8vICAgY29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKGNoZWNrc3VtT2JqLnBhdGgpO1xuLy8gICAvLyAgIGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuLy8gICAvLyAgIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uID0gY2hlY2tzdW1PYmoudmVyc2lvbjtcbi8vICAgLy8gfVxuLy8gICBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcbi8vICAgICBsZXQgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuLy8gICAgIGlmIChjdXJyVmVyc2lvbnMgPT0gbnVsbCkge1xuLy8gICAgICAgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zID0ge307XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG4vLyAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGFyZ2V0VmVyc2lvbnMpKSB7XG4vLyAgICAgICBpZiAoIV8uaGFzKHRhcmdldFZlcnNpb25zLCBrZXkpIHx8IF8uZ2V0KGN1cnJWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkgIT09XG4vLyAgICAgICAgIF8uZ2V0KHRhcmdldFZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSkge1xuLy8gICAgICAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBkb3dubG9hZFppcCh0YXJnZXRWZXJzaW9uc1trZXldLnBhdGgpO1xuLy8gICAgICAgICAgIGN1cnJWZXJzaW9uc1trZXldID0gdGFyZ2V0VmVyc2lvbnNba2V5XTtcbi8vICAgICAgICAgICBkb3dubG9hZHMucHVzaChmaWxlKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH1cbi8vICAgfVxuXG4vLyAgIGlmIChkb3dubG9hZHMubGVuZ3RoID4gMCkge1xuLy8gICAgIGZzLndyaXRlRmlsZVN5bmMoY3VyckNoZWNrc3VtRmlsZSwgSlNPTi5zdHJpbmdpZnkoY3VycmVudENoZWNrc3VtLCBudWxsLCAnICAnKSwgJ3V0ZjgnKTtcbi8vICAgICAvLyBkb3dubG9hZHMuZm9yRWFjaChmaWxlID0+IHVwZGF0ZVNlcnZlclN0YXRpYyhmaWxlLCBzemlwKSk7XG4vLyAgICAgaWYgKHNldHRpbmcuZG93bmxvYWRNb2RlID09PSAnZm9yaycpIHtcbi8vICAgICAgIGF3YWl0IHJldHJ5KDIwLCBmb3JrRXh0cmFjdEV4c3RpbmdaaXApO1xuLy8gICAgIH1cbi8vICAgICBhcGkuZXZlbnRCdXMuZW1pdChhcGkucGFja2FnZU5hbWUgKyAnLmRvd25sb2FkZWQnKTtcbi8vICAgfVxuLy8gfVxuXG4vLyBsZXQgZG93bmxvYWRDb3VudCA9IDA7XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkWmlwKHBhdGg6IHN0cmluZykge1xuLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcbi8vIFx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuLy8gICBjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG4vLyAgIC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG4vLyAgIGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcbi8vICAgY29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG4vLyAgIGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcbi8vICAgYXdhaXQgcmV0cnk8c3RyaW5nPihzZXR0aW5nLmZldGNoUmV0cnksIGZvcmtEb3dubG9hZHppcCwgcmVzb3VyY2UsIGRvd25sb2FkVG8pO1xuLy8gICByZXR1cm4gZG93bmxvYWRUbztcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4vLyAgIGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuLy8gICBsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuLy8gICAgIHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuLy8gICAgICAge2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuLy8gICAgICAgaWYgKGVycm9yKSB7XG4vLyAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG4vLyAgICAgICB9XG4vLyAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG4vLyAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG4vLyAgICAgICB9XG4vLyAgICAgICB0cnkge1xuLy8gICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuLy8gICAgICAgICAgIGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuLy8gICAgICAgfSBjYXRjaCAoZXgpIHtcbi8vICAgICAgICAgcmVqKGV4KTtcbi8vICAgICAgIH1cbi8vICAgICAgIHJlc29sdmUoYm9keSk7XG4vLyAgICAgfSk7XG4vLyAgIH0pO1xuLy8gfVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4odGltZXM6IG51bWJlciwgZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuICBmb3IgKGxldCBjbnQgPSAwOzspIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjbnQrKztcbiAgICAgIGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICBsb2cuaW5mbygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG4gICAgfVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgY250ICogNTAwKSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gZm9ya0Rvd25sb2FkemlwKHJlc291cmNlOiBzdHJpbmcsIHRvRmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4vLyAgIHJldHVybiBmb3JrUHJvY2VzcygnZG93bmxvYWQnLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZG93bmxvYWQtemlwLXByb2Nlc3MuanMnLCBbXG4vLyAgICAgcmVzb3VyY2UsIHRvRmlsZU5hbWUsIHNldHRpbmcuZmV0Y2hSZXRyeSArICcnXG4vLyAgIF0pO1xuLy8gfVxuZXhwb3J0IGZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCh6aXBEaXI/OiBzdHJpbmcsIGRvTm90RGVsZXRlID0gZmFsc2UpIHtcbiAgY29uc3QgYXBpOiB0eXBlb2YgX19hcGkgPSByZXF1aXJlKCdfX2FwaScpO1xuICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2V4dHJhY3QnLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZXh0cmFjdC16aXAtcHJvY2Vzcy5qcycsIFtcbiAgICB6aXBEaXIgPyB6aXBEaXIgOiB6aXBEb3dubG9hZERpcixcbiAgICBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLFxuICAgIGRvTm90RGVsZXRlID8gJ2tlZXAnIDogJ2RlbGV0ZSdcbiAgXSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10sIG9uUHJvY2Vzcz86IChjaGlsZDogQ2hpbGRQcm9jZXNzKSA9PiB2b2lkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZXh0cmFjdGluZ0RvbmUgPSBmYWxzZTtcbiAgICBjb25zdCBjaGlsZCA9IGZvcmsoZmlsZVBhdGgsXG4gICAgICBhcmdzLCB7XG4gICAgICBzaWxlbnQ6IHRydWVcbiAgICB9KTtcbiAgICBpZiAob25Qcm9jZXNzKSB7XG4gICAgICBvblByb2Nlc3MoY2hpbGQpO1xuICAgIH1cbiAgICBjaGlsZC5vbignbWVzc2FnZScsIG1zZyA9PiB7XG4gICAgICBpZiAobXNnLmxvZykge1xuICAgICAgICBsb2cuaW5mbygnW2NoaWxkIHByb2Nlc3NdICVzIC0gJXMnLCBuYW1lLCBtc2cubG9nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChtc2cuZG9uZSkge1xuICAgICAgICBleHRyYWN0aW5nRG9uZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG1zZy5lcnJvcikge1xuICAgICAgICBsb2cuZXJyb3IobXNnLmVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjaGlsZC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICByZWplY3Qob3V0cHV0KTtcbiAgICB9KTtcbiAgICBjaGlsZC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIGxvZy5pbmZvKCdwcm9jZXNzIFtwaWQ6JXNdICVzIC0gZXhpdCB3aXRoOiAlZCAtICVzJywgY2hpbGQucGlkLCBuYW1lLCBjb2RlLCBzaWduYWwpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgaWYgKGV4dHJhY3RpbmdEb25lKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUob3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgICBsb2cuZXJyb3IoYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZXhpdCB3aXRoIGVycm9yIGNvZGUgJWQgLSBcIiVzXCJgLCBKU09OLnN0cmluZ2lmeShjb2RlKSwgc2lnbmFsKTtcbiAgICAgICAgaWYgKG91dHB1dClcbiAgICAgICAgICBsb2cuZXJyb3IoYFtjaGlsZCBwcm9jZXNzXVtwaWQ6JHtjaGlsZC5waWR9XSR7bmFtZX0gLSBgLCBvdXRwdXQpO1xuICAgICAgICByZWplY3Qob3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5pbmZvKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGRvbmUgc3VjY2Vzc2Z1bGx5OmAsIG91dHB1dCk7XG4gICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBsZXQgb3V0cHV0ID0gJyc7XG4gICAgY2hpbGQuc3Rkb3V0IS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICBjaGlsZC5zdGRvdXQhLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgfSk7XG4gICAgY2hpbGQuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICBjaGlsZC5zdGRlcnIhLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgfSk7XG4gIH0pO1xufVxuIl19
