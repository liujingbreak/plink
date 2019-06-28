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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IseUJBQTBCO0FBQzFCLDRDQUFvQjtBQUNwQiwrQ0FBbUQ7QUFDbkQsMkRBQTJEO0FBQzNELGlFQUFpRTtBQUVqRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUNqRCxrRUFBa0U7QUFFbEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7SUFDaEMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLGtCQUFrQixHQUFHLGtDQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0MsNkVBQTZFO0FBRTdFLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQztBQUMzQixJQUFJLFVBQVUsQ0FBQztBQUNmLElBQUksWUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENB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Q0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDL0U7SUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFDckUsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLFdBQWdCO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDdkMsT0FBTyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDM0QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgb3MgPSByZXF1aXJlKCdvcycpO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cmVtb3ZlUHJvamVjdFN5bWxpbmt9IGZyb20gJy4vcHJvamVjdC1kaXInO1xuLy8gY29uc3QgdmVyc2lvbkNoZWNrZXIgPSByZXF1aXJlKCcuLi9saWIvdmVyc2lvbkNoZWNrZXInKTtcbmltcG9ydCB7Z2V0SW5zdGFuY2UgYXMgZ2V0R3VhcmRlcn0gZnJvbSAnLi9wYWNrYWdlLWpzb24tZ3VhcmRlcic7XG5cbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKTtcbi8vIGNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5wcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gIHByb2Nlc3MuZXhpdCgwKTtcbn0pO1xucHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMiwgYnllLicpO1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgfVxufSk7XG5jb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5jb25zdCBwYWNrYWdlSnNvbkd1YXJkZXIgPSBnZXRHdWFyZGVyKGN3ZCk7XG4vLyBwcm9jZXNzLmVudi5TQVNTX0JJTkFSWV9TSVRFID0gJ2h0dHBzOi8vbnBtLnRhb2Jhby5vcmcvbWlycm9ycy9ub2RlLXNhc3MnO1xuXG52YXIgaXNTeW1ib2xpY0xpbmsgPSBmYWxzZTtcbnZhciBjbWRQcm9taXNlO1xuaWYgKGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICBpc1N5bWJvbGljTGluayA9IHRydWU7XG4gIGNtZFByb21pc2UgPSBlbnN1cmVQYWNrYWdlSnNvbkZpbGUoaXNTeW1ib2xpY0xpbmspXG4gIC8vIC50aGVuKGxhdGVzdFJlY2lwZSA9PiB2ZXJzaW9uQ2hlY2tlci5jaGVja1ZlcnNpb25zKGlzU3ltYm9saWNMaW5rKSlcbiAgLnRoZW4oKCkgPT4gJycpXG4gIC50aGVuKCBpbmZvVGV4dCA9PiB7XG4gICAgcmVxdWlyZSgnLi4vbGliL2d1bHAvY2xpJykud3JpdGVQcm9qZWN0TGlzdEZpbGUoW1BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicpXSk7XG4gICAgcmV0dXJuIGluZm9UZXh0O1xuICB9KVxuICAudGhlbihpbmZvVGV4dCA9PiBwcm9jZXNzQ21kKGluZm9UZXh0KSk7XG59IGVsc2Uge1xuICBjbWRQcm9taXNlID0gZW5zdXJlUGFja2FnZUpzb25GaWxlKGZhbHNlKS50aGVuKCgpID0+ICcnKVxuICAgIC8vIC50aGVuKGxhdGVzdFJlY2lwZSA9PiB2ZXJzaW9uQ2hlY2tlci5jaGVja1ZlcnNpb25zKGlzU3ltYm9saWNMaW5rKSlcbiAgLnRoZW4oaW5mb1RleHQgPT4gcHJvY2Vzc0NtZChpbmZvVGV4dCkpO1xufVxuY21kUHJvbWlzZS5jYXRjaChlID0+IHtcbiAgY29uc29sZS5lcnJvcihlKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG5cbi8qKlxuICogQHBhcmFtIHsqfSBpc0RyY3BEZXZNb2RlIGRlbm90ZSB0cnVlIHRvIGNvcHkgZHItY29tcC1wYWNrYWdlIGRlcGVuZGVuY3kgbGlzdCB0byB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGVcbiAqIEByZXR1cm4gdHJ1ZSBpZiB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUgaXMgY2hhbmdlZFxuICovXG5mdW5jdGlvbiBlbnN1cmVQYWNrYWdlSnNvbkZpbGUoaXNEcmNwRGV2TW9kZTogYm9vbGVhbikge1xuICB2YXIgd29ya3NwYWNlSnNvbjtcbiAgdmFyIG5lZWRDcmVhdGVGaWxlID0gZmFsc2U7XG4gIHZhciBiYWNrdXBKc29uID0gbnVsbDtcbiAgdmFyIG5lZWRJbnN0YWxsID0gZmFsc2U7XG4gIGlmIChmcy5leGlzdHNTeW5jKCdkci5iYWNrdXAucGFja2FnZS5qc29uJykpIHtcbiAgICBjb25zb2xlLmxvZygnRm91bmQgXCJkci5iYWNrdXAucGFja2FnZS5qc29uXCIsIHdpbGwgcmVjb3ZlciBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gICAgZnMudW5saW5rU3luYygncGFja2FnZS5qc29uJyk7XG4gICAgZnMucmVuYW1lU3luYygnZHIuYmFja3VwLnBhY2thZ2UuanNvbicsICdwYWNrYWdlLmpzb24nKTtcbiAgfVxuICBpZiAoIWZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgY29uc29sZS5sb2coJ0NyZWF0aW5nIHBhY2thZ2UuanNvbicpO1xuICAgIG5lZWRDcmVhdGVGaWxlID0gdHJ1ZTtcbiAgICB3b3Jrc3BhY2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoXG4gICAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vYmluL3BhY2thZ2UuanNvbi50ZW1wbGF0ZScpLCAndXRmOCcpKTtcbiAgICB3b3Jrc3BhY2VKc29uLmF1dGhvciA9IG9zLnVzZXJJbmZvKCkudXNlcm5hbWU7XG4gICAgd29ya3NwYWNlSnNvbi5uYW1lID0gUGF0aC5iYXNlbmFtZShjd2QpO1xuICAgIHdvcmtzcGFjZUpzb24uZGVzY3JpcHRpb24gPSAnQGRyIHdlYiBjb21wb25lbnQgcGxhdGZvcm0gd29ya3NwYWNlJztcbiAgICBiYWNrdXBKc29uID0gSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlSnNvbiwgbnVsbCwgJyAgJyk7XG4gIH0gZWxzZSB7XG4gICAgd29ya3NwYWNlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmOCcpKTtcbiAgfVxuICBpZiAoIXdvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzKVxuICAgIHdvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gIGlmIChpc0RyY3BEZXZNb2RlKSB7XG4gICAgbmVlZEluc3RhbGwgPSBuZWVkSW5zdGFsbFdmaCh3b3Jrc3BhY2VKc29uKTtcbiAgfVxuICBpZiAobmVlZENyZWF0ZUZpbGUpXG4gICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLmpvaW4oY3dkLCAncGFja2FnZS5qc29uJyksIGJhY2t1cEpzb24pO1xuICBpZiAobmVlZEluc3RhbGwpIHtcbiAgICByZW1vdmVQcm9qZWN0U3ltbGluayhpc0RyY3BEZXZNb2RlKTtcbiAgICBwYWNrYWdlSnNvbkd1YXJkZXIuYmVmb3JlQ2hhbmdlKCk7XG4gICAgcmV0dXJuIHBhY2thZ2VKc29uR3VhcmRlci5pbnN0YWxsQXN5bmMoZmFsc2UsIHByb2Nlc3MuYXJndi5zb21lKGFyZyA9PiBhcmcgPT09ICctLXlhcm4nKSxcbiAgICAgIHByb2Nlc3MuYXJndi5zb21lKGFyZyA9PiBhcmcgPT09ICctLW9mZmxpbmUnKSlcbiAgICAudGhlbigoKSA9PiBwYWNrYWdlSnNvbkd1YXJkZXIuYWZ0ZXJDaGFuZ2UoKSlcbiAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgIHBhY2thZ2VKc29uR3VhcmRlci5hZnRlckNoYW5nZUZhaWwoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG59XG5cbmZ1bmN0aW9uIG5lZWRJbnN0YWxsV2ZoKHdvcmtzcGFjZUpzb246IGFueSkge1xuICBjb25zdCBuZXdXb3Jrc3BhY2VKc29uID0gT2JqZWN0LmFzc2lnbih7fSwgd29ya3NwYWNlSnNvbik7XG4gIGNvbnN0IGN1cnJEZXBzID0gcGFja2FnZUpzb25HdWFyZGVyLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXM7XG4gIG5ld1dvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZHJjcFBrSnNvbi5kZXBlbmRlbmNpZXMsIGN1cnJEZXBzKTtcblxuICBjb25zdCBuZXdBZGRzID0gcGFja2FnZUpzb25HdWFyZGVyLm1hcmtDaGFuZ2VzKG5ld1dvcmtzcGFjZUpzb24pO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIG5ld0FkZHMpIHtcbiAgICBjb25zb2xlLmxvZyhgICR7ZW50cnlbMV0gIT0gbnVsbCA/ICcrJyA6ICctJ30gJHtlbnRyeVswXX0gJHtlbnRyeVsxXSB8fCAnJ31gKTtcbiAgfVxuICByZXR1cm4gbmV3QWRkcy5sZW5ndGggPiAwIHx8IHBhY2thZ2VKc29uR3VhcmRlci5pc01vZHVsZXNDaGFuZ2VkKCk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NDbWQodmVyc2lvblRleHQ6IGFueSkge1xuICBjb25zb2xlLmxvZyh2ZXJzaW9uVGV4dCk7XG4gIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuICByZXR1cm4gcmVxdWlyZSgnLi4vbGliL2NtZC1hcmdzJykuZHJjcENvbW1hbmQoc3RhcnRUaW1lKTtcbn1cblxuXG4iXX0=