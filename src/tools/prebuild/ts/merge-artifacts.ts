// tslint:disable: curly
import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
import {resolve, basename} from 'path';
import fs from 'fs-extra';
const log = require('log4js').getLogger('merge-artifacts');

const rootDir = resolve();
const tempDir = resolve(rootDir, 'dist/merge-temp');

const envs = ['local', 'dev', 'test', 'stage', 'prod'];

export async function prepare() {
  await checkRemote();

  await spawn('git', 'fetch', 'origin', {cwd: rootDir}).promise;

  const currBranch = await getCurrBranchName();

  if (currBranch === 'release-server') {
    // tslint:disable-next-line: no-console
    console.log('Current branch is release-server which should not be your build targeting branch,\nplease checkout another branch to procede!');
    throw new Error('please checkout another branch to procede!');
  }

  try {
    await spawn('git', 'branch', '-D', 'release-server', {cwd: rootDir}).promise;
  } catch (e) {}
  await cleanupRepo();

  await spawn('git', 'checkout', '-b', 'release-server', 'origin/release-server', {cwd: rootDir}).promise;
  if (fs.existsSync(tempDir)) {
    fs.removeSync(tempDir);
  }
  fs.mkdirpSync(tempDir);
  for (const env of envs) {
    const dir = resolve(rootDir, 'install-' + env);
    if (fs.existsSync(dir)) {
      const newName = resolve(tempDir, 'install-' + env);
      log.info(`move ${dir} to ${newName}`);
      fs.renameSync(dir, newName);
    }

    const checksumFile = resolve(rootDir, `checksum.${env}.json`);
    if (fs.existsSync(checksumFile)) {
      const newName = resolve(tempDir, basename(checksumFile));
      fs.renameSync(checksumFile, newName);
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
    const dir = resolve(tempDir, 'install-' + env);
    if (fs.existsSync(dir)) {
      const tempFiles = fs.readdirSync(dir);
      const installDir = resolve(rootDir, 'install-' + env);
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

export async function checkRemote() {
  const remoteList = await spawn('git', 'remote', '-v', {cwd: rootDir, silent: true}).promise;
  const lines = remoteList.split('\n');
  const remoteMap = new Map<string, string>();
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    const cols = line.split(/\s+/);
    remoteMap.set(cols[0], cols[1]);
  }
  // tslint:disable-next-line: no-console
  console.log('Your git remotes are: ', Array.from(remoteMap.keys()).map(key => `${key}: ${remoteMap.get(key)}`));
  const officeGitUrl = '.bkjk-inc.com/';
  if (!remoteMap.has('origin') || remoteMap.get('origin')!.indexOf(officeGitUrl) < 0) {
    // tslint:disable-next-line: no-console
    console.log('Your git remote must have a "origin" pointing to ', officeGitUrl);
    throw new Error('Your git remote must has a "origin" pointing to ' + officeGitUrl);
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
