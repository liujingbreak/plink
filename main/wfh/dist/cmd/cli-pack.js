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
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const utils_1 = require("./utils");
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
        const excludeFromSync = new Set();
        const package2tarball = new Map();
        if (packageDirs && packageDirs.length > 0) {
            // const pgPaths: string[] = packageDirs;
            const done = promise_queque_1.queueUp(4, packageDirs.map(packageDir => () => npmPack(packageDir)));
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
                + '\\-\\d+(?:\\.\\d+){1,2}(?:\\-[^\\-])?\\.tgz$', 'i')), tarInfos.map(item => item.filename));
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
    // TODO: wait for timeout
    for (const file of fs.readdirSync(tarballDir)) {
        if (!tarSet.has(file) && deleteFileReg.some(reg => reg.test(file))) {
            log.warn('Remove ' + file);
            deleteDone.push(fs.promises.unlink(Path.resolve(tarballDir, file)));
        }
    }
    return Promise.all(deleteDone);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHFGQUF5RTtBQUN6RSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQThDO0FBQzlDLHFDQUFxQztBQUNyQyxxREFBcUQ7QUFDckQsaUZBQXVFO0FBQ3ZFLGtGQUE2RTtBQUM3RSx1REFBK0I7QUFFL0IsZ0RBQStGO0FBQy9GLDRFQUF5RTtBQUN6RSxvREFBNEI7QUFDNUIsNERBQW1DO0FBQ25DLG1DQUE0QztBQUM1Qyw0QkFBMEI7QUFFMUIsSUFBSSxVQUFrQixDQUFDO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFL0MsU0FBZSxJQUFJLENBQUMsSUFBa0M7O1FBQ3BELFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDekQsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUFBO0FBRUQsU0FBc0IsSUFBSSxDQUFDLElBQWlCOztRQUMxQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDdEc7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2xELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNsQzthQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDMUMsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzlCO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNwRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3RFLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQztpQkFDckUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTNCLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTCxNQUFNLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRTtJQUNILENBQUM7Q0FBQTtBQWxCRCxvQkFrQkM7QUFFRCxTQUFzQixPQUFPLENBQUMsSUFBb0I7O1FBQ2hELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWpCLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3pDLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzVFLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDeEMsTUFBTSxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDNUU7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3BELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDdEUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0IsTUFBTSxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUN4RTthQUFNO1lBQ0wsTUFBTSxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUN4RSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0NBQUE7QUFoQkQsMEJBZ0JDO0FBRUQsUUFBUyxDQUFDLENBQUEseUJBQXlCLENBQUMsWUFBb0I7SUFDdEQsTUFBTSxLQUFLLEdBQUcsMEJBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN6QyxJQUFJLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLFlBQVksK0JBQStCLENBQUMsQ0FBQztRQUNwRSxPQUFPO0tBQ1I7SUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLDJDQUFxQixDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzlDLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQztLQUNwQjtBQUNILENBQUM7QUFFRCxTQUFlLFlBQVksQ0FBQyxXQUFxQjs7UUFDL0MsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUMxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUdsRCxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN6Qyx5Q0FBeUM7WUFFekMsTUFBTSxJQUFJLEdBQUcsd0JBQU8sQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sSUFBSSxJQUFJLElBQUksQ0FDUyxDQUFDO1lBRTFFLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFO2dCQUMzQixlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7b0JBQzlCLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUMvQjthQUNGO1lBQ0QsaURBQWlEO1lBQ2pELHNEQUFzRDtZQUN0RCxrQkFBa0I7WUFDbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUc7Z0JBQ3BELENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7a0JBQzdELDhDQUE4QyxFQUFFLEdBQUcsQ0FDdEQsQ0FBQyxFQUNGLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN2QyxNQUFNLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNwRCw4QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztnQkFDbkMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDbkUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDakQsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQUE7QUFFRCxTQUFlLFdBQVcsQ0FBQyxXQUFxQjs7UUFDOUMsTUFBTSxJQUFJLEdBQUcsRUFBYyxDQUFDO1FBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksbUNBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDekI7UUFDRCxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQUE7QUFFRCxTQUFlLGVBQWUsQ0FBQyxXQUFxQixFQUFFLFVBQW9COztRQUN4RSxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN6QyxNQUFNLE9BQU8sR0FBYSxXQUFXLENBQUM7WUFFdEMsTUFBTSx3QkFBTyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBUyxFQUFFO2dCQUNwRCxJQUFJO29CQUNGLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxVQUFVLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxNQUFNLE1BQU0sR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLFVBQVUsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBQyxDQUFDLENBQUM7b0JBQzNFLE1BQU0sTUFBTSxHQUFHLE1BQU0sNEJBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztvQkFDcEQsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDbEI7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDZDtZQUNILENBQUMsQ0FBQSxDQUFDLENBQUMsQ0FBQztTQUNMO0lBQ0gsQ0FBQztDQUFBO0FBRUQsU0FBZSxjQUFjLENBQUMsV0FBcUIsRUFBRSxVQUFvQjs7UUFDdkUsTUFBTSxJQUFJLEdBQUcsRUFBYyxDQUFDO1FBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksbUNBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDekI7UUFDRCxNQUFNLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUFBO0FBRUQsU0FBZSxPQUFPLENBQUMsV0FBbUI7O1FBRXhDLElBQUk7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLDRCQUFZLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUN4RSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFOUMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUUsQ0FBQztZQUM1QyxnREFBZ0Q7WUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqQixPQUFPO2dCQUNMLElBQUksRUFBRSxXQUFXO2dCQUNqQixRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUU7Z0JBQ3JDLEdBQUcsRUFBRSxXQUFXO2FBQ2pCLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztDQUFBO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLGlCQUFzQztJQUMvRCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25ELG1CQUFtQjtJQUNuQixLQUFLLE1BQU0sU0FBUyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDN0IsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUU7S0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQ3RGO1FBQ0EsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLE1BQU0sR0FBRyxHQUFHLDBCQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxjQUFjLENBQUMsQ0FBQztRQUMxRixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLGlCQUFpQixDQUFDLENBQUM7UUFDaEcsTUFBTSxZQUFZLEdBQXFCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLE9BQU8sRUFBRTtZQUNYLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxLQUFrQixFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDL0U7UUFDRCxJQUFJLFVBQVUsRUFBRTtZQUNkLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxLQUFrQixFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDbEY7UUFFRCxrQ0FBa0M7UUFDbEMsd0RBQXdEO1FBQ3hELCtCQUErQjtRQUMvQixxREFBcUQ7UUFDckQsa0hBQWtIO1FBQ2xILDJDQUEyQztRQUMzQywrRkFBK0Y7UUFDL0YsYUFBYTtRQUNiLG1EQUFtRDtRQUNuRCwyRUFBMkU7UUFDM0Usd0NBQXdDO1FBQ3hDLDJFQUEyRTtRQUMzRSxRQUFRO1FBQ1IsMEJBQTBCO1FBQzFCLGlFQUFpRTtRQUNqRSxVQUFVO1FBQ1Ysc0NBQXNDO1FBQ3RDLDBCQUEwQjtRQUMxQiw0REFBNEQ7UUFDNUQsVUFBVTtRQUNWLE1BQU07UUFDTixJQUFJO1FBRUosb0RBQW9EO1FBQ3BELGVBQWU7UUFDZix1REFBdUQ7UUFDdkQsMEVBQTBFO1FBQzFFLGtFQUFrRTtRQUVsRSx5Q0FBeUM7UUFDekMsd0NBQXdDO1FBQ3hDLFFBQVE7UUFDUiwwQkFBMEI7UUFDMUIsb0ZBQW9GO1FBQ3BGLFVBQVU7UUFDVix3Q0FBd0M7UUFDeEMsNEJBQTRCO1FBQzVCLG1FQUFtRTtRQUNuRSxZQUFZO1FBQ1osUUFBUTtRQUNSLFdBQVc7UUFDWCxNQUFNO1FBQ04sSUFBSTtRQUdKLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDM0IsTUFBTSxRQUFRLEdBQUcsb0JBQVcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDaEQsdUNBQXVDO1lBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxRQUFRLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1QyxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUN0QztLQUNGO0lBQ0QsU0FBUyxrQkFBa0IsQ0FBQyxJQUFlLEVBQUUsS0FBYSxFQUFFLFFBQWdCLEVBQUUsWUFBOEI7UUFDMUcsK0ZBQStGO1FBQy9GLHNEQUFzRDtRQUN0RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFjLENBQUM7WUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNwRSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDL0IsVUFBVSxHQUFHLElBQUksR0FBRyxVQUFVLENBQUM7YUFDaEM7WUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLE9BQU8sVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNsRSxZQUFZLENBQUMsSUFBSSxDQUFDO2dCQUNoQixLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUc7Z0JBQ25CLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBSTtnQkFDbEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO2FBQ2pDLENBQUMsQ0FBQztZQUNILGtDQUFrQztTQUNuQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsV0FBbUIsRUFBRSxDQUFRO0lBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxXQUFXLHFCQUFxQixDQUFDLENBQUM7O1FBRXZELEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCxTQUFTLGtCQUFrQixDQUFDLE1BQWM7SUFDeEMsTUFBTSxLQUFLLEdBQUcsb0JBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0MsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDekYsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDOUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEMsTUFBTSxLQUFLLEdBQUcscUNBQXFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxLQUFLO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDZCxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQUVZLFFBQUEsUUFBUSxHQUFHLEVBQUMsa0JBQWtCLEVBQUMsQ0FBQztBQUU3QyxTQUFTLFlBQVksQ0FBQyxhQUF1QixFQUFFLFNBQW1CO0lBQ2hFLHNDQUFzQztJQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsQyxNQUFNLFVBQVUsR0FBbUIsRUFBRSxDQUFDO0lBRXRDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUM1QixrQkFBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvQix5QkFBeUI7SUFDekIsS0FBSyxNQUFNLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDM0IsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQge3F1ZXVlVXB9IGZyb20gJy4uLy4uLy4uL3RocmVhZC1wcm9taXNlLXBvb2wvZGlzdC9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzaWZ5RXhlfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbi8vIGltcG9ydCB7Ym94U3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQganNvblBhcnNlciwge09iamVjdEFzdCwgVG9rZW59IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9wYXRjaC10ZXh0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7UGFja09wdGlvbnMsIFB1Ymxpc2hPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Z2V0UGFja2FnZXNPZlByb2plY3RzLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBhY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc3RyaXBBbnNpIGZyb20gJ3N0cmlwLWFuc2knO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAnLi4vZWRpdG9yLWhlbHBlcic7XG5cbmxldCB0YXJiYWxsRGlyOiBzdHJpbmc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5jbGktcGFjaycpO1xuXG5hc3luYyBmdW5jdGlvbiBpbml0KG9wdHM6IFB1Ymxpc2hPcHRpb25zIHwgUGFja09wdGlvbnMpIHtcbiAgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ3RhcmJhbGxzJyk7XG4gIGZzZXh0Lm1rZGlycFN5bmModGFyYmFsbERpcik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKG9wdHM6IFBhY2tPcHRpb25zKSB7XG4gIGF3YWl0IGluaXQob3B0cyk7XG5cbiAgaWYgKG9wdHMud29ya3NwYWNlICYmIG9wdHMud29ya3NwYWNlLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChvcHRzLndvcmtzcGFjZS5tYXAod3MgPT4gcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZSh3cykpKSkpO1xuICB9IGVsc2UgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwYWNrUHJvamVjdChvcHRzLnByb2plY3QpO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMob3B0cy5kaXIpO1xuICB9IGVsc2UgaWYgKG9wdHMucGFja2FnZXMgJiYgb3B0cy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZGlycyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2VzKSlcbiAgICAuZmlsdGVyKHBrZyA9PiBwa2cgJiYgKHBrZy5qc29uLmRyICE9IG51bGwgfHwgcGtnLmpzb24ucGxpbmsgIT0gbnVsbCkpXG4gICAgLm1hcChwa2cgPT4gcGtnIS5yZWFsUGF0aCk7XG5cbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSkpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwdWJsaXNoKG9wdHM6IFB1Ymxpc2hPcHRpb25zKSB7XG4gIGF3YWl0IGluaXQob3B0cyk7XG5cbiAgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMClcbiAgICByZXR1cm4gcHVibGlzaFByb2plY3Qob3B0cy5wcm9qZWN0LCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMob3B0cy5kaXIsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfSBlbHNlIGlmIChvcHRzLnBhY2thZ2VzICYmIG9wdHMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRpcnMgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlcykpXG4gICAgLmZpbHRlcihwa2cgPT4gcGtnKVxuICAgIC5tYXAocGtnID0+IHBrZyEucmVhbFBhdGgpO1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSksXG4gICAgICBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gKmxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgIGxvZy5lcnJvcihgV29ya3NwYWNlICR7d29ya3NwYWNlRGlyfSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICB5aWVsZCBwa2cucmVhbFBhdGg7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1BhY2thZ2VzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCBleGNsdWRlRnJvbVN5bmMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZTJ0YXJiYWxsID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuXG4gIGlmIChwYWNrYWdlRGlycyAmJiBwYWNrYWdlRGlycy5sZW5ndGggPiAwKSB7XG4gICAgLy8gY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBwYWNrYWdlRGlycztcblxuICAgIGNvbnN0IGRvbmUgPSBxdWV1ZVVwKDQsIHBhY2thZ2VEaXJzLm1hcChwYWNrYWdlRGlyID0+ICgpID0+IG5wbVBhY2socGFja2FnZURpcikpKTtcbiAgICBjb25zdCB0YXJJbmZvcyA9IChhd2FpdCBkb25lKS5maWx0ZXIoaXRlbSA9PiB0eXBlb2YgaXRlbSAhPSBudWxsKSBhc1xuICAgICAgKHR5cGVvZiBkb25lIGV4dGVuZHMgUHJvbWlzZTwoaW5mZXIgVClbXT4gPyBOb25OdWxsYWJsZTxUPiA6IHVua25vd24pW107XG5cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGFySW5mb3MpIHtcbiAgICAgIHBhY2thZ2UydGFyYmFsbC5zZXQoaXRlbS5uYW1lLCBQYXRoLnJlc29sdmUodGFyYmFsbERpciwgaXRlbSEuZmlsZW5hbWUpKTtcbiAgICAgIGlmIChpdGVtLm5hbWUgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBleGNsdWRlRnJvbVN5bmMuYWRkKGl0ZW0uZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gbG9nLmluZm8oQXJyYXkuZnJvbShwYWNrYWdlMnRhcmJhbGwuZW50cmllcygpKVxuICAgIC8vICAgLm1hcCgoW3BrTmFtZSwgdmVyXSkgPT4gYFwiJHtwa05hbWV9XCI6IFwiJHt2ZXJ9XCIsYClcbiAgICAvLyAgIC5qb2luKCdcXG4nKSk7XG4gICAgYXdhaXQgZGVsZXRlT2xkVGFyKHRhckluZm9zLm1hcChpdGVtID0+IG5ldyBSZWdFeHAoJ14nICtcbiAgICAgIF8uZXNjYXBlUmVnRXhwKGl0ZW0ubmFtZS5yZXBsYWNlKCdAJywgJycpLnJlcGxhY2UoL1svXFxcXF0vZywgJy0nKSlcbiAgICAgICAgKyAnXFxcXC1cXFxcZCsoPzpcXFxcLlxcXFxkKyl7MSwyfSg/OlxcXFwtW15cXFxcLV0pP1xcXFwudGd6JCcsICdpJ1xuICAgICAgKSksXG4gICAgICB0YXJJbmZvcy5tYXAoaXRlbSA9PiBpdGVtLmZpbGVuYW1lKSk7XG4gICAgYXdhaXQgY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5zY2FuQW5kU3luY1BhY2thZ2VzKHtcbiAgICAgIHBhY2thZ2VKc29uRmlsZXM6IHBhY2thZ2VEaXJzLmZpbHRlcihkaXIgPT4gIWV4Y2x1ZGVGcm9tU3luYy5oYXMoZGlyKSlcbiAgICAgICAgLm1hcChkaXIgPT4gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpKVxuICAgIH0pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhY2tQcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hQYWNrYWdlcyhwYWNrYWdlRGlyczogc3RyaW5nW10sIG5wbUNsaU9wdHM6IHN0cmluZ1tdKSB7XG4gIGlmIChwYWNrYWdlRGlycyAmJiBwYWNrYWdlRGlycy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGdQYXRoczogc3RyaW5nW10gPSBwYWNrYWdlRGlycztcblxuICAgIGF3YWl0IHF1ZXVlVXAoNCwgcGdQYXRocy5tYXAocGFja2FnZURpciA9PiBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbyhgcHVibGlzaGluZyAke3BhY2thZ2VEaXJ9YCk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IFsncHVibGlzaCcsIC4uLm5wbUNsaU9wdHMsIHtzaWxlbnQ6IHRydWUsIGN3ZDogcGFja2FnZURpcn1dO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsIC4uLnBhcmFtcyk7XG4gICAgICAgIGxvZy5pbmZvKG91dHB1dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVibGlzaFByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG4gIGZvciAoY29uc3QgcGtnIG9mIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0RGlycykpIHtcbiAgICBkaXJzLnB1c2gocGtnLnJlYWxQYXRoKTtcbiAgfVxuICBhd2FpdCBwdWJsaXNoUGFja2FnZXMoZGlycywgbnBtQ2xpT3B0cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5wbVBhY2socGFja2FnZVBhdGg6IHN0cmluZyk6XG4gIFByb21pc2U8e25hbWU6IHN0cmluZzsgZmlsZW5hbWU6IHN0cmluZzsgZGlyOiBzdHJpbmc7fSB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCBwcm9taXNpZnlFeGUoJ25wbScsICdwYWNrJywgUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoKSxcbiAgICAgIHtzaWxlbnQ6IHRydWUsIGN3ZDogdGFyYmFsbERpcn0pO1xuICAgIGNvbnN0IHJlc3VsdEluZm8gPSBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0KTtcblxuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gcmVzdWx0SW5mby5nZXQoJ25hbWUnKSE7XG4gICAgLy8gY2IocGFja2FnZU5hbWUsIHJlc3VsdEluZm8uZ2V0KCdmaWxlbmFtZScpISk7XG4gICAgbG9nLmluZm8ob3V0cHV0KTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgICBmaWxlbmFtZTogcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhLFxuICAgICAgZGlyOiBwYWNrYWdlUGF0aFxuICAgIH07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoLCBlKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEBwYXJhbSBwYWNrYWdlMnRhcmJhbGwgXG4gKi9cbmZ1bmN0aW9uIGNoYW5nZVBhY2thZ2VKc29uKHBhY2thZ2VUYXJiYWxsTWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+KSB7XG4gIGNvbnN0IHBhY2thZ2UydGFyYmFsbCA9IG5ldyBNYXAocGFja2FnZVRhcmJhbGxNYXApO1xuICAvLyBpbmNsdWRlIFJvb3QgZGlyXG4gIGZvciAoY29uc3Qgd29ya3NwYWNlIG9mIF8udW5pcShbXG4gICAgLi4uZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSwgJyddKS5tYXAoZGlyID0+IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgZGlyKSlcbiAgKSB7XG4gICAgY29uc3Qgd3NEaXIgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIHdvcmtzcGFjZSk7XG4gICAgY29uc3QganNvbkZpbGUgPSBQYXRoLnJlc29sdmUod3NEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBwa2ogPSBmcy5yZWFkRmlsZVN5bmMoanNvbkZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgYXN0ID0ganNvblBhcnNlcihwa2opO1xuICAgIGNvbnN0IGRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RlcGVuZGVuY2llcycpO1xuICAgIGNvbnN0IGRldkRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKCh7bmFtZX0pID0+IEpTT04ucGFyc2UobmFtZS50ZXh0KSA9PT0gJ2RldkRlcGVuZGVuY2llcycpO1xuICAgIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICAgIGlmIChkZXBzQXN0KSB7XG4gICAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QsIHdzRGlyLCBqc29uRmlsZSwgcmVwbGFjZW1lbnRzKTtcbiAgICB9XG4gICAgaWYgKGRldkRlcHNBc3QpIHtcbiAgICAgIGNoYW5nZURlcGVuZGVuY2llcyhkZXZEZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCwgd3NEaXIsIGpzb25GaWxlLCByZXBsYWNlbWVudHMpO1xuICAgIH1cblxuICAgIC8vIGlmIChwYWNrYWdlMnRhcmJhbGwuc2l6ZSA+IDApIHtcbiAgICAvLyAgIGNvbnN0IGFwcGVuZFRvQXN0ID0gZGVwc0FzdCA/IGRlcHNBc3QgOiBkZXZEZXBzQXN0O1xuICAgIC8vICAgaWYgKGFwcGVuZFRvQXN0ID09IG51bGwpIHtcbiAgICAvLyAgICAgLy8gVGhlcmUgaXMgbm8gZGVwZW5kZW5jaWVzIG9yIERldkRlcGVuZGVuY2llc1xuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7cmVwbGFjZW1lbnQ6ICcsXFxuICBkZXBlbmRlbmNpZXM6IHtcXG4gICAgJywgc3RhcnQ6IHBrai5sZW5ndGggLSAyLCBlbmQ6IHBrai5sZW5ndGggLSAyfSk7XG4gICAgLy8gICAgIGFwcGVuZFJlbWFpbmRlclBrZ3MocGtqLmxlbmd0aCAtIDIpO1xuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7cmVwbGFjZW1lbnQ6ICdcXG4gIH1cXG4nLCBzdGFydDogcGtqLmxlbmd0aCAtIDIsIGVuZDogcGtqLmxlbmd0aCAtIDJ9KTtcbiAgICAvLyAgIH0gZWxzZSB7XG4gICAgLy8gICAgIGxldCBhcHBlbmRQb3MgPSAoYXBwZW5kVG9Bc3QudmFsdWUpLmVuZCAtIDE7XG4gICAgLy8gICAgIGNvbnN0IGV4aXN0aW5nRW50cmllcyA9IChhcHBlbmRUb0FzdC52YWx1ZSBhcyBPYmplY3RBc3QpLnByb3BlcnRpZXM7XG4gICAgLy8gICAgIGlmIChleGlzdGluZ0VudHJpZXMubGVuZ3RoID4gMCkge1xuICAgIC8vICAgICAgIGFwcGVuZFBvcyA9IGV4aXN0aW5nRW50cmllc1tleGlzdGluZ0VudHJpZXMubGVuZ3RoIC0gMV0udmFsdWUuZW5kO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAvLyAgICAgICByZXBsYWNlbWVudDogJyxcXG4gICAgJywgc3RhcnQ6IGFwcGVuZFBvcywgZW5kOiBhcHBlbmRQb3NcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICAgIGFwcGVuZFJlbWFpbmRlclBrZ3MoYXBwZW5kUG9zKTtcbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgIC8vICAgICAgIHJlcGxhY2VtZW50OiAnXFxuJywgc3RhcnQ6IGFwcGVuZFBvcywgZW5kOiBhcHBlbmRQb3NcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgLy8gZnVuY3Rpb24gYXBwZW5kUmVtYWluZGVyUGtncyhhcHBlbmRQb3M6IG51bWJlcikge1xuICAgIC8vICAgbGV0IGkgPSAxO1xuICAgIC8vICAgZm9yIChjb25zdCBbcGtOYW1lLCB0YXJGaWxlXSBvZiBwYWNrYWdlMnRhcmJhbGwpIHtcbiAgICAvLyAgICAgbGV0IG5ld1ZlcnNpb24gPSBQYXRoLnJlbGF0aXZlKHdzRGlyLCB0YXJGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgIGxvZy5pbmZvKGBBcHBlbmQgJHtqc29uRmlsZX06IFwiJHtwa05hbWV9XCI6ICR7bmV3VmVyc2lvbn1gKTtcblxuICAgIC8vICAgICBpZiAoIW5ld1ZlcnNpb24uc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgLy8gICAgICAgbmV3VmVyc2lvbiA9ICcuLycgKyBuZXdWZXJzaW9uO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAvLyAgICAgICByZXBsYWNlbWVudDogYFwiJHtwa05hbWV9XCI6ICR7bmV3VmVyc2lvbn1gLCBzdGFydDogYXBwZW5kUG9zLCBlbmQ6IGFwcGVuZFBvc1xuICAgIC8vICAgICB9KTtcbiAgICAvLyAgICAgaWYgKGkgIT09IHBhY2thZ2UydGFyYmFsbC5zaXplKSB7XG4gICAgLy8gICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgIC8vICAgICAgICAgcmVwbGFjZW1lbnQ6ICcsXFxuICAgICcsIHN0YXJ0OiBhcHBlbmRQb3MsIGVuZDogYXBwZW5kUG9zXG4gICAgLy8gICAgICAgfSk7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgaSsrO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuXG4gICAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IHJlcGxhY2VDb2RlKHBraiwgcmVwbGFjZW1lbnRzKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYFVwZGF0ZWQgJHtqc29uRmlsZX1cXG5gLCByZXBsYWNlZCk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGpzb25GaWxlLCByZXBsYWNlZCk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGNoYW5nZURlcGVuZGVuY2llcyhkZXBzOiBPYmplY3RBc3QsIHdzRGlyOiBzdHJpbmcsIGpzb25GaWxlOiBzdHJpbmcsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSkge1xuICAgIC8vIGNvbnNvbGUubG9nKGRlcHMucHJvcGVydGllcy5tYXAocHJvcCA9PiBwcm9wLm5hbWUudGV4dCArICc6JyArIChwcm9wLnZhbHVlIGFzIFRva2VuKS50ZXh0KSk7XG4gICAgLy8gY29uc29sZS5sb2coQXJyYXkuZnJvbShwYWNrYWdlMnRhcmJhbGwuZW50cmllcygpKSk7XG4gICAgY29uc3QgZm91bmREZXBzID0gZGVwcy5wcm9wZXJ0aWVzLmZpbHRlcigoe25hbWV9KSA9PiBwYWNrYWdlMnRhcmJhbGwuaGFzKEpTT04ucGFyc2UobmFtZS50ZXh0KSkpO1xuICAgIGZvciAoY29uc3QgZm91bmREZXAgb2YgZm91bmREZXBzKSB7XG4gICAgICBjb25zdCB2ZXJUb2tlbiA9IGZvdW5kRGVwLnZhbHVlIGFzIFRva2VuO1xuICAgICAgY29uc3QgcGtOYW1lID0gSlNPTi5wYXJzZShmb3VuZERlcC5uYW1lLnRleHQpO1xuICAgICAgY29uc3QgdGFyRmlsZSA9IHBhY2thZ2UydGFyYmFsbC5nZXQocGtOYW1lKTtcbiAgICAgIGxldCBuZXdWZXJzaW9uID0gUGF0aC5yZWxhdGl2ZSh3c0RpciwgdGFyRmlsZSEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmICghbmV3VmVyc2lvbi5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgbmV3VmVyc2lvbiA9ICcuLycgKyBuZXdWZXJzaW9uO1xuICAgICAgfVxuICAgICAgbG9nLmluZm8oYFVwZGF0ZSAke2pzb25GaWxlfTogJHt2ZXJUb2tlbi50ZXh0fSA9PiAke25ld1ZlcnNpb259YCk7XG4gICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgIHN0YXJ0OiB2ZXJUb2tlbi5wb3MsXG4gICAgICAgIGVuZDogdmVyVG9rZW4uZW5kISxcbiAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkobmV3VmVyc2lvbilcbiAgICAgIH0pO1xuICAgICAgLy8gcGFja2FnZTJ0YXJiYWxsLmRlbGV0ZShwa05hbWUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFeHB0aW9uKHBhY2thZ2VQYXRoOiBzdHJpbmcsIGU6IEVycm9yKSB7XG4gIGlmIChlICYmIGUubWVzc2FnZSAmJiBlLm1lc3NhZ2UuaW5kZXhPZignRVBVQkxJU0hDT05GTElDVCcpID4gMClcbiAgICBsb2cuaW5mbyhgbnBtIHBhY2sgJHtwYWNrYWdlUGF0aH06IEVQVUJMSVNIQ09ORkxJQ1QuYCk7XG4gIGVsc2VcbiAgICBsb2cuZXJyb3IocGFja2FnZVBhdGgsIGUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIG91dHB1dCBcbiAqIGUuZy5cbm5wbSBub3RpY2UgPT09IFRhcmJhbGwgRGV0YWlscyA9PT0gXG5ucG0gbm90aWNlIG5hbWU6ICAgICAgICAgIHJlcXVpcmUtaW5qZWN0b3IgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdmVyc2lvbjogICAgICAgNS4xLjUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBmaWxlbmFtZTogICAgICByZXF1aXJlLWluamVjdG9yLTUuMS41LnRneiAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHBhY2thZ2Ugc2l6ZTogIDU2Ljkga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgdW5wYWNrZWQgc2l6ZTogMjI5LjEga0IgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBzaGFzdW06ICAgICAgICBjMDY5MzI3MGMxNDBmNjVhNjk2MjA3YWI5ZGViMThlNjQ0NTJhMDJjXG5ucG0gbm90aWNlIGludGVncml0eTogICAgIHNoYTUxMi1rUkdWV2N3MWZ2UTVKWy4uLl1BQndMUFU4VXZTdGJBPT1cbm5wbSBub3RpY2UgdG90YWwgZmlsZXM6ICAgNDcgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSBcblxuICovXG5mdW5jdGlvbiBwYXJzZU5wbVBhY2tPdXRwdXQob3V0cHV0OiBzdHJpbmcpIHtcbiAgY29uc3QgbGluZXMgPSBzdHJpcEFuc2kob3V0cHV0KS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmV4cG9ydCBjb25zdCB0ZXN0YWJsZSA9IHtwYXJzZU5wbVBhY2tPdXRwdXR9O1xuXG5mdW5jdGlvbiBkZWxldGVPbGRUYXIoZGVsZXRlRmlsZVJlZzogUmVnRXhwW10sIGtlZXBmaWxlczogc3RyaW5nW10pIHtcbiAgLy8gbG9nLndhcm4oZGVsZXRlRmlsZVJlZywga2VlcGZpbGVzKTtcbiAgY29uc3QgdGFyU2V0ID0gbmV3IFNldChrZWVwZmlsZXMpO1xuICBjb25zdCBkZWxldGVEb25lOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJiYWxsRGlyKSlcbiAgICBmc2V4dC5ta2RpcnBTeW5jKHRhcmJhbGxEaXIpO1xuICAvLyBUT0RPOiB3YWl0IGZvciB0aW1lb3V0XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYyh0YXJiYWxsRGlyKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUmVnLnNvbWUocmVnID0+IHJlZy50ZXN0KGZpbGUpKSkge1xuICAgICAgbG9nLndhcm4oJ1JlbW92ZSAnICsgZmlsZSk7XG4gICAgICBkZWxldGVEb25lLnB1c2goZnMucHJvbWlzZXMudW5saW5rKFBhdGgucmVzb2x2ZSh0YXJiYWxsRGlyLCBmaWxlKSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsZXRlRG9uZSk7XG59XG4iXX0=