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
        const done = rx.from(packageDirs).pipe(op.mergeMap(packageDir => rx.defer(() => npmPack(packageDir, tarballDir)), 4), op.reduce((all, item) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDhGQUFrRjtBQUNsRiwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMscUNBQXFDO0FBQ3JDLHFEQUFxRDtBQUNyRCxpRkFBdUU7QUFDdkUsa0ZBQTZFO0FBQzdFLHVEQUErQjtBQUUvQixnREFBK0Y7QUFDL0YsNEVBQXlFO0FBQ3pFLG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFDbkMsbUNBQTRDO0FBQzVDLHdDQUF1QztBQUN2Qyw0QkFBMEI7QUFDMUIsb0NBQThEO0FBRTlELDBCQUEwQjtBQUMxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRS9DLFNBQVMsSUFBSSxDQUFDLElBQWtDO0lBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFBLGdCQUFNLEdBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDOUUsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0IsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQUVNLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBaUI7SUFDMUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDckMsa0JBQXNCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENB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QUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRTtLQUNGO0lBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7cXVldWVVcH0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0L3Byb21pc2UtcXVlcXVlJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2V4dCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtleGV9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQge2JveFN0cmluZ30gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQgKiBhcyByZWNpcGVNYW5hZ2VyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IGpzb25QYXJzZXIsIHtPYmplY3RBc3QsIFRva2VufSBmcm9tICcuLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge1BhY2tPcHRpb25zLCBQdWJsaXNoT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2dldFBhY2thZ2VzT2ZQcm9qZWN0cywgZ2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgYWN0aW9uRGlzcGF0Y2hlcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHN0cmlwQW5zaSBmcm9tICdzdHJpcC1hbnNpJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQge2Rpc3BhdGNoZXIgYXMgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcn0gZnJvbSAnLi4vc3RvcmUnO1xuXG4vLyBsZXQgdGFyYmFsbERpcjogc3RyaW5nO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY2xpLXBhY2snKTtcblxuZnVuY3Rpb24gaW5pdChvcHRzOiBQdWJsaXNoT3B0aW9ucyB8IFBhY2tPcHRpb25zKSB7XG4gIGNvbnN0IHRhcmJhbGxEaXIgPSBvcHRzLnRhckRpciB8fCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICd0YXJiYWxscycpO1xuICBmc2V4dC5ta2RpcnBTeW5jKHRhcmJhbGxEaXIpO1xuICByZXR1cm4gdGFyYmFsbERpcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBhY2sob3B0czogUGFja09wdGlvbnMpIHtcbiAgY29uc3QgdGFyYmFsbERpciA9IGluaXQob3B0cyk7XG4gIGNvbnN0IHRhcmdldEpzb25GaWxlID0gb3B0cy5qc29uRmlsZTtcbiAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgaWYgKG9wdHMud29ya3NwYWNlICYmIG9wdHMud29ya3NwYWNlLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChvcHRzLndvcmtzcGFjZS5tYXAod3MgPT4gcGFja1BhY2thZ2VzKFxuICAgICAgQXJyYXkuZnJvbShsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHdzKSksIHRhcmJhbGxEaXIsIHRhcmdldEpzb25GaWxlKSlcbiAgICApO1xuICB9IGVsc2UgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwYWNrUHJvamVjdChvcHRzLnByb2plY3QsIHRhcmJhbGxEaXIsIHRhcmdldEpzb25GaWxlKTtcbiAgfSBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKG9wdHMuZGlyLCB0YXJiYWxsRGlyLCB0YXJnZXRKc29uRmlsZSk7XG4gIH0gZWxzZSBpZiAob3B0cy5wYWNrYWdlcyAmJiBvcHRzLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkaXJzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIG9wdHMucGFja2FnZXMpKVxuICAgIC5maWx0ZXIocGtnID0+IHBrZyAmJiAocGtnLmpzb24uZHIgIT0gbnVsbCB8fCBwa2cuanNvbi5wbGluayAhPSBudWxsKSlcbiAgICAubWFwKHBrZyA9PiBwa2chLnJlYWxQYXRoKTtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycywgdGFyYmFsbERpciwgdGFyZ2V0SnNvbkZpbGUpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHBhY2tQYWNrYWdlcyhBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpcikpLCB0YXJiYWxsRGlyLCB0YXJnZXRKc29uRmlsZSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2gob3B0czogUHVibGlzaE9wdGlvbnMpIHtcbiAgaW5pdChvcHRzKTtcblxuICBpZiAob3B0cy5wcm9qZWN0ICYmIG9wdHMucHJvamVjdC5sZW5ndGggPiAwKVxuICAgIHJldHVybiBwdWJsaXNoUHJvamVjdChvcHRzLnByb2plY3QsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgZWxzZSBpZiAob3B0cy5kaXIgJiYgb3B0cy5kaXIubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhvcHRzLmRpciwgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICB9IGVsc2UgaWYgKG9wdHMucGFja2FnZXMgJiYgb3B0cy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZGlycyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2VzKSlcbiAgICAuZmlsdGVyKHBrZyA9PiBwa2cpXG4gICAgLm1hcChwa2cgPT4gcGtnIS5yZWFsUGF0aCk7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKGRpcnMsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoQXJyYXkuZnJvbShsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIpKSxcbiAgICAgIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiAqbGlua2VkUGFja2FnZXNPZldvcmtzcGFjZSh3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleSh3b3Jrc3BhY2VEaXIpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgbG9nLmVycm9yKGBXb3Jrc3BhY2UgJHt3b3Jrc3BhY2VEaXJ9IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnlgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KSkge1xuICAgIHlpZWxkIHBrZy5yZWFsUGF0aDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCB0YXJiYWxsRGlyOiBzdHJpbmcsIHRhcmdldEpzb25GaWxlPzogc3RyaW5nKSB7XG4gIGNvbnN0IGV4Y2x1ZGVGcm9tU3luYyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG5cbiAgaWYgKHBhY2thZ2VEaXJzICYmIHBhY2thZ2VEaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkb25lID0gcnguZnJvbShwYWNrYWdlRGlycykucGlwZShcbiAgICAgIG9wLm1lcmdlTWFwKHBhY2thZ2VEaXIgPT4gcnguZGVmZXIoKCkgPT4gbnBtUGFjayhwYWNrYWdlRGlyLCB0YXJiYWxsRGlyKSksIDQpLFxuICAgICAgb3AucmVkdWNlPFJldHVyblR5cGU8dHlwZW9mIG5wbVBhY2s+IGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duPigoYWxsLCBpdGVtKSA9PiB7XG4gICAgICAgIGFsbC5wdXNoKGl0ZW0pO1xuICAgICAgICByZXR1cm4gYWxsO1xuICAgICAgfSwgW10pXG4gICAgKS50b1Byb21pc2UoKTtcblxuICAgIGNvbnN0IHRhckluZm9zID0gKGF3YWl0IGRvbmUpLmZpbHRlcihpdGVtID0+IHR5cGVvZiBpdGVtICE9IG51bGwpIGFzXG4gICAgICAodHlwZW9mIGRvbmUgZXh0ZW5kcyBQcm9taXNlPChpbmZlciBUKVtdPiA/IE5vbk51bGxhYmxlPFQ+IDogdW5rbm93bilbXTtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0YXJJbmZvcykge1xuICAgICAgLy8gbG9nLmluZm8oaXRlbSk7XG4gICAgICBwYWNrYWdlMnRhcmJhbGwuc2V0KGl0ZW0ubmFtZSwgUGF0aC5yZXNvbHZlKHRhcmJhbGxEaXIsIGl0ZW0uZmlsZW5hbWUpKTtcbiAgICAgIGlmIChpdGVtLm5hbWUgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBleGNsdWRlRnJvbVN5bmMuYWRkKGl0ZW0uZGlyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBkZWxldGVPbGRUYXIodGFySW5mb3MubWFwKGl0ZW0gPT4gbmV3IFJlZ0V4cCgnXicgK1xuICAgICAgXy5lc2NhcGVSZWdFeHAoaXRlbS5uYW1lLnJlcGxhY2UoJ0AnLCAnJykucmVwbGFjZSgvWy9cXFxcXS9nLCAnLScpKVxuICAgICAgICArICdcXFxcLVxcXFxkKyg/OlxcXFwuXFxcXGQrKXsxLDJ9KD86XFxcXC1bXl0rPyk/XFxcXC50Z3okJywgJ2knXG4gICAgICApKSxcbiAgICAgIHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0uZmlsZW5hbWUpLFxuICAgICAgdGFyYmFsbERpcik7XG4gICAgY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsLCB0YXJnZXRKc29uRmlsZSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7XG4gICAgICBwYWNrYWdlSnNvbkZpbGVzOiBwYWNrYWdlRGlycy5maWx0ZXIoZGlyID0+ICFleGNsdWRlRnJvbVN5bmMuaGFzKGRpcikpXG4gICAgICAgIC5tYXAoZGlyID0+IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKSlcbiAgICB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIHRhcmJhbGxEaXI6IHN0cmluZywgdGFyZ2V0SnNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycywgdGFyYmFsbERpciwgdGFyZ2V0SnNvbkZpbGUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBhd2FpdCBxdWV1ZVVwKDQsIHBnUGF0aHMubWFwKHBhY2thZ2VEaXIgPT4gYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oYHB1Ymxpc2hpbmcgJHtwYWNrYWdlRGlyfWApO1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBbJ3B1Ymxpc2gnLCAuLi5ucG1DbGlPcHRzLCB7c2lsZW50OiB0cnVlLCBjd2Q6IHBhY2thZ2VEaXJ9XTtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgZXhlKCducG0nLCAuLi5wYXJhbXMpLnByb21pc2U7XG4gICAgICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVibGlzaFByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoZGlycywgbnBtQ2xpT3B0cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5wbVBhY2socGFja2FnZVBhdGg6IHN0cmluZywgdGFyYmFsbERpcjogc3RyaW5nKTpcbiAgUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBmaWxlbmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IGRpcjogc3RyaW5nfSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCAoZXhlKCducG0nLCAncGFjaycsIFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCksXG4gICAgICB7c2lsZW50OiB0cnVlLCBjd2Q6IHRhcmJhbGxEaXJ9KS5kb25lKTtcblxuICAgIGNvbnN0IHJlc3VsdEluZm8gPSBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0LmVycm91dCk7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHJlc3VsdEluZm8uZ2V0KCduYW1lJyk7XG4gICAgLy8gY2IocGFja2FnZU5hbWUsIHJlc3VsdEluZm8uZ2V0KCdmaWxlbmFtZScpISk7XG4gICAgbG9nLmluZm8ob3V0cHV0LmVycm91dCk7XG4gICAgbG9nLmluZm8ob3V0cHV0LnN0ZG91dCk7XG4gICAgaWYgKHBhY2thZ2VOYW1lID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTXkgYmFkLCBjYW4gbm90IHBhcnNlIGBucG0gcGFja2Agb3V0cHV0OiAnICsgb3V0cHV0LmVycm91dCArICdcXG4sIHBsZWFzZSB0cnkgYWdhaW4sIHRoaXMgY291bGQgaGFwcGVuZCBvY2Nhc2lvbmFsbHknKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHBhY2thZ2VOYW1lLFxuICAgICAgZmlsZW5hbWU6IG91dHB1dC5zdGRvdXQudHJpbSgpLFxuICAgICAgdmVyc2lvbjogcmVzdWx0SW5mby5nZXQoJ3ZlcnNpb24nKSEsXG4gICAgICBkaXI6IHBhY2thZ2VQYXRoXG4gICAgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGgsIGUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQHBhcmFtIHBhY2thZ2UydGFyYmFsbCBcbiAqL1xuZnVuY3Rpb24gY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZVRhcmJhbGxNYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4sIHRhcmdldEpzb25GaWxlPzogc3RyaW5nKSB7XG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbCA9IG5ldyBNYXAocGFja2FnZVRhcmJhbGxNYXApO1xuICBpZiAodGFyZ2V0SnNvbkZpbGUpIHtcbiAgICBjaGFuZ2VTaW5nbGVQYWNrYWdlSnNvbihQYXRoLmRpcm5hbWUodGFyZ2V0SnNvbkZpbGUpLCBwYWNrYWdlMnRhcmJhbGwpO1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKGNvbnN0IHdvcmtzcGFjZSBvZiBfLnVuaXEoW1xuICAgIC4uLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCksICcnXSkubWFwKGRpciA9PiBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIGRpcikpXG4gICkge1xuICAgIGNvbnN0IHdzRGlyID0gUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCB3b3Jrc3BhY2UpO1xuICAgIGNoYW5nZVNpbmdsZVBhY2thZ2VKc29uKHdzRGlyLCBwYWNrYWdlMnRhcmJhbGwpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZVNpbmdsZVBhY2thZ2VKc29uKHdzRGlyOiBzdHJpbmcsIHBhY2thZ2UydGFyYmFsbDogTWFwPHN0cmluZywgc3RyaW5nPikge1xuICBjb25zdCBqc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh3c0RpciwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwa2ogPSBmcy5yZWFkRmlsZVN5bmMoanNvbkZpbGUsICd1dGY4Jyk7XG4gIGNvbnN0IGFzdCA9IGpzb25QYXJzZXIocGtqKTtcbiAgY29uc3QgZGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGVwZW5kZW5jaWVzJyk7XG4gIGNvbnN0IGRldkRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RldkRlcGVuZGVuY2llcycpO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgaWYgKGRlcHNBc3QpIHtcbiAgICBjaGFuZ2VEZXBlbmRlbmNpZXMocGFja2FnZTJ0YXJiYWxsLCBkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCwgd3NEaXIsIGpzb25GaWxlLCByZXBsYWNlbWVudHMpO1xuICB9XG4gIGlmIChkZXZEZXBzQXN0KSB7XG4gICAgY2hhbmdlRGVwZW5kZW5jaWVzKHBhY2thZ2UydGFyYmFsbCwgZGV2RGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QsIHdzRGlyLCBqc29uRmlsZSwgcmVwbGFjZW1lbnRzKTtcbiAgfVxuXG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHJlcGxhY2VkID0gcmVwbGFjZUNvZGUocGtqLCByZXBsYWNlbWVudHMpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oYFVwZGF0ZWQgJHtqc29uRmlsZX1cXG5gLCByZXBsYWNlZCk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhqc29uRmlsZSwgcmVwbGFjZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZURlcGVuZGVuY2llcyhwYWNrYWdlMnRhcmJhbGw6IE1hcDxzdHJpbmcsIHN0cmluZz4sIGRlcHM6IE9iamVjdEFzdCwgd3NEaXI6IHN0cmluZywganNvbkZpbGU6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdKSB7XG4gIC8vIGNvbnNvbGUubG9nKGRlcHMucHJvcGVydGllcy5tYXAocHJvcCA9PiBwcm9wLm5hbWUudGV4dCArICc6JyArIChwcm9wLnZhbHVlIGFzIFRva2VuKS50ZXh0KSk7XG4gIC8vIGNvbnNvbGUubG9nKEFycmF5LmZyb20ocGFja2FnZTJ0YXJiYWxsLmVudHJpZXMoKSkpO1xuICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IHBhY2thZ2UydGFyYmFsbC5oYXMoSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gIGZvciAoY29uc3QgZm91bmREZXAgb2YgZm91bmREZXBzKSB7XG4gICAgY29uc3QgdmVyVG9rZW4gPSBmb3VuZERlcC52YWx1ZSBhcyBUb2tlbjtcbiAgICBjb25zdCBwa05hbWUgPSBKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCkgYXMgc3RyaW5nO1xuICAgIGNvbnN0IHRhckZpbGUgPSBwYWNrYWdlMnRhcmJhbGwuZ2V0KHBrTmFtZSk7XG4gICAgbGV0IG5ld1ZlcnNpb24gPSBQYXRoLnJlbGF0aXZlKHdzRGlyLCB0YXJGaWxlISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICghbmV3VmVyc2lvbi5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIG5ld1ZlcnNpb24gPSAnLi8nICsgbmV3VmVyc2lvbjtcbiAgICB9XG4gICAgbG9nLmluZm8oYFVwZGF0ZSAke2pzb25GaWxlfTogJHt2ZXJUb2tlbi50ZXh0fSA9PiAke25ld1ZlcnNpb259YCk7XG4gICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgc3RhcnQ6IHZlclRva2VuLnBvcyxcbiAgICAgIGVuZDogdmVyVG9rZW4uZW5kLFxuICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkobmV3VmVyc2lvbilcbiAgICB9KTtcbiAgICAvLyBwYWNrYWdlMnRhcmJhbGwuZGVsZXRlKHBrTmFtZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aDogc3RyaW5nLCBlOiB1bmtub3duKSB7XG4gIGlmIChlICYmIChlIGFzIEVycm9yKS5tZXNzYWdlICYmIChlIGFzIEVycm9yKS5tZXNzYWdlLmluZGV4T2YoJ0VQVUJMSVNIQ09ORkxJQ1QnKSA+IDApXG4gICAgbG9nLmluZm8oYG5wbSBwYWNrICR7cGFja2FnZVBhdGh9OiBFUFVCTElTSENPTkZMSUNULmApO1xuICBlbHNlXG4gICAgbG9nLmVycm9yKHBhY2thZ2VQYXRoLCBlKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBvdXRwdXQgXG4gKiBlLmcuXG5ucG0gbm90aWNlID09PSBUYXJiYWxsIERldGFpbHMgPT09IFxubnBtIG5vdGljZSBuYW1lOiAgICAgICAgICByZXF1aXJlLWluamVjdG9yICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHZlcnNpb246ICAgICAgIDUuMS41ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgZmlsZW5hbWU6ICAgICAgcmVxdWlyZS1pbmplY3Rvci01LjEuNS50Z3ogICAgICAgICAgICAgIFxubnBtIG5vdGljZSBwYWNrYWdlIHNpemU6ICA1Ni45IGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHVucGFja2VkIHNpemU6IDIyOS4xIGtCICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2Ugc2hhc3VtOiAgICAgICAgYzA2OTMyNzBjMTQwZjY1YTY5NjIwN2FiOWRlYjE4ZTY0NDUyYTAyY1xubnBtIG5vdGljZSBpbnRlZ3JpdHk6ICAgICBzaGE1MTIta1JHVldjdzFmdlE1SlsuLi5dQUJ3TFBVOFV2U3RiQT09XG5ucG0gbm90aWNlIHRvdGFsIGZpbGVzOiAgIDQ3ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgXG5cbiAqL1xuZnVuY3Rpb24gcGFyc2VOcG1QYWNrT3V0cHV0KG91dHB1dDogc3RyaW5nKSB7XG4gIGNvbnN0IGxpbmVzID0gc3RyaXBBbnNpKG91dHB1dCkuc3BsaXQoL1xccj9cXG4vKTtcbiAgY29uc3QgbGluZXNPZmZzZXQgPSBfLmZpbmRMYXN0SW5kZXgobGluZXMsIGxpbmUgPT4gbGluZS5pbmRleE9mKCdUYXJiYWxsIERldGFpbHMnKSA+PSAwKTtcbiAgY29uc3QgdGFyYmFsbEluZm8gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBsaW5lcy5zbGljZShsaW5lc09mZnNldCkuZm9yRWFjaChsaW5lID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC9ucG0gbm90aWNlXFxzKyhbXjpdKylbOl1cXHMqKC4rPylcXHMqJC8uZXhlYyhsaW5lKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmJhbGxJbmZvLnNldChtYXRjaFsxXSwgbWF0Y2hbMl0pO1xuICB9KTtcbiAgcmV0dXJuIHRhcmJhbGxJbmZvO1xufVxuXG5leHBvcnQgY29uc3QgdGVzdGFibGUgPSB7cGFyc2VOcG1QYWNrT3V0cHV0fTtcblxuZnVuY3Rpb24gZGVsZXRlT2xkVGFyKGRlbGV0ZUZpbGVSZWc6IFJlZ0V4cFtdLCBrZWVwZmlsZXM6IHN0cmluZ1tdLCB0YXJiYWxsRGlyOiBzdHJpbmcpIHtcbiAgLy8gbG9nLndhcm4oZGVsZXRlRmlsZVJlZywga2VlcGZpbGVzKTtcbiAgY29uc3QgdGFyU2V0ID0gbmV3IFNldChrZWVwZmlsZXMpO1xuICBjb25zdCBkZWxldGVEb25lOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJiYWxsRGlyKSlcbiAgICBmc2V4dC5ta2RpcnBTeW5jKHRhcmJhbGxEaXIpO1xuXG4gIC8vIGNvbnNvbGUubG9nKHRhclNldCwgZGVsZXRlRmlsZVJlZyk7XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZzLnJlYWRkaXJTeW5jKHRhcmJhbGxEaXIpKSB7XG4gICAgaWYgKCF0YXJTZXQuaGFzKGZpbGUpICYmIGRlbGV0ZUZpbGVSZWcuc29tZShyZWcgPT4gcmVnLnRlc3QoZmlsZSkpKSB7XG4gICAgICBsb2cud2FybignUmVtb3ZlICcgKyBmaWxlKTtcbiAgICAgIGRlbGV0ZURvbmUucHVzaChmcy5wcm9taXNlcy51bmxpbmsoUGF0aC5yZXNvbHZlKHRhcmJhbGxEaXIsIGZpbGUpKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBQcm9taXNlLmFsbChkZWxldGVEb25lKTtcbn1cbiJdfQ==