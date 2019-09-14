// tslint:disable: no-console
import { ImapManager } from './fetch-remote-imap';
import fs from 'fs-extra';
import _gulp from 'gulp';
import { basename, dirname, resolve } from 'path';
import { timer, defer, from } from 'rxjs';
import { catchError, map, retry, skip, take, filter } from 'rxjs/operators';
import api from '__api';
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
  let {env, configName, zipFile, buildStaticOnly} = api.argv;

  if (env == null || configName == null) {
    // tslint:disable-next-line: no-console
    console.log('missing command arguments,', api.argv);
    process.exit(1);
    return;
  }

  zipFile = await checkZipFile(zipFile);

  const imap = new ImapManager(env);
  await imap.sendFileAndUpdatedChecksum(configName, zipFile);

  if (buildStaticOnly === 'false') {
    await imap.fetchOtherZips(configName);
  }
}

async function checkZipFile(zipFile: string) {
  const defaultZip = resolve(__dirname, '../webui-static.zip');

  zipFile = zipFile ? resolve(zipFile) : resolve(__dirname, '../webui-static.zip');

  if (!fs.existsSync(zipFile)) {
    console.error('\n%s not exist, quit!', zipFile);
    throw new Error(`${zipFile} not exist`);
  }
  if (fs.statSync(zipFile).isDirectory()) {
    console.log(`${zipFile} is a directory, zipping into ${defaultZip}`);
    const gulp: typeof _gulp = require('gulp');
    const through2 = require('through2');
    const zip = require('gulp-zip');

    await new Promise((resolve, reject) => {
      gulp.src(zipFile + '/**/*')
      .pipe<NodeJS.ReadWriteStream>(
        through2.obj(function(file: any, encoding: string, cb: (...args: any[]) => void) {
          console.log('- zip content:', file.path);
          cb(null, file);
      }, function flush(callback: () => void) {
        callback();
      }))
      .pipe<NodeJS.ReadWriteStream>(zip(basename(defaultZip)))
      .pipe(gulp.dest(dirname(defaultZip)))
      .on('end', () => resolve())
      .on('error', err => reject(err));
    });
    console.log('zipped');
    zipFile = defaultZip;
  }
  return zipFile;
}
