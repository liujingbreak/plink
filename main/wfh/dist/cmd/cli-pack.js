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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testable = exports.publish = exports.pack = void 0;
const promise_queque_1 = require("../../../packages/thread-promise-pool/dist/promise-queque");
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const Path = __importStar(require("path"));
const process_utils_1 = require("../process-utils");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
// import {boxString} from './utils';
// import * as recipeManager from './recipe-manager';
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const patch_text_1 = __importDefault(require("require-injector/dist/patch-text"));
const config_1 = __importDefault(require("../config"));
const package_mgr_1 = require("../package-mgr");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const log4js_1 = __importDefault(require("log4js"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const utils_1 = require("./utils");
const misc_1 = require("../utils/misc");
require("../editor-helper");
const store_1 = require("../store");
// let tarballDir: string;
const log = log4js_1.default.getLogger('plink.cli-pack');
function init(opts) {
    const tarballDir = opts.tarDir || Path.resolve((0, config_1.default)().rootPath, 'tarballs');
    fs_extra_1.default.mkdirpSync(tarballDir);
    return tarballDir;
}
async function pack(opts) {
    const tarballDir = init(opts);
    const targetJsonFile = opts.jsonFile;
    store_1.dispatcher.changeActionOnExit('save');
    if (opts.workspace && opts.workspace.length > 0) {
        await Promise.all(opts.workspace.map(ws => packPackages(Array.from(linkedPackagesOfWorkspace(ws)), tarballDir, targetJsonFile)));
    }
    else if (opts.project && opts.project.length > 0) {
        return packProject(opts.project, tarballDir, targetJsonFile);
    }
    else if (opts.dir && opts.dir.length > 0) {
        await packPackages(opts.dir, tarballDir, targetJsonFile);
    }
    else if (opts.packages && opts.packages.length > 0) {
        const dirs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), opts.packages))
            .filter(pkg => pkg && (pkg.json.dr != null || pkg.json.plink != null))
            .map(pkg => pkg.realPath);
        await packPackages(dirs, tarballDir, targetJsonFile);
    }
    else {
        await packPackages(Array.from(linkedPackagesOfWorkspace(misc_1.plinkEnv.workDir)), tarballDir, targetJsonFile);
    }
}
exports.pack = pack;
async function publish(opts) {
    init(opts);
    if (opts.project && opts.project.length > 0)
        return publishProject(opts.project, opts.public ? ['--access', 'public'] : []);
    else if (opts.dir && opts.dir.length > 0) {
        await publishPackages(opts.dir, opts.public ? ['--access', 'public'] : []);
    }
    else if (opts.packages && opts.packages.length > 0) {
        const dirs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), opts.packages))
            .filter(pkg => pkg)
            .map(pkg => pkg.realPath);
        await publishPackages(dirs, opts.public ? ['--access', 'public'] : []);
    }
    else {
        await publishPackages(Array.from(linkedPackagesOfWorkspace(misc_1.plinkEnv.workDir)), opts.public ? ['--access', 'public'] : []);
    }
}
exports.publish = publish;
function* linkedPackagesOfWorkspace(workspaceDir) {
    const wsKey = (0, package_mgr_1.workspaceKey)(workspaceDir);
    if (!(0, package_mgr_1.getState)().workspaces.has(wsKey)) {
        log.error(`Workspace ${workspaceDir} is not a workspace directory`);
        return;
    }
    for (const pkg of (0, package_list_helper_1.packages4WorkspaceKey)(wsKey)) {
        yield pkg.realPath;
    }
}
async function packPackages(packageDirs, tarballDir, targetJsonFile) {
    const excludeFromSync = new Set();
    const package2tarball = new Map();
    if (packageDirs && packageDirs.length > 0) {
        const done = rx.from(packageDirs).pipe(op.mergeMap(packageDir => rx.defer(() => npmPack(packageDir, tarballDir)).pipe(op.retry(2)), 4), op.reduce((all, item) => {
            all.push(item);
            return all;
        }, [])).toPromise();
        const tarInfos = (await done).filter(item => typeof item != null);
        for (const item of tarInfos) {
            // log.info(item);
            package2tarball.set(item.name, Path.resolve(tarballDir, item.filename));
            if (item.name === '@wfh/plink') {
                excludeFromSync.add(item.dir);
            }
        }
        await deleteOldTar(tarInfos.map(item => new RegExp('^' +
            _.escapeRegExp(item.name.replace('@', '').replace(/[/\\]/g, '-'))
            + '\\-\\d+(?:\\.\\d+){1,2}(?:\\-[^]+?)?\\.tgz$', 'i')), tarInfos.map(item => item.filename), tarballDir);
        changePackageJson(package2tarball, targetJsonFile);
        await new Promise(resolve => setImmediate(resolve));
        package_mgr_1.actionDispatcher.scanAndSyncPackages({
            packageJsonFiles: packageDirs.filter(dir => !excludeFromSync.has(dir))
                .map(dir => Path.resolve(dir, 'package.json'))
        });
    }
}
async function packProject(projectDirs, tarballDir, targetJsonFile) {
    const dirs = [];
    for (const pkg of (0, package_mgr_1.getPackagesOfProjects)(projectDirs)) {
        dirs.push(pkg.realPath);
    }
    await packPackages(dirs, tarballDir, targetJsonFile);
}
async function publishPackages(packageDirs, npmCliOpts) {
    if (packageDirs && packageDirs.length > 0) {
        const pgPaths = packageDirs;
        await (0, promise_queque_1.queueUp)(4, pgPaths.map(packageDir => async () => {
            try {
                log.info(`publishing ${packageDir}`);
                const params = ['publish', ...npmCliOpts, { silent: true, cwd: packageDir }];
                const output = await (0, process_utils_1.exe)('npm', ...params).promise;
                log.info(output);
            }
            catch (e) {
                log.error(e);
            }
        }));
    }
}
async function publishProject(projectDirs, npmCliOpts) {
    const dirs = [];
    for (const pkg of (0, package_mgr_1.getPackagesOfProjects)(projectDirs)) {
        dirs.push(pkg.realPath);
    }
    await publishPackages(dirs, npmCliOpts);
}
async function npmPack(packagePath, tarballDir) {
    try {
        const output = await ((0, process_utils_1.exe)('npm', 'pack', Path.resolve(packagePath), { silent: true, cwd: tarballDir }).done);
        const resultInfo = parseNpmPackOutput(output.errout);
        const packageName = resultInfo.get('name');
        // cb(packageName, resultInfo.get('filename')!);
        log.info(output.errout);
        log.info(output.stdout);
        if (packageName == null) {
            throw new Error('My bad, can not parse `npm pack` output: ' + output.errout + '\n, please try again, this could happend occasionally');
        }
        return {
            name: packageName,
            filename: output.stdout.trim(),
            version: resultInfo.get('version'),
            dir: packagePath
        };
    }
    catch (e) {
        handleExption(packagePath, e);
        return null;
    }
}
/**
 * @param package2tarball
 */
