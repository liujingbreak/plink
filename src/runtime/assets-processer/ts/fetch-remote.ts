// import api from '__api';
// import request from 'request';
// import * as Url from 'url';
import * as _ from 'lodash';
import os from 'os';
import Path from 'path';
import fs from 'fs-extra';
import cluster from 'cluster';
import {filter, switchMap /*skip, take*/} from 'rxjs/operators';
import {fork, ChildProcess} from 'child_process';
import {Checksum, WithMailServerConfig as Setting} from './fetch-types';
import {ImapManager} from './fetch-remote-imap';
import api from '__api';
const log = require('log4js').getLogger('@wfh/assets-processer.fetch-remote');

const {/*pm2InstanceId, isPm2,*/ isMainProcess} = getPm2Info();

// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum: Checksum = [];

const setting = (api.config.get(api.packageName) as Setting);
const env = setting.fetchMailServer ? setting.fetchMailServer.env : 'local';
// let timer: NodeJS.Timer;
// let stopped = false;
// let errCount = 0;
const currChecksumFile = api.config.resolve('rootPath', `checksum.${env}.json`);

export const zipDownloadDir = Path.resolve(Path.dirname(currChecksumFile), 'deploy-static-' + env);
// let watcher: any;
let imap: ImapManager;

export async function start(imap: ImapManager) {
  // tslint:disable-next-line
	log.info(`[memory status] total ${Math.floor(os.totalmem() / 1048576)}Mb, free ${Math.floor(os.freemem() / 1048576)}Mb\n` +
    `[num of CPU] ${os.cpus().length}`);

  if (!setting.fetchMailServer) {
    log.info('No fetchUrl configured, skip fetching resource.');
    return;
  }

  if (setting.downloadMode !== 'memory'  && !isMainProcess) {
    // non inMemory mode means extracting zip file to local directory dist/static,
    // in case of cluster mode, we only want single process do zip extracting and file writing task to avoid conflict.
    log.info('This process is not main process');
    return;
  }
  if (!fs.existsSync(zipDownloadDir))
    fs.mkdirpSync(zipDownloadDir);

  const installDir = api.config.resolve('rootPath', 'install-' + setting.fetchMailServer.env);
  if (fs.existsSync(installDir)) {
    fs.mkdirpSync(api.config.resolve('staticDir'));
    const fileNames = fs.readdirSync(installDir).filter(name => Path.extname(name) === '.zip');
    if (fileNames.length > 0) {
      await retry(2, () => forkExtractExstingZip(installDir, api.config.resolve('staticDir'), true));
    }
  }

  const serverContentDir = api.config.resolve('rootPath', 'server-content-' + setting.fetchMailServer.env);
  if (fs.existsSync(serverContentDir)) {
    const zipDir = api.config.resolve('destDir', 'server');
    fs.mkdirpSync(zipDir);
    const fileNames = fs.readdirSync(serverContentDir).filter(name => Path.extname(name) === '.zip');
    if (fileNames.length > 0) {
      await retry(2, () => forkExtractExstingZip(serverContentDir, zipDir, true));
    }
  }

  if (setting.fetchRetry == null)
    setting.fetchRetry = 3;

  if (fs.existsSync(currChecksumFile)) {
    currentChecksum = Object.assign(currentChecksum, fs.readJSONSync(currChecksumFile));
    log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
  }
  log.info('start poll mail');

  imap.checksumState.pipe(
    filter(cs => cs != null),
    switchMap(cs => checkAndDownload(cs!, imap))
  ).subscribe();

  // await imap.checkMailForUpdate();

  // await imap.startWatchMail(setting.fetchIntervalSec * 1000);
}

/**
 * It seems ok to quit process without calling this function
 */
export function stop() {
  if (imap)
    imap.stopWatch();
  // stopped = true;
  // if (watcher)
  //   watcher.close();
  // if (timer) {
  //   clearTimeout(timer);
  // }
}

export function getPm2Info() {
  const pm2InstanceId = process.env.NODE_APP_INSTANCE;
  const isPm2 = cluster.isWorker && pm2InstanceId != null;
  const isMainProcess = !isPm2 || pm2InstanceId === '0';
  return {
    isPm2,
    pm2InstanceId,
    isMainProcess
  };
}

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

async function checkAndDownload(checksumObj: Checksum, imap: ImapManager) {
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

export async function retry<T>(times: number, func: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
  for (let cnt = 0;;) {
    try {
      return await func(...args);
    } catch (err) {
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

// function forkDownloadzip(resource: string, toFileName: string): Promise<string> {
//   return forkProcess('download', 'node_modules/' + api.packageName + '/dist/download-zip-process.js', [
//     resource, toFileName, setting.fetchRetry + ''
//   ]);
// }
export function forkExtractExstingZip(zipDir?: string, outputDir?: string, doNotDelete = false) {
  return forkProcess('extract', Path.resolve(__dirname, 'extract-zip-process.js'), [
    zipDir ? zipDir : zipDownloadDir,
    outputDir != null ? outputDir : api.config.resolve('staticDir'),
    doNotDelete ? 'keep' : 'delete'
  ]);
}

async function forkProcess(name: string, filePath: string, args: string[], onProcess?: (child: ChildProcess) => void) {
  return new Promise<string>((resolve, reject) => {
    let extractingDone = false;
    const env = Object.assign({}, process.env);
    if (env.NODE_OPTIONS && env.NODE_OPTIONS.indexOf('--inspect') >= 0) {
      delete env.NODE_OPTIONS;
    }
    const child = fork(filePath,
      args, {
      silent: true,
      env
    });
    if (onProcess) {
      onProcess(child);
    }
    child.on('message', (msg: any) => {
      if (msg.log) {
        log.info('[child process] %s - %s', name, msg.log);
        return;
      } else if (msg.done) {
        extractingDone = true;
      } else if (msg.error) {
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
      } else {
        log.info(`process [pid:${child.pid}] ${name} done successfully:`, output);
        resolve(output);
      }
    });
    let output = '';
    child.stdout!.setEncoding('utf-8');
    child.stdout!.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr!.setEncoding('utf-8');
    child.stderr!.on('data', (chunk) => {
      output += chunk;
    });
  });
}
