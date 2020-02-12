// tslint:disable: no-console
import fs from 'fs-extra';
import _gulp from 'gulp';
import { basename, dirname, resolve } from 'path';
import { defer, from, timer } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import api from '__api';
import { ImapManager } from './fetch-remote-imap';
import {Checksum} from './fetch-types';
import Path from 'path';
import crypto from 'crypto';
const log = require('log4js').getLogger(api.packageName + '.remote-deploy');
// process.on('uncaughtException', err => {
//   // tslint:disable-next-line: no-console
//   console.error('uncaughtException', err);
//   process.exit(1);
// });

// process.on('unhandledRejection', err => {
//   // tslint:disable-next-line: no-console
//   console.error('unhandledRejection', err);
//   process.exit(1);
// });

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
    // tslint:disable-next-line: no-console
    console.log('missing command arguments,', api.argv);
    process.exit(1);
    return;
  }
  const installDir = resolve('install-' + env);

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
export async function checkZipFile(zipFileOrDir: string, installDir: string, appName: string) {

  zipFileOrDir = zipFileOrDir ? resolve(zipFileOrDir) : resolve(installDir, `${appName}.zip`);

  if (!fs.existsSync(zipFileOrDir)) {
    console.error('\n%s not exist, quit!', zipFileOrDir);
    throw new Error(`${zipFileOrDir} not exist`);
  }
  if (fs.statSync(zipFileOrDir).isDirectory()) {
    const destZip = resolve(installDir, `${appName}.zip`);
    console.log(`${zipFileOrDir} is a directory, zipping into ${destZip}`);
    const gulp: typeof _gulp = require('gulp');
    const through2 = require('through2');
    const zip = require('gulp-zip');

    await new Promise((resolve, reject) => {
      gulp.src(zipFileOrDir + '/**/*')
      .pipe<NodeJS.ReadWriteStream>(
        through2.obj(function(file: any, encoding: string, cb: (...args: any[]) => void) {
          console.log('- zip content:', file.path);
          cb(null, file);
      }, function flush(callback: () => void) {
        callback();
      }))
      .pipe<NodeJS.ReadWriteStream>(zip(basename(destZip)))
      .pipe(gulp.dest(dirname(destZip)))
      .on('end', () => resolve())
      .on('error', err => reject(err));
    });
    console.log('zipped');
    zipFileOrDir = destZip;
  }
  return zipFileOrDir;
}

/**
 * drcp run assets-processer/ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
 */
export async function fetchAllZips() {
  const env = api.argv.env;
  if (env == null) {
    throw new Error('Missing arguments "--env <environment>"');
  }
  const installDir = resolve('install-' + env);

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
    rootDir = Path.resolve();
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
    console.log(`checksum.${env}.json:\n`, checksumText);
    fs.writeFileSync(Path.resolve(rootDir, `checksum.${env}.json`), checksumText);
  }
}
