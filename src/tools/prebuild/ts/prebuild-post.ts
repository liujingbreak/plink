/* eslint-disable no-console */
import { spawn } from '@wfh/plink/wfh/dist/process-utils';
import Path from 'path';
import fs from 'fs-extra';
import dayjs from 'dayjs';
import { mergeBack, getCurrBranchName } from './merge-artifacts';
import { digestInstallingFiles, checkZipFile } from '@wfh/assets-processer/dist/remote-deploy';
import { send } from './_send-patch';
import {stringifyListAllVersions} from './artifacts';
import api from '__plink';
import {getSetting} from '../isom/prebuild-setting';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import glob from 'glob';
import {log4File, plinkEnv} from '@wfh/plink';

const log = log4File(__filename);

let pkJson: {name: string; version: string; devDependencies: any} = require(Path.resolve('package.json'));
const setting = getSetting();
const releaseRemote = setting.tagPushRemote;
const current = dayjs();
const remoteBranchName = `${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;

export async function main(env: string, appName: 'node-server' | string, buildStaticOnly = false,
  pushBranch = true, isForce = false, secret?: string, commitComment?: string) {

  const setting = getSetting();
  const {rootDir} = plinkEnv;
  const deployBranch: string = setting.prebuildDeployBranch;

  // if (pushBranch)
  mergeBack();

  const zipSrc = api.config.resolve('staticDir');
  let zipFile: string | undefined;

  if (appName !== 'node-server') {
    const installDir = Path.resolve(rootDir, 'install-' + env);
    if (!fs.existsSync(installDir)) {
      fs.mkdirpSync(installDir);
    }
    zipFile = await checkZipFile(zipSrc, installDir, appName, /([\\/]stats[^]*\.json|\.map)$/);

    const generatedServerFileDir = Path.resolve(rootDir, 'dist/server');
    if (fs.existsSync(Path.resolve(generatedServerFileDir, appName))) {
      const serverZip = await checkZipFile(generatedServerFileDir, Path.resolve(rootDir, 'server-content-' + env), appName);
      log.info(`Pack ${generatedServerFileDir} to ${serverZip}`);
    }
  }

  if (appName === 'node-server') {
    await digestInstallingFiles();
    log.info(await stringifyListAllVersions());
  }

  // const zipDir = Path.resolve('install-' + env);

  try {
    await spawn('git', 'branch', '-D', deployBranch, { cwd: rootDir, silent: true }).promise;
  } catch (e) {
    log.debug(e.message);
  }

  const currBranch = await getCurrBranchName();

  if (buildStaticOnly && zipFile) {
    // Dynamically push to Node server
    const cfgByEnv = setting.byEnv[env];
    if (cfgByEnv == null) {
      throw new Error(`Missing configuration property '@wfh/prebuild.byEnv["${env}"]',` +
      `add this property with command line argument '-c <file>' or '--prop @wfh/prebuild.byEnv["${env}"]'`);
    }
    try {
      await send(env, appName, zipFile, setting.byEnv[env].sendConcurrency , setting.byEnv[env].sendNodes, isForce, secret);
    } catch (ex) {
      try {
        await spawn('git', 'checkout', currBranch, { cwd: rootDir, silent: true }).promise;
      } catch (ex) {}
      throw ex;
    }
  }

  log.info('------- push to deployment remote -------');
  await pushDeployBranch(deployBranch, rootDir, env, appName, pushBranch, commitComment);
  log.info('------- create tag and new release branch -------');
  // await pushTagAndReleaseBranch(rootDir, pushBranch, commitComment);
  await spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
}

async function pushDeployBranch(releaseBranch: string, rootDir: string, env: string, appName: string, pushBranch: boolean, commitComment?: string) {
  const deployRemote = api.config()['@wfh/prebuild'].prebuildDeployRemote;

  await spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir, silent: true }).promise;
  // removeDevDeps();
  changeGitIgnore();
  log.info('commitComment', commitComment);
  await splitCommit4bigFiles(env, appName, pushBranch, commitComment);
  await spawn('git', 'add', '.', { cwd: rootDir, silent: true }).promise;
  const hookFiles = [Path.resolve(rootDir, '.git/hooks/pre-push'),
    Path.resolve(rootDir, '.git/hooks/pre-commit')];
  for (const gitHooks of hookFiles) {
    if (fs.existsSync(gitHooks)) {
      fs.removeSync(gitHooks);
    }
  }
  await spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}`, { cwd: rootDir, silent: true }).promise;
  await spawn('git', 'push', '-f', deployRemote, releaseBranch, { cwd: rootDir}).promise;
  await pushTagAndReleaseBranch(pushBranch, commitComment);
}

async function pushTagAndReleaseBranch(pushBranch: boolean, commitComment?: string) {
  // await spawn('git', 'tag', '-a', 'v' + remoteBranchName, '-m',
  //   commitComment ? commitComment : `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`,
  //   { cwd: rootDir}).promise;
  // await spawn('git', 'push', setting.prebuildDeployRemote, 'v' + remoteBranchName, { cwd: rootDir}).promise;

  if (pushBranch && releaseRemote && releaseRemote !== setting.prebuildDeployRemote) {
    await spawn('git', 'push', releaseRemote, 'HEAD:release/' + remoteBranchName, { cwd: plinkEnv.rootDir }).promise;
    // await spawn('git', 'push', releaseRemote, 'v' + remoteBranchName, { cwd: rootDir }).promise;
  } else {
    log.info('Skip pushing ' + pushBranch);
  }
}

function changeGitIgnore() {
  const gitignoreFile = api.config.resolve('rootPath', '.gitignore');
  let gitignore = fs.readFileSync(gitignoreFile, 'utf8');
  gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
  gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
  fs.writeFileSync(gitignoreFile, gitignore);
}

/**
 * Some git vendor has commit size limitation, let's try split to multiple commits for those non-source files
 */
function splitCommit4bigFiles(env: string, appName: string, pushBranch: boolean, commitComment?: string) {
  const envs = Object.keys(getSetting().byEnv)
  const res$ = rx.of('install-', 'server-content-').pipe(
    op.mergeMap(artifactDirPrefix => {
      return envs.map(envName => Path.resolve(plinkEnv.rootDir, artifactDirPrefix + envName));
    }),
    op.mergeMap(dir => {
      if (fs.existsSync(dir)) {
        return new rx.Observable<string>(sub => {
          glob(dir.replace(/\\/g, '/') + '/**/*', (err, matches) => {
            for (const file of matches) {
              sub.next(Path.relative(plinkEnv.rootDir, file).replace(/\\/g, '/'));
            }
            sub.complete();
          });
        });
      }
      return rx.EMPTY;
    }),
    op.concatMap(async file => {
      await spawn('git', 'add', file, { cwd: plinkEnv.rootDir, silent: false }).promise;
      await spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}:\n${file}`,
        { cwd: plinkEnv.rootDir, silent: false })
        .promise;
      await new Promise(resolve => setImmediate(resolve));
      await pushTagAndReleaseBranch(pushBranch, commitComment);
    }),
    op.catchError(err => {
      log.error(err);
      throw err;
    }),
    op.count(),
    op.tap(count => log.info(`${count} files are split into ${count} commits.`))
  );

  return res$.toPromise();
}
