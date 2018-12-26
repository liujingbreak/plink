#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Path = require("path");
const fs = require("fs");
const os = require("os");
// const versionChecker = require('../lib/versionChecker');
const package_json_guarder_1 = require("./package-json-guarder");
const drcpPkJson = require('../../package.json');
// const isWin32 = require('os').platform().indexOf('win32') >= 0;
process.on('SIGINT', function () {
    console.log('Recieve SIGINT, bye.');
    process.exit(0);
});
process.on('message', function (msg) {
    if (msg === 'shutdown') {
        console.log('Recieve shutdown message from PM2, bye.');
        process.exit(0);
    }
});
const startTime = new Date().getTime();
const cwd = process.cwd();
const packageJsonGuarder = package_json_guarder_1.getInstance(cwd);
// process.env.SASS_BINARY_SITE = 'https://npm.taobao.org/mirrors/node-sass';
var isSymbolicLink = false;
var cmdPromise;
if (fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink()) {
    isSymbolicLink = true;
    cmdPromise = ensurePackageJsonFile(isSymbolicLink)
        // .then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))
        .then(() => '')
        .then(infoText => {
        require('../lib/gulp/cli').writeProjectListFile([Path.resolve(__dirname, '..', '..')]);
        return infoText;
    })
        .then(infoText => processCmd(infoText));
}
else {
    cmdPromise = ensurePackageJsonFile(false).then(() => '')
        // .then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))
        .then(infoText => processCmd(infoText));
}
cmdPromise.catch(e => {
    console.error(e);
    process.exit(1);
});
/**
 * @param {*} isDrcpDevMode denote true to copy dr-comp-package dependency list to workspace package.json file
 * @return true if workspace package.json file is changed
 */
function ensurePackageJsonFile(isDrcpDevMode) {
    var workspaceJson;
    var needCreateFile = false;
    var backupJson = null;
    var needInstall = false;
    if (fs.existsSync('dr.backup.package.json')) {
        console.log('Found "dr.backup.package.json", will recover package.json from dr.backup.package.json');
        fs.unlinkSync('package.json');
        fs.renameSync('dr.backup.package.json', 'package.json');
    }
    if (!fs.existsSync('package.json')) {
        console.log('Creating package.json');
        needCreateFile = true;
        workspaceJson = JSON.parse(fs.readFileSync(Path.resolve(__dirname, '../../bin/package.json.template'), 'utf8'));
        workspaceJson.author = os.userInfo().username;
        workspaceJson.name = Path.basename(cwd);
        workspaceJson.description = '@dr web component platform workspace';
        backupJson = JSON.stringify(workspaceJson, null, '  ');
    }
    else {
        workspaceJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    }
    if (!workspaceJson.dependencies)
        workspaceJson.dependencies = {};
    if (isDrcpDevMode) {
        needInstall = needInstallWfh(workspaceJson);
    }
    if (needCreateFile)
        fs.writeFileSync(Path.join(cwd, 'package.json'), backupJson);
    if (needInstall) {
        removeProjectSymlink(isDrcpDevMode);
        packageJsonGuarder.beforeChange();
        return packageJsonGuarder.installAsync(false, process.argv.some(arg => arg === '--yarn'), process.argv.some(arg => arg === '--offline'))
            .then(() => packageJsonGuarder.afterChange())
            .catch(err => {
            packageJsonGuarder.afterChangeFail();
            throw err;
        });
    }
    return Promise.resolve(null);
}
/**
 * Otherwise `npm install` will get an max stack overflow error
 * @param isDrcpDevMode
 */
function removeProjectSymlink(isDrcpDevMode) {
    let projects;
    const projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
    if (fs.existsSync(projectListFile))
        projects = require(projectListFile);
    if (projects && projects.length > 0) {
        for (const prjdir of projects) {
            const moduleDir = Path.resolve(prjdir, 'node_modules');
            try {
                const stats = fs.lstatSync(moduleDir);
                if (stats.isSymbolicLink()) {
                    fs.unlinkSync(moduleDir);
                }
            }
            catch (e) { }
        }
    }
    if (isDrcpDevMode) {
        // Since drcp itself is symlink, in case there is no dr.project.list.json, we still need to make sure...
        const moduleDir = Path.join(Path.dirname(fs.realpathSync(require.resolve('dr-comp-package/package.json'))), 'node_modules');
        try {
            const stats = fs.lstatSync(moduleDir);
            if (stats.isSymbolicLink()) {
                fs.unlinkSync(moduleDir);
            }
        }
        catch (e) { }
    }
}
function needInstallWfh(workspaceJson) {
    const newWorkspaceJson = Object.assign({}, workspaceJson);
    const currDeps = packageJsonGuarder.getChanges().dependencies;
    newWorkspaceJson.dependencies = Object.assign({}, drcpPkJson.dependencies, currDeps);
    const newAdds = packageJsonGuarder.markChanges(newWorkspaceJson);
    for (const entry of newAdds) {
        console.log(` ${entry[1] != null ? '+' : '-'} ${entry[0]} ${entry[1] || ''}`);
    }
    return newAdds.length > 0 || packageJsonGuarder.isModulesChanged();
}
function processCmd(versionText) {
    console.log(versionText);
    require('source-map-support/register');
    return require('../lib/cmd-args').drcpCommand(startTime);
}
//# sourceMappingURL=cmd-bootstrap.js.map