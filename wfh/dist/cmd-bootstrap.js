#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUVBLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFDekIseUJBQTBCO0FBQzFCLDJEQUEyRDtBQUMzRCxpRUFBaUU7QUFFakUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDakQsa0VBQWtFO0FBRWxFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO0lBQ2pDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtRQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoQjtBQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN2QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUIsTUFBTSxrQkFBa0IsR0FBRyxrQ0FBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLDZFQUE2RTtBQUc3RSxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDM0IsSUFBSSxVQUFVLENBQUM7QUFDZixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO0lBQ25GLGNBQWMsR0FBRyxJ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