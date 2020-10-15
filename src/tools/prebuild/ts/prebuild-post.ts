// tslint:disable: no-console
import { spawn } from '@wfh/plink/wfh/dist/process-utils';
import Path from 'path';
import fs from 'fs-extra';
import moment from 'moment';
import { mergeBack, getCurrBranchName } from './merge-artifacts';
import { digestInstallingFiles, checkZipFile } from '@wfh/assets-processer/dist/remote-deploy';
import { send } from './_send-patch';
import {stringifyListAllVersions} from './artifacts';
import api from '__api';
import log4js from 'log4js';
const log = log4js.getLogger(api.packageName + '.send-patch');

let pkJson: {name: string; version: string; devDependencies: any} = require(Path.resolve('package.json'));

export async function main(env: string, appName: string, buildStaticOnly = false, pushBranch = true, secret?: string) {
  const setting = api.config.get(api.packageName);

  const rootDir = api.config().rootPath;

  const releaseBranch: string = setting.prebuildReleaseBranch;

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

  if (appName === 'node-server' || buildStaticOnly !== true) {
    await digestInstallingFiles();
    log.info(await stringifyListAllVersions());
  }

  // const zipDir = Path.resolve('install-' + env);

  try {
    await spawn('git', 'branch', '-D', releaseBranch, { cwd: rootDir, silent: true }).promise;
  } catch (e) {
    log.debug(e.message);
  }

  const currBranch = await getCurrBranchName();

  if (buildStaticOnly && zipFile) {
    // Dynamically push to Node server
    try {
      await send(env, appName, zipFile, secret);
    } catch (ex) {
      try {
        await spawn('git', 'checkout', currBranch, { cwd: rootDir, silent: true }).promise;
      } catch (ex) {}
      throw ex;
    }
  }

  if (pushBranch)
    await pushReleaseBranch(releaseBranch, rootDir, env, appName);

  if (appName === 'node-server' || buildStaticOnly !== true) {
    await addTag(rootDir);
  }
  await spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
}

async function pushReleaseBranch(releaseBranch: string, rootDir: string, env: string, appName: string) {
  const releaseRemote = api.config.get(api.packageName).prebuildGitRemote;

  await spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir }).promise;
  removeDevDeps();
  changeGitIgnore();
  await spawn('git', 'add', '.', { cwd: rootDir }).promise;
  const hookFiles = [Path.resolve(rootDir, '.git/hooks/pre-push'),
    Path.resolve(rootDir, '.git/hooks/pre-commit')];
  for (const gitHooks of hookFiles) {
    if (fs.existsSync(gitHooks)) {
      fs.removeSync(gitHooks);
    }
  }
  await spawn('git', 'commit', '-m', `Prebuild node server ${env} - ${appName}`, { cwd: rootDir }).promise;
  await spawn('git', 'push', '-f', releaseRemote, releaseBranch, { cwd: rootDir }).promise;
}

async function addTag(rootDir: string) {
  const releaseRemote = api.config.get(api.packageName).prebuildGitRemote;
  const current = moment();
  const tagName = `release/${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
  await spawn('git', 'tag', '-a', tagName, '-m', `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`, { cwd: rootDir }).promise;
  await spawn('git', 'push', releaseRemote, tagName, { cwd: rootDir }).promise;
}

function removeDevDeps() {
  const json = Object.assign({}, pkJson);
  delete json.devDependencies;
  const newJson = JSON.stringify(json, null, '\t');
  // tslint:disable-next-line:no-console
  log.info('change package.json to:\n', newJson);
  fs.writeFileSync('package.json', newJson);
}

function changeGitIgnore() {
  const gitignoreFile = api.config.resolve('rootPath', '.gitignore');
  let gitignore = fs.readFileSync(gitignoreFile, 'utf8');
  gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
  gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
  fs.writeFileSync(gitignoreFile, gitignore);
}
