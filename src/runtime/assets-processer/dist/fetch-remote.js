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
const currChecksumFile = path_1.default.resolve(`checksum.${env}.json`);
exports.zipDownloadDir = path_1.default.resolve(path_1.default.dirname(currChecksumFile), 'deploy-static-' + env);
// let watcher: any;
let imap;
function start(imap) {
    return __awaiter(this, void 0, void 0, function* () {
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
            fs_extra_1.default.mkdirpSync(__api_1.default.config.resolve('staticDir'));
            const fileNames = fs_extra_1.default.readdirSync(installDir).filter(name => path_1.default.extname(name) === '.zip');
            if (fileNames.length > 0) {
                yield retry(2, () => forkExtractExstingZip(installDir, __api_1.default.config.resolve('staticDir'), true));
            }
        }
        const serverContentDir = path_1.default.resolve('server-content-' + setting.fetchMailServer.env);
        if (fs_extra_1.default.existsSync(serverContentDir)) {
            const zipDir = path_1.default.resolve('dist/server');
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
function forkExtractExstingZip(zipDir, outputDir = 'dist/static', doNotDelete = false) {
    return forkProcess('extract', path_1.default.resolve(__dirname, 'extract-zip-process.js'), [
        zipDir ? zipDir : exports.zipDownloadDir,
        outputDir,
        doNotDelete ? 'keep' : 'delete'
    ]);
}
exports.forkExtractExstingZip = forkExtractExstingZip;
function forkProcess(name, filePath, args, onProcess) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let extractingDone = false;
            const child = child_process_1.fork(filePath, args, {
                silent: true
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9mZXRjaC1yZW1vdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBSUEsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4Qix3REFBMEI7QUFDMUIsc0RBQThCO0FBQzlCLDhDQUFnRTtBQUNoRSxpREFBaUQ7QUFHakQsa0RBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUU5RSxNQUFNLEVBQUMseUJBQXlCLENBQUMsYUFBYSxFQUFDLEdBQUcsVUFBVSxFQUFFLENBQUM7QUFFL0Qsc0RBQXNEO0FBQ3RELElBQUksZUFBZSxHQUFhLEVBQUUsQ0FBQztBQUVuQyxNQUFNLE9BQU8sR0FBSSxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFhLENBQUM7QUFDN0QsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUM1RSwyQkFBMkI7QUFDM0IsdUJBQXVCO0FBQ3ZCLG9CQUFvQjtBQUNwQixNQUFNLGdCQUFnQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRWpELFFBQUEsY0FBYyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ25HLG9CQUFvQjtBQUNwQixJQUFJLElBQWlCLENBQUM7QUFFdEIsU0FBc0IsS0FBSyxDQUFDLElBQWlCOztRQUMzQywyQkFBMkI7UUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsSUFBSSxD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QUFDLEdBQUcsS0FBSyxJQUFJLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUMxRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQ2pCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDaEIsS0FBSyxDQUFDLE1BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkMsS0FBSyxDQUFDLE1BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDbEIsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsTUFBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxLQUFLLENBQUMsTUFBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBIiwiZmlsZSI6InJ1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2ZldGNoLXJlbW90ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
