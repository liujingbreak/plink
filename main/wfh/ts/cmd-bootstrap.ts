#!/usr/bin/env node
/* tslint:disable:no-console */
require('source-map-support/register');
import * as Path from 'path';
import os = require('os');
import fs from 'fs';
import checkNode from './utils/node-version-check';
// import checkSymlinks from './utils/symlinks';

// import {removeProjectSymlink} from './project-dir';
// const versionChecker = require('../lib/versionChecker');
// import {getInstance as getGuarder} from './package-json-guarder';

// const drcpPkJson = require('../../package.json');
// const isWin32 = require('os').platform().indexOf('win32') >= 0;

process.on('SIGINT', function() {
  console.log('Recieve SIGINT, bye.');
  process.exit(0);
});
process.on('message', function(msg) {
  if (msg === 'shutdown') {
    console.log('Recieve shutdown message from PM2, bye.');
    process.exit(0);
  }
});

(async function run() {
  await checkNode();
  const startTime = new Date().getTime();
  const cwd = process.cwd();
  // const packageJsonGuarder = getGuarder(cwd);
  // process.env.SASS_BINARY_SITE = 'https://npm.taobao.org/mirrors/node-sass';

  // if (fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink()) {
  //   await checkSymlinks();
  //   await ensurePackageJsonFile();
  //   require('../lib/gulp/cli').writeProjectListFile([Path.resolve(__dirname, '..', '..')]);
  //   // .then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))

  //   require('../lib/gulp/cli').writeProjectListFile([Path.resolve(__dirname, '..', '..')]);
  //   processCmd();
  // } else {
  await ensurePackageJsonFile();
  await processCmd();
  // }

  /**
   * @param {*} isDrcpDevMode denote true to copy dr-comp-package dependency list to workspace package.json file
   * @return true if workspace package.json file is changed
   */
  function ensurePackageJsonFile(/*isDrcpDevMode: boolean*/) {
    var workspaceJson;
    var needCreateFile = false;
    var backupJson = null;
    // var needInstall = false;
    if (fs.existsSync('dr.backup.package.json')) {
      console.log('Found "dr.backup.package.json", will recover package.json from dr.backup.package.json');
      fs.unlinkSync('package.json');
      fs.renameSync('dr.backup.package.json', 'package.json');
    }
    if (!fs.existsSync('package.json')) {
      console.log('Creating package.json');
      needCreateFile = true;
      workspaceJson = JSON.parse(fs.readFileSync(
        Path.resolve(__dirname, '../templates/package.json.template'), 'utf8'));
      workspaceJson.author = os.userInfo().username;
      workspaceJson.name = Path.basename(cwd);
      workspaceJson.description = '@dr monorepo workspace';
      backupJson = JSON.stringify(workspaceJson, null, '  ');
    } else {
      workspaceJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    }
    if (!workspaceJson.dependencies)
      workspaceJson.dependencies = {};
    // if (isDrcpDevMode) {
    //   needInstall = needInstallWfh(workspaceJson);
    // }
    if (needCreateFile)
      fs.writeFileSync(Path.join(cwd, 'package.json'), backupJson);
    // if (needInstall) {
    //   removeProjectSymlink(isDrcpDevMode);
    //   packageJsonGuarder.beforeChange();
    //   return packageJsonGuarder.installAsync(false, process.argv.some(arg => arg === '--yarn'),
    //     process.argv.some(arg => arg === '--offline'))
    //   .then(() => packageJsonGuarder.afterChange())
    //   .catch(err => {
    //     packageJsonGuarder.afterChangeFail();
    //     throw err;
    //   });
    // }
    return Promise.resolve();
  }

  // function needInstallWfh(workspaceJson: any) {
  //   const newWorkspaceJson = Object.assign({}, workspaceJson);
  //   const drPackageJson = packageJsonGuarder.getChanges();
  //   newWorkspaceJson.dependencies = {
  //     ...drcpPkJson.dependencies,
  //     ...drPackageJson.dependencies
  //   };
  //   newWorkspaceJson.devDependencies = {
  //     ...drcpPkJson.devDependencies,
  //     ...drPackageJson.devDependencies,
  //     ...drcpPkJson.peerDependencies
  //   };

  //   const newAdds = packageJsonGuarder.markChanges(newWorkspaceJson);
  //   for (const entry of newAdds) {
  //     console.log(`[cmd-bootstrap] ${entry[1] != null ? '+' : '-'} ${entry[0]} ${entry[1] || ''}`);
  //   }
  //   return newAdds.length > 0 || packageJsonGuarder.isModulesChanged();
  // }

  async function processCmd() {
    (await import('./cmd/cli')).drcpCommand(startTime);
  }
})().catch(err => {
  console.log(err);
  process.exit(1);
});
