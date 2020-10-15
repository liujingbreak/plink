// tslint:disable: curly
import {spawn} from '@wfh/plink/wfh/dist/process-utils';
import {getRootDir} from '@wfh/plink/wfh/dist';
import {resolve, basename} from 'path';
import fs from 'fs-extra';
import api from '__api';

const log = require('log4js').getLogger('merge-artifacts');

const rootDir = getRootDir();
const tempDir = resolve(rootDir, 'dist/merge-temp');

const envs = ['local', 'dev', 'test', 'stage', 'prod'];

export async function prepare() {
  const setting = api.config.get(api.packageName);
  let releaseBranch = setting.prebuildReleaseBranch;
  const releaseRemote = setting.prebuildGitRemote;

  // await checkRemote();

  await spawn('git', 'fetch', releaseRemote, {cwd: rootDir}).promise;

  const currBranch = await getCurrBranchName();

  if (currBranch === releaseBranch) {
    // tslint:disable-next-line: no-console
    console.log('Current branch is release-server which should not be your build targeting branch,\nplease checkout another branch to procede!');
    throw new Error('please checkout another branch to procede!');
  }

  try {
    await spawn('git', 'branch', '-D', releaseBranch, {cwd: rootDir}).promise;
  } catch (e) {}
  await cleanupRepo();

  await spawn('git', 'checkout', '-b', releaseBranch, releaseRemote + '/' + releaseBranch, {cwd: rootDir}).promise;
  if (fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
  }
  fs.mkdirpSync(tempDir);
  for (const env of envs) {
    mvDir('install-' + env);
    mvDir('server-content-' + env);

    const checksumFile = resolve(rootDir, `checksum.${env}.json`);
    if (fs.existsSync(checksumFile)) {
      const newName = resolve(tempDir, basename(checksumFile));
      fs.renameSync(checksumFile, newName);
    }
  }

  function mvDir(targetDirName: string) {
    const dir = resolve(rootDir, targetDirName);
    if (fs.existsSync(dir)) {
      const newName = resolve(tempDir, targetDirName);
      log.info(`move ${dir} to ${newName}`);
      fs.renameSync(dir, newName);
    }
  }
  await spawn('git', 'checkout', currBranch, {cwd: rootDir}).promise;
}

async function cleanupRepo() {
  try {
    await spawn('git', 'reset', '--hard', 'HEAD', {cwd: rootDir}).promise;
  } catch (e) {
  }
  try {
    await spawn('git', 'clean', '-f', '-d', {cwd: rootDir}).promise;
  } catch (e) {
  }
}

export function mergeBack() {
  log.info('merge artifacts');
  for (const env of envs) {
    mergeDir('install-' + env);
    mergeDir('server-content-' + env);
  }

  function mergeDir(targetDirName: string) {
    const dir = resolve(tempDir, targetDirName);
    if (fs.existsSync(dir)) {
      const tempFiles = fs.readdirSync(dir);
      const installDir = resolve(rootDir, targetDirName);
      fs.mkdirpSync(installDir);
      for (const file of tempFiles) {
        if (fs.existsSync(resolve(installDir, file))) {
          log.info(`${resolve(installDir, file)} exists, delete`);
          fs.removeSync(resolve(installDir, file));
        }
        fs.renameSync(resolve(dir, file), resolve(installDir, file));
        log.info(`move ${resolve(dir, file)} to ${resolve(installDir, file)}`);
      }
    }
  }

  const files = fs.readdirSync(tempDir);
  for (const file of files) {
    if (!/^checksum\.[^.]+\.json$/.test(file)) {
      continue;
    }
    const existing = resolve(rootDir, file);
    if (fs.existsSync(existing))
      fs.removeSync(existing);
    fs.renameSync(resolve(tempDir, file), existing);
  }
}

export async function getCurrBranchName() {
  const res = await spawn('git', 'status', {cwd: rootDir, silent: true}).promise;
  let currBranch: string | undefined;
  [/^On branch (.*)$/m, /^HEAD detached at (\S+)$/m].some(reg => {
    const m = reg.exec(res);
    if (m) {
      currBranch = m[1];
      return true;
    }
    return false;
  });
  if (currBranch == null) {
    throw new Error(`Can not understand which is current branch:\n ${res}`);
  }
  return currBranch;
}
