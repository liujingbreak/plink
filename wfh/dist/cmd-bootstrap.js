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
const node_version_check_1 = __importDefault(require("./utils/node-version-check"));
const symlinks_1 = __importDefault(require("./utils/symlinks"));
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
node_version_check_1.default().then((nodeIsOk) => {
    const startTime = new Date().getTime();
    const cwd = process.cwd();
    const packageJsonGuarder = package_json_guarder_1.getInstance(cwd);
    // process.env.SASS_BINARY_SITE = 'https://npm.taobao.org/mirrors/node-sass';
    var isSymbolicLink = false;
    var cmdPromise;
    if (fs_1.default.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink()) {
        isSymbolicLink = true;
        symlinks_1.default();
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
})
    .catch(err => {
    console.log(err);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IseUJBQTBCO0FBQzFCLDRDQUFvQjtBQUNwQixvRkFBbUQ7QUFDbkQsZ0VBQTZDO0FBRTdDLCtDQUFtRDtBQUNuRCwyREFBMkQ7QUFDM0QsaUVBQWlFO0FBRWpFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2pELGtFQUFrRTtBQUVsRSxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQztBQUNILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztJQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7UUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakI7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVILDRCQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtJQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixNQUFNLGtCQUFrQixHQUFHLGtDQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsNkVBQTZFO0lBRTdFLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQztJQUMzQixJQUFJLFVBQVUsQ0FBQztJQUNmLElBQUksWUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7UUFDbEYsY0FBYyxHQUFHLElBQUksQ0FBQztRQUN0QixrQkFBYSxFQUFFLENBQUM7UUFDaEIsVUFBVSxHQUFHLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztZQUNsRCxzRUFBc0U7YUFDckUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQzthQUNkLElBQUksQ0FBRSxRQUFRLENBQUMsRUFBRTtZQUNoQixPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkYsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDekM7U0FBTTtRQUNMLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3RELHNFQUFzRTthQUN2RSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztLQUN6QztJQUNELFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDbkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBRUg7OztPQUdHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxhQUFzQjtRQUNuRCxJQUFJLGFBQWEsQ0FBQztRQUNsQixJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDM0IsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsRUFBRTtZQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVGQUF1RixDQUFDLENBQUM7WUFDckcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM5QixZQUFFLENBQUMsVUFBVSxDQUFDLHdCQUF3QixFQUFFLGNBQWMsQ0FBQyxDQUFDO1NBQ3pEO1FBQ0QsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ3JDLGNBQWMsR0FBRyxJQUFJLENBQUM7WUFDdEIsYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FDeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLGFBQWEsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUM5QyxhQUFhLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEMsYUFBYSxDQUFDLFdBQVcsR0FBRyxzQ0FBc0MsQ0FBQztZQUNuRSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3hEO2FBQU07WUFDTCxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ3JFO1FBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZO1lBQzdCLGFBQWEsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLElBQUksYUFBYSxFQUFFO1lBQ2pCLFdBQVcsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDN0M7UUFDRCxJQUFJLGNBQWM7WUFDaEIsWUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMvRCxJQUFJLFdBQVcsRUFBRTtZQUNmLGtDQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3BDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xDLE9BQU8sa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxRQUFRLENBQUMsRUFDdEYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssV0FBVyxDQUFDLENBQUM7aUJBQy9DLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztpQkFDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNYLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLEdBQUcsQ0FBQztZQUNaLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsYUFBa0I7UUFDeEMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMxRCxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUM7UUFDOUQsZ0JBQWdCLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFckYsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDakUsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUU7WUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMvRTtRQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0lBRUQsU0FBUyxVQUFVLENBQUMsV0FBZ0I7UUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6QixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUN2QyxPQUFPLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMzRCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0tBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNuQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgKi9cbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgb3MgPSByZXF1aXJlKCdvcycpO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGVja05vZGUgZnJvbSAnLi91dGlscy9ub2RlLXZlcnNpb24tY2hlY2snO1xuaW1wb3J0IGNoZWNrU3ltbGlua3MgZnJvbSAnLi91dGlscy9zeW1saW5rcyc7XG5cbmltcG9ydCB7cmVtb3ZlUHJvamVjdFN5bWxpbmt9IGZyb20gJy4vcHJvamVjdC1kaXInO1xuLy8gY29uc3QgdmVyc2lvbkNoZWNrZXIgPSByZXF1aXJlKCcuLi9saWIvdmVyc2lvbkNoZWNrZXInKTtcbmltcG9ydCB7Z2V0SW5zdGFuY2UgYXMgZ2V0R3VhcmRlcn0gZnJvbSAnLi9wYWNrYWdlLWpzb24tZ3VhcmRlcic7XG5cbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKTtcbi8vIGNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5wcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gIHByb2Nlc3MuZXhpdCgwKTtcbn0pO1xucHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMiwgYnllLicpO1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgfVxufSk7XG5cbmNoZWNrTm9kZSgpLnRoZW4oKG5vZGVJc09rKSA9PiB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBwYWNrYWdlSnNvbkd1YXJkZXIgPSBnZXRHdWFyZGVyKGN3ZCk7XG4gIC8vIHByb2Nlc3MuZW52LlNBU1NfQklOQVJZX1NJVEUgPSAnaHR0cHM6Ly9ucG0udGFvYmFvLm9yZy9taXJyb3JzL25vZGUtc2Fzcyc7XG5cbiAgdmFyIGlzU3ltYm9saWNMaW5rID0gZmFsc2U7XG4gIHZhciBjbWRQcm9taXNlO1xuICBpZiAoZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgaXNTeW1ib2xpY0xpbmsgPSB0cnVlO1xuICAgIGNoZWNrU3ltbGlua3MoKTtcbiAgICBjbWRQcm9taXNlID0gZW5zdXJlUGFja2FnZUpzb25GaWxlKGlzU3ltYm9saWNMaW5rKVxuICAgIC8vIC50aGVuKGxhdGVzdFJlY2lwZSA9PiB2ZXJzaW9uQ2hlY2tlci5jaGVja1ZlcnNpb25zKGlzU3ltYm9saWNMaW5rKSlcbiAgICAudGhlbigoKSA9PiAnJylcbiAgICAudGhlbiggaW5mb1RleHQgPT4ge1xuICAgICAgcmVxdWlyZSgnLi4vbGliL2d1bHAvY2xpJykud3JpdGVQcm9qZWN0TGlzdEZpbGUoW1BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicpXSk7XG4gICAgICByZXR1cm4gaW5mb1RleHQ7XG4gICAgfSlcbiAgICAudGhlbihpbmZvVGV4dCA9PiBwcm9jZXNzQ21kKGluZm9UZXh0KSk7XG4gIH0gZWxzZSB7XG4gICAgY21kUHJvbWlzZSA9IGVuc3VyZVBhY2thZ2VKc29uRmlsZShmYWxzZSkudGhlbigoKSA9PiAnJylcbiAgICAgIC8vIC50aGVuKGxhdGVzdFJlY2lwZSA9PiB2ZXJzaW9uQ2hlY2tlci5jaGVja1ZlcnNpb25zKGlzU3ltYm9saWNMaW5rKSlcbiAgICAudGhlbihpbmZvVGV4dCA9PiBwcm9jZXNzQ21kKGluZm9UZXh0KSk7XG4gIH1cbiAgY21kUHJvbWlzZS5jYXRjaChlID0+IHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gaXNEcmNwRGV2TW9kZSBkZW5vdGUgdHJ1ZSB0byBjb3B5IGRyLWNvbXAtcGFja2FnZSBkZXBlbmRlbmN5IGxpc3QgdG8gd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlXG4gICAqIEByZXR1cm4gdHJ1ZSBpZiB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUgaXMgY2hhbmdlZFxuICAgKi9cbiAgZnVuY3Rpb24gZW5zdXJlUGFja2FnZUpzb25GaWxlKGlzRHJjcERldk1vZGU6IGJvb2xlYW4pIHtcbiAgICB2YXIgd29ya3NwYWNlSnNvbjtcbiAgICB2YXIgbmVlZENyZWF0ZUZpbGUgPSBmYWxzZTtcbiAgICB2YXIgYmFja3VwSnNvbiA9IG51bGw7XG4gICAgdmFyIG5lZWRJbnN0YWxsID0gZmFsc2U7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKSkge1xuICAgICAgY29uc29sZS5sb2coJ0ZvdW5kIFwiZHIuYmFja3VwLnBhY2thZ2UuanNvblwiLCB3aWxsIHJlY292ZXIgcGFja2FnZS5qc29uIGZyb20gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICAgICAgZnMudW5saW5rU3luYygncGFja2FnZS5qc29uJyk7XG4gICAgICBmcy5yZW5hbWVTeW5jKCdkci5iYWNrdXAucGFja2FnZS5qc29uJywgJ3BhY2thZ2UuanNvbicpO1xuICAgIH1cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgICBjb25zb2xlLmxvZygnQ3JlYXRpbmcgcGFja2FnZS5qc29uJyk7XG4gICAgICBuZWVkQ3JlYXRlRmlsZSA9IHRydWU7XG4gICAgICB3b3Jrc3BhY2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoXG4gICAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9iaW4vcGFja2FnZS5qc29uLnRlbXBsYXRlJyksICd1dGY4JykpO1xuICAgICAgd29ya3NwYWNlSnNvbi5hdXRob3IgPSBvcy51c2VySW5mbygpLnVzZXJuYW1lO1xuICAgICAgd29ya3NwYWNlSnNvbi5uYW1lID0gUGF0aC5iYXNlbmFtZShjd2QpO1xuICAgICAgd29ya3NwYWNlSnNvbi5kZXNjcmlwdGlvbiA9ICdAZHIgd2ViIGNvbXBvbmVudCBwbGF0Zm9ybSB3b3Jrc3BhY2UnO1xuICAgICAgYmFja3VwSnNvbiA9IEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZUpzb24sIG51bGwsICcgICcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3Jrc3BhY2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsICd1dGY4JykpO1xuICAgIH1cbiAgICBpZiAoIXdvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzKVxuICAgICAgd29ya3NwYWNlSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICBpZiAoaXNEcmNwRGV2TW9kZSkge1xuICAgICAgbmVlZEluc3RhbGwgPSBuZWVkSW5zdGFsbFdmaCh3b3Jrc3BhY2VKc29uKTtcbiAgICB9XG4gICAgaWYgKG5lZWRDcmVhdGVGaWxlKVxuICAgICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLmpvaW4oY3dkLCAncGFja2FnZS5qc29uJyksIGJhY2t1cEpzb24pO1xuICAgIGlmIChuZWVkSW5zdGFsbCkge1xuICAgICAgcmVtb3ZlUHJvamVjdFN5bWxpbmsoaXNEcmNwRGV2TW9kZSk7XG4gICAgICBwYWNrYWdlSnNvbkd1YXJkZXIuYmVmb3JlQ2hhbmdlKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUpzb25HdWFyZGVyLmluc3RhbGxBc3luYyhmYWxzZSwgcHJvY2Vzcy5hcmd2LnNvbWUoYXJnID0+IGFyZyA9PT0gJy0teWFybicpLFxuICAgICAgICBwcm9jZXNzLmFyZ3Yuc29tZShhcmcgPT4gYXJnID09PSAnLS1vZmZsaW5lJykpXG4gICAgICAudGhlbigoKSA9PiBwYWNrYWdlSnNvbkd1YXJkZXIuYWZ0ZXJDaGFuZ2UoKSlcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICBwYWNrYWdlSnNvbkd1YXJkZXIuYWZ0ZXJDaGFuZ2VGYWlsKCk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBuZWVkSW5zdGFsbFdmaCh3b3Jrc3BhY2VKc29uOiBhbnkpIHtcbiAgICBjb25zdCBuZXdXb3Jrc3BhY2VKc29uID0gT2JqZWN0LmFzc2lnbih7fSwgd29ya3NwYWNlSnNvbik7XG4gICAgY29uc3QgY3VyckRlcHMgPSBwYWNrYWdlSnNvbkd1YXJkZXIuZ2V0Q2hhbmdlcygpLmRlcGVuZGVuY2llcztcbiAgICBuZXdXb3Jrc3BhY2VKc29uLmRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIGRyY3BQa0pzb24uZGVwZW5kZW5jaWVzLCBjdXJyRGVwcyk7XG5cbiAgICBjb25zdCBuZXdBZGRzID0gcGFja2FnZUpzb25HdWFyZGVyLm1hcmtDaGFuZ2VzKG5ld1dvcmtzcGFjZUpzb24pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgbmV3QWRkcykge1xuICAgICAgY29uc29sZS5sb2coYCAke2VudHJ5WzFdICE9IG51bGwgPyAnKycgOiAnLSd9ICR7ZW50cnlbMF19ICR7ZW50cnlbMV0gfHwgJyd9YCk7XG4gICAgfVxuICAgIHJldHVybiBuZXdBZGRzLmxlbmd0aCA+IDAgfHwgcGFja2FnZUpzb25HdWFyZGVyLmlzTW9kdWxlc0NoYW5nZWQoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NDbWQodmVyc2lvblRleHQ6IGFueSkge1xuICAgIGNvbnNvbGUubG9nKHZlcnNpb25UZXh0KTtcbiAgICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcbiAgICByZXR1cm4gcmVxdWlyZSgnLi4vbGliL2NtZC1hcmdzJykuZHJjcENvbW1hbmQoc3RhcnRUaW1lKTtcbiAgfVxufSlcbi5jYXRjaChlcnIgPT4ge1xuICBjb25zb2xlLmxvZyhlcnIpO1xufSk7XG4iXX0=