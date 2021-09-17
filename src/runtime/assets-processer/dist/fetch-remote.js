"use strict";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtcmVtb3RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmV0Y2gtcmVtb3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUlBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsd0RBQTBCO0FBQzFCLHNEQUE4QjtBQUM5Qiw4Q0FBZ0U7QUFDaEUsaURBQWlEO0FBR2pELGtEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFFOUUsTUFBTSxFQUFDLHlCQUF5QixDQUFDLGFBQWEsRUFBQyxHQUFHLFVBQVUsRUFBRSxDQUFDO0FBRS9ELHNEQUFzRDtBQUN0RCxJQUFJLGVBQWUsR0FBYSxFQUFFLENBQUM7QUFFbkMsTUFBTSxPQUFPLEdBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBYSxDQUFDO0FBQzdELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDNUUsMkJBQTJCO0FBQzNCLHVCQUF1QjtBQUN2QixvQkFBb0I7QUFDcEIsTUFBTSxnQkFBZ0IsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBRW5FLFFBQUEsY0FBYyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ25HLG9CQUFvQjtBQUNwQixJQUFJLElBQWlCLENBQUM7QUFFZixLQUFLLFVBQVUsS0FBSyxDQUFDLElBQWlCO0lBQzNDLDJCQUEyQjtJQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixJ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ZnJvbSAncmVxdWVzdCc7XG4vLyBpbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcbmltcG9ydCB7ZmlsdGVyLCBzd2l0Y2hNYXAgLypza2lwLCB0YWtlKi99IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Zm9yaywgQ2hpbGRQcm9jZXNzfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7Q2hlY2tzdW0sIFdpdGhNYWlsU2VydmVyQ29uZmlnIGFzIFNldHRpbmd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQHdmaC9hc3NldHMtcHJvY2Vzc2VyLmZldGNoLXJlbW90ZScpO1xuXG5jb25zdCB7LypwbTJJbnN0YW5jZUlkLCBpc1BtMiwqLyBpc01haW5Qcm9jZXNzfSA9IGdldFBtMkluZm8oKTtcblxuLy8gbGV0IGN1cnJWZXJzaW9uOiBudW1iZXIgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5sZXQgY3VycmVudENoZWNrc3VtOiBDaGVja3N1bSA9IFtdO1xuXG5jb25zdCBzZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgU2V0dGluZyk7XG5jb25zdCBlbnYgPSBzZXR0aW5nLmZldGNoTWFpbFNlcnZlciA/IHNldHRpbmcuZmV0Y2hNYWlsU2VydmVyLmVudiA6ICdsb2NhbCc7XG4vLyBsZXQgdGltZXI6IE5vZGVKUy5UaW1lcjtcbi8vIGxldCBzdG9wcGVkID0gZmFsc2U7XG4vLyBsZXQgZXJyQ291bnQgPSAwO1xuY29uc3QgY3VyckNoZWNrc3VtRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCBgY2hlY2tzdW0uJHtlbnZ9Lmpzb25gKTtcblxuZXhwb3J0IGNvbnN0IHppcERvd25sb2FkRGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKSwgJ2RlcGxveS1zdGF0aWMtJyArIGVudik7XG4vLyBsZXQgd2F0Y2hlcjogYW55O1xubGV0IGltYXA6IEltYXBNYW5hZ2VyO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnQoaW1hcDogSW1hcE1hbmFnZXIpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG5cdGxvZy5pbmZvKGBbbWVtb3J5IHN0YXR1c10gdG90YWwgJHtNYXRoLmZsb29yKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYiwgZnJlZSAke01hdGguZmxvb3Iob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TWJcXG5gICtcbiAgICBgW251bSBvZiBDUFVdICR7b3MuY3B1cygpLmxlbmd0aH1gKTtcblxuICBpZiAoIXNldHRpbmcuZmV0Y2hNYWlsU2VydmVyKSB7XG4gICAgbG9nLmluZm8oJ05vIGZldGNoVXJsIGNvbmZpZ3VyZWQsIHNraXAgZmV0Y2hpbmcgcmVzb3VyY2UuJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHNldHRpbmcuZG93bmxvYWRNb2RlICE9PSAnbWVtb3J5JyAgJiYgIWlzTWFpblByb2Nlc3MpIHtcbiAgICAvLyBub24gaW5NZW1vcnkgbW9kZSBtZWFucyBleHRyYWN0aW5nIHppcCBmaWxlIHRvIGxvY2FsIGRpcmVjdG9yeSBkaXN0L3N0YXRpYyxcbiAgICAvLyBpbiBjYXNlIG9mIGNsdXN0ZXIgbW9kZSwgd2Ugb25seSB3YW50IHNpbmdsZSBwcm9jZXNzIGRvIHppcCBleHRyYWN0aW5nIGFuZCBmaWxlIHdyaXRpbmcgdGFzayB0byBhdm9pZCBjb25mbGljdC5cbiAgICBsb2cuaW5mbygnVGhpcyBwcm9jZXNzIGlzIG5vdCBtYWluIHByb2Nlc3MnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHppcERvd25sb2FkRGlyKSlcbiAgICBmcy5ta2RpcnBTeW5jKHppcERvd25sb2FkRGlyKTtcblxuICBjb25zdCBpbnN0YWxsRGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcsICdpbnN0YWxsLScgKyBzZXR0aW5nLmZldGNoTWFpbFNlcnZlci5lbnYpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgIGZzLm1rZGlycFN5bmMoYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSk7XG4gICAgY29uc3QgZmlsZU5hbWVzID0gZnMucmVhZGRpclN5bmMoaW5zdGFsbERpcikuZmlsdGVyKG5hbWUgPT4gUGF0aC5leHRuYW1lKG5hbWUpID09PSAnLnppcCcpO1xuICAgIGlmIChmaWxlTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgYXdhaXQgcmV0cnkoMiwgKCkgPT4gZm9ya0V4dHJhY3RFeHN0aW5nWmlwKGluc3RhbGxEaXIsIGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyksIHRydWUpKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzZXJ2ZXJDb250ZW50RGlyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcsICdzZXJ2ZXItY29udGVudC0nICsgc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIuZW52KTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoc2VydmVyQ29udGVudERpcikpIHtcbiAgICBjb25zdCB6aXBEaXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnc2VydmVyJyk7XG4gICAgZnMubWtkaXJwU3luYyh6aXBEaXIpO1xuICAgIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHNlcnZlckNvbnRlbnREaXIpLmZpbHRlcihuYW1lID0+IFBhdGguZXh0bmFtZShuYW1lKSA9PT0gJy56aXAnKTtcbiAgICBpZiAoZmlsZU5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHJldHJ5KDIsICgpID0+IGZvcmtFeHRyYWN0RXhzdGluZ1ppcChzZXJ2ZXJDb250ZW50RGlyLCB6aXBEaXIsIHRydWUpKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG4gICAgc2V0dGluZy5mZXRjaFJldHJ5ID0gMztcblxuICBpZiAoZnMuZXhpc3RzU3luYyhjdXJyQ2hlY2tzdW1GaWxlKSkge1xuICAgIGN1cnJlbnRDaGVja3N1bSA9IE9iamVjdC5hc3NpZ24oY3VycmVudENoZWNrc3VtLCBmcy5yZWFkSlNPTlN5bmMoY3VyckNoZWNrc3VtRmlsZSkpO1xuICAgIGxvZy5pbmZvKCdGb3VuZCBzYXZlZCBjaGVja3N1bSBmaWxlIGFmdGVyIHJlYm9vdFxcbicsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJykpO1xuICB9XG4gIGxvZy5pbmZvKCdzdGFydCBwb2xsIG1haWwnKTtcblxuICBpbWFwLmNoZWNrc3VtU3RhdGUucGlwZShcbiAgICBmaWx0ZXIoY3MgPT4gY3MgIT0gbnVsbCksXG4gICAgc3dpdGNoTWFwKGNzID0+IGNoZWNrQW5kRG93bmxvYWQoY3MhLCBpbWFwKSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICAvLyBhd2FpdCBpbWFwLmNoZWNrTWFpbEZvclVwZGF0ZSgpO1xuXG4gIC8vIGF3YWl0IGltYXAuc3RhcnRXYXRjaE1haWwoc2V0dGluZy5mZXRjaEludGVydmFsU2VjICogMTAwMCk7XG59XG5cbi8qKlxuICogSXQgc2VlbXMgb2sgdG8gcXVpdCBwcm9jZXNzIHdpdGhvdXQgY2FsbGluZyB0aGlzIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCkge1xuICBpZiAoaW1hcClcbiAgICBpbWFwLnN0b3BXYXRjaCgpO1xuICAvLyBzdG9wcGVkID0gdHJ1ZTtcbiAgLy8gaWYgKHdhdGNoZXIpXG4gIC8vICAgd2F0Y2hlci5jbG9zZSgpO1xuICAvLyBpZiAodGltZXIpIHtcbiAgLy8gICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAvLyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQbTJJbmZvKCkge1xuICBjb25zdCBwbTJJbnN0YW5jZUlkID0gcHJvY2Vzcy5lbnYuTk9ERV9BUFBfSU5TVEFOQ0U7XG4gIGNvbnN0IGlzUG0yID0gY2x1c3Rlci5pc1dvcmtlciAmJiBwbTJJbnN0YW5jZUlkICE9IG51bGw7XG4gIGNvbnN0IGlzTWFpblByb2Nlc3MgPSAhaXNQbTIgfHwgcG0ySW5zdGFuY2VJZCA9PT0gJzAnO1xuICByZXR1cm4ge1xuICAgIGlzUG0yLFxuICAgIHBtMkluc3RhbmNlSWQsXG4gICAgaXNNYWluUHJvY2Vzc1xuICB9O1xufVxuXG4vLyBhc3luYyBmdW5jdGlvbiBydW5SZXBlYXRseShzZXR0aW5nOiBTZXR0aW5nKTogUHJvbWlzZTx2b2lkPiB7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgaWYgKHN0b3BwZWQpXG4vLyAgICAgICByZXR1cm47XG5cbi8vICAgICB0cnkge1xuLy8gICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMDAwKSk7XG4vLyAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICBsb2cuZXJyb3IoZXJyKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuYXN5bmMgZnVuY3Rpb24gY2hlY2tBbmREb3dubG9hZChjaGVja3N1bU9iajogQ2hlY2tzdW0sIGltYXA6IEltYXBNYW5hZ2VyKSB7XG4gIC8vIGxldCB0b1VwZGF0ZUFwcHM6IHN0cmluZ1tdID0gW107XG4gIC8vIGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuICAvLyAgIGxldCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG4gIC8vICAgaWYgKGN1cnJWZXJzaW9ucyA9PSBudWxsKSB7XG4gIC8vICAgICBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMgPSB7fTtcbiAgLy8gICB9XG4gIC8vICAgY29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcbiAgLy8gICBmb3IgKGNvbnN0IGFwcE5hbWUgb2YgT2JqZWN0LmtleXModGFyZ2V0VmVyc2lvbnMpKSB7XG4gIC8vICAgICBpZiAoY3VyclZlcnNpb25zW2FwcE5hbWVdID09IG51bGwgfHxcbiAgLy8gICAgICAgKCB0YXJnZXRWZXJzaW9uc1thcHBOYW1lXSAmJlxuICAvLyAgICAgICAgIGN1cnJWZXJzaW9uc1thcHBOYW1lXS52ZXJzaW9uIDwgdGFyZ2V0VmVyc2lvbnNbYXBwTmFtZV0udmVyc2lvbilcbiAgLy8gICAgICkge1xuICAvLyAgICAgICBsb2cuaW5mbyhgRmluZCB1cGRhdGVkIHZlcnNpb24gb2YgJHthcHBOYW1lfWApO1xuICAvLyAgICAgICB0b1VwZGF0ZUFwcHMucHVzaChhcHBOYW1lKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBpZiAodG9VcGRhdGVBcHBzLmxlbmd0aCA+IDApIHtcbiAgLy8gICBpbWFwLmZldGNoQXBwRHVyaW5nV2F0Y2hBY3Rpb24oLi4udG9VcGRhdGVBcHBzKTtcbiAgLy8gICBsb2cuaW5mbygnd2FpdGluZyBmb3IgemlwIGZpbGUgd3JpdHRlbicpO1xuICAvLyAgIGF3YWl0IGltYXAuZmlsZVdyaXRpbmdTdGF0ZS5waXBlKFxuICAvLyAgICAgc2tpcCgxKSxcbiAgLy8gICAgIGZpbHRlcih3cml0aW5nID0+ICF3cml0aW5nKSxcbiAgLy8gICAgIHRha2UodG9VcGRhdGVBcHBzLmxlbmd0aClcbiAgLy8gICAgICkudG9Qcm9taXNlKCk7XG4gIC8vICAgbG9nLmluZm8oJ3dhaXRpbmcgZm9yIHppcCBmaWxlIHdyaXR0ZW4gLSBkb25lJyk7XG4gIC8vICAgYXdhaXQgcmV0cnkoMiwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbiAgLy8gICB0b1VwZGF0ZUFwcHMuZm9yRWFjaChuYW1lID0+IHtcbiAgLy8gICAgIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucyFbbmFtZV0gPSBjaGVja3N1bU9iai52ZXJzaW9ucyFbbmFtZV07XG4gIC8vICAgfSk7XG4gIC8vIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gcnVuKHNldHRpbmc6IFNldHRpbmcpIHtcbi8vICAgbGV0IGNoZWNrc3VtT2JqOiBDaGVja3N1bTtcbi8vICAgdHJ5IHtcbi8vICAgICBjaGVja3N1bU9iaiA9IGF3YWl0IHJldHJ5KHNldHRpbmcuZmV0Y2hSZXRyeSwgZmV0Y2gsIHNldHRpbmcuZmV0Y2hVcmwpO1xuLy8gICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICBpZiAoZXJyQ291bnQrKyAlIHNldHRpbmcuZmV0Y2hMb2dFcnJQZXJUaW1lcyA9PT0gMCkge1xuLy8gICAgICAgdGhyb3cgZXJyO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm47XG4vLyAgIH1cbi8vICAgaWYgKGNoZWNrc3VtT2JqID09IG51bGwpXG4vLyAgICAgcmV0dXJuO1xuXG4vLyAgIGlmIChjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybCkge1xuLy8gICAgIHNldHRpbmcuZmV0Y2hVcmwgPSBjaGVja3N1bU9iai5jaGFuZ2VGZXRjaFVybDtcbi8vICAgICBsb2cuaW5mbygnQ2hhbmdlIGZldGNoIFVSTCB0bycsIHNldHRpbmcuZmV0Y2hVcmwpO1xuLy8gICB9XG4vLyAgIGxldCBkb3dubG9hZHM6IHN0cmluZ1tdID0gW107XG4vLyAgIC8vIGlmIChjaGVja3N1bU9iai52ZXJzaW9uICE9IG51bGwgJiYgY3VycmVudENoZWNrc3VtLnZlcnNpb24gIT09IGNoZWNrc3VtT2JqLnZlcnNpb24gJiYgY2hlY2tzdW1PYmoucGF0aCkge1xuLy8gICAvLyAgIGNvbnN0IGZpbGUgPSBhd2FpdCBkb3dubG9hZFppcChjaGVja3N1bU9iai5wYXRoKTtcbi8vICAgLy8gICBkb3dubG9hZHMucHVzaChmaWxlKTtcbi8vICAgLy8gICBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbiA9IGNoZWNrc3VtT2JqLnZlcnNpb247XG4vLyAgIC8vIH1cbi8vICAgaWYgKGNoZWNrc3VtT2JqLnZlcnNpb25zKSB7XG4vLyAgICAgbGV0IGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucztcbi8vICAgICBpZiAoY3VyclZlcnNpb25zID09IG51bGwpIHtcbi8vICAgICAgIGN1cnJWZXJzaW9ucyA9IGN1cnJlbnRDaGVja3N1bS52ZXJzaW9ucyA9IHt9O1xuLy8gICAgIH1cbi8vICAgICBjb25zdCB0YXJnZXRWZXJzaW9ucyA9IGNoZWNrc3VtT2JqLnZlcnNpb25zO1xuLy8gICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRhcmdldFZlcnNpb25zKSkge1xuLy8gICAgICAgaWYgKCFfLmhhcyh0YXJnZXRWZXJzaW9ucywga2V5KSB8fCBfLmdldChjdXJyVmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pICE9PVxuLy8gICAgICAgICBfLmdldCh0YXJnZXRWZXJzaW9ucywgW2tleSwgJ3ZlcnNpb24nXSkpIHtcbi8vICAgICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAodGFyZ2V0VmVyc2lvbnNba2V5XS5wYXRoKTtcbi8vICAgICAgICAgICBjdXJyVmVyc2lvbnNba2V5XSA9IHRhcmdldFZlcnNpb25zW2tleV07XG4vLyAgICAgICAgICAgZG93bmxvYWRzLnB1c2goZmlsZSk7XG4vLyAgICAgICAgIH1cbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICBpZiAoZG93bmxvYWRzLmxlbmd0aCA+IDApIHtcbi8vICAgICBmcy53cml0ZUZpbGVTeW5jKGN1cnJDaGVja3N1bUZpbGUsIEpTT04uc3RyaW5naWZ5KGN1cnJlbnRDaGVja3N1bSwgbnVsbCwgJyAgJyksICd1dGY4Jyk7XG4vLyAgICAgLy8gZG93bmxvYWRzLmZvckVhY2goZmlsZSA9PiB1cGRhdGVTZXJ2ZXJTdGF0aWMoZmlsZSwgc3ppcCkpO1xuLy8gICAgIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSA9PT0gJ2ZvcmsnKSB7XG4vLyAgICAgICBhd2FpdCByZXRyeSgyMCwgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKTtcbi8vICAgICB9XG4vLyAgICAgYXBpLmV2ZW50QnVzLmVtaXQoYXBpLnBhY2thZ2VOYW1lICsgJy5kb3dubG9hZGVkJyk7XG4vLyAgIH1cbi8vIH1cblxuLy8gbGV0IGRvd25sb2FkQ291bnQgPSAwO1xuXG4vLyBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFppcChwYXRoOiBzdHJpbmcpIHtcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuLy8gXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG4vLyAgIGNvbnN0IHJlc291cmNlID0gVXJsLnJlc29sdmUoIHNldHRpbmcuZmV0Y2hVcmwsIHBhdGggKyAnPycgKyBNYXRoLnJhbmRvbSgpKTtcbi8vICAgLy8gY29uc3QgZG93bmxvYWRUbyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsIGByZW1vdGUtJHtNYXRoLnJhbmRvbSgpfS0ke3BhdGguc3BsaXQoJy8nKS5wb3AoKX1gKTtcbi8vICAgY29uc3QgbmV3TmFtZSA9IHBhdGgucmVwbGFjZSgvW1xcXFwvXS9nLCAnXycpO1xuLy8gICBjb25zdCBkb3dubG9hZFRvID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBuZXdOYW1lKTtcbi8vICAgbG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuLy8gICBhd2FpdCByZXRyeTxzdHJpbmc+KHNldHRpbmcuZmV0Y2hSZXRyeSwgZm9ya0Rvd25sb2FkemlwLCByZXNvdXJjZSwgZG93bmxvYWRUbyk7XG4vLyAgIHJldHVybiBkb3dubG9hZFRvO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbi8vICAgY29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG4vLyAgIGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG4vLyAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4vLyAgICAgcmVxdWVzdC5nZXQoY2hlY2tVcmwsXG4vLyAgICAgICB7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG4vLyAgICAgICBpZiAoZXJyb3IpIHtcbi8vICAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcbi8vICAgICAgIH1cbi8vICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcbi8vICAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcbi8vICAgICAgIH1cbi8vICAgICAgIHRyeSB7XG4vLyAgICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG4vLyAgICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4vLyAgICAgICB9IGNhdGNoIChleCkge1xuLy8gICAgICAgICByZWooZXgpO1xuLy8gICAgICAgfVxuLy8gICAgICAgcmVzb2x2ZShib2R5KTtcbi8vICAgICB9KTtcbi8vICAgfSk7XG4vLyB9XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeTxUPih0aW1lczogbnVtYmVyLCBmdW5jOiAoLi4uYXJnczogYW55W10pID0+IFByb21pc2U8VD4sIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxUPiB7XG4gIGZvciAobGV0IGNudCA9IDA7Oykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgZnVuYyguLi5hcmdzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNudCsrO1xuICAgICAgaWYgKGNudCA+PSBzZXR0aW5nLmZldGNoUmV0cnkpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgIGxvZy5pbmZvKCdFbmNvdW50ZXIgZXJyb3IsIHdpbGwgcmV0cnknKTtcbiAgICB9XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzID0+IHNldFRpbWVvdXQocmVzLCBjbnQgKiA1MDApKTtcbiAgfVxufVxuXG4vLyBmdW5jdGlvbiBmb3JrRG93bmxvYWR6aXAocmVzb3VyY2U6IHN0cmluZywgdG9GaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbi8vICAgcmV0dXJuIGZvcmtQcm9jZXNzKCdkb3dubG9hZCcsICdub2RlX21vZHVsZXMvJyArIGFwaS5wYWNrYWdlTmFtZSArICcvZGlzdC9kb3dubG9hZC16aXAtcHJvY2Vzcy5qcycsIFtcbi8vICAgICByZXNvdXJjZSwgdG9GaWxlTmFtZSwgc2V0dGluZy5mZXRjaFJldHJ5ICsgJydcbi8vICAgXSk7XG4vLyB9XG5leHBvcnQgZnVuY3Rpb24gZm9ya0V4dHJhY3RFeHN0aW5nWmlwKHppcERpcj86IHN0cmluZywgb3V0cHV0RGlyPzogc3RyaW5nLCBkb05vdERlbGV0ZSA9IGZhbHNlKSB7XG4gIHJldHVybiBmb3JrUHJvY2VzcygnZXh0cmFjdCcsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdleHRyYWN0LXppcC1wcm9jZXNzLmpzJyksIFtcbiAgICB6aXBEaXIgPyB6aXBEaXIgOiB6aXBEb3dubG9hZERpcixcbiAgICBvdXRwdXREaXIgIT0gbnVsbCA/IG91dHB1dERpciA6IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyksXG4gICAgZG9Ob3REZWxldGUgPyAna2VlcCcgOiAnZGVsZXRlJ1xuICBdKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZm9ya1Byb2Nlc3MobmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSwgb25Qcm9jZXNzPzogKGNoaWxkOiBDaGlsZFByb2Nlc3MpID0+IHZvaWQpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBleHRyYWN0aW5nRG9uZSA9IGZhbHNlO1xuICAgIGNvbnN0IGVudiA9IE9iamVjdC5hc3NpZ24oe30sIHByb2Nlc3MuZW52KTtcbiAgICBpZiAoZW52Lk5PREVfT1BUSU9OUyAmJiBlbnYuTk9ERV9PUFRJT05TLmluZGV4T2YoJy0taW5zcGVjdCcpID49IDApIHtcbiAgICAgIGRlbGV0ZSBlbnYuTk9ERV9PUFRJT05TO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZCA9IGZvcmsoZmlsZVBhdGgsXG4gICAgICBhcmdzLCB7XG4gICAgICBzaWxlbnQ6IHRydWUsXG4gICAgICBlbnZcbiAgICB9KTtcbiAgICBpZiAob25Qcm9jZXNzKSB7XG4gICAgICBvblByb2Nlc3MoY2hpbGQpO1xuICAgIH1cbiAgICBjaGlsZC5vbignbWVzc2FnZScsIChtc2c6IGFueSkgPT4ge1xuICAgICAgaWYgKG1zZy5sb2cpIHtcbiAgICAgICAgbG9nLmluZm8oJ1tjaGlsZCBwcm9jZXNzXSAlcyAtICVzJywgbmFtZSwgbXNnLmxvZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAobXNnLmRvbmUpIHtcbiAgICAgICAgZXh0cmFjdGluZ0RvbmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChtc2cuZXJyb3IpIHtcbiAgICAgICAgbG9nLmVycm9yKG1zZy5lcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY2hpbGQub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmVqZWN0KG91dHB1dCk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBsb2cuaW5mbygncHJvY2VzcyBbcGlkOiVzXSAlcyAtIGV4aXQgd2l0aDogJWQgLSAlcycsIGNoaWxkLnBpZCwgbmFtZSwgY29kZSwgc2lnbmFsKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIGlmIChleHRyYWN0aW5nRG9uZSkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKG91dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmVycm9yKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGV4aXQgd2l0aCBlcnJvciBjb2RlICVkIC0gXCIlc1wiYCwgSlNPTi5zdHJpbmdpZnkoY29kZSksIHNpZ25hbCk7XG4gICAgICAgIGlmIChvdXRwdXQpXG4gICAgICAgICAgbG9nLmVycm9yKGBbY2hpbGQgcHJvY2Vzc11bcGlkOiR7Y2hpbGQucGlkfV0ke25hbWV9IC0gYCwgb3V0cHV0KTtcbiAgICAgICAgcmVqZWN0KG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBkb25lIHN1Y2Nlc3NmdWxseTpgLCBvdXRwdXQpO1xuICAgICAgICByZXNvbHZlKG91dHB1dCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGV0IG91dHB1dCA9ICcnO1xuICAgIGNoaWxkLnN0ZG91dCEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgY2hpbGQuc3Rkb3V0IS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgIH0pO1xuICAgIGNoaWxkLnN0ZGVyciEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgY2hpbGQuc3RkZXJyIS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==