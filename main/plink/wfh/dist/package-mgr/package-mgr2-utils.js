"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTsCompilerOpts = exports.createTsConfigForRepos = exports.createPackageInfo = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const misc_1 = require("../utils/misc");
function createPackageInfo(pkJsonFile, isInstalled = false) {
    const json = JSON.parse(node_fs_1.default.readFileSync(pkJsonFile, 'utf8'));
    return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}
exports.createPackageInfo = createPackageInfo;
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
function* createTsConfigForRepos(plinkPkgDir, isPlinkLinked, workspaceDir, repoDirs, plinkRootDir, srcPackages, spaceDependencies, extraPathMapping, include = ['**/*.ts']) {
    const srcRootDir = (0, misc_1.closestCommonParentDir)(repoDirs);
    // tsjson.include = [];
    const baseTsConfigFile = node_path_1.default.resolve(plinkPkgDir, 'wfh/tsconfig-base.json');
    const spaceDependedPkgs = [...spaceDependencies].map(pkgName => {
        const pkg = srcPackages.get(pkgName);
        if (pkg)
            return pkg;
        if (pkgName.startsWith('@wfh/')) {
            const jsonFile = node_path_1.default.resolve(plinkRootDir, workspaceDir, 'node_modules', pkgName, 'package.json');
            if (node_fs_1.default.existsSync(jsonFile))
                return createPackageInfo(jsonFile, true);
            else
                return null;
        }
        return null;
    }).filter((pkg) => pkg != null);
    for (const proj of repoDirs) {
        const tsjson = {
            extends: undefined,
            include,
            exclude: ['**/node_modules/**.*', '**/*.d.ts']
        };
        tsjson.extends = node_path_1.default.relative(proj, baseTsConfigFile);
        if (!node_path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
            tsjson.extends = './' + tsjson.extends;
        }
        tsjson.extends = tsjson.extends.replace(/\\/g, '/');
        const rootDir = node_path_1.default.relative(proj, srcRootDir).replace(/\\/g, '/') || '.';
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
        setTsCompilerOpts(proj, tsjson.compilerOptions, plinkRootDir, workspaceDir, srcPackages, spaceDependedPkgs, isPlinkLinked ? plinkPkgDir : null, {
            enableTypeRoots: true,
            realPackagePaths: true
        });
        yield [node_path_1.default.resolve(proj, 'tsconfig.json'), tsjson];
    }
}
exports.createTsConfigForRepos = createTsConfigForRepos;
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
exports.setTsCompilerOpts = setTsCompilerOpts;
function pathMappingForLinkedPkgs(baseUrlAbsPath, srcPackages, plinkSourcePkgDir) {
    const pathMapping = {};
    for (const { name, realPath, json } of srcPackages.values()) {
        if (name === '@wfh/plink') {
            continue;
        }
        const tsDirs = (0, misc_1.getTscConfigOfPkg)(json);
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
        // pathMapping[`${name}/${tsDirs.isomDir}/*`] = [`${realDir}/${tsDirs.isomDir}/*`];
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
function typeRootsInPackages(spaceDependedPkgs) {
    var _a, _b;
    const dirs = [];
    for (const pkg of spaceDependedPkgs) {
        const typeRoot = ((_a = pkg.json.plink) === null || _a === void 0 ? void 0 : _a.typeRoot) || ((_b = pkg.json.dr) === null || _b === void 0 ? void 0 : _b.typeRoot);
        if (typeRoot) {
            const dir = node_path_1.default.resolve(pkg.realPath, typeRoot);
            dirs.push(dir);
        }
    }
    return dirs;
}
//# sourceMappingURL=package-mgr2-utils.js.map