// tslint:disable: no-console
import fs from 'fs-extra';
import _gulp from 'gulp';
import { basename, dirname, resolve } from 'path';
import { defer, from, timer } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import api from '__api';
import { ImapManager } from './fetch-remote-imap';
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
  let {env, src, buildStaticOnly} = api.argv;
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
    const zipFile = await checkZipFile(src, installDir, appName);
    await imap.sendFileAndUpdatedChecksum(appName, zipFile);
  } else {
    await imap.fetchChecksum();
  }

  if (buildStaticOnly === 'false') {
    await imap.fetchOtherZips(appName);
  }
}

async function checkZipFile(zipFileOrDir: string, installDir: string, appName: string) {

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
 * drcp run ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
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
