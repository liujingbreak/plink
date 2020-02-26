// tslint:disable: no-console
import { spawn } from 'dr-comp-package/wfh/dist/process-utils';
import Path from 'path';
import fs from 'fs-extra';
import moment from 'moment';
import { mergeBack } from './merge-artifacts';
import { digestInstallingFiles, checkZipFile } from '@dr-core/assets-processer/dist/remote-deploy';
import { send } from './_send-patch';
let pkJson: {name: string; version: string; devDependencies: any};

export async function main(env: string, appName: string, buildStaticOnly: string, secret: string) {
  const rootDir = Path.resolve();

  // const [env, appName, buildStaticOnly] = process.argv.slice(2);
  if (env == null || appName == null || buildStaticOnly == null) {
    // tslint:disable-next-line: no-console
    console.log('missing argument for <dev|prod|local|dell> <bcl|byj> <true|false>');
    process.exit(1);
    return;
  }

  let releaseBranch = 'release-server';
  if (env === 'local') {
    releaseBranch = 'release-server-local';
  }

  // await spawn('node', 'node_modules/@dr-core/assets-processer/dist/zip.js', {cwd: rootDir}).promise;
  mergeBack();

  const zipSrc = Path.resolve(__dirname, '../../dist/static');
  let zipFile: string | undefined;

  if (appName !== 'node-server') {
    const installDir = Path.resolve('install-' + env);
    if (!fs.existsSync(installDir)) {
      fs.mkdirpSync(installDir);
    }
    zipFile = await checkZipFile(zipSrc, installDir, appName);
  } else {
    digestInstallingFiles();
  }

  try {
    await spawn('git', 'branch', '-D', releaseBranch, { cwd: rootDir }).promise;
  } catch (e) {
    console.log(e.message);
  }

  const res = await spawn('git', 'status', { cwd: rootDir, silent: true }).promise;
  const currBranch = /^On branch (.*)$/m.exec(res)![1];

  if (buildStaticOnly === 'true' && zipFile) {
    // Dynamically push to Node server
    try {
      await send(env, appName, zipFile, secret);
    } catch (ex) {
      await spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
      throw ex;
    }
  }

  await pushReleaseBranch(releaseBranch, rootDir, env, appName);

  if (buildStaticOnly !== 'true') {
    await addTag(rootDir);
  }
  await spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
}

async function pushReleaseBranch(releaseBranch: string, rootDir: string, env: string, appName: string) {
  await spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir }).promise;
  removeDevDeps();
  changeGitIgnore();
  await spawn('git', 'add', '.', { cwd: rootDir }).promise;
  const hookFiles = [Path.resolve('.git/hooks/pre-push'), Path.resolve('.git/hooks/pre-commit')];
  for (const gitHooks of hookFiles) {
    if (fs.existsSync(gitHooks)) {
      fs.removeSync(gitHooks);
    }
    await spawn('git', 'commit', '-m', `Prebuild node server ${env} - ${appName}`, { cwd: rootDir }).promise;
    await spawn('git', 'push', '-f', 'origin', releaseBranch, { cwd: rootDir }).promise;
  }
}

async function addTag(rootDir: string) {
  const current = moment();
  const tagName = `release/${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
  await spawn('git', 'tag', '-a', tagName, '-m', `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`, { cwd: rootDir }).promise;
  await spawn('git', 'push', 'origin', tagName, { cwd: rootDir }).promise;
}

function removeDevDeps() {
  const json = Object.assign({}, pkJson);
  delete json.devDependencies;
  const newJson = JSON.stringify(json, null, '\t');
  // tslint:disable-next-line:no-console
  console.log('change package.json to:\n', newJson);
  fs.writeFileSync('package.json', newJson);
}

function changeGitIgnore() {
  const commitHook = Path.resolve('.git/hooks/pre-commit');
  if (fs.existsSync(commitHook)) {
    fs.unlinkSync(commitHook);
  }

  let gitignore = fs.readFileSync('.gitignore', 'utf8');
  gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
  gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
  fs.writeFileSync('.gitignore', gitignore);
}
