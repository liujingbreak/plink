#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:no-console */
require('source-map-support/register');
const Path = __importStar(require("path"));
const os = require("os");
const fs_1 = __importDefault(require("fs"));
const node_version_check_1 = __importDefault(require("./utils/node-version-check"));
// import checkSymlinks from './utils/symlinks';
// import {removeProjectSymlink} from './project-dir';
// const versionChecker = require('../lib/versionChecker');
// import {getInstance as getGuarder} from './package-json-guarder';
// const drcpPkJson = require('../../package.json');
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
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield node_version_check_1.default();
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
        yield ensurePackageJsonFile();
        yield processCmd();
        // }
        /**
         * @param {*} isDrcpDevMode denote true to copy dr-comp-package dependency list to workspace package.json file
         * @return true if workspace package.json file is changed
         */
        function ensurePackageJsonFile( /*isDrcpDevMode: boolean*/) {
            var workspaceJson;
            var needCreateFile = false;
            var backupJson = null;
            // var needInstall = false;
            if (fs_1.default.existsSync('dr.backup.package.json')) {
                console.log('Found "dr.backup.package.json", will recover package.json from dr.backup.package.json');
                fs_1.default.unlinkSync('package.json');
                fs_1.default.renameSync('dr.backup.package.json', 'package.json');
            }
            if (!fs_1.default.existsSync('package.json')) {
                console.log('Creating package.json');
                needCreateFile = true;
                workspaceJson = JSON.parse(fs_1.default.readFileSync(Path.resolve(__dirname, '../templates/package.json.template'), 'utf8'));
                workspaceJson.author = os.userInfo().username;
                workspaceJson.name = Path.basename(cwd);
                workspaceJson.description = '@dr monorepo workspace';
                backupJson = JSON.stringify(workspaceJson, null, '  ');
            }
            else {
                workspaceJson = JSON.parse(fs_1.default.readFileSync('package.json', 'utf8'));
            }
            if (!workspaceJson.dependencies)
                workspaceJson.dependencies = {};
            // if (isDrcpDevMode) {
            //   needInstall = needInstallWfh(workspaceJson);
            // }
            if (needCreateFile)
                fs_1.default.writeFileSync(Path.join(cwd, 'package.json'), backupJson);
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
        function processCmd() {
            return __awaiter(this, void 0, void 0, function* () {
                (yield Promise.resolve().then(() => __importStar(require('./cmd/cli')))).drcpCommand(startTime);
            });
        }
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUN2QywyQ0FBNkI7QUFDN0IseUJBQTBCO0FBQzFCLDRDQUFvQjtBQUNwQixvRkFBbUQ7QUFDbkQsZ0RBQWdEO0FBRWhELHNEQUFzRDtBQUN0RCwyREFBMkQ7QUFDM0Qsb0VBQW9FO0FBRXBFLG9EQUFvRDtBQUNwRCxrRUFBa0U7QUFFbEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7SUFDaEMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQyxDQUFDLENBQUM7QUFFSCxDQUFDLFNBQWUsR0FBRzs7UUFDakIsTUFBTSw0QkFBUyxFQUFFLENBQUM7UUFDbEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsOENBQThDO1FBQzlDLDZFQUE2RTtRQUU3RSx3RkFBd0Y7UUFDeEYsMkJBQTJCO1FBQzNCLG1DQUFtQztRQUNuQyw0RkFBNEY7UUFDNUYsMkVBQTJFO1FBRTNFLDRG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LENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSAqL1xucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IG9zID0gcmVxdWlyZSgnb3MnKTtcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbi8vIGltcG9ydCBjaGVja1N5bWxpbmtzIGZyb20gJy4vdXRpbHMvc3ltbGlua3MnO1xuXG4vLyBpbXBvcnQge3JlbW92ZVByb2plY3RTeW1saW5rfSBmcm9tICcuL3Byb2plY3QtZGlyJztcbi8vIGNvbnN0IHZlcnNpb25DaGVja2VyID0gcmVxdWlyZSgnLi4vbGliL3ZlcnNpb25DaGVja2VyJyk7XG4vLyBpbXBvcnQge2dldEluc3RhbmNlIGFzIGdldEd1YXJkZXJ9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuXG4vLyBjb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJyk7XG4vLyBjb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxucHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdSZWNpZXZlIFNJR0lOVCwgYnllLicpO1xuICBwcm9jZXNzLmV4aXQoMCk7XG59KTtcbnByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgIGNvbnNvbGUubG9nKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH1cbn0pO1xuXG4oYXN5bmMgZnVuY3Rpb24gcnVuKCkge1xuICBhd2FpdCBjaGVja05vZGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIC8vIGNvbnN0IHBhY2thZ2VKc29uR3VhcmRlciA9IGdldEd1YXJkZXIoY3dkKTtcbiAgLy8gcHJvY2Vzcy5lbnYuU0FTU19CSU5BUllfU0lURSA9ICdodHRwczovL25wbS50YW9iYW8ub3JnL21pcnJvcnMvbm9kZS1zYXNzJztcblxuICAvLyBpZiAoZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpKS5pc1N5bWJvbGljTGluaygpKSB7XG4gIC8vICAgYXdhaXQgY2hlY2tTeW1saW5rcygpO1xuICAvLyAgIGF3YWl0IGVuc3VyZVBhY2thZ2VKc29uRmlsZSgpO1xuICAvLyAgIHJlcXVpcmUoJy4uL2xpYi9ndWxwL2NsaScpLndyaXRlUHJvamVjdExpc3RGaWxlKFtQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nKV0pO1xuICAvLyAgIC8vIC50aGVuKGxhdGVzdFJlY2lwZSA9PiB2ZXJzaW9uQ2hlY2tlci5jaGVja1ZlcnNpb25zKGlzU3ltYm9saWNMaW5rKSlcblxuICAvLyAgIHJlcXVpcmUoJy4uL2xpYi9ndWxwL2NsaScpLndyaXRlUHJvamVjdExpc3RGaWxlKFtQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nKV0pO1xuICAvLyAgIHByb2Nlc3NDbWQoKTtcbiAgLy8gfSBlbHNlIHtcbiAgYXdhaXQgZW5zdXJlUGFja2FnZUpzb25GaWxlKCk7XG4gIGF3YWl0IHByb2Nlc3NDbWQoKTtcbiAgLy8gfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGlzRHJjcERldk1vZGUgZGVub3RlIHRydWUgdG8gY29weSBkci1jb21wLXBhY2thZ2UgZGVwZW5kZW5jeSBsaXN0IHRvIHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZVxuICAgKiBAcmV0dXJuIHRydWUgaWYgd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlIGlzIGNoYW5nZWRcbiAgICovXG4gIGZ1bmN0aW9uIGVuc3VyZVBhY2thZ2VKc29uRmlsZSgvKmlzRHJjcERldk1vZGU6IGJvb2xlYW4qLykge1xuICAgIHZhciB3b3Jrc3BhY2VKc29uO1xuICAgIHZhciBuZWVkQ3JlYXRlRmlsZSA9IGZhbHNlO1xuICAgIHZhciBiYWNrdXBKc29uID0gbnVsbDtcbiAgICAvLyB2YXIgbmVlZEluc3RhbGwgPSBmYWxzZTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYygnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpKSB7XG4gICAgICBjb25zb2xlLmxvZygnRm91bmQgXCJkci5iYWNrdXAucGFja2FnZS5qc29uXCIsIHdpbGwgcmVjb3ZlciBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gICAgICBmcy51bmxpbmtTeW5jKCdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGZzLnJlbmFtZVN5bmMoJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nLCAncGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGlmICghZnMuZXhpc3RzU3luYygncGFja2FnZS5qc29uJykpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyBwYWNrYWdlLmpzb24nKTtcbiAgICAgIG5lZWRDcmVhdGVGaWxlID0gdHJ1ZTtcbiAgICAgIHdvcmtzcGFjZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhcbiAgICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3RlbXBsYXRlcy9wYWNrYWdlLmpzb24udGVtcGxhdGUnKSwgJ3V0ZjgnKSk7XG4gICAgICB3b3Jrc3BhY2VKc29uLmF1dGhvciA9IG9zLnVzZXJJbmZvKCkudXNlcm5hbWU7XG4gICAgICB3b3Jrc3BhY2VKc29uLm5hbWUgPSBQYXRoLmJhc2VuYW1lKGN3ZCk7XG4gICAgICB3b3Jrc3BhY2VKc29uLmRlc2NyaXB0aW9uID0gJ0BkciBtb25vcmVwbyB3b3Jrc3BhY2UnO1xuICAgICAgYmFja3VwSnNvbiA9IEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZUpzb24sIG51bGwsICcgICcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3b3Jrc3BhY2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsICd1dGY4JykpO1xuICAgIH1cbiAgICBpZiAoIXdvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzKVxuICAgICAgd29ya3NwYWNlSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAvLyBpZiAoaXNEcmNwRGV2TW9kZSkge1xuICAgIC8vICAgbmVlZEluc3RhbGwgPSBuZWVkSW5zdGFsbFdmaCh3b3Jrc3BhY2VKc29uKTtcbiAgICAvLyB9XG4gICAgaWYgKG5lZWRDcmVhdGVGaWxlKVxuICAgICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLmpvaW4oY3dkLCAncGFja2FnZS5qc29uJyksIGJhY2t1cEpzb24pO1xuICAgIC8vIGlmIChuZWVkSW5zdGFsbCkge1xuICAgIC8vICAgcmVtb3ZlUHJvamVjdFN5bWxpbmsoaXNEcmNwRGV2TW9kZSk7XG4gICAgLy8gICBwYWNrYWdlSnNvbkd1YXJkZXIuYmVmb3JlQ2hhbmdlKCk7XG4gICAgLy8gICByZXR1cm4gcGFja2FnZUpzb25HdWFyZGVyLmluc3RhbGxBc3luYyhmYWxzZSwgcHJvY2Vzcy5hcmd2LnNvbWUoYXJnID0+IGFyZyA9PT0gJy0teWFybicpLFxuICAgIC8vICAgICBwcm9jZXNzLmFyZ3Yuc29tZShhcmcgPT4gYXJnID09PSAnLS1vZmZsaW5lJykpXG4gICAgLy8gICAudGhlbigoKSA9PiBwYWNrYWdlSnNvbkd1YXJkZXIuYWZ0ZXJDaGFuZ2UoKSlcbiAgICAvLyAgIC5jYXRjaChlcnIgPT4ge1xuICAgIC8vICAgICBwYWNrYWdlSnNvbkd1YXJkZXIuYWZ0ZXJDaGFuZ2VGYWlsKCk7XG4gICAgLy8gICAgIHRocm93IGVycjtcbiAgICAvLyAgIH0pO1xuICAgIC8vIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICAvLyBmdW5jdGlvbiBuZWVkSW5zdGFsbFdmaCh3b3Jrc3BhY2VKc29uOiBhbnkpIHtcbiAgLy8gICBjb25zdCBuZXdXb3Jrc3BhY2VKc29uID0gT2JqZWN0LmFzc2lnbih7fSwgd29ya3NwYWNlSnNvbik7XG4gIC8vICAgY29uc3QgZHJQYWNrYWdlSnNvbiA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCk7XG4gIC8vICAgbmV3V29ya3NwYWNlSnNvbi5kZXBlbmRlbmNpZXMgPSB7XG4gIC8vICAgICAuLi5kcmNwUGtKc29uLmRlcGVuZGVuY2llcyxcbiAgLy8gICAgIC4uLmRyUGFja2FnZUpzb24uZGVwZW5kZW5jaWVzXG4gIC8vICAgfTtcbiAgLy8gICBuZXdXb3Jrc3BhY2VKc29uLmRldkRlcGVuZGVuY2llcyA9IHtcbiAgLy8gICAgIC4uLmRyY3BQa0pzb24uZGV2RGVwZW5kZW5jaWVzLFxuICAvLyAgICAgLi4uZHJQYWNrYWdlSnNvbi5kZXZEZXBlbmRlbmNpZXMsXG4gIC8vICAgICAuLi5kcmNwUGtKc29uLnBlZXJEZXBlbmRlbmNpZXNcbiAgLy8gICB9O1xuXG4gIC8vICAgY29uc3QgbmV3QWRkcyA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhuZXdXb3Jrc3BhY2VKc29uKTtcbiAgLy8gICBmb3IgKGNvbnN0IGVudHJ5IG9mIG5ld0FkZHMpIHtcbiAgLy8gICAgIGNvbnNvbGUubG9nKGBbY21kLWJvb3RzdHJhcF0gJHtlbnRyeVsxXSAhPSBudWxsID8gJysnIDogJy0nfSAke2VudHJ5WzBdfSAke2VudHJ5WzFdIHx8ICcnfWApO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gbmV3QWRkcy5sZW5ndGggPiAwIHx8IHBhY2thZ2VKc29uR3VhcmRlci5pc01vZHVsZXNDaGFuZ2VkKCk7XG4gIC8vIH1cblxuICBhc3luYyBmdW5jdGlvbiBwcm9jZXNzQ21kKCkge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY21kL2NsaScpKS5kcmNwQ29tbWFuZChzdGFydFRpbWUpO1xuICB9XG59KSgpLmNhdGNoKGVyciA9PiB7XG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19