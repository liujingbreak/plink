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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IseUJBQTBCO0FBQzFCLDRDQUFvQjtBQUNwQixvRkFBbUQ7QUFJbkQsK0NBQW1EO0FBQ25ELDJEQUEyRDtBQUMzRCxpRUFBaUU7QUFFakUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDakQsa0VBQWtFO0FBRWxFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO0lBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQjtBQUNILENBQUMsQ0FBQyxDQUFDO0FBRUgsNEJBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO0lBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sa0JBQWtCLEdBQUcsa0NBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyw2RUFBNkU7SUFFN0UsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzNCLElBQUksVUFBVSxDQUFDO0lBQ2YsSUFBSSxZQUFF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Q0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pFLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDL0U7UUFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDckUsQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLFdBQWdCO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdkMsT0FBTyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUMsQ0FBQztLQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IG9zID0gcmVxdWlyZSgnb3MnKTtcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcblxuXG5cbmltcG9ydCB7cmVtb3ZlUHJvamVjdFN5bWxpbmt9IGZyb20gJy4vcHJvamVjdC1kaXInO1xuLy8gY29uc3QgdmVyc2lvbkNoZWNrZXIgPSByZXF1aXJlKCcuLi9saWIvdmVyc2lvbkNoZWNrZXInKTtcbmltcG9ydCB7Z2V0SW5zdGFuY2UgYXMgZ2V0R3VhcmRlcn0gZnJvbSAnLi9wYWNrYWdlLWpzb24tZ3VhcmRlcic7XG5cbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKTtcbi8vIGNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5wcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gIHByb2Nlc3MuZXhpdCgwKTtcbn0pO1xucHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMiwgYnllLicpO1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgfVxufSk7XG5cbmNoZWNrTm9kZSgpLnRoZW4oKG5vZGVJc09rKSA9PiB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBwYWNrYWdlSnNvbkd1YXJkZXIgPSBnZXRHdWFyZGVyKGN3ZCk7XG4gIC8vIHByb2Nlc3MuZW52LlNBU1NfQklOQVJZX1NJVEUgPSAnaHR0cHM6Ly9ucG0udGFvYmFvLm9yZy9taXJyb3JzL25vZGUtc2Fzcyc7XG5cbiAgdmFyIGlzU3ltYm9saWNMaW5rID0gZmFsc2U7XG4gIHZhciBjbWRQcm9taXNlO1xuICBpZiAoZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgaXNTeW1ib2xpY0xpbmsgPSB0cnVlO1xuICAgIGNtZFByb21pc2UgPSBlbnN1cmVQYWNrYWdlSnNvbkZpbGUoaXNTeW1ib2xpY0xpbmspXG4gICAgLy8gLnRoZW4obGF0ZXN0UmVjaXBlID0+IHZlcnNpb25DaGVja2VyLmNoZWNrVmVyc2lvbnMoaXNTeW1ib2xpY0xpbmspKVxuICAgIC50aGVuKCgpID0+ICcnKVxuICAgIC50aGVuKCBpbmZvVGV4dCA9PiB7XG4gICAgICByZXF1aXJlKCcuLi9saWIvZ3VscC9jbGknKS53cml0ZVByb2plY3RMaXN0RmlsZShbUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJyldKTtcbiAgICAgIHJldHVybiBpbmZvVGV4dDtcbiAgICB9KVxuICAgIC50aGVuKGluZm9UZXh0ID0+IHByb2Nlc3NDbWQoaW5mb1RleHQpKTtcbiAgfSBlbHNlIHtcbiAgICBjbWRQcm9taXNlID0gZW5zdXJlUGFja2FnZUpzb25GaWxlKGZhbHNlKS50aGVuKCgpID0+ICcnKVxuICAgICAgLy8gLnRoZW4obGF0ZXN0UmVjaXBlID0+IHZlcnNpb25DaGVja2VyLmNoZWNrVmVyc2lvbnMoaXNTeW1ib2xpY0xpbmspKVxuICAgIC50aGVuKGluZm9UZXh0ID0+IHByb2Nlc3NDbWQoaW5mb1RleHQpKTtcbiAgfVxuICBjbWRQcm9taXNlLmNhdGNoKGUgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9KTtcblxuICAvKipcbiAgICogQHBhcmFtIHsqfSBpc0RyY3BEZXZNb2RlIGRlbm90ZSB0cnVlIHRvIGNvcHkgZHItY29tcC1wYWNrYWdlIGRlcGVuZGVuY3kgbGlzdCB0byB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGVcbiAgICogQHJldHVybiB0cnVlIGlmIHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZSBpcyBjaGFuZ2VkXG4gICAqL1xuICBmdW5jdGlvbiBlbnN1cmVQYWNrYWdlSnNvbkZpbGUoaXNEcmNwRGV2TW9kZTogYm9vbGVhbikge1xuICAgIHZhciB3b3Jrc3BhY2VKc29uO1xuICAgIHZhciBuZWVkQ3JlYXRlRmlsZSA9IGZhbHNlO1xuICAgIHZhciBiYWNrdXBKc29uID0gbnVsbDtcbiAgICB2YXIgbmVlZEluc3RhbGwgPSBmYWxzZTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYygnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpKSB7XG4gICAgICBjb25zb2xlLmxvZygnRm91bmQgXCJkci5iYWNrdXAucGFja2FnZS5qc29uXCIsIHdpbGwgcmVjb3ZlciBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gICAgICBmcy51bmxpbmtTeW5jKCdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGZzLnJlbmFtZVN5bmMoJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nLCAncGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGlmICghZnMuZXhpc3RzU3luYygncGFja2FnZS5qc29uJykpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyBwYWNrYWdlLmpzb24nKTtcbiAgICAgIG5lZWRDcmVhdGVGaWxlID0gdHJ1ZTtcbiAgICAgIHdvcmtzcGFjZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhcbiAgICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL2Jpbi9wYWNrYWdlLmpzb24udGVtcGxhdGUnKSwgJ3V0ZjgnKSk7XG4gICAgICB3b3Jrc3BhY2VKc29uLmF1dGhvciA9IG9zLnVzZXJJbmZvKCkudXNlcm5hbWU7XG4gICAgICB3b3Jrc3BhY2VKc29uLm5hbWUgPSBQYXRoLmJhc2VuYW1lKGN3ZCk7XG4gICAgICB3b3Jrc3BhY2VKc29uLmRlc2NyaXB0aW9uID0gJ0BkciB3ZWIgY29tcG9uZW50IHBsYXRmb3JtIHdvcmtzcGFjZSc7XG4gICAgICBiYWNrdXBKc29uID0gSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtzcGFjZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0ZjgnKSk7XG4gICAgfVxuICAgIGlmICghd29ya3NwYWNlSnNvbi5kZXBlbmRlbmNpZXMpXG4gICAgICB3b3Jrc3BhY2VKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgIGlmIChpc0RyY3BEZXZNb2RlKSB7XG4gICAgICBuZWVkSW5zdGFsbCA9IG5lZWRJbnN0YWxsV2ZoKHdvcmtzcGFjZUpzb24pO1xuICAgIH1cbiAgICBpZiAobmVlZENyZWF0ZUZpbGUpXG4gICAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGguam9pbihjd2QsICdwYWNrYWdlLmpzb24nKSwgYmFja3VwSnNvbik7XG4gICAgaWYgKG5lZWRJbnN0YWxsKSB7XG4gICAgICByZW1vdmVQcm9qZWN0U3ltbGluayhpc0RyY3BEZXZNb2RlKTtcbiAgICAgIHBhY2thZ2VKc29uR3VhcmRlci5iZWZvcmVDaGFuZ2UoKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSnNvbkd1YXJkZXIuaW5zdGFsbEFzeW5jKGZhbHNlLCBwcm9jZXNzLmFyZ3Yuc29tZShhcmcgPT4gYXJnID09PSAnLS15YXJuJyksXG4gICAgICAgIHByb2Nlc3MuYXJndi5zb21lKGFyZyA9PiBhcmcgPT09ICctLW9mZmxpbmUnKSlcbiAgICAgIC50aGVuKCgpID0+IHBhY2thZ2VKc29uR3VhcmRlci5hZnRlckNoYW5nZSgpKVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIHBhY2thZ2VKc29uR3VhcmRlci5hZnRlckNoYW5nZUZhaWwoKTtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5lZWRJbnN0YWxsV2ZoKHdvcmtzcGFjZUpzb246IGFueSkge1xuICAgIGNvbnN0IG5ld1dvcmtzcGFjZUpzb24gPSBPYmplY3QuYXNzaWduKHt9LCB3b3Jrc3BhY2VKc29uKTtcbiAgICBjb25zdCBjdXJyRGVwcyA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCkuZGVwZW5kZW5jaWVzO1xuICAgIG5ld1dvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZHJjcFBrSnNvbi5kZXBlbmRlbmNpZXMsIGN1cnJEZXBzKTtcblxuICAgIGNvbnN0IG5ld0FkZHMgPSBwYWNrYWdlSnNvbkd1YXJkZXIubWFya0NoYW5nZXMobmV3V29ya3NwYWNlSnNvbik7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBuZXdBZGRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhgICR7ZW50cnlbMV0gIT0gbnVsbCA/ICcrJyA6ICctJ30gJHtlbnRyeVswXX0gJHtlbnRyeVsxXSB8fCAnJ31gKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld0FkZHMubGVuZ3RoID4gMCB8fCBwYWNrYWdlSnNvbkd1YXJkZXIuaXNNb2R1bGVzQ2hhbmdlZCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc0NtZCh2ZXJzaW9uVGV4dDogYW55KSB7XG4gICAgY29uc29sZS5sb2codmVyc2lvblRleHQpO1xuICAgIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuICAgIHJldHVybiByZXF1aXJlKCcuLi9saWIvY21kLWFyZ3MnKS5kcmNwQ29tbWFuZChzdGFydFRpbWUpO1xuICB9XG59KVxuLmNhdGNoKGVyciA9PiB7XG4gIGNvbnNvbGUubG9nKGVycik7XG59KTtcbiJdfQ==