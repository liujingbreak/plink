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
exports.tsc = void 0;
// tslint:disable: max-line-length
const chalk_1 = __importDefault(require("chalk"));
const packageUtils = __importStar(require("./package-utils"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const path_1 = __importStar(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const misc_1 = require("./utils/misc");
const config_1 = __importDefault(require("./config"));
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_mgr_1 = require("./package-mgr");
const log4js_1 = __importDefault(require("log4js"));
const glob_1 = __importDefault(require("glob"));
const ts_cmd_util_1 = require("./ts-cmd-util");
const { symlinkDirName } = misc_1.plinkEnv;
const log = log4js_1.default.getLogger('plink.ts-cmd');
const root = config_1.default().rootPath;
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv /*, onCompiled?: (emitted: EmitList) => void*/) {
    const compGlobs = [];
    const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
    const baseTsconfigFile = require.resolve('../tsconfig-base.json');
    const baseTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
    if (baseTsconfig.error) {
        console.error(baseTsconfig.error);
        throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile);
    }
    let baseCompilerOptions = baseTsconfig.config.compilerOptions;
    if (argv.jsx) {
        const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
        const tsxTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile2, fs.readFileSync(baseTsconfigFile2, 'utf8'));
        if (tsxTsconfig.error) {
            console.error(tsxTsconfig.error);
            throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile2);
        }
        baseCompilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), tsxTsconfig.config.compilerOptions);
    }
    // const promCompile = Promise.resolve( [] as EmitList);
    const packageDirTree = new dir_tree_1.DirTree();
    const commonRootDir = misc_1.plinkEnv.workDir;
    let countPkg = 0;
    if (argv.package && argv.package.length > 0)
        packageUtils.findAllPackages(argv.package, onComponent, 'src');
    else if (argv.project && argv.project.length > 0) {
        packageUtils.findAllPackages(onComponent, 'src', argv.project);
    }
    else {
        for (const pkg of packageUtils.packages4Workspace(misc_1.plinkEnv.workDir, false)) {
            onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath);
        }
    }
    for (const info of compDirInfo.values()) {
        const treePath = path_1.relative(commonRootDir, info.symlinkDir);
        log.debug('treePath', treePath);
        packageDirTree.putData(treePath, info);
    }
    if (countPkg === 0) {
        throw new Error('No available source package found in current workspace');
    }
    // const commonRootDir = closestCommonParentDir(
    //   Array.from(getState().project2Packages.keys())
    //   .map(relPath => resolve(root, relPath)));
    const destDir = commonRootDir.replace(/\\/g, '/');
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { 
        // typescript: require('typescript'),
        // Compiler options
        importHelpers: false, declaration: true, 
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: destDir, rootDir: destDir, skipLibCheck: true, inlineSourceMap: argv.sourceMap === 'inline', sourceMap: argv.sourceMap !== 'inline', inlineSources: argv.sourceMap === 'inline', emitDeclarationOnly: argv.ed });
    setupCompilerOptionsWithPackages(compilerOptions, argv.mergeTsconfig, argv.pathsJsons);
    log.info('typescript compilerOptions:', compilerOptions);
    // const tsProject = gulpTs.createProject({...compilerOptions, typescript: require('typescript')});
    /** set compGlobs */
    function onComponent(name, _packagePath, _parsedName, json, realPath) {
        countPkg++;
        const tscCfg = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
            argv.overridePackgeDirs[name] : misc_1.getTscConfigOfPkg(json);
        // For workaround https://github.com/microsoft/TypeScript/issues/37960
        // Use a symlink path instead of a real path, so that Typescript compiler will not
        // recognize them as from somewhere with "node_modules", the symlink must be reside
        // in directory which does not contain "node_modules" as part of absolute path.
        const symlinkDir = path_1.resolve(misc_1.plinkEnv.workDir, symlinkDirName, name);
        compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: realPath, symlinkDir }));
        // if (tscCfg.globs) {
        //   compGlobs.push(...tscCfg.globs.map(file => resolve(symlinkDir, file).replace(/\\/g, '/')));
        //   return;
        // }
        const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
            if (srcDir == null)
                return false;
            try {
                return fs.statSync(path_1.join(symlinkDir, srcDir)).isDirectory();
            }
            catch (e) {
                return false;
            }
        });
        if (srcDirs.length === 0) {
            if (!fs.existsSync(symlinkDir)) {
                log.error(`There is no existing directory ${chalk_1.default.red(symlinkDir)},` +
                    ` it is possible that package ${name} is yet not added to current worktree space's package.json file,` +
                    ' current worktree space is not synced yet, try "sync"/"init" command please');
            }
            else {
                log.error(`There is no existing ts source directory found for package ${chalk_1.default.red(name)}:` +
                    ` ${[tscCfg.srcDir, tscCfg.isomDir].filter(item => item != null)}`);
            }
        }
        if (tscCfg.include) {
            tscCfg.include = [].concat(tscCfg.include);
        }
        if (tscCfg.include && tscCfg.include.length > 0) {
            compGlobs.push(...tscCfg.include.map(pattern => path_1.resolve(symlinkDir, pattern).replace(/\\/g, '/')));
        }
        else {
            srcDirs.forEach(srcDir => {
                const relPath = path_1.resolve(symlinkDir, srcDir).replace(/\\/g, '/');
                compGlobs.push(relPath + '/**/*.ts');
                if (argv.jsx) {
                    compGlobs.push(relPath + '/**/*.tsx');
                }
            });
        }
    }
    if (argv.watch) {
        log.info('Watch mode');
        watch(compGlobs, compilerOptions, commonRootDir, packageDirTree);
        return [];
        // watch(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed, argv.jsx, onCompiled);
    }
    else {
        const emitted = compile(compGlobs, compilerOptions, commonRootDir, packageDirTree);
        if (process.send)
            process.send('plink-tsc compiled');
        return emitted;
        // promCompile = compile(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed);
    }
}
exports.tsc = tsc;
const formatHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
    getNewLine: () => typescript_1.default.sys.newLine
};
function watch(globPatterns, jsonCompilerOpt, commonRootDir, packageDirTree) {
    const rootFiles = _.flatten(globPatterns.map(pattern => glob_1.default.sync(pattern).filter(file => !file.endsWith('.d.ts'))));
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree);
    }
    const programHost = typescript_1.default.createWatchCompilerHost(rootFiles, compilerOptions, typescript_1.default.sys, typescript_1.default.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, reportWatchStatusChanged);
    const origCreateProgram = programHost.createProgram;
    programHost.createProgram = function (rootNames, options, host) {
        if (host && host._overrided == null) {
            overrideCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
        }
        return origCreateProgram.apply(this, arguments);
    };
    typescript_1.default.createWatchProgram(programHost);
}
function compile(globPatterns, jsonCompilerOpt, commonRootDir, packageDirTree) {
    const rootFiles = _.flatten(globPatterns.map(pattern => glob_1.default.sync(pattern, { cwd: misc_1.plinkEnv.workDir }).filter(file => !file.endsWith('.d.ts'))));
    log.debug('rootFiles:\n', rootFiles);
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    const host = typescript_1.default.createCompilerHost(compilerOptions);
    const emitted = overrideCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
    const program = typescript_1.default.createProgram(rootFiles, compilerOptions, host);
    const emitResult = program.emit();
    const allDiagnostics = typescript_1.default.getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree);
    }
    allDiagnostics.forEach(diagnostic => {
        _reportDiagnostic(diagnostic);
    });
    if (emitResult.emitSkipped) {
        throw new Error('Compile failed');
    }
    return emitted;
}
function overrideCompilerHost(host, commonRootDir, packageDirTree, co) {
    const emittedList = [];
    // It seems to not able to write file through symlink in Windows
    // const _writeFile = host.writeFile;
    const writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
        const destFile = realPathOf(fileName, commonRootDir, packageDirTree);
        if (destFile == null) {
            log.debug('skip', fileName);
            return;
        }
        emittedList.push(destFile);
        log.info('write file', destFile);
        // Typescript's writeFile() function performs weird with symlinks under watch mode in Windows:
        // Every time a ts file is changed, it triggers the symlink being compiled and to be written which is
        // as expected by me,
        // but late on it triggers the same real file also being written immediately, this is not what I expect,
        // and it does not actually write out any changes to final JS file.
        // So I decide to use original Node.js file system API
        fs.mkdirpSync(path_1.default.dirname(destFile));
        fs.writeFileSync(destFile, data);
        // It seems Typescript compiler always uses slash instead of back slash in file path, even in Windows
        // return _writeFile.call(this, destFile.replace(/\\/g, '/'), ...Array.prototype.slice.call(arguments, 1));
    };
    host.writeFile = writeFile;
    const _getSourceFile = host.getSourceFile;
    const getSourceFile = function (fileName) {
        // console.log('getSourceFile', fileName);
        return _getSourceFile.apply(this, arguments);
    };
    host.getSourceFile = getSourceFile;
    // const _resolveModuleNames = host.resolveModuleNames;
    // host.resolveModuleNames = function(moduleNames, containingFile, reusedNames, redirectedRef, opt) {
    //   let result: ReturnType<NonNullable<typeof _resolveModuleNames>>;
    //   if (_resolveModuleNames) {
    //     result = _resolveModuleNames.apply(this, arguments) as ReturnType<typeof _resolveModuleNames>;
    //   } else {
    //     result = moduleNames.map(moduleName => {
    //       const resolved = ts.resolveModuleName(moduleName, containingFile, co, host,  ts.createModuleResolutionCache(
    //         ts.sys.getCurrentDirectory(), path => path, co
    //       ));
    //       return resolved.resolvedModule;
    //     });
    //   }
    //   return result;
    // };
    // (host as any)._overrided = true;
    return emittedList;
}
function reportDiagnostic(diagnostic, commonRootDir, packageDirTree) {
    let fileInfo = '';
    if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
        fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
    }
    console.error(chalk_1.default.red(`Error ${diagnostic.code} ${fileInfo} :`), typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()));
}
function reportWatchStatusChanged(diagnostic) {
    console.info(chalk_1.default.cyan(typescript_1.default.formatDiagnostic(diagnostic, formatHost)));
}
function setupCompilerOptionsWithPackages(compilerOptions, mergeFromTsconfig, pathsJsons) {
    const cwd = misc_1.plinkEnv.workDir;
    let wsKey = package_mgr_1.workspaceKey(cwd);
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error(`Current directory "${cwd}" is not a work space`);
    }
    if (mergeFromTsconfig) {
        ts_cmd_util_1.mergeBaseUrlAndPaths(typescript_1.default, mergeFromTsconfig, cwd, compilerOptions);
    }
    package_list_helper_1.setTsCompilerOptForNodePath(cwd, './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
    });
    if (pathsJsons && pathsJsons.length > 0) {
        compilerOptions.paths = pathsJsons.reduce((pathMap, jsonStr) => {
            return Object.assign(Object.assign({}, pathMap), JSON.parse(jsonStr));
        }, compilerOptions.paths);
    }
}
/**
 * Return real path of targeting file, return null if targeting file is not in our compiliation scope
 * @param fileName
 * @param commonRootDir
 * @param packageDirTree
 */
