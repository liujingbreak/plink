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
exports.tsc = void 0;
/* eslint-disable max-len */
const path_1 = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const fse = __importStar(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const glob_1 = __importDefault(require("glob"));
const typescript_1 = __importDefault(require("typescript"));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const log4js_1 = __importDefault(require("log4js"));
const misc_1 = require("./utils/misc");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const utils_1 = require("./cmd/utils");
const package_mgr_1 = require("./package-mgr");
const packageUtils = __importStar(require("./package-utils"));
const ts_cmd_util_1 = require("./ts-cmd-util");
const injector_factory_1 = require("./injector-factory");
const cli_analyze_1 = require("./cmd/cli-analyze");
const tsc_util_1 = require("./utils/tsc-util");
const bootstrap_process_1 = require("./utils/bootstrap-process");
const { symlinkDirName } = misc_1.plinkEnv;
const log = log4js_1.default.getLogger('plink.ts-cmd');
async function tsc(argv, ts = typescript_1.default) {
    const rootFiles = [];
    const watchDirs = [];
    const includePatterns = [];
    const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
    const packageDirTree = new dir_tree_1.DirTree();
    const commonRootDir = misc_1.plinkEnv.workDir;
    // const commonRootDir = plinkEnv.rootDir;
    let countPkg = 0;
    let pkgInfos;
    if (argv.package && argv.package.length > 0)
        pkgInfos = Array.from((0, utils_1.findPackagesByNames)(argv.package)).filter(pkg => pkg != null);
    else if (argv.project && argv.project.length > 0) {
        pkgInfos = Array.from((0, package_list_helper_1.allPackages)('*', 'src', argv.project));
    }
    else {
        pkgInfos = Array.from(packageUtils.packages4Workspace(misc_1.plinkEnv.workDir, false));
    }
    // const commonRootDir = closestCommonParentDir(pkgInfos.map(pkg => pkg.realPath));
    await Promise.all(pkgInfos.map(pkg => onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath)));
    for (const info of compDirInfo.values()) {
        const treePath = (0, path_1.relative)(commonRootDir, info.pkgDir);
        log.debug('treePath', treePath);
        packageDirTree.putData(treePath, info);
    }
    if (countPkg === 0) {
        throw new Error('No available source package found in current workspace');
    }
    // const destDir = Path.relative(process.cwd(), commonRootDir).replace(/\\/g, '/');
    /** set compGlobs */
    async function onComponent(name, packagePath, _parsedName, json, realPath) {
        countPkg++;
        const tscCfg = argv.overridePackgeDirs && lodash_1.default.has(argv.overridePackgeDirs, name) ?
            argv.overridePackgeDirs[name]
            : (0, misc_1.getTscConfigOfPkg)(json);
        // For workaround https://github.com/microsoft/TypeScript/issues/37960
        // Use a symlink path instead of a real path, so that Typescript compiler will not
        // recognize them as from somewhere with "node_modules", the symlink must be reside
        // in directory which does not contain "node_modules" as part of absolute path.
        const symlinkDir = (0, path_1.resolve)(misc_1.plinkEnv.workDir, symlinkDirName, name);
        compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: realPath, symlinkDir }));
        const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
            if (srcDir == null)
                return false;
            try {
                return fs.statSync((0, path_1.join)(realPath, srcDir)).isDirectory();
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
                    ` ${[tscCfg.srcDir, tscCfg.isomDir].filter(item => item != null).join(', ')}`);
            }
        }
        if (tscCfg.files) {
            const files = [].concat(tscCfg.files);
            const aRes = await (0, cli_analyze_1.analyseFiles)(files.map(file => (0, path_1.resolve)(symlinkDir, file)), argv.mergeTsconfig, []);
            log.debug('analyzed files:', aRes);
            if (aRes) {
                rootFiles.push(...(aRes.files.filter(file => file.startsWith(symlinkDir + path_1.sep) && !/\.(?:jsx?|d\.ts)$/.test(file))
                    .map(file => file.replace(/\\/g, '/'))));
            }
        }
        if (tscCfg.include) {
            const patterns = [].concat(tscCfg.include);
            for (const pattern of patterns) {
                const globPattern = (0, path_1.resolve)(symlinkDir, pattern).replace(/\\/g, '/');
                includePatterns.push(globPattern);
                // glob.sync(globPattern).filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
            }
        }
        if (tscCfg.files == null && tscCfg.include == null) {
            for (const srcDir of srcDirs) {
                const relPath = (0, path_1.resolve)(realPath, srcDir).replace(/\\/g, '/');
                watchDirs.push(relPath);
                // glob.sync(relPath + '/**/*.ts').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                // if (argv.jsx) {
                //   glob.sync(relPath + '/**/*.tsx').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                // }
            }
        }
    }
    const { action$, ofType, dispatchFactory } = (0, tsc_util_1.languageServices)(ts, {
        transformSourceFile(file, content) {
            const changed = injector_factory_1.webInjector.injectToFile(file, content);
            if (changed !== content) {
                log.info(path_1.default.relative(cwd, file) + ' is patched');
            }
            return changed;
        },
        tscOpts: {
            jsx: argv.jsx,
            inlineSourceMap: true,
            emitDeclarationOnly: argv.ed,
            basePath: commonRootDir,
            changeCompilerOptions(co) {
                setupCompilerOptionsWithPackages(co, commonRootDir.replace(/\\/g, '/'), argv, ts);
            }
        }
    });
    const cwd = process.cwd();
    const writtenFile$ = new rx.Subject();
    function dealCommonJob() {
        return rx.merge(action$.pipe(ofType('onCompilerOptions'), op.take(1), op.map(({ payload: compilerOptions }) => {
            log.info('typescript compilerOptions:', compilerOptions);
        })), action$.pipe(ofType('_emitFile'), op.map(async ({ payload: [file, content] }) => {
            const destFile = realPathOf(file, commonRootDir, packageDirTree, false);
            if (destFile == null)
                return;
            writtenFile$.next(destFile);
            log.info('emit file', path_1.default.relative(cwd, destFile));
            await fse.mkdirp(path_1.default.dirname(destFile));
            void fs.promises.writeFile(destFile, content);
        })), action$.pipe(ofType('onEmitFailure'), op.map(({ payload: [file, msg, type] }) => {
            log.error(`[${type}] ` + msg);
        })), action$.pipe(ofType('onSuggest'), op.map(({ payload: [_fileName, msg] }) => {
            log.warn(msg);
        })));
    }
    if (argv.watch) {
        log.info('Watch mode');
        rx.merge(dealCommonJob()).subscribe();
        bootstrap_process_1.exitHooks.push(() => dispatchFactory('stop')());
        dispatchFactory('watch')([...watchDirs, ...includePatterns]);
        // watch(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
        return [];
    }
    else {
        const emitted = [];
        rx.merge(dealCommonJob(), writtenFile$.pipe(op.map(file => emitted.push(file)))).subscribe();
        for (const dir of watchDirs) {
            rootFiles.push(...glob_1.default.sync(dir + '/**/*.ts'));
            if (argv.jsx) {
                rootFiles.push(...glob_1.default.sync(dir + '/**/*.tsx'));
            }
        }
        for (const pat of includePatterns) {
            rootFiles.push(...pat);
            if (argv.jsx) {
                rootFiles.push(...pat);
            }
        }
        for (const file of rootFiles) {
            dispatchFactory('addSourceFile')(file, true);
        }
        writtenFile$.complete();
        // const emitted = compile(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
        if (process.send)
            process.send('plink-tsc compiled');
        return emitted;
    }
}
exports.tsc = tsc;
// const formatHost: _ts.FormatDiagnosticsHost = {
//   getCanonicalFileName: path => path,
//   getCurrentDirectory: _ts.sys.getCurrentDirectory,
//   getNewLine: () => _ts.sys.newLine
// };
// function watch(rootFiles: string[], jsonCompilerOpt: any, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>, ts: typeof _ts = _ts) {
//   const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys,
//     process.cwd().replace(/\\/g, '/'),
//     undefined, 'tsconfig.json').options;
//   function _reportDiagnostic(diagnostic: _ts.Diagnostic) {
//     return reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts);
//   }
//   const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys,
//     // https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
//     // TypeScript can use several different program creation "strategies":
//     //  * ts.createEmitAndSemanticDiagnosticsBuilderProgram,
//     //  * ts.createSemanticDiagnosticsBuilderProgram
//     //  * ts.createAbstractBuilder
//     // The first two produce "builder programs". These use an incremental strategy
//     // to only re-check and emit files whose contents may have changed, or whose
//     // dependencies may have changes which may impact change the result of prior
//     // type-check and emit.
//     // The last uses an ordinary program which does a full type check after every
//     // change.
//     // Between `createEmitAndSemanticDiagnosticsBuilderProgram` and
//     // `createSemanticDiagnosticsBuilderProgram`, the only difference is emit.
//     // For pure type-checking scenarios, or when another tool/process handles emit,
//     // using `createSemanticDiagnosticsBuilderProgram` may be more desirable
//     ts.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, d => reportWatchStatusChanged(d, ts),
//     undefined, {watchDirectory: ts.WatchDirectoryKind.UseFsEvents});
//   patchWatchCompilerHost(programHost);
//   const origCreateProgram = programHost.createProgram;
//   // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
//   programHost.createProgram = function(rootNames: readonly string[] | undefined, options: CompilerOptions | undefined,
//     host?: _ts.CompilerHost, ...rest: any[]) {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//     if (host && (host as any)._overrided == null) {
//       patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
//     }
//     const program = origCreateProgram.call(this, rootNames, options, host, ...rest) ;
//     return program;
//   };
//   ts.createWatchProgram(programHost);
// }
// function compile(rootFiles: string[], jsonCompilerOpt: any, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>,
//   ts: typeof _ts = _ts) {
//   const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys,
//     process.cwd().replace(/\\/g, '/'),
//     undefined, 'tsconfig.json').options;
//   const host = ts.createCompilerHost(compilerOptions);
//   patchWatchCompilerHost(host);
//   const emitted = patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
//   const program = ts.createProgram(rootFiles, compilerOptions, host);
//   const emitResult = program.emit();
//   const allDiagnostics = ts.getPreEmitDiagnostics(program)
//     .concat(emitResult.diagnostics);
//   function _reportDiagnostic(diagnostic: _ts.Diagnostic) {
//     return reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts);
//   }
//   allDiagnostics.forEach(diagnostic => {
//     _reportDiagnostic(diagnostic);
//   });
//   if (emitResult.emitSkipped) {
//     throw new Error('Compile failed');
//   }
//   return emitted;
// }
/** Overriding WriteFile() */
// function patchCompilerHost(host: _ts.CompilerHost, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>,
//   co: _ts.CompilerOptions, ts: typeof _ts = _ts): string[] {
//   const emittedList: string[] = [];
//   // It seems to not able to write file through symlink in Windows
//   // const _writeFile = host.writeFile;
//   const writeFile: _ts.WriteFileCallback = function(fileName, data, writeByteOrderMark, onError, sourceFiles) {
//     const destFile = realPathOf(fileName, commonRootDir, packageDirTree);
//     if (destFile == null) {
//       log.debug('skip', fileName);
//       return;
//     }
//     emittedList.push(destFile);
//     log.info('write file', Path.relative(process.cwd(), destFile));
//     // Typescript's writeFile() function performs weird with symlinks under watch mode in Windows:
//     // Every time a ts file is changed, it triggers the symlink being compiled and to be written which is
//     // as expected by me,
//     // but late on it triggers the same real file also being written immediately, this is not what I expect,
//     // and it does not actually write out any changes to final JS file.
//     // So I decide to use original Node.js file system API
//     fs.mkdirpSync(Path.dirname(destFile));
//     fs.writeFileSync(destFile, data);
//     // It seems Typescript compiler always uses slash instead of back slash in file path, even in Windows
//     // return _writeFile.call(this, destFile.replace(/\\/g, '/'), ...Array.prototype.slice.call(arguments, 1));
//   };
//   host.writeFile = writeFile;
//   return emittedList;
// }
// function patchWatchCompilerHost(host: _ts.WatchCompilerHostOfFilesAndCompilerOptions<_ts.EmitAndSemanticDiagnosticsBuilderProgram> | _ts.CompilerHost) {
//   const readFile = host.readFile;
//   const cwd = process.cwd();
//   host.readFile = function(path: string, encoding?: string) {
//     const content = readFile.call(this, path, encoding) ;
//     if (content && !path.endsWith('.d.ts') && !path.endsWith('.json')) {
//       // console.log('WatchCompilerHost.readFile', path);
//       const changed = webInjector.injectToFile(path, content);
//       if (changed !== content) {
//         log.info(Path.relative(cwd, path) + ' is patched');
//         return changed;
//       }
//     }
//     return content;
//   };
// }
// function reportDiagnostic(diagnostic: _ts.Diagnostic, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>, ts: typeof _ts = _ts) {
//   // let fileInfo = '';
//   // if (diagnostic.file) {
//   //   const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
//   //   const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
//   //   fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
//   // }
//   // console.error(chalk.red(`Error ${diagnostic.code} ${fileInfo} :`), ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
//   const out = ts.formatDiagnosticsWithColorAndContext([diagnostic], {
//     getCanonicalFileName: fileName => realPathOf(fileName, commonRootDir, packageDirTree, true) || fileName,
//     getCurrentDirectory: ts.sys.getCurrentDirectory,
//     getNewLine: () => ts.sys.newLine
//   });
//   console.error(out);
// }
// function reportWatchStatusChanged(diagnostic: _ts.Diagnostic, ts: typeof _ts = _ts) {
//   console.info(chalk.cyan(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost)));
// }
const COMPILER_OPTIONS_MERGE_EXCLUDE = new Set(['baseUrl', 'typeRoots', 'paths', 'rootDir']);
function setupCompilerOptionsWithPackages(compilerOptions, basePath, opts, ts = typescript_1.default) {
    let wsKey = (0, package_mgr_1.workspaceKey)(misc_1.plinkEnv.workDir);
    if (!(0, package_mgr_1.getState)().workspaces.has(wsKey))
        wsKey = (0, package_mgr_1.getState)().currWorkspace;
    if (wsKey == null) {
        throw new Error(`Current directory "${misc_1.plinkEnv.workDir}" is not a work space`);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.mergeTsconfig) {
        const json = (0, ts_cmd_util_1.mergeBaseUrlAndPaths)(ts, opts.mergeTsconfig, basePath, compilerOptions);
        for (const [key, value] of Object.entries(json.compilerOptions)) {
            if (!COMPILER_OPTIONS_MERGE_EXCLUDE.has(key)) {
                compilerOptions[key] = value;
                log.debug('merge compiler options', key, value);
            }
        }
    }
    // appendTypeRoots([], cwd, compilerOptions, {});
    (0, package_list_helper_1.setTsCompilerOptForNodePath)(basePath, './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: misc_1.plinkEnv.workDir,
        realPackagePaths: true
    });
    if (opts === null || opts === void 0 ? void 0 : opts.pathsJsons) {
        if (Array.isArray(opts.pathsJsons)) {
            compilerOptions.paths = opts.pathsJsons.reduce((pathMap, jsonStr) => {
                Object.assign(pathMap, JSON.parse(jsonStr));
                return pathMap;
            }, compilerOptions.paths);
        }
        else {
            Object.assign(compilerOptions.paths, opts.pathsJsons);
        }
    }
    // if (compilerOptions.paths == null)
    //   compilerOptions.paths = {};
    // compilerOptions.paths['*'] = ['node_modules/*'];
    if (opts === null || opts === void 0 ? void 0 : opts.compilerOptions) {
        for (const [prop, value] of Object.entries(opts.compilerOptions)) {
            if (prop === 'baseUrl') {
                continue;
            }
            if (prop === 'paths') {
                if (compilerOptions.paths)
                    Object.assign(compilerOptions.paths, value);
                else
                    compilerOptions.paths = value;
            }
            else {
                compilerOptions[prop] = value;
            }
        }
    }
}
/**
 * Return real path of targeting file, return null if targeting file is not in our compiliation scope
 * @param fileName
 * @param commonRootDir
 * @param packageDirTree
 */