function changePackageJson(packageTarballMap, targetJsonFile) {
    const package2tarball = new Map(packageTarballMap);
    if (targetJsonFile) {
        changeSinglePackageJson(Path.dirname(targetJsonFile), package2tarball);
        return;
    }
    for (const workspace of _.uniq([
        ...(0, package_mgr_1.getState)().workspaces.keys(), ''
    ]).map(dir => Path.resolve((0, config_1.default)().rootPath, dir))) {
        const wsDir = Path.resolve((0, config_1.default)().rootPath, workspace);
        changeSinglePackageJson(wsDir, package2tarball);
    }
}
function changeSinglePackageJson(wsDir, package2tarball) {
    const jsonFile = Path.resolve(wsDir, 'package.json');
    const pkj = fs.readFileSync(jsonFile, 'utf8');
    const ast = (0, json_sync_parser_1.default)(pkj);
    const depsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'dependencies');
    const devDepsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'devDependencies');
    const replacements = [];
    if (depsAst) {
        changeDependencies(package2tarball, depsAst.value, wsDir, jsonFile, replacements);
    }
    if (devDepsAst) {
        changeDependencies(package2tarball, devDepsAst.value, wsDir, jsonFile, replacements);
    }
    if (replacements.length > 0) {
        const replaced = (0, patch_text_1.default)(pkj, replacements);
        // eslint-disable-next-line no-console
        log.info(`Updated ${jsonFile}\n`, replaced);
        fs.writeFileSync(jsonFile, replaced);
    }
}
function changeDependencies(package2tarball, deps, wsDir, jsonFile, replacements) {
    // console.log(deps.properties.map(prop => prop.name.text + ':' + (prop.value as Token).text));
    // console.log(Array.from(package2tarball.entries()));
    const foundDeps = deps.properties.filter(({ name }) => package2tarball.has(JSON.parse(name.text)));
    for (const foundDep of foundDeps) {
        const verToken = foundDep.value;
        const pkName = JSON.parse(foundDep.name.text);
        const tarFile = package2tarball.get(pkName);
        let newVersion = Path.relative(wsDir, tarFile).replace(/\\/g, '/');
        if (!newVersion.startsWith('.')) {
            newVersion = './' + newVersion;
        }
        log.info(`Update ${jsonFile}: ${verToken.text} => ${newVersion}`);
        replacements.push({
            start: verToken.pos,
            end: verToken.end,
            text: JSON.stringify(newVersion)
        });
        // package2tarball.delete(pkName);
    }
}
function handleExption(packagePath, e) {
    if (e && e.message && e.message.indexOf('EPUBLISHCONFLICT') > 0)
        log.info(`npm pack ${packagePath}: EPUBLISHCONFLICT.`);
    else
        log.error(packagePath, e);
}
/**
 *
 * @param output
 * e.g.
npm notice === Tarball Details ===
npm notice name:          require-injector
npm notice version:       5.1.5
npm notice filename:      require-injector-5.1.5.tgz
npm notice package size:  56.9 kB
npm notice unpacked size: 229.1 kB
npm notice shasum:        c0693270c140f65a696207ab9deb18e64452a02c
npm notice integrity:     sha512-kRGVWcw1fvQ5J[...]ABwLPU8UvStbA==
npm notice total files:   47
npm notice

 */
