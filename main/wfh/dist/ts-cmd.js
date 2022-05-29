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
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const typescript_1 = __importDefault(require("typescript"));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const log4js_1 = __importDefault(require("log4js"));
const glob_1 = __importDefault(require("glob"));
const misc_1 = require("./utils/misc");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const utils_1 = require("./cmd/utils");
const package_mgr_1 = require("./package-mgr");
const packageUtils = __importStar(require("./package-utils"));
const ts_cmd_util_1 = require("./ts-cmd-util");
const injector_factory_1 = require("./injector-factory");
const cli_analyze_1 = require("./cmd/cli-analyze");
const { symlinkDirName } = misc_1.plinkEnv;
const log = log4js_1.default.getLogger('plink.ts-cmd');
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
async function tsc(argv, ts = typescript_1.default) {
    // const compGlobs: string[] = [];
    // const compFiles: string[] = [];
    const rootFiles = [];
    const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
    let baseCompilerOptions;
    if (argv.jsx) {
        const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
        log.info('Use tsconfig file:', baseTsconfigFile2);
        const tsxTsconfig = (0, ts_cmd_util_1.parseConfigFileToJson)(ts, baseTsconfigFile2);
        baseCompilerOptions = tsxTsconfig.compilerOptions;
        // baseCompilerOptions = {...baseCompilerOptions, ...tsxTsconfig.config.compilerOptions};
    }
    else {
        const baseTsconfigFile = require.resolve('../tsconfig-base.json');
        const baseTsconfig = (0, ts_cmd_util_1.parseConfigFileToJson)(ts, baseTsconfigFile);
        log.info('Use tsconfig file:', baseTsconfigFile);
        baseCompilerOptions = baseTsconfig.compilerOptions;
    }
    // const promCompile = Promise.resolve( [] as EmitList);
    const packageDirTree = new dir_tree_1.DirTree();
    const commonRootDir = misc_1.plinkEnv.workDir;
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
    await Promise.all(pkgInfos.map(pkg => onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath)));
    for (const info of compDirInfo.values()) {
        const treePath = (0, path_1.relative)(commonRootDir, info.symlinkDir);
        log.debug('treePath', treePath);
        packageDirTree.putData(treePath, info);
    }
    if (countPkg === 0) {
        throw new Error('No available source package found in current workspace');
    }
    const destDir = path_1.default.relative(process.cwd(), commonRootDir).replace(/\\/g, '/');
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { target: 'ES2017', importHelpers: false, declaration: true, 
        // module: 'ESNext',
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: destDir, rootDir: destDir, skipLibCheck: true, inlineSourceMap: argv.sourceMap === 'inline', sourceMap: argv.sourceMap !== 'inline', inlineSources: argv.sourceMap === 'inline', emitDeclarationOnly: argv.ed, preserveSymlinks: true });
    setupCompilerOptionsWithPackages(compilerOptions, argv, ts);
    log.info('typescript compilerOptions:', compilerOptions);
    /** set compGlobs */
    async function onComponent(name, _packagePath, _parsedName, json, realPath) {
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
                return fs.statSync((0, path_1.join)(symlinkDir, srcDir)).isDirectory();
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
                glob_1.default.sync(globPattern).filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
            }
        }
        if (tscCfg.files == null && tscCfg.include == null) {
            for (const srcDir of srcDirs) {
                const relPath = (0, path_1.resolve)(symlinkDir, srcDir).replace(/\\/g, '/');
                glob_1.default.sync(relPath + '/**/*.ts').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                if (argv.jsx) {
                    glob_1.default.sync(relPath + '/**/*.tsx').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                }
            }
        }
    }
    // log.warn('rootFiles:\n' + rootFiles.join('\n'));
    if (argv.watch) {
        log.info('Watch mode');
        watch(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
        return [];
    }
    else {
        const emitted = compile(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
        if (process.send)
            process.send('plink-tsc compiled');
        return emitted;
    }
}
exports.tsc = tsc;
const formatHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
    getNewLine: () => typescript_1.default.sys.newLine
};
function watch(rootFiles, jsonCompilerOpt, commonRootDir, packageDirTree, ts = typescript_1.default) {
    const compilerOptions = ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts);
    }
    const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys, 
    // https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
    // TypeScript can use several different program creation "strategies":
    //  * ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    //  * ts.createSemanticDiagnosticsBuilderProgram
    //  * ts.createAbstractBuilder
    // The first two produce "builder programs". These use an incremental strategy
    // to only re-check and emit files whose contents may have changed, or whose
    // dependencies may have changes which may impact change the result of prior
    // type-check and emit.
    // The last uses an ordinary program which does a full type check after every
    // change.
    // Between `createEmitAndSemanticDiagnosticsBuilderProgram` and
    // `createSemanticDiagnosticsBuilderProgram`, the only difference is emit.
    // For pure type-checking scenarios, or when another tool/process handles emit,
    // using `createSemanticDiagnosticsBuilderProgram` may be more desirable
    ts.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, d => reportWatchStatusChanged(d, ts), undefined, { watchDirectory: ts.WatchDirectoryKind.UseFsEvents });
    patchWatchCompilerHost(programHost);
    const origCreateProgram = programHost.createProgram;
    // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
    programHost.createProgram = function (rootNames, options, host, ...rest) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (host && host._overrided == null) {
            patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
        }
        const program = origCreateProgram.call(this, rootNames, options, host, ...rest);
        return program;
    };
    ts.createWatchProgram(programHost);
}
function compile(rootFiles, jsonCompilerOpt, commonRootDir, packageDirTree, ts = typescript_1.default) {
    const compilerOptions = ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    const host = ts.createCompilerHost(compilerOptions);
    patchWatchCompilerHost(host);
    const emitted = patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
    const program = ts.createProgram(rootFiles, compilerOptions, host);
    const emitResult = program.emit();
    const allDiagnostics = ts.getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts);
    }
    allDiagnostics.forEach(diagnostic => {
        _reportDiagnostic(diagnostic);
    });
    if (emitResult.emitSkipped) {
        throw new Error('Compile failed');
    }
    return emitted;
}
/** Overriding WriteFile() */
function patchCompilerHost(host, commonRootDir, packageDirTree, co, ts = typescript_1.default) {
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
        log.info('write file', path_1.default.relative(process.cwd(), destFile));
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
    // const _getSourceFile = host.getSourceFile;
    // const getSourceFile: typeof _getSourceFile = function(fileName) {
    //   // console.log('getSourceFile', fileName);
    //   return _getSourceFile.apply(this, arguments);
    // };
    // host.getSourceFile = getSourceFile;
    return emittedList;
}
function patchWatchCompilerHost(host) {
    const readFile = host.readFile;
    const cwd = process.cwd();
    host.readFile = function (path, encoding) {
        const content = readFile.call(this, path, encoding);
        if (content && !path.endsWith('.d.ts') && !path.endsWith('.json')) {
            // console.log('WatchCompilerHost.readFile', path);
            const changed = injector_factory_1.webInjector.injectToFile(path, content);
            if (changed !== content) {
                log.info(path_1.default.relative(cwd, path) + ' is patched');
                return changed;
            }
        }
        return content;
    };
}
// Customer Transformer solution is not feasible: in some case like a WatchCompiler, it throws error like
// "can not reference '.flags' of undefined" when a customer transformer return a newly created SourceFile
// export function overrideTsProgramEmitFn(emit: ts.Program['emit']): ts.Program['emit'] {
//   // TODO: allow adding transformer
//   function hackedEmit(...args: Parameters<ts.Program['emit']>) {
//     let [,,,,transformers] = args;
//     // log.info('emit', src?.fileName);
//     if (transformers == null) {
//       transformers = {} as ts.CustomTransformers;
//       args[4] = transformers;
//     }
//     if (transformers.before == null)
//       transformers.before = [];
//     transformers.before.push(ctx => ({
//       transformSourceFile(src) {
//         log.debug('transformSourceFile', src.fileName);
//         return src;
//       },
//       transformBundle(node) {return node;}
//     }));
//     // console.log(require('util').inspect(args[4]));
//     return emit.apply(this, args);
//   };
//   return hackedEmit;
// }
function reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts = typescript_1.default) {
    // let fileInfo = '';
    // if (diagnostic.file) {
    //   const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    //   const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
    //   fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
    // }
    // console.error(chalk.red(`Error ${diagnostic.code} ${fileInfo} :`), ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
    const out = ts.formatDiagnosticsWithColorAndContext([diagnostic], {
        getCanonicalFileName: fileName => realPathOf(fileName, commonRootDir, packageDirTree, true) || fileName,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine
    });
    console.error(out);
}
function reportWatchStatusChanged(diagnostic, ts = typescript_1.default) {
    console.info(chalk_1.default.cyan(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost)));
}
const COMPILER_OPTIONS_MERGE_EXCLUDE = new Set(['baseUrl', 'typeRoots', 'paths', 'rootDir']);
function setupCompilerOptionsWithPackages(compilerOptions, opts, ts = typescript_1.default) {
    let wsKey = (0, package_mgr_1.workspaceKey)(misc_1.plinkEnv.workDir);
    if (!(0, package_mgr_1.getState)().workspaces.has(wsKey))
        wsKey = (0, package_mgr_1.getState)().currWorkspace;
    if (wsKey == null) {
        throw new Error(`Current directory "${misc_1.plinkEnv.workDir}" is not a work space`);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.mergeTsconfig) {
        const json = (0, ts_cmd_util_1.mergeBaseUrlAndPaths)(ts, opts.mergeTsconfig, process.cwd(), compilerOptions);
        for (const [key, value] of Object.entries(json.compilerOptions)) {
            if (!COMPILER_OPTIONS_MERGE_EXCLUDE.has(key)) {
                compilerOptions[key] = value;
                log.debug('merge compiler options', key, value);
            }
        }
    }
    // appendTypeRoots([], cwd, compilerOptions, {});
    (0, package_list_helper_1.setTsCompilerOptForNodePath)(process.cwd(), './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: misc_1.plinkEnv.workDir,
        realPackagePaths: false
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
    const { srcDir, destDir, pkgDir, isomDir, symlinkDir } = foundPkgInfo;
    const pathWithinPkg = (0, path_1.relative)(symlinkDir, _originPath);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCxrREFBMEI7QUFDMUIsNkNBQStCO0FBQy9CLG9EQUF1QjtBQUN2Qiw0REFBNkI7QUFFN0IsNkRBQXVEO0FBQ3ZELG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsdUNBQXdFO0FBQ3hFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsK0NBQWtFO0FBQ2xFLDhEQUFnRDtBQUNoRCwrQ0FBMEU7QUFDMUUseURBQStDO0FBQy9DLG1EQUErQztBQUkvQyxNQUFNLEVBQUMsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBMkI3Qzs7Ozs7O0dBTUc7QUFDSSxLQUFLLFVBQVUsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7SUFDL0Qsa0NBQWtDO0lBQ2xDLGtDQUFrQztJQUNsQyxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFFL0IsTUFBTSxXQUFXLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFFbEgsSUFBSSxtQkFBNEMsQ0FBQztJQUVqRCxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDWixNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNsRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBQSxtQ0FBcUIsRUFBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFDO1FBQ2xE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ZUFBUSxFQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUV4RCxJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekMsUUFBUSxHQUFHLElBQUEsV0FBSSxFQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQ3RFO1NBQU0sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUNqRCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgX3RzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnLCBQYWNrYWdlVHNEaXJzLCBwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBDb21waWxlck9wdGlvbnMgYXMgUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIGFsbFBhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL2NtZC91dGlscyc7XG5pbXBvcnQge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IHttZXJnZUJhc2VVcmxBbmRQYXRocywgcGFyc2VDb25maWdGaWxlVG9Kc29ufSBmcm9tICcuL3RzLWNtZC11dGlsJztcbmltcG9ydCB7d2ViSW5qZWN0b3J9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQge2FuYWx5c2VGaWxlc30gZnJvbSAnLi9jbWQvY2xpLWFuYWx5emUnO1xuLy8gaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuZXhwb3J0IHtSZXF1aXJlZENvbXBpbGVyT3B0aW9uc307XG5cbmNvbnN0IHtzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzLWNtZCcpO1xuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICAvKiogbWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZSAqL1xuICBtZXJnZVRzY29uZmlnPzogc3RyaW5nO1xuICAvKiogSlNPTiBzdHJpbmcsIHRvIGJlIG1lcmdlZCB0byBjb21waWxlck9wdGlvbnMgXCJwYXRoc1wiLFxuICAgKiBiZSBhd2FyZSB0aGF0IFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gXCJiYXNlVXJsXCIgd2hpY2ggaXMgcmVsYXRpdmUgdG8gYFBsaW5rRW52LndvcmtEaXJgXG4gICAqICovXG4gIHBhdGhzSnNvbnM/OiBBcnJheTxzdHJpbmc+IHwge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIC8qKlxuICAgKiBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkLCBleGNlcHQgXCJiYXNlVXJsXCIuXG4gICAqIFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gYHBsaW5rRW52LndvcmtEaXJgXG4gICAqL1xuICBjb21waWxlck9wdGlvbnM/OiBhbnk7XG4gIG92ZXJyaWRlUGFja2dlRGlycz86IHtbcGtnTmFtZTogc3RyaW5nXTogUGFja2FnZVRzRGlyc307XG59XG5cbmludGVyZmFjZSBQYWNrYWdlRGlySW5mbyBleHRlbmRzIFBhY2thZ2VUc0RpcnMge1xuICBwa2dEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHNjKGFyZ3Y6IFRzY0NtZFBhcmFtLCB0czogdHlwZW9mIF90cyA9IF90cyApOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIC8vIGNvbnN0IGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gY29uc3QgY29tcEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCByb290RmlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIFBhY2thZ2VEaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG5cbiAgbGV0IGJhc2VDb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zO1xuXG4gIGlmIChhcmd2LmpzeCkge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUyID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpO1xuICAgIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gdHN4VHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICAgIC8vIGJhc2VDb21waWxlck9wdGlvbnMgPSB7Li4uYmFzZUNvbXBpbGVyT3B0aW9ucywgLi4udHN4VHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9uc307XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gIH1cblxuICAvLyBjb25zdCBwcm9tQ29tcGlsZSA9IFByb21pc2UucmVzb2x2ZSggW10gYXMgRW1pdExpc3QpO1xuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPigpO1xuICBjb25zdCBjb21tb25Sb290RGlyID0gcGxpbmtFbnYud29ya0RpcjtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBsZXQgcGtnSW5mb3M6IFBhY2thZ2VJbmZvW10gfCB1bmRlZmluZWQ7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoYXJndi5wYWNrYWdlKSkuZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbCkgYXMgUGFja2FnZUluZm9bXTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKGFsbFBhY2thZ2VzKCcqJywgJ3NyYycsIGFyZ3YucHJvamVjdCkpO1xuICB9IGVsc2Uge1xuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIsIGZhbHNlKSk7XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwocGtnSW5mb3MubWFwKHBrZyA9PiBvbkNvbXBvbmVudChwa2cubmFtZSwgcGtnLnBhdGgsIG51bGwsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgpKSk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5zeW1saW5rRGlyKTtcbiAgICBsb2cuZGVidWcoJ3RyZWVQYXRoJywgdHJlZVBhdGgpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc291cmNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGRlc3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGNvbW1vblJvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAuLi5iYXNlQ29tcGlsZXJPcHRpb25zLFxuICAgIHRhcmdldDogJ0VTMjAxNycsXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLy8gbW9kdWxlOiAnRVNOZXh0JyxcbiAgICAvKipcbiAgICAgKiBmb3IgZ3VscC1zb3VyY2VtYXBzIHVzYWdlOlxuICAgICAqICBJZiB5b3Ugc2V0IHRoZSBvdXREaXIgb3B0aW9uIHRvIHRoZSBzYW1lIHZhbHVlIGFzIHRoZSBkaXJlY3RvcnkgaW4gZ3VscC5kZXN0LCB5b3Ugc2hvdWxkIHNldCB0aGUgc291cmNlUm9vdCB0byAuLy5cbiAgICAgKi9cbiAgICBvdXREaXI6IGRlc3REaXIsXG4gICAgcm9vdERpcjogZGVzdERpcixcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgc291cmNlTWFwOiBhcmd2LnNvdXJjZU1hcCAhPT0gJ2lubGluZScsXG4gICAgaW5saW5lU291cmNlczogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWQsXG4gICAgcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuXG4gIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9ucywgYXJndiwgdHMpO1xuXG4gIGxvZy5pbmZvKCd0eXBlc2NyaXB0IGNvbXBpbGVyT3B0aW9uczonLCBjb21waWxlck9wdGlvbnMpO1xuXG4gIC8qKiBzZXQgY29tcEdsb2JzICovXG4gIGFzeW5jIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgX3BhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgY29uc3QgdHNjQ2ZnID0gYXJndi5vdmVycmlkZVBhY2tnZURpcnMgJiYgXy5oYXMoYXJndi5vdmVycmlkZVBhY2tnZURpcnMsIG5hbWUpID9cbiAgICAgIGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzW25hbWVdXG4gICAgICA6IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuICAgIC8vIEZvciB3b3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc5NjBcbiAgICAvLyBVc2UgYSBzeW1saW5rIHBhdGggaW5zdGVhZCBvZiBhIHJlYWwgcGF0aCwgc28gdGhhdCBUeXBlc2NyaXB0IGNvbXBpbGVyIHdpbGwgbm90XG4gICAgLy8gcmVjb2duaXplIHRoZW0gYXMgZnJvbSBzb21ld2hlcmUgd2l0aCBcIm5vZGVfbW9kdWxlc1wiLCB0aGUgc3ltbGluayBtdXN0IGJlIHJlc2lkZVxuICAgIC8vIGluIGRpcmVjdG9yeSB3aGljaCBkb2VzIG5vdCBjb250YWluIFwibm9kZV9tb2R1bGVzXCIgYXMgcGFydCBvZiBhYnNvbHV0ZSBwYXRoLlxuICAgIGNvbnN0IHN5bWxpbmtEaXIgPSByZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBuYW1lKTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwgey4uLnRzY0NmZywgcGtnRGlyOiByZWFsUGF0aCwgc3ltbGlua0Rpcn0pO1xuXG4gICAgY29uc3Qgc3JjRGlycyA9IFt0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHN5bWxpbmtEaXIsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChzcmNEaXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHN5bWxpbmtEaXIpKSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgZGlyZWN0b3J5ICR7Y2hhbGsucmVkKHN5bWxpbmtEaXIpfSxgICtcbiAgICAgICAgYCBpdCBpcyBwb3NzaWJsZSB0aGF0IHBhY2thZ2UgJHtuYW1lfSBpcyB5ZXQgbm90IGFkZGVkIHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UncyBwYWNrYWdlLmpzb24gZmlsZSxgICtcbiAgICAgICAgJyBjdXJyZW50IHdvcmt0cmVlIHNwYWNlIGlzIG5vdCBzeW5jZWQgeWV0LCB0cnkgXCJzeW5jXCIvXCJpbml0XCIgY29tbWFuZCBwbGVhc2UnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgdHMgc291cmNlIGRpcmVjdG9yeSBmb3VuZCBmb3IgcGFja2FnZSAke2NoYWxrLnJlZChuYW1lKX06YCArXG4gICAgICAgICAgYCAke1t0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKS5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0c2NDZmcuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGZpbGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmZpbGVzKTtcbiAgICAgIGNvbnN0IGFSZXMgPSBhd2FpdCBhbmFseXNlRmlsZXMoZmlsZXMubWFwKGZpbGUgPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBmaWxlKSksIGFyZ3YubWVyZ2VUc2NvbmZpZywgW10pO1xuICAgICAgbG9nLmRlYnVnKCdhbmFseXplZCBmaWxlczonLCBhUmVzKTtcbiAgICAgIGlmIChhUmVzKSB7XG4gICAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLihhUmVzLmZpbGVzLmZpbHRlcihmaWxlID0+IGZpbGUuc3RhcnRzV2l0aChzeW1saW5rRGlyICsgc2VwKSAmJiAhL1xcLig/OmpzeD98ZFxcLnRzKSQvLnRlc3QoZmlsZSkpXG4gICAgICAgICAgLm1hcChmaWxlID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpKSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRzY0NmZy5pbmNsdWRlKSB7XG4gICAgICBjb25zdCBwYXR0ZXJucyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5pbmNsdWRlKTtcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgICBjb25zdCBnbG9iUGF0dGVybiA9IHJlc29sdmUoc3ltbGlua0RpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBnbG9iLnN5bmMoZ2xvYlBhdHRlcm4pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmZpbGVzID09IG51bGwgJiYgdHNjQ2ZnLmluY2x1ZGUgPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlycykge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShzeW1saW5rRGlyLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzJykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzeCcpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGxvZy53YXJuKCdyb290RmlsZXM6XFxuJyArIHJvb3RGaWxlcy5qb2luKCdcXG4nKSk7XG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICB3YXRjaChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IHBhdGggPT4gcGF0aCxcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSVxuICAgIC8vIFR5cGVTY3JpcHQgY2FuIHVzZSBzZXZlcmFsIGRpZmZlcmVudCBwcm9ncmFtIGNyZWF0aW9uIFwic3RyYXRlZ2llc1wiOlxuICAgIC8vICAqIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sXG4gICAgLy8gICogdHMuY3JlYXRlU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtXG4gICAgLy8gICogdHMuY3JlYXRlQWJzdHJhY3RCdWlsZGVyXG4gICAgLy8gVGhlIGZpcnN0IHR3byBwcm9kdWNlIFwiYnVpbGRlciBwcm9ncmFtc1wiLiBUaGVzZSB1c2UgYW4gaW5jcmVtZW50YWwgc3RyYXRlZ3lcbiAgICAvLyB0byBvbmx5IHJlLWNoZWNrIGFuZCBlbWl0IGZpbGVzIHdob3NlIGNvbnRlbnRzIG1heSBoYXZlIGNoYW5nZWQsIG9yIHdob3NlXG4gICAgLy8gZGVwZW5kZW5jaWVzIG1heSBoYXZlIGNoYW5nZXMgd2hpY2ggbWF5IGltcGFjdCBjaGFuZ2UgdGhlIHJlc3VsdCBvZiBwcmlvclxuICAgIC8vIHR5cGUtY2hlY2sgYW5kIGVtaXQuXG4gICAgLy8gVGhlIGxhc3QgdXNlcyBhbiBvcmRpbmFyeSBwcm9ncmFtIHdoaWNoIGRvZXMgYSBmdWxsIHR5cGUgY2hlY2sgYWZ0ZXIgZXZlcnlcbiAgICAvLyBjaGFuZ2UuXG4gICAgLy8gQmV0d2VlbiBgY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAgYW5kXG4gICAgLy8gYGNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAsIHRoZSBvbmx5IGRpZmZlcmVuY2UgaXMgZW1pdC5cbiAgICAvLyBGb3IgcHVyZSB0eXBlLWNoZWNraW5nIHNjZW5hcmlvcywgb3Igd2hlbiBhbm90aGVyIHRvb2wvcHJvY2VzcyBoYW5kbGVzIGVtaXQsXG4gICAgLy8gdXNpbmcgYGNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAgbWF5IGJlIG1vcmUgZGVzaXJhYmxlXG4gICAgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSwgX3JlcG9ydERpYWdub3N0aWMsIGQgPT4gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGQsIHRzKSxcbiAgICB1bmRlZmluZWQsIHt3YXRjaERpcmVjdG9yeTogdHMuV2F0Y2hEaXJlY3RvcnlLaW5kLlVzZUZzRXZlbnRzfSk7XG4gIHBhdGNoV2F0Y2hDb21waWxlckhvc3QocHJvZ3JhbUhvc3QpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgLy8gVHMncyBjcmVhdGVXYXRjaFByb2dyYW0gd2lsbCBjYWxsIFdhdGNoQ29tcGlsZXJIb3N0LmNyZWF0ZVByb2dyYW0oKSwgdGhpcyBpcyB3aGVyZSB3ZSBwYXRjaCBcIkNvbXBpbGVySG9zdFwiXG4gIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgaG9zdD86IF90cy5Db21waWxlckhvc3QsIC4uLnJlc3Q6IGFueVtdKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgIGlmIChob3N0ICYmIChob3N0IGFzIGFueSkuX292ZXJyaWRlZCA9PSBudWxsKSB7XG4gICAgICBwYXRjaENvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zLCB0cyk7XG4gICAgfVxuICAgIGNvbnN0IHByb2dyYW0gPSBvcmlnQ3JlYXRlUHJvZ3JhbS5jYWxsKHRoaXMsIHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgLi4ucmVzdCkgO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9O1xuXG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuICB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG4gIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcbiAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0KTtcbiAgY29uc3QgZW1pdHRlZCA9IHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMsIHRzKTtcbiAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGhvc3QpO1xuICBjb25zdCBlbWl0UmVzdWx0ID0gcHJvZ3JhbS5lbWl0KCk7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdHMuZ2V0UHJlRW1pdERpYWdub3N0aWNzKHByb2dyYW0pXG4gICAgLmNvbmNhdChlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gIH1cbiAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbiAgfSk7XG4gIGlmIChlbWl0UmVzdWx0LmVtaXRTa2lwcGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb21waWxlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBlbWl0dGVkO1xufVxuXG4vKiogT3ZlcnJpZGluZyBXcml0ZUZpbGUoKSAqL1xuZnVuY3Rpb24gcGF0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLkNvbXBpbGVySG9zdCwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4gIGNvOiBfdHMuQ29tcGlsZXJPcHRpb25zLCB0czogdHlwZW9mIF90cyA9IF90cyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZW1pdHRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4gIC8vIEl0IHNlZW1zIHRvIG5vdCBhYmxlIHRvIHdyaXRlIGZpbGUgdGhyb3VnaCBzeW1saW5rIGluIFdpbmRvd3NcbiAgLy8gY29uc3QgX3dyaXRlRmlsZSA9IGhvc3Qud3JpdGVGaWxlO1xuICBjb25zdCB3cml0ZUZpbGU6IF90cy5Xcml0ZUZpbGVDYWxsYmFjayA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSB7XG4gICAgY29uc3QgZGVzdEZpbGUgPSByZWFsUGF0aE9mKGZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKGRlc3RGaWxlID09IG51bGwpIHtcbiAgICAgIGxvZy5kZWJ1Zygnc2tpcCcsIGZpbGVOYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZW1pdHRlZExpc3QucHVzaChkZXN0RmlsZSk7XG4gICAgbG9nLmluZm8oJ3dyaXRlIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGRlc3RGaWxlKSk7XG4gICAgLy8gVHlwZXNjcmlwdCdzIHdyaXRlRmlsZSgpIGZ1bmN0aW9uIHBlcmZvcm1zIHdlaXJkIHdpdGggc3ltbGlua3MgdW5kZXIgd2F0Y2ggbW9kZSBpbiBXaW5kb3dzOlxuICAgIC8vIEV2ZXJ5IHRpbWUgYSB0cyBmaWxlIGlzIGNoYW5nZWQsIGl0IHRyaWdnZXJzIHRoZSBzeW1saW5rIGJlaW5nIGNvbXBpbGVkIGFuZCB0byBiZSB3cml0dGVuIHdoaWNoIGlzXG4gICAgLy8gYXMgZXhwZWN0ZWQgYnkgbWUsXG4gICAgLy8gYnV0IGxhdGUgb24gaXQgdHJpZ2dlcnMgdGhlIHNhbWUgcmVhbCBmaWxlIGFsc28gYmVpbmcgd3JpdHRlbiBpbW1lZGlhdGVseSwgdGhpcyBpcyBub3Qgd2hhdCBJIGV4cGVjdCxcbiAgICAvLyBhbmQgaXQgZG9lcyBub3QgYWN0dWFsbHkgd3JpdGUgb3V0IGFueSBjaGFuZ2VzIHRvIGZpbmFsIEpTIGZpbGUuXG4gICAgLy8gU28gSSBkZWNpZGUgdG8gdXNlIG9yaWdpbmFsIE5vZGUuanMgZmlsZSBzeXN0ZW0gQVBJXG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZGVzdEZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3RGaWxlLCBkYXRhKTtcbiAgICAvLyBJdCBzZWVtcyBUeXBlc2NyaXB0IGNvbXBpbGVyIGFsd2F5cyB1c2VzIHNsYXNoIGluc3RlYWQgb2YgYmFjayBzbGFzaCBpbiBmaWxlIHBhdGgsIGV2ZW4gaW4gV2luZG93c1xuICAgIC8vIHJldHVybiBfd3JpdGVGaWxlLmNhbGwodGhpcywgZGVzdEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCAuLi5BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcbiAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZUZpbGU7XG5cbiAgLy8gY29uc3QgX2dldFNvdXJjZUZpbGUgPSBob3N0LmdldFNvdXJjZUZpbGU7XG4gIC8vIGNvbnN0IGdldFNvdXJjZUZpbGU6IHR5cGVvZiBfZ2V0U291cmNlRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG4gIC8vICAgLy8gY29uc29sZS5sb2coJ2dldFNvdXJjZUZpbGUnLCBmaWxlTmFtZSk7XG4gIC8vICAgcmV0dXJuIF9nZXRTb3VyY2VGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIC8vIH07XG4gIC8vIGhvc3QuZ2V0U291cmNlRmlsZSA9IGdldFNvdXJjZUZpbGU7XG4gIHJldHVybiBlbWl0dGVkTGlzdDtcbn1cblxuZnVuY3Rpb24gcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuV2F0Y2hDb21waWxlckhvc3RPZkZpbGVzQW5kQ29tcGlsZXJPcHRpb25zPF90cy5FbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtPiB8IF90cy5Db21waWxlckhvc3QpIHtcbiAgY29uc3QgcmVhZEZpbGUgPSBob3N0LnJlYWRGaWxlO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBob3N0LnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZS5jYWxsKHRoaXMsIHBhdGgsIGVuY29kaW5nKSA7XG4gICAgaWYgKGNvbnRlbnQgJiYgIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdXYXRjaENvbXBpbGVySG9zdC5yZWFkRmlsZScsIHBhdGgpO1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHdlYkluamVjdG9yLmluamVjdFRvRmlsZShwYXRoLCBjb250ZW50KTtcbiAgICAgIGlmIChjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4gICAgICAgIGxvZy5pbmZvKFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSArICcgaXMgcGF0Y2hlZCcpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH07XG59XG5cbi8vIEN1c3RvbWVyIFRyYW5zZm9ybWVyIHNvbHV0aW9uIGlzIG5vdCBmZWFzaWJsZTogaW4gc29tZSBjYXNlIGxpa2UgYSBXYXRjaENvbXBpbGVyLCBpdCB0aHJvd3MgZXJyb3IgbGlrZVxuLy8gXCJjYW4gbm90IHJlZmVyZW5jZSAnLmZsYWdzJyBvZiB1bmRlZmluZWRcIiB3aGVuIGEgY3VzdG9tZXIgdHJhbnNmb3JtZXIgcmV0dXJuIGEgbmV3bHkgY3JlYXRlZCBTb3VyY2VGaWxlXG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBvdmVycmlkZVRzUHJvZ3JhbUVtaXRGbihlbWl0OiB0cy5Qcm9ncmFtWydlbWl0J10pOiB0cy5Qcm9ncmFtWydlbWl0J10ge1xuLy8gICAvLyBUT0RPOiBhbGxvdyBhZGRpbmcgdHJhbnNmb3JtZXJcbi8vICAgZnVuY3Rpb24gaGFja2VkRW1pdCguLi5hcmdzOiBQYXJhbWV0ZXJzPHRzLlByb2dyYW1bJ2VtaXQnXT4pIHtcbi8vICAgICBsZXQgWywsLCx0cmFuc2Zvcm1lcnNdID0gYXJncztcbi8vICAgICAvLyBsb2cuaW5mbygnZW1pdCcsIHNyYz8uZmlsZU5hbWUpO1xuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMgPT0gbnVsbCkge1xuLy8gICAgICAgdHJhbnNmb3JtZXJzID0ge30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xuLy8gICAgICAgYXJnc1s0XSA9IHRyYW5zZm9ybWVycztcbi8vICAgICB9XG4vLyAgICAgaWYgKHRyYW5zZm9ybWVycy5iZWZvcmUgPT0gbnVsbClcbi8vICAgICAgIHRyYW5zZm9ybWVycy5iZWZvcmUgPSBbXTtcbi8vICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlLnB1c2goY3R4ID0+ICh7XG4vLyAgICAgICB0cmFuc2Zvcm1Tb3VyY2VGaWxlKHNyYykge1xuLy8gICAgICAgICBsb2cuZGVidWcoJ3RyYW5zZm9ybVNvdXJjZUZpbGUnLCBzcmMuZmlsZU5hbWUpO1xuLy8gICAgICAgICByZXR1cm4gc3JjO1xuLy8gICAgICAgfSxcbi8vICAgICAgIHRyYW5zZm9ybUJ1bmRsZShub2RlKSB7cmV0dXJuIG5vZGU7fVxuLy8gICAgIH0pKTtcbi8vICAgICAvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhcmdzWzRdKSk7XG4vLyAgICAgcmV0dXJuIGVtaXQuYXBwbHkodGhpcywgYXJncyk7XG4vLyAgIH07XG4vLyAgIHJldHVybiBoYWNrZWRFbWl0O1xuLy8gfVxuXG5mdW5jdGlvbiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgLy8gbGV0IGZpbGVJbmZvID0gJyc7XG4gIC8vIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgLy8gICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gIC8vICAgY29uc3QgcmVhbEZpbGUgPSByZWFsUGF0aE9mKGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZTtcbiAgLy8gICBmaWxlSW5mbyA9IGAke3JlYWxGaWxlfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4gIC8vIH1cbiAgLy8gY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG4gIGNvbnN0IG91dCA9IHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbZGlhZ25vc3RpY10sIHtcbiAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogZmlsZU5hbWUgPT4gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGZpbGVOYW1lLFxuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6IHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICAgIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lXG4gIH0pO1xuICBjb25zb2xlLmVycm9yKG91dCk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc29sZS5pbmZvKGNoYWxrLmN5YW4odHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFtkaWFnbm9zdGljXSwgZm9ybWF0SG9zdCkpKTtcbn1cblxuY29uc3QgQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFID0gbmV3IFNldChbJ2Jhc2VVcmwnLCAndHlwZVJvb3RzJywgJ3BhdGhzJywgJ3Jvb3REaXInXSk7XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIG9wdHM/OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ3VycmVudCBkaXJlY3RvcnkgXCIke3BsaW5rRW52LndvcmtEaXJ9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG9wdHM/Lm1lcmdlVHNjb25maWcpIHtcbiAgICBjb25zdCBqc29uID0gbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG9wdHMubWVyZ2VUc2NvbmZpZywgcHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhqc29uLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmICghQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFLmhhcyhrZXkpKSB7XG4gICAgICAgIGNvbXBpbGVyT3B0aW9uc1trZXldID0gdmFsdWU7XG4gICAgICAgIGxvZy5kZWJ1ZygnbWVyZ2UgY29tcGlsZXIgb3B0aW9ucycsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGFwcGVuZFR5cGVSb290cyhbXSwgY3dkLCBjb21waWxlck9wdGlvbnMsIHt9KTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHBsaW5rRW52LndvcmtEaXIsXG4gICAgcmVhbFBhY2thZ2VQYXRoczogZmFsc2VcbiAgfSk7XG5cbiAgaWYgKG9wdHM/LnBhdGhzSnNvbnMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRzLnBhdGhzSnNvbnMpKSB7XG4gICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSBvcHRzLnBhdGhzSnNvbnMucmVkdWNlKChwYXRoTWFwLCBqc29uU3RyKSA9PiB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocGF0aE1hcCwgSlNPTi5wYXJzZShqc29uU3RyKSk7XG4gICAgICAgIHJldHVybiBwYXRoTWFwO1xuICAgICAgfSwgY29tcGlsZXJPcHRpb25zLnBhdGhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmFzc2lnbihjb21waWxlck9wdGlvbnMucGF0aHMsIG9wdHMucGF0aHNKc29ucyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdHM/LmNvbXBpbGVyT3B0aW9ucykge1xuICAgIGZvciAoY29uc3QgW3Byb3AsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRzLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmIChwcm9wID09PSAnYmFzZVVybCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gJ3BhdGhzJykge1xuICAgICAgICBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzKVxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxlck9wdGlvbnNbcHJvcF0gPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHJlYWwgcGF0aCBvZiB0YXJnZXRpbmcgZmlsZSwgcmV0dXJuIG51bGwgaWYgdGFyZ2V0aW5nIGZpbGUgaXMgbm90IGluIG91ciBjb21waWxpYXRpb24gc2NvcGVcbiAqIEBwYXJhbSBmaWxlTmFtZSBcbiAqIEBwYXJhbSBjb21tb25Sb290RGlyIFxuICogQHBhcmFtIHBhY2thZ2VEaXJUcmVlIFxuICovXG5mdW5jdGlvbiByZWFsUGF0aE9mKGZpbGVOYW1lOiBzdHJpbmcsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBpc1NyY0ZpbGUgPSBmYWxzZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGVOYW1lKTtcbiAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICBjb25zdCBmb3VuZFBrZ0luZm8gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKTtcbiAgaWYgKGZvdW5kUGtnSW5mbyA9PSBudWxsKSB7XG4gICAgLy8gdGhpcyBmaWxlIGlzIG5vdCBwYXJ0IG9mIHNvdXJjZSBwYWNrYWdlLlxuICAgIC8vIGxvZy5pbmZvKCdOb3QgcGFydCBvZiBlbnRyeSBmaWxlcycsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3JjRGlyLCBkZXN0RGlyLCBwa2dEaXIsIGlzb21EaXIsIHN5bWxpbmtEaXJ9ID0gZm91bmRQa2dJbmZvO1xuXG4gIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShzeW1saW5rRGlyLCBfb3JpZ2luUGF0aCk7XG5cbiAgaWYgKHNyY0RpciA9PT0gJy4nIHx8IHNyY0Rpci5sZW5ndGggPT09IDApIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoc3JjRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2Uoc3JjRGlyLmxlbmd0aCArIDEpKTtcbiAgfSBlbHNlIGlmIChpc29tRGlyICYmIHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChpc29tRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzb21EaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UoaXNvbURpci5sZW5ndGggKyAxKSk7XG4gIH1cbiAgcmV0dXJuIGZpbGVOYW1lO1xufVxuIl19