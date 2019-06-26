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
/* tslint:disable:no-console */
const Path = __importStar(require("path"));
const os = require("os");
const fs_1 = __importDefault(require("fs"));
const project_dir_1 = require("./project-dir");
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
        project_dir_1.removeProjectSymlink(isDrcpDevMode);
        packageJsonGuarder.beforeChange();
        return packageJsonGuarder.installAsync(false, process.argv.some(arg => arg === '--yarn'), process.argv.some(arg => arg === '--offline'))
            .then(() => packageJsonGuarder.afterChange())
            .catch(err => {
            packageJsonGuarder.afterChangeFail();
            throw err;
        });
    }
    return Promise.resolve();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IseUJBQTBCO0FBQzFCLDRDQUFvQjtBQUNwQiwrQ0FBbUQ7QUFDbkQsMkRBQTJEO0FBQzNELGlFQUFpRTtBQUVqRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUNqRCxrRUFBa0U7QUFFbEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7SUFDakMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO1FBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2hCO0FBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLGtCQUFrQixHQUFHLGtDQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0MsNkVBQTZFO0FBRTdFLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQztBQUMzQixJQUFJLFVBQVUsQ0FBQztBQUNmLElBQUksWUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENB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LENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQzlFO0lBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0FBQ3BFLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxXQUFnQjtJQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzFELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IG9zID0gcmVxdWlyZSgnb3MnKTtcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3JlbW92ZVByb2plY3RTeW1saW5rfSBmcm9tICcuL3Byb2plY3QtZGlyJztcbi8vIGNvbnN0IHZlcnNpb25DaGVja2VyID0gcmVxdWlyZSgnLi4vbGliL3ZlcnNpb25DaGVja2VyJyk7XG5pbXBvcnQge2dldEluc3RhbmNlIGFzIGdldEd1YXJkZXJ9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuXG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJyk7XG4vLyBjb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxucHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG5cdGNvbnNvbGUubG9nKCdSZWNpZXZlIFNJR0lOVCwgYnllLicpO1xuXHRwcm9jZXNzLmV4aXQoMCk7XG59KTtcbnByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcblx0aWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuXHRcdGNvbnNvbGUubG9nKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcblx0XHRwcm9jZXNzLmV4aXQoMCk7XG5cdH1cbn0pO1xuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5jb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0R3VhcmRlcihjd2QpO1xuLy8gcHJvY2Vzcy5lbnYuU0FTU19CSU5BUllfU0lURSA9ICdodHRwczovL25wbS50YW9iYW8ub3JnL21pcnJvcnMvbm9kZS1zYXNzJztcblxudmFyIGlzU3ltYm9saWNMaW5rID0gZmFsc2U7XG52YXIgY21kUHJvbWlzZTtcbmlmIChmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCkpIHtcblx0aXNTeW1ib2xpY0xpbmsgPSB0cnVlO1xuXHRjbWRQcm9taXNlID0gZW5zdXJlUGFja2FnZUpzb25GaWxlKGlzU3ltYm9saWNMaW5rKVxuXHQvLyAudGhlbihsYXRlc3RSZWNpcGUgPT4gdmVyc2lvbkNoZWNrZXIuY2hlY2tWZXJzaW9ucyhpc1N5bWJvbGljTGluaykpXG5cdC50aGVuKCgpID0+ICcnKVxuXHQudGhlbiggaW5mb1RleHQgPT4ge1xuXHRcdHJlcXVpcmUoJy4uL2xpYi9ndWxwL2NsaScpLndyaXRlUHJvamVjdExpc3RGaWxlKFtQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nKV0pO1xuXHRcdHJldHVybiBpbmZvVGV4dDtcblx0fSlcblx0LnRoZW4oaW5mb1RleHQgPT4gcHJvY2Vzc0NtZChpbmZvVGV4dCkpO1xufSBlbHNlIHtcblx0Y21kUHJvbWlzZSA9IGVuc3VyZVBhY2thZ2VKc29uRmlsZShmYWxzZSkudGhlbigoKSA9PiAnJylcblx0XHQvLyAudGhlbihsYXRlc3RSZWNpcGUgPT4gdmVyc2lvbkNoZWNrZXIuY2hlY2tWZXJzaW9ucyhpc1N5bWJvbGljTGluaykpXG5cdC50aGVuKGluZm9UZXh0ID0+IHByb2Nlc3NDbWQoaW5mb1RleHQpKTtcbn1cbmNtZFByb21pc2UuY2F0Y2goZSA9PiB7XG5cdGNvbnNvbGUuZXJyb3IoZSk7XG5cdHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuXG4vKipcbiAqIEBwYXJhbSB7Kn0gaXNEcmNwRGV2TW9kZSBkZW5vdGUgdHJ1ZSB0byBjb3B5IGRyLWNvbXAtcGFja2FnZSBkZXBlbmRlbmN5IGxpc3QgdG8gd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlXG4gKiBAcmV0dXJuIHRydWUgaWYgd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlIGlzIGNoYW5nZWRcbiAqL1xuZnVuY3Rpb24gZW5zdXJlUGFja2FnZUpzb25GaWxlKGlzRHJjcERldk1vZGU6IGJvb2xlYW4pIHtcblx0dmFyIHdvcmtzcGFjZUpzb247XG5cdHZhciBuZWVkQ3JlYXRlRmlsZSA9IGZhbHNlO1xuXHR2YXIgYmFja3VwSnNvbiA9IG51bGw7XG5cdHZhciBuZWVkSW5zdGFsbCA9IGZhbHNlO1xuXHRpZiAoZnMuZXhpc3RzU3luYygnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpKSB7XG5cdFx0Y29uc29sZS5sb2coJ0ZvdW5kIFwiZHIuYmFja3VwLnBhY2thZ2UuanNvblwiLCB3aWxsIHJlY292ZXIgcGFja2FnZS5qc29uIGZyb20gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuXHRcdGZzLnVubGlua1N5bmMoJ3BhY2thZ2UuanNvbicpO1xuXHRcdGZzLnJlbmFtZVN5bmMoJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nLCAncGFja2FnZS5qc29uJyk7XG5cdH1cblx0aWYgKCFmcy5leGlzdHNTeW5jKCdwYWNrYWdlLmpzb24nKSkge1xuXHRcdGNvbnNvbGUubG9nKCdDcmVhdGluZyBwYWNrYWdlLmpzb24nKTtcblx0XHRuZWVkQ3JlYXRlRmlsZSA9IHRydWU7XG5cdFx0d29ya3NwYWNlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKFxuXHRcdFx0UGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL2Jpbi9wYWNrYWdlLmpzb24udGVtcGxhdGUnKSwgJ3V0ZjgnKSk7XG5cdFx0d29ya3NwYWNlSnNvbi5hdXRob3IgPSBvcy51c2VySW5mbygpLnVzZXJuYW1lO1xuXHRcdHdvcmtzcGFjZUpzb24ubmFtZSA9IFBhdGguYmFzZW5hbWUoY3dkKTtcblx0XHR3b3Jrc3BhY2VKc29uLmRlc2NyaXB0aW9uID0gJ0BkciB3ZWIgY29tcG9uZW50IHBsYXRmb3JtIHdvcmtzcGFjZSc7XG5cdFx0YmFja3VwSnNvbiA9IEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZUpzb24sIG51bGwsICcgICcpO1xuXHR9IGVsc2Uge1xuXHRcdHdvcmtzcGFjZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0ZjgnKSk7XG5cdH1cblx0aWYgKCF3b3Jrc3BhY2VKc29uLmRlcGVuZGVuY2llcylcblx0XHR3b3Jrc3BhY2VKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuXHRpZiAoaXNEcmNwRGV2TW9kZSkge1xuXHRcdG5lZWRJbnN0YWxsID0gbmVlZEluc3RhbGxXZmgod29ya3NwYWNlSnNvbik7XG5cdH1cblx0aWYgKG5lZWRDcmVhdGVGaWxlKVxuXHRcdGZzLndyaXRlRmlsZVN5bmMoUGF0aC5qb2luKGN3ZCwgJ3BhY2thZ2UuanNvbicpLCBiYWNrdXBKc29uKTtcblx0aWYgKG5lZWRJbnN0YWxsKSB7XG5cdFx0cmVtb3ZlUHJvamVjdFN5bWxpbmsoaXNEcmNwRGV2TW9kZSk7XG5cdFx0cGFja2FnZUpzb25HdWFyZGVyLmJlZm9yZUNoYW5nZSgpO1xuXHRcdHJldHVybiBwYWNrYWdlSnNvbkd1YXJkZXIuaW5zdGFsbEFzeW5jKGZhbHNlLCBwcm9jZXNzLmFyZ3Yuc29tZShhcmcgPT4gYXJnID09PSAnLS15YXJuJyksXG5cdFx0XHRwcm9jZXNzLmFyZ3Yuc29tZShhcmcgPT4gYXJnID09PSAnLS1vZmZsaW5lJykpXG5cdFx0LnRoZW4oKCkgPT4gcGFja2FnZUpzb25HdWFyZGVyLmFmdGVyQ2hhbmdlKCkpXG5cdFx0LmNhdGNoKGVyciA9PiB7XG5cdFx0XHRwYWNrYWdlSnNvbkd1YXJkZXIuYWZ0ZXJDaGFuZ2VGYWlsKCk7XG5cdFx0XHR0aHJvdyBlcnI7XG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xufVxuXG5mdW5jdGlvbiBuZWVkSW5zdGFsbFdmaCh3b3Jrc3BhY2VKc29uOiBhbnkpIHtcblx0Y29uc3QgbmV3V29ya3NwYWNlSnNvbiA9IE9iamVjdC5hc3NpZ24oe30sIHdvcmtzcGFjZUpzb24pO1xuXHRjb25zdCBjdXJyRGVwcyA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCkuZGVwZW5kZW5jaWVzO1xuXHRuZXdXb3Jrc3BhY2VKc29uLmRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIGRyY3BQa0pzb24uZGVwZW5kZW5jaWVzLCBjdXJyRGVwcyk7XG5cblx0Y29uc3QgbmV3QWRkcyA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhuZXdXb3Jrc3BhY2VKc29uKTtcblx0Zm9yIChjb25zdCBlbnRyeSBvZiBuZXdBZGRzKSB7XG5cdFx0Y29uc29sZS5sb2coYCAke2VudHJ5WzFdICE9IG51bGwgPyAnKycgOiAnLSd9ICR7ZW50cnlbMF19ICR7ZW50cnlbMV0gfHwgJyd9YCk7XG5cdH1cblx0cmV0dXJuIG5ld0FkZHMubGVuZ3RoID4gMCB8fCBwYWNrYWdlSnNvbkd1YXJkZXIuaXNNb2R1bGVzQ2hhbmdlZCgpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzQ21kKHZlcnNpb25UZXh0OiBhbnkpIHtcblx0Y29uc29sZS5sb2codmVyc2lvblRleHQpO1xuXHRyZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblx0cmV0dXJuIHJlcXVpcmUoJy4uL2xpYi9jbWQtYXJncycpLmRyY3BDb21tYW5kKHN0YXJ0VGltZSk7XG59XG5cblxuIl19