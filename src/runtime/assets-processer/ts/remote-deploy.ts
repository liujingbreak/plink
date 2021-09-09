/* eslint-disable no-console */
import fs from 'fs-extra';
import {ZipFile} from 'yazl';
import glob from 'glob';
import { resolve } from 'path';
import { defer, from, timer } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import api from '__api';
import { ImapManager } from './fetch-remote-imap';
import {Checksum} from './fetch-types';
import Path from 'path';
import crypto from 'crypto';
import {getRootDir} from '@wfh/plink/wfh/dist';

const log = require('log4js').getLogger(api.packageName + '.remote-deploy');

export function main() {
    defer(() => from(mailDeployStaticRes())).pipe(
    catchError(err => {
      log.warn(err);
      return timer(1000).pipe(map(() => {
        throw err;
      }));
    }),
    retry(3)
    ).subscribe();
}

async function mailDeployStaticRes() {
  console.log('Remote deploy (mail)...');
  let {env, src} = api.argv;
  let appName: string | undefined;
  if (api.argv.appName) {
    appName = api.argv.appName;
  }

  if (env == null) {
    // eslint-disable-next-line no-console
    console.log('missing command arguments,', api.argv);
    process.exit(1);
    return;
  }
  const installDir = resolve(getRootDir(), 'install-' + env);

  if (!fs.existsSync(installDir))
    fs.mkdirpSync(installDir);
  const imap = new ImapManager(env, installDir);

  if (appName) {
    await checkZipFile(src, installDir, appName);
    await imap.fetchUpdateCheckSum(appName);
  } else {
    await imap.fetchChecksum();
  }
}

/**
 * Pack directory into zip file
 * @param zipFileOrDir 
 * @param installDir 
 * @param appName 
 */
export async function checkZipFile(zipFileOrDir: string, installDir: string, appName: string, excludePat?: RegExp | string) {

  zipFileOrDir = zipFileOrDir ? resolve(zipFileOrDir) : resolve(installDir, `${appName}.zip`);

  if (!fs.existsSync(zipFileOrDir)) {
    console.error('\n%s not exist, quit!', zipFileOrDir);
    throw new Error(`${zipFileOrDir} not exist`);
  }
  if (fs.statSync(zipFileOrDir).isDirectory()) {
    const destZip = resolve(installDir, `${appName}.zip`);
    await zipDir(zipFileOrDir, destZip, excludePat);

    log.info(destZip + ' is zipped: ' + fs.existsSync(destZip));
    zipFileOrDir = destZip;
  }
  return zipFileOrDir;
}

export async function zipDir(srcDir: string, destZip: string, excludePat?: RegExp | string) {
  fs.mkdirpSync(Path.dirname(destZip));
  log.info(`${srcDir} is a directory, zipping into ${destZip}`);

  const zipFile = new ZipFile();
  const zipDone = new Promise(resolve => {
    zipFile.outputStream.pipe(fs.createWriteStream(destZip))
    .on('close', resolve);
  });

  if (excludePat && typeof excludePat === 'string') {
    excludePat = new RegExp(excludePat);
  }

  glob(srcDir.replace(/[\\/]/, '/') + '/**/*', {nodir: true}, (err, matches) => {
    for (let item of matches) {
      // item = item.replace(/[/\\]/, '/');
      if (excludePat == null || !(excludePat as RegExp).test(item)) {
        log.info(`- zip content: ${item}`);
        zipFile.addFile(item, Path.relative(srcDir, item).replace(/[\\/]/, '/'));
      }
    }
    zipFile.end({forceZip64Format: false});
  });

  await zipDone;
}

/**
 * drcp run assets-processer/ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
 */
export async function fetchAllZips() {
  const env = api.argv.env;
  if (env == null) {
    throw new Error('Missing arguments "--env <environment>"');
  }
  const installDir = resolve(getRootDir(), 'install-' + env);

  if (!fs.existsSync(installDir))
    fs.mkdirpSync(installDir);
  const imap = new ImapManager(env, installDir);
  await imap.fetchChecksum();
  await imap.fetchOtherZips('');
}

type ChecksumItem = Checksum extends Array<infer I> ? I : unknown;
/**
 * Call this file to generate checksum files in build process
 */
export async function digestInstallingFiles(rootDir?: string) {
  if (rootDir == null) {
    rootDir = getRootDir();
  }
  const list = fs.readdirSync(rootDir);
  for (const name of list) {
    const match = /^install-([^]+)$/.exec(name);
    if (match == null || !fs.statSync(Path.resolve(rootDir, name)).isDirectory())
      continue;
    const env = match[1];
    const files = fs.readdirSync(Path.resolve(rootDir, name));

    const checksumDones: Promise<ChecksumItem>[] = [];

    for (const file of files) {
      if (!file.endsWith('.zip'))
        continue;
      const hash = crypto.createHash('sha256');
      const zip = Path.resolve(rootDir, name, file);
      const input = fs.createReadStream(zip);
      const done = new Promise<ChecksumItem>(resolve => {
        const stream = input.pipe(hash);
        stream.on('readable', () => {
          const buf = stream.read() as Buffer;
          if (buf) {
            const now = new Date();
            resolve({
              sha256: buf.toString('hex'),
              file: (name + '/' + file).replace(/\\/g, '/'),
              created: now.toLocaleString(),
              createdTime: now.getTime()
            });
            stream.resume();
          }
        });
      });
      checksumDones.push(done);
    }

    const checksum = await Promise.all(checksumDones);
    const checksumText = JSON.stringify(checksum, null, '  ');
    // console.log(`checksum.${env}.json:\n`, checksumText);
    fs.writeFileSync(Path.resolve(rootDir, `checksum.${env}.json`), checksumText);
  }
}
