"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkExtractExstingZip = exports.retry = exports.getPm2Info = exports.stop = exports.start = exports.zipDownloadDir = void 0;
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const operators_1 = require("rxjs/operators");
const child_process_1 = require("child_process");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('@wfh/assets-processer.fetch-remote');
const { /*pm2InstanceId, isPm2,*/ isMainProcess } = getPm2Info();
// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum = [];
const setting = __api_1.default.config.get(__api_1.default.packageName);
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';
// let timer: NodeJS.Timer;
// let stopped = false;
// let errCount = 0;
const currChecksumFile = __api_1.default.config.resolve('rootPath', `checksum.${env}.json`);
exports.zipDownloadDir = path_1.default.resolve(path_1.default.dirname(currChecksumFile), 'deploy-static-' + env);
// let watcher: any;
let imap;
async function start(imap) {
    // eslint-disable-next-line
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
    const installDir = __api_1.default.config.resolve('rootPath', 'install-' + setting.fetchMailServer.env);
    if (fs_extra_1.default.existsSync(installDir)) {
        fs_extra_1.default.mkdirpSync(__api_1.default.config.resolve('staticDir'));
        const fileNames = fs_extra_1.default.readdirSync(installDir).filter(name => path_1.default.extname(name) === '.zip');
        if (fileNames.length > 0) {
            await retry(2, () => forkExtractExstingZip(installDir, __api_1.default.config.resolve('staticDir'), true));
        }
    }
    const serverContentDir = __api_1.default.config.resolve('rootPath', 'server-content-' + setting.fetchMailServer.env);
    if (fs_extra_1.default.existsSync(serverContentDir)) {
        const zipDir = __api_1.default.config.resolve('destDir', 'server');
        fs_extra_1.default.mkdirpSync(zipDir);
        const fileNames = fs_extra_1.default.readdirSync(serverContentDir).filter(name => path_1.default.extname(name) === '.zip');
        if (fileNames.length > 0) {
            await retry(2, () => forkExtractExstingZip(serverContentDir, zipDir, true));
        }
    }
    if (setting.fetchRetry == null)
        setting.fetchRetry = 3;
    if (fs_extra_1.default.existsSync(currChecksumFile)) {
        currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(currChecksumFile));
        log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
    }
    log.info('start poll mail');
    imap.checksumState.pipe((0, operators_1.filter)(cs => cs != null), (0, operators_1.switchMap)(cs => checkAndDownload(cs, imap))).subscribe();
    // await imap.checkMailForUpdate();
    // await imap.startWatchMail(setting.fetchIntervalSec * 1000);
}
exports.start = start;
/**
 * It seems ok to quit process without calling this function
 */
