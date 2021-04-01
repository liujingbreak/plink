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
// import {PlinkEnv} from './node-path';
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
    // const possibleSrcDirs = ['isom', 'ts'];
    const compGlobs = [];
    // var compStream = [];
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
    setupCompilerOptionsWithPackages(compilerOptions, argv.pathsJsons);
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
        if (tscCfg.globs) {
            compGlobs.push(...tscCfg.globs.map(file => path_1.resolve(symlinkDir, file).replace(/\\/g, '/')));
            return;
        }
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
        if (tscCfg.include) {
            tscCfg.include = [].concat(tscCfg.include);
        }
        if (tscCfg.include && tscCfg.include.length > 0) {
            for (const pattern of tscCfg.include) {
                const includePath = path_1.resolve(symlinkDir, pattern).replace(/\\/g, '/');
                compGlobs.push(includePath);
            }
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
function setupCompilerOptionsWithPackages(compilerOptions, pathsJsons) {
    const cwd = misc_1.plinkEnv.workDir;
    let wsKey = package_mgr_1.workspaceKey(cwd);
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    // if (compilerOptions.paths == null)
    //   compilerOptions.paths = {};
    // for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    //   const realDir = relative(cwd, realPath).replace(/\\/g, '/');
    //   compilerOptions.paths[name] = [realDir];
    //   compilerOptions.paths[name + '/*'] = [realDir + '/*'];
    // }
    package_list_helper_1.setTsCompilerOptForNodePath(cwd, './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
    });
    if (pathsJsons && pathsJsons.length > 0) {
        pathsJsons.reduce((pathMap, jsonStr) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNEI7QUFDNUIsdUNBQXdFO0FBRXhFLHNEQUE4QjtBQUM5QiwyRUFBMEg7QUFDMUgsNkRBQXVEO0FBQ3ZELCtDQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLHdDQUF3QztBQUd4QyxNQUFNLEVBQUMsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sSUFBSSxHQUFHLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUM7QUFtQi9COzs7Ozs7R0FNRztBQUNILFNBQWdCLEdBQUcsQ0FBQyxJQUFpQixDQUFBLDhDQUE4QztJQUNqRiwwQ0FBMEM7SUFDMUMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQy9CLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNsSCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNsRSxNQUFNLFlBQVksR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRyxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUU7UUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsTUFBTSxJQUFJLEtB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Q0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsV0FBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0U7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGgsIHtyZXNvbHZlLCBqb2luLCByZWxhdGl2ZSwgc2VwfSBmcm9tICdwYXRoJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2csIFBhY2thZ2VUc0RpcnMsIHBsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuLy8gaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuXG5cbmNvbnN0IHtzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzLWNtZCcpO1xuY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIHBhdGhzSnNvbnM/OiBzdHJpbmdbXTtcbiAgY29tcGlsZU9wdGlvbnM/OiB7W2tleSBpbiBrZXlvZiBDb21waWxlck9wdGlvbnNdPzogYW55fTtcbiAgb3ZlcnJpZGVQYWNrZ2VEaXJzPzoge1twa2dOYW1lOiBzdHJpbmddOiBQYWNrYWdlVHNEaXJzfTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VEaXJJbmZvIGV4dGVuZHMgUGFja2FnZVRzRGlycyB7XG4gIHBrZ0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c2MoYXJndjogVHNjQ21kUGFyYW0vKiwgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCovKTogc3RyaW5nW10ge1xuICAvLyBjb25zdCBwb3NzaWJsZVNyY0RpcnMgPSBbJ2lzb20nLCAndHMnXTtcbiAgY29uc3QgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB2YXIgY29tcFN0cmVhbSA9IFtdO1xuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgUGFja2FnZURpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xuICBpZiAoYmFzZVRzY29uZmlnLmVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihiYXNlVHNjb25maWcuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IHRzY29uZmlnIGZpbGU6ICcgKyBiYXNlVHNjb25maWdGaWxlKTtcbiAgfVxuXG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnM7XG5cbiAgaWYgKGFyZ3YuanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUyLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZTIsICd1dGY4JykpO1xuICAgIGlmICh0c3hUc2NvbmZpZy5lcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcih0c3hUc2NvbmZpZy5lcnJvcik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIH1cbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9XG5cbiAgLy8gY29uc3QgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4oKTtcbiAgY29uc3QgY29tbW9uUm9vdERpciA9IHBsaW5rRW52LndvcmtEaXI7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwbGlua0Vudi53b3JrRGlyLCBmYWxzZSkpIHtcbiAgICAgIG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5zeW1saW5rRGlyKTtcbiAgICBsb2cuZGVidWcoJ3RyZWVQYXRoJywgdHJlZVBhdGgpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG5cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzb3VyY2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG4gIC8vIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKFxuICAvLyAgIEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSlcbiAgLy8gICAubWFwKHJlbFBhdGggPT4gcmVzb2x2ZShyb290LCByZWxQYXRoKSkpO1xuXG4gIGNvbnN0IGRlc3REaXIgPSBjb21tb25Sb290RGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAuLi5iYXNlQ29tcGlsZXJPcHRpb25zLFxuICAgIC8vIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAvLyBDb21waWxlciBvcHRpb25zXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgIT09ICdpbmxpbmUnLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMsIGFyZ3YucGF0aHNKc29ucyk7XG5cbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIC8vIGNvbnN0IHRzUHJvamVjdCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KHsuLi5jb21waWxlck9wdGlvbnMsIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKX0pO1xuXG4gIC8qKiBzZXQgY29tcEdsb2JzICovXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgX3BhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgY29uc3QgdHNjQ2ZnOiBQYWNrYWdlVHNEaXJzID0gYXJndi5vdmVycmlkZVBhY2tnZURpcnMgJiYgXy5oYXMoYXJndi5vdmVycmlkZVBhY2tnZURpcnMsIG5hbWUpID9cbiAgICAgIGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzW25hbWVdIDogZ2V0VHNjQ29uZmlnT2ZQa2coanNvbik7XG4gICAgLy8gRm9yIHdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zNzk2MFxuICAgIC8vIFVzZSBhIHN5bWxpbmsgcGF0aCBpbnN0ZWFkIG9mIGEgcmVhbCBwYXRoLCBzbyB0aGF0IFR5cGVzY3JpcHQgY29tcGlsZXIgd2lsbCBub3RcbiAgICAvLyByZWNvZ25pemUgdGhlbSBhcyBmcm9tIHNvbWV3aGVyZSB3aXRoIFwibm9kZV9tb2R1bGVzXCIsIHRoZSBzeW1saW5rIG11c3QgYmUgcmVzaWRlXG4gICAgLy8gaW4gZGlyZWN0b3J5IHdoaWNoIGRvZXMgbm90IGNvbnRhaW4gXCJub2RlX21vZHVsZXNcIiBhcyBwYXJ0IG9mIGFic29sdXRlIHBhdGguXG4gICAgY29uc3Qgc3ltbGlua0RpciA9IHJlc29sdmUocGxpbmtFbnYud29ya0Rpciwgc3ltbGlua0Rpck5hbWUsIG5hbWUpO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7Li4udHNjQ2ZnLCBwa2dEaXI6IHJlYWxQYXRoLCBzeW1saW5rRGlyfSk7XG5cbiAgICBpZiAodHNjQ2ZnLmdsb2JzKSB7XG4gICAgICBjb21wR2xvYnMucHVzaCguLi50c2NDZmcuZ2xvYnMubWFwKGZpbGUgPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzcmNEaXJzID0gW3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIGlmIChzcmNEaXIgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGpvaW4oc3ltbGlua0Rpciwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRzY0NmZy5pbmNsdWRlKSB7XG4gICAgICB0c2NDZmcuaW5jbHVkZSA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5pbmNsdWRlKTtcbiAgICB9XG4gICAgaWYgKHRzY0NmZy5pbmNsdWRlICYmIHRzY0NmZy5pbmNsdWRlLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiB0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgICBjb25zdCBpbmNsdWRlUGF0aCA9IHJlc29sdmUoc3ltbGlua0RpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb21wR2xvYnMucHVzaChpbmNsdWRlUGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShzeW1saW5rRGlyLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgd2F0Y2goY29tcEdsb2JzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICByZXR1cm4gW107XG4gICAgLy8gd2F0Y2goY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkLCBhcmd2LmpzeCwgb25Db21waWxlZCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUoY29tcEdsb2JzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAvLyBwcm9tQ29tcGlsZSA9IGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkKTtcbiAgfVxufVxuXG5jb25zdCBmb3JtYXRIb3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lOiBwYXRoID0+IHBhdGgsXG4gIGdldEN1cnJlbnREaXJlY3Rvcnk6IHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gd2F0Y2goZ2xvYlBhdHRlcm5zOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+KSB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBfLmZsYXR0ZW4oXG4gICAgZ2xvYlBhdHRlcm5zLm1hcChwYXR0ZXJuID0+IGdsb2Iuc3luYyhwYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkpXG4gICk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICB9XG4gIGNvbnN0IHByb2dyYW1Ib3N0ID0gdHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Qocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIHRzLnN5cywgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSxcbiAgICBfcmVwb3J0RGlhZ25vc3RpYywgcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKTtcblxuICBjb25zdCBvcmlnQ3JlYXRlUHJvZ3JhbSA9IHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW07XG4gIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgaG9zdD86IHRzLkNvbXBpbGVySG9zdCkge1xuICAgIGlmIChob3N0ICYmIChob3N0IGFzIGFueSkuX292ZXJyaWRlZCA9PSBudWxsKSB7XG4gICAgICBvdmVycmlkZUNvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdDcmVhdGVQcm9ncmFtLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUoZ2xvYlBhdHRlcm5zOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+KSB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBfLmZsYXR0ZW4oXG4gICAgZ2xvYlBhdHRlcm5zLm1hcChwYXR0ZXJuID0+IGdsb2Iuc3luYyhwYXR0ZXJuLCB7Y3dkOiBwbGlua0Vudi53b3JrRGlyfSkuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpKVxuICApO1xuICBsb2cuZGVidWcoJ3Jvb3RGaWxlczpcXG4nLCByb290RmlsZXMpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcGxpbmtFbnYud29ya0Rpci5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG4gIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcbiAgY29uc3QgZW1pdHRlZCA9IG92ZXJyaWRlQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMpO1xuICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGVtaXRSZXN1bHQgPSBwcm9ncmFtLmVtaXQoKTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0cy5nZXRQcmVFbWl0RGlhZ25vc3RpY3MocHJvZ3JhbSlcbiAgICAuY29uY2F0KGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpIHtcbiAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gIH1cbiAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbiAgfSk7XG4gIGlmIChlbWl0UmVzdWx0LmVtaXRTa2lwcGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb21waWxlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBlbWl0dGVkO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZUNvbXBpbGVySG9zdChob3N0OiB0cy5Db21waWxlckhvc3QsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBjbzogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nW10ge1xuICBjb25zdCBlbWl0dGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgLy8gSXQgc2VlbXMgdG8gbm90IGFibGUgdG8gd3JpdGUgZmlsZSB0aHJvdWdoIHN5bWxpbmsgaW4gV2luZG93c1xuICAvLyBjb25zdCBfd3JpdGVGaWxlID0gaG9zdC53cml0ZUZpbGU7XG4gIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPSBmdW5jdGlvbihmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcykge1xuICAgIGNvbnN0IGRlc3RGaWxlID0gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICAgIGlmIChkZXN0RmlsZSA9PSBudWxsKSB7XG4gICAgICBsb2cuZGVidWcoJ3NraXAnLCBmaWxlTmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGVtaXR0ZWRMaXN0LnB1c2goZGVzdEZpbGUpO1xuICAgIGxvZy5pbmZvKCd3cml0ZSBmaWxlJywgZGVzdEZpbGUpO1xuICAgIC8vIFR5cGVzY3JpcHQncyB3cml0ZUZpbGUoKSBmdW5jdGlvbiBwZXJmb3JtcyB3ZWlyZCB3aXRoIHN5bWxpbmtzIHVuZGVyIHdhdGNoIG1vZGUgaW4gV2luZG93czpcbiAgICAvLyBFdmVyeSB0aW1lIGEgdHMgZmlsZSBpcyBjaGFuZ2VkLCBpdCB0cmlnZ2VycyB0aGUgc3ltbGluayBiZWluZyBjb21waWxlZCBhbmQgdG8gYmUgd3JpdHRlbiB3aGljaCBpc1xuICAgIC8vIGFzIGV4cGVjdGVkIGJ5IG1lLFxuICAgIC8vIGJ1dCBsYXRlIG9uIGl0IHRyaWdnZXJzIHRoZSBzYW1lIHJlYWwgZmlsZSBhbHNvIGJlaW5nIHdyaXR0ZW4gaW1tZWRpYXRlbHksIHRoaXMgaXMgbm90IHdoYXQgSSBleHBlY3QsXG4gICAgLy8gYW5kIGl0IGRvZXMgbm90IGFjdHVhbGx5IHdyaXRlIG91dCBhbnkgY2hhbmdlcyB0byBmaW5hbCBKUyBmaWxlLlxuICAgIC8vIFNvIEkgZGVjaWRlIHRvIHVzZSBvcmlnaW5hbCBOb2RlLmpzIGZpbGUgc3lzdGVtIEFQSVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhkZXN0RmlsZSwgZGF0YSk7XG4gICAgLy8gSXQgc2VlbXMgVHlwZXNjcmlwdCBjb21waWxlciBhbHdheXMgdXNlcyBzbGFzaCBpbnN0ZWFkIG9mIGJhY2sgc2xhc2ggaW4gZmlsZSBwYXRoLCBldmVuIGluIFdpbmRvd3NcbiAgICAvLyByZXR1cm4gX3dyaXRlRmlsZS5jYWxsKHRoaXMsIGRlc3RGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG4gIGhvc3Qud3JpdGVGaWxlID0gd3JpdGVGaWxlO1xuXG4gIGNvbnN0IF9nZXRTb3VyY2VGaWxlID0gaG9zdC5nZXRTb3VyY2VGaWxlO1xuICBjb25zdCBnZXRTb3VyY2VGaWxlOiB0eXBlb2YgX2dldFNvdXJjZUZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZSkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdnZXRTb3VyY2VGaWxlJywgZmlsZU5hbWUpO1xuICAgIHJldHVybiBfZ2V0U291cmNlRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuICBob3N0LmdldFNvdXJjZUZpbGUgPSBnZXRTb3VyY2VGaWxlO1xuXG4gIC8vIGNvbnN0IF9yZXNvbHZlTW9kdWxlTmFtZXMgPSBob3N0LnJlc29sdmVNb2R1bGVOYW1lcztcblxuICAvLyBob3N0LnJlc29sdmVNb2R1bGVOYW1lcyA9IGZ1bmN0aW9uKG1vZHVsZU5hbWVzLCBjb250YWluaW5nRmlsZSwgcmV1c2VkTmFtZXMsIHJlZGlyZWN0ZWRSZWYsIG9wdCkge1xuICAvLyAgIGxldCByZXN1bHQ6IFJldHVyblR5cGU8Tm9uTnVsbGFibGU8dHlwZW9mIF9yZXNvbHZlTW9kdWxlTmFtZXM+PjtcbiAgLy8gICBpZiAoX3Jlc29sdmVNb2R1bGVOYW1lcykge1xuICAvLyAgICAgcmVzdWx0ID0gX3Jlc29sdmVNb2R1bGVOYW1lcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpIGFzIFJldHVyblR5cGU8dHlwZW9mIF9yZXNvbHZlTW9kdWxlTmFtZXM+O1xuICAvLyAgIH0gZWxzZSB7XG4gIC8vICAgICByZXN1bHQgPSBtb2R1bGVOYW1lcy5tYXAobW9kdWxlTmFtZSA9PiB7XG4gIC8vICAgICAgIGNvbnN0IHJlc29sdmVkID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUsIGNvLCBob3N0LCAgdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAvLyAgICAgICAgIHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5KCksIHBhdGggPT4gcGF0aCwgY29cbiAgLy8gICAgICAgKSk7XG4gIC8vICAgICAgIHJldHVybiByZXNvbHZlZC5yZXNvbHZlZE1vZHVsZTtcbiAgLy8gICAgIH0pO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gcmVzdWx0O1xuICAvLyB9O1xuICAvLyAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPSB0cnVlO1xuICByZXR1cm4gZW1pdHRlZExpc3Q7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4pIHtcbiAgbGV0IGZpbGVJbmZvID0gJyc7XG4gIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICBjb25zdCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gZGlhZ25vc3RpYy5maWxlLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGRpYWdub3N0aWMuc3RhcnQhKTtcbiAgICBjb25zdCByZWFsRmlsZSA9IHJlYWxQYXRoT2YoZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHJ1ZSkgfHwgZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lO1xuICAgIGZpbGVJbmZvID0gYCR7cmVhbEZpbGV9LCBsaW5lOiAke2xpbmUgKyAxfSwgY29sdW1uOiAke2NoYXJhY3RlciArIDF9YDtcbiAgfVxuICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZChgRXJyb3IgJHtkaWFnbm9zdGljLmNvZGV9ICR7ZmlsZUluZm99IDpgKSwgdHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dCggZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCwgZm9ybWF0SG9zdC5nZXROZXdMaW5lKCkpKTtcbn1cblxuZnVuY3Rpb24gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpIHtcbiAgY29uc29sZS5pbmZvKGNoYWxrLmN5YW4odHMuZm9ybWF0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBmb3JtYXRIb3N0KSkpO1xufVxuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBwYXRoc0pzb25zPzogc3RyaW5nW10pIHtcbiAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KGN3ZCk7XG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpXG4gICAgd3NLZXkgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIHNwYWNlJyk7XG4gIH1cblxuICAvLyBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzID09IG51bGwpXG4gIC8vICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0ge307XG5cbiAgLy8gZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgLy8gICBjb25zdCByZWFsRGlyID0gcmVsYXRpdmUoY3dkLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyAgIGNvbXBpbGVyT3B0aW9ucy5wYXRoc1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgLy8gICBjb21waWxlck9wdGlvbnMucGF0aHNbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgLy8gfVxuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoY3dkLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiByZXNvbHZlKHJvb3QsIHdzS2V5KVxuICB9KTtcblxuICBpZiAocGF0aHNKc29ucyAmJiBwYXRoc0pzb25zLmxlbmd0aCA+IDApIHtcbiAgICBwYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgICAgcmV0dXJuIHsuLi5wYXRoTWFwLCAuLi5KU09OLnBhcnNlKGpzb25TdHIpfTtcbiAgICB9LCBjb21waWxlck9wdGlvbnMucGF0aHMpO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHJlYWwgcGF0aCBvZiB0YXJnZXRpbmcgZmlsZSwgcmV0dXJuIG51bGwgaWYgdGFyZ2V0aW5nIGZpbGUgaXMgbm90IGluIG91ciBjb21waWxpYXRpb24gc2NvcGVcbiAqIEBwYXJhbSBmaWxlTmFtZSBcbiAqIEBwYXJhbSBjb21tb25Sb290RGlyIFxuICogQHBhcmFtIHBhY2thZ2VEaXJUcmVlIFxuICovXG5mdW5jdGlvbiByZWFsUGF0aE9mKGZpbGVOYW1lOiBzdHJpbmcsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBpc1NyY0ZpbGUgPSBmYWxzZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGVOYW1lKTtcbiAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICBjb25zdCBmb3VuZFBrZ0luZm8gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKTtcbiAgaWYgKGZvdW5kUGtnSW5mbyA9PSBudWxsKSB7XG4gICAgLy8gdGhpcyBmaWxlIGlzIG5vdCBwYXJ0IG9mIHNvdXJjZSBwYWNrYWdlLlxuICAgIC8vIGxvZy5pbmZvKCdOb3QgcGFydCBvZiBlbnRyeSBmaWxlcycsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3JjRGlyLCBkZXN0RGlyLCBwa2dEaXIsIGlzb21EaXIsIHN5bWxpbmtEaXJ9ID0gZm91bmRQa2dJbmZvO1xuXG4gIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShzeW1saW5rRGlyLCBfb3JpZ2luUGF0aCk7XG5cbiAgaWYgKHNyY0RpciA9PT0gJy4nIHx8IHNyY0Rpci5sZW5ndGggPT09IDApIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoc3JjRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2Uoc3JjRGlyLmxlbmd0aCArIDEpKTtcbiAgfSBlbHNlIGlmIChpc29tRGlyICYmIHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChpc29tRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzb21EaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UoaXNvbURpci5sZW5ndGggKyAxKSk7XG4gIH1cbiAgcmV0dXJuIGZpbGVOYW1lO1xufVxuIl19