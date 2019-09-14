"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const operators_1 = require("rxjs/operators");
const child_process_1 = require("child_process");
const fetch_types_1 = require("./fetch-types");
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const log = require('log4js').getLogger('@dr-core/assets-processer.fetch-remote');
const pm2InstanceId = process.env.NODE_APP_INSTANCE;
const isPm2 = cluster_1.default.isWorker && pm2InstanceId != null;
const isMainProcess = !isPm2 || pm2InstanceId === '0';
let setting;
// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum = {
    version: Number.NEGATIVE_INFINITY,
    path: '',
    versions: {}
};
// let timer: NodeJS.Timer;
// let stopped = false;
// let errCount = 0;
let zipDownloadDir = path_1.default.dirname(fetch_types_1.currChecksumFile);
// let watcher: any;
let imap;
function start() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line
        log.info(`[memory status] total ${Math.floor(os_1.default.totalmem() / 1048576)}Mb, free ${Math.floor(os_1.default.freemem() / 1048576)}Mb\n` +
            `[num of CPU] ${os_1.default.cpus().length}`);
        const api = require('__api');
        setting = api.config.get(api.packageName);
        if (setting.fetchMailServer == null) {
            log.info('No fetchUrl configured, skip fetching resource.');
            return Promise.resolve();
        }
        if (setting.downloadMode !== 'memory' && !isMainProcess) {
            // non inMemory mode means extracting zip file to local directory dist/static,
            // in case of cluster mode, we only want single process do zip extracting and file writing task to avoid conflict.
            log.info('This process is not main process');
            return;
        }
        // if (!fs.existsSync(zipDownloadDir))
        //   fs.mkdirpSync(zipDownloadDir);
        const fileNames = fs_extra_1.default.readdirSync(zipDownloadDir).filter(name => path_1.default.extname(name) === '.zip');
        if (fileNames.length > 0) {
            yield retry(2, forkExtractExstingZip);
        }
        if (setting.fetchRetry == null)
            setting.fetchRetry = 3;
        if (fs_extra_1.default.existsSync(fetch_types_1.currChecksumFile)) {
            currentChecksum = Object.assign(currentChecksum, fs_extra_1.default.readJSONSync(fetch_types_1.currChecksumFile));
            log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
        }
        // await runRepeatly(setting);
        log.info('start watch mail');
        imap = new fetch_remote_imap_1.ImapManager(api.config.get(api.packageName)
            .fetchMailServer.env);
        imap.checksumState.pipe(operators_1.filter(cs => cs != null), operators_1.switchMap(cs => checkAndDownload(cs, imap)), operators_1.retry(3)).subscribe();
        yield imap.startWatchMail();
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
        let toUpdateApps = [];
        if (checksumObj.versions) {
            let currVersions = currentChecksum.versions;
            if (currVersions == null) {
                currVersions = currentChecksum.versions = {};
            }
            const targetVersions = checksumObj.versions;
            for (const appName of Object.keys(targetVersions)) {
                if (currVersions[appName] == null ||
                    (targetVersions[appName] &&
                        currVersions[appName].version < targetVersions[appName].version)) {
                    log.info(`Find updated version of ${appName}`);
                    toUpdateApps.push(appName);
                }
            }
        }
        if (toUpdateApps.length > 0) {
            imap.fetchAppDuringWatchAction(...toUpdateApps);
            log.info('waiting for zip file written');
            yield imap.fileWritingState.pipe(operators_1.skip(1), operators_1.filter(writing => !writing), operators_1.take(toUpdateApps.length)).toPromise();
            log.info('waiting for zip file written - done');
            yield retry(2, forkExtractExstingZip);
            toUpdateApps.forEach(name => {
                currentChecksum.versions[name] = checksumObj.versions[name];
            });
        }
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
// function forkDownloadzip(resource: string, toFileName: string): Promise<string> {
//   return forkProcess('download', 'node_modules/' + api.packageName + '/dist/download-zip-process.js', [
//     resource, toFileName, setting.fetchRetry + ''
//   ]);
// }
function forkExtractExstingZip() {
    const api = require('__api');
    return forkProcess('extract', 'node_modules/' + api.packageName + '/dist/extract-zip-process.js', [
        zipDownloadDir,
        api.config.resolve('staticDir')
    ]);
}
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2ZldGNoLXJlbW90ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQSxvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw4REFBOEI7QUFDOUIsOENBQWdGO0FBQ2hGLGlEQUFpRDtBQUNqRCwrQ0FBMEY7QUFDMUYsMkRBQWdEO0FBQ2hELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUVsRixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0FBQ3BELE1BQU0sS0FBSyxHQUFHLGlCQUFPLENBQUMsUUFBUSxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUM7QUFDeEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxLQUFLLEdBQUcsQ0FBQztBQUV0RCxJQUFJLE9BQWdCLENBQUM7QUFDckIsc0RBQXNEO0FBQ3RELElBQUksZUFBZSxHQUFhO0lBQzlCLE9BQU8sRUFBRSxNQUFNLENBQUMsaUJBQWlCO0lBQ2pDLElBQUksRUFBRSxFQUFFO0lBQ1IsUUFBUSxFQUFFLEVBQUU7Q0FDYixDQUFDO0FBR0YsMkJBQTJCO0FBQzNCLHVCQUF1QjtBQUN2QixvQkFBb0I7QUFDcEIsSUFBSSxjQUFjLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyw4QkFBZ0IsQ0FBQyxDQUFDO0FBQ3BELG9CQUFvQjtBQUNwQixJQUFJLElBQWlCLENBQUM7QUFFdEIsU0FBc0IsS0FBSzs7UUFDekIsMkJBQTJCO1FBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLE9B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Q0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG4vLyBpbXBvcnQgcmVxdWVzdCBmcm9tICdyZXF1ZXN0Jztcbi8vIGltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuaW1wb3J0IHtmaWx0ZXIsIHN3aXRjaE1hcCwgcmV0cnkgYXMgcmV0cnlPcHQsIHNraXAsIHRha2V9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Zm9yaywgQ2hpbGRQcm9jZXNzfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7Q2hlY2tzdW0sIGN1cnJDaGVja3N1bUZpbGUsIFdpdGhNYWlsU2VydmVyQ29uZmlnIGFzIFNldHRpbmd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIuZmV0Y2gtcmVtb3RlJyk7XG5cbmNvbnN0IHBtMkluc3RhbmNlSWQgPSBwcm9jZXNzLmVudi5OT0RFX0FQUF9JTlNUQU5DRTtcbmNvbnN0IGlzUG0yID0gY2x1c3Rlci5pc1dvcmtlciAmJiBwbTJJbnN0YW5jZUlkICE9IG51bGw7XG5jb25zdCBpc01haW5Qcm9jZXNzID0gIWlzUG0yIHx8IHBtMkluc3RhbmNlSWQgPT09ICcwJztcblxubGV0IHNldHRpbmc6IFNldHRpbmc7XG4vLyBsZXQgY3VyclZlcnNpb246IG51bWJlciA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbmxldCBjdXJyZW50Q2hlY2tzdW06IENoZWNrc3VtID0ge1xuICB2ZXJzaW9uOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gIHBhdGg6ICcnLFxuICB2ZXJzaW9uczoge31cbn07XG5cblxuLy8gbGV0IHRpbWVyOiBOb2RlSlMuVGltZXI7XG4vLyBsZXQgc3RvcHBlZCA9IGZhbHNlO1xuLy8gbGV0IGVyckNvdW50ID0gMDtcbmxldCB6aXBEb3dubG9hZERpciA9IFBhdGguZGlybmFtZShjdXJyQ2hlY2tzdW1GaWxlKTtcbi8vIGxldCB3YXRjaGVyOiBhbnk7XG5sZXQgaW1hcDogSW1hcE1hbmFnZXI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydCgpIHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdGxvZy5pbmZvKGBbbWVtb3J5IHN0YXR1c10gdG90YWwgJHtNYXRoLmZsb29yKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYiwgZnJlZSAke01hdGguZmxvb3Iob3MuZnJlZW1lbSgpIC8gMTA0ODU3Nil9TWJcXG5gICtcbiAgICBgW251bSBvZiBDUFVdICR7b3MuY3B1cygpLmxlbmd0aH1gKTtcblxuICBjb25zdCBhcGk6IHR5cGVvZiBfX2FwaSA9IHJlcXVpcmUoJ19fYXBpJyk7XG4gIHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuICBpZiAoc2V0dGluZy5mZXRjaE1haWxTZXJ2ZXIgPT0gbnVsbCkge1xuICAgIGxvZy5pbmZvKCdObyBmZXRjaFVybCBjb25maWd1cmVkLCBza2lwIGZldGNoaW5nIHJlc291cmNlLicpO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIGlmIChzZXR0aW5nLmRvd25sb2FkTW9kZSAhPT0gJ21lbW9yeScgICYmICFpc01haW5Qcm9jZXNzKSB7XG4gICAgLy8gbm9uIGluTWVtb3J5IG1vZGUgbWVhbnMgZXh0cmFjdGluZyB6aXAgZmlsZSB0byBsb2NhbCBkaXJlY3RvcnkgZGlzdC9zdGF0aWMsXG4gICAgLy8gaW4gY2FzZSBvZiBjbHVzdGVyIG1vZGUsIHdlIG9ubHkgd2FudCBzaW5nbGUgcHJvY2VzcyBkbyB6aXAgZXh0cmFjdGluZyBhbmQgZmlsZSB3cml0aW5nIHRhc2sgdG8gYXZvaWQgY29uZmxpY3QuXG4gICAgbG9nLmluZm8oJ1RoaXMgcHJvY2VzcyBpcyBub3QgbWFpbiBwcm9jZXNzJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIGlmICghZnMuZXhpc3RzU3luYyh6aXBEb3dubG9hZERpcikpXG4gIC8vICAgZnMubWtkaXJwU3luYyh6aXBEb3dubG9hZERpcik7XG4gIGNvbnN0IGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jKHppcERvd25sb2FkRGlyKS5maWx0ZXIobmFtZSA9PiBQYXRoLmV4dG5hbWUobmFtZSkgPT09ICcuemlwJyk7XG4gIGlmIChmaWxlTmFtZXMubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gIH1cblxuICBpZiAoc2V0dGluZy5mZXRjaFJldHJ5ID09IG51bGwpXG4gICAgc2V0dGluZy5mZXRjaFJldHJ5ID0gMztcbiAgaWYgKGZzLmV4aXN0c1N5bmMoY3VyckNoZWNrc3VtRmlsZSkpIHtcbiAgICBjdXJyZW50Q2hlY2tzdW0gPSBPYmplY3QuYXNzaWduKGN1cnJlbnRDaGVja3N1bSwgZnMucmVhZEpTT05TeW5jKGN1cnJDaGVja3N1bUZpbGUpKTtcbiAgICBsb2cuaW5mbygnRm91bmQgc2F2ZWQgY2hlY2tzdW0gZmlsZSBhZnRlciByZWJvb3RcXG4nLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpKTtcbiAgfVxuICAvLyBhd2FpdCBydW5SZXBlYXRseShzZXR0aW5nKTtcbiAgbG9nLmluZm8oJ3N0YXJ0IHdhdGNoIG1haWwnKTtcbiAgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcigoYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBTZXR0aW5nKVxuICAgIC5mZXRjaE1haWxTZXJ2ZXIuZW52KTtcbiAgaW1hcC5jaGVja3N1bVN0YXRlLnBpcGUoXG4gICAgZmlsdGVyKGNzID0+IGNzICE9IG51bGwpLFxuICAgIHN3aXRjaE1hcChjcyA9PiBjaGVja0FuZERvd25sb2FkKGNzISwgaW1hcCkpLFxuICAgIHJldHJ5T3B0KDMpXG4gICkuc3Vic2NyaWJlKCk7XG4gIGF3YWl0IGltYXAuc3RhcnRXYXRjaE1haWwoKTtcbn1cblxuLyoqXG4gKiBJdCBzZWVtcyBvayB0byBxdWl0IHByb2Nlc3Mgd2l0aG91dCBjYWxsaW5nIHRoaXMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3AoKSB7XG4gIGltYXAuc3RvcFdhdGNoKCk7XG4gIC8vIHN0b3BwZWQgPSB0cnVlO1xuICAvLyBpZiAod2F0Y2hlcilcbiAgLy8gICB3YXRjaGVyLmNsb3NlKCk7XG4gIC8vIGlmICh0aW1lcikge1xuICAvLyAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gIC8vIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gcnVuUmVwZWF0bHkoc2V0dGluZzogU2V0dGluZyk6IFByb21pc2U8dm9pZD4ge1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGlmIChzdG9wcGVkKVxuLy8gICAgICAgcmV0dXJuO1xuXG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDAwMCkpO1xuLy8gICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgbG9nLmVycm9yKGVycik7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrQW5kRG93bmxvYWQoY2hlY2tzdW1PYmo6IENoZWNrc3VtLCBpbWFwOiBJbWFwTWFuYWdlcikge1xuICBsZXQgdG9VcGRhdGVBcHBzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbnMpIHtcbiAgICBsZXQgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zO1xuICAgIGlmIChjdXJyVmVyc2lvbnMgPT0gbnVsbCkge1xuICAgICAgY3VyclZlcnNpb25zID0gY3VycmVudENoZWNrc3VtLnZlcnNpb25zID0ge307XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldFZlcnNpb25zID0gY2hlY2tzdW1PYmoudmVyc2lvbnM7XG4gICAgZm9yIChjb25zdCBhcHBOYW1lIG9mIE9iamVjdC5rZXlzKHRhcmdldFZlcnNpb25zKSkge1xuICAgICAgaWYgKGN1cnJWZXJzaW9uc1thcHBOYW1lXSA9PSBudWxsIHx8XG4gICAgICAgICggdGFyZ2V0VmVyc2lvbnNbYXBwTmFtZV0gJiZcbiAgICAgICAgICBjdXJyVmVyc2lvbnNbYXBwTmFtZV0udmVyc2lvbiA8IHRhcmdldFZlcnNpb25zW2FwcE5hbWVdLnZlcnNpb24pXG4gICAgICApIHtcbiAgICAgICAgbG9nLmluZm8oYEZpbmQgdXBkYXRlZCB2ZXJzaW9uIG9mICR7YXBwTmFtZX1gKTtcbiAgICAgICAgdG9VcGRhdGVBcHBzLnB1c2goYXBwTmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHRvVXBkYXRlQXBwcy5sZW5ndGggPiAwKSB7XG4gICAgaW1hcC5mZXRjaEFwcER1cmluZ1dhdGNoQWN0aW9uKC4uLnRvVXBkYXRlQXBwcyk7XG4gICAgbG9nLmluZm8oJ3dhaXRpbmcgZm9yIHppcCBmaWxlIHdyaXR0ZW4nKTtcbiAgICBhd2FpdCBpbWFwLmZpbGVXcml0aW5nU3RhdGUucGlwZShcbiAgICAgIHNraXAoMSksXG4gICAgICBmaWx0ZXIod3JpdGluZyA9PiAhd3JpdGluZyksXG4gICAgICB0YWtlKHRvVXBkYXRlQXBwcy5sZW5ndGgpXG4gICAgICApLnRvUHJvbWlzZSgpO1xuICAgIGxvZy5pbmZvKCd3YWl0aW5nIGZvciB6aXAgZmlsZSB3cml0dGVuIC0gZG9uZScpO1xuICAgIGF3YWl0IHJldHJ5KDIsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4gICAgdG9VcGRhdGVBcHBzLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMhW25hbWVdID0gY2hlY2tzdW1PYmoudmVyc2lvbnMhW25hbWVdO1xuICAgIH0pO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHJ1bihzZXR0aW5nOiBTZXR0aW5nKSB7XG4vLyAgIGxldCBjaGVja3N1bU9iajogQ2hlY2tzdW07XG4vLyAgIHRyeSB7XG4vLyAgICAgY2hlY2tzdW1PYmogPSBhd2FpdCByZXRyeShzZXR0aW5nLmZldGNoUmV0cnksIGZldGNoLCBzZXR0aW5nLmZldGNoVXJsKTtcbi8vICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgaWYgKGVyckNvdW50KysgJSBzZXR0aW5nLmZldGNoTG9nRXJyUGVyVGltZXMgPT09IDApIHtcbi8vICAgICAgIHRocm93IGVycjtcbi8vICAgICB9XG4vLyAgICAgcmV0dXJuO1xuLy8gICB9XG4vLyAgIGlmIChjaGVja3N1bU9iaiA9PSBudWxsKVxuLy8gICAgIHJldHVybjtcblxuLy8gICBpZiAoY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmwpIHtcbi8vICAgICBzZXR0aW5nLmZldGNoVXJsID0gY2hlY2tzdW1PYmouY2hhbmdlRmV0Y2hVcmw7XG4vLyAgICAgbG9nLmluZm8oJ0NoYW5nZSBmZXRjaCBVUkwgdG8nLCBzZXR0aW5nLmZldGNoVXJsKTtcbi8vICAgfVxuLy8gICBsZXQgZG93bmxvYWRzOiBzdHJpbmdbXSA9IFtdO1xuLy8gICAvLyBpZiAoY2hlY2tzdW1PYmoudmVyc2lvbiAhPSBudWxsICYmIGN1cnJlbnRDaGVja3N1bS52ZXJzaW9uICE9PSBjaGVja3N1bU9iai52ZXJzaW9uICYmIGNoZWNrc3VtT2JqLnBhdGgpIHtcbi8vICAgLy8gICBjb25zdCBmaWxlID0gYXdhaXQgZG93bmxvYWRaaXAoY2hlY2tzdW1PYmoucGF0aCk7XG4vLyAgIC8vICAgZG93bmxvYWRzLnB1c2goZmlsZSk7XG4vLyAgIC8vICAgY3VycmVudENoZWNrc3VtLnZlcnNpb24gPSBjaGVja3N1bU9iai52ZXJzaW9uO1xuLy8gICAvLyB9XG4vLyAgIGlmIChjaGVja3N1bU9iai52ZXJzaW9ucykge1xuLy8gICAgIGxldCBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnM7XG4vLyAgICAgaWYgKGN1cnJWZXJzaW9ucyA9PSBudWxsKSB7XG4vLyAgICAgICBjdXJyVmVyc2lvbnMgPSBjdXJyZW50Q2hlY2tzdW0udmVyc2lvbnMgPSB7fTtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgdGFyZ2V0VmVyc2lvbnMgPSBjaGVja3N1bU9iai52ZXJzaW9ucztcbi8vICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0YXJnZXRWZXJzaW9ucykpIHtcbi8vICAgICAgIGlmICghXy5oYXModGFyZ2V0VmVyc2lvbnMsIGtleSkgfHwgXy5nZXQoY3VyclZlcnNpb25zLCBba2V5LCAndmVyc2lvbiddKSAhPT1cbi8vICAgICAgICAgXy5nZXQodGFyZ2V0VmVyc2lvbnMsIFtrZXksICd2ZXJzaW9uJ10pKSB7XG4vLyAgICAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGRvd25sb2FkWmlwKHRhcmdldFZlcnNpb25zW2tleV0ucGF0aCk7XG4vLyAgICAgICAgICAgY3VyclZlcnNpb25zW2tleV0gPSB0YXJnZXRWZXJzaW9uc1trZXldO1xuLy8gICAgICAgICAgIGRvd25sb2Fkcy5wdXNoKGZpbGUpO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgaWYgKGRvd25sb2Fkcy5sZW5ndGggPiAwKSB7XG4vLyAgICAgZnMud3JpdGVGaWxlU3luYyhjdXJyQ2hlY2tzdW1GaWxlLCBKU09OLnN0cmluZ2lmeShjdXJyZW50Q2hlY2tzdW0sIG51bGwsICcgICcpLCAndXRmOCcpO1xuLy8gICAgIC8vIGRvd25sb2Fkcy5mb3JFYWNoKGZpbGUgPT4gdXBkYXRlU2VydmVyU3RhdGljKGZpbGUsIHN6aXApKTtcbi8vICAgICBpZiAoc2V0dGluZy5kb3dubG9hZE1vZGUgPT09ICdmb3JrJykge1xuLy8gICAgICAgYXdhaXQgcmV0cnkoMjAsIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCk7XG4vLyAgICAgfVxuLy8gICAgIGFwaS5ldmVudEJ1cy5lbWl0KGFwaS5wYWNrYWdlTmFtZSArICcuZG93bmxvYWRlZCcpO1xuLy8gICB9XG4vLyB9XG5cbi8vIGxldCBkb3dubG9hZENvdW50ID0gMDtcblxuLy8gYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRaaXAocGF0aDogc3RyaW5nKSB7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuLy8gXHQvLyBsb2cuaW5mbyhgJHtvcy5ob3N0bmFtZSgpfSAke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9IGRvd25sb2FkIHppcFtGcmVlIG1lbV06ICR7TWF0aC5yb3VuZChvcy5mcmVlbWVtKCkgLyAxMDQ4NTc2KX1NLCBbdG90YWwgbWVtXTogJHtNYXRoLnJvdW5kKG9zLnRvdGFsbWVtKCkgLyAxMDQ4NTc2KX1NYCk7XG4vLyAgIGNvbnN0IHJlc291cmNlID0gVXJsLnJlc29sdmUoIHNldHRpbmcuZmV0Y2hVcmwsIHBhdGggKyAnPycgKyBNYXRoLnJhbmRvbSgpKTtcbi8vICAgLy8gY29uc3QgZG93bmxvYWRUbyA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsIGByZW1vdGUtJHtNYXRoLnJhbmRvbSgpfS0ke3BhdGguc3BsaXQoJy8nKS5wb3AoKX1gKTtcbi8vICAgY29uc3QgbmV3TmFtZSA9IHBhdGgucmVwbGFjZSgvW1xcXFwvXS9nLCAnXycpO1xuLy8gICBjb25zdCBkb3dubG9hZFRvID0gUGF0aC5yZXNvbHZlKHppcERvd25sb2FkRGlyLCBuZXdOYW1lKTtcbi8vICAgbG9nLmluZm8oJ2ZldGNoJywgcmVzb3VyY2UpO1xuLy8gICBhd2FpdCByZXRyeTxzdHJpbmc+KHNldHRpbmcuZmV0Y2hSZXRyeSwgZm9ya0Rvd25sb2FkemlwLCByZXNvdXJjZSwgZG93bmxvYWRUbyk7XG4vLyAgIHJldHVybiBkb3dubG9hZFRvO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmZXRjaChmZXRjaFVybDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbi8vICAgY29uc3QgY2hlY2tVcmwgPSBmZXRjaFVybCArICc/JyArIE1hdGgucmFuZG9tKCk7XG4vLyAgIGxvZy5kZWJ1ZygnY2hlY2snLCBjaGVja1VybCk7XG4vLyAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqKSA9PiB7XG4vLyAgICAgcmVxdWVzdC5nZXQoY2hlY2tVcmwsXG4vLyAgICAgICB7aGVhZGVyczoge1JlZmVyZXI6IFVybC5yZXNvbHZlKGNoZWNrVXJsLCAnLycpfX0sIChlcnJvcjogYW55LCByZXNwb25zZTogcmVxdWVzdC5SZXNwb25zZSwgYm9keTogYW55KSA9PiB7XG4vLyAgICAgICBpZiAoZXJyb3IpIHtcbi8vICAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoZXJyb3IpKTtcbi8vICAgICAgIH1cbi8vICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1c0NvZGUgPiAzMDIpIHtcbi8vICAgICAgICAgcmV0dXJuIHJlaihuZXcgRXJyb3IoYHN0YXR1cyBjb2RlICR7cmVzcG9uc2Uuc3RhdHVzQ29kZX1cXG5yZXNwb25zZTpcXG4ke3Jlc3BvbnNlfVxcbmJvZHk6XFxuJHtib2R5fWApKTtcbi8vICAgICAgIH1cbi8vICAgICAgIHRyeSB7XG4vLyAgICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpXG4vLyAgICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4vLyAgICAgICB9IGNhdGNoIChleCkge1xuLy8gICAgICAgICByZWooZXgpO1xuLy8gICAgICAgfVxuLy8gICAgICAgcmVzb2x2ZShib2R5KTtcbi8vICAgICB9KTtcbi8vICAgfSk7XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIHJldHJ5PFQ+KHRpbWVzOiBudW1iZXIsIGZ1bmM6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxUPiwgLi4uYXJnczogYW55W10pOiBQcm9taXNlPFQ+IHtcbiAgZm9yIChsZXQgY250ID0gMDs7KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBmdW5jKC4uLmFyZ3MpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY250Kys7XG4gICAgICBpZiAoY250ID49IHNldHRpbmcuZmV0Y2hSZXRyeSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgICBsb2cud2FybihlcnIpO1xuICAgICAgbG9nLmluZm8oJ0VuY291bnRlciBlcnJvciwgd2lsbCByZXRyeScpO1xuICAgIH1cbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXMgPT4gc2V0VGltZW91dChyZXMsIGNudCAqIDUwMCkpO1xuICB9XG59XG5cbi8vIGZ1bmN0aW9uIGZvcmtEb3dubG9hZHppcChyZXNvdXJjZTogc3RyaW5nLCB0b0ZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuLy8gICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2Rvd25sb2FkJywgJ25vZGVfbW9kdWxlcy8nICsgYXBpLnBhY2thZ2VOYW1lICsgJy9kaXN0L2Rvd25sb2FkLXppcC1wcm9jZXNzLmpzJywgW1xuLy8gICAgIHJlc291cmNlLCB0b0ZpbGVOYW1lLCBzZXR0aW5nLmZldGNoUmV0cnkgKyAnJ1xuLy8gICBdKTtcbi8vIH1cbmZ1bmN0aW9uIGZvcmtFeHRyYWN0RXhzdGluZ1ppcCgpIHtcbiAgY29uc3QgYXBpOiB0eXBlb2YgX19hcGkgPSByZXF1aXJlKCdfX2FwaScpO1xuICByZXR1cm4gZm9ya1Byb2Nlc3MoJ2V4dHJhY3QnLCAnbm9kZV9tb2R1bGVzLycgKyBhcGkucGFja2FnZU5hbWUgKyAnL2Rpc3QvZXh0cmFjdC16aXAtcHJvY2Vzcy5qcycsIFtcbiAgICB6aXBEb3dubG9hZERpcixcbiAgICBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpXG4gIF0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmb3JrUHJvY2VzcyhuYW1lOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdLCBvblByb2Nlc3M/OiAoY2hpbGQ6IENoaWxkUHJvY2VzcykgPT4gdm9pZCkge1xuICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGV4dHJhY3RpbmdEb25lID0gZmFsc2U7XG4gICAgY29uc3QgY2hpbGQgPSBmb3JrKGZpbGVQYXRoLFxuICAgICAgYXJncywge1xuICAgICAgc2lsZW50OiB0cnVlXG4gICAgfSk7XG4gICAgaWYgKG9uUHJvY2Vzcykge1xuICAgICAgb25Qcm9jZXNzKGNoaWxkKTtcbiAgICB9XG4gICAgY2hpbGQub24oJ21lc3NhZ2UnLCBtc2cgPT4ge1xuICAgICAgaWYgKG1zZy5sb2cpIHtcbiAgICAgICAgbG9nLmluZm8oJ1tjaGlsZCBwcm9jZXNzXSAlcyAtICVzJywgbmFtZSwgbXNnLmxvZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAobXNnLmRvbmUpIHtcbiAgICAgICAgZXh0cmFjdGluZ0RvbmUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChtc2cuZXJyb3IpIHtcbiAgICAgICAgbG9nLmVycm9yKG1zZy5lcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY2hpbGQub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmVqZWN0KG91dHB1dCk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICBsb2cuaW5mbygncHJvY2VzcyBbcGlkOiVzXSAlcyAtIGV4aXQgd2l0aDogJWQgLSAlcycsIGNoaWxkLnBpZCwgbmFtZSwgY29kZSwgc2lnbmFsKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIGlmIChleHRyYWN0aW5nRG9uZSkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKG91dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgbG9nLmVycm9yKGBwcm9jZXNzIFtwaWQ6JHtjaGlsZC5waWR9XSAke25hbWV9IGV4aXQgd2l0aCBlcnJvciBjb2RlICVkIC0gXCIlc1wiYCwgSlNPTi5zdHJpbmdpZnkoY29kZSksIHNpZ25hbCk7XG4gICAgICAgIGlmIChvdXRwdXQpXG4gICAgICAgICAgbG9nLmVycm9yKGBbY2hpbGQgcHJvY2Vzc11bcGlkOiR7Y2hpbGQucGlkfV0ke25hbWV9IC0gYCwgb3V0cHV0KTtcbiAgICAgICAgcmVqZWN0KG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhgcHJvY2VzcyBbcGlkOiR7Y2hpbGQucGlkfV0gJHtuYW1lfSBkb25lIHN1Y2Nlc3NmdWxseTpgLCBvdXRwdXQpO1xuICAgICAgICByZXNvbHZlKG91dHB1dCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGV0IG91dHB1dCA9ICcnO1xuICAgIGNoaWxkLnN0ZG91dC5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICBjaGlsZC5zdGRvdXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICB9KTtcbiAgICBjaGlsZC5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgY2hpbGQuc3RkZXJyLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgfSk7XG4gIH0pO1xufVxuIl19
