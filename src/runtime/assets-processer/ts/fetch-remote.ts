import api from '__api';
import request from 'request';
import * as Url from 'url';
import * as _ from 'lodash';
import os from 'os';
import Path from 'path';
// import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import cluster from 'cluster';
import {ZipResourceMiddleware} from 'serve-static-zip';
import {fork, ChildProcess} from 'child_process';
// const chokidar = require('chokidar');
const log = require('log4js').getLogger(api.packageName + '.fetch-remote');

const pm2InstanceId = process.env.NODE_APP_INSTANCE;
const isPm2 = cluster.isWorker && pm2InstanceId != null;
const isMainProcess = !isPm2 || pm2InstanceId === '0';

interface OldChecksum {
  version: number;
  path: string;
  changeFetchUrl?: string;
}

interface Checksum extends OldChecksum {
  versions?: {[key: string]: {version: number, path: string}};
}

interface Setting {
  fetchUrl: string;
  fetchRetry: number;
  fetchLogErrPerTimes: number;
  fetchIntervalSec: number;
  downloadMode: 'memory' | 'fork' | null;
}

let setting: Setting;
// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum: Checksum = {
  version: Number.NEGATIVE_INFINITY,
  path: '',
  versions: {}
};

const currChecksumFile = api.config.resolve('destDir', 'assets-processer.checksum.json');
let timer: NodeJS.Timer;
let stopped = false;
let errCount = 0;
let zipDownloadDir: string;
let watcher: any;

export async function start(serveStaticZip: ZipResourceMiddleware) {
  // tslint:disable-next-line
	log.info(`[memory status] total ${Math.floor(os.totalmem() / 1048576)}Mb, free ${Math.floor(os.freemem() / 1048576)}Mb\n` +
    `[num of CPU] ${os.cpus().length}`);

  setting = api.config.get(api.packageName);
  const fetchUrl = setting.fetchUrl;
  if (fetchUrl == null) {
    log.info('No fetchUrl configured, skip fetching resource.');
    return Promise.resolve();
  }

  if (setting.downloadMode !== 'memory'  && !isMainProcess) {
    // non inMemory mode means extracting zip file to local directory dist/static,
    // in case of cluster mode, we only want single process do zip extracting and file writing task to avoid conflict.
    log.info('This process is not main process');
    return;
  }
  zipDownloadDir = api.config.resolve('destDir', 'assets-processer');
  if (!fs.existsSync(zipDownloadDir))
    fs.mkdirpSync(zipDownloadDir);
  const fileNames = fs.readdirSync(zipDownloadDir).filter(name => Path.extname(name) === '.zip');
  if (fileNames.length > 0) {
    await retry(20, forkExtractExstingZip);
  }

  if (setting.fetchRetry == null)
    setting.fetchRetry = 3;
  if (fs.existsSync(currChecksumFile)) {
    currentChecksum = Object.assign(currentChecksum, fs.readJSONSync(currChecksumFile));
    log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
  }
  return runRepeatly(setting, serveStaticZip);
}

/**
 * It seems ok to quit process without calling this function
 */
export function stop() {
  stopped = true;
  if (watcher)
    watcher.close();
  if (timer) {
    clearTimeout(timer);
  }
}

// function updateServerStatic(path: string, serveStaticZip: ZipResourceMiddleware) {
// 	log.info('read %s', path);
// 	try {
// 		serveStaticZip.updateZip(fs.readFileSync(Path.resolve(zipDownloadDir, path)));
// 	} catch (e) {
// 		log.warn('Failed to update from ' + path, e);
// 	}
// }

function runRepeatly(setting: Setting, szip: ZipResourceMiddleware): Promise<void> {
  if (stopped)
    return Promise.resolve();
  return run(setting, szip)
  .catch(error => log.error(error))
  .then(() => {
    if (stopped)
      return;
    timer = setTimeout(() => {
      runRepeatly(setting, szip);
    }, setting.fetchIntervalSec * 1000);
  });
}
async function run(setting: Setting, szip: ZipResourceMiddleware) {
  let checksumObj: Checksum;
  try {
    checksumObj = await retry(setting.fetchRetry, fetch, setting.fetchUrl);
  } catch (err) {
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
  let downloads: string[] = [];
  if (checksumObj.version != null && currentChecksum.version !== checksumObj.version) {
    const file = await downloadZip(checksumObj.path, szip);
    downloads.push(file);
    currentChecksum.version = checksumObj.version;
  }
  if (checksumObj.versions) {
    let currVersions = currentChecksum.versions;
    if (currVersions == null) {
      currVersions = currentChecksum.versions = {};
    }
    const targetVersions = checksumObj.versions;
    for (const key of Object.keys(checksumObj.versions)) {
      if (!_.has(targetVersions, key) || _.get(currVersions, [key, 'version']) !==
        _.get(targetVersions, [key, 'version'])) {
          const file = await downloadZip(targetVersions[key].path, szip);
          currVersions[key] = targetVersions[key];
          downloads.push(file);
        }
    }
  }

  if (downloads.length > 0) {
    fs.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, '  '), 'utf8');
    // downloads.forEach(file => updateServerStatic(file, szip));
    if (setting.downloadMode === 'fork') {
      await retry(20, forkExtractExstingZip);
    }
    api.eventBus.emit(api.packageName + '.downloaded');
  }
}

// let downloadCount = 0;

async function downloadZip(path: string, szip: ZipResourceMiddleware) {
  // tslint:disable-next-line
	// log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
  const resource = Url.resolve( setting.fetchUrl, path + '?' + Math.random());
  // const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
  const newName = path.replace(/[\\/]/g, '_');
  const downloadTo = Path.resolve(zipDownloadDir, newName);
  log.info('fetch', resource);
  await retry<string>(setting.fetchRetry, forkDownloadzip, resource, downloadTo);
  return downloadTo;
}

function fetch(fetchUrl: string): Promise<any> {
  const checkUrl = fetchUrl + '?' + Math.random();
  log.debug('check', checkUrl);
  return new Promise((resolve, rej) => {
    request.get(checkUrl,
      {headers: {Referer: Url.resolve(checkUrl, '/')}}, (error: any, response: request.Response, body: any) => {
      if (error) {
        return rej(new Error(error));
      }
      if (response.statusCode < 200 || response.statusCode > 302) {
        return rej(new Error(`status code ${response.statusCode}\nresponse:\n${response}\nbody:\n${body}`));
      }
      try {
        if (typeof body === 'string')
          body = JSON.parse(body);
      } catch (ex) {
        rej(ex);
      }
      resolve(body);
    });
  });
}

async function retry<T>(times: number, func: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
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

function forkDownloadzip(resource: string, toFileName: string): Promise<string> {
  return forkProcess('download', 'node_modules/' + api.packageName + '/dist/download-zip-process.js', [
    resource, toFileName, setting.fetchRetry + ''
  ]);
}
function forkExtractExstingZip() {
  return forkProcess('extract', 'node_modules/' + api.packageName + '/dist/extract-zip-process.js', [
    zipDownloadDir,
    api.config.resolve('staticDir')
  ]);
}

async function forkProcess(name: string, filePath: string, args: string[], onProcess?: (child: ChildProcess) => void) {
  return new Promise<string>((resolve, reject) => {
    let extractingDone = false;
    const child = fork(filePath,
      args, {
      silent: true
    });
    if (onProcess) {
      onProcess(child);
    }
    child.on('message', msg => {
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