function realPathOf(fileName, commonRootDir, packageDirTree, isSrcFile = false) {
    const treePath = path_1.relative(commonRootDir, fileName);
    const _originPath = fileName; // absolute path
    const foundPkgInfo = packageDirTree.getAllData(treePath).pop();
    if (foundPkgInfo == null) {
        // this file is not part of source package.
        // log.info('Not part of entry files', fileName);
        return null;
    }
    const { srcDir, destDir, pkgDir, isomDir, symlinkDir } = foundPkgInfo;
    const pathWithinPkg = path_1.relative(symlinkDir, _originPath);
    if (srcDir === '.' || srcDir.length === 0) {
        fileName = path_1.join(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg);
    }
    else if (pathWithinPkg.startsWith(srcDir + path_1.sep)) {
        fileName = path_1.join(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg.slice(srcDir.length + 1));
    }
    else if (isomDir && pathWithinPkg.startsWith(isomDir + path_1.sep)) {
        fileName = path_1.join(pkgDir, isomDir, pathWithinPkg.slice(isomDir.length + 1));
    }
    return fileName;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNEI7QUFDNUIsdUNBQXdFO0FBRXhFLHNEQUE4QjtBQUM5QiwyRUFBMEg7QUFDMUgsNkRBQXVEO0FBQ3ZELCtDQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtDQUFtRDtBQUluRCxNQUFNLEVBQUMsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sSUFBSSxHQUFHLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUM7QUFxQi9COzs7Ozs7R0FNRztBQUNILFNBQWdCLEdBQUcsQ0FBQyxJQUFpQixDQUFBLDhDQUE4QztJQUNqRixNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsTUFBTSxXQUFXLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFDbEgsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDbEUsTUFBTSxZQUFZLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDL0csSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztLQUNqRTtJQUVELElBQUksbUJBQW1CLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7SUFFOUQsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ1osTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbEUsTUFBTSxXQUFXLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEgsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztTQUNsRTtRQUNELG1CQUFtQixtQ0FBTyxtQkFBbUIsR0FBSyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0tBQ3ZGO0lBRUQsd0RBQXdEO0lBQ3hELE1BQU0sY0FBYyxHQUFHLElBQUksa0JBQU8sRUFBa0IsQ0FBQztJQUNyRCxNQUFNLGFBQWEsR0FBRyxlQUFRLENBQUMsT0FBTyxDQUFDO0lBRXZDLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUN6QyxZQUFZLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDaEQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNoRTtTQUFNO1FBQ0wsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsa0JBQWtCLENBQUMsZUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRTtZQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMvRDtLQUNGO0lBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDdkMsTUFBTSxRQUFRLEdBQUcsZUFBUSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEM7SUFHRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsZ0RBQWdEO0lBQ2hELG1EQUFtRDtJQUNuRCw4Q0FBOEM7SUFFOUMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEQsTUFBTSxlQUFlLG1DQUNoQixtQkFBbUI7UUFDdEIscUNBQXFDO1FBQ3JDLG1CQUFtQjtRQUNuQixhQUFhLEVBQUUsS0FBSyxFQUNwQixXQUFXLEVBQUUsSUFBSTtRQUNqQjs7O1dBR0c7UUFDSCxNQUFNLEVBQUUsT0FBTyxFQUNmLE9BQU8sRUFBRSxPQUFPLEVBQ2hCLFlBQVksRUFBRSxJQUFJLEVBQ2xCLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFDNUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUN0QyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQzFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxFQUFFLEdBRTdCLENBQUM7SUFDRixnQ0FBZ0MsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFdkYsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN6RCxtR0FBbUc7SUFFbkcsb0JBQW9CO0lBQ3BCLFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxZQUFvQixFQUFFLFdBQWdCLEVBQUUsSUFBUyxFQUFFLFFBQWdCO1FBQ3BHLFFBQVEsRUFBRSxDQUFDO1FBQ1gsTUFBTSxNQUFNLEdBQWtCLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUQsc0VBQXNFO1FBQ3RFLGtGQUFrRjtRQUNsRixtRkFBbUY7UUFDbkYsK0VBQStFO1FBQy9FLE1BQU0sVUFBVSxHQUFHLGNBQU8sQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0NBQU0sTUFBTSxLQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxJQUFFLENBQUM7UUFFakUsc0JBQXNCO1FBQ3RCLGdHQUFnRztRQUNoRyxZQUFZO1FBQ1osSUFBSTtRQUVKLE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzlELElBQUksTUFBTSxJQUFJLElBQUk7Z0JBQ2hCLE9BQU8sS0FBSyxDQUFDO1lBQ2YsSUFBSTtnQkFDRixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQzVEO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTyxLQUFLLENBQUM7YUFDZDtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsZUFBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRztvQkFDcEUsZ0NBQWdDLElBQUksa0VBQWtFO29CQUN0Ryw2RUFBNkUsQ0FBQyxDQUFDO2FBQ2hGO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsOERBQThELGVBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUc7b0JBQ3hGLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZFO1NBQ0Y7UUFFRCxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDbEIsTUFBTSxDQUFDLE9BQU8sR0FBSSxFQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUMxRDtRQUNELElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDL0MsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFJLE1BQU0sQ0FBQyxPQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEg7YUFBTTtZQUNMLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDakUsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDLENBQUM7Z0JBQ3JDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDWixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsQ0FBQztpQkFDdkM7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkIsS0FBSyxDQUFDLFNBQVMsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sRUFBRSxDQUFDO1FBQ1YsNkZBQTZGO0tBQzlGO1NBQU07UUFDTCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkYsSUFBSSxPQUFPLENBQUMsSUFBSTtZQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNyQyxPQUFPLE9BQU8sQ0FBQztRQUNmLHVGQUF1RjtLQUN4RjtBQUNILENBQUM7QUE3SUQsa0JBNklDO0FBRUQsTUFBTSxVQUFVLEdBQTZCO0lBQzNDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSTtJQUNsQyxtQkFBbUIsRUFBRSxvQkFBRSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7SUFDL0MsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLG9CQUFFLENBQUMsR0FBRyxDQUFDLE9BQU87Q0FDakMsQ0FBQztBQUVGLFNBQVMsS0FBSyxDQUFDLFlBQXNCLEVBQUUsZUFBb0IsRUFBRSxhQUFxQixFQUFFLGNBQXVDO0lBQ3pILE1BQU0sU0FBUyxHQUFhLENBQUMsQ0FBQyxPQUFPLENBQ25DLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQ3hGLENBQUM7SUFDRixNQUFNLGVBQWUsR0FBRyxvQkFBRSxDQUFDLDBCQUEwQixDQUFDLEVBQUMsZUFBZSxFQUFFLGVBQWUsRUFBQyxFQUFFLG9CQUFFLENBQUMsR0FBRyxFQUM5RixlQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQ3BDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFFdEMsU0FBUyxpQkFBaUIsQ0FBQyxVQUF5QjtRQUNsRCxPQUFPLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUNELE1BQU0sV0FBVyxHQUFHLG9CQUFFLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxvQkFBRSxDQUFDLEdBQUcsRUFBRSxvQkFBRSxDQUFDLDhDQUE4QyxFQUNsSSxpQkFBaUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBRS9DLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQztJQUNwRCxXQUFXLENBQUMsYUFBYSxHQUFHLFVBQVMsU0FBd0MsRUFBRSxPQUFvQyxFQUNqSCxJQUFzQjtRQUN0QixJQUFJLElBQUksSUFBSyxJQUFZLENBQUMsVUFBVSxJQUFJLElBQUksRUFBRTtZQUM1QyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztTQUM1RTtRQUNELE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUM7SUFDRixvQkFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxZQUFzQixFQUFFLGVBQW9CLEVBQUUsYUFBcUIsRUFBRSxjQUF1QztJQUMzSCxNQUFNLFNBQVMsR0FBYSxDQUFDLENBQUMsT0FBTyxDQUNuQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsZUFBUSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FDakgsQ0FBQztJQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sZUFBZSxHQUFHLG9CQUFFLENBQUMsMEJBQTBCLENBQUMsRUFBQyxlQUFlLEVBQUUsZUFBZSxFQUFDLEVBQUUsb0JBQUUsQ0FBQyxHQUFHLEVBQzlGLGVBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDcEMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUN0QyxNQUFNLElBQUksR0FBRyxvQkFBRSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQzNGLE1BQU0sT0FBTyxHQUFHLG9CQUFFLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2xDLE1BQU0sY0FBYyxHQUFHLG9CQUFFLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDO1NBQ3JELE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFbEMsU0FBUyxpQkFBaUIsQ0FBQyxVQUF5QjtRQUNsRCxPQUFPLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUNELGNBQWMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDbEMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLFVBQVUsQ0FBQyxXQUFXLEVBQUU7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ25DO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBcUIsRUFBRSxhQUFxQixFQUFFLGNBQXVDLEVBQUUsRUFBc0I7SUFDekksTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO0lBQ2pDLGdFQUFnRTtJQUNoRSxxQ0FBcUM7SUFDckMsTUFBTSxTQUFTLEdBQXlCLFVBQVMsUUFBUSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsV0FBVztRQUN2RyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNyRSxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDcEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUIsT0FBTztTQUNSO1FBQ0QsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqQyw4RkFBOEY7UUFDOUYscUdBQXFHO1FBQ3JHLHFCQUFxQjtRQUNyQix3R0FBd0c7UUFDeEcsbUVBQW1FO1FBQ25FLHNEQUFzRDtRQUN0RCxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN0QyxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxxR0FBcUc7UUFDckcsMkdBQTJHO0lBQzdHLENBQUMsQ0FBQztJQUNGLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO0lBRTNCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDMUMsTUFBTSxhQUFhLEdBQTBCLFVBQVMsUUFBUTtRQUM1RCwwQ0FBMEM7UUFDMUMsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUM7SUFDRixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztJQUVuQyx1REFBdUQ7SUFFdkQscUdBQXFHO0lBQ3JHLHFFQUFxRTtJQUNyRSwrQkFBK0I7SUFDL0IscUdBQXFHO0lBQ3JHLGFBQWE7SUFDYiwrQ0FBK0M7SUFDL0MscUhBQXFIO0lBQ3JILHlEQUF5RDtJQUN6RCxZQUFZO0lBQ1osd0NBQXdDO0lBQ3hDLFVBQVU7SUFDVixNQUFNO0lBQ04sbUJBQW1CO0lBQ25CLEtBQUs7SUFDTCxtQ0FBbUM7SUFDbkMsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsVUFBeUIsRUFBRSxhQUFxQixFQUFFLGNBQXVDO0lBQ2pILElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNsQixJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUU7UUFDbkIsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxLQUFNLENBQUMsQ0FBQztRQUM3RixNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2SCxRQUFRLEdBQUcsR0FBRyxRQUFRLFdBQVcsSUFBSSxHQUFHLENBQUMsYUFBYSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7S0FDdkU7SUFDRCxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxVQUFVLENBQUMsSUFBSSxJQUFJLFFBQVEsSUFBSSxDQUFDLEVBQUUsb0JBQUUsQ0FBQyw0QkFBNEIsQ0FBRSxVQUFVLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDeEosQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsVUFBeUI7SUFDekQsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLG9CQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RSxDQUFDO0FBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxlQUF3QyxFQUFFLGlCQUEwQixFQUFFLFVBQXFCO0lBQ25JLE1BQU0sR0FBRyxHQUFHLGVBQVEsQ0FBQyxPQUFPLENBQUM7SUFDN0IsSUFBSSxLQUFLLEdBQThCLDBCQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekQsSUFBSSxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQyxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztJQUNuQyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7UUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FBQyxDQUFDO0tBQ25FO0lBRUQsSUFBSSxpQkFBaUIsRUFBRTtRQUNyQixrQ0FBb0IsQ0FBQyxvQkFBRSxFQUFFLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQztLQUNuRTtJQUNELGlEQUEyQixDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFO1FBQ3RELGVBQWUsRUFBRSxJQUFJO1FBQ3JCLFlBQVksRUFBRSxjQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztLQUNuQyxDQUFDLENBQUM7SUFFSCxJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN2QyxlQUFlLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDN0QsdUNBQVcsT0FBTyxHQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDOUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUMzQjtBQUNILENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsVUFBVSxDQUFDLFFBQWdCLEVBQUUsYUFBcUIsRUFBRSxjQUF1QyxFQUFFLFNBQVMsR0FBRyxLQUFLO0lBQ3JILE1BQU0sUUFBUSxHQUFHLGVBQVEsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbkQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUMsZ0JBQWdCO0lBQzlDLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDL0QsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO1FBQ3hCLDJDQUEyQztRQUMzQyxpREFBaUQ7UUFDakQsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUNELE1BQU0sRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFDLEdBQUcsWUFBWSxDQUFDO0lBRXBFLE1BQU0sYUFBYSxHQUFHLGVBQVEsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFeEQsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3pDLFFBQVEsR0FBRyxXQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7S0FDdEU7U0FBTSxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFVBQUcsQ0FBQyxFQUFFO1FBQ2pELFFBQVEsR0FBRyxXQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsV0FBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0U7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGgsIHtyZXNvbHZlLCBqb2luLCByZWxhdGl2ZSwgc2VwfSBmcm9tICdwYXRoJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2csIFBhY2thZ2VUc0RpcnMsIHBsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHttZXJnZUJhc2VVcmxBbmRQYXRoc30gZnJvbSAnLi90cy1jbWQtdXRpbCc7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5leHBvcnQge1JlcXVpcmVkQ29tcGlsZXJPcHRpb25zfTtcblxuY29uc3Qge3N5bWxpbmtEaXJOYW1lfSA9IHBsaW5rRW52O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsudHMtY21kJyk7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNjQ21kUGFyYW0ge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgLyoqIG1lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUgKi9cbiAgbWVyZ2VUc2NvbmZpZz86IHN0cmluZztcbiAgcGF0aHNKc29ucz86IHN0cmluZ1tdO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xuICBvdmVycmlkZVBhY2tnZURpcnM/OiB7W3BrZ05hbWU6IHN0cmluZ106IFBhY2thZ2VUc0RpcnN9O1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZURpckluZm8gZXh0ZW5kcyBQYWNrYWdlVHNEaXJzIHtcbiAgcGtnRGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzYyhhcmd2OiBUc2NDbWRQYXJhbS8qLCBvbkNvbXBpbGVkPzogKGVtaXR0ZWQ6IEVtaXRMaXN0KSA9PiB2b2lkKi8pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIFBhY2thZ2VEaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgaWYgKGJhc2VUc2NvbmZpZy5lcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYmFzZVRzY29uZmlnLmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZSk7XG4gIH1cblxuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zO1xuXG4gIGlmIChhcmd2LmpzeCkge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUyID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpO1xuICAgIGNvbnN0IHRzeFRzY29uZmlnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlMiwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUyLCAndXRmOCcpKTtcbiAgICBpZiAodHN4VHNjb25maWcuZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodHN4VHNjb25maWcuZXJyb3IpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgdHNjb25maWcgZmlsZTogJyArIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICB9XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfVxuXG4gIC8vIGNvbnN0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZURpckluZm8+KCk7XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwbGlua0Vudi53b3JrRGlyO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhhcmd2LnBhY2thZ2UsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnLCBhcmd2LnByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpciwgZmFsc2UpKSB7XG4gICAgICBvbkNvbXBvbmVudChwa2cubmFtZSwgcGtnLnBhdGgsIG51bGwsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uc3ltbGlua0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc291cmNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuICAvLyBjb25zdCBjb21tb25Sb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihcbiAgLy8gICBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpXG4gIC8vICAgLm1hcChyZWxQYXRoID0+IHJlc29sdmUocm9vdCwgcmVsUGF0aCkpKTtcblxuICBjb25zdCBkZXN0RGlyID0gY29tbW9uUm9vdERpci5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICAvLyB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogZGVzdERpcixcbiAgICByb290RGlyOiBkZXN0RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBzb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwICE9PSAnaW5saW5lJyxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zLCBhcmd2Lm1lcmdlVHNjb25maWcsIGFyZ3YucGF0aHNKc29ucyk7XG5cbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIC8vIGNvbnN0IHRzUHJvamVjdCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KHsuLi5jb21waWxlck9wdGlvbnMsIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKX0pO1xuXG4gIC8qKiBzZXQgY29tcEdsb2JzICovXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgX3BhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgY29uc3QgdHNjQ2ZnOiBQYWNrYWdlVHNEaXJzID0gYXJndi5vdmVycmlkZVBhY2tnZURpcnMgJiYgXy5oYXMoYXJndi5vdmVycmlkZVBhY2tnZURpcnMsIG5hbWUpID9cbiAgICAgIGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzW25hbWVdIDogZ2V0VHNjQ29uZmlnT2ZQa2coanNvbik7XG4gICAgLy8gRm9yIHdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zNzk2MFxuICAgIC8vIFVzZSBhIHN5bWxpbmsgcGF0aCBpbnN0ZWFkIG9mIGEgcmVhbCBwYXRoLCBzbyB0aGF0IFR5cGVzY3JpcHQgY29tcGlsZXIgd2lsbCBub3RcbiAgICAvLyByZWNvZ25pemUgdGhlbSBhcyBmcm9tIHNvbWV3aGVyZSB3aXRoIFwibm9kZV9tb2R1bGVzXCIsIHRoZSBzeW1saW5rIG11c3QgYmUgcmVzaWRlXG4gICAgLy8gaW4gZGlyZWN0b3J5IHdoaWNoIGRvZXMgbm90IGNvbnRhaW4gXCJub2RlX21vZHVsZXNcIiBhcyBwYXJ0IG9mIGFic29sdXRlIHBhdGguXG4gICAgY29uc3Qgc3ltbGlua0RpciA9IHJlc29sdmUocGxpbmtFbnYud29ya0Rpciwgc3ltbGlua0Rpck5hbWUsIG5hbWUpO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7Li4udHNjQ2ZnLCBwa2dEaXI6IHJlYWxQYXRoLCBzeW1saW5rRGlyfSk7XG5cbiAgICAvLyBpZiAodHNjQ2ZnLmdsb2JzKSB7XG4gICAgLy8gICBjb21wR2xvYnMucHVzaCguLi50c2NDZmcuZ2xvYnMubWFwKGZpbGUgPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpKTtcbiAgICAvLyAgIHJldHVybjtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBzcmNEaXJzID0gW3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIGlmIChzcmNEaXIgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGpvaW4oc3ltbGlua0Rpciwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHNyY0RpcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc3ltbGlua0RpcikpIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyBkaXJlY3RvcnkgJHtjaGFsay5yZWQoc3ltbGlua0Rpcil9LGAgK1xuICAgICAgICBgIGl0IGlzIHBvc3NpYmxlIHRoYXQgcGFja2FnZSAke25hbWV9IGlzIHlldCBub3QgYWRkZWQgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZSdzIHBhY2thZ2UuanNvbiBmaWxlLGAgK1xuICAgICAgICAnIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UgaXMgbm90IHN5bmNlZCB5ZXQsIHRyeSBcInN5bmNcIi9cImluaXRcIiBjb21tYW5kIHBsZWFzZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyB0cyBzb3VyY2UgZGlyZWN0b3J5IGZvdW5kIGZvciBwYWNrYWdlICR7Y2hhbGsucmVkKG5hbWUpfTpgICtcbiAgICAgICAgICBgICR7W3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgdHNjQ2ZnLmluY2x1ZGUgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuaW5jbHVkZSk7XG4gICAgfVxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSAmJiB0c2NDZmcuaW5jbHVkZS5sZW5ndGggPiAwKSB7XG4gICAgICBjb21wR2xvYnMucHVzaCguLi4odHNjQ2ZnLmluY2x1ZGUgYXMgc3RyaW5nW10pLm1hcChwYXR0ZXJuID0+IHJlc29sdmUoc3ltbGlua0RpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShzeW1saW5rRGlyLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIHdhdGNoKGNvbXBHbG9icywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgcmV0dXJuIFtdO1xuICAgIC8vIHdhdGNoKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCwgYXJndi5qc3gsIG9uQ29tcGlsZWQpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVtaXR0ZWQgPSBjb21waWxlKGNvbXBHbG9icywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgLy8gcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCk7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogcGF0aCA9PiBwYXRoLFxuICBnZXRDdXJyZW50RGlyZWN0b3J5OiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgZ2V0TmV3TGluZTogKCkgPT4gdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKGdsb2JQYXR0ZXJuczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPikge1xuICBjb25zdCByb290RmlsZXM6IHN0cmluZ1tdID0gXy5mbGF0dGVuKFxuICAgIGdsb2JQYXR0ZXJucy5tYXAocGF0dGVybiA9PiBnbG9iLnN5bmMocGF0dGVybikuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpKVxuICApO1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcGxpbmtFbnYud29ya0Rpci5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgfVxuICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sXG4gICAgX3JlcG9ydERpYWdub3N0aWMsIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZCk7XG5cbiAgY29uc3Qgb3JpZ0NyZWF0ZVByb2dyYW0gPSBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtO1xuICBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtID0gZnVuY3Rpb24ocm9vdE5hbWVzOiByZWFkb25seSBzdHJpbmdbXSB8IHVuZGVmaW5lZCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIGhvc3Q/OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgb3ZlcnJpZGVDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiBvcmlnQ3JlYXRlUHJvZ3JhbS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuICB0cy5jcmVhdGVXYXRjaFByb2dyYW0ocHJvZ3JhbUhvc3QpO1xufVxuXG5mdW5jdGlvbiBjb21waWxlKGdsb2JQYXR0ZXJuczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPikge1xuICBjb25zdCByb290RmlsZXM6IHN0cmluZ1tdID0gXy5mbGF0dGVuKFxuICAgIGdsb2JQYXR0ZXJucy5tYXAocGF0dGVybiA9PiBnbG9iLnN5bmMocGF0dGVybiwge2N3ZDogcGxpbmtFbnYud29ya0Rpcn0pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKSlcbiAgKTtcbiAgbG9nLmRlYnVnKCdyb290RmlsZXM6XFxuJywgcm9vdEZpbGVzKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG4gIGNvbnN0IGVtaXR0ZWQgPSBvdmVycmlkZUNvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zKTtcbiAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGhvc3QpO1xuICBjb25zdCBlbWl0UmVzdWx0ID0gcHJvZ3JhbS5lbWl0KCk7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdHMuZ2V0UHJlRW1pdERpYWdub3N0aWNzKHByb2dyYW0pXG4gICAgLmNvbmNhdChlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICB9XG4gIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYyk7XG4gIH0pO1xuICBpZiAoZW1pdFJlc3VsdC5lbWl0U2tpcHBlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ29tcGlsZSBmYWlsZWQnKTtcbiAgfVxuICByZXR1cm4gZW1pdHRlZDtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVDb21waWxlckhvc3QoaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgY286IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZW1pdHRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4gIC8vIEl0IHNlZW1zIHRvIG5vdCBhYmxlIHRvIHdyaXRlIGZpbGUgdGhyb3VnaCBzeW1saW5rIGluIFdpbmRvd3NcbiAgLy8gY29uc3QgX3dyaXRlRmlsZSA9IGhvc3Qud3JpdGVGaWxlO1xuICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID0gZnVuY3Rpb24oZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpIHtcbiAgICBjb25zdCBkZXN0RmlsZSA9IHJlYWxQYXRoT2YoZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICBpZiAoZGVzdEZpbGUgPT0gbnVsbCkge1xuICAgICAgbG9nLmRlYnVnKCdza2lwJywgZmlsZU5hbWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbWl0dGVkTGlzdC5wdXNoKGRlc3RGaWxlKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgZmlsZScsIGRlc3RGaWxlKTtcbiAgICAvLyBUeXBlc2NyaXB0J3Mgd3JpdGVGaWxlKCkgZnVuY3Rpb24gcGVyZm9ybXMgd2VpcmQgd2l0aCBzeW1saW5rcyB1bmRlciB3YXRjaCBtb2RlIGluIFdpbmRvd3M6XG4gICAgLy8gRXZlcnkgdGltZSBhIHRzIGZpbGUgaXMgY2hhbmdlZCwgaXQgdHJpZ2dlcnMgdGhlIHN5bWxpbmsgYmVpbmcgY29tcGlsZWQgYW5kIHRvIGJlIHdyaXR0ZW4gd2hpY2ggaXNcbiAgICAvLyBhcyBleHBlY3RlZCBieSBtZSxcbiAgICAvLyBidXQgbGF0ZSBvbiBpdCB0cmlnZ2VycyB0aGUgc2FtZSByZWFsIGZpbGUgYWxzbyBiZWluZyB3cml0dGVuIGltbWVkaWF0ZWx5LCB0aGlzIGlzIG5vdCB3aGF0IEkgZXhwZWN0LFxuICAgIC8vIGFuZCBpdCBkb2VzIG5vdCBhY3R1YWxseSB3cml0ZSBvdXQgYW55IGNoYW5nZXMgdG8gZmluYWwgSlMgZmlsZS5cbiAgICAvLyBTbyBJIGRlY2lkZSB0byB1c2Ugb3JpZ2luYWwgTm9kZS5qcyBmaWxlIHN5c3RlbSBBUElcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShkZXN0RmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZGVzdEZpbGUsIGRhdGEpO1xuICAgIC8vIEl0IHNlZW1zIFR5cGVzY3JpcHQgY29tcGlsZXIgYWx3YXlzIHVzZXMgc2xhc2ggaW5zdGVhZCBvZiBiYWNrIHNsYXNoIGluIGZpbGUgcGF0aCwgZXZlbiBpbiBXaW5kb3dzXG4gICAgLy8gcmV0dXJuIF93cml0ZUZpbGUuY2FsbCh0aGlzLCBkZXN0RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyksIC4uLkFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuICBob3N0LndyaXRlRmlsZSA9IHdyaXRlRmlsZTtcblxuICBjb25zdCBfZ2V0U291cmNlRmlsZSA9IGhvc3QuZ2V0U291cmNlRmlsZTtcbiAgY29uc3QgZ2V0U291cmNlRmlsZTogdHlwZW9mIF9nZXRTb3VyY2VGaWxlID0gZnVuY3Rpb24oZmlsZU5hbWUpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnZ2V0U291cmNlRmlsZScsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gX2dldFNvdXJjZUZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbiAgaG9zdC5nZXRTb3VyY2VGaWxlID0gZ2V0U291cmNlRmlsZTtcblxuICAvLyBjb25zdCBfcmVzb2x2ZU1vZHVsZU5hbWVzID0gaG9zdC5yZXNvbHZlTW9kdWxlTmFtZXM7XG5cbiAgLy8gaG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMgPSBmdW5jdGlvbihtb2R1bGVOYW1lcywgY29udGFpbmluZ0ZpbGUsIHJldXNlZE5hbWVzLCByZWRpcmVjdGVkUmVmLCBvcHQpIHtcbiAgLy8gICBsZXQgcmVzdWx0OiBSZXR1cm5UeXBlPE5vbk51bGxhYmxlPHR5cGVvZiBfcmVzb2x2ZU1vZHVsZU5hbWVzPj47XG4gIC8vICAgaWYgKF9yZXNvbHZlTW9kdWxlTmFtZXMpIHtcbiAgLy8gICAgIHJlc3VsdCA9IF9yZXNvbHZlTW9kdWxlTmFtZXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSBhcyBSZXR1cm5UeXBlPHR5cGVvZiBfcmVzb2x2ZU1vZHVsZU5hbWVzPjtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgcmVzdWx0ID0gbW9kdWxlTmFtZXMubWFwKG1vZHVsZU5hbWUgPT4ge1xuICAvLyAgICAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCBjbywgaG9zdCwgIHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShcbiAgLy8gICAgICAgICB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLCBwYXRoID0+IHBhdGgsIGNvXG4gIC8vICAgICAgICkpO1xuICAvLyAgICAgICByZXR1cm4gcmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGU7XG4gIC8vICAgICB9KTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHJlc3VsdDtcbiAgLy8gfTtcbiAgLy8gKGhvc3QgYXMgYW55KS5fb3ZlcnJpZGVkID0gdHJ1ZTtcbiAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xufVxuXG5mdW5jdGlvbiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+KSB7XG4gIGxldCBmaWxlSW5mbyA9ICcnO1xuICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgY29uc3QgcmVhbEZpbGUgPSByZWFsUGF0aE9mKGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZTtcbiAgICBmaWxlSW5mbyA9IGAke3JlYWxGaWxlfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4gIH1cbiAgY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSB7XG4gIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWMoZGlhZ25vc3RpYywgZm9ybWF0SG9zdCkpKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgbWVyZ2VGcm9tVHNjb25maWc/OiBzdHJpbmcsIHBhdGhzSnNvbnM/OiBzdHJpbmdbXSkge1xuICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkoY3dkKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtjd2R9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG1lcmdlRnJvbVRzY29uZmlnKSB7XG4gICAgbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG1lcmdlRnJvbVRzY29uZmlnLCBjd2QsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIH1cbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKGN3ZCwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogcmVzb2x2ZShyb290LCB3c0tleSlcbiAgfSk7XG5cbiAgaWYgKHBhdGhzSnNvbnMgJiYgcGF0aHNKc29ucy5sZW5ndGggPiAwKSB7XG4gICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gcGF0aHNKc29ucy5yZWR1Y2UoKHBhdGhNYXAsIGpzb25TdHIpID0+IHtcbiAgICAgIHJldHVybiB7Li4ucGF0aE1hcCwgLi4uSlNPTi5wYXJzZShqc29uU3RyKX07XG4gICAgfSwgY29tcGlsZXJPcHRpb25zLnBhdGhzKTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiByZWFsIHBhdGggb2YgdGFyZ2V0aW5nIGZpbGUsIHJldHVybiBudWxsIGlmIHRhcmdldGluZyBmaWxlIGlzIG5vdCBpbiBvdXIgY29tcGlsaWF0aW9uIHNjb3BlXG4gKiBAcGFyYW0gZmlsZU5hbWUgXG4gKiBAcGFyYW0gY29tbW9uUm9vdERpciBcbiAqIEBwYXJhbSBwYWNrYWdlRGlyVHJlZSBcbiAqL1xuZnVuY3Rpb24gcmVhbFBhdGhPZihmaWxlTmFtZTogc3RyaW5nLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgaXNTcmNGaWxlID0gZmFsc2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlTmFtZSk7XG4gIGNvbnN0IF9vcmlnaW5QYXRoID0gZmlsZU5hbWU7IC8vIGFic29sdXRlIHBhdGhcbiAgY29uc3QgZm91bmRQa2dJbmZvID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCk7XG4gIGlmIChmb3VuZFBrZ0luZm8gPT0gbnVsbCkge1xuICAgIC8vIHRoaXMgZmlsZSBpcyBub3QgcGFydCBvZiBzb3VyY2UgcGFja2FnZS5cbiAgICAvLyBsb2cuaW5mbygnTm90IHBhcnQgb2YgZW50cnkgZmlsZXMnLCBmaWxlTmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qge3NyY0RpciwgZGVzdERpciwgcGtnRGlyLCBpc29tRGlyLCBzeW1saW5rRGlyfSA9IGZvdW5kUGtnSW5mbztcblxuICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoc3ltbGlua0RpciwgX29yaWdpblBhdGgpO1xuXG4gIGlmIChzcmNEaXIgPT09ICcuJyB8fCBzcmNEaXIubGVuZ3RoID09PSAwKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZyk7XG4gIH0gZWxzZSBpZiAocGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKHNyY0RpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHNyY0Rpci5sZW5ndGggKyAxKSk7XG4gIH0gZWxzZSBpZiAoaXNvbURpciAmJiBwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoaXNvbURpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc29tRGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKGlzb21EaXIubGVuZ3RoICsgMSkpO1xuICB9XG4gIHJldHVybiBmaWxlTmFtZTtcbn1cbiJdfQ==