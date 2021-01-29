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
        yield config_1.default.init(opts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXBhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHFGQUF5RTtBQUN6RSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLHdEQUE2QjtBQUM3QiwyQ0FBNkI7QUFDN0Isb0RBQThDO0FBQzlDLHFDQUFxQztBQUNyQyxxREFBcUQ7QUFDckQsaUZBQXVFO0FBQ3ZFLGtGQUE2RTtBQUM3RSx1REFBK0I7QUFFL0IsZ0RBQTZFO0FBQzdFLDRFQUF5RTtBQUN6RSxvREFBNEI7QUFDNUIsbUNBQTRDO0FBRTVDLElBQUksVUFBa0IsQ0FBQztBQUN2QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRS9DLFNBQWUsSUFBSSxDQUFDLElBQWtDOztRQUNwRCxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDekQsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUFBO0FBRUQsU0FBc0IsSUFBSSxDQUFDLElBQWlCOztRQUMxQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqQixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDdEc7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2xELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNsQzthQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDMUMsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzlCO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNwRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3RFLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTNCLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTCxNQUFNLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRTtJQUNILENBQUM7Q0FBQTtBQWxCRCxvQkFrQkM7QUFFRCxTQUFzQixPQUFPLENBQUMsSUFBb0I7O1FBQ2hELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWpCLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3pDLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzVFLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDeEMsTUFBTSxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDNUU7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3BELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDdEUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0IsTUFBTSxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUN4RTthQUFNO1lBQ0wsTUFBTSxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUN4RSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0NBQUE7QUFoQkQsMEJBZ0JDO0FBRUQsUUFBUyxDQUFDLENBQUEseUJBQXlCLENBQUMsWUFBb0I7SUFDdEQsTUFBTSxLQUFLLEdBQUcsMEJBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN6QyxJQUFJLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLFlBQVksK0JBQStCLENBQUMsQ0FBQztRQUNwRSxPQUFPO0tBQ1I7SUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLDJDQUFxQixDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzlDLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQztLQUNwQjtBQUNILENBQUM7QUFFRCxTQUFlLFlBQVksQ0FBQyxXQUFxQjs7UUFDL0MsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDbEQsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDekMsTUFBTSxPQUFPLEdBQWEsV0FBVyxDQUFDO1lBRXRDLE1BQU0sSUFBSSxHQUFHLHdCQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLElBQUksSUFBSSxJQUFJLENBQ1MsQ0FBQztZQUUxRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRTtnQkFDM0IsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQzFFO1lBQ0QsaURBQWlEO1lBQ2pELHNEQUFzRDtZQUN0RCxrQkFBa0I7WUFDbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUc7Z0JBQ3BELENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7a0JBQzdELDhDQUE4QyxFQUFFLEdBQUcsQ0FDdEQsQ0FBQyxFQUNGLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN2QyxNQUFNLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1NBQzFDO0lBQ0gsQ0FBQztDQUFBO0FBRUQsU0FBZSxXQUFXLENBQUMsV0FBcUI7O1FBQzlDLE1BQU0sSUFBSSxHQUFHLEVBQWMsQ0FBQztRQUM1QixLQUFLLE1BQU0sR0FBRyxJQUFJLG1DQUFxQixDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUFBO0FBRUQsU0FBZSxlQUFlLENBQUMsV0FBcUIsRUFBRSxVQUFvQjs7UUFDeEUsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDekMsTUFBTSxPQUFPLEdBQWEsV0FBVyxDQUFDO1lBRXRDLE1BQU0sd0JBQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQVMsRUFBRTtnQkFDcEQsSUFBSTtvQkFDRixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsVUFBVSxFQUFFLENBQUMsQ0FBQztvQkFDckMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxVQUFVLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUMsQ0FBQyxDQUFDO29CQUMzRSxNQUFNLE1BQU0sR0FBRyxNQUFNLDRCQUFZLENBQUMsS0FBSyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7b0JBQ3BELEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQ2xCO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2Q7WUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUM7U0FDTDtJQUNILENBQUM7Q0FBQTtBQUVELFNBQWUsY0FBYyxDQUFDLFdBQXFCLEVBQUUsVUFBb0I7O1FBQ3ZFLE1BQU0sSUFBSSxHQUFHLEVBQWMsQ0FBQztRQUM1QixLQUFLLE1BQU0sR0FBRyxJQUFJLG1DQUFxQixDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsTUFBTSxlQUFlLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FBQTtBQUVELFNBQWUsT0FBTyxDQUFDLFdBQW1COztRQUV4QyxJQUFJO1lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSw0QkFBWSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDeEUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTlDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLENBQUM7WUFDNUMsZ0RBQWdEO1lBQ2hELEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakIsT0FBTztnQkFDTCxJQUFJLEVBQUUsV0FBVztnQkFDakIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFFO2FBQ3RDLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztDQUFBO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLGlCQUFzQztJQUMvRCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25ELEtBQUssTUFBTSxTQUFTLElBQUksQ0FBQyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQzVFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNyRCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5QyxNQUFNLEdBQUcsR0FBRywwQkFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssY0FBYyxDQUFDLENBQUM7UUFDMUYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7UUFDMUMsSUFBSSxPQUFPLEVBQUU7WUFDWCxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsS0FBa0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQy9FO1FBQ0QsSUFBSSxVQUFVLEVBQUU7WUFDZCxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsS0FBa0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQ2xGO1FBRUQsa0NBQWtDO1FBQ2xDLHdEQUF3RDtRQUN4RCwrQkFBK0I7UUFDL0IscURBQXFEO1FBQ3JELGtIQUFrSDtRQUNsSCwyQ0FBMkM7UUFDM0MsK0ZBQStGO1FBQy9GLGFBQWE7UUFDYixtREFBbUQ7UUFDbkQsMkVBQTJFO1FBQzNFLHdDQUF3QztRQUN4QywyRUFBMkU7UUFDM0UsUUFBUTtRQUNSLDBCQUEwQjtRQUMxQixpRUFBaUU7UUFDakUsVUFBVTtRQUNWLHNDQUFzQztRQUN0QywwQkFBMEI7UUFDMUIsNERBQTREO1FBQzVELFVBQVU7UUFDVixNQUFNO1FBQ04sSUFBSTtRQUVKLG9EQUFvRDtRQUNwRCxlQUFlO1FBQ2YsdURBQXVEO1FBQ3ZELDBFQUEwRTtRQUMxRSxrRUFBa0U7UUFFbEUseUNBQXlDO1FBQ3pDLHdDQUF3QztRQUN4QyxRQUFRO1FBQ1IsMEJBQTBCO1FBQzFCLG9GQUFvRjtRQUNwRixVQUFVO1FBQ1Ysd0NBQXdDO1FBQ3hDLDRCQUE0QjtRQUM1QixtRUFBbUU7UUFDbkUsWUFBWTtRQUNaLFFBQVE7UUFDUixXQUFXO1FBQ1gsTUFBTTtRQUNOLElBQUk7UUFHSixJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLE1BQU0sUUFBUSxHQUFHLG9CQUFXLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ2hELHVDQUF1QztZQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzdDLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3RDO0tBQ0Y7SUFDRCxTQUFTLGtCQUFrQixDQUFDLElBQWUsRUFBRSxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxZQUE4QjtRQUMxRywrRkFBK0Y7UUFDL0Ysc0RBQXNEO1FBQ3RELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakcsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDaEMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQWMsQ0FBQztZQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUMsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixVQUFVLEdBQUcsSUFBSSxHQUFHLFVBQVUsQ0FBQzthQUNoQztZQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksT0FBTyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQ2xFLFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRztnQkFDbkIsR0FBRyxFQUFFLFFBQVEsQ0FBQyxHQUFJO2dCQUNsQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7YUFDakMsQ0FBQyxDQUFDO1lBQ0gsa0NBQWtDO1NBQ25DO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxXQUFtQixFQUFFLENBQVE7SUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUM7UUFDN0QsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLFdBQVcscUJBQXFCLENBQUMsQ0FBQzs7UUFFdkQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILFNBQVMsa0JBQWtCLENBQUMsTUFBYztJQUN4QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQzlDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsS0FBSztZQUNSLE9BQU8sSUFBSSxDQUFDO1FBQ2QsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFFWSxRQUFBLFFBQVEsR0FBRyxFQUFDLGtCQUFrQixFQUFDLENBQUM7QUFFN0MsU0FBUyxZQUFZLENBQUMsYUFBdUIsRUFBRSxTQUFtQjtJQUNoRSxzQ0FBc0M7SUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEMsTUFBTSxVQUFVLEdBQW1CLEVBQUUsQ0FBQztJQUV0QyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDNUIsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IseUJBQXlCO0lBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO1lBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JFO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtxdWV1ZVVwfSBmcm9tICcuLi8uLi8uLi90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QvcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Byb21pc2lmeUV4ZX0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG4vLyBpbXBvcnQge2JveFN0cmluZ30gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQgKiBhcyByZWNpcGVNYW5hZ2VyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IGpzb25QYXJzZXIsIHtPYmplY3RBc3QsIFRva2VufSBmcm9tICcuLi91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge1BhY2tPcHRpb25zLCBQdWJsaXNoT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2dldFBhY2thZ2VzT2ZQcm9qZWN0cywgZ2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcblxubGV0IHRhcmJhbGxEaXI6IHN0cmluZztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNsaS1wYWNrJyk7XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXQob3B0czogUHVibGlzaE9wdGlvbnMgfCBQYWNrT3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHRzKTtcbiAgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ3RhcmJhbGxzJyk7XG4gIGZzZXh0Lm1rZGlycFN5bmModGFyYmFsbERpcik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYWNrKG9wdHM6IFBhY2tPcHRpb25zKSB7XG4gIGF3YWl0IGluaXQob3B0cyk7XG5cbiAgaWYgKG9wdHMud29ya3NwYWNlICYmIG9wdHMud29ya3NwYWNlLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChvcHRzLndvcmtzcGFjZS5tYXAod3MgPT4gcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZSh3cykpKSkpO1xuICB9IGVsc2UgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwYWNrUHJvamVjdChvcHRzLnByb2plY3QpO1xuICB9IGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwYWNrUGFja2FnZXMob3B0cy5kaXIpO1xuICB9IGVsc2UgaWYgKG9wdHMucGFja2FnZXMgJiYgb3B0cy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZGlycyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2VzKSlcbiAgICAuZmlsdGVyKHBrZyA9PiBwa2cpXG4gICAgLm1hcChwa2cgPT4gcGtnIS5yZWFsUGF0aCk7XG5cbiAgICBhd2FpdCBwYWNrUGFja2FnZXMoZGlycyk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcGFja1BhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSkpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwdWJsaXNoKG9wdHM6IFB1Ymxpc2hPcHRpb25zKSB7XG4gIGF3YWl0IGluaXQob3B0cyk7XG5cbiAgaWYgKG9wdHMucHJvamVjdCAmJiBvcHRzLnByb2plY3QubGVuZ3RoID4gMClcbiAgICByZXR1cm4gcHVibGlzaFByb2plY3Qob3B0cy5wcm9qZWN0LCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIGVsc2UgaWYgKG9wdHMuZGlyICYmIG9wdHMuZGlyLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBwdWJsaXNoUGFja2FnZXMob3B0cy5kaXIsIG9wdHMucHVibGljID8gWyctLWFjY2VzcycsICdwdWJsaWMnXSA6IFtdKTtcbiAgfSBlbHNlIGlmIChvcHRzLnBhY2thZ2VzICYmIG9wdHMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRpcnMgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlcykpXG4gICAgLmZpbHRlcihwa2cgPT4gcGtnKVxuICAgIC5tYXAocGtnID0+IHBrZyEucmVhbFBhdGgpO1xuICAgIGF3YWl0IHB1Ymxpc2hQYWNrYWdlcyhkaXJzLCBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKEFycmF5LmZyb20obGlua2VkUGFja2FnZXNPZldvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKSksXG4gICAgICBvcHRzLnB1YmxpYyA/IFsnLS1hY2Nlc3MnLCAncHVibGljJ10gOiBbXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gKmxpbmtlZFBhY2thZ2VzT2ZXb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgIGxvZy5lcnJvcihgV29ya3NwYWNlICR7d29ya3NwYWNlRGlyfSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICB5aWVsZCBwa2cucmVhbFBhdGg7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFja1BhY2thZ2VzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSkge1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBjb25zdCBkb25lID0gcXVldWVVcCg0LCBwZ1BhdGhzLm1hcChwYWNrYWdlRGlyID0+ICgpID0+IG5wbVBhY2socGFja2FnZURpcikpKTtcbiAgICBjb25zdCB0YXJJbmZvcyA9IChhd2FpdCBkb25lKS5maWx0ZXIoaXRlbSA9PiB0eXBlb2YgaXRlbSAhPSBudWxsKSBhc1xuICAgICAgKHR5cGVvZiBkb25lIGV4dGVuZHMgUHJvbWlzZTwoaW5mZXIgVClbXT4gPyBOb25OdWxsYWJsZTxUPiA6IHVua25vd24pW107XG5cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGFySW5mb3MpIHtcbiAgICAgIHBhY2thZ2UydGFyYmFsbC5zZXQoaXRlbS5uYW1lLCBQYXRoLnJlc29sdmUodGFyYmFsbERpciwgaXRlbSEuZmlsZW5hbWUpKTtcbiAgICB9XG4gICAgLy8gbG9nLmluZm8oQXJyYXkuZnJvbShwYWNrYWdlMnRhcmJhbGwuZW50cmllcygpKVxuICAgIC8vICAgLm1hcCgoW3BrTmFtZSwgdmVyXSkgPT4gYFwiJHtwa05hbWV9XCI6IFwiJHt2ZXJ9XCIsYClcbiAgICAvLyAgIC5qb2luKCdcXG4nKSk7XG4gICAgYXdhaXQgZGVsZXRlT2xkVGFyKHRhckluZm9zLm1hcChpdGVtID0+IG5ldyBSZWdFeHAoJ14nICtcbiAgICAgIF8uZXNjYXBlUmVnRXhwKGl0ZW0ubmFtZS5yZXBsYWNlKCdAJywgJycpLnJlcGxhY2UoL1svXFxcXF0vZywgJy0nKSlcbiAgICAgICAgKyAnXFxcXC1cXFxcZCsoPzpcXFxcLlxcXFxkKyl7MSwyfSg/OlxcXFwtW15cXFxcLV0pP1xcXFwudGd6JCcsICdpJ1xuICAgICAgKSksXG4gICAgICB0YXJJbmZvcy5tYXAoaXRlbSA9PiBpdGVtLmZpbGVuYW1lKSk7XG4gICAgYXdhaXQgY2hhbmdlUGFja2FnZUpzb24ocGFja2FnZTJ0YXJiYWxsKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwYWNrUHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10pIHtcbiAgY29uc3QgZGlycyA9IFtdIGFzIHN0cmluZ1tdO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdERpcnMpKSB7XG4gICAgZGlycy5wdXNoKHBrZy5yZWFsUGF0aCk7XG4gIH1cbiAgYXdhaXQgcGFja1BhY2thZ2VzKGRpcnMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUGFja2FnZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCBucG1DbGlPcHRzOiBzdHJpbmdbXSkge1xuICBpZiAocGFja2FnZURpcnMgJiYgcGFja2FnZURpcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBnUGF0aHM6IHN0cmluZ1tdID0gcGFja2FnZURpcnM7XG5cbiAgICBhd2FpdCBxdWV1ZVVwKDQsIHBnUGF0aHMubWFwKHBhY2thZ2VEaXIgPT4gYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oYHB1Ymxpc2hpbmcgJHtwYWNrYWdlRGlyfWApO1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBbJ3B1Ymxpc2gnLCAuLi5ucG1DbGlPcHRzLCB7c2lsZW50OiB0cnVlLCBjd2Q6IHBhY2thZ2VEaXJ9XTtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gYXdhaXQgcHJvbWlzaWZ5RXhlKCducG0nLCAuLi5wYXJhbXMpO1xuICAgICAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1Ymxpc2hQcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSwgbnBtQ2xpT3B0czogc3RyaW5nW10pIHtcbiAgY29uc3QgZGlycyA9IFtdIGFzIHN0cmluZ1tdO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdERpcnMpKSB7XG4gICAgZGlycy5wdXNoKHBrZy5yZWFsUGF0aCk7XG4gIH1cbiAgYXdhaXQgcHVibGlzaFBhY2thZ2VzKGRpcnMsIG5wbUNsaU9wdHMpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBucG1QYWNrKHBhY2thZ2VQYXRoOiBzdHJpbmcpOlxuICBQcm9taXNlPHtuYW1lOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmd9IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHByb21pc2lmeUV4ZSgnbnBtJywgJ3BhY2snLCBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgpLFxuICAgICAge3NpbGVudDogdHJ1ZSwgY3dkOiB0YXJiYWxsRGlyfSk7XG4gICAgY29uc3QgcmVzdWx0SW5mbyA9IHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQpO1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSByZXN1bHRJbmZvLmdldCgnbmFtZScpITtcbiAgICAvLyBjYihwYWNrYWdlTmFtZSwgcmVzdWx0SW5mby5nZXQoJ2ZpbGVuYW1lJykhKTtcbiAgICBsb2cuaW5mbyhvdXRwdXQpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICAgIGZpbGVuYW1lOiByZXN1bHRJbmZvLmdldCgnZmlsZW5hbWUnKSFcbiAgICB9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgaGFuZGxlRXhwdGlvbihwYWNrYWdlUGF0aCwgZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBAcGFyYW0gcGFja2FnZTJ0YXJiYWxsIFxuICovXG5mdW5jdGlvbiBjaGFuZ2VQYWNrYWdlSnNvbihwYWNrYWdlVGFyYmFsbE1hcDogTWFwPHN0cmluZywgc3RyaW5nPikge1xuICBjb25zdCBwYWNrYWdlMnRhcmJhbGwgPSBuZXcgTWFwKHBhY2thZ2VUYXJiYWxsTWFwKTtcbiAgZm9yIChjb25zdCB3b3Jrc3BhY2Ugb2YgWy4uLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCksIGNvbmZpZygpLnJvb3RQYXRoXSkge1xuICAgIGNvbnN0IHdzRGlyID0gUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCB3b3Jrc3BhY2UpO1xuICAgIGNvbnN0IGpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHdzRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcGtqID0gZnMucmVhZEZpbGVTeW5jKGpzb25GaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGFzdCA9IGpzb25QYXJzZXIocGtqKTtcbiAgICBjb25zdCBkZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXBlbmRlbmNpZXMnKTtcbiAgICBjb25zdCBkZXZEZXBzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZCgoe25hbWV9KSA9PiBKU09OLnBhcnNlKG5hbWUudGV4dCkgPT09ICdkZXZEZXBlbmRlbmNpZXMnKTtcbiAgICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgICBpZiAoZGVwc0FzdCkge1xuICAgICAgY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHNBc3QudmFsdWUgYXMgT2JqZWN0QXN0LCB3c0RpciwganNvbkZpbGUsIHJlcGxhY2VtZW50cyk7XG4gICAgfVxuICAgIGlmIChkZXZEZXBzQXN0KSB7XG4gICAgICBjaGFuZ2VEZXBlbmRlbmNpZXMoZGV2RGVwc0FzdC52YWx1ZSBhcyBPYmplY3RBc3QsIHdzRGlyLCBqc29uRmlsZSwgcmVwbGFjZW1lbnRzKTtcbiAgICB9XG5cbiAgICAvLyBpZiAocGFja2FnZTJ0YXJiYWxsLnNpemUgPiAwKSB7XG4gICAgLy8gICBjb25zdCBhcHBlbmRUb0FzdCA9IGRlcHNBc3QgPyBkZXBzQXN0IDogZGV2RGVwc0FzdDtcbiAgICAvLyAgIGlmIChhcHBlbmRUb0FzdCA9PSBudWxsKSB7XG4gICAgLy8gICAgIC8vIFRoZXJlIGlzIG5vIGRlcGVuZGVuY2llcyBvciBEZXZEZXBlbmRlbmNpZXNcbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe3JlcGxhY2VtZW50OiAnLFxcbiAgZGVwZW5kZW5jaWVzOiB7XFxuICAgICcsIHN0YXJ0OiBwa2oubGVuZ3RoIC0gMiwgZW5kOiBwa2oubGVuZ3RoIC0gMn0pO1xuICAgIC8vICAgICBhcHBlbmRSZW1haW5kZXJQa2dzKHBrai5sZW5ndGggLSAyKTtcbiAgICAvLyAgICAgcmVwbGFjZW1lbnRzLnB1c2goe3JlcGxhY2VtZW50OiAnXFxuICB9XFxuJywgc3RhcnQ6IHBrai5sZW5ndGggLSAyLCBlbmQ6IHBrai5sZW5ndGggLSAyfSk7XG4gICAgLy8gICB9IGVsc2Uge1xuICAgIC8vICAgICBsZXQgYXBwZW5kUG9zID0gKGFwcGVuZFRvQXN0LnZhbHVlKS5lbmQgLSAxO1xuICAgIC8vICAgICBjb25zdCBleGlzdGluZ0VudHJpZXMgPSAoYXBwZW5kVG9Bc3QudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzO1xuICAgIC8vICAgICBpZiAoZXhpc3RpbmdFbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAvLyAgICAgICBhcHBlbmRQb3MgPSBleGlzdGluZ0VudHJpZXNbZXhpc3RpbmdFbnRyaWVzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgLy8gICAgICAgcmVwbGFjZW1lbnQ6ICcsXFxuICAgICcsIHN0YXJ0OiBhcHBlbmRQb3MsIGVuZDogYXBwZW5kUG9zXG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgICBhcHBlbmRSZW1haW5kZXJQa2dzKGFwcGVuZFBvcyk7XG4gICAgLy8gICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAvLyAgICAgICByZXBsYWNlbWVudDogJ1xcbicsIHN0YXJ0OiBhcHBlbmRQb3MsIGVuZDogYXBwZW5kUG9zXG4gICAgLy8gICAgIH0pO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIGZ1bmN0aW9uIGFwcGVuZFJlbWFpbmRlclBrZ3MoYXBwZW5kUG9zOiBudW1iZXIpIHtcbiAgICAvLyAgIGxldCBpID0gMTtcbiAgICAvLyAgIGZvciAoY29uc3QgW3BrTmFtZSwgdGFyRmlsZV0gb2YgcGFja2FnZTJ0YXJiYWxsKSB7XG4gICAgLy8gICAgIGxldCBuZXdWZXJzaW9uID0gUGF0aC5yZWxhdGl2ZSh3c0RpciwgdGFyRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vICAgICBsb2cuaW5mbyhgQXBwZW5kICR7anNvbkZpbGV9OiBcIiR7cGtOYW1lfVwiOiAke25ld1ZlcnNpb259YCk7XG5cbiAgICAvLyAgICAgaWYgKCFuZXdWZXJzaW9uLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgIC8vICAgICAgIG5ld1ZlcnNpb24gPSAnLi8nICsgbmV3VmVyc2lvbjtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgLy8gICAgICAgcmVwbGFjZW1lbnQ6IGBcIiR7cGtOYW1lfVwiOiAke25ld1ZlcnNpb259YCwgc3RhcnQ6IGFwcGVuZFBvcywgZW5kOiBhcHBlbmRQb3NcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gICAgIGlmIChpICE9PSBwYWNrYWdlMnRhcmJhbGwuc2l6ZSkge1xuICAgIC8vICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAvLyAgICAgICAgIHJlcGxhY2VtZW50OiAnLFxcbiAgICAnLCBzdGFydDogYXBwZW5kUG9zLCBlbmQ6IGFwcGVuZFBvc1xuICAgIC8vICAgICAgIH0pO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIGkrKztcbiAgICAvLyAgIH1cbiAgICAvLyB9XG5cblxuICAgIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZWQgPSByZXBsYWNlQ29kZShwa2osIHJlcGxhY2VtZW50cyk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKCdVcGRhdGVkIHBhY2thZ2UuanNvblxcbicsIHJlcGxhY2VkKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoanNvbkZpbGUsIHJlcGxhY2VkKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gY2hhbmdlRGVwZW5kZW5jaWVzKGRlcHM6IE9iamVjdEFzdCwgd3NEaXI6IHN0cmluZywganNvbkZpbGU6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdKSB7XG4gICAgLy8gY29uc29sZS5sb2coZGVwcy5wcm9wZXJ0aWVzLm1hcChwcm9wID0+IHByb3AubmFtZS50ZXh0ICsgJzonICsgKHByb3AudmFsdWUgYXMgVG9rZW4pLnRleHQpKTtcbiAgICAvLyBjb25zb2xlLmxvZyhBcnJheS5mcm9tKHBhY2thZ2UydGFyYmFsbC5lbnRyaWVzKCkpKTtcbiAgICBjb25zdCBmb3VuZERlcHMgPSBkZXBzLnByb3BlcnRpZXMuZmlsdGVyKCh7bmFtZX0pID0+IHBhY2thZ2UydGFyYmFsbC5oYXMoSlNPTi5wYXJzZShuYW1lLnRleHQpKSk7XG4gICAgZm9yIChjb25zdCBmb3VuZERlcCBvZiBmb3VuZERlcHMpIHtcbiAgICAgIGNvbnN0IHZlclRva2VuID0gZm91bmREZXAudmFsdWUgYXMgVG9rZW47XG4gICAgICBjb25zdCBwa05hbWUgPSBKU09OLnBhcnNlKGZvdW5kRGVwLm5hbWUudGV4dCk7XG4gICAgICBjb25zdCB0YXJGaWxlID0gcGFja2FnZTJ0YXJiYWxsLmdldChwa05hbWUpO1xuICAgICAgbGV0IG5ld1ZlcnNpb24gPSBQYXRoLnJlbGF0aXZlKHdzRGlyLCB0YXJGaWxlISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKCFuZXdWZXJzaW9uLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICBuZXdWZXJzaW9uID0gJy4vJyArIG5ld1ZlcnNpb247XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhgVXBkYXRlICR7anNvbkZpbGV9OiAke3ZlclRva2VuLnRleHR9ID0+ICR7bmV3VmVyc2lvbn1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IHZlclRva2VuLnBvcyxcbiAgICAgICAgZW5kOiB2ZXJUb2tlbi5lbmQhLFxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeShuZXdWZXJzaW9uKVxuICAgICAgfSk7XG4gICAgICAvLyBwYWNrYWdlMnRhcmJhbGwuZGVsZXRlKHBrTmFtZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4cHRpb24ocGFja2FnZVBhdGg6IHN0cmluZywgZTogRXJyb3IpIHtcbiAgaWYgKGUgJiYgZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmRleE9mKCdFUFVCTElTSENPTkZMSUNUJykgPiAwKVxuICAgIGxvZy5pbmZvKGBucG0gcGFjayAke3BhY2thZ2VQYXRofTogRVBVQkxJU0hDT05GTElDVC5gKTtcbiAgZWxzZVxuICAgIGxvZy5lcnJvcihwYWNrYWdlUGF0aCwgZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gb3V0cHV0IFxuICogZS5nLlxubnBtIG5vdGljZSA9PT0gVGFyYmFsbCBEZXRhaWxzID09PSBcbm5wbSBub3RpY2UgbmFtZTogICAgICAgICAgcmVxdWlyZS1pbmplY3RvciAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB2ZXJzaW9uOiAgICAgICA1LjEuNSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIGZpbGVuYW1lOiAgICAgIHJlcXVpcmUtaW5qZWN0b3ItNS4xLjUudGd6ICAgICAgICAgICAgICBcbm5wbSBub3RpY2UgcGFja2FnZSBzaXplOiAgNTYuOSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxubnBtIG5vdGljZSB1bnBhY2tlZCBzaXplOiAyMjkuMSBrQiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIHNoYXN1bTogICAgICAgIGMwNjkzMjcwYzE0MGY2NWE2OTYyMDdhYjlkZWIxOGU2NDQ1MmEwMmNcbm5wbSBub3RpY2UgaW50ZWdyaXR5OiAgICAgc2hhNTEyLWtSR1ZXY3cxZnZRNUpbLi4uXUFCd0xQVThVdlN0YkE9PVxubnBtIG5vdGljZSB0b3RhbCBmaWxlczogICA0NyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5ucG0gbm90aWNlIFxuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnBtUGFja091dHB1dChvdXRwdXQ6IHN0cmluZykge1xuICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBsaW5lc09mZnNldCA9IF8uZmluZExhc3RJbmRleChsaW5lcywgbGluZSA9PiBsaW5lLmluZGV4T2YoJ1RhcmJhbGwgRGV0YWlscycpID49IDApO1xuICBjb25zdCB0YXJiYWxsSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGxpbmVzLnNsaWNlKGxpbmVzT2Zmc2V0KS5mb3JFYWNoKGxpbmUgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL25wbSBub3RpY2VcXHMrKFteOl0rKVs6XVxccyooLis/KVxccyokLy5leGVjKGxpbmUpO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGFyYmFsbEluZm8uc2V0KG1hdGNoWzFdLCBtYXRjaFsyXSk7XG4gIH0pO1xuICByZXR1cm4gdGFyYmFsbEluZm87XG59XG5cbmV4cG9ydCBjb25zdCB0ZXN0YWJsZSA9IHtwYXJzZU5wbVBhY2tPdXRwdXR9O1xuXG5mdW5jdGlvbiBkZWxldGVPbGRUYXIoZGVsZXRlRmlsZVJlZzogUmVnRXhwW10sIGtlZXBmaWxlczogc3RyaW5nW10pIHtcbiAgLy8gbG9nLndhcm4oZGVsZXRlRmlsZVJlZywga2VlcGZpbGVzKTtcbiAgY29uc3QgdGFyU2V0ID0gbmV3IFNldChrZWVwZmlsZXMpO1xuICBjb25zdCBkZWxldGVEb25lOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuXG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJiYWxsRGlyKSlcbiAgICBmc2V4dC5ta2RpcnBTeW5jKHRhcmJhbGxEaXIpO1xuICAvLyBUT0RPOiB3YWl0IGZvciB0aW1lb3V0XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmcy5yZWFkZGlyU3luYyh0YXJiYWxsRGlyKSkge1xuICAgIGlmICghdGFyU2V0LmhhcyhmaWxlKSAmJiBkZWxldGVGaWxlUmVnLnNvbWUocmVnID0+IHJlZy50ZXN0KGZpbGUpKSkge1xuICAgICAgbG9nLndhcm4oJ1JlbW92ZSAnICsgZmlsZSk7XG4gICAgICBkZWxldGVEb25lLnB1c2goZnMucHJvbWlzZXMudW5saW5rKFBhdGgucmVzb2x2ZSh0YXJiYWxsRGlyLCBmaWxlKSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZGVsZXRlRG9uZSk7XG59XG4iXX0=