function parseNpmPackOutput(output) {
    const lines = (0, strip_ansi_1.default)(output).split(/\r?\n/);
    const linesOffset = _.findLastIndex(lines, line => line.indexOf('Tarball Details') >= 0);
    const tarballInfo = new Map();
    lines.slice(linesOffset).forEach(line => {
        const match = /npm notice\s+([^:]+)[:]\s*(.+?)\s*$/.exec(line);
        if (!match) {
            return null;
        }
        return tarballInfo.set(match[1], match[2]);
    });
    return tarballInfo;
}
exports.testable = { parseNpmPackOutput };
function deleteOldTar(deleteFileReg, keepfiles, tarballDir) {
    // log.warn(deleteFileReg, keepfiles);
    const tarSet = new Set(keepfiles);
    const deleteDone = [];
    if (!fs.existsSync(tarballDir))
        fs_extra_1.default.mkdirpSync(tarballDir);
    // console.log(tarSet, deleteFileReg);
    for (const file of fs.readdirSync(tarballDir)) {
        if (!tarSet.has(file) && deleteFileReg.some(reg => reg.test(file))) {
            log.warn('Remove ' + file);
            deleteDone.push(fs.promises.unlink(Path.resolve(tarballDir, file)));
        }
    }
    return Promise.all(deleteDone);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDhGQUFrRjtBQUNsRiwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMscUNBQXFDO0FBQ3JDLHFEQUFxRDtBQUNyRCxpRkFBdUU7QUFDdkUsa0ZBQTZFO0FBQzdFLHVEQUErQjtBQUUvQixnREFBK0Y7QUFDL0YsNEVBQXlFO0FBQ3pFLG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFDbkMsbUNBQTRDO0FBQzVDLHdDQUF1QztBQUN2Qyw0QkFBMEI7QUFDMUIsb0NBQThEO0FBRTlELDBCQUEwQjtBQUMxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRS9DLFNBQVMsSUFBSSxDQUFDLElBQWtDO0lBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFBLGdCQUFNLEdBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDOUUsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0IsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQUVNLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBaUI7SUFDMUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDckMsa0JBQXNCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENB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QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JFO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtxdWV1ZVVwfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QvcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2V4ZX0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQganNvblBhcnNlciwge09iamVjdEFzdCwgVG9rZW59IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9wYXRjaC10ZXh0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7UGFja09wdGlvbnMsIFB1Ymxpc2hPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Z2V0UGFja2FnZXNPZlByb2plY3RzLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBhY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0ICcuLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCB7ZGlzcGF0Y2hlciBhcyBzdG9yZVNldHRpbmdEaXNwYXRjaGVyfSBmcm9tICcuLi9zdG9yZSc7XG5cbi8vIGxldCB0YXJiYWxsRGlyOiBzdHJpbmc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5jbGktcGFjaycpO1xuXG5mdW5jdGlvbiBpbml0KG9wdHM6IFB1Ymxpc2hPcHRpb25zIHwgUGFja09wdGlvbnMpIHtcbiAgY29uc3QgdGFyYmFsbERpciA9IG9wdHMudGFyRGlyIHx8IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ3RhcmJhbGxzJyk7XG4gIGZzZXh0Lm1rZGlycFN5bmModGFyYmFsbERpcik7XG4gIHJldHVybiB0YXJiYWxsRGlyO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFjayhvcHRzOiBQYWNrT3B0aW9ucykge1xuICBjb25zdCB0YXJiYWxsRGlyID0gaW5pdChvcHRzKTtcbiAgY29uc3QgdGFyZ2V0SnNvbkZpbGUgPSBvcHRzLmpzb25GaWxlO1xuICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnc2F2ZScpO1xuICBpZiAob3B0cy53b3Jrc3BhY2UgJiYgb3B0cy53b3Jrc3BhY2UubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IFByb21pc2UuYWxsKG9wdHMud29ya3NwYWNlLm1hcCh3cyA9PiBwYWNrUGFja2FnZXMoXG4gICAgICBBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2Uod3MpKSwgdGFyYmFsbERpciwgdGFyZ2V0SnNvbkZpbGUpKVxuICAgICk7XG4gIH0gZWxzZSBpZiAob3B0cy5wcm9qZWN0ICYmIG9wdHMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHBhY2tQcm9qZWN0KG9wdHMucHJvamVjdCwgdGFyYmFsbERpciwgdGFyZ2V0SnNvbkZpbGUpO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMob3B0cy5kaXIsIHRhcmJhbGxEaXIsIHRhcmdldEpzb25GaWxlKTtcbiAgfSBlbHNlIGlmIChvcHRzLnBhY2thZ2VzICYmIG9wdHMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRpcnMgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlcykpXG4gICAgLmZpbHRlcihwa2cgPT4gcGtnICYmIChwa2cuanNvbi5kciAhPSBudWxsIHx8IHBrZy5qc29uLnBsaW5rICE9IG51bGwpKVxuICAgIC5tYXAocGtnID0+IHBrZyEucmVhbFBhdGgpO1xuICAgIGF3YWl0IHBhY2tQYWNrYWdlcyhkaXJzLCB0YXJiYWxsRGlyLCB0YXJnZXRKc29uRmlsZSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwbGlua0Vudi53b3JrRGlyKSksIHRhcmJhbGxEaXIsIHRhcmdldEpzb25GaWxlKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHVibGlzaChvcHRzOiBQdWJsaXNoT3B0aW9ucykge1xuICBpbml0KG9wdHMpO1xuXG4gIGlmIChvcHRzLnByb2plY3QgJiYgb3B0cy5wcm9qZWN0Lmxlbmd0aCA+IDApXG4gICAgcmV0dXJuIHB1Ymxpc2hQcm9qZWN0KG9wdHMucHJvamVjdCwgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKG9wdHMuZGlyLCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH0gZWxzZSBpZiAob3B0cy5wYWNrYWdlcyAmJiBvcHRzLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkaXJzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIG9wdHMucGFja2FnZXMpKVxuICAgIC5maWx0ZXIocGtnID0+IHBrZylcbiAgICAubWFwKHBrZyA9PiBwa2chLnJlYWxQYXRoKTtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoZGlycywgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpcikpLFxuICAgICAgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uICpsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpcik7XG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpIHtcbiAgICBsb2cuZXJyb3IoYFdvcmtzcGFjZSAke3dvcmtzcGFjZURpcn0gaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeWApO1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgeWllbGQgcGtnLnJlYWxQYXRoO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhY2tQYWNrYWdlcyhwYWNrYWdlRGlyczogc3RyaW5nW10sIHRhcmJhbGxEaXI6IHN0cmluZywgdGFyZ2V0SnNvbkZpbGU/OiBzdHJpbmcpIHtcbiAgY29uc3QgZXhjbHVkZUZyb21TeW5jID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cblxuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRvbmUgPSByeC5mcm9tKHBhY2thZ2VEaXJzKS5waXBlKFxuICAgICAgb3AubWVyZ2VNYXAocGFja2FnZURpciA9PiByeC5kZWZlcigoKSA9PiBucG1QYWNrKHBhY2thZ2VEaXIsIHRhcmJhbGxEaXIpKS5waXBlKFxuICAgICAgICBvcC5yZXRyeSgyKVxuICAgICAgKSwgNCksXG4gICAgICBvcC5yZWR1Y2U8UmV0dXJuVHlwZTx0eXBlb2YgbnBtUGFjaz4gZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd24+KChhbGwsIGl0ZW0pID0+IHtcbiAgICAgICAgYWxsLnB1c2goaXRlbSk7XG4gICAgICAgIHJldHVybiBhbGw7XG4gICAgICB9LCBbXSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gICAgY29uc3QgdGFySW5mb3MgPSAoYXdhaXQgZG9uZSkuZmlsdGVyKGl0ZW0gPT4gdHlwZW9mIGl0ZW0gIT0gbnVsbCkgYXNcbiAgICAgICh0eXBlb2YgZG9uZSBleHRlbmRzIFByb21pc2U8KGluZmVyIFQpW10+ID8gTm9uTnVsbGFibGU8VD4gOiB1bmtub3duKVtdO1xuXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRhckluZm9zKSB7XG4gICAgICAvLyBsb2cuaW5mbyhpdGVtKTtcbiAgICAgIHBhY2thZ2UydGFyYmFsbC5zZXQoaXRlbS5uYW1lLCBQYXRoLnJlc29sdmUodGFyYmFsbERpciwgaXRlbS5maWxlbmFtZSkpO1xuICAgICAgaWYgKGl0ZW0ubmFtZSA9PT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGV4Y2x1ZGVGcm9tU3luYy5hZGQoaXRlbS5kaXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IGRlbGV0ZU9sZFRhcih0YXJJbmZvcy5tYXAoaXRlbSA9PiBuZXcgUmVnRXhwKCdeJyArXG4gICAgICBfLmVzY2FwZVJlZ0V4cChpdGVtLm5hbWUucmVwbGFjZSgnQCcsICcnKS5yZXBsYWNlKC9bL1xcXFxdL2csICctJykpXG4gICAgICAgICsgJ1xcXFwtXFxcXGQrKD86XFxcXC5cXFxcZCspezEsMn0oPzpcXFxcLVteXSs/KT9cXFxcLnRneiQnLCAnaSdcbiAgICAgICkpLFxuICAgICAgdGFySW5mb3MubWFwKGl0ZW0gPT4gaXRlbS5maWxlbmFtZSksXG4gICAgICB0YXJiYWxsRGlyKTtcbiAgICBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGwsIHRhcmdldEpzb25GaWxlKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5zY2FuQW5kU3luY1BhY2thZ2VzKHtcbiAgICAgIHBhY2thZ2VKc29uRmlsZXM6IHBhY2thZ2VEaXJzLmZpbHRlcihkaXIgPT4gIWV4Y2x1ZGVGcm9tU3luYy5oYXMoZGlyKSlcbiAgICAgICAgLm1hcChkaXIgPT4gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpKVxuICAgIH0pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhY2tQcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSwgdGFyYmFsbERpcjogc3RyaW5nLCB0YXJnZXRKc29uRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3REaXJzKSkge1xuICAgIGRpcnMucHVzaChwa2cucmVhbFBhdGgpO1xuICB9XG4gIGF3YWl0IHBhY2tQYWNrYWdlcyhkaXJzLCB0YXJiYWxsRGlyLCB0YXJnZXRKc29uRmlsZSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hQYWNrYWdlcyhwYWNrYWdlRGlyczogc3RyaW5nW10sIG5wbUNsaU9wdHM6IHN0cmluZ1tdKSB7XG4gIGlmIChwYWNrYWdlRGlycyAmJiBwYWNrYWdlRGlycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBwYWNrYWdlRGlycztcblxuICAgIGF3YWl0IHF1ZXVlVXAoNCwgcGdQYXRocy5tYXAocGFja2FnZURpciA9PiBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbyhgcHVibGlzaGluZyAke3BhY2thZ2VEaXJ9YCk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IFsncHVibGlzaCcsIC4uLm5wbUNsaU9wdHMsIHtzaWxlbnQ6IHRydWUsIGN3ZDogcGFja2FnZURpcn1dO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBleGUoJ25wbScsIC4uLnBhcmFtcykucHJvbWlzZTtcbiAgICAgICAgbG9nLmluZm8ob3V0cHV0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIG5wbUNsaU9wdHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3REaXJzKSkge1xuICAgIGRpcnMucHVzaChwa2cucmVhbFBhdGgpO1xuICB9XG4gIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBucG1DbGlPcHRzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbnBtUGFjayhwYWNrYWdlUGF0aDogc3RyaW5nLCB0YXJiYWxsRGlyOiBzdHJpbmcpOlxuICBQcm9taXNlPHtuYW1lOiBzdHJpbmc7IGZpbGVuYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZzsgZGlyOiBzdHJpbmd9IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IChleGUoJ25wbScsICdwYWNrJywgUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoKSxcbiAgICAgIHtzaWxlbnQ6IHRydWUsIGN3ZDogdGFyYmFsbERpcn0pLmRvbmUpO1xuXG4gICAgY29uc3QgcmVzdWx0SW5mbyA9IHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQuZXJyb3V0KTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVzdWx0SW5mby5nZXQoJ25hbWUnKTtcbiAgICAvLyBjYihwYWNrYWdlTmFtZSwgcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhKTtcbiAgICBsb2cuaW5mbyhvdXRwdXQuZXJyb3V0KTtcbiAgICBsb2cuaW5mbyhvdXRwdXQuc3Rkb3V0KTtcbiAgICBpZiAocGFja2FnZU5hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNeSBiYWQsIGNhbiBub3QgcGFyc2UgYG5wbSBwYWNrYCBvdXRwdXQ6ICcgKyBvdXRwdXQuZXJyb3V0ICsgJ1xcbiwgcGxlYXNlIHRyeSBhZ2FpbiwgdGhpcyBjb3VsZCBoYXBwZW5kIG9jY2FzaW9uYWxseScpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgICBmaWxlbmFtZTogb3V0cHV0LnN0ZG91dC50cmltKCksXG4gICAgICB2ZXJzaW9uOiByZXN1bHRJbmZvLmdldCgndmVyc2lvbicpISxcbiAgICAgIGRpcjogcGFja2FnZVBhdGhcbiAgICB9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aCwgZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBAcGFyYW0gcGFja2FnZTJ0YXJiYWxsIFxuICovXG5mdW5jdGlvbiBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlVGFyYmFsbE1hcDogTWFwPHN0cmluZywgc3RyaW5nPiwgdGFyZ2V0SnNvbkZpbGU/OiBzdHJpbmcpIHtcbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsID0gbmV3IE1hcChwYWNrYWdlVGFyYmFsbE1hcCk7XG4gIGlmICh0YXJnZXRKc29uRmlsZSkge1xuICAgIGNoYW5nZVNpbmdsZVBhY2thZ2VKc29uKFBhdGguZGlybmFtZSh0YXJnZXRKc29uRmlsZSksIHBhY2thZ2UydGFyYmFsbCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3Qgd29ya3NwYWNlIG9mIF8udW5pcShbXG4gICAgLi4uZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSwgJyddKS5tYXAoZGlyID0+IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgZGlyKSlcbiAgKSB7XG4gICAgY29uc3Qgd3NEaXIgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIHdvcmtzcGFjZSk7XG4gICAgY2hhbmdlU2luZ2xlUGFja2FnZUpzb24od3NEaXIsIHBhY2thZ2UydGFyYmFsbCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlU2luZ2xlUGFja2FnZUpzb24od3NEaXI6IHN0cmluZywgcGFja2FnZTJ0YXJiYWxsOiBNYXA8c3RyaW5nLCBzdHJpbmc+KSB7XG4gIGNvbnN0IGpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHdzRGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBraiA9IGZzLnJlYWRGaWxlU3luYyhqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgY29uc3QgYXN0ID0ganNvblBhcnNlcihwa2opO1xuICBjb25zdCBkZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXBlbmRlbmNpZXMnKTtcbiAgY29uc3QgZGV2RGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGV2RGVwZW5kZW5jaWVzJyk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICBpZiAoZGVwc0FzdCkge1xuICAgIGNoYW5nZURlcGVuZGVuY2llcyhwYWNrYWdlMnRhcmJhbGwsIGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0LCB3c0RpciwganNvbkZpbGUsIHJlcGxhY2VtZW50cyk7XG4gIH1cbiAgaWYgKGRldkRlcHNBc3QpIHtcbiAgICBjaGFuZ2VEZXBlbmRlbmNpZXMocGFja2FnZTJ0YXJiYWxsLCBkZXZEZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCwgd3NEaXIsIGpzb25GaWxlLCByZXBsYWNlbWVudHMpO1xuICB9XG5cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcmVwbGFjZWQgPSByZXBsYWNlQ29kZShwa2osIHJlcGxhY2VtZW50cyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhgVXBkYXRlZCAke2pzb25GaWxlfVxcbmAsIHJlcGxhY2VkKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGpzb25GaWxlLCByZXBsYWNlZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKHBhY2thZ2UydGFyYmFsbDogTWFwPHN0cmluZywgc3RyaW5nPiwgZGVwczogT2JqZWN0QXN0LCB3c0Rpcjogc3RyaW5nLCBqc29uRmlsZTogc3RyaW5nLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10pIHtcbiAgLy8gY29uc29sZS5sb2coZGVwcy5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0ICsgJzonICsgKHByb3AudmFsdWUgYXMgVG9rZW4pLnRleHQpKTtcbiAgLy8gY29uc29sZS5sb2coQXJyYXkuZnJvbShwYWNrYWdlMnRhcmJhbGwuZW50cmllcygpKSk7XG4gIGNvbnN0IGZvdW5kRGVwcyA9IGRlcHMucHJvcGVydGllcy5maWx0ZXIoKHtuYW1lfSkgPT4gcGFja2FnZTJ0YXJiYWxsLmhhcyhKU09OLnBhcnNlKG5hbWUudGV4dCkpKTtcbiAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICBjb25zdCB2ZXJUb2tlbiA9IGZvdW5kRGVwLnZhbHVlIGFzIFRva2VuO1xuICAgIGNvbnN0IHBrTmFtZSA9IEpTT04ucGFyc2UoZm91bmREZXAubmFtZS50ZXh0KSBhcyBzdHJpbmc7XG4gICAgY29uc3QgdGFyRmlsZSA9IHBhY2thZ2UydGFyYmFsbC5nZXQocGtOYW1lKTtcbiAgICBsZXQgbmV3VmVyc2lvbiA9IFBhdGgucmVsYXRpdmUod3NEaXIsIHRhckZpbGUhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCFuZXdWZXJzaW9uLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgbmV3VmVyc2lvbiA9ICcuLycgKyBuZXdWZXJzaW9uO1xuICAgIH1cbiAgICBsb2cuaW5mbyhgVXBkYXRlICR7anNvbkZpbGV9OiAke3ZlclRva2VuLnRleHR9ID0+ICR7bmV3VmVyc2lvbn1gKTtcbiAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICBzdGFydDogdmVyVG9rZW4ucG9zLFxuICAgICAgZW5kOiB2ZXJUb2tlbi5lbmQsXG4gICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeShuZXdWZXJzaW9uKVxuICAgIH0pO1xuICAgIC8vIHBhY2thZ2UydGFyYmFsbC5kZWxldGUocGtOYW1lKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoOiBzdHJpbmcsIGU6IHVua25vd24pIHtcbiAgaWYgKGUgJiYgKGUgYXMgRXJyb3IpLm1lc3NhZ2UgJiYgKGUgYXMgRXJyb3IpLm1lc3NhZ2UuaW5kZXhPZignRVBVQkxJU0hDT05GTElDVCcpID4gMClcbiAgICBsb2cuaW5mbyhgbnBtIHBhY2sgJHtwYWNrYWdlUGF0aH06IEVQVUJMSVNIQ09ORkxJQ1QuYCk7XG4gIGVsc2VcbiAgICBsb2cuZXJyb3IocGFja2FnZVBhdGgsIGUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIG91dHB1dCBcbiAqIGUuZy5cbm5wbSBub3RpY2UgPT09IFRhcmJhbGwgRGV0YWlscyA9PT0gXG5ucG0gbm90aWNlIG5hbWU6ICAgICAgICAgIHJlcXVpcmUtaW5qZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdmVyc2lvbjogICAgICAgNS4xLjUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBmaWxlbmFtZTogICAgICByZXF1aXJlLWluamVjdG9yLTUuMS41LnRneiAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHBhY2thZ2Ugc2l6ZTogIDU2Ljkga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdW5wYWNrZWQgc2l6ZTogMjI5LjEga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBzaGFzdW06ICAgICAgICBjMDY5MzI3MGMxNDBmNjVhNjk2MjA3YWI5ZGViMThlNjQ0NTJhMDJjXG5ucG0gbm90aWNlIGludGVncml0eTogICAgIHNoYTUxMi1rUkdWV2N3MWZ2UTVKWy4uLl1BQndMUFU4VXZTdGJBPT1cbm5wbSBub3RpY2UgdG90YWwgZmlsZXM6ICAgNDcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBcblxuICovXG5mdW5jdGlvbiBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0OiBzdHJpbmcpIHtcbiAgY29uc3QgbGluZXMgPSBzdHJpcEFuc2kob3V0cHV0KS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmV4cG9ydCBjb25zdCB0ZXN0YWJsZSA9IHtwYXJzZU5wbVBhY2tPdXRwdXR9O1xuXG5mdW5jdGlvbiBkZWxldGVPbGRUYXIoZGVsZXRlRmlsZVJlZzogUmVnRXhwW10sIGtlZXBmaWxlczogc3RyaW5nW10sIHRhcmJhbGxEaXI6IHN0cmluZykge1xuICAvLyBsb2cud2FybihkZWxldGVGaWxlUmVnLCBrZWVwZmlsZXMpO1xuICBjb25zdCB0YXJTZXQgPSBuZXcgU2V0KGtlZXBmaWxlcyk7XG4gIGNvbnN0IGRlbGV0ZURvbmU6IFByb21pc2U8YW55PltdID0gW107XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmJhbGxEaXIpKVxuICAgIGZzZXh0Lm1rZGlycFN5bmModGFyYmFsbERpcik7XG5cbiAgLy8gY29uc29sZS5sb2codGFyU2V0LCBkZWxldGVGaWxlUmVnKTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZnMucmVhZGRpclN5bmModGFyYmFsbERpcikpIHtcbiAgICBpZiAoIXRhclNldC5oYXMoZmlsZSkgJiYgZGVsZXRlRmlsZVJlZy5zb21lKHJlZyA9PiByZWcudGVzdChmaWxlKSkpIHtcbiAgICAgIGxvZy53YXJuKCdSZW1vdmUgJyArIGZpbGUpO1xuICAgICAgZGVsZXRlRG9uZS5wdXNoKGZzLnByb21pc2VzLnVubGluayhQYXRoLnJlc29sdmUodGFyYmFsbERpciwgZmlsZSkpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRlbGV0ZURvbmUpO1xufVxuIl19