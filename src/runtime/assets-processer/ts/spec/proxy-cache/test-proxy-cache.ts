import {spawn} from 'child_process';
import os from 'os';
import Path from 'path';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import fs from 'fs-extra';
import {config, runServer} from '@wfh/plink';
const isWin = os.platform() === 'win32';

async function runNpmInstall(clean: boolean) {
  if (clean) {
    const serverCache = Path.resolve(config().destDir, 'npm-server-cache');
    if (fs.existsSync(serverCache))
      await fs.remove(serverCache);
  }

  config.change(setting => {
    setting['@wfh/assets-processer'].npmRegistryCacheServer = {
      path: '/npm',
      cacheDir: setting.destDir + '/npm-server-cache',
      // registry: 'https://registry.npm.taobao.org/'
      registry: 'https://registry.npmjs.org/'
    };
  });

  const {started, shutdown} = runServer();
  await started;
  await rx.of('node_modules', 'package-lock.json', 'npm-cache').pipe(
    op.mergeMap(dir => {
      const target = Path.resolve(__dirname, dir);
      if (fs.existsSync(target)) {
        return fs.remove(target);
      }
      return rx.EMPTY;
    })
  ).toPromise();

  const cp = spawn(isWin ? 'npm.cmd' : 'npm', ['install', '--ddd'], {
    cwd: __dirname, stdio: 'inherit',
    timeout: 65000
  });

  const error$ = rx.fromEventPattern<Error>(
    h => cp.on('error', h), h => cp.off('error', h)
  ).pipe(
    op.switchMap(err => rx.throwError(err))
  );

  const exit$ = rx.fromEventPattern(h => cp.on('exit', h), h => cp.off('exit', h));

  return rx.merge(error$, exit$, rx.timer(3 * 60000)).pipe(
    op.take(1),
    op.catchError(err => {
      // eslint-disable-next-line no-console
      console.log('test npm install failed:', err);
      return rx.of(1);
    }),
    op.concatMap(async () => {
      // eslint-disable-next-line no-console
      console.log('kill: ', cp.kill('SIGINT'));
      await shutdown();
      // eslint-disable-next-line no-console
      console.log('------- shutdown http server done ---------');
    }),
    op.tap(() => process.exit(0))
  ).toPromise();

}

export async function npmInstall() {
  await rx.of('node_modules', 'package-lock.json', 'npm-cache').pipe(
    op.mergeMap(dir => {
      const target = Path.resolve(__dirname, dir);
      if (fs.existsSync(target)) {
        return fs.remove(target);
      }
      return rx.EMPTY;
    })
  ).toPromise();

  const cp = spawn(isWin ? 'npm.cmd' : 'npm', ['install', '--ddd'], {
    cwd: __dirname, stdio: 'inherit',
    timeout: 65000
  });

  const error$ = rx.fromEventPattern<Error>(
    h => cp.on('error', h), h => cp.off('error', h)
  ).pipe(
    op.switchMap(err => rx.throwError(err))
  );

  const exit$ = rx.fromEventPattern(h => cp.on('exit', h), h => cp.off('exit', h));

  return rx.merge(error$, exit$, rx.timer(3 * 60000)).pipe(
    op.take(1),
    op.catchError(err => {
      // eslint-disable-next-line no-console
      console.log('test npm install failed:', err);
      return rx.of(1);
    }),
    op.tap(() => {
      // eslint-disable-next-line no-console
      console.log('kill: ', cp.kill('SIGINT'));
      // await shutdown();
      // eslint-disable-next-line no-console
      console.log('------- shutdown http server done ---------');
    })
  ).toPromise();
}

export function test() {
  return runNpmInstall(false);
}

export function cleanTest() {
  return runNpmInstall(true);
}

