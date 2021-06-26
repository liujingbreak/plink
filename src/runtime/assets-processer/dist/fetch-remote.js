"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkExtractExstingZip = exports.retry = exports.getPm2Info = exports.stop = exports.start = exports.zipDownloadDir = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const cluster_1 = __importDefault(require("cluster"));
const operators_1 = require("rxjs/operators");
const child_process_1 = require("child_process");
const __api_1 = __importDefault(require("__api"));
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
function start(imap) {
    return __awaiter(this, void 0, void 0, function* () {
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
                yield retry(2, () => forkExtractExstingZip(installDir, __api_1.default.config.resolve('staticDir'), true));
            }
        }
        const serverContentDir = __api_1.default.config.resolve('rootPath', 'server-content-' + setting.fetchMailServer.env);
        if (fs_extra_1.default.existsSync(serverContentDir)) {
            const zipDir = __api_1.default.config.resolve('destDir', 'server');
            fs_extra_1.default.mkdirpSync(zipDir);
            const fileNames = fs_extra_1.default.readdirSync(serverContentDir).filter(name => path_1.default.extname(name) === '.zip');
            if (fileNames.length > 0) {
                yield retry(2, () => forkExtractExstingZip(serverContentDir, zipDir, true));
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
function checkAndDownload(checksumObj, imap) {
    return __awaiter(this, void 0, void 0, function* () {
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
function retry(times, func, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
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
function forkExtractExstingZip(zipDir, outputDir, doNotDelete = false) {
    return forkProcess('extract', path_1.default.resolve(__dirname, 'extract-zip-process.js'), [
        zipDir ? zipDir : exports.zipDownloadDir,
        outputDir != null ? outputDir : __api_1.default.config.resolve('staticDir'),
        doNotDelete ? 'keep' : 'delete'
    ]);
}
exports.forkExtractExstingZip = forkExtractExstingZip;
function forkProcess(name, filePath, args, onProcess) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let extractingDone = false;
            const env = Object.assign({}, process.env);
            if (env.NODE_OPTIONS && env.NODE_OPTIONS.indexOf('--inspect') >= 0) {
                delete env.NODE_OPTIONS;
            }
            const child = child_process_1.fork(filePath, args, {
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
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmV0Y2gtcmVtb3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUlBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsd0RBQTBCO0FBQzFCLHNEQUE4QjtBQUM5Qiw4Q0FBZ0U7QUFDaEUsaURBQWlEO0FBR2pELGtEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFFOUUsTUFBTSxFQUFDLHlCQUF5QixDQUFDLGFBQWEsRUFBQyxHQUFHLFVBQVUsRUFBRSxDQUFDO0FBRS9ELHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYSxFQUFFLENBQUM7QUFFbkMsTUFBTSxPQUFPLEdBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBYSxDQUFDO0FBQzdELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDNUUsMkJBQTJCO0FBQzNCLHVCQUF1QjtBQUN2QixvQkFBb0I7QUFDcEIsTUFBTSxnQkFBZ0IsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRW5FLFFBQUEsY0FBYyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ25HLG9CQUFvQjtBQUNwQixJQUFJLElBQWlCLENBQUM7QUFFdEIsU0FBc0IsS0FBSyxDQUFDLElBQWlCOztRQUMzQywyQkFBMkI7UUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyx5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YXBpJztcbi8vIGltcG9ydCByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuLy8gaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5pbXBvcnQge2ZpbHRlciwgc3dpdGNoTWFwIC8qc2tpcCwgdGFrZSovfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2ZvcmssIENoaWxkUHJvY2Vzc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge0NoZWNrc3VtLCBXaXRoTWFpbFNlcnZlckNvbmZpZyBhcyBTZXR0aW5nfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7SW1hcE1hbmFnZXJ9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci5mZXRjaC1yZW1vdGUnKTtcblxuY29uc3Qgey8qcG0ySW5zdGFuY2VJZCwgaXNQbTIsKi8gaXNNYWluUHJvY2Vzc30gPSBnZXRQbTJJbmZvKCk7XG5cbi8vIGxldCBjdXJyVmVyc2lvbjogbnVtYmVyID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xubGV0IGN1cnJlbnRDaGVja3N1bTogQ2hlY2tzdW0gPSBbXTtcblxuY29uc3Qgc2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFNldHRpbmcpO1xuY29uc3QgZW52ID0gc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYgOiAnbG9jYWwnO1xuLy8gbGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG4vLyBsZXQgc3RvcHBlZCA9IGZhbHNlO1xuLy8gbGV0IGVyckNvdW50ID0gMDtcbmNvbnN0IGN1cnJDaGVja3N1bUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgYGNoZWNrc3VtLiR7ZW52fS5qc29uYCk7XG5cbmV4cG9ydCBjb25zdCB6aXBEb3dubG9hZERpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoY3VyckNoZWNrc3VtRmlsZSksICdkZXBsb3ktc3RhdGljLScgKyBlbnYpO1xuLy8gbGV0IHdhdGNoZXI6IGFueTtcbmxldCBpbWFwOiBJbWFwTWFuYWdlcjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuXHRsb2cuaW5mbyhgW21lbW9yeSBzdGF0dXNdIHRvdGFsICR7TWF0aC5mbG9vcihvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWIsIGZyZWUgJHtNYXRoLmZsb29yKG9zLmZyZWVtZW0oKSAvIDEwNDg1NzYpfU1iXFxuYCArXG4gICAgYFtudW0gb2YgQ1BVXSAke29zLmNwdXMoKS5sZW5ndGh9YCk7XG5cbiAgaWYgKCFzZXR0aW5nLmZldGNoTWFpbFNlcnZlcikge1xuICAgIGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgLy8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG4gICAgLy8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG4gICAgbG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghZnMuZXhpc3RzU3luYyh6aXBEb3dubG9hZERpcikpXG4gICAgZnMubWtkaXJwU3luYyh6aXBEb3dubG9hZERpcik7XG5cbiAgY29uc3QgaW5zdGFsbERpciA9IGFwaS5jb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAnaW5zdGFsbC0nICsgc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52KTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICBmcy5ta2RpcnBTeW5jKGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJykpO1xuICAgIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKGluc3RhbGxEaXIpLmZpbHRlcihuYW1lID0+IFBhdGguZXh0bmFtZShuYW1lKSA9PT0gJy56aXAnKTtcbiAgICBpZiAoZmlsZU5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHJldHJ5KDIsICgpID0+IGZvcmtFeHRyYWN0RXhzdGluZ1ppcChpbnN0YWxsRGlyLCBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLCB0cnVlKSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc2VydmVyQ29udGVudERpciA9IGFwaS5jb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAnc2VydmVyLWNvbnRlbnQtJyArIHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyLmVudik7XG4gIGlmIChmcy5leGlzdHNTeW5jKHNlcnZlckNvbnRlbnREaXIpKSB7XG4gICAgY29uc3QgemlwRGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3NlcnZlcicpO1xuICAgIGZzLm1rZGlycFN5bmMoemlwRGlyKTtcbiAgICBjb25zdCBmaWxlTmFtZXMgPSBmcy5yZWFkZGlyU3luYyhzZXJ2ZXJDb250ZW50RGlyKS5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkgPT09ICcuemlwJyk7XG4gICAgaWYgKGZpbGVOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCByZXRyeSgyLCAoKSA9PiBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoc2VydmVyQ29udGVudERpciwgemlwRGlyLCB0cnVlKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHNldHRpbmcuZmV0Y2hSZXRyeSA9PSBudWxsKVxuICAgIHNldHRpbmcuZmV0Y2hSZXRyeSA9IDM7XG5cbiAgaWYgKGZzLmV4aXN0c1N5bmMoY3VyckNoZWNrc3VtRmlsZSkpIHtcbiAgICBjdXJyZW50Q2hlY2tzdW0gPSBPYmplY3QuYXNzaWduKGN1cnJlbnRDaGVja3N1bSwgZnMucmVhZEpTT05TeW5jKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBsb2cuaW5mbygnRm91bmQgc2F2ZWQgY2hlY2tzdW0gZmlsZSBhZnRlciByZWJvb3RcXG4nLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpKTtcbiAgfVxuICBsb2cuaW5mbygnc3RhcnQgcG9sbCBtYWlsJyk7XG5cbiAgaW1hcC5jaGVja3N1bVN0YXRlLnBpcGUoXG4gICAgZmlsdGVyKGNzID0+IGNzICE9IG51bGwpLFxuICAgIHN3aXRjaE1hcChjcyA9PiBjaGVja0FuZERvd25sb2FkKGNzISwgaW1hcCkpXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgLy8gYXdhaXQgaW1hcC5jaGVja01haWxGb3JVcGRhdGUoKTtcblxuICAvLyBhd2FpdCBpbWFwLnN0YXJ0V2F0Y2hNYWlsKHNldHRpbmcuZmV0Y2hJbnRlcnZhbFNlYyAqIDEwMDApO1xufVxuXG4vKipcbiAqIEl0IHNlZW1zIG9rIHRvIHF1aXQgcHJvY2VzcyB3aXRob3V0IGNhbGxpbmcgdGhpcyBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcCgpIHtcbiAgaWYgKGltYXApXG4gICAgaW1hcC5zdG9wV2F0Y2goKTtcbiAgLy8gc3RvcHBlZCA9IHRydWU7XG4gIC8vIGlmICh3YXRjaGVyKVxuICAvLyAgIHdhdGNoZXIuY2xvc2UoKTtcbiAgLy8gaWYgKHRpbWVyKSB7XG4gIC8vICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgLy8gfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG0ySW5mbygpIHtcbiAgY29uc3QgcG0ySW5zdGFuY2VJZCA9IHByb2Nlc3MuZW52Lk5PREVfQVBQX0lOU1RBTkNFO1xuICBjb25zdCBpc1BtMiA9IGNsdXN0ZXIuaXNXb3JrZXIgJiYgcG0ySW5zdGFuY2VJZCAhPSBudWxsO1xuICBjb25zdCBpc01haW5Qcm9jZXNzID0gIWlzUG0yIHx8IHBtMkluc3RhbmNlSWQgPT09ICcwJztcbiAgcmV0dXJuIHtcbiAgICBpc1BtMixcbiAgICBwbTJJbnN0YW5jZUlkLFxuICAgIGlzTWFpblByb2Nlc3NcbiAgfTtcbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZyk6IFByb21pc2U8dm9pZD4ge1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGlmIChzdG9wcGVkKVxuLy8gICAgICAgcmV0dXJuO1xuXG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDAwMCkpO1xuLy8gICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgbG9nLmVycm9yKGVycik7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrQW5kRG93bmxvYWQoY2hlY2tzdW1PYmo6IENoZWNrc3VtLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICAvLyBsZXQgdG9VcGRhdGVBcHBzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcbiAgLy8gICBsZXQgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuICAvLyAgIGlmIChjdXJyVmVyc2lvbnMgPT0gbnVsbCkge1xuICAvLyAgICAgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zID0ge307XG4gIC8vICAgfVxuICAvLyAgIGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG4gIC8vICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIE9iamVjdC5rZXlzKHRhcmdldFZlcnNpb25zKSkge1xuICAvLyAgICAgaWYgKGN1cnJWZXJzaW9uc1thcHBOYW1lXSA9PSBudWxsIHx8XG4gIC8vICAgICAgICggdGFyZ2V0VmVyc2lvbnNbYXBwTmFtZV0gJiZcbiAgLy8gICAgICAgICBjdXJyVmVyc2lvbnNbYXBwTmFtZV0udmVyc2lvbiA8IHRhcmdldFZlcnNpb25zW2FwcE5hbWVdLnZlcnNpb24pXG4gIC8vICAgICApIHtcbiAgLy8gICAgICAgbG9nLmluZm8oYEZpbmQgdXBkYXRlZCB2ZXJzaW9uIG9mICR7YXBwTmFtZX1gKTtcbiAgLy8gICAgICAgdG9VcGRhdGVBcHBzLnB1c2goYXBwTmFtZSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gaWYgKHRvVXBkYXRlQXBwcy5sZW5ndGggPiAwKSB7XG4gIC8vICAgaW1hcC5mZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLnRvVXBkYXRlQXBwcyk7XG4gIC8vICAgbG9nLmluZm8oJ3dhaXRpbmcgZm9yIHppcCBmaWxlIHdyaXR0ZW4nKTtcbiAgLy8gICBhd2FpdCBpbWFwLmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgLy8gICAgIHNraXAoMSksXG4gIC8vICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gIC8vICAgICB0YWtlKHRvVXBkYXRlQXBwcy5sZW5ndGgpXG4gIC8vICAgICApLnRvUHJvbWlzZSgpO1xuICAvLyAgIGxvZy5pbmZvKCd3YWl0aW5nIGZvciB6aXAgZmlsZSB3cml0dGVuIC0gZG9uZScpO1xuICAvLyAgIGF3YWl0IHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gIC8vICAgdG9VcGRhdGVBcHBzLmZvckVhY2gobmFtZSA9PiB7XG4gIC8vICAgICBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMhW25hbWVdID0gY2hlY2tzdW1PYmoudmVyc2lvbnMhW25hbWVdO1xuICAvLyAgIH0pO1xuICAvLyB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nKSB7XG4vLyAgIGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG4vLyAgIHRyeSB7XG4vLyAgICAgY2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksIGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcbi8vICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgaWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcbi8vICAgICAgIHRocm93IGVycjtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuO1xuLy8gICB9XG4vLyAgIGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuLy8gICAgIHJldHVybjtcblxuLy8gICBpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcbi8vICAgICBzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG4vLyAgICAgbG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcbi8vICAgfVxuLy8gICBsZXQgZG93bmxvYWRzOiBzdHJpbmdbXSA9IFtdO1xuLy8gICAvLyBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uICYmIGNoZWNrc3VtT2JqLnBhdGgpIHtcbi8vICAgLy8gICBjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCk7XG4vLyAgIC8vICAgZG93bmxvYWRzLnB1c2goZmlsZSk7XG4vLyAgIC8vICAgY3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuLy8gICAvLyB9XG4vLyAgIGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuLy8gICAgIGxldCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG4vLyAgICAgaWYgKGN1cnJWZXJzaW9ucyA9PSBudWxsKSB7XG4vLyAgICAgICBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMgPSB7fTtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcbi8vICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRWZXJzaW9ucykpIHtcbi8vICAgICAgIGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cbi8vICAgICAgICAgXy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG4vLyAgICAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCk7XG4vLyAgICAgICAgICAgY3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuLy8gICAgICAgICAgIGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgaWYgKGRvd25sb2Fkcy5sZW5ndGggPiAwKSB7XG4vLyAgICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpLCAndXRmOCcpO1xuLy8gICAgIC8vIGRvd25sb2Fkcy5mb3JFYWNoKGZpbGUgPT4gdXBkYXRlU2VydmVyU3RhdGljKGZpbGUsIHN6aXApKTtcbi8vICAgICBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuLy8gICAgICAgYXdhaXQgcmV0cnkoMjAsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4vLyAgICAgfVxuLy8gICAgIGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xuLy8gICB9XG4vLyB9XG5cbi8vIGxldCBkb3dubG9hZENvdW50ID0gMDtcblxuLy8gYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAocGF0aDogc3RyaW5nKSB7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbi8vIFx0Ly8gbG9nLmluZm8oYCR7b3MuaG9zdG5hbWUoKX0gJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfSBkb3dubG9hZCB6aXBbRnJlZSBtZW1dOiAke01hdGgucm91bmQob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TSwgW3RvdGFsIG1lbV06ICR7TWF0aC5yb3VuZChvcy50b3RhbG1lbSgpIC8gMTA0ODU3Nil9TWApO1xuLy8gICBjb25zdCByZXNvdXJjZSA9IFVybC5yZXNvbHZlKCBzZXR0aW5nLmZldGNoVXJsLCBwYXRoICsgJz8nICsgTWF0aC5yYW5kb20oKSk7XG4vLyAgIC8vIGNvbnN0IGRvd25sb2FkVG8gPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCBgcmVtb3RlLSR7TWF0aC5yYW5kb20oKX0tJHtwYXRoLnNwbGl0KCcvJykucG9wKCl9YCk7XG4vLyAgIGNvbnN0IG5ld05hbWUgPSBwYXRoLnJlcGxhY2UoL1tcXFxcL10vZywgJ18nKTtcbi8vICAgY29uc3QgZG93bmxvYWRUbyA9IFBhdGgucmVzb2x2ZSh6aXBEb3dubG9hZERpciwgbmV3TmFtZSk7XG4vLyAgIGxvZy5pbmZvKCdmZXRjaCcsIHJlc291cmNlKTtcbi8vICAgYXdhaXQgcmV0cnk8c3RyaW5nPihzZXR0aW5nLmZldGNoUmV0cnksIGZvcmtEb3dubG9hZHppcCwgcmVzb3VyY2UsIGRvd25sb2FkVG8pO1xuLy8gICByZXR1cm4gZG93bmxvYWRUbztcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmV0Y2goZmV0Y2hVcmw6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4vLyAgIGNvbnN0IGNoZWNrVXJsID0gZmV0Y2hVcmwgKyAnPycgKyBNYXRoLnJhbmRvbSgpO1xuLy8gICBsb2cuZGVidWcoJ2NoZWNrJywgY2hlY2tVcmwpO1xuLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlaikgPT4ge1xuLy8gICAgIHJlcXVlc3QuZ2V0KGNoZWNrVXJsLFxuLy8gICAgICAge2hlYWRlcnM6IHtSZWZlcmVyOiBVcmwucmVzb2x2ZShjaGVja1VybCwgJy8nKX19LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IHJlcXVlc3QuUmVzcG9uc2UsIGJvZHk6IGFueSkgPT4ge1xuLy8gICAgICAgaWYgKGVycm9yKSB7XG4vLyAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGVycm9yKSk7XG4vLyAgICAgICB9XG4vLyAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXNDb2RlID4gMzAyKSB7XG4vLyAgICAgICAgIHJldHVybiByZWoobmV3IEVycm9yKGBzdGF0dXMgY29kZSAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9XFxucmVzcG9uc2U6XFxuJHtyZXNwb25zZX1cXG5ib2R5OlxcbiR7Ym9keX1gKSk7XG4vLyAgICAgICB9XG4vLyAgICAgICB0cnkge1xuLy8gICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKVxuLy8gICAgICAgICAgIGJvZHkgPSBKU09OLnBhcnNlKGJvZHkpO1xuLy8gICAgICAgfSBjYXRjaCAoZXgpIHtcbi8vICAgICAgICAgcmVqKGV4KTtcbi8vICAgICAgIH1cbi8vICAgICAgIHJlc29sdmUoYm9keSk7XG4vLyAgICAgfSk7XG4vLyAgIH0pO1xuLy8gfVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV0cnk8VD4odGltZXM6IG51bWJlciwgZnVuYzogKC4uLmFyZ3M6IGFueVtdKSA9PiBQcm9taXNlPFQ+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8VD4ge1xuICBmb3IgKGxldCBjbnQgPSAwOzspIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IGZ1bmMoLi4uYXJncyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjbnQrKztcbiAgICAgIGlmIChjbnQgPj0gc2V0dGluZy5mZXRjaFJldHJ5KSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICBsb2cuaW5mbygnRW5jb3VudGVyIGVycm9yLCB3aWxsIHJldHJ5Jyk7XG4gICAgfVxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgY250ICogNTAwKSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gZm9ya0Rvd25sb2FkemlwKHJlc291cmNlOiBzdHJpbmcsIHRvRmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4vLyAgIHJldHVybiBmb3JrUHJvY2VzcygnZG93bmxvYWQnLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZG93bmxvYWQtemlwLXByb2Nlc3MuanMnLCBbXG4vLyAgICAgcmVzb3VyY2UsIHRvRmlsZU5hbWUsIHNldHRpbmcuZmV0Y2hSZXRyeSArICcnXG4vLyAgIF0pO1xuLy8gfVxuZXhwb3J0IGZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCh6aXBEaXI/OiBzdHJpbmcsIG91dHB1dERpcj86IHN0cmluZywgZG9Ob3REZWxldGUgPSBmYWxzZSkge1xuICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2V4dHJhY3QnLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZXh0cmFjdC16aXAtcHJvY2Vzcy5qcycpLCBbXG4gICAgemlwRGlyID8gemlwRGlyIDogemlwRG93bmxvYWREaXIsXG4gICAgb3V0cHV0RGlyICE9IG51bGwgPyBvdXRwdXREaXIgOiBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpLFxuICAgIGRvTm90RGVsZXRlID8gJ2tlZXAnIDogJ2RlbGV0ZSdcbiAgXSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZvcmtQcm9jZXNzKG5hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZywgYXJnczogc3RyaW5nW10sIG9uUHJvY2Vzcz86IChjaGlsZDogQ2hpbGRQcm9jZXNzKSA9PiB2b2lkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgZXh0cmFjdGluZ0RvbmUgPSBmYWxzZTtcbiAgICBjb25zdCBlbnYgPSBPYmplY3QuYXNzaWduKHt9LCBwcm9jZXNzLmVudik7XG4gICAgaWYgKGVudi5OT0RFX09QVElPTlMgJiYgZW52Lk5PREVfT1BUSU9OUy5pbmRleE9mKCctLWluc3BlY3QnKSA+PSAwKSB7XG4gICAgICBkZWxldGUgZW52Lk5PREVfT1BUSU9OUztcbiAgICB9XG4gICAgY29uc3QgY2hpbGQgPSBmb3JrKGZpbGVQYXRoLFxuICAgICAgYXJncywge1xuICAgICAgc2lsZW50OiB0cnVlLFxuICAgICAgZW52XG4gICAgfSk7XG4gICAgaWYgKG9uUHJvY2Vzcykge1xuICAgICAgb25Qcm9jZXNzKGNoaWxkKTtcbiAgICB9XG4gICAgY2hpbGQub24oJ21lc3NhZ2UnLCAobXNnOiBhbnkpID0+IHtcbiAgICAgIGlmIChtc2cubG9nKSB7XG4gICAgICAgIGxvZy5pbmZvKCdbY2hpbGQgcHJvY2Vzc10gJXMgLSAlcycsIG5hbWUsIG1zZy5sb2cpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKG1zZy5kb25lKSB7XG4gICAgICAgIGV4dHJhY3RpbmdEb25lID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLmVycm9yKSB7XG4gICAgICAgIGxvZy5lcnJvcihtc2cuZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNoaWxkLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJlamVjdChvdXRwdXQpO1xuICAgIH0pO1xuICAgIGNoaWxkLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3Byb2Nlc3MgW3BpZDolc10gJXMgLSBleGl0IHdpdGg6ICVkIC0gJXMnLCBjaGlsZC5waWQsIG5hbWUsIGNvZGUsIHNpZ25hbCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICBpZiAoZXh0cmFjdGluZ0RvbmUpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGxvZy5lcnJvcihgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBleGl0IHdpdGggZXJyb3IgY29kZSAlZCAtIFwiJXNcImAsIEpTT04uc3RyaW5naWZ5KGNvZGUpLCBzaWduYWwpO1xuICAgICAgICBpZiAob3V0cHV0KVxuICAgICAgICAgIGxvZy5lcnJvcihgW2NoaWxkIHByb2Nlc3NdW3BpZDoke2NoaWxkLnBpZH1dJHtuYW1lfSAtIGAsIG91dHB1dCk7XG4gICAgICAgIHJlamVjdChvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oYHByb2Nlc3MgW3BpZDoke2NoaWxkLnBpZH1dICR7bmFtZX0gZG9uZSBzdWNjZXNzZnVsbHk6YCwgb3V0cHV0KTtcbiAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxldCBvdXRwdXQgPSAnJztcbiAgICBjaGlsZC5zdGRvdXQhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgIGNoaWxkLnN0ZG91dCEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICB9KTtcbiAgICBjaGlsZC5zdGRlcnIhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgIGNoaWxkLnN0ZGVyciEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICB9KTtcbiAgfSk7XG59XG4iXX0=