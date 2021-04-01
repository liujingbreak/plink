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
const promise_queque_1 = require("../../../thread-promise-pool/dist/promise-queque");
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
let tarballDir;
const log = log4js_1.default.getLogger('plink.cli-pack');
function init(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        tarballDir = Path.resolve(config_1.default().rootPath, 'tarballs');
        fs_extra_1.default.mkdirpSync(tarballDir);
    });
}
function pack(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield init(opts);
        if (opts.workspace && opts.workspace.length > 0) {
            yield Promise.all(opts.workspace.map(ws => packPackages(Array.from(linkedPackagesOfWorkspace(ws)))));
        }
        else if (opts.project && opts.project.length > 0) {
            return packProject(opts.project);
        }
        else if (opts.dir && opts.dir.length > 0) {
            yield packPackages(opts.dir);
        }
        else if (opts.packages && opts.packages.length > 0) {
            const dirs = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), opts.packages))
                .filter(pkg => pkg && (pkg.json.dr != null || pkg.json.plink != null))
                .map(pkg => pkg.realPath);
            yield packPackages(dirs);
        }
        else {
            yield packPackages(Array.from(linkedPackagesOfWorkspace(misc_1.plinkEnv.workDir)));
        }
    });
}
exports.pack = pack;
function publish(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        yield init(opts);
        if (opts.project && opts.project.length > 0)
            return publishProject(opts.project, opts.public ? ['--access', 'public'] : []);
        else if (opts.dir && opts.dir.length > 0) {
            yield publishPackages(opts.dir, opts.public ? ['--access', 'public'] : []);
        }
        else if (opts.packages && opts.packages.length > 0) {
            const dirs = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), opts.packages))
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
    const wsKey = package_mgr_1.workspaceKey(workspaceDir);
    if (!package_mgr_1.getState().workspaces.has(wsKey)) {
        log.error(`Workspace ${workspaceDir} is not a workspace directory`);
        return;
    }
    for (const pkg of package_list_helper_1.packages4WorkspaceKey(wsKey)) {
        yield pkg.realPath;
    }
}
function packPackages(packageDirs) {
    return __awaiter(this, void 0, void 0, function* () {
        const excludeFromSync = new Set();
        const package2tarball = new Map();
        if (packageDirs && packageDirs.length > 0) {
            // const pgPaths: string[] = packageDirs;
            const done = rx.from(packageDirs).pipe(op.mergeMap(packageDir => rx.defer(() => npmPack(packageDir)), 4), op.reduce((all, item) => {
                all.push(item);
                return all;
            }, [])).toPromise();
            // const done = queueUp(4, packageDirs.map(packageDir => () => npmPack(packageDir)));
            const tarInfos = (yield done).filter(item => typeof item != null);
            for (const item of tarInfos) {
                package2tarball.set(item.name, Path.resolve(tarballDir, item.filename));
                if (item.name === '@wfh/plink') {
                    excludeFromSync.add(item.dir);
                }
            }
            // log.info(Array.from(package2tarball.entries())
            //   .map(([pkName, ver]) => `"${pkName}": "${ver}",`)
            //   .join('\n'));
            yield deleteOldTar(tarInfos.map(item => new RegExp('^' +
                _.escapeRegExp(item.name.replace('@', '').replace(/[/\\]/g, '-'))
                + '\\-\\d+(?:\\.\\d+){1,2}(?:\\-[^]+?)?\\.tgz$', 'i')), tarInfos.map(item => item.filename));
            yield changePackageJson(package2tarball);
            yield new Promise(resolve => setImmediate(resolve));
            package_mgr_1.actionDispatcher.scanAndSyncPackages({
                packageJsonFiles: packageDirs.filter(dir => !excludeFromSync.has(dir))
                    .map(dir => Path.resolve(dir, 'package.json'))
            });
        }
    });
}
function packProject(projectDirs) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = [];
        for (const pkg of package_mgr_1.getPackagesOfProjects(projectDirs)) {
            dirs.push(pkg.realPath);
        }
        yield packPackages(dirs);
    });
}
function publishPackages(packageDirs, npmCliOpts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageDirs && packageDirs.length > 0) {
            const pgPaths = packageDirs;
            yield promise_queque_1.queueUp(4, pgPaths.map(packageDir => () => __awaiter(this, void 0, void 0, function* () {
                try {
                    log.info(`publishing ${packageDir}`);
                    const params = ['publish', ...npmCliOpts, { silent: true, cwd: packageDir }];
                    const output = yield process_utils_1.promisifyExe('npm', ...params);
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
        for (const pkg of package_mgr_1.getPackagesOfProjects(projectDirs)) {
            dirs.push(pkg.realPath);
        }
        yield publishPackages(dirs, npmCliOpts);
    });
}
function npmPack(packagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const output = yield process_utils_1.promisifyExe('npm', 'pack', Path.resolve(packagePath), { silent: true, cwd: tarballDir });
            const resultInfo = parseNpmPackOutput(output);
            const packageName = resultInfo.get('name');
            // cb(packageName, resultInfo.get('filename')!);
            log.info(output);
            return {
                name: packageName,
                filename: resultInfo.get('filename'),
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
function changePackageJson(packageTarballMap) {
    const package2tarball = new Map(packageTarballMap);
    // include Root dir
    for (const workspace of _.uniq([
        ...package_mgr_1.getState().workspaces.keys(), ''
    ]).map(dir => Path.resolve(config_1.default().rootPath, dir))) {
        const wsDir = Path.resolve(config_1.default().rootPath, workspace);
        const jsonFile = Path.resolve(wsDir, 'package.json');
        const pkj = fs.readFileSync(jsonFile, 'utf8');
        const ast = json_sync_parser_1.default(pkj);
        const depsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'dependencies');
        const devDepsAst = ast.properties.find(({ name }) => JSON.parse(name.text) === 'devDependencies');
        const replacements = [];
        if (depsAst) {
            changeDependencies(depsAst.value, wsDir, jsonFile, replacements);
        }
        if (devDepsAst) {
            changeDependencies(devDepsAst.value, wsDir, jsonFile, replacements);
        }
        // if (package2tarball.size > 0) {
        //   const appendToAst = depsAst ? depsAst : devDepsAst;
        //   if (appendToAst == null) {
        //     // There is no dependencies or DevDependencies
        //     replacements.push({replacement: ',\n  dependencies: {\n    ', start: pkj.length - 2, end: pkj.length - 2});
        //     appendRemainderPkgs(pkj.length - 2);
        //     replacements.push({replacement: '\n  }\n', start: pkj.length - 2, end: pkj.length - 2});
        //   } else {
        //     let appendPos = (appendToAst.value).end - 1;
        //     const existingEntries = (appendToAst.value as ObjectAst).properties;
        //     if (existingEntries.length > 0) {
        //       appendPos = existingEntries[existingEntries.length - 1].value.end;
        //     }
        //     replacements.push({
        //       replacement: ',\n    ', start: appendPos, end: appendPos
        //     });
        //     appendRemainderPkgs(appendPos);
        //     replacements.push({
        //       replacement: '\n', start: appendPos, end: appendPos
        //     });
        //   }
        // }
        // function appendRemainderPkgs(appendPos: number) {
        //   let i = 1;
        //   for (const [pkName, tarFile] of package2tarball) {
        //     let newVersion = Path.relative(wsDir, tarFile).replace(/\\/g, '/');
        //     log.info(`Append ${jsonFile}: "${pkName}": ${newVersion}`);
        //     if (!newVersion.startsWith('.')) {
        //       newVersion = './' + newVersion;
        //     }
        //     replacements.push({
        //       replacement: `"${pkName}": ${newVersion}`, start: appendPos, end: appendPos
        //     });
        //     if (i !== package2tarball.size) {
        //       replacements.push({
        //         replacement: ',\n    ', start: appendPos, end: appendPos
        //       });
        //     }
        //     i++;
        //   }
        // }
        if (replacements.length > 0) {
            const replaced = patch_text_1.default(pkj, replacements);
            // tslint:disable-next-line: no-console
            log.info(`Updated ${jsonFile}\n`, replaced);
            fs.writeFileSync(jsonFile, replaced);
        }
    }
    function changeDependencies(deps, wsDir, jsonFile, replacements) {
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
    const lines = strip_ansi_1.default(output).split(/\r?\n/);
    const linesOffset = _.findLastIndex(lines, line => line.indexOf('Tarball Details') >= 0);
    const tarballInfo = new Map();
    lines.slice(linesOffset).forEach(line => {
        const match = /npm notice\s+([^:]+)[:]\s*(.+?)\s*$/.exec(line);
        if (!match)
            return null;
        return tarballInfo.set(match[1], match[2]);
    });
    return tarballInfo;
}
exports.testable = { parseNpmPackOutput };
function deleteOldTar(deleteFileReg, keepfiles) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHFGQUF5RTtBQUN6RSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQThDO0FBQzlDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMscUNBQXFDO0FBQ3JDLHFEQUFxRDtBQUNyRCxpRkFBdUU7QUFDdkUsa0ZBQTZFO0FBQzdFLHVEQUErQjtBQUUvQixnREFBK0Y7QUFDL0YsNEVBQXlFO0FBQ3pFLG9EQUE0QjtBQUM1Qiw0REFBbUM7QUFDbkMsbUNBQTRDO0FBQzVDLHdDQUF1QztBQUN2Qyw0QkFBMEI7QUFFMUIsSUFBSSxVQUFrQixDQUFDO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFL0MsU0FBZSxJQUFJLENBQUMsSUFBa0M7O1FBQ3BELFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDekQsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUFBO0FBRUQsU0FBc0IsSUFBSSxDQUFDLElBQWlCOztRQUMxQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHlCQUF5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LENBQUM7QUFDckIsQ0FBQztBQUVZLFFBQUEsUUFBUSxHQUFHLEVBQUMsa0JBQWtCLEVBQUMsQ0FBQztBQUU3QyxTQUFTLFlBQVksQ0FBQyxhQUF1QixFQUFFLFNBQW1CO0lBQ2hFLHNDQUFzQztJQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsQyxNQUFNLFVBQVUsR0FBbUIsRUFBRSxDQUFDO0lBRXRDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUM1QixrQkFBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUUvQixzQ0FBc0M7SUFFdEMsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDM0IsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQge3F1ZXVlVXB9IGZyb20gJy4uLy4uLy4uL3RocmVhZC1wcm9taXNlLXBvb2wvZGlzdC9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzaWZ5RXhlfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCBqc29uUGFyc2VyLCB7T2JqZWN0QXN0LCBUb2tlbn0gZnJvbSAnLi4vdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L3BhdGNoLXRleHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtQYWNrT3B0aW9ucywgUHVibGlzaE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtnZXRQYWNrYWdlc09mUHJvamVjdHMsIGdldFN0YXRlLCB3b3Jrc3BhY2VLZXksIGFjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzdHJpcEFuc2kgZnJvbSAnc3RyaXAtYW5zaSc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgJy4uL2VkaXRvci1oZWxwZXInO1xuXG5sZXQgdGFyYmFsbERpcjogc3RyaW5nO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY2xpLXBhY2snKTtcblxuYXN5bmMgZnVuY3Rpb24gaW5pdChvcHRzOiBQdWJsaXNoT3B0aW9ucyB8IFBhY2tPcHRpb25zKSB7XG4gIHRhcmJhbGxEaXIgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICd0YXJiYWxscycpO1xuICBmc2V4dC5ta2RpcnBTeW5jKHRhcmJhbGxEaXIpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFjayhvcHRzOiBQYWNrT3B0aW9ucykge1xuICBhd2FpdCBpbml0KG9wdHMpO1xuXG4gIGlmIChvcHRzLndvcmtzcGFjZSAmJiBvcHRzLndvcmtzcGFjZS5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwob3B0cy53b3Jrc3BhY2UubWFwKHdzID0+IHBhY2tQYWNrYWdlcyhBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2Uod3MpKSkpKTtcbiAgfSBlbHNlIGlmIChvcHRzLnByb2plY3QgJiYgb3B0cy5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gcGFja1Byb2plY3Qob3B0cy5wcm9qZWN0KTtcbiAgfSBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKG9wdHMuZGlyKTtcbiAgfSBlbHNlIGlmIChvcHRzLnBhY2thZ2VzICYmIG9wdHMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRpcnMgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlcykpXG4gICAgLmZpbHRlcihwa2cgPT4gcGtnICYmIChwa2cuanNvbi5kciAhPSBudWxsIHx8IHBrZy5qc29uLnBsaW5rICE9IG51bGwpKVxuICAgIC5tYXAocGtnID0+IHBrZyEucmVhbFBhdGgpO1xuXG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKGRpcnMpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHBhY2tQYWNrYWdlcyhBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpcikpKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHVibGlzaChvcHRzOiBQdWJsaXNoT3B0aW9ucykge1xuICBhd2FpdCBpbml0KG9wdHMpO1xuXG4gIGlmIChvcHRzLnByb2plY3QgJiYgb3B0cy5wcm9qZWN0Lmxlbmd0aCA+IDApXG4gICAgcmV0dXJuIHB1Ymxpc2hQcm9qZWN0KG9wdHMucHJvamVjdCwgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICBlbHNlIGlmIChvcHRzLmRpciAmJiBvcHRzLmRpci5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKG9wdHMuZGlyLCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH0gZWxzZSBpZiAob3B0cy5wYWNrYWdlcyAmJiBvcHRzLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBkaXJzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIG9wdHMucGFja2FnZXMpKVxuICAgIC5maWx0ZXIocGtnID0+IHBrZylcbiAgICAubWFwKHBrZyA9PiBwa2chLnJlYWxQYXRoKTtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoZGlycywgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhBcnJheS5mcm9tKGxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpcikpLFxuICAgICAgb3B0cy5wdWJsaWMgPyBbJy0tYWNjZXNzJywgJ3B1YmxpYyddIDogW10pO1xuICB9XG59XG5cbmZ1bmN0aW9uICpsaW5rZWRQYWNrYWdlc09mV29ya3NwYWNlKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpcik7XG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpIHtcbiAgICBsb2cuZXJyb3IoYFdvcmtzcGFjZSAke3dvcmtzcGFjZURpcn0gaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeWApO1xuICAgIHJldHVybjtcbiAgfVxuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgeWllbGQgcGtnLnJlYWxQYXRoO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhY2tQYWNrYWdlcyhwYWNrYWdlRGlyczogc3RyaW5nW10pIHtcbiAgY29uc3QgZXhjbHVkZUZyb21TeW5jID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cblxuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIC8vIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG4gICAgY29uc3QgZG9uZSA9IHJ4LmZyb20ocGFja2FnZURpcnMpLnBpcGUoXG4gICAgICBvcC5tZXJnZU1hcChwYWNrYWdlRGlyID0+IHJ4LmRlZmVyKCgpID0+IG5wbVBhY2socGFja2FnZURpcikpLCA0KSxcbiAgICAgIG9wLnJlZHVjZTxSZXR1cm5UeXBlPHR5cGVvZiBucG1QYWNrPiBleHRlbmRzIFByb21pc2U8aW5mZXIgVD4gPyBUIDogdW5rbm93bj4oKGFsbCwgaXRlbSkgPT4ge1xuICAgICAgICBhbGwucHVzaChpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFsbDtcbiAgICAgIH0sIFtdKVxuICAgICkudG9Qcm9taXNlKCk7XG4gICAgLy8gY29uc3QgZG9uZSA9IHF1ZXVlVXAoNCwgcGFja2FnZURpcnMubWFwKHBhY2thZ2VEaXIgPT4gKCkgPT4gbnBtUGFjayhwYWNrYWdlRGlyKSkpO1xuICAgIGNvbnN0IHRhckluZm9zID0gKGF3YWl0IGRvbmUpLmZpbHRlcihpdGVtID0+IHR5cGVvZiBpdGVtICE9IG51bGwpIGFzXG4gICAgICAodHlwZW9mIGRvbmUgZXh0ZW5kcyBQcm9taXNlPChpbmZlciBUKVtdPiA/IE5vbk51bGxhYmxlPFQ+IDogdW5rbm93bilbXTtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0YXJJbmZvcykge1xuICAgICAgcGFja2FnZTJ0YXJiYWxsLnNldChpdGVtLm5hbWUsIFBhdGgucmVzb2x2ZSh0YXJiYWxsRGlyLCBpdGVtIS5maWxlbmFtZSkpO1xuICAgICAgaWYgKGl0ZW0ubmFtZSA9PT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGV4Y2x1ZGVGcm9tU3luYy5hZGQoaXRlbS5kaXIpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBsb2cuaW5mbyhBcnJheS5mcm9tKHBhY2thZ2UydGFyYmFsbC5lbnRyaWVzKCkpXG4gICAgLy8gICAubWFwKChbcGtOYW1lLCB2ZXJdKSA9PiBgXCIke3BrTmFtZX1cIjogXCIke3Zlcn1cIixgKVxuICAgIC8vICAgLmpvaW4oJ1xcbicpKTtcbiAgICBhd2FpdCBkZWxldGVPbGRUYXIodGFySW5mb3MubWFwKGl0ZW0gPT4gbmV3IFJlZ0V4cCgnXicgK1xuICAgICAgXy5lc2NhcGVSZWdFeHAoaXRlbS5uYW1lLnJlcGxhY2UoJ0AnLCAnJykucmVwbGFjZSgvWy9cXFxcXS9nLCAnLScpKVxuICAgICAgICArICdcXFxcLVxcXFxkKyg/OlxcXFwuXFxcXGQrKXsxLDJ9KD86XFxcXC1bXl0rPyk/XFxcXC50Z3okJywgJ2knXG4gICAgICApKSxcbiAgICAgIHRhckluZm9zLm1hcChpdGVtID0+IGl0ZW0uZmlsZW5hbWUpKTtcbiAgICBhd2FpdCBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlMnRhcmJhbGwpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe1xuICAgICAgcGFja2FnZUpzb25GaWxlczogcGFja2FnZURpcnMuZmlsdGVyKGRpciA9PiAhZXhjbHVkZUZyb21TeW5jLmhhcyhkaXIpKVxuICAgICAgICAubWFwKGRpciA9PiBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJykpXG4gICAgfSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1Byb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3REaXJzKSkge1xuICAgIGRpcnMucHVzaChwa2cucmVhbFBhdGgpO1xuICB9XG4gIGF3YWl0IHBhY2tQYWNrYWdlcyhkaXJzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVibGlzaFBhY2thZ2VzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSwgbnBtQ2xpT3B0czogc3RyaW5nW10pIHtcbiAgaWYgKHBhY2thZ2VEaXJzICYmIHBhY2thZ2VEaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwZ1BhdGhzOiBzdHJpbmdbXSA9IHBhY2thZ2VEaXJzO1xuXG4gICAgYXdhaXQgcXVldWVVcCg0LCBwZ1BhdGhzLm1hcChwYWNrYWdlRGlyID0+IGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvZy5pbmZvKGBwdWJsaXNoaW5nICR7cGFja2FnZURpcn1gKTtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gWydwdWJsaXNoJywgLi4ubnBtQ2xpT3B0cywge3NpbGVudDogdHJ1ZSwgY3dkOiBwYWNrYWdlRGlyfV07XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHByb21pc2lmeUV4ZSgnbnBtJywgLi4ucGFyYW1zKTtcbiAgICAgICAgbG9nLmluZm8ob3V0cHV0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIG5wbUNsaU9wdHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3REaXJzKSkge1xuICAgIGRpcnMucHVzaChwa2cucmVhbFBhdGgpO1xuICB9XG4gIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBucG1DbGlPcHRzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbnBtUGFjayhwYWNrYWdlUGF0aDogc3RyaW5nKTpcbiAgUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBmaWxlbmFtZTogc3RyaW5nOyBkaXI6IHN0cmluZzt9IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHByb21pc2lmeUV4ZSgnbnBtJywgJ3BhY2snLCBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgpLFxuICAgICAge3NpbGVudDogdHJ1ZSwgY3dkOiB0YXJiYWxsRGlyfSk7XG4gICAgY29uc3QgcmVzdWx0SW5mbyA9IHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQpO1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXN1bHRJbmZvLmdldCgnbmFtZScpITtcbiAgICAvLyBjYihwYWNrYWdlTmFtZSwgcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhKTtcbiAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICAgIGZpbGVuYW1lOiByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSEsXG4gICAgICBkaXI6IHBhY2thZ2VQYXRoXG4gICAgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGgsIGUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQHBhcmFtIHBhY2thZ2UydGFyYmFsbCBcbiAqL1xuZnVuY3Rpb24gY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZVRhcmJhbGxNYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4pIHtcbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsID0gbmV3IE1hcChwYWNrYWdlVGFyYmFsbE1hcCk7XG4gIC8vIGluY2x1ZGUgUm9vdCBkaXJcbiAgZm9yIChjb25zdCB3b3Jrc3BhY2Ugb2YgXy51bmlxKFtcbiAgICAuLi5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpLCAnJ10pLm1hcChkaXIgPT4gUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCBkaXIpKVxuICApIHtcbiAgICBjb25zdCB3c0RpciA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgd29ya3NwYWNlKTtcbiAgICBjb25zdCBqc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh3c0RpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IHBraiA9IGZzLnJlYWRGaWxlU3luYyhqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBhc3QgPSBqc29uUGFyc2VyKHBraik7XG4gICAgY29uc3QgZGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGVwZW5kZW5jaWVzJyk7XG4gICAgY29uc3QgZGV2RGVwc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoKHtuYW1lfSkgPT4gSlNPTi5wYXJzZShuYW1lLnRleHQpID09PSAnZGV2RGVwZW5kZW5jaWVzJyk7XG4gICAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gICAgaWYgKGRlcHNBc3QpIHtcbiAgICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCwgd3NEaXIsIGpzb25GaWxlLCByZXBsYWNlbWVudHMpO1xuICAgIH1cbiAgICBpZiAoZGV2RGVwc0FzdCkge1xuICAgICAgY2hhbmdlRGVwZW5kZW5jaWVzKGRldkRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0LCB3c0RpciwganNvbkZpbGUsIHJlcGxhY2VtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gaWYgKHBhY2thZ2UydGFyYmFsbC5zaXplID4gMCkge1xuICAgIC8vICAgY29uc3QgYXBwZW5kVG9Bc3QgPSBkZXBzQXN0ID8gZGVwc0FzdCA6IGRldkRlcHNBc3Q7XG4gICAgLy8gICBpZiAoYXBwZW5kVG9Bc3QgPT0gbnVsbCkge1xuICAgIC8vICAgICAvLyBUaGVyZSBpcyBubyBkZXBlbmRlbmNpZXMgb3IgRGV2RGVwZW5kZW5jaWVzXG4gICAgLy8gICAgIHJlcGxhY2VtZW50cy5wdXNoKHtyZXBsYWNlbWVudDogJyxcXG4gIGRlcGVuZGVuY2llczoge1xcbiAgICAnLCBzdGFydDogcGtqLmxlbmd0aCAtIDIsIGVuZDogcGtqLmxlbmd0aCAtIDJ9KTtcbiAgICAvLyAgICAgYXBwZW5kUmVtYWluZGVyUGtncyhwa2oubGVuZ3RoIC0gMik7XG4gICAgLy8gICAgIHJlcGxhY2VtZW50cy5wdXNoKHtyZXBsYWNlbWVudDogJ1xcbiAgfVxcbicsIHN0YXJ0OiBwa2oubGVuZ3RoIC0gMiwgZW5kOiBwa2oubGVuZ3RoIC0gMn0pO1xuICAgIC8vICAgfSBlbHNlIHtcbiAgICAvLyAgICAgbGV0IGFwcGVuZFBvcyA9IChhcHBlbmRUb0FzdC52YWx1ZSkuZW5kIC0gMTtcbiAgICAvLyAgICAgY29uc3QgZXhpc3RpbmdFbnRyaWVzID0gKGFwcGVuZFRvQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgICAvLyAgICAgaWYgKGV4aXN0aW5nRW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gICAgICAgYXBwZW5kUG9zID0gZXhpc3RpbmdFbnRyaWVzW2V4aXN0aW5nRW50cmllcy5sZW5ndGggLSAxXS52YWx1ZS5lbmQ7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgIC8vICAgICAgIHJlcGxhY2VtZW50OiAnLFxcbiAgICAnLCBzdGFydDogYXBwZW5kUG9zLCBlbmQ6IGFwcGVuZFBvc1xuICAgIC8vICAgICB9KTtcbiAgICAvLyAgICAgYXBwZW5kUmVtYWluZGVyUGtncyhhcHBlbmRQb3MpO1xuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgLy8gICAgICAgcmVwbGFjZW1lbnQ6ICdcXG4nLCBzdGFydDogYXBwZW5kUG9zLCBlbmQ6IGFwcGVuZFBvc1xuICAgIC8vICAgICB9KTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cbiAgICAvLyBmdW5jdGlvbiBhcHBlbmRSZW1haW5kZXJQa2dzKGFwcGVuZFBvczogbnVtYmVyKSB7XG4gICAgLy8gICBsZXQgaSA9IDE7XG4gICAgLy8gICBmb3IgKGNvbnN0IFtwa05hbWUsIHRhckZpbGVdIG9mIHBhY2thZ2UydGFyYmFsbCkge1xuICAgIC8vICAgICBsZXQgbmV3VmVyc2lvbiA9IFBhdGgucmVsYXRpdmUod3NEaXIsIHRhckZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyAgICAgbG9nLmluZm8oYEFwcGVuZCAke2pzb25GaWxlfTogXCIke3BrTmFtZX1cIjogJHtuZXdWZXJzaW9ufWApO1xuXG4gICAgLy8gICAgIGlmICghbmV3VmVyc2lvbi5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAvLyAgICAgICBuZXdWZXJzaW9uID0gJy4vJyArIG5ld1ZlcnNpb247XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgIC8vICAgICAgIHJlcGxhY2VtZW50OiBgXCIke3BrTmFtZX1cIjogJHtuZXdWZXJzaW9ufWAsIHN0YXJ0OiBhcHBlbmRQb3MsIGVuZDogYXBwZW5kUG9zXG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgICBpZiAoaSAhPT0gcGFja2FnZTJ0YXJiYWxsLnNpemUpIHtcbiAgICAvLyAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgLy8gICAgICAgICByZXBsYWNlbWVudDogJyxcXG4gICAgJywgc3RhcnQ6IGFwcGVuZFBvcywgZW5kOiBhcHBlbmRQb3NcbiAgICAvLyAgICAgICB9KTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBpKys7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG5cbiAgICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gcmVwbGFjZUNvZGUocGtqLCByZXBsYWNlbWVudHMpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgVXBkYXRlZCAke2pzb25GaWxlfVxcbmAsIHJlcGxhY2VkKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoanNvbkZpbGUsIHJlcGxhY2VkKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHM6IE9iamVjdEFzdCwgd3NEaXI6IHN0cmluZywganNvbkZpbGU6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdKSB7XG4gICAgLy8gY29uc29sZS5sb2coZGVwcy5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0ICsgJzonICsgKHByb3AudmFsdWUgYXMgVG9rZW4pLnRleHQpKTtcbiAgICAvLyBjb25zb2xlLmxvZyhBcnJheS5mcm9tKHBhY2thZ2UydGFyYmFsbC5lbnRyaWVzKCkpKTtcbiAgICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IHBhY2thZ2UydGFyYmFsbC5oYXMoSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gICAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICAgIGNvbnN0IHZlclRva2VuID0gZm91bmREZXAudmFsdWUgYXMgVG9rZW47XG4gICAgICBjb25zdCBwa05hbWUgPSBKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCk7XG4gICAgICBjb25zdCB0YXJGaWxlID0gcGFja2FnZTJ0YXJiYWxsLmdldChwa05hbWUpO1xuICAgICAgbGV0IG5ld1ZlcnNpb24gPSBQYXRoLnJlbGF0aXZlKHdzRGlyLCB0YXJGaWxlISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKCFuZXdWZXJzaW9uLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICBuZXdWZXJzaW9uID0gJy4vJyArIG5ld1ZlcnNpb247XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgVXBkYXRlICR7anNvbkZpbGV9OiAke3ZlclRva2VuLnRleHR9ID0+ICR7bmV3VmVyc2lvbn1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IHZlclRva2VuLnBvcyxcbiAgICAgICAgZW5kOiB2ZXJUb2tlbi5lbmQhLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeShuZXdWZXJzaW9uKVxuICAgICAgfSk7XG4gICAgICAvLyBwYWNrYWdlMnRhcmJhbGwuZGVsZXRlKHBrTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGg6IHN0cmluZywgZTogRXJyb3IpIHtcbiAgaWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuICAgIGxvZy5pbmZvKGBucG0gcGFjayAke3BhY2thZ2VQYXRofTogRVBVQkxJU0hDT05GTElDVC5gKTtcbiAgZWxzZVxuICAgIGxvZy5lcnJvcihwYWNrYWdlUGF0aCwgZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gb3V0cHV0IFxuICogZS5nLlxubnBtIG5vdGljZSA9PT0gVGFyYmFsbCBEZXRhaWxzID09PSBcbm5wbSBub3RpY2UgbmFtZTogICAgICAgICAgcmVxdWlyZS1pbmplY3RvciAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB2ZXJzaW9uOiAgICAgICA1LjEuNSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIGZpbGVuYW1lOiAgICAgIHJlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6ICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgcGFja2FnZSBzaXplOiAgNTYuOSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB1bnBhY2tlZCBzaXplOiAyMjkuMSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHNoYXN1bTogICAgICAgIGMwNjkzMjcwYzE0MGY2NWE2OTYyMDdhYjlkZWIxOGU2NDQ1MmEwMmNcbm5wbSBub3RpY2UgaW50ZWdyaXR5OiAgICAgc2hhNTEyLWtSR1ZXY3cxZnZRNUpbLi4uXUFCd0xQVThVdlN0YkE9PVxubnBtIG5vdGljZSB0b3RhbCBmaWxlczogICA0NyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIFxuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IHN0cmlwQW5zaShvdXRwdXQpLnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IGxpbmVzT2Zmc2V0ID0gXy5maW5kTGFzdEluZGV4KGxpbmVzLCBsaW5lID0+IGxpbmUuaW5kZXhPZignVGFyYmFsbCBEZXRhaWxzJykgPj0gMCk7XG4gIGNvbnN0IHRhcmJhbGxJbmZvID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgbGluZXMuc2xpY2UobGluZXNPZmZzZXQpLmZvckVhY2gobGluZSA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSAvbnBtIG5vdGljZVxccysoW146XSspWzpdXFxzKiguKz8pXFxzKiQvLmV4ZWMobGluZSk7XG4gICAgaWYgKCFtYXRjaClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0YXJiYWxsSW5mby5zZXQobWF0Y2hbMV0sIG1hdGNoWzJdKTtcbiAgfSk7XG4gIHJldHVybiB0YXJiYWxsSW5mbztcbn1cblxuZXhwb3J0IGNvbnN0IHRlc3RhYmxlID0ge3BhcnNlTnBtUGFja091dHB1dH07XG5cbmZ1bmN0aW9uIGRlbGV0ZU9sZFRhcihkZWxldGVGaWxlUmVnOiBSZWdFeHBbXSwga2VlcGZpbGVzOiBzdHJpbmdbXSkge1xuICAvLyBsb2cud2FybihkZWxldGVGaWxlUmVnLCBrZWVwZmlsZXMpO1xuICBjb25zdCB0YXJTZXQgPSBuZXcgU2V0KGtlZXBmaWxlcyk7XG4gIGNvbnN0IGRlbGV0ZURvbmU6IFByb21pc2U8YW55PltdID0gW107XG5cbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmJhbGxEaXIpKVxuICAgIGZzZXh0Lm1rZGlycFN5bmModGFyYmFsbERpcik7XG5cbiAgLy8gY29uc29sZS5sb2codGFyU2V0LCBkZWxldGVGaWxlUmVnKTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZnMucmVhZGRpclN5bmModGFyYmFsbERpcikpIHtcbiAgICBpZiAoIXRhclNldC5oYXMoZmlsZSkgJiYgZGVsZXRlRmlsZVJlZy5zb21lKHJlZyA9PiByZWcudGVzdChmaWxlKSkpIHtcbiAgICAgIGxvZy53YXJuKCdSZW1vdmUgJyArIGZpbGUpO1xuICAgICAgZGVsZXRlRG9uZS5wdXNoKGZzLnByb21pc2VzLnVubGluayhQYXRoLnJlc29sdmUodGFyYmFsbERpciwgZmlsZSkpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRlbGV0ZURvbmUpO1xufVxuIl19