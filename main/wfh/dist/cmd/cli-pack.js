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
// import {boxString} from './utils';
// import * as recipeManager from './recipe-manager';
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const patch_text_1 = __importDefault(require("require-injector/dist/patch-text"));
const config_1 = __importDefault(require("../config"));
const package_mgr_1 = require("../package-mgr");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const log4js_1 = __importDefault(require("log4js"));
const utils_1 = require("./utils");
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
                .filter(pkg => pkg)
                .map(pkg => pkg.realPath);
            yield packPackages(dirs);
        }
        else {
            yield packPackages(Array.from(linkedPackagesOfWorkspace(process.cwd())));
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
            yield publishPackages(Array.from(linkedPackagesOfWorkspace(process.cwd())), opts.public ? ['--access', 'public'] : []);
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
        const package2tarball = new Map();
        if (packageDirs && packageDirs.length > 0) {
            const pgPaths = packageDirs;
            const done = promise_queque_1.queueUp(4, pgPaths.map(packageDir => () => npmPack(packageDir)));
            const tarInfos = (yield done).filter(item => typeof item != null);
            for (const item of tarInfos) {
                package2tarball.set(item.name, Path.resolve(tarballDir, item.filename));
            }
            // log.info(Array.from(package2tarball.entries())
            //   .map(([pkName, ver]) => `"${pkName}": "${ver}",`)
            //   .join('\n'));
            yield deleteOldTar(tarInfos.map(item => new RegExp('^' +
                _.escapeRegExp(item.name.replace('@', '').replace(/[/\\]/g, '-'))
                + '\\-\\d+(?:\\.\\d+){1,2}(?:\\-[^\\-])?\\.tgz$', 'i')), tarInfos.map(item => item.filename));
            yield changePackageJson(package2tarball);
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
                filename: resultInfo.get('filename')
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
    for (const workspace of [...package_mgr_1.getState().workspaces.keys(), config_1.default().rootPath]) {
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
            log.info('Updated package.json\n', replaced);
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
    const lines = output.split(/\r?\n/);
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
    // TODO: wait for timeout
    for (const file of fs.readdirSync(tarballDir)) {
        if (!tarSet.has(file) && deleteFileReg.some(reg => reg.test(file))) {
            log.warn('Remove ' + file);
            deleteDone.push(fs.promises.unlink(Path.resolve(tarballDir, file)));
        }
    }
    return Promise.all(deleteDone);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHFGQUF5RTtBQUN6RSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQThDO0FBQzlDLHFDQUFxQztBQUNyQyxxREFBcUQ7QUFDckQsaUZBQXVFO0FBQ3ZFLGtGQUE2RTtBQUM3RSx1REFBK0I7QUFFL0IsZ0RBQTZFO0FBQzdFLDRFQUF5RTtBQUN6RSxvREFBNEI7QUFDNUIsbUNBQTRDO0FBRTVDLElBQUksVUFBa0IsQ0FBQztBQUN2QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRS9DLFNBQWUsSUFBSSxDQUFDLElBQWtDOztRQUNwRCxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELGtCQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7Q0FBQTtBQUVELFNBQXNCLElBQUksQ0FBQyxJQUFpQjs7UUFDMUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFakIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMvQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3RHO2FBQU0sSUFBSSxJQUFJLENB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QVMsWUFBWSxDQUFDLGFBQXVCLEVBQUUsU0FBbUI7SUFDaEUsc0NBQXNDO0lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sVUFBVSxHQUFtQixFQUFFLENBQUM7SUFFdEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQzVCLGtCQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9CLHlCQUF5QjtJQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNsRSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRTtLQUNGO0lBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7cXVldWVVcH0gZnJvbSAnLi4vLi4vLi4vdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0L3Byb21pc2UtcXVlcXVlJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2V4dCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtwcm9taXNpZnlFeGV9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IHtib3hTdHJpbmd9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCBqc29uUGFyc2VyLCB7T2JqZWN0QXN0LCBUb2tlbn0gZnJvbSAnLi4vdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L3BhdGNoLXRleHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtQYWNrT3B0aW9ucywgUHVibGlzaE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtnZXRQYWNrYWdlc09mUHJvamVjdHMsIGdldFN0YXRlLCB3b3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5cbmxldCB0YXJiYWxsRGlyOiBzdHJpbmc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5jbGktcGFjaycpO1xuXG5hc3luYyBmdW5jdGlvbiBpbml0KG9wdHM6IFB1Ymxpc2hPcHRpb25zIHwgUGFja09wdGlvbnMpIHtcbiAgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ3RhcmJhbGxzJyk7XG4gIGZzZXh0Lm1rZGlycFN5bmModGFyYmFsbERpcik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKG9wdHM6IFBhY2tPcHRpb25zKSB7XG4gIGF3YWl0IGluaXQob3B0cyk7XG5cbiAgaWYgKG9wdHMud29ya3NwYWNlICYmIG9wdHMud29ya3NwYWNlLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChvcHRzLndvcmtzcGFjZS5tYXAod3MgPT4gcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZSh3cykpKSkpO1xuICB9IGVsc2UgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwYWNrUHJvamVjdChvcHRzLnByb2plY3QpO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMob3B0cy5kaXIpO1xuICB9IGVsc2UgaWYgKG9wdHMucGFja2FnZXMgJiYgb3B0cy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZGlycyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2VzKSlcbiAgICAuZmlsdGVyKHBrZyA9PiBwa2cpXG4gICAgLm1hcChwa2cgPT4gcGtnIS5yZWFsUGF0aCk7XG5cbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSkpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwdWJsaXNoKG9wdHM6IFB1Ymxpc2hPcHRpb25zKSB7XG4gIGF3YWl0IGluaXQob3B0cyk7XG5cbiAgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMClcbiAgICByZXR1cm4gcHVibGlzaFByb2plY3Qob3B0cy5wcm9qZWN0LCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMob3B0cy5kaXIsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfSBlbHNlIGlmIChvcHRzLnBhY2thZ2VzICYmIG9wdHMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRpcnMgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlcykpXG4gICAgLmZpbHRlcihwa2cgPT4gcGtnKVxuICAgIC5tYXAocGtnID0+IHBrZyEucmVhbFBhdGgpO1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSksXG4gICAgICBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gKmxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgIGxvZy5lcnJvcihgV29ya3NwYWNlICR7d29ya3NwYWNlRGlyfSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICB5aWVsZCBwa2cucmVhbFBhdGg7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1BhY2thZ2VzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBjb25zdCBkb25lID0gcXVldWVVcCg0LCBwZ1BhdGhzLm1hcChwYWNrYWdlRGlyID0+ICgpID0+IG5wbVBhY2socGFja2FnZURpcikpKTtcbiAgICBjb25zdCB0YXJJbmZvcyA9IChhd2FpdCBkb25lKS5maWx0ZXIoaXRlbSA9PiB0eXBlb2YgaXRlbSAhPSBudWxsKSBhc1xuICAgICAgKHR5cGVvZiBkb25lIGV4dGVuZHMgUHJvbWlzZTwoaW5mZXIgVClbXT4gPyBOb25OdWxsYWJsZTxUPiA6IHVua25vd24pW107XG5cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGFySW5mb3MpIHtcbiAgICAgIHBhY2thZ2UydGFyYmFsbC5zZXQoaXRlbS5uYW1lLCBQYXRoLnJlc29sdmUodGFyYmFsbERpciwgaXRlbSEuZmlsZW5hbWUpKTtcbiAgICB9XG4gICAgLy8gbG9nLmluZm8oQXJyYXkuZnJvbShwYWNrYWdlMnRhcmJhbGwuZW50cmllcygpKVxuICAgIC8vICAgLm1hcCgoW3BrTmFtZSwgdmVyXSkgPT4gYFwiJHtwa05hbWV9XCI6IFwiJHt2ZXJ9XCIsYClcbiAgICAvLyAgIC5qb2luKCdcXG4nKSk7XG4gICAgYXdhaXQgZGVsZXRlT2xkVGFyKHRhckluZm9zLm1hcChpdGVtID0+IG5ldyBSZWdFeHAoJ14nICtcbiAgICAgIF8uZXNjYXBlUmVnRXhwKGl0ZW0ubmFtZS5yZXBsYWNlKCdAJywgJycpLnJlcGxhY2UoL1svXFxcXF0vZywgJy0nKSlcbiAgICAgICAgKyAnXFxcXC1cXFxcZCsoPzpcXFxcLlxcXFxkKyl7MSwyfSg/OlxcXFwtW15cXFxcLV0pP1xcXFwudGd6JCcsICdpJ1xuICAgICAgKSksXG4gICAgICB0YXJJbmZvcy5tYXAoaXRlbSA9PiBpdGVtLmZpbGVuYW1lKSk7XG4gICAgYXdhaXQgY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10pIHtcbiAgY29uc3QgZGlycyA9IFtdIGFzIHN0cmluZ1tdO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdERpcnMpKSB7XG4gICAgZGlycy5wdXNoKHBrZy5yZWFsUGF0aCk7XG4gIH1cbiAgYXdhaXQgcGFja1BhY2thZ2VzKGRpcnMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBhd2FpdCBxdWV1ZVVwKDQsIHBnUGF0aHMubWFwKHBhY2thZ2VEaXIgPT4gYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oYHB1Ymxpc2hpbmcgJHtwYWNrYWdlRGlyfWApO1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBbJ3B1Ymxpc2gnLCAuLi5ucG1DbGlPcHRzLCB7c2lsZW50OiB0cnVlLCBjd2Q6IHBhY2thZ2VEaXJ9XTtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgcHJvbWlzaWZ5RXhlKCducG0nLCAuLi5wYXJhbXMpO1xuICAgICAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hQcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSwgbnBtQ2xpT3B0czogc3RyaW5nW10pIHtcbiAgY29uc3QgZGlycyA9IFtdIGFzIHN0cmluZ1tdO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdERpcnMpKSB7XG4gICAgZGlycy5wdXNoKHBrZy5yZWFsUGF0aCk7XG4gIH1cbiAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKGRpcnMsIG5wbUNsaU9wdHMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBucG1QYWNrKHBhY2thZ2VQYXRoOiBzdHJpbmcpOlxuICBQcm9taXNlPHtuYW1lOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmd9IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHByb21pc2lmeUV4ZSgnbnBtJywgJ3BhY2snLCBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgpLFxuICAgICAge3NpbGVudDogdHJ1ZSwgY3dkOiB0YXJiYWxsRGlyfSk7XG4gICAgY29uc3QgcmVzdWx0SW5mbyA9IHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQpO1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXN1bHRJbmZvLmdldCgnbmFtZScpITtcbiAgICAvLyBjYihwYWNrYWdlTmFtZSwgcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhKTtcbiAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICAgIGZpbGVuYW1lOiByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSFcbiAgICB9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aCwgZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBAcGFyYW0gcGFja2FnZTJ0YXJiYWxsIFxuICovXG5mdW5jdGlvbiBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlVGFyYmFsbE1hcDogTWFwPHN0cmluZywgc3RyaW5nPikge1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwKHBhY2thZ2VUYXJiYWxsTWFwKTtcbiAgZm9yIChjb25zdCB3b3Jrc3BhY2Ugb2YgWy4uLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCksIGNvbmZpZygpLnJvb3RQYXRoXSkge1xuICAgIGNvbnN0IHdzRGlyID0gUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCB3b3Jrc3BhY2UpO1xuICAgIGNvbnN0IGpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHdzRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcGtqID0gZnMucmVhZEZpbGVTeW5jKGpzb25GaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGFzdCA9IGpzb25QYXJzZXIocGtqKTtcbiAgICBjb25zdCBkZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXBlbmRlbmNpZXMnKTtcbiAgICBjb25zdCBkZXZEZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXZEZXBlbmRlbmNpZXMnKTtcbiAgICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgICBpZiAoZGVwc0FzdCkge1xuICAgICAgY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0LCB3c0RpciwganNvbkZpbGUsIHJlcGxhY2VtZW50cyk7XG4gICAgfVxuICAgIGlmIChkZXZEZXBzQXN0KSB7XG4gICAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGV2RGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QsIHdzRGlyLCBqc29uRmlsZSwgcmVwbGFjZW1lbnRzKTtcbiAgICB9XG5cbiAgICAvLyBpZiAocGFja2FnZTJ0YXJiYWxsLnNpemUgPiAwKSB7XG4gICAgLy8gICBjb25zdCBhcHBlbmRUb0FzdCA9IGRlcHNBc3QgPyBkZXBzQXN0IDogZGV2RGVwc0FzdDtcbiAgICAvLyAgIGlmIChhcHBlbmRUb0FzdCA9PSBudWxsKSB7XG4gICAgLy8gICAgIC8vIFRoZXJlIGlzIG5vIGRlcGVuZGVuY2llcyBvciBEZXZEZXBlbmRlbmNpZXNcbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe3JlcGxhY2VtZW50OiAnLFxcbiAgZGVwZW5kZW5jaWVzOiB7XFxuICAgICcsIHN0YXJ0OiBwa2oubGVuZ3RoIC0gMiwgZW5kOiBwa2oubGVuZ3RoIC0gMn0pO1xuICAgIC8vICAgICBhcHBlbmRSZW1haW5kZXJQa2dzKHBrai5sZW5ndGggLSAyKTtcbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe3JlcGxhY2VtZW50OiAnXFxuICB9XFxuJywgc3RhcnQ6IHBrai5sZW5ndGggLSAyLCBlbmQ6IHBrai5sZW5ndGggLSAyfSk7XG4gICAgLy8gICB9IGVsc2Uge1xuICAgIC8vICAgICBsZXQgYXBwZW5kUG9zID0gKGFwcGVuZFRvQXN0LnZhbHVlKS5lbmQgLSAxO1xuICAgIC8vICAgICBjb25zdCBleGlzdGluZ0VudHJpZXMgPSAoYXBwZW5kVG9Bc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzO1xuICAgIC8vICAgICBpZiAoZXhpc3RpbmdFbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAvLyAgICAgICBhcHBlbmRQb3MgPSBleGlzdGluZ0VudHJpZXNbZXhpc3RpbmdFbnRyaWVzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgLy8gICAgICAgcmVwbGFjZW1lbnQ6ICcsXFxuICAgICcsIHN0YXJ0OiBhcHBlbmRQb3MsIGVuZDogYXBwZW5kUG9zXG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgICBhcHBlbmRSZW1haW5kZXJQa2dzKGFwcGVuZFBvcyk7XG4gICAgLy8gICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAvLyAgICAgICByZXBsYWNlbWVudDogJ1xcbicsIHN0YXJ0OiBhcHBlbmRQb3MsIGVuZDogYXBwZW5kUG9zXG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIGZ1bmN0aW9uIGFwcGVuZFJlbWFpbmRlclBrZ3MoYXBwZW5kUG9zOiBudW1iZXIpIHtcbiAgICAvLyAgIGxldCBpID0gMTtcbiAgICAvLyAgIGZvciAoY29uc3QgW3BrTmFtZSwgdGFyRmlsZV0gb2YgcGFja2FnZTJ0YXJiYWxsKSB7XG4gICAgLy8gICAgIGxldCBuZXdWZXJzaW9uID0gUGF0aC5yZWxhdGl2ZSh3c0RpciwgdGFyRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vICAgICBsb2cuaW5mbyhgQXBwZW5kICR7anNvbkZpbGV9OiBcIiR7cGtOYW1lfVwiOiAke25ld1ZlcnNpb259YCk7XG5cbiAgICAvLyAgICAgaWYgKCFuZXdWZXJzaW9uLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgIC8vICAgICAgIG5ld1ZlcnNpb24gPSAnLi8nICsgbmV3VmVyc2lvbjtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgLy8gICAgICAgcmVwbGFjZW1lbnQ6IGBcIiR7cGtOYW1lfVwiOiAke25ld1ZlcnNpb259YCwgc3RhcnQ6IGFwcGVuZFBvcywgZW5kOiBhcHBlbmRQb3NcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICAgIGlmIChpICE9PSBwYWNrYWdlMnRhcmJhbGwuc2l6ZSkge1xuICAgIC8vICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAvLyAgICAgICAgIHJlcGxhY2VtZW50OiAnLFxcbiAgICAnLCBzdGFydDogYXBwZW5kUG9zLCBlbmQ6IGFwcGVuZFBvc1xuICAgIC8vICAgICAgIH0pO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIGkrKztcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cblxuICAgIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZWQgPSByZXBsYWNlQ29kZShwa2osIHJlcGxhY2VtZW50cyk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKCdVcGRhdGVkIHBhY2thZ2UuanNvblxcbicsIHJlcGxhY2VkKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoanNvbkZpbGUsIHJlcGxhY2VkKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHM6IE9iamVjdEFzdCwgd3NEaXI6IHN0cmluZywganNvbkZpbGU6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdKSB7XG4gICAgLy8gY29uc29sZS5sb2coZGVwcy5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0ICsgJzonICsgKHByb3AudmFsdWUgYXMgVG9rZW4pLnRleHQpKTtcbiAgICAvLyBjb25zb2xlLmxvZyhBcnJheS5mcm9tKHBhY2thZ2UydGFyYmFsbC5lbnRyaWVzKCkpKTtcbiAgICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IHBhY2thZ2UydGFyYmFsbC5oYXMoSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gICAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICAgIGNvbnN0IHZlclRva2VuID0gZm91bmREZXAudmFsdWUgYXMgVG9rZW47XG4gICAgICBjb25zdCBwa05hbWUgPSBKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCk7XG4gICAgICBjb25zdCB0YXJGaWxlID0gcGFja2FnZTJ0YXJiYWxsLmdldChwa05hbWUpO1xuICAgICAgbGV0IG5ld1ZlcnNpb24gPSBQYXRoLnJlbGF0aXZlKHdzRGlyLCB0YXJGaWxlISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKCFuZXdWZXJzaW9uLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICBuZXdWZXJzaW9uID0gJy4vJyArIG5ld1ZlcnNpb247XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgVXBkYXRlICR7anNvbkZpbGV9OiAke3ZlclRva2VuLnRleHR9ID0+ICR7bmV3VmVyc2lvbn1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IHZlclRva2VuLnBvcyxcbiAgICAgICAgZW5kOiB2ZXJUb2tlbi5lbmQhLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeShuZXdWZXJzaW9uKVxuICAgICAgfSk7XG4gICAgICAvLyBwYWNrYWdlMnRhcmJhbGwuZGVsZXRlKHBrTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGg6IHN0cmluZywgZTogRXJyb3IpIHtcbiAgaWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuICAgIGxvZy5pbmZvKGBucG0gcGFjayAke3BhY2thZ2VQYXRofTogRVBVQkxJU0hDT05GTElDVC5gKTtcbiAgZWxzZVxuICAgIGxvZy5lcnJvcihwYWNrYWdlUGF0aCwgZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gb3V0cHV0IFxuICogZS5nLlxubnBtIG5vdGljZSA9PT0gVGFyYmFsbCBEZXRhaWxzID09PSBcbm5wbSBub3RpY2UgbmFtZTogICAgICAgICAgcmVxdWlyZS1pbmplY3RvciAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB2ZXJzaW9uOiAgICAgICA1LjEuNSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIGZpbGVuYW1lOiAgICAgIHJlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6ICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgcGFja2FnZSBzaXplOiAgNTYuOSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB1bnBhY2tlZCBzaXplOiAyMjkuMSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHNoYXN1bTogICAgICAgIGMwNjkzMjcwYzE0MGY2NWE2OTYyMDdhYjlkZWIxOGU2NDQ1MmEwMmNcbm5wbSBub3RpY2UgaW50ZWdyaXR5OiAgICAgc2hhNTEyLWtSR1ZXY3cxZnZRNUpbLi4uXUFCd0xQVThVdlN0YkE9PVxubnBtIG5vdGljZSB0b3RhbCBmaWxlczogICA0NyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIFxuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmV4cG9ydCBjb25zdCB0ZXN0YWJsZSA9IHtwYXJzZU5wbVBhY2tPdXRwdXR9O1xuXG5mdW5jdGlvbiBkZWxldGVPbGRUYXIoZGVsZXRlRmlsZVJlZzogUmVnRXhwW10sIGtlZXBmaWxlczogc3RyaW5nW10pIHtcbiAgLy8gbG9nLndhcm4oZGVsZXRlRmlsZVJlZywga2VlcGZpbGVzKTtcbiAgY29uc3QgdGFyU2V0ID0gbmV3IFNldChrZWVwZmlsZXMpO1xuICBjb25zdCBkZWxldGVEb25lOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJiYWxsRGlyKSlcbiAgICBmc2V4dC5ta2RpcnBTeW5jKHRhcmJhbGxEaXIpO1xuICAvLyBUT0RPOiB3YWl0IGZvciB0aW1lb3V0XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYyh0YXJiYWxsRGlyKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUmVnLnNvbWUocmVnID0+IHJlZy50ZXN0KGZpbGUpKSkge1xuICAgICAgbG9nLndhcm4oJ1JlbW92ZSAnICsgZmlsZSk7XG4gICAgICBkZWxldGVEb25lLnB1c2goZnMucHJvbWlzZXMudW5saW5rKFBhdGgucmVzb2x2ZSh0YXJiYWxsRGlyLCBmaWxlKSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsZXRlRG9uZSk7XG59XG4iXX0=