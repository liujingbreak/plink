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
// let tarballDir: string;
const log = log4js_1.default.getLogger('plink.cli-pack');
function init(opts) {
    const tarballDir = opts.tarDir || Path.resolve((0, config_1.default)().rootPath, 'tarballs');
    fs_extra_1.default.mkdirpSync(tarballDir);
    return tarballDir;
}
function pack(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const tarballDir = init(opts);
        const targetJsonFile = opts.jsonFile;
        if (opts.workspace && opts.workspace.length > 0) {
            yield Promise.all(opts.workspace.map(ws => packPackages(Array.from(linkedPackagesOfWorkspace(ws)), tarballDir, targetJsonFile)));
        }
        else if (opts.project && opts.project.length > 0) {
            return packProject(opts.project, tarballDir, targetJsonFile);
        }
        else if (opts.dir && opts.dir.length > 0) {
            yield packPackages(opts.dir, tarballDir, targetJsonFile);
        }
        else if (opts.packages && opts.packages.length > 0) {
            const dirs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), opts.packages))
                .filter(pkg => pkg && (pkg.json.dr != null || pkg.json.plink != null))
                .map(pkg => pkg.realPath);
            yield packPackages(dirs, tarballDir, targetJsonFile);
        }
        else {
            yield packPackages(Array.from(linkedPackagesOfWorkspace(misc_1.plinkEnv.workDir)), tarballDir, targetJsonFile);
        }
    });
}
exports.pack = pack;
function publish(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        init(opts);
        if (opts.project && opts.project.length > 0)
            return publishProject(opts.project, opts.public ? ['--access', 'public'] : []);
        else if (opts.dir && opts.dir.length > 0) {
            yield publishPackages(opts.dir, opts.public ? ['--access', 'public'] : []);
        }
        else if (opts.packages && opts.packages.length > 0) {
            const dirs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), opts.packages))
                .filter(pkg => pkg)
                .map(pkg => pkg.realPath);
            yield publishPackages(dirs, opts.public ? ['--access', 'public'] : []);
        }
        else {
            yield publishPackages(Array.from(linkedPackagesOfWorkspace(misc_1.plinkEnv.workDir)), opts.public ? ['--access', 'public'] : []);
        }
    });
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
function packPackages(packageDirs, tarballDir, targetJsonFile) {
    return __awaiter(this, void 0, void 0, function* () {
        const excludeFromSync = new Set();
        const package2tarball = new Map();
        if (packageDirs && packageDirs.length > 0) {
            const done = rx.from(packageDirs).pipe(op.mergeMap(packageDir => rx.defer(() => npmPack(packageDir, tarballDir)), 4), op.reduce((all, item) => {
                all.push(item);
                return all;
            }, [])).toPromise();
            const tarInfos = (yield done).filter(item => typeof item != null);
            for (const item of tarInfos) {
                // log.info(item);
                package2tarball.set(item.name, Path.resolve(tarballDir, item.filename));
                if (item.name === '@wfh/plink') {
                    excludeFromSync.add(item.dir);
                }
            }
            yield deleteOldTar(tarInfos.map(item => new RegExp('^' +
                _.escapeRegExp(item.name.replace('@', '').replace(/[/\\]/g, '-'))
                + '\\-\\d+(?:\\.\\d+){1,2}(?:\\-[^]+?)?\\.tgz$', 'i')), tarInfos.map(item => item.filename), tarballDir);
            changePackageJson(package2tarball, targetJsonFile);
            yield new Promise(resolve => setImmediate(resolve));
            package_mgr_1.actionDispatcher.scanAndSyncPackages({
                packageJsonFiles: packageDirs.filter(dir => !excludeFromSync.has(dir))
                    .map(dir => Path.resolve(dir, 'package.json'))
            });
        }
    });
}
function packProject(projectDirs, tarballDir, targetJsonFile) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = [];
        for (const pkg of (0, package_mgr_1.getPackagesOfProjects)(projectDirs)) {
            dirs.push(pkg.realPath);
        }
        yield packPackages(dirs, tarballDir, targetJsonFile);
    });
}
function publishPackages(packageDirs, npmCliOpts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageDirs && packageDirs.length > 0) {
            const pgPaths = packageDirs;
            yield (0, promise_queque_1.queueUp)(4, pgPaths.map(packageDir => () => __awaiter(this, void 0, void 0, function* () {
                try {
                    log.info(`publishing ${packageDir}`);
                    const params = ['publish', ...npmCliOpts, { silent: true, cwd: packageDir }];
                    const output = yield (0, process_utils_1.exe)('npm', ...params).promise;
                    log.info(output);
                }
                catch (e) {
                    log.error(e);
                }
            })));
        }
    });
}
function publishProject(projectDirs, npmCliOpts) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = [];
        for (const pkg of (0, package_mgr_1.getPackagesOfProjects)(projectDirs)) {
            dirs.push(pkg.realPath);
        }
        yield publishPackages(dirs, npmCliOpts);
    });
}
function npmPack(packagePath, tarballDir) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const output = yield ((0, process_utils_1.exe)('npm', 'pack', Path.resolve(packagePath), { silent: true, cwd: tarballDir }).done);
            const resultInfo = parseNpmPackOutput(output.errout);
            const packageName = resultInfo.get('name');
            // cb(packageName, resultInfo.get('filename')!);
            log.info(output.errout);
            log.info(output.stdout);
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
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDhGQUFrRjtBQUNsRiwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMscUNBQXFDO0FBQ3JDLHFEQUFxRDtBQUNyRCxpRkFBdUU7QUFDdkUsa0ZBQTZFO0FBQzdFLHVEQUErQjtBQUUvQixnREFBK0Y7QUFDL0YsNEVBQXlFO0FBQ3pFLG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFDbkMsbUNBQTRDO0FBQzVDLHdDQUF1QztBQUN2Qyw0QkFBMEI7QUFFMUIsMEJBQTBCO0FBQzFCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFL0MsU0FBUyxJQUFJLENBQUMsSUFBa0M7SUFDOUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUEsZ0JBQU0sR0FBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM5RSxrQkFBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QixPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBRUQsU0FBc0IsSUFBSSxDQUFDLElBQWlCOztRQUMxQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUVyQyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FB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QUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtxdWV1ZVVwfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QvcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2V4ZX0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQganNvblBhcnNlciwge09iamVjdEFzdCwgVG9rZW59IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9wYXRjaC10ZXh0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7UGFja09wdGlvbnMsIFB1Ymxpc2hPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Z2V0UGFja2FnZXNPZlByb2plY3RzLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBhY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0ICcuLi9lZGl0b3ItaGVscGVyJztcblxuLy8gbGV0IHRhcmJhbGxEaXI6IHN0cmluZztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNsaS1wYWNrJyk7XG5cbmZ1bmN0aW9uIGluaXQob3B0czogUHVibGlzaE9wdGlvbnMgfCBQYWNrT3B0aW9ucykge1xuICBjb25zdCB0YXJiYWxsRGlyID0gb3B0cy50YXJEaXIgfHwgUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAndGFyYmFsbHMnKTtcbiAgZnNleHQubWtkaXJwU3luYyh0YXJiYWxsRGlyKTtcbiAgcmV0dXJuIHRhcmJhbGxEaXI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKG9wdHM6IFBhY2tPcHRpb25zKSB7XG4gIGNvbnN0IHRhcmJhbGxEaXIgPSBpbml0KG9wdHMpO1xuICBjb25zdCB0YXJnZXRKc29uRmlsZSA9IG9wdHMuanNvbkZpbGU7XG5cbiAgaWYgKG9wdHMud29ya3NwYWNlICYmIG9wdHMud29ya3NwYWNlLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChvcHRzLndvcmtzcGFjZS5tYXAod3MgPT4gcGFja1BhY2thZ2VzKFxuICAgICAgQXJyYXkuZnJvbShsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHdzKSksIHRhcmJhbGxEaXIsIHRhcmdldEpzb25GaWxlKSlcbiAgICApO1xuICB9IGVsc2UgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwYWNrUHJvamVjdChvcHRzLnByb2plY3QsIHRhcmJhbGxEaXIsIHRhcmdldEpzb25GaWxlKTtcbiAgfSBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKG9wdHMuZGlyLCB0YXJiYWxsRGlyLCB0YXJnZXRKc29uRmlsZSk7XG4gIH0gZWxzZSBpZiAob3B0cy5wYWNrYWdlcyAmJiBvcHRzLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkaXJzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIG9wdHMucGFja2FnZXMpKVxuICAgIC5maWx0ZXIocGtnID0+IHBrZyAmJiAocGtnLmpzb24uZHIgIT0gbnVsbCB8fCBwa2cuanNvbi5wbGluayAhPSBudWxsKSlcbiAgICAubWFwKHBrZyA9PiBwa2chLnJlYWxQYXRoKTtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycywgdGFyYmFsbERpciwgdGFyZ2V0SnNvbkZpbGUpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHBhY2tQYWNrYWdlcyhBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpcikpLCB0YXJiYWxsRGlyLCB0YXJnZXRKc29uRmlsZSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2gob3B0czogUHVibGlzaE9wdGlvbnMpIHtcbiAgaW5pdChvcHRzKTtcblxuICBpZiAob3B0cy5wcm9qZWN0ICYmIG9wdHMucHJvamVjdC5sZW5ndGggPiAwKVxuICAgIHJldHVybiBwdWJsaXNoUHJvamVjdChvcHRzLnByb2plY3QsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgZWxzZSBpZiAob3B0cy5kaXIgJiYgb3B0cy5kaXIubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhvcHRzLmRpciwgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICB9IGVsc2UgaWYgKG9wdHMucGFja2FnZXMgJiYgb3B0cy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZGlycyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2VzKSlcbiAgICAuZmlsdGVyKHBrZyA9PiBwa2cpXG4gICAgLm1hcChwa2cgPT4gcGtnIS5yZWFsUGF0aCk7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKGRpcnMsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoQXJyYXkuZnJvbShsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIpKSxcbiAgICAgIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfVxufVxuXG5mdW5jdGlvbiAqbGlua2VkUGFja2FnZXNPZldvcmtzcGFjZSh3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleSh3b3Jrc3BhY2VEaXIpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgbG9nLmVycm9yKGBXb3Jrc3BhY2UgJHt3b3Jrc3BhY2VEaXJ9IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnlgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KSkge1xuICAgIHlpZWxkIHBrZy5yZWFsUGF0aDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCB0YXJiYWxsRGlyOiBzdHJpbmcsIHRhcmdldEpzb25GaWxlPzogc3RyaW5nKSB7XG4gIGNvbnN0IGV4Y2x1ZGVGcm9tU3luYyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG5cbiAgaWYgKHBhY2thZ2VEaXJzICYmIHBhY2thZ2VEaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkb25lID0gcnguZnJvbShwYWNrYWdlRGlycykucGlwZShcbiAgICAgIG9wLm1lcmdlTWFwKHBhY2thZ2VEaXIgPT4gcnguZGVmZXIoKCkgPT4gbnBtUGFjayhwYWNrYWdlRGlyLCB0YXJiYWxsRGlyKSksIDQpLFxuICAgICAgb3AucmVkdWNlPFJldHVyblR5cGU8dHlwZW9mIG5wbVBhY2s+IGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duPigoYWxsLCBpdGVtKSA9PiB7XG4gICAgICAgIGFsbC5wdXNoKGl0ZW0pO1xuICAgICAgICByZXR1cm4gYWxsO1xuICAgICAgfSwgW10pXG4gICAgKS50b1Byb21pc2UoKTtcblxuICAgIGNvbnN0IHRhckluZm9zID0gKGF3YWl0IGRvbmUpLmZpbHRlcihpdGVtID0+IHR5cGVvZiBpdGVtICE9IG51bGwpIGFzXG4gICAgICAodHlwZW9mIGRvbmUgZXh0ZW5kcyBQcm9taXNlPChpbmZlciBUKVtdPiA/IE5vbk51bGxhYmxlPFQ+IDogdW5rbm93bilbXTtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0YXJJbmZvcykge1xuICAgICAgLy8gbG9nLmluZm8oaXRlbSk7XG4gICAgICBwYWNrYWdlMnRhcmJhbGwuc2V0KGl0ZW0ubmFtZSwgUGF0aC5yZXNvbHZlKHRhcmJhbGxEaXIsIGl0ZW0uZmlsZW5hbWUpKTtcbiAgICAgIGlmIChpdGVtLm5hbWUgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBleGNsdWRlRnJvbVN5bmMuYWRkKGl0ZW0uZGlyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBkZWxldGVPbGRUYXIodGFySW5mb3MubWFwKGl0ZW0gPT4gbmV3IFJlZ0V4cCgnXicgK1xuICAgICAgXy5lc2NhcGVSZWdFeHAoaXRlbS5uYW1lLnJlcGxhY2UoJ0AnLCAnJykucmVwbGFjZSgvWy9cXFxcXS9nLCAnLScpKVxuICAgICAgICArICdcXFxcLVxcXFxkKyg/OlxcXFwuXFxcXGQrKXsxLDJ9KD86XFxcXC1bXl0rPyk/XFxcXC50Z3okJywgJ2knXG4gICAgICApKSxcbiAgICAgIHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0uZmlsZW5hbWUpLFxuICAgICAgdGFyYmFsbERpcik7XG4gICAgY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsLCB0YXJnZXRKc29uRmlsZSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7XG4gICAgICBwYWNrYWdlSnNvbkZpbGVzOiBwYWNrYWdlRGlycy5maWx0ZXIoZGlyID0+ICFleGNsdWRlRnJvbVN5bmMuaGFzKGRpcikpXG4gICAgICAgIC5tYXAoZGlyID0+IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKSlcbiAgICB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIHRhcmJhbGxEaXI6IHN0cmluZywgdGFyZ2V0SnNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycywgdGFyYmFsbERpciwgdGFyZ2V0SnNvbkZpbGUpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBhd2FpdCBxdWV1ZVVwKDQsIHBnUGF0aHMubWFwKHBhY2thZ2VEaXIgPT4gYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oYHB1Ymxpc2hpbmcgJHtwYWNrYWdlRGlyfWApO1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBbJ3B1Ymxpc2gnLCAuLi5ucG1DbGlPcHRzLCB7c2lsZW50OiB0cnVlLCBjd2Q6IHBhY2thZ2VEaXJ9XTtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgZXhlKCducG0nLCAuLi5wYXJhbXMpLnByb21pc2U7XG4gICAgICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVibGlzaFByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoZGlycywgbnBtQ2xpT3B0cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5wbVBhY2socGFja2FnZVBhdGg6IHN0cmluZywgdGFyYmFsbERpcjogc3RyaW5nKTpcbiAgUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBmaWxlbmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IGRpcjogc3RyaW5nfSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCAoZXhlKCducG0nLCAncGFjaycsIFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCksXG4gICAgICB7c2lsZW50OiB0cnVlLCBjd2Q6IHRhcmJhbGxEaXJ9KS5kb25lKTtcblxuICAgIGNvbnN0IHJlc3VsdEluZm8gPSBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0LmVycm91dCk7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IHJlc3VsdEluZm8uZ2V0KCduYW1lJykhO1xuICAgIC8vIGNiKHBhY2thZ2VOYW1lLCByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSEpO1xuICAgIGxvZy5pbmZvKG91dHB1dC5lcnJvdXQpO1xuICAgIGxvZy5pbmZvKG91dHB1dC5zdGRvdXQpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICAgIGZpbGVuYW1lOiBvdXRwdXQuc3Rkb3V0LnRyaW0oKSxcbiAgICAgIHZlcnNpb246IHJlc3VsdEluZm8uZ2V0KCd2ZXJzaW9uJykhLFxuICAgICAgZGlyOiBwYWNrYWdlUGF0aFxuICAgIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoLCBlKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEBwYXJhbSBwYWNrYWdlMnRhcmJhbGwgXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZVBhY2thZ2VKc29uKHBhY2thZ2VUYXJiYWxsTWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+LCB0YXJnZXRKc29uRmlsZT86IHN0cmluZykge1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwKHBhY2thZ2VUYXJiYWxsTWFwKTtcbiAgaWYgKHRhcmdldEpzb25GaWxlKSB7XG4gICAgY2hhbmdlU2luZ2xlUGFja2FnZUpzb24oUGF0aC5kaXJuYW1lKHRhcmdldEpzb25GaWxlKSwgcGFja2FnZTJ0YXJiYWxsKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZm9yIChjb25zdCB3b3Jrc3BhY2Ugb2YgXy51bmlxKFtcbiAgICAuLi5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpLCAnJ10pLm1hcChkaXIgPT4gUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCBkaXIpKVxuICApIHtcbiAgICBjb25zdCB3c0RpciA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgd29ya3NwYWNlKTtcbiAgICBjaGFuZ2VTaW5nbGVQYWNrYWdlSnNvbih3c0RpciwgcGFja2FnZTJ0YXJiYWxsKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VTaW5nbGVQYWNrYWdlSnNvbih3c0Rpcjogc3RyaW5nLCBwYWNrYWdlMnRhcmJhbGw6IE1hcDxzdHJpbmcsIHN0cmluZz4pIHtcbiAgY29uc3QganNvbkZpbGUgPSBQYXRoLnJlc29sdmUod3NEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGtqID0gZnMucmVhZEZpbGVTeW5jKGpzb25GaWxlLCAndXRmOCcpO1xuICBjb25zdCBhc3QgPSBqc29uUGFyc2VyKHBraik7XG4gIGNvbnN0IGRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RlcGVuZGVuY2llcycpO1xuICBjb25zdCBkZXZEZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXZEZXBlbmRlbmNpZXMnKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gIGlmIChkZXBzQXN0KSB7XG4gICAgY2hhbmdlRGVwZW5kZW5jaWVzKHBhY2thZ2UydGFyYmFsbCwgZGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QsIHdzRGlyLCBqc29uRmlsZSwgcmVwbGFjZW1lbnRzKTtcbiAgfVxuICBpZiAoZGV2RGVwc0FzdCkge1xuICAgIGNoYW5nZURlcGVuZGVuY2llcyhwYWNrYWdlMnRhcmJhbGwsIGRldkRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0LCB3c0RpciwganNvbkZpbGUsIHJlcGxhY2VtZW50cyk7XG4gIH1cblxuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZXBsYWNlZCA9IHJlcGxhY2VDb2RlKHBraiwgcmVwbGFjZW1lbnRzKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGBVcGRhdGVkICR7anNvbkZpbGV9XFxuYCwgcmVwbGFjZWQpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoanNvbkZpbGUsIHJlcGxhY2VkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VEZXBlbmRlbmNpZXMocGFja2FnZTJ0YXJiYWxsOiBNYXA8c3RyaW5nLCBzdHJpbmc+LCBkZXBzOiBPYmplY3RBc3QsIHdzRGlyOiBzdHJpbmcsIGpzb25GaWxlOiBzdHJpbmcsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSkge1xuICAvLyBjb25zb2xlLmxvZyhkZXBzLnByb3BlcnRpZXMubWFwKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgKyAnOicgKyAocHJvcC52YWx1ZSBhcyBUb2tlbikudGV4dCkpO1xuICAvLyBjb25zb2xlLmxvZyhBcnJheS5mcm9tKHBhY2thZ2UydGFyYmFsbC5lbnRyaWVzKCkpKTtcbiAgY29uc3QgZm91bmREZXBzID0gZGVwcy5wcm9wZXJ0aWVzLmZpbHRlcigoe25hbWV9KSA9PiBwYWNrYWdlMnRhcmJhbGwuaGFzKEpTT04ucGFyc2UobmFtZS50ZXh0KSkpO1xuICBmb3IgKGNvbnN0IGZvdW5kRGVwIG9mIGZvdW5kRGVwcykge1xuICAgIGNvbnN0IHZlclRva2VuID0gZm91bmREZXAudmFsdWUgYXMgVG9rZW47XG4gICAgY29uc3QgcGtOYW1lID0gSlNPTi5wYXJzZShmb3VuZERlcC5uYW1lLnRleHQpIGFzIHN0cmluZztcbiAgICBjb25zdCB0YXJGaWxlID0gcGFja2FnZTJ0YXJiYWxsLmdldChwa05hbWUpO1xuICAgIGxldCBuZXdWZXJzaW9uID0gUGF0aC5yZWxhdGl2ZSh3c0RpciwgdGFyRmlsZSEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIW5ld1ZlcnNpb24uc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBuZXdWZXJzaW9uID0gJy4vJyArIG5ld1ZlcnNpb247XG4gICAgfVxuICAgIGxvZy5pbmZvKGBVcGRhdGUgJHtqc29uRmlsZX06ICR7dmVyVG9rZW4udGV4dH0gPT4gJHtuZXdWZXJzaW9ufWApO1xuICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHN0YXJ0OiB2ZXJUb2tlbi5wb3MsXG4gICAgICBlbmQ6IHZlclRva2VuLmVuZCxcbiAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KG5ld1ZlcnNpb24pXG4gICAgfSk7XG4gICAgLy8gcGFja2FnZTJ0YXJiYWxsLmRlbGV0ZShwa05hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGg6IHN0cmluZywgZTogRXJyb3IpIHtcbiAgaWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuICAgIGxvZy5pbmZvKGBucG0gcGFjayAke3BhY2thZ2VQYXRofTogRVBVQkxJU0hDT05GTElDVC5gKTtcbiAgZWxzZVxuICAgIGxvZy5lcnJvcihwYWNrYWdlUGF0aCwgZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gb3V0cHV0IFxuICogZS5nLlxubnBtIG5vdGljZSA9PT0gVGFyYmFsbCBEZXRhaWxzID09PSBcbm5wbSBub3RpY2UgbmFtZTogICAgICAgICAgcmVxdWlyZS1pbmplY3RvciAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB2ZXJzaW9uOiAgICAgICA1LjEuNSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIGZpbGVuYW1lOiAgICAgIHJlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6ICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgcGFja2FnZSBzaXplOiAgNTYuOSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB1bnBhY2tlZCBzaXplOiAyMjkuMSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHNoYXN1bTogICAgICAgIGMwNjkzMjcwYzE0MGY2NWE2OTYyMDdhYjlkZWIxOGU2NDQ1MmEwMmNcbm5wbSBub3RpY2UgaW50ZWdyaXR5OiAgICAgc2hhNTEyLWtSR1ZXY3cxZnZRNUpbLi4uXUFCd0xQVThVdlN0YkE9PVxubnBtIG5vdGljZSB0b3RhbCBmaWxlczogICA0NyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIFxuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IHN0cmlwQW5zaShvdXRwdXQpLnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IGxpbmVzT2Zmc2V0ID0gXy5maW5kTGFzdEluZGV4KGxpbmVzLCBsaW5lID0+IGxpbmUuaW5kZXhPZignVGFyYmFsbCBEZXRhaWxzJykgPj0gMCk7XG4gIGNvbnN0IHRhcmJhbGxJbmZvID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgbGluZXMuc2xpY2UobGluZXNPZmZzZXQpLmZvckVhY2gobGluZSA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSAvbnBtIG5vdGljZVxccysoW146XSspWzpdXFxzKiguKz8pXFxzKiQvLmV4ZWMobGluZSk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0YXJiYWxsSW5mby5zZXQobWF0Y2hbMV0sIG1hdGNoWzJdKTtcbiAgfSk7XG4gIHJldHVybiB0YXJiYWxsSW5mbztcbn1cblxuZXhwb3J0IGNvbnN0IHRlc3RhYmxlID0ge3BhcnNlTnBtUGFja091dHB1dH07XG5cbmZ1bmN0aW9uIGRlbGV0ZU9sZFRhcihkZWxldGVGaWxlUmVnOiBSZWdFeHBbXSwga2VlcGZpbGVzOiBzdHJpbmdbXSwgdGFyYmFsbERpcjogc3RyaW5nKSB7XG4gIC8vIGxvZy53YXJuKGRlbGV0ZUZpbGVSZWcsIGtlZXBmaWxlcyk7XG4gIGNvbnN0IHRhclNldCA9IG5ldyBTZXQoa2VlcGZpbGVzKTtcbiAgY29uc3QgZGVsZXRlRG9uZTogUHJvbWlzZTxhbnk+W10gPSBbXTtcblxuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyYmFsbERpcikpXG4gICAgZnNleHQubWtkaXJwU3luYyh0YXJiYWxsRGlyKTtcblxuICAvLyBjb25zb2xlLmxvZyh0YXJTZXQsIGRlbGV0ZUZpbGVSZWcpO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYyh0YXJiYWxsRGlyKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUmVnLnNvbWUocmVnID0+IHJlZy50ZXN0KGZpbGUpKSkge1xuICAgICAgbG9nLndhcm4oJ1JlbW92ZSAnICsgZmlsZSk7XG4gICAgICBkZWxldGVEb25lLnB1c2goZnMucHJvbWlzZXMudW5saW5rKFBhdGgucmVzb2x2ZSh0YXJiYWxsRGlyLCBmaWxlKSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsZXRlRG9uZSk7XG59XG4iXX0=