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
            inlineSourceMap: false,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCx1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsOENBQWdDO0FBQ2hDLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsNERBQTBDO0FBQzFDLDZEQUF1RDtBQUN2RCxvREFBNEI7QUFDNUIsdUNBQXdFO0FBQ3hFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsK0NBQWtFO0FBQ2xFLDhEQUFnRDtBQUNoRCwrQ0FBbUQ7QUFDbkQseURBQStDO0FBQy9DLG1EQUErQztBQUMvQywrQ0FBa0Q7QUFDbEQsaUVBQW9EO0FBR3BELE1BQU0sRUFBQyxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFDbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUEyQnRDLEtBQUssVUFBVSxHQUFHLENBQUMsSUFBaUIsRUFBRSxLQUFpQixvQkFBRztJQUMvRCxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQy9CLE1BQU0sZUFBZSxHQUFhLEVBQUUsQ0FBQztJQUVyQyxNQUFNLFdBQVcsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUVsSCxNQUFNLGNBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQWtCLENBQUM7SUFDckQsTUFBTSxhQUFhLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQztJQUN2QywwQ0FBMEM7SUFFMUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLElBQUksUUFBbUMsQ0FBQztJQUN4QyxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFD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R0FBRyxVQUFHLENBQUMsRUFBRTtRQUNqRCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7ZGVmYXVsdCBhcyBfdHN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZywgUGFja2FnZVRzRGlycywgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBhbGxQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7bWVyZ2VCYXNlVXJsQW5kUGF0aHN9IGZyb20gJy4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7YW5hbHlzZUZpbGVzfSBmcm9tICcuL2NtZC9jbGktYW5hbHl6ZSc7XG5pbXBvcnQge2xhbmd1YWdlU2VydmljZXN9IGZyb20gJy4vdXRpbHMvdHNjLXV0aWwnO1xuaW1wb3J0IHtleGl0SG9va3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuZXhwb3J0IHtSZXF1aXJlZENvbXBpbGVyT3B0aW9uc307XG5cbmNvbnN0IHtzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzLWNtZCcpO1xuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICAvKiogbWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZSAqL1xuICBtZXJnZVRzY29uZmlnPzogc3RyaW5nO1xuICAvKiogSlNPTiBzdHJpbmcsIHRvIGJlIG1lcmdlZCB0byBjb21waWxlck9wdGlvbnMgXCJwYXRoc1wiLFxuICAgKiBiZSBhd2FyZSB0aGF0IFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gXCJiYXNlVXJsXCIgd2hpY2ggaXMgcmVsYXRpdmUgdG8gYFBsaW5rRW52LndvcmtEaXJgXG4gICAqICovXG4gIHBhdGhzSnNvbnM/OiBBcnJheTxzdHJpbmc+IHwge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIC8qKlxuICAgKiBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkLCBleGNlcHQgXCJiYXNlVXJsXCIuXG4gICAqIFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gYHBsaW5rRW52LndvcmtEaXJgXG4gICAqL1xuICBjb21waWxlck9wdGlvbnM/OiBhbnk7XG4gIG92ZXJyaWRlUGFja2dlRGlycz86IHtbcGtnTmFtZTogc3RyaW5nXTogUGFja2FnZVRzRGlyc307XG59XG5cbmludGVyZmFjZSBQYWNrYWdlRGlySW5mbyBleHRlbmRzIFBhY2thZ2VUc0RpcnMge1xuICBwa2dEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHNjKGFyZ3Y6IFRzY0NtZFBhcmFtLCB0czogdHlwZW9mIF90cyA9IF90cyApOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgd2F0Y2hEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBpbmNsdWRlUGF0dGVybnM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIFBhY2thZ2VEaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG5cbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4oKTtcbiAgY29uc3QgY29tbW9uUm9vdERpciA9IHBsaW5rRW52LndvcmtEaXI7XG4gIC8vIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwbGlua0Vudi5yb290RGlyO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGxldCBwa2dJbmZvczogUGFja2FnZUluZm9bXSB8IHVuZGVmaW5lZDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhhcmd2LnBhY2thZ2UpKS5maWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oYWxsUGFja2FnZXMoJyonLCAnc3JjJywgYXJndi5wcm9qZWN0KSk7XG4gIH0gZWxzZSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpciwgZmFsc2UpKTtcbiAgfVxuICAvLyBjb25zdCBjb21tb25Sb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwa2dJbmZvcy5tYXAocGtnID0+IHBrZy5yZWFsUGF0aCkpO1xuICBhd2FpdCBQcm9taXNlLmFsbChwa2dJbmZvcy5tYXAocGtnID0+IG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCkpKTtcbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLnBrZ0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNvdXJjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cblxuICAvLyBjb25zdCBkZXN0RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBjb21tb25Sb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLyoqIHNldCBjb21wR2xvYnMgKi9cbiAgYXN5bmMgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXVxuICAgICAgOiBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICAvLyBGb3Igd29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM3OTYwXG4gICAgLy8gVXNlIGEgc3ltbGluayBwYXRoIGluc3RlYWQgb2YgYSByZWFsIHBhdGgsIHNvIHRoYXQgVHlwZXNjcmlwdCBjb21waWxlciB3aWxsIG5vdFxuICAgIC8vIHJlY29nbml6ZSB0aGVtIGFzIGZyb20gc29tZXdoZXJlIHdpdGggXCJub2RlX21vZHVsZXNcIiwgdGhlIHN5bWxpbmsgbXVzdCBiZSByZXNpZGVcbiAgICAvLyBpbiBkaXJlY3Rvcnkgd2hpY2ggZG9lcyBub3QgY29udGFpbiBcIm5vZGVfbW9kdWxlc1wiIGFzIHBhcnQgb2YgYWJzb2x1dGUgcGF0aC5cbiAgICBjb25zdCBzeW1saW5rRGlyID0gcmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgbmFtZSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGgsIHN5bWxpbmtEaXJ9KTtcblxuICAgIGNvbnN0IHNyY0RpcnMgPSBbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgaWYgKHNyY0RpciA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihyZWFsUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHNyY0RpcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc3ltbGlua0RpcikpIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyBkaXJlY3RvcnkgJHtjaGFsay5yZWQoc3ltbGlua0Rpcil9LGAgK1xuICAgICAgICBgIGl0IGlzIHBvc3NpYmxlIHRoYXQgcGFja2FnZSAke25hbWV9IGlzIHlldCBub3QgYWRkZWQgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZSdzIHBhY2thZ2UuanNvbiBmaWxlLGAgK1xuICAgICAgICAnIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UgaXMgbm90IHN5bmNlZCB5ZXQsIHRyeSBcInN5bmNcIi9cImluaXRcIiBjb21tYW5kIHBsZWFzZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyB0cyBzb3VyY2UgZGlyZWN0b3J5IGZvdW5kIGZvciBwYWNrYWdlICR7Y2hhbGsucmVkKG5hbWUpfTpgICtcbiAgICAgICAgICBgICR7W3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpLmpvaW4oJywgJyl9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRzY0NmZy5maWxlcykge1xuICAgICAgY29uc3QgZmlsZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuZmlsZXMpO1xuICAgICAgY29uc3QgYVJlcyA9IGF3YWl0IGFuYWx5c2VGaWxlcyhmaWxlcy5tYXAoZmlsZSA9PiByZXNvbHZlKHN5bWxpbmtEaXIsIGZpbGUpKSwgYXJndi5tZXJnZVRzY29uZmlnLCBbXSk7XG4gICAgICBsb2cuZGVidWcoJ2FuYWx5emVkIGZpbGVzOicsIGFSZXMpO1xuICAgICAgaWYgKGFSZXMpIHtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2goLi4uKGFSZXMuZmlsZXMuZmlsdGVyKGZpbGUgPT4gZmlsZS5zdGFydHNXaXRoKHN5bWxpbmtEaXIgKyBzZXApICYmICEvXFwuKD86anN4P3xkXFwudHMpJC8udGVzdChmaWxlKSlcbiAgICAgICAgICAubWFwKGZpbGUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykpKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgIGNvbnN0IHBhdHRlcm5zID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmluY2x1ZGUpO1xuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XG4gICAgICAgIGNvbnN0IGdsb2JQYXR0ZXJuID0gcmVzb2x2ZShzeW1saW5rRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGluY2x1ZGVQYXR0ZXJucy5wdXNoKGdsb2JQYXR0ZXJuKTtcbiAgICAgICAgLy8gZ2xvYi5zeW5jKGdsb2JQYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRzY0NmZy5maWxlcyA9PSBudWxsICYmIHRzY0NmZy5pbmNsdWRlID09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnMpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUocmVhbFBhdGgsIHNyY0RpciEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCk7XG4gICAgICAgIC8vIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzJykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIC8vIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAvLyAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzeCcpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3Qge2FjdGlvbiQsIG9mVHlwZSwgZGlzcGF0Y2hGYWN0b3J5fSA9IGxhbmd1YWdlU2VydmljZXModHMsIHtcbiAgICB0cmFuc2Zvcm1Tb3VyY2VGaWxlKGZpbGUsIGNvbnRlbnQpIHtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCk7XG4gICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICBsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKGN3ZCwgZmlsZSkgKyAnIGlzIHBhdGNoZWQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgIH0sXG4gICAgdHNjT3B0czoge1xuICAgICAganN4OiBhcmd2LmpzeCxcbiAgICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkLFxuICAgICAgYmFzZVBhdGg6IGNvbW1vblJvb3REaXIsXG4gICAgICBjaGFuZ2VDb21waWxlck9wdGlvbnMoY28pIHtcbiAgICAgICAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY28gYXMgUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLCBhcmd2LCB0cyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuXG4gIGNvbnN0IHdyaXR0ZW5GaWxlJCA9IG5ldyByeC5TdWJqZWN0PHN0cmluZz4oKTtcblxuICBmdW5jdGlvbiBkZWFsQ29tbW9uSm9iKCkge1xuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgb2ZUeXBlKCdvbkNvbXBpbGVyT3B0aW9ucycpLFxuICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiBjb21waWxlck9wdGlvbnN9KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICBvZlR5cGUoJ19lbWl0RmlsZScpLFxuICAgICAgICBvcC5tYXAoYXN5bmMgKHtwYXlsb2FkOiBbZmlsZSwgY29udGVudF19KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVzdEZpbGUgPSByZWFsUGF0aE9mKGZpbGUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBmYWxzZSk7XG4gICAgICAgICAgaWYgKGRlc3RGaWxlID09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgd3JpdHRlbkZpbGUkLm5leHQoZGVzdEZpbGUpO1xuICAgICAgICAgIGxvZy5pbmZvKCdlbWl0IGZpbGUnLCBQYXRoLnJlbGF0aXZlKGN3ZCwgZGVzdEZpbGUpKTtcbiAgICAgICAgICBhd2FpdCBmc2UubWtkaXJwKFBhdGguZGlybmFtZShkZXN0RmlsZSkpO1xuICAgICAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGRlc3RGaWxlLCBjb250ZW50KTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnb25FbWl0RmFpbHVyZScpLFxuICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiBbZmlsZSwgbXNnLCB0eXBlXX0pID0+IHtcbiAgICAgICAgICBsb2cuZXJyb3IoYFske3R5cGV9XSBgICsgbXNnKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgIG9mVHlwZSgnb25TdWdnZXN0JyksXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtfZmlsZU5hbWUsIG1zZ119KSA9PiB7XG4gICAgICAgICAgbG9nLndhcm4obXNnKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuXG4gICAgcngubWVyZ2UoXG4gICAgICBkZWFsQ29tbW9uSm9iKClcbiAgICApLnN1YnNjcmliZSgpO1xuICAgIGV4aXRIb29rcy5wdXNoKCgpID0+IGRpc3BhdGNoRmFjdG9yeSgnc3RvcCcpKCkpO1xuICAgIGRpc3BhdGNoRmFjdG9yeSgnd2F0Y2gnKShbLi4ud2F0Y2hEaXJzLCAuLi5pbmNsdWRlUGF0dGVybnNdKTtcbiAgICAvLyB3YXRjaChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHJ4Lm1lcmdlKFxuICAgICAgZGVhbENvbW1vbkpvYigpLFxuICAgICAgd3JpdHRlbkZpbGUkLnBpcGUoXG4gICAgICAgIG9wLm1hcChmaWxlID0+IGVtaXR0ZWQucHVzaChmaWxlKSlcbiAgICAgIClcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgZm9yIChjb25zdCBkaXIgb2Ygd2F0Y2hEaXJzKSB7XG4gICAgICByb290RmlsZXMucHVzaCguLi5nbG9iLnN5bmMoZGlyICsgJy8qKi8qLnRzJykpO1xuICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmdsb2Iuc3luYyhkaXIgKyAnLyoqLyoudHN4JykpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBpbmNsdWRlUGF0dGVybnMpIHtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLnBhdCk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2goLi4ucGF0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHJvb3RGaWxlcykge1xuICAgICAgZGlzcGF0Y2hGYWN0b3J5KCdhZGRTb3VyY2VGaWxlJykoZmlsZSwgdHJ1ZSk7XG4gICAgfVxuICAgIHdyaXR0ZW5GaWxlJC5jb21wbGV0ZSgpO1xuICAgIC8vIGNvbnN0IGVtaXR0ZWQgPSBjb21waWxlKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICAgIGlmIChwcm9jZXNzLnNlbmQpXG4gICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAgIHJldHVybiBlbWl0dGVkO1xuICB9XG59XG5cbi8vIGNvbnN0IGZvcm1hdEhvc3Q6IF90cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4vLyAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBwYXRoID0+IHBhdGgsXG4vLyAgIGdldEN1cnJlbnREaXJlY3Rvcnk6IF90cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbi8vICAgZ2V0TmV3TGluZTogKCkgPT4gX3RzLnN5cy5uZXdMaW5lXG4vLyB9O1xuXG4vLyBmdW5jdGlvbiB3YXRjaChyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4vLyAgIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbi8vICAgICBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbi8vICAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcblxuLy8gICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuLy8gICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4vLyAgIH1cbi8vICAgY29uc3QgcHJvZ3JhbUhvc3QgPSB0cy5jcmVhdGVXYXRjaENvbXBpbGVySG9zdChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgdHMuc3lzLFxuLy8gICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC93aWtpL1VzaW5nLXRoZS1Db21waWxlci1BUElcbi8vICAgICAvLyBUeXBlU2NyaXB0IGNhbiB1c2Ugc2V2ZXJhbCBkaWZmZXJlbnQgcHJvZ3JhbSBjcmVhdGlvbiBcInN0cmF0ZWdpZXNcIjpcbi8vICAgICAvLyAgKiB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLFxuLy8gICAgIC8vICAqIHRzLmNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbVxuLy8gICAgIC8vICAqIHRzLmNyZWF0ZUFic3RyYWN0QnVpbGRlclxuLy8gICAgIC8vIFRoZSBmaXJzdCB0d28gcHJvZHVjZSBcImJ1aWxkZXIgcHJvZ3JhbXNcIi4gVGhlc2UgdXNlIGFuIGluY3JlbWVudGFsIHN0cmF0ZWd5XG4vLyAgICAgLy8gdG8gb25seSByZS1jaGVjayBhbmQgZW1pdCBmaWxlcyB3aG9zZSBjb250ZW50cyBtYXkgaGF2ZSBjaGFuZ2VkLCBvciB3aG9zZVxuLy8gICAgIC8vIGRlcGVuZGVuY2llcyBtYXkgaGF2ZSBjaGFuZ2VzIHdoaWNoIG1heSBpbXBhY3QgY2hhbmdlIHRoZSByZXN1bHQgb2YgcHJpb3Jcbi8vICAgICAvLyB0eXBlLWNoZWNrIGFuZCBlbWl0LlxuLy8gICAgIC8vIFRoZSBsYXN0IHVzZXMgYW4gb3JkaW5hcnkgcHJvZ3JhbSB3aGljaCBkb2VzIGEgZnVsbCB0eXBlIGNoZWNrIGFmdGVyIGV2ZXJ5XG4vLyAgICAgLy8gY2hhbmdlLlxuLy8gICAgIC8vIEJldHdlZW4gYGNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW1gIGFuZFxuLy8gICAgIC8vIGBjcmVhdGVTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW1gLCB0aGUgb25seSBkaWZmZXJlbmNlIGlzIGVtaXQuXG4vLyAgICAgLy8gRm9yIHB1cmUgdHlwZS1jaGVja2luZyBzY2VuYXJpb3MsIG9yIHdoZW4gYW5vdGhlciB0b29sL3Byb2Nlc3MgaGFuZGxlcyBlbWl0LFxuLy8gICAgIC8vIHVzaW5nIGBjcmVhdGVTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW1gIG1heSBiZSBtb3JlIGRlc2lyYWJsZVxuLy8gICAgIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sIF9yZXBvcnREaWFnbm9zdGljLCBkID0+IHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkLCB0cyksXG4vLyAgICAgdW5kZWZpbmVkLCB7d2F0Y2hEaXJlY3Rvcnk6IHRzLldhdGNoRGlyZWN0b3J5S2luZC5Vc2VGc0V2ZW50c30pO1xuLy8gICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KHByb2dyYW1Ib3N0KTtcblxuLy8gICBjb25zdCBvcmlnQ3JlYXRlUHJvZ3JhbSA9IHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW07XG4vLyAgIC8vIFRzJ3MgY3JlYXRlV2F0Y2hQcm9ncmFtIHdpbGwgY2FsbCBXYXRjaENvbXBpbGVySG9zdC5jcmVhdGVQcm9ncmFtKCksIHRoaXMgaXMgd2hlcmUgd2UgcGF0Y2ggXCJDb21waWxlckhvc3RcIlxuLy8gICBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtID0gZnVuY3Rpb24ocm9vdE5hbWVzOiByZWFkb25seSBzdHJpbmdbXSB8IHVuZGVmaW5lZCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuLy8gICAgIGhvc3Q/OiBfdHMuQ29tcGlsZXJIb3N0LCAuLi5yZXN0OiBhbnlbXSkge1xuLy8gICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3Ncbi8vICAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuLy8gICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuLy8gICAgIH1cbi8vICAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uY2FsbCh0aGlzLCByb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIC4uLnJlc3QpIDtcbi8vICAgICByZXR1cm4gcHJvZ3JhbTtcbi8vICAgfTtcblxuLy8gICB0cy5jcmVhdGVXYXRjaFByb2dyYW0ocHJvZ3JhbUhvc3QpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBjb21waWxlKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPixcbi8vICAgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbi8vICAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuLy8gICAgIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuLy8gICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuLy8gICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG4vLyAgIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdCk7XG4vLyAgIGNvbnN0IGVtaXR0ZWQgPSBwYXRjaENvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zLCB0cyk7XG4vLyAgIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBob3N0KTtcbi8vICAgY29uc3QgZW1pdFJlc3VsdCA9IHByb2dyYW0uZW1pdCgpO1xuLy8gICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRzLmdldFByZUVtaXREaWFnbm9zdGljcyhwcm9ncmFtKVxuLy8gICAgIC5jb25jYXQoZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG5cbi8vICAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHtcbi8vICAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuLy8gICB9XG4vLyAgIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4vLyAgICAgX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYyk7XG4vLyAgIH0pO1xuLy8gICBpZiAoZW1pdFJlc3VsdC5lbWl0U2tpcHBlZCkge1xuLy8gICAgIHRocm93IG5ldyBFcnJvcignQ29tcGlsZSBmYWlsZWQnKTtcbi8vICAgfVxuLy8gICByZXR1cm4gZW1pdHRlZDtcbi8vIH1cblxuLyoqIE92ZXJyaWRpbmcgV3JpdGVGaWxlKCkgKi9cbi8vIGZ1bmN0aW9uIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5Db21waWxlckhvc3QsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuLy8gICBjbzogX3RzLkNvbXBpbGVyT3B0aW9ucywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpOiBzdHJpbmdbXSB7XG4vLyAgIGNvbnN0IGVtaXR0ZWRMaXN0OiBzdHJpbmdbXSA9IFtdO1xuLy8gICAvLyBJdCBzZWVtcyB0byBub3QgYWJsZSB0byB3cml0ZSBmaWxlIHRocm91Z2ggc3ltbGluayBpbiBXaW5kb3dzXG4vLyAgIC8vIGNvbnN0IF93cml0ZUZpbGUgPSBob3N0LndyaXRlRmlsZTtcbi8vICAgY29uc3Qgd3JpdGVGaWxlOiBfdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPSBmdW5jdGlvbihmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcykge1xuLy8gICAgIGNvbnN0IGRlc3RGaWxlID0gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuLy8gICAgIGlmIChkZXN0RmlsZSA9PSBudWxsKSB7XG4vLyAgICAgICBsb2cuZGVidWcoJ3NraXAnLCBmaWxlTmFtZSk7XG4vLyAgICAgICByZXR1cm47XG4vLyAgICAgfVxuLy8gICAgIGVtaXR0ZWRMaXN0LnB1c2goZGVzdEZpbGUpO1xuLy8gICAgIGxvZy5pbmZvKCd3cml0ZSBmaWxlJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBkZXN0RmlsZSkpO1xuLy8gICAgIC8vIFR5cGVzY3JpcHQncyB3cml0ZUZpbGUoKSBmdW5jdGlvbiBwZXJmb3JtcyB3ZWlyZCB3aXRoIHN5bWxpbmtzIHVuZGVyIHdhdGNoIG1vZGUgaW4gV2luZG93czpcbi8vICAgICAvLyBFdmVyeSB0aW1lIGEgdHMgZmlsZSBpcyBjaGFuZ2VkLCBpdCB0cmlnZ2VycyB0aGUgc3ltbGluayBiZWluZyBjb21waWxlZCBhbmQgdG8gYmUgd3JpdHRlbiB3aGljaCBpc1xuLy8gICAgIC8vIGFzIGV4cGVjdGVkIGJ5IG1lLFxuLy8gICAgIC8vIGJ1dCBsYXRlIG9uIGl0IHRyaWdnZXJzIHRoZSBzYW1lIHJlYWwgZmlsZSBhbHNvIGJlaW5nIHdyaXR0ZW4gaW1tZWRpYXRlbHksIHRoaXMgaXMgbm90IHdoYXQgSSBleHBlY3QsXG4vLyAgICAgLy8gYW5kIGl0IGRvZXMgbm90IGFjdHVhbGx5IHdyaXRlIG91dCBhbnkgY2hhbmdlcyB0byBmaW5hbCBKUyBmaWxlLlxuLy8gICAgIC8vIFNvIEkgZGVjaWRlIHRvIHVzZSBvcmlnaW5hbCBOb2RlLmpzIGZpbGUgc3lzdGVtIEFQSVxuLy8gICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RGaWxlKSk7XG4vLyAgICAgZnMud3JpdGVGaWxlU3luYyhkZXN0RmlsZSwgZGF0YSk7XG4vLyAgICAgLy8gSXQgc2VlbXMgVHlwZXNjcmlwdCBjb21waWxlciBhbHdheXMgdXNlcyBzbGFzaCBpbnN0ZWFkIG9mIGJhY2sgc2xhc2ggaW4gZmlsZSBwYXRoLCBldmVuIGluIFdpbmRvd3Ncbi8vICAgICAvLyByZXR1cm4gX3dyaXRlRmlsZS5jYWxsKHRoaXMsIGRlc3RGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4vLyAgIH07XG4vLyAgIGhvc3Qud3JpdGVGaWxlID0gd3JpdGVGaWxlO1xuXG4vLyAgIHJldHVybiBlbWl0dGVkTGlzdDtcbi8vIH1cblxuLy8gZnVuY3Rpb24gcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuV2F0Y2hDb21waWxlckhvc3RPZkZpbGVzQW5kQ29tcGlsZXJPcHRpb25zPF90cy5FbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtPiB8IF90cy5Db21waWxlckhvc3QpIHtcbi8vICAgY29uc3QgcmVhZEZpbGUgPSBob3N0LnJlYWRGaWxlO1xuLy8gICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuLy8gICBob3N0LnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZykge1xuLy8gICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZS5jYWxsKHRoaXMsIHBhdGgsIGVuY29kaW5nKSA7XG4vLyAgICAgaWYgKGNvbnRlbnQgJiYgIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykpIHtcbi8vICAgICAgIC8vIGNvbnNvbGUubG9nKCdXYXRjaENvbXBpbGVySG9zdC5yZWFkRmlsZScsIHBhdGgpO1xuLy8gICAgICAgY29uc3QgY2hhbmdlZCA9IHdlYkluamVjdG9yLmluamVjdFRvRmlsZShwYXRoLCBjb250ZW50KTtcbi8vICAgICAgIGlmIChjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4vLyAgICAgICAgIGxvZy5pbmZvKFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSArICcgaXMgcGF0Y2hlZCcpO1xuLy8gICAgICAgICByZXR1cm4gY2hhbmdlZDtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgcmV0dXJuIGNvbnRlbnQ7XG4vLyAgIH07XG4vLyB9XG5cblxuLy8gZnVuY3Rpb24gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4vLyAgIC8vIGxldCBmaWxlSW5mbyA9ICcnO1xuLy8gICAvLyBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4vLyAgIC8vICAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuLy8gICAvLyAgIGNvbnN0IHJlYWxGaWxlID0gcmVhbFBhdGhPZihkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWU7XG4vLyAgIC8vICAgZmlsZUluZm8gPSBgJHtyZWFsRmlsZX0sIGxpbmU6ICR7bGluZSArIDF9LCBjb2x1bW46ICR7Y2hhcmFjdGVyICsgMX1gO1xuLy8gICAvLyB9XG4vLyAgIC8vIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKGBFcnJvciAke2RpYWdub3N0aWMuY29kZX0gJHtmaWxlSW5mb30gOmApLCB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCBmb3JtYXRIb3N0LmdldE5ld0xpbmUoKSkpO1xuLy8gICBjb25zdCBvdXQgPSB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoW2RpYWdub3N0aWNdLCB7XG4vLyAgICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IHJlYWxQYXRoT2YoZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBmaWxlTmFtZSxcbi8vICAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbi8vICAgICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxuLy8gICB9KTtcbi8vICAgY29uc29sZS5lcnJvcihvdXQpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4vLyAgIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbZGlhZ25vc3RpY10sIGZvcm1hdEhvc3QpKSk7XG4vLyB9XG5cbmNvbnN0IENPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERSA9IG5ldyBTZXQoWydiYXNlVXJsJywgJ3R5cGVSb290cycsICdwYXRocycsICdyb290RGlyJ10pO1xuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBiYXNlUGF0aDogc3RyaW5nLCBvcHRzPzogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzKTogdm9pZCB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtwbGlua0Vudi53b3JrRGlyfVwiIGlzIG5vdCBhIHdvcmsgc3BhY2VgKTtcbiAgfVxuXG4gIGlmIChvcHRzPy5tZXJnZVRzY29uZmlnKSB7XG4gICAgY29uc3QganNvbiA9IG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCBvcHRzLm1lcmdlVHNjb25maWcsIGJhc2VQYXRoLCBjb21waWxlck9wdGlvbnMpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGpzb24uY29tcGlsZXJPcHRpb25zKSkge1xuICAgICAgaWYgKCFDT01QSUxFUl9PUFRJT05TX01FUkdFX0VYQ0xVREUuaGFzKGtleSkpIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgbG9nLmRlYnVnKCdtZXJnZSBjb21waWxlciBvcHRpb25zJywga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gYXBwZW5kVHlwZVJvb3RzKFtdLCBjd2QsIGNvbXBpbGVyT3B0aW9ucywge30pO1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoYmFzZVBhdGgsICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHBsaW5rRW52LndvcmtEaXIsXG4gICAgcmVhbFBhY2thZ2VQYXRoczogdHJ1ZVxuICB9KTtcblxuICBpZiAob3B0cz8ucGF0aHNKc29ucykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdHMucGF0aHNKc29ucykpIHtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IG9wdHMucGF0aHNKc29ucy5yZWR1Y2UoKHBhdGhNYXAsIGpzb25TdHIpID0+IHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihwYXRoTWFwLCBKU09OLnBhcnNlKGpzb25TdHIpKTtcbiAgICAgICAgcmV0dXJuIHBhdGhNYXA7XG4gICAgICB9LCBjb21waWxlck9wdGlvbnMucGF0aHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgb3B0cy5wYXRoc0pzb25zKTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzID09IG51bGwpXG4gIC8vICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0ge307XG4gIC8vIGNvbXBpbGVyT3B0aW9ucy5wYXRoc1snKiddID0gWydub2RlX21vZHVsZXMvKiddO1xuXG4gIGlmIChvcHRzPy5jb21waWxlck9wdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IFtwcm9wLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0cy5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAocHJvcCA9PT0gJ2Jhc2VVcmwnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09ICdwYXRocycpIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyT3B0aW9ucy5wYXRocylcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgdmFsdWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gdmFsdWUgYXMgYW55O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW3Byb3BdID0gdmFsdWUgYXMgYW55O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiByZWFsIHBhdGggb2YgdGFyZ2V0aW5nIGZpbGUsIHJldHVybiBudWxsIGlmIHRhcmdldGluZyBmaWxlIGlzIG5vdCBpbiBvdXIgY29tcGlsaWF0aW9uIHNjb3BlXG4gKiBAcGFyYW0gZmlsZU5hbWUgXG4gKiBAcGFyYW0gY29tbW9uUm9vdERpciBcbiAqIEBwYXJhbSBwYWNrYWdlRGlyVHJlZSBcbiAqL1xuZnVuY3Rpb24gcmVhbFBhdGhPZihmaWxlTmFtZTogc3RyaW5nLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgaXNTcmNGaWxlID0gZmFsc2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlTmFtZSk7XG4gIGNvbnN0IF9vcmlnaW5QYXRoID0gZmlsZU5hbWU7IC8vIGFic29sdXRlIHBhdGhcbiAgY29uc3QgZm91bmRQa2dJbmZvID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCk7XG4gIGlmIChmb3VuZFBrZ0luZm8gPT0gbnVsbCkge1xuICAgIC8vIHRoaXMgZmlsZSBpcyBub3QgcGFydCBvZiBzb3VyY2UgcGFja2FnZS5cbiAgICAvLyBsb2cuaW5mbygnTm90IHBhcnQgb2YgZW50cnkgZmlsZXMnLCBmaWxlTmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qge3NyY0RpciwgZGVzdERpciwgcGtnRGlyLCBpc29tRGlyfSA9IGZvdW5kUGtnSW5mbztcblxuICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUocGtnRGlyLCBfb3JpZ2luUGF0aCk7XG5cbiAgaWYgKHNyY0RpciA9PT0gJy4nIHx8IHNyY0Rpci5sZW5ndGggPT09IDApIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoc3JjRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2Uoc3JjRGlyLmxlbmd0aCArIDEpKTtcbiAgfSBlbHNlIGlmIChpc29tRGlyICYmIHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChpc29tRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzb21EaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UoaXNvbURpci5sZW5ndGggKyAxKSk7XG4gIH1cbiAgcmV0dXJuIGZpbGVOYW1lO1xufVxuIl19