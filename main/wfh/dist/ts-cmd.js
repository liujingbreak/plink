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
const chalk_1 = __importDefault(require("chalk"));
const packageUtils = __importStar(require("./package-utils"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const path_1 = __importStar(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const misc_1 = require("./utils/misc");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const utils_1 = require("./cmd/utils");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_mgr_1 = require("./package-mgr");
const log4js_1 = __importDefault(require("log4js"));
const glob_1 = __importDefault(require("glob"));
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
        const tscCfg = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
            argv.overridePackgeDirs[name] : (0, misc_1.getTscConfigOfPkg)(json);
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
            let patterns = [].concat(tscCfg.include);
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
    programHost.createProgram = function (rootNames, options, host) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (host && host._overrided == null) {
            patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
        }
        const program = origCreateProgram.apply(this, arguments);
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
        const content = readFile.apply(this, arguments);
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
    let fileInfo = '';
    if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
        fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
    }
    console.error(chalk_1.default.red(`Error ${diagnostic.code} ${fileInfo} :`), ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()));
}
function reportWatchStatusChanged(diagnostic, ts = typescript_1.default) {
    console.info(chalk_1.default.cyan(ts.formatDiagnostic(diagnostic, formatHost)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLGtEQUEwQjtBQUMxQiw4REFBZ0Q7QUFDaEQsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1Qiw2Q0FBd0Q7QUFDeEQsNERBQTZCO0FBQzdCLHVDQUF3RTtBQUV4RSwyRUFBdUk7QUFDdkksdUNBQWdEO0FBQ2hELDZEQUF1RDtBQUN2RCwrQ0FBa0U7QUFDbEUsb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QiwrQ0FBMEU7QUFDMUUseURBQStDO0FBQy9DLG1EQUErQztBQUkvQyxNQUFNLEVBQUMsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBQ2xDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBMkI3Qzs7Ozs7O0dBTUc7QUFDSSxLQUFLLFVBQVUsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7SUFDL0Qsa0NBQWtDO0lBQ2xDLGtDQUFrQztJQUNsQyxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFFL0IsTUFBTSxXQUFXLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFFbEgsSUFBSSxtQkFBNEMsQ0FBQztJQUVqRCxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDWixNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNsRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBQSxtQ0FBcUIsRUFBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFDO1FBQ2xE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LENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQ3RFO1NBQU0sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUNqRCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2csIFBhY2thZ2VUc0RpcnMsIHBsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgYWxsUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vY21kL3V0aWxzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzLCBwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7YW5hbHlzZUZpbGVzfSBmcm9tICcuL2NtZC9jbGktYW5hbHl6ZSc7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5leHBvcnQge1JlcXVpcmVkQ29tcGlsZXJPcHRpb25zfTtcblxuY29uc3Qge3N5bWxpbmtEaXJOYW1lfSA9IHBsaW5rRW52O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsudHMtY21kJyk7XG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIC8qKiBtZXJnZSBjb21waWxlck9wdGlvbnMgXCJiYXNlVXJsXCIgYW5kIFwicGF0aHNcIiBmcm9tIHNwZWNpZmllZCB0c2NvbmZpZyBmaWxlICovXG4gIG1lcmdlVHNjb25maWc/OiBzdHJpbmc7XG4gIC8qKiBKU09OIHN0cmluZywgdG8gYmUgbWVyZ2VkIHRvIGNvbXBpbGVyT3B0aW9ucyBcInBhdGhzXCIsXG4gICAqIGJlIGF3YXJlIHRoYXQgXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBcImJhc2VVcmxcIiB3aGljaCBpcyByZWxhdGl2ZSB0byBgUGxpbmtFbnYud29ya0RpcmBcbiAgICogKi9cbiAgcGF0aHNKc29ucz86IEFycmF5PHN0cmluZz4gfCB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgLyoqXG4gICAqIFBhcnRpYWwgY29tcGlsZXIgb3B0aW9ucyB0byBiZSBtZXJnZWQsIGV4Y2VwdCBcImJhc2VVcmxcIi5cbiAgICogXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBgcGxpbmtFbnYud29ya0RpcmBcbiAgICovXG4gIGNvbXBpbGVyT3B0aW9ucz86IGFueTtcbiAgb3ZlcnJpZGVQYWNrZ2VEaXJzPzoge1twa2dOYW1lOiBzdHJpbmddOiBQYWNrYWdlVHNEaXJzfTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VEaXJJbmZvIGV4dGVuZHMgUGFja2FnZVRzRGlycyB7XG4gIHBrZ0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0c2MoYXJndjogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzICk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgLy8gY29uc3QgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyBjb25zdCBjb21wRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgUGFja2FnZURpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cblxuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnM7XG5cbiAgaWYgKGFyZ3YuanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBjb25zdCB0c3hUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSB0c3hUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gICAgLy8gYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICBjb25zdCBiYXNlVHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgfVxuXG4gIC8vIGNvbnN0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZURpckluZm8+KCk7XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwbGlua0Vudi53b3JrRGlyO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGxldCBwa2dJbmZvczogUGFja2FnZUluZm9bXSB8IHVuZGVmaW5lZDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhhcmd2LnBhY2thZ2UpKS5maWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oYWxsUGFja2FnZXMoJyonLCAnc3JjJywgYXJndi5wcm9qZWN0KSk7XG4gIH0gZWxzZSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpciwgZmFsc2UpKTtcbiAgfVxuICBhd2FpdCBQcm9taXNlLmFsbChwa2dJbmZvcy5tYXAocGtnID0+IG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCkpKTtcbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLnN5bWxpbmtEaXIpO1xuICAgIGxvZy5kZWJ1ZygndHJlZVBhdGgnLCB0cmVlUGF0aCk7XG4gICAgcGFja2FnZURpclRyZWUucHV0RGF0YSh0cmVlUGF0aCwgaW5mbyk7XG4gIH1cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzb3VyY2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG5cbiAgY29uc3QgZGVzdERpciA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgY29tbW9uUm9vdERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VDb21waWxlck9wdGlvbnMsXG4gICAgdGFyZ2V0OiAnRVMyMDE3JyxcbiAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbiAgICAvLyBtb2R1bGU6ICdFU05leHQnLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogZGVzdERpcixcbiAgICByb290RGlyOiBkZXN0RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBzb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwICE9PSAnaW5saW5lJyxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZCxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlXG4gIH07XG5cbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zLCBhcmd2LCB0cyk7XG5cbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgLyoqIHNldCBjb21wR2xvYnMgKi9cbiAgYXN5bmMgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBfcGFja2FnZVBhdGg6IHN0cmluZywgX3BhcnNlZE5hbWU6IGFueSwganNvbjogYW55LCByZWFsUGF0aDogc3RyaW5nKSB7XG4gICAgY291bnRQa2crKztcbiAgICBjb25zdCB0c2NDZmcgPSBhcmd2Lm92ZXJyaWRlUGFja2dlRGlycyAmJiBfLmhhcyhhcmd2Lm92ZXJyaWRlUGFja2dlRGlycywgbmFtZSkgP1xuICAgICAgYXJndi5vdmVycmlkZVBhY2tnZURpcnNbbmFtZV0gOiBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICAvLyBGb3Igd29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM3OTYwXG4gICAgLy8gVXNlIGEgc3ltbGluayBwYXRoIGluc3RlYWQgb2YgYSByZWFsIHBhdGgsIHNvIHRoYXQgVHlwZXNjcmlwdCBjb21waWxlciB3aWxsIG5vdFxuICAgIC8vIHJlY29nbml6ZSB0aGVtIGFzIGZyb20gc29tZXdoZXJlIHdpdGggXCJub2RlX21vZHVsZXNcIiwgdGhlIHN5bWxpbmsgbXVzdCBiZSByZXNpZGVcbiAgICAvLyBpbiBkaXJlY3Rvcnkgd2hpY2ggZG9lcyBub3QgY29udGFpbiBcIm5vZGVfbW9kdWxlc1wiIGFzIHBhcnQgb2YgYWJzb2x1dGUgcGF0aC5cbiAgICBjb25zdCBzeW1saW5rRGlyID0gcmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgbmFtZSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGgsIHN5bWxpbmtEaXJ9KTtcblxuICAgIGNvbnN0IHNyY0RpcnMgPSBbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgaWYgKHNyY0RpciA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihzeW1saW5rRGlyLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoc3JjRGlycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzeW1saW5rRGlyKSkge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIGRpcmVjdG9yeSAke2NoYWxrLnJlZChzeW1saW5rRGlyKX0sYCArXG4gICAgICAgIGAgaXQgaXMgcG9zc2libGUgdGhhdCBwYWNrYWdlICR7bmFtZX0gaXMgeWV0IG5vdCBhZGRlZCB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlJ3MgcGFja2FnZS5qc29uIGZpbGUsYCArXG4gICAgICAgICcgY3VycmVudCB3b3JrdHJlZSBzcGFjZSBpcyBub3Qgc3luY2VkIHlldCwgdHJ5IFwic3luY1wiL1wiaW5pdFwiIGNvbW1hbmQgcGxlYXNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIHRzIHNvdXJjZSBkaXJlY3RvcnkgZm91bmQgZm9yIHBhY2thZ2UgJHtjaGFsay5yZWQobmFtZSl9OmAgK1xuICAgICAgICAgIGAgJHtbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCkuam9pbignLCAnKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHNjQ2ZnLmZpbGVzKSB7XG4gICAgICBjb25zdCBmaWxlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5maWxlcyk7XG4gICAgICBjb25zdCBhUmVzID0gYXdhaXQgYW5hbHlzZUZpbGVzKGZpbGVzLm1hcChmaWxlID0+IHJlc29sdmUoc3ltbGlua0RpciwgZmlsZSkpLCBhcmd2Lm1lcmdlVHNjb25maWcsIFtdKTtcbiAgICAgIGxvZy5kZWJ1ZygnYW5hbHl6ZWQgZmlsZXM6JywgYVJlcyk7XG4gICAgICBpZiAoYVJlcykge1xuICAgICAgICByb290RmlsZXMucHVzaCguLi4oYVJlcy5maWxlcy5maWx0ZXIoZmlsZSA9PiBmaWxlLnN0YXJ0c1dpdGgoc3ltbGlua0RpciArIHNlcCkgJiYgIS9cXC4oPzpqc3g/fGRcXC50cykkLy50ZXN0KGZpbGUpKVxuICAgICAgICAgIC5tYXAoZmlsZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgbGV0IHBhdHRlcm5zID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmluY2x1ZGUpO1xuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XG4gICAgICAgIGNvbnN0IGdsb2JQYXR0ZXJuID0gcmVzb2x2ZShzeW1saW5rRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGdsb2Iuc3luYyhnbG9iUGF0dGVybikuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0c2NDZmcuZmlsZXMgPT0gbnVsbCAmJiB0c2NDZmcuaW5jbHVkZSA9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzKSB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSByZXNvbHZlKHN5bWxpbmtEaXIsIHNyY0RpciEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgZ2xvYi5zeW5jKHJlbFBhdGggKyAnLyoqLyoudHMnKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgZ2xvYi5zeW5jKHJlbFBhdGggKyAnLyoqLyoudHN4JykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gbG9nLndhcm4oJ3Jvb3RGaWxlczpcXG4nICsgcm9vdEZpbGVzLmpvaW4oJ1xcbicpKTtcbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIHdhdGNoKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICAgIHJldHVybiBbXTtcbiAgICAvLyB3YXRjaChjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGFyZ3YuZWQsIGFyZ3YuanN4LCBvbkNvbXBpbGVkKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbWl0dGVkID0gY29tcGlsZShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAvLyBwcm9tQ29tcGlsZSA9IGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkKTtcbiAgfVxufVxuXG5jb25zdCBmb3JtYXRIb3N0OiBfdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogcGF0aCA9PiBwYXRoLFxuICBnZXRDdXJyZW50RGlyZWN0b3J5OiBfdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnksXG4gIGdldE5ld0xpbmU6ICgpID0+IF90cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gd2F0Y2gocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHtcbiAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICB9XG4gIGNvbnN0IHByb2dyYW1Ib3N0ID0gdHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Qocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIHRzLnN5cyxcbiAgICB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLCBfcmVwb3J0RGlhZ25vc3RpYywgZCA9PiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZCwgdHMpKTtcbiAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChwcm9ncmFtSG9zdCk7XG5cbiAgY29uc3Qgb3JpZ0NyZWF0ZVByb2dyYW0gPSBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtO1xuICAvLyBUcydzIGNyZWF0ZVdhdGNoUHJvZ3JhbSB3aWxsIGNhbGwgV2F0Y2hDb21waWxlckhvc3QuY3JlYXRlUHJvZ3JhbSgpLCB0aGlzIGlzIHdoZXJlIHdlIHBhdGNoIFwiQ29tcGlsZXJIb3N0XCJcbiAgcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10gfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBob3N0PzogX3RzLkNvbXBpbGVySG9zdCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uYXBwbHkodGhpcywgYXJndW1lbnRzIGFzIGFueSkgO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9O1xuXG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuICB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG4gIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcbiAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0KTtcbiAgY29uc3QgZW1pdHRlZCA9IHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMsIHRzKTtcbiAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGhvc3QpO1xuICBjb25zdCBlbWl0UmVzdWx0ID0gcHJvZ3JhbS5lbWl0KCk7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdHMuZ2V0UHJlRW1pdERpYWdub3N0aWNzKHByb2dyYW0pXG4gICAgLmNvbmNhdChlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gIH1cbiAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbiAgfSk7XG4gIGlmIChlbWl0UmVzdWx0LmVtaXRTa2lwcGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb21waWxlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBlbWl0dGVkO1xufVxuXG4vKiogT3ZlcnJpZGluZyBXcml0ZUZpbGUoKSAqL1xuZnVuY3Rpb24gcGF0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLkNvbXBpbGVySG9zdCwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4gIGNvOiBfdHMuQ29tcGlsZXJPcHRpb25zLCB0czogdHlwZW9mIF90cyA9IF90cyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZW1pdHRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4gIC8vIEl0IHNlZW1zIHRvIG5vdCBhYmxlIHRvIHdyaXRlIGZpbGUgdGhyb3VnaCBzeW1saW5rIGluIFdpbmRvd3NcbiAgLy8gY29uc3QgX3dyaXRlRmlsZSA9IGhvc3Qud3JpdGVGaWxlO1xuICBjb25zdCB3cml0ZUZpbGU6IF90cy5Xcml0ZUZpbGVDYWxsYmFjayA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSB7XG4gICAgY29uc3QgZGVzdEZpbGUgPSByZWFsUGF0aE9mKGZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKGRlc3RGaWxlID09IG51bGwpIHtcbiAgICAgIGxvZy5kZWJ1Zygnc2tpcCcsIGZpbGVOYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZW1pdHRlZExpc3QucHVzaChkZXN0RmlsZSk7XG4gICAgbG9nLmluZm8oJ3dyaXRlIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGRlc3RGaWxlKSk7XG4gICAgLy8gVHlwZXNjcmlwdCdzIHdyaXRlRmlsZSgpIGZ1bmN0aW9uIHBlcmZvcm1zIHdlaXJkIHdpdGggc3ltbGlua3MgdW5kZXIgd2F0Y2ggbW9kZSBpbiBXaW5kb3dzOlxuICAgIC8vIEV2ZXJ5IHRpbWUgYSB0cyBmaWxlIGlzIGNoYW5nZWQsIGl0IHRyaWdnZXJzIHRoZSBzeW1saW5rIGJlaW5nIGNvbXBpbGVkIGFuZCB0byBiZSB3cml0dGVuIHdoaWNoIGlzXG4gICAgLy8gYXMgZXhwZWN0ZWQgYnkgbWUsXG4gICAgLy8gYnV0IGxhdGUgb24gaXQgdHJpZ2dlcnMgdGhlIHNhbWUgcmVhbCBmaWxlIGFsc28gYmVpbmcgd3JpdHRlbiBpbW1lZGlhdGVseSwgdGhpcyBpcyBub3Qgd2hhdCBJIGV4cGVjdCxcbiAgICAvLyBhbmQgaXQgZG9lcyBub3QgYWN0dWFsbHkgd3JpdGUgb3V0IGFueSBjaGFuZ2VzIHRvIGZpbmFsIEpTIGZpbGUuXG4gICAgLy8gU28gSSBkZWNpZGUgdG8gdXNlIG9yaWdpbmFsIE5vZGUuanMgZmlsZSBzeXN0ZW0gQVBJXG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZGVzdEZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3RGaWxlLCBkYXRhKTtcbiAgICAvLyBJdCBzZWVtcyBUeXBlc2NyaXB0IGNvbXBpbGVyIGFsd2F5cyB1c2VzIHNsYXNoIGluc3RlYWQgb2YgYmFjayBzbGFzaCBpbiBmaWxlIHBhdGgsIGV2ZW4gaW4gV2luZG93c1xuICAgIC8vIHJldHVybiBfd3JpdGVGaWxlLmNhbGwodGhpcywgZGVzdEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCAuLi5BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcbiAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZUZpbGU7XG5cbiAgLy8gY29uc3QgX2dldFNvdXJjZUZpbGUgPSBob3N0LmdldFNvdXJjZUZpbGU7XG4gIC8vIGNvbnN0IGdldFNvdXJjZUZpbGU6IHR5cGVvZiBfZ2V0U291cmNlRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG4gIC8vICAgLy8gY29uc29sZS5sb2coJ2dldFNvdXJjZUZpbGUnLCBmaWxlTmFtZSk7XG4gIC8vICAgcmV0dXJuIF9nZXRTb3VyY2VGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIC8vIH07XG4gIC8vIGhvc3QuZ2V0U291cmNlRmlsZSA9IGdldFNvdXJjZUZpbGU7XG4gIHJldHVybiBlbWl0dGVkTGlzdDtcbn1cblxuZnVuY3Rpb24gcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuV2F0Y2hDb21waWxlckhvc3RPZkZpbGVzQW5kQ29tcGlsZXJPcHRpb25zPF90cy5FbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtPiB8IF90cy5Db21waWxlckhvc3QpIHtcbiAgY29uc3QgcmVhZEZpbGUgPSBob3N0LnJlYWRGaWxlO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBob3N0LnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMgYXMgYW55KSA7XG4gICAgaWYgKGNvbnRlbnQgJiYgIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdXYXRjaENvbXBpbGVySG9zdC5yZWFkRmlsZScsIHBhdGgpO1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHdlYkluamVjdG9yLmluamVjdFRvRmlsZShwYXRoLCBjb250ZW50KTtcbiAgICAgIGlmIChjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4gICAgICAgIGxvZy5pbmZvKFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSArICcgaXMgcGF0Y2hlZCcpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH07XG59XG5cbi8vIEN1c3RvbWVyIFRyYW5zZm9ybWVyIHNvbHV0aW9uIGlzIG5vdCBmZWFzaWJsZTogaW4gc29tZSBjYXNlIGxpa2UgYSBXYXRjaENvbXBpbGVyLCBpdCB0aHJvd3MgZXJyb3IgbGlrZVxuLy8gXCJjYW4gbm90IHJlZmVyZW5jZSAnLmZsYWdzJyBvZiB1bmRlZmluZWRcIiB3aGVuIGEgY3VzdG9tZXIgdHJhbnNmb3JtZXIgcmV0dXJuIGEgbmV3bHkgY3JlYXRlZCBTb3VyY2VGaWxlXG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBvdmVycmlkZVRzUHJvZ3JhbUVtaXRGbihlbWl0OiB0cy5Qcm9ncmFtWydlbWl0J10pOiB0cy5Qcm9ncmFtWydlbWl0J10ge1xuLy8gICAvLyBUT0RPOiBhbGxvdyBhZGRpbmcgdHJhbnNmb3JtZXJcbi8vICAgZnVuY3Rpb24gaGFja2VkRW1pdCguLi5hcmdzOiBQYXJhbWV0ZXJzPHRzLlByb2dyYW1bJ2VtaXQnXT4pIHtcbi8vICAgICBsZXQgWywsLCx0cmFuc2Zvcm1lcnNdID0gYXJncztcbi8vICAgICAvLyBsb2cuaW5mbygnZW1pdCcsIHNyYz8uZmlsZU5hbWUpO1xuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMgPT0gbnVsbCkge1xuLy8gICAgICAgdHJhbnNmb3JtZXJzID0ge30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xuLy8gICAgICAgYXJnc1s0XSA9IHRyYW5zZm9ybWVycztcbi8vICAgICB9XG4vLyAgICAgaWYgKHRyYW5zZm9ybWVycy5iZWZvcmUgPT0gbnVsbClcbi8vICAgICAgIHRyYW5zZm9ybWVycy5iZWZvcmUgPSBbXTtcbi8vICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlLnB1c2goY3R4ID0+ICh7XG4vLyAgICAgICB0cmFuc2Zvcm1Tb3VyY2VGaWxlKHNyYykge1xuLy8gICAgICAgICBsb2cuZGVidWcoJ3RyYW5zZm9ybVNvdXJjZUZpbGUnLCBzcmMuZmlsZU5hbWUpO1xuLy8gICAgICAgICByZXR1cm4gc3JjO1xuLy8gICAgICAgfSxcbi8vICAgICAgIHRyYW5zZm9ybUJ1bmRsZShub2RlKSB7cmV0dXJuIG5vZGU7fVxuLy8gICAgIH0pKTtcbi8vICAgICAvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhcmdzWzRdKSk7XG4vLyAgICAgcmV0dXJuIGVtaXQuYXBwbHkodGhpcywgYXJncyk7XG4vLyAgIH07XG4vLyAgIHJldHVybiBoYWNrZWRFbWl0O1xuLy8gfVxuXG5mdW5jdGlvbiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgbGV0IGZpbGVJbmZvID0gJyc7XG4gIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICBjb25zdCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gZGlhZ25vc3RpYy5maWxlLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGRpYWdub3N0aWMuc3RhcnQhKTtcbiAgICBjb25zdCByZWFsRmlsZSA9IHJlYWxQYXRoT2YoZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHJ1ZSkgfHwgZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lO1xuICAgIGZpbGVJbmZvID0gYCR7cmVhbEZpbGV9LCBsaW5lOiAke2xpbmUgKyAxfSwgY29sdW1uOiAke2NoYXJhY3RlciArIDF9YDtcbiAgfVxuICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZChgRXJyb3IgJHtkaWFnbm9zdGljLmNvZGV9ICR7ZmlsZUluZm99IDpgKSwgdHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dCggZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCwgZm9ybWF0SG9zdC5nZXROZXdMaW5lKCkpKTtcbn1cblxuZnVuY3Rpb24gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljLCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zb2xlLmluZm8oY2hhbGsuY3lhbih0cy5mb3JtYXREaWFnbm9zdGljKGRpYWdub3N0aWMsIGZvcm1hdEhvc3QpKSk7XG59XG5cbmNvbnN0IENPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERSA9IG5ldyBTZXQoWydiYXNlVXJsJywgJ3R5cGVSb290cycsICdwYXRocycsICdyb290RGlyJ10pO1xuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBvcHRzPzogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtwbGlua0Vudi53b3JrRGlyfVwiIGlzIG5vdCBhIHdvcmsgc3BhY2VgKTtcbiAgfVxuXG4gIGlmIChvcHRzPy5tZXJnZVRzY29uZmlnKSB7XG4gICAgY29uc3QganNvbiA9IG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCBvcHRzLm1lcmdlVHNjb25maWcsIHByb2Nlc3MuY3dkKCksIGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoanNvbi5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAoIUNPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERS5oYXMoa2V5KSkge1xuICAgICAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlO1xuICAgICAgICBsb2cuZGVidWcoJ21lcmdlIGNvbXBpbGVyIG9wdGlvbnMnLCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhcHBlbmRUeXBlUm9vdHMoW10sIGN3ZCwgY29tcGlsZXJPcHRpb25zLCB7fSk7XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiBwbGlua0Vudi53b3JrRGlyLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IGZhbHNlXG4gIH0pO1xuXG4gIGlmIChvcHRzPy5wYXRoc0pzb25zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0cy5wYXRoc0pzb25zKSkge1xuICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gb3B0cy5wYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgICAgICBPYmplY3QuYXNzaWduKHBhdGhNYXAsIEpTT04ucGFyc2UoanNvblN0cikpO1xuICAgICAgICByZXR1cm4gcGF0aE1hcDtcbiAgICAgIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvcHRzLnBhdGhzSnNvbnMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChvcHRzPy5jb21waWxlck9wdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IFtwcm9wLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0cy5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAocHJvcCA9PT0gJ2Jhc2VVcmwnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09ICdwYXRocycpIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyT3B0aW9ucy5wYXRocylcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgdmFsdWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gdmFsdWUgYXMgYW55O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW3Byb3BdID0gdmFsdWUgYXMgYW55O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiByZWFsIHBhdGggb2YgdGFyZ2V0aW5nIGZpbGUsIHJldHVybiBudWxsIGlmIHRhcmdldGluZyBmaWxlIGlzIG5vdCBpbiBvdXIgY29tcGlsaWF0aW9uIHNjb3BlXG4gKiBAcGFyYW0gZmlsZU5hbWUgXG4gKiBAcGFyYW0gY29tbW9uUm9vdERpciBcbiAqIEBwYXJhbSBwYWNrYWdlRGlyVHJlZSBcbiAqL1xuZnVuY3Rpb24gcmVhbFBhdGhPZihmaWxlTmFtZTogc3RyaW5nLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgaXNTcmNGaWxlID0gZmFsc2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlTmFtZSk7XG4gIGNvbnN0IF9vcmlnaW5QYXRoID0gZmlsZU5hbWU7IC8vIGFic29sdXRlIHBhdGhcbiAgY29uc3QgZm91bmRQa2dJbmZvID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCk7XG4gIGlmIChmb3VuZFBrZ0luZm8gPT0gbnVsbCkge1xuICAgIC8vIHRoaXMgZmlsZSBpcyBub3QgcGFydCBvZiBzb3VyY2UgcGFja2FnZS5cbiAgICAvLyBsb2cuaW5mbygnTm90IHBhcnQgb2YgZW50cnkgZmlsZXMnLCBmaWxlTmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qge3NyY0RpciwgZGVzdERpciwgcGtnRGlyLCBpc29tRGlyLCBzeW1saW5rRGlyfSA9IGZvdW5kUGtnSW5mbztcblxuICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoc3ltbGlua0RpciwgX29yaWdpblBhdGgpO1xuXG4gIGlmIChzcmNEaXIgPT09ICcuJyB8fCBzcmNEaXIubGVuZ3RoID09PSAwKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZyk7XG4gIH0gZWxzZSBpZiAocGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKHNyY0RpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHNyY0Rpci5sZW5ndGggKyAxKSk7XG4gIH0gZWxzZSBpZiAoaXNvbURpciAmJiBwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoaXNvbURpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc29tRGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKGlzb21EaXIubGVuZ3RoICsgMSkpO1xuICB9XG4gIHJldHVybiBmaWxlTmFtZTtcbn1cbiJdfQ==