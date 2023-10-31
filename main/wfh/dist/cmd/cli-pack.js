"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const _ = __importStar(require("lodash"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const log4js_1 = __importDefault(require("log4js"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const package_mgr_1 = require("../package-mgr");
const config_1 = __importDefault(require("../config"));
const process_utils_1 = require("../process-utils");
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
const promise_queque_1 = require("../../../packages/thread-promise-pool/dist/promise-queque");
const misc_1 = require("../utils/misc");
require("../editor-helper");
const store_1 = require("../store");
const utils_1 = require("./utils");
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
        const done = rx.lastValueFrom(rx.from(packageDirs).pipe(op.mergeMap(packageDir => rx.defer(() => npmPack(packageDir, tarballDir)).pipe(op.retry(2)), 4), op.reduce((all, item) => {
            all.push(item);
            return all;
        }, [])));
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
    for (const workspace of _.uniq([...(0, package_mgr_1.getState)().workspaces.keys(), '']).map(dir => Path.resolve((0, config_1.default)().rootPath, dir))) {
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
//# sourceMappingURL=cli-pack.js.map