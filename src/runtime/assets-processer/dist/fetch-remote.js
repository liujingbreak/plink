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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQSxvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw4REFBOEI7QUFDOUIsOENBQWlFO0FBQ2pFLGlEQUFpRDtBQUdqRCwwREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBRWxGLE1BQU0sRUFBQyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQztBQUUvRCxzREFBc0Q7QUFDdEQsSUFBSSxlQUFlLEdBQWEsRUFBRSxDQUFDO0FBRW5DLE1BQU0sT0FBTyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQWEsQ0FBQztBQUM3RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzVFLDJCQUEyQjtBQUMzQix1QkFBdUI7QUFDdkIsb0JBQW9CO0FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFFakQsUUFBQSxjQUFjLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDbkcsb0JBQW9CO0FBQ3BCLElBQUksSUFBaUIsQ0FBQztBQUV0QixTQUFzQixLQUFLLENBQUMsSUFBaUI7O1FBQzNDLDJCQUEyQjtRQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUs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LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0Jztcbi8vIGltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtmaWx0ZXIsIHN3aXRjaE1hcCwgLypza2lwLCB0YWtlKi99IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Zm9yaywgQ2hpbGRQcm9jZXNzfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnIGFzIFNldHRpbmd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3Qgey8qcG0ySW5zdGFuY2VJZCwgaXNQbTIsKi8gaXNNYWluUHJvY2Vzc30gPSBnZXRQbTJJbmZvKCk7XG5cbi8vIGxldCBjdXJyVmVyc2lvbjogbnVtYmVyID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xubGV0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSBbXTtcblxuY29uc3Qgc2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFNldHRpbmcpO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuLy8gbGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG4vLyBsZXQgc3RvcHBlZCA9IGZhbHNlO1xuLy8gbGV0IGVyckNvdW50ID0gMDtcbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBQYXRoLnJlc29sdmUoYGNoZWNrc3VtLiR7ZW52fS5qc29uYCk7XG5cbmV4cG9ydCBjb25zdCB6aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSksICdkZXBsb3ktc3RhdGljLScgKyBlbnYpO1xuLy8gbGV0IHdhdGNoZXI6IGFueTtcbmxldCBpbWFwOiBJbWFwTWFuYWdlcjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRsb2cuaW5mbyhgW21lbW9yeSBzdGF0dXNdIHRvdGFsICR7TWF0aC5mbG9vcihvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWIsIGZyZWUgJHtNYXRoLmZsb29yKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU1iXFxuYCArXG4gICAgYFtudW0gb2YgQ1BVXSAke29zLmNwdXMoKS5sZW5ndGh9YCk7XG5cbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgLy8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG4gICAgLy8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG4gICAgbG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBEb3dubG9hZERpcikpXG4gICAgZnMubWtkaXJwU3luYyh6aXBEb3dubG9hZERpcik7XG5cbiAgY29uc3QgaW5zdGFsbERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52KTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGgucmVzb2x2ZSgnZGlzdC9zdGF0aWMnKSk7XG4gICAgY29uc3QgZmlsZU5hbWVzID0gZnMucmVhZGRpclN5bmMoaW5zdGFsbERpcikuZmlsdGVyKG5hbWUgPT4gUGF0aC5leHRuYW1lKG5hbWUpID09PSAnLnppcCcpO1xuICAgIGlmIChmaWxlTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgYXdhaXQgcmV0cnkoMiwgKCkgPT4gZm9ya0V4dHJhY3RFeHN0aW5nWmlwKGluc3RhbGxEaXIsIHRydWUpKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG4gICAgc2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblxuICBpZiAoZnMuZXhpc3RzU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSkge1xuICAgIGN1cnJlbnRDaGVja3N1bSA9IE9iamVjdC5hc3NpZ24oY3VycmVudENoZWNrc3VtLCBmcy5yZWFkSlNPTlN5bmMoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAgIGxvZy5pbmZvKCdGb3VuZCBzYXZlZCBjaGVja3N1bSBmaWxlIGFmdGVyIHJlYm9vdFxcbicsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJykpO1xuICB9XG4gIGxvZy5pbmZvKCdzdGFydCBwb2xsIG1haWwnKTtcblxuICBpbWFwLmNoZWNrc3VtU3RhdGUucGlwZShcbiAgICBmaWx0ZXIoY3MgPT4gY3MgIT0gbnVsbCksXG4gICAgc3dpdGNoTWFwKGNzID0+IGNoZWNrQW5kRG93bmxvYWQoY3MhLCBpbWFwKSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICAvLyBhd2FpdCBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuXG4gIC8vIGF3YWl0IGltYXAuc3RhcnRXYXRjaE1haWwoc2V0dGluZy5mZXRjaEludGVydmFsU2VjICogMTAwMCk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuICBpbWFwLnN0b3BXYXRjaCgpO1xuICAvLyBzdG9wcGVkID0gdHJ1ZTtcbiAgLy8gaWYgKHdhdGNoZXIpXG4gIC8vICAgd2F0Y2hlci5jbG9zZSgpO1xuICAvLyBpZiAodGltZXIpIHtcbiAgLy8gICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAvLyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQbTJJbmZvKCkge1xuICBjb25zdCBwbTJJbnN0YW5jZUlkID0gcHJvY2Vzcy5lbnYuTk9ERV9BUFBfSU5TVEFOQ0U7XG4gIGNvbnN0IGlzUG0yID0gY2x1c3Rlci5pc1dvcmtlciAmJiBwbTJJbnN0YW5jZUlkICE9IG51bGw7XG4gIGNvbnN0IGlzTWFpblByb2Nlc3MgPSAhaXNQbTIgfHwgcG0ySW5zdGFuY2VJZCA9PT0gJzAnO1xuICByZXR1cm4ge1xuICAgIGlzUG0yLFxuICAgIHBtMkluc3RhbmNlSWQsXG4gICAgaXNNYWluUHJvY2Vzc1xuICB9O1xufVxuXG4vLyBhc3luYyBmdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nKTogUHJvbWlzZTx2b2lkPiB7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgaWYgKHN0b3BwZWQpXG4vLyAgICAgICByZXR1cm47XG5cbi8vICAgICB0cnkge1xuLy8gICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMDAwKSk7XG4vLyAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICBsb2cuZXJyb3IoZXJyKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuYXN5bmMgZnVuY3Rpb24gY2hlY2tBbmREb3dubG9hZChjaGVja3N1bU9iajogQ2hlY2tzdW0sIGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIC8vIGxldCB0b1VwZGF0ZUFwcHM6IHN0cmluZ1tdID0gW107XG4gIC8vIGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuICAvLyAgIGxldCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG4gIC8vICAgaWYgKGN1cnJWZXJzaW9ucyA9PSBudWxsKSB7XG4gIC8vICAgICBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMgPSB7fTtcbiAgLy8gICB9XG4gIC8vICAgY29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcbiAgLy8gICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgT2JqZWN0LmtleXModGFyZ2V0VmVyc2lvbnMpKSB7XG4gIC8vICAgICBpZiAoY3VyclZlcnNpb25zW2FwcE5hbWVdID09IG51bGwgfHxcbiAgLy8gICAgICAgKCB0YXJnZXRWZXJzaW9uc1thcHBOYW1lXSAmJlxuICAvLyAgICAgICAgIGN1cnJWZXJzaW9uc1thcHBOYW1lXS52ZXJzaW9uIDwgdGFyZ2V0VmVyc2lvbnNbYXBwTmFtZV0udmVyc2lvbilcbiAgLy8gICAgICkge1xuICAvLyAgICAgICBsb2cuaW5mbyhgRmluZCB1cGRhdGVkIHZlcnNpb24gb2YgJHthcHBOYW1lfWApO1xuICAvLyAgICAgICB0b1VwZGF0ZUFwcHMucHVzaChhcHBOYW1lKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBpZiAodG9VcGRhdGVBcHBzLmxlbmd0aCA+IDApIHtcbiAgLy8gICBpbWFwLmZldGNoQXBwRHVyaW5nV2F0Y2hBY3Rpb24oLi4udG9VcGRhdGVBcHBzKTtcbiAgLy8gICBsb2cuaW5mbygnd2FpdGluZyBmb3IgemlwIGZpbGUgd3JpdHRlbicpO1xuICAvLyAgIGF3YWl0IGltYXAuZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAvLyAgICAgc2tpcCgxKSxcbiAgLy8gICAgIGZpbHRlcih3cml0aW5nID0+ICF3cml0aW5nKSxcbiAgLy8gICAgIHRha2UodG9VcGRhdGVBcHBzLmxlbmd0aClcbiAgLy8gICAgICkudG9Qcm9taXNlKCk7XG4gIC8vICAgbG9nLmluZm8oJ3dhaXRpbmcgZm9yIHppcCBmaWxlIHdyaXR0ZW4gLSBkb25lJyk7XG4gIC8vICAgYXdhaXQgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgLy8gICB0b1VwZGF0ZUFwcHMuZm9yRWFjaChuYW1lID0+IHtcbiAgLy8gICAgIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucyFbbmFtZV0gPSBjaGVja3N1bU9iai52ZXJzaW9ucyFbbmFtZV07XG4gIC8vICAgfSk7XG4gIC8vIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gcnVuKHNldHRpbmc6IFNldHRpbmcpIHtcbi8vICAgbGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcbi8vICAgdHJ5IHtcbi8vICAgICBjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KHNldHRpbmcuZmV0Y2hSZXRyeSwgZmV0Y2gsIHNldHRpbmcuZmV0Y2hVcmwpO1xuLy8gICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICBpZiAoZXJyQ291bnQrKyAlIHNldHRpbmcuZmV0Y2hMb2dFcnJQZXJUaW1lcyA9PT0gMCkge1xuLy8gICAgICAgdGhyb3cgZXJyO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm47XG4vLyAgIH1cbi8vICAgaWYgKGNoZWNrc3VtT2JqID09IG51bGwpXG4vLyAgICAgcmV0dXJuO1xuXG4vLyAgIGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuLy8gICAgIHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcbi8vICAgICBsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuLy8gICB9XG4vLyAgIGxldCBkb3dubG9hZHM6IHN0cmluZ1tdID0gW107XG4vLyAgIC8vIGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24gJiYgY2hlY2tzdW1PYmoucGF0aCkge1xuLy8gICAvLyAgIGNvbnN0IGZpbGUgPSBhd2FpdCBkb3dubG9hZFppcChjaGVja3N1bU9iai5wYXRoKTtcbi8vICAgLy8gICBkb3dubG9hZHMucHVzaChmaWxlKTtcbi8vICAgLy8gICBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiA9IGNoZWNrc3VtT2JqLnZlcnNpb247XG4vLyAgIC8vIH1cbi8vICAgaWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG4vLyAgICAgbGV0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcbi8vICAgICBpZiAoY3VyclZlcnNpb25zID09IG51bGwpIHtcbi8vICAgICAgIGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucyA9IHt9O1xuLy8gICAgIH1cbi8vICAgICBjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuLy8gICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldFZlcnNpb25zKSkge1xuLy8gICAgICAgaWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuLy8gICAgICAgICBfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcbi8vICAgICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoKTtcbi8vICAgICAgICAgICBjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG4vLyAgICAgICAgICAgZG93bmxvYWRzLnB1c2goZmlsZSk7XG4vLyAgICAgICAgIH1cbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICBpZiAoZG93bmxvYWRzLmxlbmd0aCA+IDApIHtcbi8vICAgICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJyksICd1dGY4Jyk7XG4vLyAgICAgLy8gZG93bmxvYWRzLmZvckVhY2goZmlsZSA9PiB1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc3ppcCkpO1xuLy8gICAgIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG4vLyAgICAgICBhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbi8vICAgICB9XG4vLyAgICAgYXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG4vLyAgIH1cbi8vIH1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG4vLyBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcpIHtcbi8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG4vLyBcdC8vIGxvZy5pbmZvKGAke29zLmhvc3RuYW1lKCl9ICR7b3MudXNlckluZm8oKS51c2VybmFtZX0gZG93bmxvYWQgemlwW0ZyZWUgbWVtXTogJHtNYXRoLnJvdW5kKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU0sIFt0b3RhbCBtZW1dOiAke01hdGgucm91bmQob3MudG90YWxtZW0oKSAvIDEwNDg1NzYpfU1gKTtcbi8vICAgY29uc3QgcmVzb3VyY2UgPSBVcmwucmVzb2x2ZSggc2V0dGluZy5mZXRjaFVybCwgcGF0aCArICc/JyArIE1hdGgucmFuZG9tKCkpO1xuLy8gICAvLyBjb25zdCBkb3dubG9hZFRvID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgYHJlbW90ZS0ke01hdGgucmFuZG9tKCl9LSR7cGF0aC5zcGxpdCgnLycpLnBvcCgpfWApO1xuLy8gICBjb25zdCBuZXdOYW1lID0gcGF0aC5yZXBsYWNlKC9bXFxcXC9dL2csICdfJyk7XG4vLyAgIGNvbnN0IGRvd25sb2FkVG8gPSBQYXRoLnJlc29sdmUoemlwRG93bmxvYWREaXIsIG5ld05hbWUpO1xuLy8gICBsb2cuaW5mbygnZmV0Y2gnLCByZXNvdXJjZSk7XG4vLyAgIGF3YWl0IHJldHJ5PHN0cmluZz4oc2V0dGluZy5mZXRjaFJldHJ5LCBmb3JrRG93bmxvYWR6aXAsIHJlc291cmNlLCBkb3dubG9hZFRvKTtcbi8vICAgcmV0dXJuIGRvd25sb2FkVG87XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGZldGNoKGZldGNoVXJsOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuLy8gICBjb25zdCBjaGVja1VybCA9IGZldGNoVXJsICsgJz8nICsgTWF0aC5yYW5kb20oKTtcbi8vICAgbG9nLmRlYnVnKCdjaGVjaycsIGNoZWNrVXJsKTtcbi8vICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcbi8vICAgICByZXF1ZXN0LmdldChjaGVja1VybCxcbi8vICAgICAgIHtoZWFkZXJzOiB7UmVmZXJlcjogVXJsLnJlc29sdmUoY2hlY2tVcmwsICcvJyl9fSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiByZXF1ZXN0LlJlc3BvbnNlLCBib2R5OiBhbnkpID0+IHtcbi8vICAgICAgIGlmIChlcnJvcikge1xuLy8gICAgICAgICByZXR1cm4gcmVqKG5ldyBFcnJvcihlcnJvcikpO1xuLy8gICAgICAgfVxuLy8gICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+IDMwMikge1xuLy8gICAgICAgICByZXR1cm4gcmVqKG5ldyBFcnJvcihgc3RhdHVzIGNvZGUgJHtyZXNwb25zZS5zdGF0dXNDb2RlfVxcbnJlc3BvbnNlOlxcbiR7cmVzcG9uc2V9XFxuYm9keTpcXG4ke2JvZHl9YCkpO1xuLy8gICAgICAgfVxuLy8gICAgICAgdHJ5IHtcbi8vICAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJylcbi8vICAgICAgICAgICBib2R5ID0gSlNPTi5wYXJzZShib2R5KTtcbi8vICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4vLyAgICAgICAgIHJlaihleCk7XG4vLyAgICAgICB9XG4vLyAgICAgICByZXNvbHZlKGJvZHkpO1xuLy8gICAgIH0pO1xuLy8gICB9KTtcbi8vIH1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KHRpbWVzOiBudW1iZXIsIGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcbiAgZm9yIChsZXQgY250ID0gMDs7KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY250Kys7XG4gICAgICBpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgICBsb2cud2FybihlcnIpO1xuICAgICAgbG9nLmluZm8oJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeScpO1xuICAgIH1cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIGNudCAqIDUwMCkpO1xuICB9XG59XG5cbi8vIGZ1bmN0aW9uIGZvcmtEb3dubG9hZHppcChyZXNvdXJjZTogc3RyaW5nLCB0b0ZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuLy8gICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2Rvd25sb2FkJywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzJywgW1xuLy8gICAgIHJlc291cmNlLCB0b0ZpbGVOYW1lLCBzZXR0aW5nLmZldGNoUmV0cnkgKyAnJ1xuLy8gICBdKTtcbi8vIH1cbmV4cG9ydCBmdW5jdGlvbiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoemlwRGlyPzogc3RyaW5nLCBkb05vdERlbGV0ZSA9IGZhbHNlKSB7XG4gIGNvbnN0IGFwaTogdHlwZW9mIF9fYXBpID0gcmVxdWlyZSgnX19hcGknKTtcbiAgcmV0dXJuIGZvcmtQcm9jZXNzKCdleHRyYWN0JywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2V4dHJhY3QtemlwLXByb2Nlc3MuanMnLCBbXG4gICAgemlwRGlyID8gemlwRGlyIDogemlwRG93bmxvYWREaXIsXG4gICAgYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSxcbiAgICBkb05vdERlbGV0ZSA/ICdrZWVwJyA6ICdkZWxldGUnXG4gIF0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmb3JrUHJvY2VzcyhuYW1lOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdLCBvblByb2Nlc3M/OiAoY2hpbGQ6IENoaWxkUHJvY2VzcykgPT4gdm9pZCkge1xuICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGV4dHJhY3RpbmdEb25lID0gZmFsc2U7XG4gICAgY29uc3QgY2hpbGQgPSBmb3JrKGZpbGVQYXRoLFxuICAgICAgYXJncywge1xuICAgICAgc2lsZW50OiB0cnVlXG4gICAgfSk7XG4gICAgaWYgKG9uUHJvY2Vzcykge1xuICAgICAgb25Qcm9jZXNzKGNoaWxkKTtcbiAgICB9XG4gICAgY2hpbGQub24oJ21lc3NhZ2UnLCBtc2cgPT4ge1xuICAgICAgaWYgKG1zZy5sb2cpIHtcbiAgICAgICAgbG9nLmluZm8oJ1tjaGlsZCBwcm9jZXNzXSAlcyAtICVzJywgbmFtZSwgbXNnLmxvZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAobXNnLmRvbmUpIHtcbiAgICAgICAgZXh0cmFjdGluZ0RvbmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChtc2cuZXJyb3IpIHtcbiAgICAgICAgbG9nLmVycm9yKG1zZy5lcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY2hpbGQub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmVqZWN0KG91dHB1dCk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBsb2cuaW5mbygncHJvY2VzcyBbcGlkOiVzXSAlcyAtIGV4aXQgd2l0aDogJWQgLSAlcycsIGNoaWxkLnBpZCwgbmFtZSwgY29kZSwgc2lnbmFsKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIGlmIChleHRyYWN0aW5nRG9uZSkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKG91dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmVycm9yKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGV4aXQgd2l0aCBlcnJvciBjb2RlICVkIC0gXCIlc1wiYCwgSlNPTi5zdHJpbmdpZnkoY29kZSksIHNpZ25hbCk7XG4gICAgICAgIGlmIChvdXRwdXQpXG4gICAgICAgICAgbG9nLmVycm9yKGBbY2hpbGQgcHJvY2Vzc11bcGlkOiR7Y2hpbGQucGlkfV0ke25hbWV9IC0gYCwgb3V0cHV0KTtcbiAgICAgICAgcmVqZWN0KG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBkb25lIHN1Y2Nlc3NmdWxseTpgLCBvdXRwdXQpO1xuICAgICAgICByZXNvbHZlKG91dHB1dCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGV0IG91dHB1dCA9ICcnO1xuICAgIGNoaWxkLnN0ZG91dCEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgY2hpbGQuc3Rkb3V0IS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgIH0pO1xuICAgIGNoaWxkLnN0ZGVyciEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgY2hpbGQuc3RkZXJyIS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==