function stop() {
    if (imap)
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
async function checkAndDownload(checksumObj, imap) {
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
// eslint-disable-next-line
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
async function retry(times, func, ...args) {
    for (let cnt = 0;;) {
        try {
            return await func(...args);
        }
        catch (err) {
            cnt++;
            if (cnt >= setting.fetchRetry) {
                throw err;
            }
            log.warn(err);
            log.info('Encounter error, will retry');
        }
        await new Promise(res => setTimeout(res, cnt * 500));
    }
}
exports.retry = retry;
// function forkDownloadzip(resource: string, toFileName: string): Promise<string> {
//   return forkProcess('download', 'node_modules/' + api.packageName + '/dist/download-zip-process.js', [
//     resource, toFileName, setting.fetchRetry + ''
//   ]);
// }
function forkExtractExstingZip(zipDir, outputDir, doNotDelete = false) {
    return forkProcess('extract', path_1.default.resolve(__dirname, 'extract-zip-process.js'), [
        zipDir ? zipDir : exports.zipDownloadDir,
        outputDir != null ? outputDir : __api_1.default.config.resolve('staticDir'),
        doNotDelete ? 'keep' : 'delete'
    ]);
}
exports.forkExtractExstingZip = forkExtractExstingZip;
async function forkProcess(name, filePath, args, onProcess) {
    return new Promise((resolve, reject) => {
        let extractingDone = false;
        const env = Object.assign({}, process.env);
        if (env.NODE_OPTIONS && env.NODE_OPTIONS.indexOf('--inspect') >= 0) {
            delete env.NODE_OPTIONS;
        }
        const child = (0, child_process_1.fork)(filePath, args, {
            silent: true,
            env
        });
        if (onProcess) {
            onProcess(child);
        }
        child.on('message', (msg) => {
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmV0Y2gtcmVtb3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFJQSxvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw4REFBOEI7QUFDOUIsOENBQWdFO0FBQ2hFLGlEQUFpRDtBQUdqRCwwREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0FBRTlFLE1BQU0sRUFBQyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQztBQUUvRCxzREFBc0Q7QUFDdEQsSUFBSSxlQUFlLEdBQWEsRUFBRSxDQUFDO0FBRW5DLE1BQU0sT0FBTyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQWEsQ0FBQztBQUM3RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzVFLDJCQUEyQjtBQUMzQix1QkFBdUI7QUFDdkIsb0JBQW9CO0FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFlBQVksR0FBRyxPQUFPLENBQUMsQ0FBQztBQUVuRSxRQUFBLGNBQWMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNuRyxvQkFBb0I7QUFDcEIsSUFBSSxJQUFpQixDQUFDO0FBRWYsS0FBSyxVQUFVLEtBQUssQ0FBQyxJQUFpQjtJQUMzQywyQkFBMkI7SUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsSUFB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b20gJ3JlcXVlc3QnO1xuLy8gaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5pbXBvcnQge2ZpbHRlciwgc3dpdGNoTWFwIC8qc2tpcCwgdGFrZSovfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2ZvcmssIENoaWxkUHJvY2Vzc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZyBhcyBTZXR0aW5nfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7SW1hcE1hbmFnZXJ9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3Qgey8qcG0ySW5zdGFuY2VJZCwgaXNQbTIsKi8gaXNNYWluUHJvY2Vzc30gPSBnZXRQbTJJbmZvKCk7XG5cbi8vIGxldCBjdXJyVmVyc2lvbjogbnVtYmVyID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xubGV0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSBbXTtcblxuY29uc3Qgc2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFNldHRpbmcpO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuLy8gbGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG4vLyBsZXQgc3RvcHBlZCA9IGZhbHNlO1xuLy8gbGV0IGVyckNvdW50ID0gMDtcbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgYGNoZWNrc3VtLiR7ZW52fS5qc29uYCk7XG5cbmV4cG9ydCBjb25zdCB6aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSksICdkZXBsb3ktc3RhdGljLScgKyBlbnYpO1xuLy8gbGV0IHdhdGNoZXI6IGFueTtcbmxldCBpbWFwOiBJbWFwTWFuYWdlcjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHRsb2cuaW5mbyhgW21lbW9yeSBzdGF0dXNdIHRvdGFsICR7TWF0aC5mbG9vcihvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWIsIGZyZWUgJHtNYXRoLmZsb29yKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU1iXFxuYCArXG4gICAgYFtudW0gb2YgQ1BVXSAke29zLmNwdXMoKS5sZW5ndGh9YCk7XG5cbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgLy8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG4gICAgLy8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG4gICAgbG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBEb3dubG9hZERpcikpXG4gICAgZnMubWtkaXJwU3luYyh6aXBEb3dubG9hZERpcik7XG5cbiAgY29uc3QgaW5zdGFsbERpciA9IGFwaS5jb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAnaW5zdGFsbC0nICsgc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52KTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICBmcy5ta2RpcnBTeW5jKGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJykpO1xuICAgIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKGluc3RhbGxEaXIpLmZpbHRlcihuYW1lID0+IFBhdGguZXh0bmFtZShuYW1lKSA9PT0gJy56aXAnKTtcbiAgICBpZiAoZmlsZU5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHJldHJ5KDIsICgpID0+IGZvcmtFeHRyYWN0RXhzdGluZ1ppcChpbnN0YWxsRGlyLCBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLCB0cnVlKSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc2VydmVyQ29udGVudERpciA9IGFwaS5jb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAnc2VydmVyLWNvbnRlbnQtJyArIHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyLmVudik7XG4gIGlmIChmcy5leGlzdHNTeW5jKHNlcnZlckNvbnRlbnREaXIpKSB7XG4gICAgY29uc3QgemlwRGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3NlcnZlcicpO1xuICAgIGZzLm1rZGlycFN5bmMoemlwRGlyKTtcbiAgICBjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyhzZXJ2ZXJDb250ZW50RGlyKS5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkgPT09ICcuemlwJyk7XG4gICAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCByZXRyeSgyLCAoKSA9PiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoc2VydmVyQ29udGVudERpciwgemlwRGlyLCB0cnVlKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuICAgIHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cbiAgaWYgKGZzLmV4aXN0c1N5bmMoY3VyckNoZWNrc3VtRmlsZSkpIHtcbiAgICBjdXJyZW50Q2hlY2tzdW0gPSBPYmplY3QuYXNzaWduKGN1cnJlbnRDaGVja3N1bSwgZnMucmVhZEpTT05TeW5jKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBsb2cuaW5mbygnRm91bmQgc2F2ZWQgY2hlY2tzdW0gZmlsZSBhZnRlciByZWJvb3RcXG4nLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpKTtcbiAgfVxuICBsb2cuaW5mbygnc3RhcnQgcG9sbCBtYWlsJyk7XG5cbiAgaW1hcC5jaGVja3N1bVN0YXRlLnBpcGUoXG4gICAgZmlsdGVyKGNzID0+IGNzICE9IG51bGwpLFxuICAgIHN3aXRjaE1hcChjcyA9PiBjaGVja0FuZERvd25sb2FkKGNzISwgaW1hcCkpXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgLy8gYXdhaXQgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcblxuICAvLyBhd2FpdCBpbWFwLnN0YXJ0V2F0Y2hNYWlsKHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcbiAgaWYgKGltYXApXG4gICAgaW1hcC5zdG9wV2F0Y2goKTtcbiAgLy8gc3RvcHBlZCA9IHRydWU7XG4gIC8vIGlmICh3YXRjaGVyKVxuICAvLyAgIHdhdGNoZXIuY2xvc2UoKTtcbiAgLy8gaWYgKHRpbWVyKSB7XG4gIC8vICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgLy8gfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG0ySW5mbygpIHtcbiAgY29uc3QgcG0ySW5zdGFuY2VJZCA9IHByb2Nlc3MuZW52Lk5PREVfQVBQX0lOU1RBTkNFO1xuICBjb25zdCBpc1BtMiA9IGNsdXN0ZXIuaXNXb3JrZXIgJiYgcG0ySW5zdGFuY2VJZCAhPSBudWxsO1xuICBjb25zdCBpc01haW5Qcm9jZXNzID0gIWlzUG0yIHx8IHBtMkluc3RhbmNlSWQgPT09ICcwJztcbiAgcmV0dXJuIHtcbiAgICBpc1BtMixcbiAgICBwbTJJbnN0YW5jZUlkLFxuICAgIGlzTWFpblByb2Nlc3NcbiAgfTtcbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZyk6IFByb21pc2U8dm9pZD4ge1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGlmIChzdG9wcGVkKVxuLy8gICAgICAgcmV0dXJuO1xuXG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDAwMCkpO1xuLy8gICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgbG9nLmVycm9yKGVycik7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrQW5kRG93bmxvYWQoY2hlY2tzdW1PYmo6IENoZWNrc3VtLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICAvLyBsZXQgdG9VcGRhdGVBcHBzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcbiAgLy8gICBsZXQgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuICAvLyAgIGlmIChjdXJyVmVyc2lvbnMgPT0gbnVsbCkge1xuICAvLyAgICAgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zID0ge307XG4gIC8vICAgfVxuICAvLyAgIGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG4gIC8vICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIE9iamVjdC5rZXlzKHRhcmdldFZlcnNpb25zKSkge1xuICAvLyAgICAgaWYgKGN1cnJWZXJzaW9uc1thcHBOYW1lXSA9PSBudWxsIHx8XG4gIC8vICAgICAgICggdGFyZ2V0VmVyc2lvbnNbYXBwTmFtZV0gJiZcbiAgLy8gICAgICAgICBjdXJyVmVyc2lvbnNbYXBwTmFtZV0udmVyc2lvbiA8IHRhcmdldFZlcnNpb25zW2FwcE5hbWVdLnZlcnNpb24pXG4gIC8vICAgICApIHtcbiAgLy8gICAgICAgbG9nLmluZm8oYEZpbmQgdXBkYXRlZCB2ZXJzaW9uIG9mICR7YXBwTmFtZX1gKTtcbiAgLy8gICAgICAgdG9VcGRhdGVBcHBzLnB1c2goYXBwTmFtZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gaWYgKHRvVXBkYXRlQXBwcy5sZW5ndGggPiAwKSB7XG4gIC8vICAgaW1hcC5mZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLnRvVXBkYXRlQXBwcyk7XG4gIC8vICAgbG9nLmluZm8oJ3dhaXRpbmcgZm9yIHppcCBmaWxlIHdyaXR0ZW4nKTtcbiAgLy8gICBhd2FpdCBpbWFwLmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgLy8gICAgIHNraXAoMSksXG4gIC8vICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gIC8vICAgICB0YWtlKHRvVXBkYXRlQXBwcy5sZW5ndGgpXG4gIC8vICAgICApLnRvUHJvbWlzZSgpO1xuICAvLyAgIGxvZy5pbmZvKCd3YWl0aW5nIGZvciB6aXAgZmlsZSB3cml0dGVuIC0gZG9uZScpO1xuICAvLyAgIGF3YWl0IHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gIC8vICAgdG9VcGRhdGVBcHBzLmZvckVhY2gobmFtZSA9PiB7XG4gIC8vICAgICBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMhW25hbWVdID0gY2hlY2tzdW1PYmoudmVyc2lvbnMhW25hbWVdO1xuICAvLyAgIH0pO1xuICAvLyB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nKSB7XG4vLyAgIGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG4vLyAgIHRyeSB7XG4vLyAgICAgY2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksIGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcbi8vICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgaWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcbi8vICAgICAgIHRocm93IGVycjtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuO1xuLy8gICB9XG4vLyAgIGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuLy8gICAgIHJldHVybjtcblxuLy8gICBpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcbi8vICAgICBzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG4vLyAgICAgbG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcbi8vICAgfVxuLy8gICBsZXQgZG93bmxvYWRzOiBzdHJpbmdbXSA9IFtdO1xuLy8gICAvLyBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uICYmIGNoZWNrc3VtT2JqLnBhdGgpIHtcbi8vICAgLy8gICBjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCk7XG4vLyAgIC8vICAgZG93bmxvYWRzLnB1c2goZmlsZSk7XG4vLyAgIC8vICAgY3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuLy8gICAvLyB9XG4vLyAgIGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuLy8gICAgIGxldCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG4vLyAgICAgaWYgKGN1cnJWZXJzaW9ucyA9PSBudWxsKSB7XG4vLyAgICAgICBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMgPSB7fTtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcbi8vICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRWZXJzaW9ucykpIHtcbi8vICAgICAgIGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cbi8vICAgICAgICAgXy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG4vLyAgICAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCk7XG4vLyAgICAgICAgICAgY3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuLy8gICAgICAgICAgIGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgaWYgKGRvd25sb2Fkcy5sZW5ndGggPiAwKSB7XG4vLyAgICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpLCAndXRmOCcpO1xuLy8gICAgIC8vIGRvd25sb2Fkcy5mb3JFYWNoKGZpbGUgPT4gdXBkYXRlU2VydmVyU3RhdGljKGZpbGUsIHN6aXApKTtcbi8vICAgICBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuLy8gICAgICAgYXdhaXQgcmV0cnkoMjAsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4vLyAgICAgfVxuLy8gICAgIGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xuLy8gICB9XG4vLyB9XG5cbi8vIGxldCBkb3dubG9hZENvdW50ID0gMDtcblxuLy8gYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAocGF0aDogc3RyaW5nKSB7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbi8vIFx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuLy8gICBjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG4vLyAgIC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG4vLyAgIGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcbi8vICAgY29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG4vLyAgIGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcbi8vICAgYXdhaXQgcmV0cnk8c3RyaW5nPihzZXR0aW5nLmZldGNoUmV0cnksIGZvcmtEb3dubG9hZHppcCwgcmVzb3VyY2UsIGRvd25sb2FkVG8pO1xuLy8gICByZXR1cm4gZG93bmxvYWRUbztcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4vLyAgIGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuLy8gICBsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuLy8gICAgIHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuLy8gICAgICAge2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuLy8gICAgICAgaWYgKGVycm9yKSB7XG4vLyAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG4vLyAgICAgICB9XG4vLyAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG4vLyAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG4vLyAgICAgICB9XG4vLyAgICAgICB0cnkge1xuLy8gICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuLy8gICAgICAgICAgIGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuLy8gICAgICAgfSBjYXRjaCAoZXgpIHtcbi8vICAgICAgICAgcmVqKGV4KTtcbi8vICAgICAgIH1cbi8vICAgICAgIHJlc29sdmUoYm9keSk7XG4vLyAgICAgfSk7XG4vLyAgIH0pO1xuLy8gfVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4odGltZXM6IG51bWJlciwgZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuICBmb3IgKGxldCBjbnQgPSAwOzspIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjbnQrKztcbiAgICAgIGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICBsb2cuaW5mbygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG4gICAgfVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgY250ICogNTAwKSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gZm9ya0Rvd25sb2FkemlwKHJlc291cmNlOiBzdHJpbmcsIHRvRmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4vLyAgIHJldHVybiBmb3JrUHJvY2VzcygnZG93bmxvYWQnLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZG93bmxvYWQtemlwLXByb2Nlc3MuanMnLCBbXG4vLyAgICAgcmVzb3VyY2UsIHRvRmlsZU5hbWUsIHNldHRpbmcuZmV0Y2hSZXRyeSArICcnXG4vLyAgIF0pO1xuLy8gfVxuZXhwb3J0IGZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCh6aXBEaXI/OiBzdHJpbmcsIG91dHB1dERpcj86IHN0cmluZywgZG9Ob3REZWxldGUgPSBmYWxzZSkge1xuICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2V4dHJhY3QnLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZXh0cmFjdC16aXAtcHJvY2Vzcy5qcycpLCBbXG4gICAgemlwRGlyID8gemlwRGlyIDogemlwRG93bmxvYWREaXIsXG4gICAgb3V0cHV0RGlyICE9IG51bGwgPyBvdXRwdXREaXIgOiBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLFxuICAgIGRvTm90RGVsZXRlID8gJ2tlZXAnIDogJ2RlbGV0ZSdcbiAgXSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10sIG9uUHJvY2Vzcz86IChjaGlsZDogQ2hpbGRQcm9jZXNzKSA9PiB2b2lkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZXh0cmFjdGluZ0RvbmUgPSBmYWxzZTtcbiAgICBjb25zdCBlbnYgPSBPYmplY3QuYXNzaWduKHt9LCBwcm9jZXNzLmVudik7XG4gICAgaWYgKGVudi5OT0RFX09QVElPTlMgJiYgZW52Lk5PREVfT1BUSU9OUy5pbmRleE9mKCctLWluc3BlY3QnKSA+PSAwKSB7XG4gICAgICBkZWxldGUgZW52Lk5PREVfT1BUSU9OUztcbiAgICB9XG4gICAgY29uc3QgY2hpbGQgPSBmb3JrKGZpbGVQYXRoLFxuICAgICAgYXJncywge1xuICAgICAgc2lsZW50OiB0cnVlLFxuICAgICAgZW52XG4gICAgfSk7XG4gICAgaWYgKG9uUHJvY2Vzcykge1xuICAgICAgb25Qcm9jZXNzKGNoaWxkKTtcbiAgICB9XG4gICAgY2hpbGQub24oJ21lc3NhZ2UnLCAobXNnOiBhbnkpID0+IHtcbiAgICAgIGlmIChtc2cubG9nKSB7XG4gICAgICAgIGxvZy5pbmZvKCdbY2hpbGQgcHJvY2Vzc10gJXMgLSAlcycsIG5hbWUsIG1zZy5sb2cpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKG1zZy5kb25lKSB7XG4gICAgICAgIGV4dHJhY3RpbmdEb25lID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLmVycm9yKSB7XG4gICAgICAgIGxvZy5lcnJvcihtc2cuZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNoaWxkLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJlamVjdChvdXRwdXQpO1xuICAgIH0pO1xuICAgIGNoaWxkLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3Byb2Nlc3MgW3BpZDolc10gJXMgLSBleGl0IHdpdGg6ICVkIC0gJXMnLCBjaGlsZC5waWQsIG5hbWUsIGNvZGUsIHNpZ25hbCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICBpZiAoZXh0cmFjdGluZ0RvbmUpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5lcnJvcihgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBleGl0IHdpdGggZXJyb3IgY29kZSAlZCAtIFwiJXNcImAsIEpTT04uc3RyaW5naWZ5KGNvZGUpLCBzaWduYWwpO1xuICAgICAgICBpZiAob3V0cHV0KVxuICAgICAgICAgIGxvZy5lcnJvcihgW2NoaWxkIHByb2Nlc3NdW3BpZDoke2NoaWxkLnBpZH1dJHtuYW1lfSAtIGAsIG91dHB1dCk7XG4gICAgICAgIHJlamVjdChvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZG9uZSBzdWNjZXNzZnVsbHk6YCwgb3V0cHV0KTtcbiAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBvdXRwdXQgPSAnJztcbiAgICBjaGlsZC5zdGRvdXQhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgIGNoaWxkLnN0ZG91dCEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICB9KTtcbiAgICBjaGlsZC5zdGRlcnIhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgIGNoaWxkLnN0ZGVyciEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICB9KTtcbiAgfSk7XG59XG4iXX0=