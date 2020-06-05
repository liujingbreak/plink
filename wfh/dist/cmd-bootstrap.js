#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield node_version_check_1.default();
        const startTime = new Date().getTime();
        const cwd = process.cwd();
        const packageJsonGuarder = package_json_guarder_1.getInstance(cwd);
        // process.env.SASS_BINARY_SITE = 'https://npm.taobao.org/mirrors/node-sass';
        if (fs_1.default.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink()) {
            yield symlinks_1.default();
            yield ensurePackageJsonFile(true);
            require('../lib/gulp/cli').writeProjectListFile([Path.resolve(__dirname, '..', '..')]);
            // .then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))
            require('../lib/gulp/cli').writeProjectListFile([Path.resolve(__dirname, '..', '..')]);
            processCmd();
        }
        else {
            yield ensurePackageJsonFile(false);
            // .then(latestRecipe => versionChecker.checkVersions(isSymbolicLink))
            processCmd();
        }
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
                workspaceJson.description = '@dr monorepo workspace';
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
            const drPackageJson = packageJsonGuarder.getChanges();
            newWorkspaceJson.dependencies = Object.assign({}, drcpPkJson.dependencies, drPackageJson.dependencies);
            newWorkspaceJson.devDependencies = Object.assign({}, drcpPkJson.devDependencies, drPackageJson.devDependencies, drcpPkJson.peerDependencies);
            const newAdds = packageJsonGuarder.markChanges(newWorkspaceJson);
            for (const entry of newAdds) {
                console.log(`[cmd-bootstrap] ${entry[1] != null ? '+' : '-'} ${entry[0]} ${entry[1] || ''}`);
            }
            return newAdds.length > 0 || packageJsonGuarder.isModulesChanged();
        }
        function processCmd() {
            require('source-map-support/register');
            return require('../lib/cmd-args').drcpCommand(startTime);
        }
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLDJDQUE2QjtBQUM3Qix5QkFBMEI7QUFDMUIsNENBQW9CO0FBQ3BCLG9GQUFtRDtBQUNuRCxnRUFBNkM7QUFFN0MsK0NBQW1EO0FBQ25ELDJEQUEyRDtBQUMzRCxpRUFBaUU7QUFFakUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDakQsa0VBQWtFO0FBRWxFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO0lBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQjtBQUNILENBQUMsQ0FBQyxDQUFDO0FBRUgsQ0FBQyxTQUFlLEdBQUc7O1FBQ2pCLE1BQU0sNEJBQVMsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLE1BQU0sa0JBQWtCLEdBQUcsa0NBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyw2RUFBNkU7UUFFN0UsSUFBSSxZQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENB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QUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQzthQUM5RjtZQUNELE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyRSxDQUFDO1FBRUQsU0FBUyxVQUFVO1lBQ2pCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDSCxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSAqL1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBvcyA9IHJlcXVpcmUoJ29zJyk7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoZWNrTm9kZSBmcm9tICcuL3V0aWxzL25vZGUtdmVyc2lvbi1jaGVjayc7XG5pbXBvcnQgY2hlY2tTeW1saW5rcyBmcm9tICcuL3V0aWxzL3N5bWxpbmtzJztcblxuaW1wb3J0IHtyZW1vdmVQcm9qZWN0U3ltbGlua30gZnJvbSAnLi9wcm9qZWN0LWRpcic7XG4vLyBjb25zdCB2ZXJzaW9uQ2hlY2tlciA9IHJlcXVpcmUoJy4uL2xpYi92ZXJzaW9uQ2hlY2tlcicpO1xuaW1wb3J0IHtnZXRJbnN0YW5jZSBhcyBnZXRHdWFyZGVyfSBmcm9tICcuL3BhY2thZ2UtanNvbi1ndWFyZGVyJztcblxuY29uc3QgZHJjcFBrSnNvbiA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpO1xuLy8gY29uc3QgaXNXaW4zMiA9IHJlcXVpcmUoJ29zJykucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5cbnByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnUmVjaWV2ZSBTSUdJTlQsIGJ5ZS4nKTtcbiAgcHJvY2Vzcy5leGl0KDApO1xufSk7XG5wcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gIGlmIChtc2cgPT09ICdzaHV0ZG93bicpIHtcbiAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICB9XG59KTtcblxuKGFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgYXdhaXQgY2hlY2tOb2RlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBwYWNrYWdlSnNvbkd1YXJkZXIgPSBnZXRHdWFyZGVyKGN3ZCk7XG4gIC8vIHByb2Nlc3MuZW52LlNBU1NfQklOQVJZX1NJVEUgPSAnaHR0cHM6Ly9ucG0udGFvYmFvLm9yZy9taXJyb3JzL25vZGUtc2Fzcyc7XG5cbiAgaWYgKGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgIGF3YWl0IGNoZWNrU3ltbGlua3MoKTtcbiAgICBhd2FpdCBlbnN1cmVQYWNrYWdlSnNvbkZpbGUodHJ1ZSk7XG4gICAgcmVxdWlyZSgnLi4vbGliL2d1bHAvY2xpJykud3JpdGVQcm9qZWN0TGlzdEZpbGUoW1BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicpXSk7XG4gICAgLy8gLnRoZW4obGF0ZXN0UmVjaXBlID0+IHZlcnNpb25DaGVja2VyLmNoZWNrVmVyc2lvbnMoaXNTeW1ib2xpY0xpbmspKVxuXG4gICAgcmVxdWlyZSgnLi4vbGliL2d1bHAvY2xpJykud3JpdGVQcm9qZWN0TGlzdEZpbGUoW1BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicpXSk7XG4gICAgcHJvY2Vzc0NtZCgpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IGVuc3VyZVBhY2thZ2VKc29uRmlsZShmYWxzZSk7XG4gICAgICAvLyAudGhlbihsYXRlc3RSZWNpcGUgPT4gdmVyc2lvbkNoZWNrZXIuY2hlY2tWZXJzaW9ucyhpc1N5bWJvbGljTGluaykpXG4gICAgcHJvY2Vzc0NtZCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gaXNEcmNwRGV2TW9kZSBkZW5vdGUgdHJ1ZSB0byBjb3B5IGRyLWNvbXAtcGFja2FnZSBkZXBlbmRlbmN5IGxpc3QgdG8gd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlXG4gICAqIEByZXR1cm4gdHJ1ZSBpZiB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUgaXMgY2hhbmdlZFxuICAgKi9cbiAgZnVuY3Rpb24gZW5zdXJlUGFja2FnZUpzb25GaWxlKGlzRHJjcERldk1vZGU6IGJvb2xlYW4pIHtcbiAgICB2YXIgd29ya3NwYWNlSnNvbjtcbiAgICB2YXIgbmVlZENyZWF0ZUZpbGUgPSBmYWxzZTtcbiAgICB2YXIgYmFja3VwSnNvbiA9IG51bGw7XG4gICAgdmFyIG5lZWRJbnN0YWxsID0gZmFsc2U7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKSkge1xuICAgICAgY29uc29sZS5sb2coJ0ZvdW5kIFwiZHIuYmFja3VwLnBhY2thZ2UuanNvblwiLCB3aWxsIHJlY292ZXIgcGFja2FnZS5qc29uIGZyb20gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICAgICAgZnMudW5saW5rU3luYygncGFja2FnZS5qc29uJyk7XG4gICAgICBmcy5yZW5hbWVTeW5jKCdkci5iYWNrdXAucGFja2FnZS5qc29uJywgJ3BhY2thZ2UuanNvbicpO1xuICAgIH1cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgICBjb25zb2xlLmxvZygnQ3JlYXRpbmcgcGFja2FnZS5qc29uJyk7XG4gICAgICBuZWVkQ3JlYXRlRmlsZSA9IHRydWU7XG4gICAgICB3b3Jrc3BhY2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoXG4gICAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9iaW4vcGFja2FnZS5qc29uLnRlbXBsYXRlJyksICd1dGY4JykpO1xuICAgICAgd29ya3NwYWNlSnNvbi5hdXRob3IgPSBvcy51c2VySW5mbygpLnVzZXJuYW1lO1xuICAgICAgd29ya3NwYWNlSnNvbi5uYW1lID0gUGF0aC5iYXNlbmFtZShjd2QpO1xuICAgICAgd29ya3NwYWNlSnNvbi5kZXNjcmlwdGlvbiA9ICdAZHIgbW9ub3JlcG8gd29ya3NwYWNlJztcbiAgICAgIGJhY2t1cEpzb24gPSBKU09OLnN0cmluZ2lmeSh3b3Jrc3BhY2VKc29uLCBudWxsLCAnICAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya3NwYWNlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmOCcpKTtcbiAgICB9XG4gICAgaWYgKCF3b3Jrc3BhY2VKc29uLmRlcGVuZGVuY2llcylcbiAgICAgIHdvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgaWYgKGlzRHJjcERldk1vZGUpIHtcbiAgICAgIG5lZWRJbnN0YWxsID0gbmVlZEluc3RhbGxXZmgod29ya3NwYWNlSnNvbik7XG4gICAgfVxuICAgIGlmIChuZWVkQ3JlYXRlRmlsZSlcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5qb2luKGN3ZCwgJ3BhY2thZ2UuanNvbicpLCBiYWNrdXBKc29uKTtcbiAgICBpZiAobmVlZEluc3RhbGwpIHtcbiAgICAgIHJlbW92ZVByb2plY3RTeW1saW5rKGlzRHJjcERldk1vZGUpO1xuICAgICAgcGFja2FnZUpzb25HdWFyZGVyLmJlZm9yZUNoYW5nZSgpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VKc29uR3VhcmRlci5pbnN0YWxsQXN5bmMoZmFsc2UsIHByb2Nlc3MuYXJndi5zb21lKGFyZyA9PiBhcmcgPT09ICctLXlhcm4nKSxcbiAgICAgICAgcHJvY2Vzcy5hcmd2LnNvbWUoYXJnID0+IGFyZyA9PT0gJy0tb2ZmbGluZScpKVxuICAgICAgLnRoZW4oKCkgPT4gcGFja2FnZUpzb25HdWFyZGVyLmFmdGVyQ2hhbmdlKCkpXG4gICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgcGFja2FnZUpzb25HdWFyZGVyLmFmdGVyQ2hhbmdlRmFpbCgpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gbmVlZEluc3RhbGxXZmgod29ya3NwYWNlSnNvbjogYW55KSB7XG4gICAgY29uc3QgbmV3V29ya3NwYWNlSnNvbiA9IE9iamVjdC5hc3NpZ24oe30sIHdvcmtzcGFjZUpzb24pO1xuICAgIGNvbnN0IGRyUGFja2FnZUpzb24gPSBwYWNrYWdlSnNvbkd1YXJkZXIuZ2V0Q2hhbmdlcygpO1xuICAgIG5ld1dvcmtzcGFjZUpzb24uZGVwZW5kZW5jaWVzID0ge1xuICAgICAgLi4uZHJjcFBrSnNvbi5kZXBlbmRlbmNpZXMsXG4gICAgICAuLi5kclBhY2thZ2VKc29uLmRlcGVuZGVuY2llc1xuICAgIH07XG4gICAgbmV3V29ya3NwYWNlSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7XG4gICAgICAuLi5kcmNwUGtKc29uLmRldkRlcGVuZGVuY2llcyxcbiAgICAgIC4uLmRyUGFja2FnZUpzb24uZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgLi4uZHJjcFBrSnNvbi5wZWVyRGVwZW5kZW5jaWVzXG4gICAgfTtcblxuICAgIGNvbnN0IG5ld0FkZHMgPSBwYWNrYWdlSnNvbkd1YXJkZXIubWFya0NoYW5nZXMobmV3V29ya3NwYWNlSnNvbik7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBuZXdBZGRzKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW2NtZC1ib290c3RyYXBdICR7ZW50cnlbMV0gIT0gbnVsbCA/ICcrJyA6ICctJ30gJHtlbnRyeVswXX0gJHtlbnRyeVsxXSB8fCAnJ31gKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld0FkZHMubGVuZ3RoID4gMCB8fCBwYWNrYWdlSnNvbkd1YXJkZXIuaXNNb2R1bGVzQ2hhbmdlZCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc0NtZCgpIHtcbiAgICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcbiAgICByZXR1cm4gcmVxdWlyZSgnLi4vbGliL2NtZC1hcmdzJykuZHJjcENvbW1hbmQoc3RhcnRUaW1lKTtcbiAgfVxufSkoKS5jYXRjaChlcnIgPT4ge1xuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==