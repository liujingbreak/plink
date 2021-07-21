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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
const { symlinkDirName, rootDir: root } = misc_1.plinkEnv;
const log = log4js_1.default.getLogger('plink.ts-cmd');
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv, ts = typescript_1.default) {
    return __awaiter(this, void 0, void 0, function* () {
        // const compGlobs: string[] = [];
        // const compFiles: string[] = [];
        const rootFiles = [];
        const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
        let baseCompilerOptions;
        if (argv.jsx) {
            const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
            log.info('Use tsconfig file:', baseTsconfigFile2);
            const tsxTsconfig = ts_cmd_util_1.parseConfigFileToJson(ts, baseTsconfigFile2);
            baseCompilerOptions = tsxTsconfig.compilerOptions;
            // baseCompilerOptions = {...baseCompilerOptions, ...tsxTsconfig.config.compilerOptions};
        }
        else {
            const baseTsconfigFile = require.resolve('../tsconfig-base.json');
            const baseTsconfig = ts_cmd_util_1.parseConfigFileToJson(ts, baseTsconfigFile);
            log.info('Use tsconfig file:', baseTsconfigFile);
            baseCompilerOptions = baseTsconfig.compilerOptions;
        }
        // const promCompile = Promise.resolve( [] as EmitList);
        const packageDirTree = new dir_tree_1.DirTree();
        const commonRootDir = misc_1.plinkEnv.workDir;
        let countPkg = 0;
        let pkgInfos;
        if (argv.package && argv.package.length > 0)
            pkgInfos = Array.from(utils_1.findPackagesByNames(argv.package)).filter(pkg => pkg != null);
        // packageUtils.findAllPackages(argv.package, onComponent, 'src');
        else if (argv.project && argv.project.length > 0) {
            pkgInfos = Array.from(package_list_helper_1.allPackages('*', 'src', argv.project));
        }
        else {
            pkgInfos = Array.from(packageUtils.packages4Workspace(misc_1.plinkEnv.workDir, false));
            // for (const pkg of packageUtils.packages4Workspace(plinkEnv.workDir, false)) {
            //   onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath);
            // }
        }
        yield Promise.all(pkgInfos.map(pkg => onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath)));
        for (const info of compDirInfo.values()) {
            const treePath = path_1.relative(commonRootDir, info.symlinkDir);
            log.debug('treePath', treePath);
            packageDirTree.putData(treePath, info);
        }
        if (countPkg === 0) {
            throw new Error('No available source package found in current workspace');
        }
        const destDir = commonRootDir.replace(/\\/g, '/');
        const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { importHelpers: false, declaration: true, 
            /**
             * for gulp-sourcemaps usage:
             *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
             */
            outDir: destDir, rootDir: destDir, skipLibCheck: true, inlineSourceMap: argv.sourceMap === 'inline', sourceMap: argv.sourceMap !== 'inline', inlineSources: argv.sourceMap === 'inline', emitDeclarationOnly: argv.ed });
        setupCompilerOptionsWithPackages(compilerOptions, argv, ts);
        log.info('typescript compilerOptions:', compilerOptions);
        /** set compGlobs */
        function onComponent(name, _packagePath, _parsedName, json, realPath) {
            return __awaiter(this, void 0, void 0, function* () {
                countPkg++;
                const tscCfg = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
                    argv.overridePackgeDirs[name] : misc_1.getTscConfigOfPkg(json);
                // For workaround https://github.com/microsoft/TypeScript/issues/37960
                // Use a symlink path instead of a real path, so that Typescript compiler will not
                // recognize them as from somewhere with "node_modules", the symlink must be reside
                // in directory which does not contain "node_modules" as part of absolute path.
                const symlinkDir = path_1.resolve(misc_1.plinkEnv.workDir, symlinkDirName, name);
                compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: realPath, symlinkDir }));
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
                            ` ${[tscCfg.srcDir, tscCfg.isomDir].filter(item => item != null).join(', ')}`);
                    }
                }
                if (tscCfg.files) {
                    const files = [].concat(tscCfg.files);
                    const aRes = yield cli_analyze_1.analyseFiles(files.map(file => path_1.resolve(symlinkDir, file)), argv.mergeTsconfig, []);
                    log.debug('analyzed files:', aRes);
                    rootFiles.push(...(aRes.files.filter(file => file.startsWith(symlinkDir + path_1.sep) && !/\.(?:jsx?|d\.ts)$/.test(file))
                        .map(file => file.replace(/\\/g, '/'))));
                }
                if (tscCfg.include) {
                    let patterns = [].concat(tscCfg.include);
                    for (const pattern of patterns) {
                        const globPattern = path_1.resolve(symlinkDir, pattern).replace(/\\/g, '/');
                        glob_1.default.sync(globPattern).filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                    }
                }
                if (tscCfg.files == null && tscCfg.include == null) {
                    for (const srcDir of srcDirs) {
                        const relPath = path_1.resolve(symlinkDir, srcDir).replace(/\\/g, '/');
                        glob_1.default.sync(relPath + '/**/*.ts').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                        if (argv.jsx) {
                            glob_1.default.sync(relPath + '/**/*.tsx').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
                        }
                    }
                }
            });
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
    });
}
exports.tsc = tsc;
const formatHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
    getNewLine: () => typescript_1.default.sys.newLine
};
function watch(rootFiles, jsonCompilerOpt, commonRootDir, packageDirTree, ts = typescript_1.default) {
    const compilerOptions = ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree, ts);
    }
    const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys, ts.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, d => reportWatchStatusChanged(d, ts));
    patchWatchCompilerHost(programHost);
    const origCreateProgram = programHost.createProgram;
    // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
    programHost.createProgram = function (rootNames, options, host) {
        if (host && host._overrided == null) {
            patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
        }
        const program = origCreateProgram.apply(this, arguments);
        return program;
    };
    ts.createWatchProgram(programHost);
}
function compile(rootFiles, jsonCompilerOpt, commonRootDir, packageDirTree, ts = typescript_1.default) {
    const compilerOptions = ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, ts.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
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
    const cwd = misc_1.plinkEnv.workDir;
    let wsKey = package_mgr_1.workspaceKey(cwd);
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error(`Current directory "${cwd}" is not a work space`);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.mergeTsconfig) {
        const json = ts_cmd_util_1.mergeBaseUrlAndPaths(ts, opts.mergeTsconfig, cwd, compilerOptions);
        for (const [key, value] of Object.entries(json.compilerOptions)) {
            if (!COMPILER_OPTIONS_MERGE_EXCLUDE.has(key)) {
                compilerOptions[key] = value;
                log.debug('merge compiler options', key, value);
            }
        }
    }
    package_list_helper_1.setTsCompilerOptForNodePath(cwd, './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNkI7QUFDN0IsdUNBQXdFO0FBRXhFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsNkRBQXVEO0FBQ3ZELCtDQUFrRTtBQUNsRSxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtDQUEwRTtBQUMxRSx5REFBK0M7QUFDL0MsbURBQStDO0FBSS9DLE1BQU0sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxHQUFHLGVBQVEsQ0FBQztBQUNqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQTJCN0M7Ozs7OztHQU1HO0FBQ0gsU0FBc0IsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7O1FBQy9ELGtDQUFrQztRQUNsQyxrQ0FBa0M7UUFDbEMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1FBRS9CLE1BQU0sV0FBVyxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO1FBRWxILElBQUksbUJBQTRDLENBQUM7UUFFakQsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1osTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sV0FBVyxHQUFHLG1DQUFxQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2pFLG1CQUFtQixHQUFHLFdBQVcsQ0FB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QU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMvRjtTQUFNLElBQUksT0FBTyxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLFVBQUcsQ0FBQyxFQUFFO1FBQzdELFFBQVEsR0FBRyxXQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2csIFBhY2thZ2VUc0RpcnMsIHBsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgYWxsUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vY21kL3V0aWxzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzLCBwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7YW5hbHlzZUZpbGVzfSBmcm9tICcuL2NtZC9jbGktYW5hbHl6ZSc7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5leHBvcnQge1JlcXVpcmVkQ29tcGlsZXJPcHRpb25zfTtcblxuY29uc3Qge3N5bWxpbmtEaXJOYW1lLCByb290RGlyOiByb290fSA9IHBsaW5rRW52O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsudHMtY21kJyk7XG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIC8qKiBtZXJnZSBjb21waWxlck9wdGlvbnMgXCJiYXNlVXJsXCIgYW5kIFwicGF0aHNcIiBmcm9tIHNwZWNpZmllZCB0c2NvbmZpZyBmaWxlICovXG4gIG1lcmdlVHNjb25maWc/OiBzdHJpbmc7XG4gIC8qKiBKU09OIHN0cmluZywgdG8gYmUgbWVyZ2VkIHRvIGNvbXBpbGVyT3B0aW9ucyBcInBhdGhzXCIsXG4gICAqIGJlIGF3YXJlIHRoYXQgXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBcImJhc2VVcmxcIiB3aGljaCBpcyByZWxhdGl2ZSB0byBgUGxpbmtFbnYud29ya0RpcmBcbiAgICogKi9cbiAgcGF0aHNKc29ucz86IEFycmF5PHN0cmluZz4gfCB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgLyoqXG4gICAqIFBhcnRpYWwgY29tcGlsZXIgb3B0aW9ucyB0byBiZSBtZXJnZWQsIGV4Y2VwdCBcImJhc2VVcmxcIi5cbiAgICogXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBgcGxpbmtFbnYud29ya0RpcmBcbiAgICovXG4gIGNvbXBpbGVyT3B0aW9ucz86IGFueTtcbiAgb3ZlcnJpZGVQYWNrZ2VEaXJzPzoge1twa2dOYW1lOiBzdHJpbmddOiBQYWNrYWdlVHNEaXJzfTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VEaXJJbmZvIGV4dGVuZHMgUGFja2FnZVRzRGlycyB7XG4gIHBrZ0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0c2MoYXJndjogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzICk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgLy8gY29uc3QgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyBjb25zdCBjb21wRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgUGFja2FnZURpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cblxuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnM7XG5cbiAgaWYgKGFyZ3YuanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBjb25zdCB0c3hUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSB0c3hUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gICAgLy8gYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICBjb25zdCBiYXNlVHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgfVxuXG4gIC8vIGNvbnN0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZURpckluZm8+KCk7XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwbGlua0Vudi53b3JrRGlyO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGxldCBwa2dJbmZvczogUGFja2FnZUluZm9bXSB8IHVuZGVmaW5lZDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhhcmd2LnBhY2thZ2UpKS5maWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuICAgIC8vIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oYWxsUGFja2FnZXMoJyonLCAnc3JjJywgYXJndi5wcm9qZWN0KSk7XG4gIH0gZWxzZSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpciwgZmFsc2UpKTtcbiAgICAvLyBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIsIGZhbHNlKSkge1xuICAgIC8vICAgb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKTtcbiAgICAvLyB9XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwocGtnSW5mb3MubWFwKHBrZyA9PiBvbkNvbXBvbmVudChwa2cubmFtZSwgcGtnLnBhdGgsIG51bGwsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgpKSk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5zeW1saW5rRGlyKTtcbiAgICBsb2cuZGVidWcoJ3RyZWVQYXRoJywgdHJlZVBhdGgpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc291cmNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGRlc3REaXIgPSBjb21tb25Sb290RGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAuLi5iYXNlQ29tcGlsZXJPcHRpb25zLFxuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogZGVzdERpcixcbiAgICByb290RGlyOiBkZXN0RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBzb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwICE9PSAnaW5saW5lJyxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcblxuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMsIGFyZ3YsIHRzKTtcblxuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICAvKiogc2V0IGNvbXBHbG9icyAqL1xuICBhc3luYyBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIF9wYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZzogUGFja2FnZVRzRGlycyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXSA6IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuICAgIC8vIEZvciB3b3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc5NjBcbiAgICAvLyBVc2UgYSBzeW1saW5rIHBhdGggaW5zdGVhZCBvZiBhIHJlYWwgcGF0aCwgc28gdGhhdCBUeXBlc2NyaXB0IGNvbXBpbGVyIHdpbGwgbm90XG4gICAgLy8gcmVjb2duaXplIHRoZW0gYXMgZnJvbSBzb21ld2hlcmUgd2l0aCBcIm5vZGVfbW9kdWxlc1wiLCB0aGUgc3ltbGluayBtdXN0IGJlIHJlc2lkZVxuICAgIC8vIGluIGRpcmVjdG9yeSB3aGljaCBkb2VzIG5vdCBjb250YWluIFwibm9kZV9tb2R1bGVzXCIgYXMgcGFydCBvZiBhYnNvbHV0ZSBwYXRoLlxuICAgIGNvbnN0IHN5bWxpbmtEaXIgPSByZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBuYW1lKTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwgey4uLnRzY0NmZywgcGtnRGlyOiByZWFsUGF0aCwgc3ltbGlua0Rpcn0pO1xuXG4gICAgY29uc3Qgc3JjRGlycyA9IFt0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHN5bWxpbmtEaXIsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChzcmNEaXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHN5bWxpbmtEaXIpKSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgZGlyZWN0b3J5ICR7Y2hhbGsucmVkKHN5bWxpbmtEaXIpfSxgICtcbiAgICAgICAgYCBpdCBpcyBwb3NzaWJsZSB0aGF0IHBhY2thZ2UgJHtuYW1lfSBpcyB5ZXQgbm90IGFkZGVkIHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UncyBwYWNrYWdlLmpzb24gZmlsZSxgICtcbiAgICAgICAgJyBjdXJyZW50IHdvcmt0cmVlIHNwYWNlIGlzIG5vdCBzeW5jZWQgeWV0LCB0cnkgXCJzeW5jXCIvXCJpbml0XCIgY29tbWFuZCBwbGVhc2UnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgdHMgc291cmNlIGRpcmVjdG9yeSBmb3VuZCBmb3IgcGFja2FnZSAke2NoYWxrLnJlZChuYW1lKX06YCArXG4gICAgICAgICAgYCAke1t0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKS5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0c2NDZmcuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGZpbGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmZpbGVzKTtcbiAgICAgIGNvbnN0IGFSZXMgPSBhd2FpdCBhbmFseXNlRmlsZXMoZmlsZXMubWFwKGZpbGUgPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBmaWxlKSksIGFyZ3YubWVyZ2VUc2NvbmZpZywgW10pO1xuICAgICAgbG9nLmRlYnVnKCdhbmFseXplZCBmaWxlczonLCBhUmVzKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLihhUmVzLmZpbGVzLmZpbHRlcihmaWxlID0+IGZpbGUuc3RhcnRzV2l0aChzeW1saW5rRGlyICsgc2VwKSAmJiAhL1xcLig/OmpzeD98ZFxcLnRzKSQvLnRlc3QoZmlsZSkpXG4gICAgICAgIC5tYXAoZmlsZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgIGxldCBwYXR0ZXJucyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5pbmNsdWRlKTtcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgICBjb25zdCBnbG9iUGF0dGVybiA9IHJlc29sdmUoc3ltbGlua0RpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBnbG9iLnN5bmMoZ2xvYlBhdHRlcm4pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmZpbGVzID09IG51bGwgJiYgdHNjQ2ZnLmluY2x1ZGUgPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlycykge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShzeW1saW5rRGlyLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzJykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzeCcpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGxvZy53YXJuKCdyb290RmlsZXM6XFxuJyArIHJvb3RGaWxlcy5qb2luKCdcXG4nKSk7XG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICB3YXRjaChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICByZXR1cm4gW107XG4gICAgLy8gd2F0Y2goY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkLCBhcmd2LmpzeCwgb25Db21waWxlZCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgLy8gcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCk7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IHBhdGggPT4gcGF0aCxcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsXG4gICAgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSwgX3JlcG9ydERpYWdub3N0aWMsIGQgPT4gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGQsIHRzKSk7XG4gIHBhdGNoV2F0Y2hDb21waWxlckhvc3QocHJvZ3JhbUhvc3QpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgLy8gVHMncyBjcmVhdGVXYXRjaFByb2dyYW0gd2lsbCBjYWxsIFdhdGNoQ29tcGlsZXJIb3N0LmNyZWF0ZVByb2dyYW0oKSwgdGhpcyBpcyB3aGVyZSB3ZSBwYXRjaCBcIkNvbXBpbGVySG9zdFwiXG4gIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgaG9zdD86IF90cy5Db21waWxlckhvc3QpIHtcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uYXBwbHkodGhpcywgYXJndW1lbnRzKSBhcyBSZXR1cm5UeXBlPHR5cGVvZiBvcmlnQ3JlYXRlUHJvZ3JhbT47XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH07XG5cbiAgdHMuY3JlYXRlV2F0Y2hQcm9ncmFtKHByb2dyYW1Ib3N0KTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4gIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3QpO1xuICBjb25zdCBlbWl0dGVkID0gcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGVtaXRSZXN1bHQgPSBwcm9ncmFtLmVtaXQoKTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0cy5nZXRQcmVFbWl0RGlhZ25vc3RpY3MocHJvZ3JhbSlcbiAgICAuY29uY2F0KGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMpO1xuICB9KTtcbiAgaWYgKGVtaXRSZXN1bHQuZW1pdFNraXBwZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBpbGUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGVtaXR0ZWQ7XG59XG5cbi8qKiBPdmVycmlkaW5nIFdyaXRlRmlsZSgpICovXG5mdW5jdGlvbiBwYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuQ29tcGlsZXJIb3N0LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPixcbiAgY286IF90cy5Db21waWxlck9wdGlvbnMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKTogc3RyaW5nW10ge1xuICBjb25zdCBlbWl0dGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgLy8gSXQgc2VlbXMgdG8gbm90IGFibGUgdG8gd3JpdGUgZmlsZSB0aHJvdWdoIHN5bWxpbmsgaW4gV2luZG93c1xuICAvLyBjb25zdCBfd3JpdGVGaWxlID0gaG9zdC53cml0ZUZpbGU7XG4gIGNvbnN0IHdyaXRlRmlsZTogX3RzLldyaXRlRmlsZUNhbGxiYWNrID0gZnVuY3Rpb24oZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpIHtcbiAgICBjb25zdCBkZXN0RmlsZSA9IHJlYWxQYXRoT2YoZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICBpZiAoZGVzdEZpbGUgPT0gbnVsbCkge1xuICAgICAgbG9nLmRlYnVnKCdza2lwJywgZmlsZU5hbWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbWl0dGVkTGlzdC5wdXNoKGRlc3RGaWxlKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgZmlsZScsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZGVzdEZpbGUpKTtcbiAgICAvLyBUeXBlc2NyaXB0J3Mgd3JpdGVGaWxlKCkgZnVuY3Rpb24gcGVyZm9ybXMgd2VpcmQgd2l0aCBzeW1saW5rcyB1bmRlciB3YXRjaCBtb2RlIGluIFdpbmRvd3M6XG4gICAgLy8gRXZlcnkgdGltZSBhIHRzIGZpbGUgaXMgY2hhbmdlZCwgaXQgdHJpZ2dlcnMgdGhlIHN5bWxpbmsgYmVpbmcgY29tcGlsZWQgYW5kIHRvIGJlIHdyaXR0ZW4gd2hpY2ggaXNcbiAgICAvLyBhcyBleHBlY3RlZCBieSBtZSxcbiAgICAvLyBidXQgbGF0ZSBvbiBpdCB0cmlnZ2VycyB0aGUgc2FtZSByZWFsIGZpbGUgYWxzbyBiZWluZyB3cml0dGVuIGltbWVkaWF0ZWx5LCB0aGlzIGlzIG5vdCB3aGF0IEkgZXhwZWN0LFxuICAgIC8vIGFuZCBpdCBkb2VzIG5vdCBhY3R1YWxseSB3cml0ZSBvdXQgYW55IGNoYW5nZXMgdG8gZmluYWwgSlMgZmlsZS5cbiAgICAvLyBTbyBJIGRlY2lkZSB0byB1c2Ugb3JpZ2luYWwgTm9kZS5qcyBmaWxlIHN5c3RlbSBBUElcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShkZXN0RmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZGVzdEZpbGUsIGRhdGEpO1xuICAgIC8vIEl0IHNlZW1zIFR5cGVzY3JpcHQgY29tcGlsZXIgYWx3YXlzIHVzZXMgc2xhc2ggaW5zdGVhZCBvZiBiYWNrIHNsYXNoIGluIGZpbGUgcGF0aCwgZXZlbiBpbiBXaW5kb3dzXG4gICAgLy8gcmV0dXJuIF93cml0ZUZpbGUuY2FsbCh0aGlzLCBkZXN0RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyksIC4uLkFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuICBob3N0LndyaXRlRmlsZSA9IHdyaXRlRmlsZTtcblxuICAvLyBjb25zdCBfZ2V0U291cmNlRmlsZSA9IGhvc3QuZ2V0U291cmNlRmlsZTtcbiAgLy8gY29uc3QgZ2V0U291cmNlRmlsZTogdHlwZW9mIF9nZXRTb3VyY2VGaWxlID0gZnVuY3Rpb24oZmlsZU5hbWUpIHtcbiAgLy8gICAvLyBjb25zb2xlLmxvZygnZ2V0U291cmNlRmlsZScsIGZpbGVOYW1lKTtcbiAgLy8gICByZXR1cm4gX2dldFNvdXJjZUZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgLy8gfTtcbiAgLy8gaG9zdC5nZXRTb3VyY2VGaWxlID0gZ2V0U291cmNlRmlsZTtcbiAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xufVxuXG5mdW5jdGlvbiBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5XYXRjaENvbXBpbGVySG9zdE9mRmlsZXNBbmRDb21waWxlck9wdGlvbnM8X3RzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0+IHwgX3RzLkNvbXBpbGVySG9zdCkge1xuICBjb25zdCByZWFkRmlsZSA9IGhvc3QucmVhZEZpbGU7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGhvc3QucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyBhcyBhbnkpIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoY29udGVudCAmJiAhcGF0aC5lbmRzV2l0aCgnLmQudHMnKSAmJiAhcGF0aC5lbmRzV2l0aCgnLmpzb24nKSkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ1dhdGNoQ29tcGlsZXJIb3N0LnJlYWRGaWxlJywgcGF0aCk7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gd2ViSW5qZWN0b3IuaW5qZWN0VG9GaWxlKHBhdGgsIGNvbnRlbnQpO1xuICAgICAgaWYgKGNoYW5nZWQgIT09IGNvbnRlbnQpIHtcbiAgICAgICAgbG9nLmluZm8oUGF0aC5yZWxhdGl2ZShjd2QsIHBhdGgpICsgJyBpcyBwYXRjaGVkJyk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudDtcbiAgfTtcbn1cblxuLy8gQ3VzdG9tZXIgVHJhbnNmb3JtZXIgc29sdXRpb24gaXMgbm90IGZlYXNpYmxlOiBpbiBzb21lIGNhc2UgbGlrZSBhIFdhdGNoQ29tcGlsZXIsIGl0IHRocm93cyBlcnJvciBsaWtlXG4vLyBcImNhbiBub3QgcmVmZXJlbmNlICcuZmxhZ3MnIG9mIHVuZGVmaW5lZFwiIHdoZW4gYSBjdXN0b21lciB0cmFuc2Zvcm1lciByZXR1cm4gYSBuZXdseSBjcmVhdGVkIFNvdXJjZUZpbGVcblxuLy8gZXhwb3J0IGZ1bmN0aW9uIG92ZXJyaWRlVHNQcm9ncmFtRW1pdEZuKGVtaXQ6IHRzLlByb2dyYW1bJ2VtaXQnXSk6IHRzLlByb2dyYW1bJ2VtaXQnXSB7XG4vLyAgIC8vIFRPRE86IGFsbG93IGFkZGluZyB0cmFuc2Zvcm1lclxuLy8gICBmdW5jdGlvbiBoYWNrZWRFbWl0KC4uLmFyZ3M6IFBhcmFtZXRlcnM8dHMuUHJvZ3JhbVsnZW1pdCddPikge1xuLy8gICAgIGxldCBbLCwsLHRyYW5zZm9ybWVyc10gPSBhcmdzO1xuLy8gICAgIC8vIGxvZy5pbmZvKCdlbWl0Jywgc3JjPy5maWxlTmFtZSk7XG4vLyAgICAgaWYgKHRyYW5zZm9ybWVycyA9PSBudWxsKSB7XG4vLyAgICAgICB0cmFuc2Zvcm1lcnMgPSB7fSBhcyB0cy5DdXN0b21UcmFuc2Zvcm1lcnM7XG4vLyAgICAgICBhcmdzWzRdID0gdHJhbnNmb3JtZXJzO1xuLy8gICAgIH1cbi8vICAgICBpZiAodHJhbnNmb3JtZXJzLmJlZm9yZSA9PSBudWxsKVxuLy8gICAgICAgdHJhbnNmb3JtZXJzLmJlZm9yZSA9IFtdO1xuLy8gICAgIHRyYW5zZm9ybWVycy5iZWZvcmUucHVzaChjdHggPT4gKHtcbi8vICAgICAgIHRyYW5zZm9ybVNvdXJjZUZpbGUoc3JjKSB7XG4vLyAgICAgICAgIGxvZy5kZWJ1ZygndHJhbnNmb3JtU291cmNlRmlsZScsIHNyYy5maWxlTmFtZSk7XG4vLyAgICAgICAgIHJldHVybiBzcmM7XG4vLyAgICAgICB9LFxuLy8gICAgICAgdHJhbnNmb3JtQnVuZGxlKG5vZGUpIHtyZXR1cm4gbm9kZTt9XG4vLyAgICAgfSkpO1xuLy8gICAgIC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGFyZ3NbNF0pKTtcbi8vICAgICByZXR1cm4gZW1pdC5hcHBseSh0aGlzLCBhcmdzKTtcbi8vICAgfTtcbi8vICAgcmV0dXJuIGhhY2tlZEVtaXQ7XG4vLyB9XG5cbmZ1bmN0aW9uIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBsZXQgZmlsZUluZm8gPSAnJztcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSkge1xuICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgIGNvbnN0IHJlYWxGaWxlID0gcmVhbFBhdGhPZihkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWU7XG4gICAgZmlsZUluZm8gPSBgJHtyZWFsRmlsZX0sIGxpbmU6ICR7bGluZSArIDF9LCBjb2x1bW46ICR7Y2hhcmFjdGVyICsgMX1gO1xuICB9XG4gIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKGBFcnJvciAke2RpYWdub3N0aWMuY29kZX0gJHtmaWxlSW5mb30gOmApLCB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCBmb3JtYXRIb3N0LmdldE5ld0xpbmUoKSkpO1xufVxuXG5mdW5jdGlvbiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWMoZGlhZ25vc3RpYywgZm9ybWF0SG9zdCkpKTtcbn1cblxuY29uc3QgQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFID0gbmV3IFNldChbJ2Jhc2VVcmwnLCAndHlwZVJvb3RzJywgJ3BhdGhzJywgJ3Jvb3REaXInXSk7XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIG9wdHM/OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY3dkID0gcGxpbmtFbnYud29ya0RpcjtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KGN3ZCk7XG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpXG4gICAgd3NLZXkgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDdXJyZW50IGRpcmVjdG9yeSBcIiR7Y3dkfVwiIGlzIG5vdCBhIHdvcmsgc3BhY2VgKTtcbiAgfVxuXG4gIGlmIChvcHRzPy5tZXJnZVRzY29uZmlnKSB7XG4gICAgY29uc3QganNvbiA9IG1lcmdlQmFzZVVybEFuZFBhdGhzKHRzLCBvcHRzLm1lcmdlVHNjb25maWcsIGN3ZCwgY29tcGlsZXJPcHRpb25zKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhqc29uLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmICghQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFLmhhcyhrZXkpKSB7XG4gICAgICAgIGNvbXBpbGVyT3B0aW9uc1trZXldID0gdmFsdWU7XG4gICAgICAgIGxvZy5kZWJ1ZygnbWVyZ2UgY29tcGlsZXIgb3B0aW9ucycsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChjd2QsICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHJlc29sdmUocm9vdCwgd3NLZXkpXG4gIH0pO1xuXG4gIGlmIChvcHRzPy5wYXRoc0pzb25zKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkob3B0cy5wYXRoc0pzb25zKSkge1xuICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gb3B0cy5wYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgICAgICBPYmplY3QuYXNzaWduKHBhdGhNYXAsIEpTT04ucGFyc2UoanNvblN0cikpO1xuICAgICAgICByZXR1cm4gcGF0aE1hcDtcbiAgICAgIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvcHRzLnBhdGhzSnNvbnMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChvcHRzPy5jb21waWxlck9wdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IFtwcm9wLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMob3B0cy5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAocHJvcCA9PT0gJ2Jhc2VVcmwnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHByb3AgPT09ICdwYXRocycpIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyT3B0aW9ucy5wYXRocylcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgdmFsdWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0gdmFsdWUgYXMgYW55O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW3Byb3BdID0gdmFsdWUgYXMgYW55O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiByZWFsIHBhdGggb2YgdGFyZ2V0aW5nIGZpbGUsIHJldHVybiBudWxsIGlmIHRhcmdldGluZyBmaWxlIGlzIG5vdCBpbiBvdXIgY29tcGlsaWF0aW9uIHNjb3BlXG4gKiBAcGFyYW0gZmlsZU5hbWUgXG4gKiBAcGFyYW0gY29tbW9uUm9vdERpciBcbiAqIEBwYXJhbSBwYWNrYWdlRGlyVHJlZSBcbiAqL1xuZnVuY3Rpb24gcmVhbFBhdGhPZihmaWxlTmFtZTogc3RyaW5nLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgaXNTcmNGaWxlID0gZmFsc2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlTmFtZSk7XG4gIGNvbnN0IF9vcmlnaW5QYXRoID0gZmlsZU5hbWU7IC8vIGFic29sdXRlIHBhdGhcbiAgY29uc3QgZm91bmRQa2dJbmZvID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCk7XG4gIGlmIChmb3VuZFBrZ0luZm8gPT0gbnVsbCkge1xuICAgIC8vIHRoaXMgZmlsZSBpcyBub3QgcGFydCBvZiBzb3VyY2UgcGFja2FnZS5cbiAgICAvLyBsb2cuaW5mbygnTm90IHBhcnQgb2YgZW50cnkgZmlsZXMnLCBmaWxlTmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qge3NyY0RpciwgZGVzdERpciwgcGtnRGlyLCBpc29tRGlyLCBzeW1saW5rRGlyfSA9IGZvdW5kUGtnSW5mbztcblxuICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoc3ltbGlua0RpciwgX29yaWdpblBhdGgpO1xuXG4gIGlmIChzcmNEaXIgPT09ICcuJyB8fCBzcmNEaXIubGVuZ3RoID09PSAwKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZyk7XG4gIH0gZWxzZSBpZiAocGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKHNyY0RpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHNyY0Rpci5sZW5ndGggKyAxKSk7XG4gIH0gZWxzZSBpZiAoaXNvbURpciAmJiBwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoaXNvbURpciArIHNlcCkpIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc29tRGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKGlzb21EaXIubGVuZ3RoICsgMSkpO1xuICB9XG4gIHJldHVybiBmaWxlTmFtZTtcbn1cbiJdfQ==