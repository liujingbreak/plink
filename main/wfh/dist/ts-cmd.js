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
        // watch(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed, argv.jsx, onCompiled);
    }
    else {
        const emitted = compile(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
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
function watch(rootFiles, jsonCompilerOpt, commonRootDir, packageDirTree, ts = typescript_1.default) {
    const compilerOptions = ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts);
    }
    const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys, ts.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, d => reportWatchStatusChanged(d, ts));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCxrREFBMEI7QUFDMUIsNkNBQStCO0FBQy9CLG9EQUF1QjtBQUN2Qiw0REFBNkI7QUFFN0IsNkRBQXVEO0FBQ3ZELG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsdUNBQXdFO0FBQ3hFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsK0NBQWtFO0FBQ2xFLDhEQUFnRDtBQUNoRCwrQ0FBMEU7QUFDMUUseURBQStDO0FBQy9DLG1EQUErQztBQUkvQyxNQUFNLEVBQUMsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBMkI3Qzs7Ozs7O0dBTUc7QUFDSSxLQUFLLFVBQVUsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7SUFDL0Qsa0NBQWtDO0lBQ2xDLGtDQUFrQztJQUNsQyxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFFL0IsTUFBTSxXQUFXLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFFbEgsSUFBSSxtQkFBNEMsQ0FBQztJQUVqRCxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDWixNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNsRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBQSxtQ0FBcUIsRUFBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFDO1FBQ2xE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QVUsQ0FBQyxNQUFNLEdBQUcsVUFBRyxDQUFDLEVBQUU7UUFDakQsUUFBUSxHQUFHLElBQUEsV0FBSSxFQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQy9GO1NBQU0sSUFBSSxPQUFPLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFBRyxDQUFDLEVBQUU7UUFDN0QsUUFBUSxHQUFHLElBQUEsV0FBSSxFQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0U7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuaW1wb3J0IFBhdGgsIHtyZXNvbHZlLCBqb2luLCByZWxhdGl2ZSwgc2VwfSBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZywgUGFja2FnZVRzRGlycywgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBhbGxQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7bWVyZ2VCYXNlVXJsQW5kUGF0aHMsIHBhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi90cy1jbWQtdXRpbCc7XG5pbXBvcnQge3dlYkluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IHthbmFseXNlRmlsZXN9IGZyb20gJy4vY21kL2NsaS1hbmFseXplJztcbi8vIGltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbmV4cG9ydCB7UmVxdWlyZWRDb21waWxlck9wdGlvbnN9O1xuXG5jb25zdCB7c3ltbGlua0Rpck5hbWV9ID0gcGxpbmtFbnY7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay50cy1jbWQnKTtcbmV4cG9ydCBpbnRlcmZhY2UgVHNjQ21kUGFyYW0ge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgLyoqIG1lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUgKi9cbiAgbWVyZ2VUc2NvbmZpZz86IHN0cmluZztcbiAgLyoqIEpTT04gc3RyaW5nLCB0byBiZSBtZXJnZWQgdG8gY29tcGlsZXJPcHRpb25zIFwicGF0aHNcIixcbiAgICogYmUgYXdhcmUgdGhhdCBcInBhdGhzXCIgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIFwiYmFzZVVybFwiIHdoaWNoIGlzIHJlbGF0aXZlIHRvIGBQbGlua0Vudi53b3JrRGlyYFxuICAgKiAqL1xuICBwYXRoc0pzb25zPzogQXJyYXk8c3RyaW5nPiB8IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICAvKipcbiAgICogUGFydGlhbCBjb21waWxlciBvcHRpb25zIHRvIGJlIG1lcmdlZCwgZXhjZXB0IFwiYmFzZVVybFwiLlxuICAgKiBcInBhdGhzXCIgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIGBwbGlua0Vudi53b3JrRGlyYFxuICAgKi9cbiAgY29tcGlsZXJPcHRpb25zPzogYW55O1xuICBvdmVycmlkZVBhY2tnZURpcnM/OiB7W3BrZ05hbWU6IHN0cmluZ106IFBhY2thZ2VUc0RpcnN9O1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZURpckluZm8gZXh0ZW5kcyBQYWNrYWdlVHNEaXJzIHtcbiAgcGtnRGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRzYyhhcmd2OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMgKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAvLyBjb25zdCBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIGNvbnN0IGNvbXBGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgcm9vdEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBQYWNrYWdlRGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuXG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcblxuICBpZiAoYXJndi5qc3gpIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlMiA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKTtcbiAgICBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGNvbnN0IHRzeFRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHRzeFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgICAvLyBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSBiYXNlVHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICB9XG5cbiAgLy8gY29uc3QgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4oKTtcbiAgY29uc3QgY29tbW9uUm9vdERpciA9IHBsaW5rRW52LndvcmtEaXI7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgbGV0IHBrZ0luZm9zOiBQYWNrYWdlSW5mb1tdIHwgdW5kZWZpbmVkO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGFyZ3YucGFja2FnZSkpLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpIGFzIFBhY2thZ2VJbmZvW107XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShhbGxQYWNrYWdlcygnKicsICdzcmMnLCBhcmd2LnByb2plY3QpKTtcbiAgfSBlbHNlIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20ocGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwbGlua0Vudi53b3JrRGlyLCBmYWxzZSkpO1xuICB9XG4gIGF3YWl0IFByb21pc2UuYWxsKHBrZ0luZm9zLm1hcChwa2cgPT4gb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKSkpO1xuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uc3ltbGlua0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNvdXJjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cblxuICBjb25zdCBkZXN0RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBjb21tb25Sb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICB0YXJnZXQ6ICdFUzIwMTcnLFxuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8vIG1vZHVsZTogJ0VTTmV4dCcsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgIT09ICdpbmxpbmUnLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkLFxuICAgIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcblxuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMsIGFyZ3YsIHRzKTtcblxuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICAvKiogc2V0IGNvbXBHbG9icyAqL1xuICBhc3luYyBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIF9wYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXVxuICAgICAgOiBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICAvLyBGb3Igd29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM3OTYwXG4gICAgLy8gVXNlIGEgc3ltbGluayBwYXRoIGluc3RlYWQgb2YgYSByZWFsIHBhdGgsIHNvIHRoYXQgVHlwZXNjcmlwdCBjb21waWxlciB3aWxsIG5vdFxuICAgIC8vIHJlY29nbml6ZSB0aGVtIGFzIGZyb20gc29tZXdoZXJlIHdpdGggXCJub2RlX21vZHVsZXNcIiwgdGhlIHN5bWxpbmsgbXVzdCBiZSByZXNpZGVcbiAgICAvLyBpbiBkaXJlY3Rvcnkgd2hpY2ggZG9lcyBub3QgY29udGFpbiBcIm5vZGVfbW9kdWxlc1wiIGFzIHBhcnQgb2YgYWJzb2x1dGUgcGF0aC5cbiAgICBjb25zdCBzeW1saW5rRGlyID0gcmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgbmFtZSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGgsIHN5bWxpbmtEaXJ9KTtcblxuICAgIGNvbnN0IHNyY0RpcnMgPSBbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgaWYgKHNyY0RpciA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihzeW1saW5rRGlyLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoc3JjRGlycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzeW1saW5rRGlyKSkge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIGRpcmVjdG9yeSAke2NoYWxrLnJlZChzeW1saW5rRGlyKX0sYCArXG4gICAgICAgIGAgaXQgaXMgcG9zc2libGUgdGhhdCBwYWNrYWdlICR7bmFtZX0gaXMgeWV0IG5vdCBhZGRlZCB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlJ3MgcGFja2FnZS5qc29uIGZpbGUsYCArXG4gICAgICAgICcgY3VycmVudCB3b3JrdHJlZSBzcGFjZSBpcyBub3Qgc3luY2VkIHlldCwgdHJ5IFwic3luY1wiL1wiaW5pdFwiIGNvbW1hbmQgcGxlYXNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIHRzIHNvdXJjZSBkaXJlY3RvcnkgZm91bmQgZm9yIHBhY2thZ2UgJHtjaGFsay5yZWQobmFtZSl9OmAgK1xuICAgICAgICAgIGAgJHtbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCkuam9pbignLCAnKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHNjQ2ZnLmZpbGVzKSB7XG4gICAgICBjb25zdCBmaWxlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5maWxlcyk7XG4gICAgICBjb25zdCBhUmVzID0gYXdhaXQgYW5hbHlzZUZpbGVzKGZpbGVzLm1hcChmaWxlID0+IHJlc29sdmUoc3ltbGlua0RpciwgZmlsZSkpLCBhcmd2Lm1lcmdlVHNjb25maWcsIFtdKTtcbiAgICAgIGxvZy5kZWJ1ZygnYW5hbHl6ZWQgZmlsZXM6JywgYVJlcyk7XG4gICAgICBpZiAoYVJlcykge1xuICAgICAgICByb290RmlsZXMucHVzaCguLi4oYVJlcy5maWxlcy5maWx0ZXIoZmlsZSA9PiBmaWxlLnN0YXJ0c1dpdGgoc3ltbGlua0RpciArIHNlcCkgJiYgIS9cXC4oPzpqc3g/fGRcXC50cykkLy50ZXN0KGZpbGUpKVxuICAgICAgICAgIC5tYXAoZmlsZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgY29uc3QgcGF0dGVybnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuaW5jbHVkZSk7XG4gICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcbiAgICAgICAgY29uc3QgZ2xvYlBhdHRlcm4gPSByZXNvbHZlKHN5bWxpbmtEaXIsIHBhdHRlcm4pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgZ2xvYi5zeW5jKGdsb2JQYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRzY0NmZy5maWxlcyA9PSBudWxsICYmIHRzY0NmZy5pbmNsdWRlID09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnMpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUoc3ltbGlua0Rpciwgc3JjRGlyISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBnbG9iLnN5bmMocmVsUGF0aCArICcvKiovKi50cycpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICBnbG9iLnN5bmMocmVsUGF0aCArICcvKiovKi50c3gnKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBsb2cud2Fybigncm9vdEZpbGVzOlxcbicgKyByb290RmlsZXMuam9pbignXFxuJykpO1xuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgd2F0Y2gocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgcmV0dXJuIFtdO1xuICAgIC8vIHdhdGNoKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCwgYXJndi5qc3gsIG9uQ29tcGlsZWQpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVtaXR0ZWQgPSBjb21waWxlKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICAgIGlmIChwcm9jZXNzLnNlbmQpXG4gICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAgIHJldHVybiBlbWl0dGVkO1xuICAgIC8vIHByb21Db21waWxlID0gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGFyZ3YuZWQpO1xuICB9XG59XG5cbmNvbnN0IGZvcm1hdEhvc3Q6IF90cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lOiBwYXRoID0+IHBhdGgsXG4gIGdldEN1cnJlbnREaXJlY3Rvcnk6IF90cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgZ2V0TmV3TGluZTogKCkgPT4gX3RzLnN5cy5uZXdMaW5lXG59O1xuXG5mdW5jdGlvbiB3YXRjaChyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gIH1cbiAgY29uc3QgcHJvZ3JhbUhvc3QgPSB0cy5jcmVhdGVXYXRjaENvbXBpbGVySG9zdChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgdHMuc3lzLFxuICAgIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sIF9yZXBvcnREaWFnbm9zdGljLCBkID0+IHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkLCB0cykpO1xuICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KHByb2dyYW1Ib3N0KTtcblxuICBjb25zdCBvcmlnQ3JlYXRlUHJvZ3JhbSA9IHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW07XG4gIC8vIFRzJ3MgY3JlYXRlV2F0Y2hQcm9ncmFtIHdpbGwgY2FsbCBXYXRjaENvbXBpbGVySG9zdC5jcmVhdGVQcm9ncmFtKCksIHRoaXMgaXMgd2hlcmUgd2UgcGF0Y2ggXCJDb21waWxlckhvc3RcIlxuICBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtID0gZnVuY3Rpb24ocm9vdE5hbWVzOiByZWFkb25seSBzdHJpbmdbXSB8IHVuZGVmaW5lZCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIGhvc3Q/OiBfdHMuQ29tcGlsZXJIb3N0LCAuLi5yZXN0OiBhbnlbXSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uY2FsbCh0aGlzLCByb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIC4uLnJlc3QpIDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfTtcblxuICB0cy5jcmVhdGVXYXRjaFByb2dyYW0ocHJvZ3JhbUhvc3QpO1xufVxuXG5mdW5jdGlvbiBjb21waWxlKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPixcbiAgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG4gIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdCk7XG4gIGNvbnN0IGVtaXR0ZWQgPSBwYXRjaENvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zLCB0cyk7XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBob3N0KTtcbiAgY29uc3QgZW1pdFJlc3VsdCA9IHByb2dyYW0uZW1pdCgpO1xuICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRzLmdldFByZUVtaXREaWFnbm9zdGljcyhwcm9ncmFtKVxuICAgIC5jb25jYXQoZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHtcbiAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICB9XG4gIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYyk7XG4gIH0pO1xuICBpZiAoZW1pdFJlc3VsdC5lbWl0U2tpcHBlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ29tcGlsZSBmYWlsZWQnKTtcbiAgfVxuICByZXR1cm4gZW1pdHRlZDtcbn1cblxuLyoqIE92ZXJyaWRpbmcgV3JpdGVGaWxlKCkgKi9cbmZ1bmN0aW9uIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5Db21waWxlckhvc3QsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuICBjbzogX3RzLkNvbXBpbGVyT3B0aW9ucywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGVtaXR0ZWRMaXN0OiBzdHJpbmdbXSA9IFtdO1xuICAvLyBJdCBzZWVtcyB0byBub3QgYWJsZSB0byB3cml0ZSBmaWxlIHRocm91Z2ggc3ltbGluayBpbiBXaW5kb3dzXG4gIC8vIGNvbnN0IF93cml0ZUZpbGUgPSBob3N0LndyaXRlRmlsZTtcbiAgY29uc3Qgd3JpdGVGaWxlOiBfdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPSBmdW5jdGlvbihmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcykge1xuICAgIGNvbnN0IGRlc3RGaWxlID0gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICAgIGlmIChkZXN0RmlsZSA9PSBudWxsKSB7XG4gICAgICBsb2cuZGVidWcoJ3NraXAnLCBmaWxlTmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGVtaXR0ZWRMaXN0LnB1c2goZGVzdEZpbGUpO1xuICAgIGxvZy5pbmZvKCd3cml0ZSBmaWxlJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBkZXN0RmlsZSkpO1xuICAgIC8vIFR5cGVzY3JpcHQncyB3cml0ZUZpbGUoKSBmdW5jdGlvbiBwZXJmb3JtcyB3ZWlyZCB3aXRoIHN5bWxpbmtzIHVuZGVyIHdhdGNoIG1vZGUgaW4gV2luZG93czpcbiAgICAvLyBFdmVyeSB0aW1lIGEgdHMgZmlsZSBpcyBjaGFuZ2VkLCBpdCB0cmlnZ2VycyB0aGUgc3ltbGluayBiZWluZyBjb21waWxlZCBhbmQgdG8gYmUgd3JpdHRlbiB3aGljaCBpc1xuICAgIC8vIGFzIGV4cGVjdGVkIGJ5IG1lLFxuICAgIC8vIGJ1dCBsYXRlIG9uIGl0IHRyaWdnZXJzIHRoZSBzYW1lIHJlYWwgZmlsZSBhbHNvIGJlaW5nIHdyaXR0ZW4gaW1tZWRpYXRlbHksIHRoaXMgaXMgbm90IHdoYXQgSSBleHBlY3QsXG4gICAgLy8gYW5kIGl0IGRvZXMgbm90IGFjdHVhbGx5IHdyaXRlIG91dCBhbnkgY2hhbmdlcyB0byBmaW5hbCBKUyBmaWxlLlxuICAgIC8vIFNvIEkgZGVjaWRlIHRvIHVzZSBvcmlnaW5hbCBOb2RlLmpzIGZpbGUgc3lzdGVtIEFQSVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhkZXN0RmlsZSwgZGF0YSk7XG4gICAgLy8gSXQgc2VlbXMgVHlwZXNjcmlwdCBjb21waWxlciBhbHdheXMgdXNlcyBzbGFzaCBpbnN0ZWFkIG9mIGJhY2sgc2xhc2ggaW4gZmlsZSBwYXRoLCBldmVuIGluIFdpbmRvd3NcbiAgICAvLyByZXR1cm4gX3dyaXRlRmlsZS5jYWxsKHRoaXMsIGRlc3RGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG4gIGhvc3Qud3JpdGVGaWxlID0gd3JpdGVGaWxlO1xuXG4gIC8vIGNvbnN0IF9nZXRTb3VyY2VGaWxlID0gaG9zdC5nZXRTb3VyY2VGaWxlO1xuICAvLyBjb25zdCBnZXRTb3VyY2VGaWxlOiB0eXBlb2YgX2dldFNvdXJjZUZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZSkge1xuICAvLyAgIC8vIGNvbnNvbGUubG9nKCdnZXRTb3VyY2VGaWxlJywgZmlsZU5hbWUpO1xuICAvLyAgIHJldHVybiBfZ2V0U291cmNlRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAvLyB9O1xuICAvLyBob3N0LmdldFNvdXJjZUZpbGUgPSBnZXRTb3VyY2VGaWxlO1xuICByZXR1cm4gZW1pdHRlZExpc3Q7XG59XG5cbmZ1bmN0aW9uIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLldhdGNoQ29tcGlsZXJIb3N0T2ZGaWxlc0FuZENvbXBpbGVyT3B0aW9uczxfdHMuRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbT4gfCBfdHMuQ29tcGlsZXJIb3N0KSB7XG4gIGNvbnN0IHJlYWRGaWxlID0gaG9zdC5yZWFkRmlsZTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGUuY2FsbCh0aGlzLCBwYXRoLCBlbmNvZGluZykgO1xuICAgIGlmIChjb250ZW50ICYmICFwYXRoLmVuZHNXaXRoKCcuZC50cycpICYmICFwYXRoLmVuZHNXaXRoKCcuanNvbicpKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnV2F0Y2hDb21waWxlckhvc3QucmVhZEZpbGUnLCBwYXRoKTtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUocGF0aCwgY29udGVudCk7XG4gICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICBsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkgKyAnIGlzIHBhdGNoZWQnKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xuICB9O1xufVxuXG4vLyBDdXN0b21lciBUcmFuc2Zvcm1lciBzb2x1dGlvbiBpcyBub3QgZmVhc2libGU6IGluIHNvbWUgY2FzZSBsaWtlIGEgV2F0Y2hDb21waWxlciwgaXQgdGhyb3dzIGVycm9yIGxpa2Vcbi8vIFwiY2FuIG5vdCByZWZlcmVuY2UgJy5mbGFncycgb2YgdW5kZWZpbmVkXCIgd2hlbiBhIGN1c3RvbWVyIHRyYW5zZm9ybWVyIHJldHVybiBhIG5ld2x5IGNyZWF0ZWQgU291cmNlRmlsZVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gb3ZlcnJpZGVUc1Byb2dyYW1FbWl0Rm4oZW1pdDogdHMuUHJvZ3JhbVsnZW1pdCddKTogdHMuUHJvZ3JhbVsnZW1pdCddIHtcbi8vICAgLy8gVE9ETzogYWxsb3cgYWRkaW5nIHRyYW5zZm9ybWVyXG4vLyAgIGZ1bmN0aW9uIGhhY2tlZEVtaXQoLi4uYXJnczogUGFyYW1ldGVyczx0cy5Qcm9ncmFtWydlbWl0J10+KSB7XG4vLyAgICAgbGV0IFssLCwsdHJhbnNmb3JtZXJzXSA9IGFyZ3M7XG4vLyAgICAgLy8gbG9nLmluZm8oJ2VtaXQnLCBzcmM/LmZpbGVOYW1lKTtcbi8vICAgICBpZiAodHJhbnNmb3JtZXJzID09IG51bGwpIHtcbi8vICAgICAgIHRyYW5zZm9ybWVycyA9IHt9IGFzIHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbi8vICAgICAgIGFyZ3NbNF0gPSB0cmFuc2Zvcm1lcnM7XG4vLyAgICAgfVxuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMuYmVmb3JlID09IG51bGwpXG4vLyAgICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlID0gW107XG4vLyAgICAgdHJhbnNmb3JtZXJzLmJlZm9yZS5wdXNoKGN0eCA9PiAoe1xuLy8gICAgICAgdHJhbnNmb3JtU291cmNlRmlsZShzcmMpIHtcbi8vICAgICAgICAgbG9nLmRlYnVnKCd0cmFuc2Zvcm1Tb3VyY2VGaWxlJywgc3JjLmZpbGVOYW1lKTtcbi8vICAgICAgICAgcmV0dXJuIHNyYztcbi8vICAgICAgIH0sXG4vLyAgICAgICB0cmFuc2Zvcm1CdW5kbGUobm9kZSkge3JldHVybiBub2RlO31cbi8vICAgICB9KSk7XG4vLyAgICAgLy8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoYXJnc1s0XSkpO1xuLy8gICAgIHJldHVybiBlbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuLy8gICB9O1xuLy8gICByZXR1cm4gaGFja2VkRW1pdDtcbi8vIH1cblxuZnVuY3Rpb24gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIC8vIGxldCBmaWxlSW5mbyA9ICcnO1xuICAvLyBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gIC8vICAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAvLyAgIGNvbnN0IHJlYWxGaWxlID0gcmVhbFBhdGhPZihkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWU7XG4gIC8vICAgZmlsZUluZm8gPSBgJHtyZWFsRmlsZX0sIGxpbmU6ICR7bGluZSArIDF9LCBjb2x1bW46ICR7Y2hhcmFjdGVyICsgMX1gO1xuICAvLyB9XG4gIC8vIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKGBFcnJvciAke2RpYWdub3N0aWMuY29kZX0gJHtmaWxlSW5mb30gOmApLCB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCBmb3JtYXRIb3N0LmdldE5ld0xpbmUoKSkpO1xuICBjb25zdCBvdXQgPSB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoW2RpYWdub3N0aWNdLCB7XG4gICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IHJlYWxQYXRoT2YoZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBmaWxlTmFtZSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxuICB9KTtcbiAgY29uc29sZS5lcnJvcihvdXQpO1xufVxuXG5mdW5jdGlvbiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbZGlhZ25vc3RpY10sIGZvcm1hdEhvc3QpKSk7XG59XG5cbmNvbnN0IENPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERSA9IG5ldyBTZXQoWydiYXNlVXJsJywgJ3R5cGVSb290cycsICdwYXRocycsICdyb290RGlyJ10pO1xuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBvcHRzPzogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtwbGlua0Vudi53b3JrRGlyfVwiIGlzIG5vdCBhIHdvcmsgc3BhY2VgKTtcbiAgfVxuXG4gIGlmIChvcHRzPy5tZXJnZVRzY29uZmlnKSB7XG4gICAgY29uc3QganNvbiA9IG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCBvcHRzLm1lcmdlVHNjb25maWcsIHByb2Nlc3MuY3dkKCksIGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoanNvbi5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAoIUNPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERS5oYXMoa2V5KSkge1xuICAgICAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlO1xuICAgICAgICBsb2cuZGVidWcoJ21lcmdlIGNvbXBpbGVyIG9wdGlvbnMnLCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhcHBlbmRUeXBlUm9vdHMoW10sIGN3ZCwgY29tcGlsZXJPcHRpb25zLCB7fSk7XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiBwbGlua0Vudi53b3JrRGlyLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IGZhbHNlXG4gIH0pO1xuXG4gIGlmIChvcHRzPy5wYXRoc0pzb25zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0cy5wYXRoc0pzb25zKSkge1xuICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gb3B0cy5wYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgICAgICBPYmplY3QuYXNzaWduKHBhdGhNYXAsIEpTT04ucGFyc2UoanNvblN0cikpO1xuICAgICAgICByZXR1cm4gcGF0aE1hcDtcbiAgICAgIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvcHRzLnBhdGhzSnNvbnMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChvcHRzPy5jb21waWxlck9wdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IFtwcm9wLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0cy5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAocHJvcCA9PT0gJ2Jhc2VVcmwnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09ICdwYXRocycpIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyT3B0aW9ucy5wYXRocylcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgdmFsdWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gdmFsdWUgYXMgYW55O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW3Byb3BdID0gdmFsdWUgYXMgYW55O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiByZWFsIHBhdGggb2YgdGFyZ2V0aW5nIGZpbGUsIHJldHVybiBudWxsIGlmIHRhcmdldGluZyBmaWxlIGlzIG5vdCBpbiBvdXIgY29tcGlsaWF0aW9uIHNjb3BlXG4gKiBAcGFyYW0gZmlsZU5hbWUgXG4gKiBAcGFyYW0gY29tbW9uUm9vdERpciBcbiAqIEBwYXJhbSBwYWNrYWdlRGlyVHJlZSBcbiAqL1xuZnVuY3Rpb24gcmVhbFBhdGhPZihmaWxlTmFtZTogc3RyaW5nLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgaXNTcmNGaWxlID0gZmFsc2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlTmFtZSk7XG4gIGNvbnN0IF9vcmlnaW5QYXRoID0gZmlsZU5hbWU7IC8vIGFic29sdXRlIHBhdGhcbiAgY29uc3QgZm91bmRQa2dJbmZvID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCk7XG4gIGlmIChmb3VuZFBrZ0luZm8gPT0gbnVsbCkge1xuICAgIC8vIHRoaXMgZmlsZSBpcyBub3QgcGFydCBvZiBzb3VyY2UgcGFja2FnZS5cbiAgICAvLyBsb2cuaW5mbygnTm90IHBhcnQgb2YgZW50cnkgZmlsZXMnLCBmaWxlTmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qge3NyY0RpciwgZGVzdERpciwgcGtnRGlyLCBpc29tRGlyLCBzeW1saW5rRGlyfSA9IGZvdW5kUGtnSW5mbztcblxuICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoc3ltbGlua0RpciwgX29yaWdpblBhdGgpO1xuXG4gIGlmIChzcmNEaXIgPT09ICcuJyB8fCBzcmNEaXIubGVuZ3RoID09PSAwKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZyk7XG4gIH0gZWxzZSBpZiAocGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKHNyY0RpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHNyY0Rpci5sZW5ndGggKyAxKSk7XG4gIH0gZWxzZSBpZiAoaXNvbURpciAmJiBwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoaXNvbURpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc29tRGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKGlzb21EaXIubGVuZ3RoICsgMSkpO1xuICB9XG4gIHJldHVybiBmaWxlTmFtZTtcbn1cbiJdfQ==