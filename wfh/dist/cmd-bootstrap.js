#!/usr/bin/env node
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const os = require("os");
const fs_1 = __importDefault(require("fs"));
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
if (fs_1.default.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink()) {
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
    if (fs_1.default.existsSync('dr.backup.package.json')) {
        console.log('Found "dr.backup.package.json", will recover package.json from dr.backup.package.json');
        fs_1.default.unlinkSync('package.json');
        fs_1.default.renameSync('dr.backup.package.json', 'package.json');
    }
    if (!fs_1.default.existsSync('package.json')) {
        console.log('Creating package.json');
        needCreateFile = true;
        workspaceJson = JSON.parse(fs_1.default.readFileSync(Path.resolve(__dirname, '../../bin/package.json.template'), 'utf8'));
        workspaceJson.author = os.userInfo().username;
        workspaceJson.name = Path.basename(cwd);
        workspaceJson.description = '@dr web component platform workspace';
        backupJson = JSON.stringify(workspaceJson, null, '  ');
    }
    else {
        workspaceJson = JSON.parse(fs_1.default.readFileSync('package.json', 'utf8'));
    }
    if (!workspaceJson.dependencies)
        workspaceJson.dependencies = {};
    if (isDrcpDevMode) {
        needInstall = needInstallWfh(workspaceJson);
    }
    if (needCreateFile)
        fs_1.default.writeFileSync(Path.join(cwd, 'package.json'), backupJson);
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
    if (fs_1.default.existsSync(projectListFile))
        projects = require(projectListFile);
    if (projects && projects.length > 0) {
        for (const prjdir of projects) {
            const moduleDir = Path.resolve(prjdir, 'node_modules');
            try {
                const stats = fs_1.default.lstatSync(moduleDir);
                if (stats.isSymbolicLink()) {
                    fs_1.default.unlinkSync(moduleDir);
                }
            }
            catch (e) { }
        }
    }
    if (isDrcpDevMode) {
        // Since drcp itself is symlink, in case there is no dr.project.list.json, we still need to make sure...
        const moduleDir = Path.join(Path.dirname(fs_1.default.realpathSync(require.resolve('dr-comp-package/package.json'))), 'node_modules');
        try {
            const stats = fs_1.default.lstatSync(moduleDir);
            if (stats.isSymbolicLink()) {
                fs_1.default.unlinkSync(moduleDir);
            }
        }
        catch (e) { }
    }
}
function createProjectSymlink() {
    const isWin32 = require('os').platform().indexOf('win32') >= 0;
    const nodePath = fs_1.default.realpathSync(Path.resolve(process.cwd(), 'node_modules'));
    const projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
    if (!fs_1.default.existsSync(projectListFile))
        return;
    for (const prjdir of require(projectListFile)) {
        const moduleDir = Path.resolve(prjdir, 'node_modules');
        let needCreateSymlink = false;
        let stats;
        try {
            stats = fs_1.default.lstatSync(moduleDir);
            if (stats.isSymbolicLink() || stats.isDirectory() || stats.isFile()) {
                if (!fs_1.default.existsSync(moduleDir) || fs_1.default.realpathSync(moduleDir) !== nodePath) {
                    if (stats.isSymbolicLink()) {
                        fs_1.default.unlinkSync(moduleDir);
                    }
                    else {
                        if (fs_1.default.existsSync(moduleDir + '.bak')) {
                            const _removeSync = require('fs-extra').removeSync;
                            _removeSync(moduleDir + '.bak');
                        }
                        fs_1.default.renameSync(moduleDir, moduleDir + '.bak');
                        console.log(`Backup "${moduleDir}" to "${moduleDir}.bak"`);
                    }
                    needCreateSymlink = true;
                }
            }
            else
                needCreateSymlink = true;
        }
        catch (e) {
            // node_modules does not exists, fs.lstatSync() throws error
            needCreateSymlink = true;
        }
        if (needCreateSymlink) {
            // console.log('Create symlink "%s"', Path.resolve(prjdir, 'node_modules'));
            fs_1.default.symlinkSync(Path.relative(prjdir, fs_1.default.realpathSync(nodePath)), moduleDir, isWin32 ? 'junction' : 'dir');
        }
    }
}
exports.createProjectSymlink = createProjectSymlink;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUVBLDJDQUE2QjtBQUM3Qix5QkFBMEI7QUFDMUIsNENBQW9CO0FBRXBCLDJEQUEyRDtBQUMzRCxpRUFBaUU7QUFFakUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDakQsa0VBQWtFO0FBRWxFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO0lBQ2pDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtRQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoQjtBQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN2QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUIsTUFBTSxrQkFBa0IsR0FBRyxrQ0FBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLDZFQUE2RTtBQUc3RSxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDM0IsSUFBSSxVQUFVLENBQUM7QUFDZixJQUFJLFlBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO0lBQ25GLGNB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