function realPathOf(fileName, commonRootDir, packageDirTree, isSrcFile = false) {
    const treePath = (0, path_1.relative)(commonRootDir, fileName);
    const _originPath = fileName; // absolute path
    const foundPkgInfo = packageDirTree.getAllData(treePath).pop();
    if (foundPkgInfo == null) {
        // this file is not part of source package.
        // log.info('Not part of entry files', fileName);
        return null;
    }
    const { srcDir, destDir, pkgDir, isomDir } = foundPkgInfo;
    const pathWithinPkg = (0, path_1.relative)(pkgDir, _originPath);
    if (srcDir === '.' || srcDir.length === 0) {
        fileName = (0, path_1.join)(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg);
    }
    else if (pathWithinPkg.startsWith(srcDir + path_1.sep)) {
        fileName = (0, path_1.join)(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg.slice(srcDir.length + 1));
    }
    else if (isomDir && pathWithinPkg.startsWith(isomDir + path_1.sep)) {
        fileName = (0, path_1.join)(pkgDir, isomDir, pathWithinPkg.slice(isomDir.length + 1));
    }
    return fileName;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCx1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsOENBQWdDO0FBQ2hDLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsNERBQTBDO0FBQzFDLDZEQUF1RDtBQUN2RCxvREFBNEI7QUFDNUIsdUNBQXdFO0FBQ3hFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsK0NBQWtFO0FBQ2xFLDhEQUFnRDtBQUNoRCwrQ0FBbUQ7QUFDbkQseURBQStDO0FBQy9DLG1EQUErQztBQUMvQywrQ0FBa0Q7QUFDbEQsaUVBQW9EO0FBR3BELE1BQU0sRUFBQyxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFDbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUEyQnRDLEtBQUssVUFBVSxHQUFHLENBQUMsSUFBaUIsRUFBRSxLQUFpQixvQkFBRztJQUMvRCxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQy9CLE1BQU0sZUFBZSxHQUFhLEVBQUUsQ0FBQztJQUVyQyxNQUFNLFdBQVcsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUVsSCxNQUFNLGNBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQWtCLENBQUM7SUFDckQsTUFBTSxhQUFhLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQztJQUN2QywwQ0FBMEM7SUFFMUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLElBQUksUUFBbUMsQ0FBQztJQUN4QyxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFD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R0FBRyxVQUFHLENBQUMsRUFBRTtRQUNqRCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7ZGVmYXVsdCBhcyBfdHN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZywgUGFja2FnZVRzRGlycywgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBhbGxQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7bWVyZ2VCYXNlVXJsQW5kUGF0aHN9IGZyb20gJy4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7YW5hbHlzZUZpbGVzfSBmcm9tICcuL2NtZC9jbGktYW5hbHl6ZSc7XG5pbXBvcnQge2xhbmd1YWdlU2VydmljZXN9IGZyb20gJy4vdXRpbHMvdHNjLXV0aWwnO1xuaW1wb3J0IHtleGl0SG9va3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuZXhwb3J0IHtSZXF1aXJlZENvbXBpbGVyT3B0aW9uc307XG5cbmNvbnN0IHtzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzLWNtZCcpO1xuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICAvKiogbWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZSAqL1xuICBtZXJnZVRzY29uZmlnPzogc3RyaW5nO1xuICAvKiogSlNPTiBzdHJpbmcsIHRvIGJlIG1lcmdlZCB0byBjb21waWxlck9wdGlvbnMgXCJwYXRoc1wiLFxuICAgKiBiZSBhd2FyZSB0aGF0IFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gXCJiYXNlVXJsXCIgd2hpY2ggaXMgcmVsYXRpdmUgdG8gYFBsaW5rRW52LndvcmtEaXJgXG4gICAqICovXG4gIHBhdGhzSnNvbnM/OiBBcnJheTxzdHJpbmc+IHwge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIC8qKlxuICAgKiBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkLCBleGNlcHQgXCJiYXNlVXJsXCIuXG4gICAqIFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gYHBsaW5rRW52LndvcmtEaXJgXG4gICAqL1xuICBjb21waWxlck9wdGlvbnM/OiBhbnk7XG4gIG92ZXJyaWRlUGFja2dlRGlycz86IHtbcGtnTmFtZTogc3RyaW5nXTogUGFja2FnZVRzRGlyc307XG59XG5cbmludGVyZmFjZSBQYWNrYWdlRGlySW5mbyBleHRlbmRzIFBhY2thZ2VUc0RpcnMge1xuICBwa2dEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHNjKGFyZ3Y6IFRzY0NtZFBhcmFtLCB0czogdHlwZW9mIF90cyA9IF90cyApOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2F0Y2hEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBpbmNsdWRlUGF0dGVybnM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIFBhY2thZ2VEaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG5cbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4oKTtcbiAgY29uc3QgY29tbW9uUm9vdERpciA9IHBsaW5rRW52LndvcmtEaXI7XG4gIC8vIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwbGlua0Vudi5yb290RGlyO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGxldCBwa2dJbmZvczogUGFja2FnZUluZm9bXSB8IHVuZGVmaW5lZDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhhcmd2LnBhY2thZ2UpKS5maWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oYWxsUGFja2FnZXMoJyonLCAnc3JjJywgYXJndi5wcm9qZWN0KSk7XG4gIH0gZWxzZSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpciwgZmFsc2UpKTtcbiAgfVxuICAvLyBjb25zdCBjb21tb25Sb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwa2dJbmZvcy5tYXAocGtnID0+IHBrZy5yZWFsUGF0aCkpO1xuICBhd2FpdCBQcm9taXNlLmFsbChwa2dJbmZvcy5tYXAocGtnID0+IG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCkpKTtcbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLnBrZ0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNvdXJjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cblxuICAvLyBjb25zdCBkZXN0RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBjb21tb25Sb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLyoqIHNldCBjb21wR2xvYnMgKi9cbiAgYXN5bmMgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXVxuICAgICAgOiBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICAvLyBGb3Igd29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM3OTYwXG4gICAgLy8gVXNlIGEgc3ltbGluayBwYXRoIGluc3RlYWQgb2YgYSByZWFsIHBhdGgsIHNvIHRoYXQgVHlwZXNjcmlwdCBjb21waWxlciB3aWxsIG5vdFxuICAgIC8vIHJlY29nbml6ZSB0aGVtIGFzIGZyb20gc29tZXdoZXJlIHdpdGggXCJub2RlX21vZHVsZXNcIiwgdGhlIHN5bWxpbmsgbXVzdCBiZSByZXNpZGVcbiAgICAvLyBpbiBkaXJlY3Rvcnkgd2hpY2ggZG9lcyBub3QgY29udGFpbiBcIm5vZGVfbW9kdWxlc1wiIGFzIHBhcnQgb2YgYWJzb2x1dGUgcGF0aC5cbiAgICBjb25zdCBzeW1saW5rRGlyID0gcmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgbmFtZSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGgsIHN5bWxpbmtEaXJ9KTtcblxuICAgIGNvbnN0IHNyY0RpcnMgPSBbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgaWYgKHNyY0RpciA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihyZWFsUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHNyY0RpcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc3ltbGlua0RpcikpIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyBkaXJlY3RvcnkgJHtjaGFsay5yZWQoc3ltbGlua0Rpcil9LGAgK1xuICAgICAgICBgIGl0IGlzIHBvc3NpYmxlIHRoYXQgcGFja2FnZSAke25hbWV9IGlzIHlldCBub3QgYWRkZWQgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZSdzIHBhY2thZ2UuanNvbiBmaWxlLGAgK1xuICAgICAgICAnIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UgaXMgbm90IHN5bmNlZCB5ZXQsIHRyeSBcInN5bmNcIi9cImluaXRcIiBjb21tYW5kIHBsZWFzZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyB0cyBzb3VyY2UgZGlyZWN0b3J5IGZvdW5kIGZvciBwYWNrYWdlICR7Y2hhbGsucmVkKG5hbWUpfTpgICtcbiAgICAgICAgICBgICR7W3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpLmpvaW4oJywgJyl9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRzY0NmZy5maWxlcykge1xuICAgICAgY29uc3QgZmlsZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuZmlsZXMpO1xuICAgICAgY29uc3QgYVJlcyA9IGF3YWl0IGFuYWx5c2VGaWxlcyhmaWxlcy5tYXAoZmlsZSA9PiByZXNvbHZlKHN5bWxpbmtEaXIsIGZpbGUpKSwgYXJndi5tZXJnZVRzY29uZmlnLCBbXSk7XG4gICAgICBsb2cuZGVidWcoJ2FuYWx5emVkIGZpbGVzOicsIGFSZXMpO1xuICAgICAgaWYgKGFSZXMpIHtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2goLi4uKGFSZXMuZmlsZXMuZmlsdGVyKGZpbGUgPT4gZmlsZS5zdGFydHNXaXRoKHN5bWxpbmtEaXIgKyBzZXApICYmICEvXFwuKD86anN4P3xkXFwudHMpJC8udGVzdChmaWxlKSlcbiAgICAgICAgICAubWFwKGZpbGUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykpKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgIGNvbnN0IHBhdHRlcm5zID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmluY2x1ZGUpO1xuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XG4gICAgICAgIGNvbnN0IGdsb2JQYXR0ZXJuID0gcmVzb2x2ZShzeW1saW5rRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGluY2x1ZGVQYXR0ZXJucy5wdXNoKGdsb2JQYXR0ZXJuKTtcbiAgICAgICAgLy8gZ2xvYi5zeW5jKGdsb2JQYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRzY0NmZy5maWxlcyA9PSBudWxsICYmIHRzY0NmZy5pbmNsdWRlID09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnMpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUocmVhbFBhdGgsIHNyY0RpciEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCk7XG4gICAgICAgIC8vIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzJykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIC8vIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAvLyAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzeCcpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3Qge2FjdGlvbiQsIG9mVHlwZSwgZGlzcGF0Y2hGYWN0b3J5fSA9IGxhbmd1YWdlU2VydmljZXModHMsIHtcbiAgICB0cmFuc2Zvcm1Tb3VyY2VGaWxlKGZpbGUsIGNvbnRlbnQpIHtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCk7XG4gICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICBsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKGN3ZCwgZmlsZSkgKyAnIGlzIHBhdGNoZWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgIH0sXG4gICAgdHNjT3B0czoge1xuICAgICAganN4OiBhcmd2LmpzeCxcbiAgICAgIGlubGluZVNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWQsXG4gICAgICBiYXNlUGF0aDogY29tbW9uUm9vdERpcixcbiAgICAgIGNoYW5nZUNvbXBpbGVyT3B0aW9ucyhjbykge1xuICAgICAgICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjbyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpci5yZXBsYWNlKC9cXFxcL2csICcvJyksIGFyZ3YsIHRzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5cbiAgY29uc3Qgd3JpdHRlbkZpbGUkID0gbmV3IHJ4LlN1YmplY3Q8c3RyaW5nPigpO1xuXG4gIGZ1bmN0aW9uIGRlYWxDb21tb25Kb2IoKSB7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ29uQ29tcGlsZXJPcHRpb25zJyksXG4gICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IGNvbXBpbGVyT3B0aW9uc30pID0+IHtcbiAgICAgICAgICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnX2VtaXRGaWxlJyksXG4gICAgICAgIG9wLm1hcChhc3luYyAoe3BheWxvYWQ6IFtmaWxlLCBjb250ZW50XX0pID0+IHtcbiAgICAgICAgICBjb25zdCBkZXN0RmlsZSA9IHJlYWxQYXRoT2YoZmlsZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGZhbHNlKTtcbiAgICAgICAgICBpZiAoZGVzdEZpbGUgPT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB3cml0dGVuRmlsZSQubmV4dChkZXN0RmlsZSk7XG4gICAgICAgICAgbG9nLmluZm8oJ2VtaXQgZmlsZScsIFBhdGgucmVsYXRpdmUoY3dkLCBkZXN0RmlsZSkpO1xuICAgICAgICAgIGF3YWl0IGZzZS5ta2RpcnAoUGF0aC5kaXJuYW1lKGRlc3RGaWxlKSk7XG4gICAgICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoZGVzdEZpbGUsIGNvbnRlbnQpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdvbkVtaXRGYWlsdXJlJyksXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlLCBtc2csIHR5cGVdfSkgPT4ge1xuICAgICAgICAgIGxvZy5lcnJvcihgWyR7dHlwZX1dIGAgKyBtc2cpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdvblN1Z2dlc3QnKSxcbiAgICAgICAgb3AubWFwKCh7cGF5bG9hZDogW19maWxlTmFtZSwgbXNnXX0pID0+IHtcbiAgICAgICAgICBsb2cud2Fybihtc2cpO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG5cbiAgICByeC5tZXJnZShcbiAgICAgIGRlYWxDb21tb25Kb2IoKVxuICAgICkuc3Vic2NyaWJlKCk7XG4gICAgZXhpdEhvb2tzLnB1c2goKCkgPT4gZGlzcGF0Y2hGYWN0b3J5KCdzdG9wJykoKSk7XG4gICAgZGlzcGF0Y2hGYWN0b3J5KCd3YXRjaCcpKFsuLi53YXRjaERpcnMsIC4uLmluY2x1ZGVQYXR0ZXJuc10pO1xuICAgIC8vIHdhdGNoKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbWl0dGVkID0gW10gYXMgc3RyaW5nW107XG4gICAgcngubWVyZ2UoXG4gICAgICBkZWFsQ29tbW9uSm9iKCksXG4gICAgICB3cml0dGVuRmlsZSQucGlwZShcbiAgICAgICAgb3AubWFwKGZpbGUgPT4gZW1pdHRlZC5wdXNoKGZpbGUpKVxuICAgICAgKVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiB3YXRjaERpcnMpIHtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmdsb2Iuc3luYyhkaXIgKyAnLyoqLyoudHMnKSk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2goLi4uZ2xvYi5zeW5jKGRpciArICcvKiovKi50c3gnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcGF0IG9mIGluY2x1ZGVQYXR0ZXJucykge1xuICAgICAgcm9vdEZpbGVzLnB1c2goLi4ucGF0KTtcbiAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICByb290RmlsZXMucHVzaCguLi5wYXQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGZpbGUgb2Ygcm9vdEZpbGVzKSB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ2FkZFNvdXJjZUZpbGUnKShmaWxlLCB0cnVlKTtcbiAgICB9XG4gICAgd3JpdHRlbkZpbGUkLmNvbXBsZXRlKCk7XG4gICAgLy8gY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gIH1cbn1cblxuLy8gY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbi8vICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IHBhdGggPT4gcGF0aCxcbi8vICAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuLy8gICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbi8vIH07XG5cbi8vIGZ1bmN0aW9uIHdhdGNoKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbi8vICAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuLy8gICAgIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuLy8gICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4vLyAgIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4vLyAgICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbi8vICAgfVxuLy8gICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsXG4vLyAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSVxuLy8gICAgIC8vIFR5cGVTY3JpcHQgY2FuIHVzZSBzZXZlcmFsIGRpZmZlcmVudCBwcm9ncmFtIGNyZWF0aW9uIFwic3RyYXRlZ2llc1wiOlxuLy8gICAgIC8vICAqIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sXG4vLyAgICAgLy8gICogdHMuY3JlYXRlU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtXG4vLyAgICAgLy8gICogdHMuY3JlYXRlQWJzdHJhY3RCdWlsZGVyXG4vLyAgICAgLy8gVGhlIGZpcnN0IHR3byBwcm9kdWNlIFwiYnVpbGRlciBwcm9ncmFtc1wiLiBUaGVzZSB1c2UgYW4gaW5jcmVtZW50YWwgc3RyYXRlZ3lcbi8vICAgICAvLyB0byBvbmx5IHJlLWNoZWNrIGFuZCBlbWl0IGZpbGVzIHdob3NlIGNvbnRlbnRzIG1heSBoYXZlIGNoYW5nZWQsIG9yIHdob3NlXG4vLyAgICAgLy8gZGVwZW5kZW5jaWVzIG1heSBoYXZlIGNoYW5nZXMgd2hpY2ggbWF5IGltcGFjdCBjaGFuZ2UgdGhlIHJlc3VsdCBvZiBwcmlvclxuLy8gICAgIC8vIHR5cGUtY2hlY2sgYW5kIGVtaXQuXG4vLyAgICAgLy8gVGhlIGxhc3QgdXNlcyBhbiBvcmRpbmFyeSBwcm9ncmFtIHdoaWNoIGRvZXMgYSBmdWxsIHR5cGUgY2hlY2sgYWZ0ZXIgZXZlcnlcbi8vICAgICAvLyBjaGFuZ2UuXG4vLyAgICAgLy8gQmV0d2VlbiBgY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAgYW5kXG4vLyAgICAgLy8gYGNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAsIHRoZSBvbmx5IGRpZmZlcmVuY2UgaXMgZW1pdC5cbi8vICAgICAvLyBGb3IgcHVyZSB0eXBlLWNoZWNraW5nIHNjZW5hcmlvcywgb3Igd2hlbiBhbm90aGVyIHRvb2wvcHJvY2VzcyBoYW5kbGVzIGVtaXQsXG4vLyAgICAgLy8gdXNpbmcgYGNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAgbWF5IGJlIG1vcmUgZGVzaXJhYmxlXG4vLyAgICAgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSwgX3JlcG9ydERpYWdub3N0aWMsIGQgPT4gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGQsIHRzKSxcbi8vICAgICB1bmRlZmluZWQsIHt3YXRjaERpcmVjdG9yeTogdHMuV2F0Y2hEaXJlY3RvcnlLaW5kLlVzZUZzRXZlbnRzfSk7XG4vLyAgIHBhdGNoV2F0Y2hDb21waWxlckhvc3QocHJvZ3JhbUhvc3QpO1xuXG4vLyAgIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbi8vICAgLy8gVHMncyBjcmVhdGVXYXRjaFByb2dyYW0gd2lsbCBjYWxsIFdhdGNoQ29tcGlsZXJIb3N0LmNyZWF0ZVByb2dyYW0oKSwgdGhpcyBpcyB3aGVyZSB3ZSBwYXRjaCBcIkNvbXBpbGVySG9zdFwiXG4vLyAgIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4vLyAgICAgaG9zdD86IF90cy5Db21waWxlckhvc3QsIC4uLnJlc3Q6IGFueVtdKSB7XG4vLyAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuLy8gICAgIGlmIChob3N0ICYmIChob3N0IGFzIGFueSkuX292ZXJyaWRlZCA9PSBudWxsKSB7XG4vLyAgICAgICBwYXRjaENvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zLCB0cyk7XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHByb2dyYW0gPSBvcmlnQ3JlYXRlUHJvZ3JhbS5jYWxsKHRoaXMsIHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgLi4ucmVzdCkgO1xuLy8gICAgIHJldHVybiBwcm9ncmFtO1xuLy8gICB9O1xuXG4vLyAgIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGNvbXBpbGUocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuLy8gICB0czogdHlwZW9mIF90cyA9IF90cykge1xuLy8gICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4vLyAgICAgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4vLyAgICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG4vLyAgIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcbi8vICAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0KTtcbi8vICAgY29uc3QgZW1pdHRlZCA9IHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMsIHRzKTtcbi8vICAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGhvc3QpO1xuLy8gICBjb25zdCBlbWl0UmVzdWx0ID0gcHJvZ3JhbS5lbWl0KCk7XG4vLyAgIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdHMuZ2V0UHJlRW1pdERpYWdub3N0aWNzKHByb2dyYW0pXG4vLyAgICAgLmNvbmNhdChlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcblxuLy8gICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuLy8gICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4vLyAgIH1cbi8vICAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbi8vICAgICBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbi8vICAgfSk7XG4vLyAgIGlmIChlbWl0UmVzdWx0LmVtaXRTa2lwcGVkKSB7XG4vLyAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21waWxlIGZhaWxlZCcpO1xuLy8gICB9XG4vLyAgIHJldHVybiBlbWl0dGVkO1xuLy8gfVxuXG4vKiogT3ZlcnJpZGluZyBXcml0ZUZpbGUoKSAqL1xuLy8gZnVuY3Rpb24gcGF0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLkNvbXBpbGVySG9zdCwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4vLyAgIGNvOiBfdHMuQ29tcGlsZXJPcHRpb25zLCB0czogdHlwZW9mIF90cyA9IF90cyk6IHN0cmluZ1tdIHtcbi8vICAgY29uc3QgZW1pdHRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4vLyAgIC8vIEl0IHNlZW1zIHRvIG5vdCBhYmxlIHRvIHdyaXRlIGZpbGUgdGhyb3VnaCBzeW1saW5rIGluIFdpbmRvd3Ncbi8vICAgLy8gY29uc3QgX3dyaXRlRmlsZSA9IGhvc3Qud3JpdGVGaWxlO1xuLy8gICBjb25zdCB3cml0ZUZpbGU6IF90cy5Xcml0ZUZpbGVDYWxsYmFjayA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSB7XG4vLyAgICAgY29uc3QgZGVzdEZpbGUgPSByZWFsUGF0aE9mKGZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4vLyAgICAgaWYgKGRlc3RGaWxlID09IG51bGwpIHtcbi8vICAgICAgIGxvZy5kZWJ1Zygnc2tpcCcsIGZpbGVOYW1lKTtcbi8vICAgICAgIHJldHVybjtcbi8vICAgICB9XG4vLyAgICAgZW1pdHRlZExpc3QucHVzaChkZXN0RmlsZSk7XG4vLyAgICAgbG9nLmluZm8oJ3dyaXRlIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGRlc3RGaWxlKSk7XG4vLyAgICAgLy8gVHlwZXNjcmlwdCdzIHdyaXRlRmlsZSgpIGZ1bmN0aW9uIHBlcmZvcm1zIHdlaXJkIHdpdGggc3ltbGlua3MgdW5kZXIgd2F0Y2ggbW9kZSBpbiBXaW5kb3dzOlxuLy8gICAgIC8vIEV2ZXJ5IHRpbWUgYSB0cyBmaWxlIGlzIGNoYW5nZWQsIGl0IHRyaWdnZXJzIHRoZSBzeW1saW5rIGJlaW5nIGNvbXBpbGVkIGFuZCB0byBiZSB3cml0dGVuIHdoaWNoIGlzXG4vLyAgICAgLy8gYXMgZXhwZWN0ZWQgYnkgbWUsXG4vLyAgICAgLy8gYnV0IGxhdGUgb24gaXQgdHJpZ2dlcnMgdGhlIHNhbWUgcmVhbCBmaWxlIGFsc28gYmVpbmcgd3JpdHRlbiBpbW1lZGlhdGVseSwgdGhpcyBpcyBub3Qgd2hhdCBJIGV4cGVjdCxcbi8vICAgICAvLyBhbmQgaXQgZG9lcyBub3QgYWN0dWFsbHkgd3JpdGUgb3V0IGFueSBjaGFuZ2VzIHRvIGZpbmFsIEpTIGZpbGUuXG4vLyAgICAgLy8gU28gSSBkZWNpZGUgdG8gdXNlIG9yaWdpbmFsIE5vZGUuanMgZmlsZSBzeXN0ZW0gQVBJXG4vLyAgICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZGVzdEZpbGUpKTtcbi8vICAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3RGaWxlLCBkYXRhKTtcbi8vICAgICAvLyBJdCBzZWVtcyBUeXBlc2NyaXB0IGNvbXBpbGVyIGFsd2F5cyB1c2VzIHNsYXNoIGluc3RlYWQgb2YgYmFjayBzbGFzaCBpbiBmaWxlIHBhdGgsIGV2ZW4gaW4gV2luZG93c1xuLy8gICAgIC8vIHJldHVybiBfd3JpdGVGaWxlLmNhbGwodGhpcywgZGVzdEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCAuLi5BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbi8vICAgfTtcbi8vICAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZUZpbGU7XG5cbi8vICAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5XYXRjaENvbXBpbGVySG9zdE9mRmlsZXNBbmRDb21waWxlck9wdGlvbnM8X3RzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0+IHwgX3RzLkNvbXBpbGVySG9zdCkge1xuLy8gICBjb25zdCByZWFkRmlsZSA9IGhvc3QucmVhZEZpbGU7XG4vLyAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4vLyAgIGhvc3QucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKSB7XG4vLyAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlLmNhbGwodGhpcywgcGF0aCwgZW5jb2RpbmcpIDtcbi8vICAgICBpZiAoY29udGVudCAmJiAhcGF0aC5lbmRzV2l0aCgnLmQudHMnKSAmJiAhcGF0aC5lbmRzV2l0aCgnLmpzb24nKSkge1xuLy8gICAgICAgLy8gY29uc29sZS5sb2coJ1dhdGNoQ29tcGlsZXJIb3N0LnJlYWRGaWxlJywgcGF0aCk7XG4vLyAgICAgICBjb25zdCBjaGFuZ2VkID0gd2ViSW5qZWN0b3IuaW5qZWN0VG9GaWxlKHBhdGgsIGNvbnRlbnQpO1xuLy8gICAgICAgaWYgKGNoYW5nZWQgIT09IGNvbnRlbnQpIHtcbi8vICAgICAgICAgbG9nLmluZm8oUGF0aC5yZWxhdGl2ZShjd2QsIHBhdGgpICsgJyBpcyBwYXRjaGVkJyk7XG4vLyAgICAgICAgIHJldHVybiBjaGFuZ2VkO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgICByZXR1cm4gY29udGVudDtcbi8vICAgfTtcbi8vIH1cblxuXG4vLyBmdW5jdGlvbiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbi8vICAgLy8gbGV0IGZpbGVJbmZvID0gJyc7XG4vLyAgIC8vIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbi8vICAgLy8gICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4vLyAgIC8vICAgY29uc3QgcmVhbEZpbGUgPSByZWFsUGF0aE9mKGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZTtcbi8vICAgLy8gICBmaWxlSW5mbyA9IGAke3JlYWxGaWxlfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4vLyAgIC8vIH1cbi8vICAgLy8gY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG4vLyAgIGNvbnN0IG91dCA9IHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbZGlhZ25vc3RpY10sIHtcbi8vICAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogZmlsZU5hbWUgPT4gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGZpbGVOYW1lLFxuLy8gICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6IHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuLy8gICAgIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lXG4vLyAgIH0pO1xuLy8gICBjb25zb2xlLmVycm9yKG91dCk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbi8vICAgY29uc29sZS5pbmZvKGNoYWxrLmN5YW4odHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFtkaWFnbm9zdGljXSwgZm9ybWF0SG9zdCkpKTtcbi8vIH1cblxuY29uc3QgQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFID0gbmV3IFNldChbJ2Jhc2VVcmwnLCAndHlwZVJvb3RzJywgJ3BhdGhzJywgJ3Jvb3REaXInXSk7XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIGJhc2VQYXRoOiBzdHJpbmcsIG9wdHM/OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpOiB2b2lkIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ3VycmVudCBkaXJlY3RvcnkgXCIke3BsaW5rRW52LndvcmtEaXJ9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG9wdHM/Lm1lcmdlVHNjb25maWcpIHtcbiAgICBjb25zdCBqc29uID0gbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG9wdHMubWVyZ2VUc2NvbmZpZywgYmFzZVBhdGgsIGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoanNvbi5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAoIUNPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERS5oYXMoa2V5KSkge1xuICAgICAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlO1xuICAgICAgICBsb2cuZGVidWcoJ21lcmdlIGNvbXBpbGVyIG9wdGlvbnMnLCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhcHBlbmRUeXBlUm9vdHMoW10sIGN3ZCwgY29tcGlsZXJPcHRpb25zLCB7fSk7XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChiYXNlUGF0aCwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogcGxpbmtFbnYud29ya0RpcixcbiAgICByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gIH0pO1xuXG4gIGlmIChvcHRzPy5wYXRoc0pzb25zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0cy5wYXRoc0pzb25zKSkge1xuICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gb3B0cy5wYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgICAgICBPYmplY3QuYXNzaWduKHBhdGhNYXAsIEpTT04ucGFyc2UoanNvblN0cikpO1xuICAgICAgICByZXR1cm4gcGF0aE1hcDtcbiAgICAgIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvcHRzLnBhdGhzSnNvbnMpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIChjb21waWxlck9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgLy8gICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB7fTtcbiAgLy8gY29tcGlsZXJPcHRpb25zLnBhdGhzWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJ107XG5cbiAgaWYgKG9wdHM/LmNvbXBpbGVyT3B0aW9ucykge1xuICAgIGZvciAoY29uc3QgW3Byb3AsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRzLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmIChwcm9wID09PSAnYmFzZVVybCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gJ3BhdGhzJykge1xuICAgICAgICBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzKVxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxlck9wdGlvbnNbcHJvcF0gPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHJlYWwgcGF0aCBvZiB0YXJnZXRpbmcgZmlsZSwgcmV0dXJuIG51bGwgaWYgdGFyZ2V0aW5nIGZpbGUgaXMgbm90IGluIG91ciBjb21waWxpYXRpb24gc2NvcGVcbiAqIEBwYXJhbSBmaWxlTmFtZSBcbiAqIEBwYXJhbSBjb21tb25Sb290RGlyIFxuICogQHBhcmFtIHBhY2thZ2VEaXJUcmVlIFxuICovXG5mdW5jdGlvbiByZWFsUGF0aE9mKGZpbGVOYW1lOiBzdHJpbmcsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBpc1NyY0ZpbGUgPSBmYWxzZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGVOYW1lKTtcbiAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICBjb25zdCBmb3VuZFBrZ0luZm8gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKTtcbiAgaWYgKGZvdW5kUGtnSW5mbyA9PSBudWxsKSB7XG4gICAgLy8gdGhpcyBmaWxlIGlzIG5vdCBwYXJ0IG9mIHNvdXJjZSBwYWNrYWdlLlxuICAgIC8vIGxvZy5pbmZvKCdOb3QgcGFydCBvZiBlbnRyeSBmaWxlcycsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3JjRGlyLCBkZXN0RGlyLCBwa2dEaXIsIGlzb21EaXJ9ID0gZm91bmRQa2dJbmZvO1xuXG4gIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShwa2dEaXIsIF9vcmlnaW5QYXRoKTtcblxuICBpZiAoc3JjRGlyID09PSAnLicgfHwgc3JjRGlyLmxlbmd0aCA9PT0gMCkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChzcmNEaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShzcmNEaXIubGVuZ3RoICsgMSkpO1xuICB9IGVsc2UgaWYgKGlzb21EaXIgJiYgcGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKGlzb21EaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNvbURpciwgcGF0aFdpdGhpblBrZy5zbGljZShpc29tRGlyLmxlbmd0aCArIDEpKTtcbiAgfVxuICByZXR1cm4gZmlsZU5hbWU7XG59XG4iXX0=