"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlinkPackageLookup = exports.createTsConfigFile = exports.createTsConfigForRepos = exports.getTscConfigOfPkg = exports.createPackageInfo = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const rx = tslib_1.__importStar(require("rxjs"));
const dir_tree_1 = require("../plink2/dir-tree");
function createPackageInfo(pkJsonFile, isInstalled = false) {
    const json = JSON.parse(node_fs_1.default.readFileSync(pkJsonFile, 'utf8'));
    return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}
exports.createPackageInfo = createPackageInfo;
function getTscConfigOfPkg(json) {
    // const globs: string[] | undefined = get(json, 'dr.ts.globs');
    const srcDir = lodash_1.default.get(json, 'dr.ts.src', lodash_1.default.get(json, 'plink.tsc.src', 'ts'));
    const isomDir = lodash_1.default.get(json, 'dr.ts.isom', lodash_1.default.get(json, 'plink.tsc.isom', 'isom'));
    const include = lodash_1.default.get(json, 'dr.ts.include', lodash_1.default.get(json, 'plink.tsc.include'));
    const files = lodash_1.default.get(json, 'plink.tsc.files');
    let destDir = lodash_1.default.get(json, 'dr.ts.dest', lodash_1.default.get(json, 'plink.tsc.dest', 'dist'));
    destDir = lodash_1.default.trim(lodash_1.default.trim(destDir, '\\'), '/');
    return {
        srcDir, destDir, isomDir, include, files
    };
}
exports.getTscConfigOfPkg = getTscConfigOfPkg;
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
function createPackageInfoWithJson(pkJsonFile, json, isInstalled = false) {
    const m = moduleNameReg.exec(json.name);
    const path = node_fs_1.default.realpathSync(node_path_1.default.dirname(pkJsonFile));
    const pkInfo = {
        shortName: m[2],
        name: json.name,
        scope: m[1],
        path,
        json,
        realPath: path,
        isInstalled
    };
    return pkInfo;
}
function* createTsConfigForRepos(plinkPkgDir, isPlinkLinked, workspaceDir, repoDirs, plinkRootDir, srcRootDir, srcPackages, typeRootPkgs, extraPathMapping, pathForInclude) {
    const baseTsConfigFile = node_path_1.default.resolve(plinkPkgDir, 'wfh/tsconfig-base.json');
    for (const proj of repoDirs) {
        yield [
            node_path_1.default.resolve(proj, 'tsconfig.json'), createTsConfigFile(proj, baseTsConfigFile, plinkPkgDir, isPlinkLinked, workspaceDir, plinkRootDir, srcPackages, srcRootDir, typeRootPkgs, extraPathMapping, pathForInclude)
        ];
    }
}
exports.createTsConfigForRepos = createTsConfigForRepos;
function createTsConfigFile(tsconfigBaseDir, extendTsConfigFile, plinkPkgDir, isPlinkLinked, workspaceDir, plinkRootDir, srcPackages, srcRootDir, typeRootPkgs, extraPathMapping, pathForInclude = []) {
    const tsjson = {
        extends: undefined,
        include: pathForInclude.flatMap(path => {
            const prefix = node_path_1.default.relative(tsconfigBaseDir, path).replaceAll(/\\/g, '/');
            return ['/**/*.ts', '/**/*.mts', '/**/*.cts'].map(postFix => prefix + postFix);
        }),
        exclude: ['**/node_modules/**.*', '**/*.d.ts']
    };
    if (extendTsConfigFile) {
        tsjson.extends = node_path_1.default.relative(tsconfigBaseDir, extendTsConfigFile);
        if (!node_path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
            tsjson.extends = './' + tsjson.extends;
        }
        tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    }
    const rootDir = node_path_1.default.relative(tsconfigBaseDir, srcRootDir).replace(/\\/g, '/') || '.';
    tsjson.compilerOptions = {
        rootDir,
        skipLibCheck: false,
        jsx: 'preserve',
        target: 'es2017',
        // module: 'ESNext', // There is a problem with "NodeNext" with Typescript 5.3.3 and coc-tsserver, the "log4js.Logger" type being exported from @wfh/plink can not be recoganized by consumer TS file
        // moduleResolution: 'node10', // Same as above, "bunder" or "NodeNext" have problem along with "module" setting with "NodeNext"
        strict: true,
        declaration: false, // Important: to avoid https://github.com/microsoft/TypeScript/issues/29808#issuecomment-487811832
        paths: Object.assign({}, extraPathMapping)
    };
    setTsCompilerOpts(tsconfigBaseDir, tsjson.compilerOptions, plinkRootDir, workspaceDir, srcPackages, typeRootPkgs, isPlinkLinked ? plinkPkgDir : null, {
        enableTypeRoots: true,
        realPackagePaths: true
    });
    return tsjson;
}
exports.createTsConfigFile = createTsConfigFile;
function setTsCompilerOpts(tsconfigDir, assigneeOptions, plinkRootDir, workspaceDir, srcPackages, spaceDependedPkgs, plinkSourcePkgDir, opts = { enableTypeRoots: false }) {
    /** for paths mapping "*" */
    let pathsDirs = [];
    if (opts.realPackagePaths) {
        if (assigneeOptions.paths == null) {
            assigneeOptions.paths = {};
        }
        Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(tsconfigDir, srcPackages, plinkSourcePkgDir !== null && plinkSourcePkgDir !== void 0 ? plinkSourcePkgDir : undefined));
    }
    const symlinksDir = node_path_1.default.resolve(workspaceDir, 'node_modules');
    pathsDirs.push(symlinksDir);
    if (plinkSourcePkgDir) {
        pathsDirs.push(node_path_1.default.join(plinkSourcePkgDir, 'node_modules'));
    }
    pathsDirs.push(node_path_1.default.join(plinkRootDir, 'node_modules'));
    if (opts.extraNodePath && opts.extraNodePath.length > 0) {
        pathsDirs.push(...opts.extraNodePath);
    }
    pathsDirs = lodash_1.default.uniq(pathsDirs);
    if (opts.noSymlinks && symlinksDir) {
        const idx = pathsDirs.indexOf(symlinksDir);
        if (idx >= 0) {
            pathsDirs.splice(idx, 1);
        }
    }
    if (assigneeOptions.paths == null)
        assigneeOptions.paths = {};
    appendTypeRoots(pathsDirs, tsconfigDir, spaceDependedPkgs, assigneeOptions, opts);
    return assigneeOptions;
}
function pathMappingForLinkedPkgs(baseUrlAbsPath, srcPackages, plinkSourcePkgDir) {
    const pathMapping = {};
    for (const { name, realPath, json } of srcPackages.values()) {
        if (name === '@wfh/plink') {
            continue;
        }
        const tsDirs = getTscConfigOfPkg(json);
        let realDir = node_path_1.default.relative(baseUrlAbsPath, realPath).replace(/\\/g, '/');
        const typeFile = json.types;
        const realDestDir = node_path_1.default.posix.join(realDir, tsDirs.destDir);
        if (!realDir.startsWith('.')) {
            realDir = './' + realDir;
        }
        if (typeFile) {
            if (node_path_1.default.posix.join(realDir, typeFile).startsWith(realDestDir + '/')) {
                // In case types file is inside compilation destination directory
                const relTypeFile = node_path_1.default.basename(node_path_1.default.posix.relative(tsDirs.destDir, typeFile), '.d.ts');
                let mapped = node_path_1.default.join(realDir, tsDirs.srcDir, relTypeFile).replace(/\\/g, '/');
                if (!mapped.startsWith('.'))
                    mapped = './' + mapped;
                pathMapping[name] = [mapped + '.ts', mapped + '.mts', mapped + '.cts'];
            }
            else {
                let mapped = typeFile ? node_path_1.default.join(realDir, typeFile).replace(/\\/g, '/') : realDir;
                if (!mapped.startsWith('.'))
                    mapped = './' + mapped;
                pathMapping[name] = [mapped];
            }
        }
        pathMapping[`${name}/${tsDirs.destDir}/*`.replace(/\/\//g, '/')] = [`${realDir}/${tsDirs.srcDir}/*`.replace(/\/\//g, '/')];
        pathMapping[name + '/*'] = [`${realDir}/*`];
    }
    if (plinkSourcePkgDir) {
        let drcpDir = node_path_1.default.relative(baseUrlAbsPath, plinkSourcePkgDir).replace(/\\/g, '/');
        if (!drcpDir.startsWith('.'))
            drcpDir = './' + drcpDir;
        pathMapping['@wfh/plink'] = [drcpDir + '/wfh/src/index.ts'];
        pathMapping['@wfh/plink/wfh/dist/*'] = [drcpDir + '/wfh/src/*'];
    }
    return pathMapping;
}
function appendTypeRoots(pathsDirs, tsconfigDir, spaceDependedPkgs, assigneeOptions, opts) {
    if (opts.noTypeRootsInPackages == null || !opts.noTypeRootsInPackages) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(
        // plink directory: wfh/types, it is a symlink at runtime, due to Plink uses preserve-symlinks to run commands
        node_path_1.default.relative(tsconfigDir, node_path_1.default.resolve(__dirname, '../../types')).replace(/\\/g, '/'), ...typeRootsInPackages(spaceDependedPkgs).map(dir => node_path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
    }
    if (opts.enableTypeRoots) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
            const relativeDir = node_path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/');
            return relativeDir + '/@types';
        }));
    }
    if (opts.extraTypeRoot) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(dir => node_path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
    }
    assigneeOptions.typeRoots = lodash_1.default.uniq(assigneeOptions.typeRoots);
    if (assigneeOptions.typeRoots != null && assigneeOptions.typeRoots.length === 0)
        delete assigneeOptions.typeRoots;
}
function typeRootsInPackages(packagesMightHaveTypeRoot) {
    var _a, _b;
    const dirs = [];
    for (const pkg of packagesMightHaveTypeRoot) {
        const typeRoot = ((_a = pkg.json.plink) === null || _a === void 0 ? void 0 : _a.typeRoot) || ((_b = pkg.json.dr) === null || _b === void 0 ? void 0 : _b.typeRoot);
        if (typeRoot) {
            const dir = node_path_1.default.resolve(pkg.realPath, typeRoot);
            dirs.push(dir);
        }
    }
    return dirs;
}
class PlinkPackageLookup {
    fromTsconfig(baseDir, json) {
        this.packagePathMap = new Map();
        this.dirMap = new dir_tree_1.DirTree();
        for (const [key, list] of Object.entries(json.compilerOptions.paths)) {
            const match = /^((?:@[^/]+\/)?[^/]+)\/\*/.exec(key);
            if (match) {
                const path = list[0];
                const relPath = /^.+(?!\/\*).(?=\/\*)/.exec(path);
                if (relPath) {
                    const pkgName = match[1];
                    this.packagePathMap.set(pkgName, node_path_1.default.resolve(baseDir, relPath[0]));
                    this.dirMap.putData(relPath[0], pkgName);
                }
            }
        }
        return this.packagePathMap;
    }
    fromService(service) {
        var _a;
        const activeSpaceKey = service.ot.getData().didSwitchSpace[0];
        if (activeSpaceKey == null)
            throw new Error('You need run command "switch" against any installation directory first');
        const spacePkgs = (_a = service.ot.getData().data_spacePkgMap[0]) === null || _a === void 0 ? void 0 : _a.get(activeSpaceKey);
        service.r('data_spacePkgMap -> util dirMap', rx.combineLatest([
            // If data_spacePkgMap doesn't have activeSpaceKey, dispatch "checkSpace" message
            spacePkgs != null ?
                rx.of(spacePkgs) :
                service.o.ft.checkSpace(activeSpaceKey).od(service.o.pt.didCheckSpace).pipe(rx.take(1), rx.mergeMap(() => service.ot.l.data_spacePkgMap), rx.map(([, data]) => data.get(activeSpaceKey)), rx.filter(v => v != null)),
            service.ot.l.data_allPackages.pipe(rx.take(1))
        ]).pipe(rx.map(([spacePkgs, [, allPackages]]) => {
            var _a;
            this.packagePathMap = new Map();
            this.dirMap = new dir_tree_1.DirTree();
            for (const pkgName of spacePkgs) {
                const pkgPath = (_a = allPackages.get(pkgName)) === null || _a === void 0 ? void 0 : _a.realPath;
                if (pkgPath) {
                    this.packagePathMap.set(pkgName, pkgPath);
                    this.dirMap.putData(pkgPath, pkgName);
                }
            }
            console.log(this.dirMap.traverse());
        })));
    }
}
exports.PlinkPackageLookup = PlinkPackageLookup;
//# sourceMappingURL=package-mgr2-utils.js.map