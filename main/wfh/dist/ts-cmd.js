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
const { symlinkDirName } = JSON.parse(process.env.__plink);
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
    const commonRootDir = process.cwd();
    let countPkg = 0;
    if (argv.package && argv.package.length > 0)
        packageUtils.findAllPackages(argv.package, onComponent, 'src');
    else if (argv.project && argv.project.length > 0) {
        packageUtils.findAllPackages(onComponent, 'src', argv.project);
    }
    else {
        for (const pkg of packageUtils.packages4Workspace(process.cwd(), false)) {
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
    function onComponent(name, _packagePath, _parsedName, json, _realPath) {
        countPkg++;
        const tscCfg = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
            argv.overridePackgeDirs[name] : misc_1.getTscConfigOfPkg(json);
        // For workaround https://github.com/microsoft/TypeScript/issues/37960
        // Use a symlink path instead of a real path, so that Typescript compiler will not
        // recognize them as from somewhere with "node_modules", the symlink must be reside
        // in directory which does not contain "node_modules" as part of absolute path.
        const symlinkDir = path_1.resolve(symlinkDirName, name);
        compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: _realPath, symlinkDir }));
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
    // return promCompile.then((list) => {
    //   if (argv.watch !== true && process.send) {
    //     process.send('plink-tsc compiled');
    //   }
    //   return list;
    // });
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
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
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
    const rootFiles = _.flatten(globPatterns.map(pattern => glob_1.default.sync(pattern).filter(file => !file.endsWith('.d.ts'))));
    // console.log(rootFiles);
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
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
    const cwd = process.cwd();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNEI7QUFDNUIsdUNBQThEO0FBRTlELHNEQUE4QjtBQUM5QiwyRUFBMEg7QUFDMUgsNkRBQXVEO0FBQ3ZELCtDQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBR3hCLE1BQU0sRUFBQyxjQUFjLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7QUFDdEUsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0MsTUFBTSxJQUFJLEdBQUcsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQW1CL0I7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQWlCLENBQUEsOENBQThDO0lBQ2pGLDBDQUEwQztJQUMxQyxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsdUJBQXVCO0lBQ3ZCLE1BQU0sV0FBVyxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO0lBQ2xILE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sWUFBWSxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQy9HLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRTtRQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxL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LGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQy9GO1NBQU0sSUFBSSxPQUFPLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFBRyxDQUFDLEVBQUU7UUFDN0QsUUFBUSxHQUFHLFdBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoLCB7cmVzb2x2ZSwgam9pbiwgcmVsYXRpdmUsIHNlcH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnLCBQYWNrYWdlVHNEaXJzfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuXG5jb25zdCB7c3ltbGlua0Rpck5hbWV9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay50cy1jbWQnKTtcbmNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcblxuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBwYXRoc0pzb25zPzogc3RyaW5nW107XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXT86IGFueX07XG4gIG92ZXJyaWRlUGFja2dlRGlycz86IHtbcGtnTmFtZTogc3RyaW5nXTogUGFja2FnZVRzRGlyc307XG59XG5cbmludGVyZmFjZSBQYWNrYWdlRGlySW5mbyBleHRlbmRzIFBhY2thZ2VUc0RpcnMge1xuICBwa2dEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IFRzY0NtZFBhcmFtLyosIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQqLyk6IHN0cmluZ1tdIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIGNvbnN0IGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIFBhY2thZ2VEaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgaWYgKGJhc2VUc2NvbmZpZy5lcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYmFzZVRzY29uZmlnLmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZSk7XG4gIH1cblxuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zO1xuXG4gIGlmIChhcmd2LmpzeCkge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUyID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpO1xuICAgIGNvbnN0IHRzeFRzY29uZmlnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlMiwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUyLCAndXRmOCcpKTtcbiAgICBpZiAodHN4VHNjb25maWcuZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IodHN4VHNjb25maWcuZXJyb3IpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgdHNjb25maWcgZmlsZTogJyArIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICB9XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfVxuXG4gIC8vIGNvbnN0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZURpckluZm8+KCk7XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwcm9jZXNzLmN3ZCgpO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhhcmd2LnBhY2thZ2UsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnLCBhcmd2LnByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSwgZmFsc2UpKSB7XG4gICAgICBvbkNvbXBvbmVudChwa2cubmFtZSwgcGtnLnBhdGgsIG51bGwsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uc3ltbGlua0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc291cmNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuICAvLyBjb25zdCBjb21tb25Sb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihcbiAgLy8gICBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpXG4gIC8vICAgLm1hcChyZWxQYXRoID0+IHJlc29sdmUocm9vdCwgcmVsUGF0aCkpKTtcblxuICBjb25zdCBkZXN0RGlyID0gY29tbW9uUm9vdERpci5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICAvLyB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogZGVzdERpcixcbiAgICByb290RGlyOiBkZXN0RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBzb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwICE9PSAnaW5saW5lJyxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zLCBhcmd2LnBhdGhzSnNvbnMpO1xuXG4gIGxvZy5pbmZvKCd0eXBlc2NyaXB0IGNvbXBpbGVyT3B0aW9uczonLCBjb21waWxlck9wdGlvbnMpO1xuICAvLyBjb25zdCB0c1Byb2plY3QgPSBndWxwVHMuY3JlYXRlUHJvamVjdCh7Li4uY29tcGlsZXJPcHRpb25zLCB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0Jyl9KTtcblxuXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgX3BhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgX3JlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZzogUGFja2FnZVRzRGlycyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXSA6IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuICAgIC8vIEZvciB3b3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc5NjBcbiAgICAvLyBVc2UgYSBzeW1saW5rIHBhdGggaW5zdGVhZCBvZiBhIHJlYWwgcGF0aCwgc28gdGhhdCBUeXBlc2NyaXB0IGNvbXBpbGVyIHdpbGwgbm90XG4gICAgLy8gcmVjb2duaXplIHRoZW0gYXMgZnJvbSBzb21ld2hlcmUgd2l0aCBcIm5vZGVfbW9kdWxlc1wiLCB0aGUgc3ltbGluayBtdXN0IGJlIHJlc2lkZVxuICAgIC8vIGluIGRpcmVjdG9yeSB3aGljaCBkb2VzIG5vdCBjb250YWluIFwibm9kZV9tb2R1bGVzXCIgYXMgcGFydCBvZiBhYnNvbHV0ZSBwYXRoLlxuICAgIGNvbnN0IHN5bWxpbmtEaXIgPSByZXNvbHZlKHN5bWxpbmtEaXJOYW1lLCBuYW1lKTtcblxuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7Li4udHNjQ2ZnLCBwa2dEaXI6IF9yZWFsUGF0aCwgc3ltbGlua0Rpcn0pO1xuXG4gICAgaWYgKHRzY0NmZy5nbG9icykge1xuICAgICAgY29tcEdsb2JzLnB1c2goLi4udHNjQ2ZnLmdsb2JzLm1hcChmaWxlID0+IHJlc29sdmUoc3ltbGlua0RpciwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3JjRGlycyA9IFt0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHN5bWxpbmtEaXIsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgdHNjQ2ZnLmluY2x1ZGUgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuaW5jbHVkZSk7XG4gICAgfVxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSAmJiB0c2NDZmcuaW5jbHVkZS5sZW5ndGggPiAwKSB7XG4gICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgdHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgICAgY29uc3QgaW5jbHVkZVBhdGggPSByZXNvbHZlKHN5bWxpbmtEaXIsIHBhdHRlcm4pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgY29tcEdsb2JzLnB1c2goaW5jbHVkZVBhdGgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUoc3ltbGlua0Rpciwgc3JjRGlyISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJldHVybiBwcm9tQ29tcGlsZS50aGVuKChsaXN0KSA9PiB7XG4gIC8vICAgaWYgKGFyZ3Yud2F0Y2ggIT09IHRydWUgJiYgcHJvY2Vzcy5zZW5kKSB7XG4gIC8vICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gbGlzdDtcbiAgLy8gfSk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIHdhdGNoKGNvbXBHbG9icywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgcmV0dXJuIFtdO1xuICAgIC8vIHdhdGNoKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCwgYXJndi5qc3gsIG9uQ29tcGlsZWQpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVtaXR0ZWQgPSBjb21waWxlKGNvbXBHbG9icywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgLy8gcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCk7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogcGF0aCA9PiBwYXRoLFxuICBnZXRDdXJyZW50RGlyZWN0b3J5OiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgZ2V0TmV3TGluZTogKCkgPT4gdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKGdsb2JQYXR0ZXJuczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPikge1xuICBjb25zdCByb290RmlsZXM6IHN0cmluZ1tdID0gXy5mbGF0dGVuKFxuICAgIGdsb2JQYXR0ZXJucy5tYXAocGF0dGVybiA9PiBnbG9iLnN5bmMocGF0dGVybikuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpKVxuICApO1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMpIHtcbiAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gIH1cbiAgY29uc3QgcHJvZ3JhbUhvc3QgPSB0cy5jcmVhdGVXYXRjaENvbXBpbGVySG9zdChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgdHMuc3lzLCB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLFxuICAgIF9yZXBvcnREaWFnbm9zdGljLCByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10gfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBob3N0PzogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgaWYgKGhvc3QgJiYgKGhvc3QgYXMgYW55KS5fb3ZlcnJpZGVkID09IG51bGwpIHtcbiAgICAgIG92ZXJyaWRlQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMpO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ0NyZWF0ZVByb2dyYW0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbiAgdHMuY3JlYXRlV2F0Y2hQcm9ncmFtKHByb2dyYW1Ib3N0KTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShnbG9iUGF0dGVybnM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4pIHtcbiAgY29uc3Qgcm9vdEZpbGVzOiBzdHJpbmdbXSA9IF8uZmxhdHRlbihcbiAgICBnbG9iUGF0dGVybnMubWFwKHBhdHRlcm4gPT4gZ2xvYi5zeW5jKHBhdHRlcm4pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKSlcbiAgKTtcbiAgLy8gY29uc29sZS5sb2cocm9vdEZpbGVzKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLCBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuICBjb25zdCBlbWl0dGVkID0gb3ZlcnJpZGVDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBob3N0KTtcbiAgY29uc3QgZW1pdFJlc3VsdCA9IHByb2dyYW0uZW1pdCgpO1xuICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRzLmdldFByZUVtaXREaWFnbm9zdGljcyhwcm9ncmFtKVxuICAgIC5jb25jYXQoZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgfVxuICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMpO1xuICB9KTtcbiAgaWYgKGVtaXRSZXN1bHQuZW1pdFNraXBwZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBpbGUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGVtaXR0ZWQ7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlQ29tcGlsZXJIb3N0KGhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIGNvOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGVtaXR0ZWRMaXN0OiBzdHJpbmdbXSA9IFtdO1xuICAvLyBJdCBzZWVtcyB0byBub3QgYWJsZSB0byB3cml0ZSBmaWxlIHRocm91Z2ggc3ltbGluayBpbiBXaW5kb3dzXG4gIC8vIGNvbnN0IF93cml0ZUZpbGUgPSBob3N0LndyaXRlRmlsZTtcbiAgY29uc3Qgd3JpdGVGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSB7XG4gICAgY29uc3QgZGVzdEZpbGUgPSByZWFsUGF0aE9mKGZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKGRlc3RGaWxlID09IG51bGwpIHtcbiAgICAgIGxvZy5kZWJ1Zygnc2tpcCcsIGZpbGVOYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZW1pdHRlZExpc3QucHVzaChkZXN0RmlsZSk7XG4gICAgbG9nLmluZm8oJ3dyaXRlIGZpbGUnLCBkZXN0RmlsZSk7XG4gICAgLy8gVHlwZXNjcmlwdCdzIHdyaXRlRmlsZSgpIGZ1bmN0aW9uIHBlcmZvcm1zIHdlaXJkIHdpdGggc3ltbGlua3MgdW5kZXIgd2F0Y2ggbW9kZSBpbiBXaW5kb3dzOlxuICAgIC8vIEV2ZXJ5IHRpbWUgYSB0cyBmaWxlIGlzIGNoYW5nZWQsIGl0IHRyaWdnZXJzIHRoZSBzeW1saW5rIGJlaW5nIGNvbXBpbGVkIGFuZCB0byBiZSB3cml0dGVuIHdoaWNoIGlzXG4gICAgLy8gYXMgZXhwZWN0ZWQgYnkgbWUsXG4gICAgLy8gYnV0IGxhdGUgb24gaXQgdHJpZ2dlcnMgdGhlIHNhbWUgcmVhbCBmaWxlIGFsc28gYmVpbmcgd3JpdHRlbiBpbW1lZGlhdGVseSwgdGhpcyBpcyBub3Qgd2hhdCBJIGV4cGVjdCxcbiAgICAvLyBhbmQgaXQgZG9lcyBub3QgYWN0dWFsbHkgd3JpdGUgb3V0IGFueSBjaGFuZ2VzIHRvIGZpbmFsIEpTIGZpbGUuXG4gICAgLy8gU28gSSBkZWNpZGUgdG8gdXNlIG9yaWdpbmFsIE5vZGUuanMgZmlsZSBzeXN0ZW0gQVBJXG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZGVzdEZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3RGaWxlLCBkYXRhKTtcbiAgICAvLyBJdCBzZWVtcyBUeXBlc2NyaXB0IGNvbXBpbGVyIGFsd2F5cyB1c2VzIHNsYXNoIGluc3RlYWQgb2YgYmFjayBzbGFzaCBpbiBmaWxlIHBhdGgsIGV2ZW4gaW4gV2luZG93c1xuICAgIC8vIHJldHVybiBfd3JpdGVGaWxlLmNhbGwodGhpcywgZGVzdEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCAuLi5BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcbiAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZUZpbGU7XG5cbiAgY29uc3QgX2dldFNvdXJjZUZpbGUgPSBob3N0LmdldFNvdXJjZUZpbGU7XG4gIGNvbnN0IGdldFNvdXJjZUZpbGU6IHR5cGVvZiBfZ2V0U291cmNlRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2dldFNvdXJjZUZpbGUnLCBmaWxlTmFtZSk7XG4gICAgcmV0dXJuIF9nZXRTb3VyY2VGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG4gIGhvc3QuZ2V0U291cmNlRmlsZSA9IGdldFNvdXJjZUZpbGU7XG5cbiAgLy8gY29uc3QgX3Jlc29sdmVNb2R1bGVOYW1lcyA9IGhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzO1xuXG4gIC8vIGhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzID0gZnVuY3Rpb24obW9kdWxlTmFtZXMsIGNvbnRhaW5pbmdGaWxlLCByZXVzZWROYW1lcywgcmVkaXJlY3RlZFJlZiwgb3B0KSB7XG4gIC8vICAgbGV0IHJlc3VsdDogUmV0dXJuVHlwZTxOb25OdWxsYWJsZTx0eXBlb2YgX3Jlc29sdmVNb2R1bGVOYW1lcz4+O1xuICAvLyAgIGlmIChfcmVzb2x2ZU1vZHVsZU5hbWVzKSB7XG4gIC8vICAgICByZXN1bHQgPSBfcmVzb2x2ZU1vZHVsZU5hbWVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgYXMgUmV0dXJuVHlwZTx0eXBlb2YgX3Jlc29sdmVNb2R1bGVOYW1lcz47XG4gIC8vICAgfSBlbHNlIHtcbiAgLy8gICAgIHJlc3VsdCA9IG1vZHVsZU5hbWVzLm1hcChtb2R1bGVOYW1lID0+IHtcbiAgLy8gICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZSwgY28sIGhvc3QsICB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gIC8vICAgICAgICAgdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSwgcGF0aCA9PiBwYXRoLCBjb1xuICAvLyAgICAgICApKTtcbiAgLy8gICAgICAgcmV0dXJuIHJlc29sdmVkLnJlc29sdmVkTW9kdWxlO1xuICAvLyAgICAgfSk7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiByZXN1bHQ7XG4gIC8vIH07XG4gIC8vIChob3N0IGFzIGFueSkuX292ZXJyaWRlZCA9IHRydWU7XG4gIHJldHVybiBlbWl0dGVkTGlzdDtcbn1cblxuZnVuY3Rpb24gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPikge1xuICBsZXQgZmlsZUluZm8gPSAnJztcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSkge1xuICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgIGNvbnN0IHJlYWxGaWxlID0gcmVhbFBhdGhPZihkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWU7XG4gICAgZmlsZUluZm8gPSBgJHtyZWFsRmlsZX0sIGxpbmU6ICR7bGluZSArIDF9LCBjb2x1bW46ICR7Y2hhcmFjdGVyICsgMX1gO1xuICB9XG4gIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKGBFcnJvciAke2RpYWdub3N0aWMuY29kZX0gJHtmaWxlSW5mb30gOmApLCB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCBmb3JtYXRIb3N0LmdldE5ld0xpbmUoKSkpO1xufVxuXG5mdW5jdGlvbiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYykge1xuICBjb25zb2xlLmluZm8oY2hhbGsuY3lhbih0cy5mb3JtYXREaWFnbm9zdGljKGRpYWdub3N0aWMsIGZvcm1hdEhvc3QpKSk7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIHBhdGhzSnNvbnM/OiBzdHJpbmdbXSkge1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkoY3dkKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgc3BhY2UnKTtcbiAgfVxuXG4gIC8vIGlmIChjb21waWxlck9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgLy8gICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB7fTtcblxuICAvLyBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAvLyAgIGNvbnN0IHJlYWxEaXIgPSByZWxhdGl2ZShjd2QsIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIC8vICAgY29tcGlsZXJPcHRpb25zLnBhdGhzW25hbWVdID0gW3JlYWxEaXJdO1xuICAvLyAgIGNvbXBpbGVyT3B0aW9ucy5wYXRoc1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAvLyB9XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChjd2QsICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHJlc29sdmUocm9vdCwgd3NLZXkpXG4gIH0pO1xuXG4gIGlmIChwYXRoc0pzb25zICYmIHBhdGhzSnNvbnMubGVuZ3RoID4gMCkge1xuICAgIHBhdGhzSnNvbnMucmVkdWNlKChwYXRoTWFwLCBqc29uU3RyKSA9PiB7XG4gICAgICByZXR1cm4gey4uLnBhdGhNYXAsIC4uLkpTT04ucGFyc2UoanNvblN0cil9O1xuICAgIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gcmVhbCBwYXRoIG9mIHRhcmdldGluZyBmaWxlLCByZXR1cm4gbnVsbCBpZiB0YXJnZXRpbmcgZmlsZSBpcyBub3QgaW4gb3VyIGNvbXBpbGlhdGlvbiBzY29wZVxuICogQHBhcmFtIGZpbGVOYW1lIFxuICogQHBhcmFtIGNvbW1vblJvb3REaXIgXG4gKiBAcGFyYW0gcGFja2FnZURpclRyZWUgXG4gKi9cbmZ1bmN0aW9uIHJlYWxQYXRoT2YoZmlsZU5hbWU6IHN0cmluZywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIGlzU3JjRmlsZSA9IGZhbHNlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgZmlsZU5hbWUpO1xuICBjb25zdCBfb3JpZ2luUGF0aCA9IGZpbGVOYW1lOyAvLyBhYnNvbHV0ZSBwYXRoXG4gIGNvbnN0IGZvdW5kUGtnSW5mbyA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpO1xuICBpZiAoZm91bmRQa2dJbmZvID09IG51bGwpIHtcbiAgICAvLyB0aGlzIGZpbGUgaXMgbm90IHBhcnQgb2Ygc291cmNlIHBhY2thZ2UuXG4gICAgLy8gbG9nLmluZm8oJ05vdCBwYXJ0IG9mIGVudHJ5IGZpbGVzJywgZmlsZU5hbWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHtzcmNEaXIsIGRlc3REaXIsIHBrZ0RpciwgaXNvbURpciwgc3ltbGlua0Rpcn0gPSBmb3VuZFBrZ0luZm87XG5cbiAgY29uc3QgcGF0aFdpdGhpblBrZyA9IHJlbGF0aXZlKHN5bWxpbmtEaXIsIF9vcmlnaW5QYXRoKTtcblxuICBpZiAoc3JjRGlyID09PSAnLicgfHwgc3JjRGlyLmxlbmd0aCA9PT0gMCkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChzcmNEaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShzcmNEaXIubGVuZ3RoICsgMSkpO1xuICB9IGVsc2UgaWYgKGlzb21EaXIgJiYgcGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKGlzb21EaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNvbURpciwgcGF0aFdpdGhpblBrZy5zbGljZShpc29tRGlyLmxlbmd0aCArIDEpKTtcbiAgfVxuICByZXR1cm4gZmlsZU5hbWU7XG59XG4iXX0=