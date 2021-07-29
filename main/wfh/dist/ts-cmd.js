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
        else if (argv.project && argv.project.length > 0) {
            pkgInfos = Array.from(package_list_helper_1.allPackages('*', 'src', argv.project));
        }
        else {
            pkgInfos = Array.from(packageUtils.packages4Workspace(misc_1.plinkEnv.workDir, false));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNkI7QUFDN0IsdUNBQXdFO0FBRXhFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsNkRBQXVEO0FBQ3ZELCtDQUFrRTtBQUNsRSxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtDQUEwRTtBQUMxRSx5REFBK0M7QUFDL0MsbURBQStDO0FBSS9DLE1BQU0sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxHQUFHLGVBQVEsQ0FBQztBQUNqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQTJCN0M7Ozs7OztHQU1HO0FBQ0gsU0FBc0IsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7O1FBQy9ELGtDQUFrQztRQUNsQyxrQ0FBa0M7UUFDbEMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1FBRS9CLE1BQU0sV0FBVyxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO1FBRWxILElBQUksbUJBQTRDLENBQUM7UUFFakQsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1osTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sV0FBVyxHQUFHLG1DQUFxQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2pFLG1CQUFtQixHQUFHLFdBQVcsQ0FB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QyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMvRjtTQUFNLElBQUksT0FBTyxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLFVBQUcsQ0FBQyxFQUFFO1FBQzdELFFBQVEsR0FBRyxXQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2csIFBhY2thZ2VUc0RpcnMsIHBsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgYWxsUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vY21kL3V0aWxzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzLCBwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7YW5hbHlzZUZpbGVzfSBmcm9tICcuL2NtZC9jbGktYW5hbHl6ZSc7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5leHBvcnQge1JlcXVpcmVkQ29tcGlsZXJPcHRpb25zfTtcblxuY29uc3Qge3N5bWxpbmtEaXJOYW1lLCByb290RGlyOiByb290fSA9IHBsaW5rRW52O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsudHMtY21kJyk7XG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIC8qKiBtZXJnZSBjb21waWxlck9wdGlvbnMgXCJiYXNlVXJsXCIgYW5kIFwicGF0aHNcIiBmcm9tIHNwZWNpZmllZCB0c2NvbmZpZyBmaWxlICovXG4gIG1lcmdlVHNjb25maWc/OiBzdHJpbmc7XG4gIC8qKiBKU09OIHN0cmluZywgdG8gYmUgbWVyZ2VkIHRvIGNvbXBpbGVyT3B0aW9ucyBcInBhdGhzXCIsXG4gICAqIGJlIGF3YXJlIHRoYXQgXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBcImJhc2VVcmxcIiB3aGljaCBpcyByZWxhdGl2ZSB0byBgUGxpbmtFbnYud29ya0RpcmBcbiAgICogKi9cbiAgcGF0aHNKc29ucz86IEFycmF5PHN0cmluZz4gfCB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgLyoqXG4gICAqIFBhcnRpYWwgY29tcGlsZXIgb3B0aW9ucyB0byBiZSBtZXJnZWQsIGV4Y2VwdCBcImJhc2VVcmxcIi5cbiAgICogXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBgcGxpbmtFbnYud29ya0RpcmBcbiAgICovXG4gIGNvbXBpbGVyT3B0aW9ucz86IGFueTtcbiAgb3ZlcnJpZGVQYWNrZ2VEaXJzPzoge1twa2dOYW1lOiBzdHJpbmddOiBQYWNrYWdlVHNEaXJzfTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VEaXJJbmZvIGV4dGVuZHMgUGFja2FnZVRzRGlycyB7XG4gIHBrZ0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0c2MoYXJndjogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzICk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgLy8gY29uc3QgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyBjb25zdCBjb21wRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgUGFja2FnZURpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cblxuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnM7XG5cbiAgaWYgKGFyZ3YuanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBjb25zdCB0c3hUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSB0c3hUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gICAgLy8gYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICBjb25zdCBiYXNlVHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgfVxuXG4gIC8vIGNvbnN0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZURpckluZm8+KCk7XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBwbGlua0Vudi53b3JrRGlyO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGxldCBwa2dJbmZvczogUGFja2FnZUluZm9bXSB8IHVuZGVmaW5lZDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhhcmd2LnBhY2thZ2UpKS5maWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20oYWxsUGFja2FnZXMoJyonLCAnc3JjJywgYXJndi5wcm9qZWN0KSk7XG4gIH0gZWxzZSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocGxpbmtFbnYud29ya0RpciwgZmFsc2UpKTtcbiAgfVxuICBhd2FpdCBQcm9taXNlLmFsbChwa2dJbmZvcy5tYXAocGtnID0+IG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCkpKTtcbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLnN5bWxpbmtEaXIpO1xuICAgIGxvZy5kZWJ1ZygndHJlZVBhdGgnLCB0cmVlUGF0aCk7XG4gICAgcGFja2FnZURpclRyZWUucHV0RGF0YSh0cmVlUGF0aCwgaW5mbyk7XG4gIH1cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzb3VyY2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG5cbiAgY29uc3QgZGVzdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VDb21waWxlck9wdGlvbnMsXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgIT09ICdpbmxpbmUnLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuXG4gIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9ucywgYXJndiwgdHMpO1xuXG4gIGxvZy5pbmZvKCd0eXBlc2NyaXB0IGNvbXBpbGVyT3B0aW9uczonLCBjb21waWxlck9wdGlvbnMpO1xuXG4gIC8qKiBzZXQgY29tcEdsb2JzICovXG4gIGFzeW5jIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgX3BhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgY29uc3QgdHNjQ2ZnOiBQYWNrYWdlVHNEaXJzID0gYXJndi5vdmVycmlkZVBhY2tnZURpcnMgJiYgXy5oYXMoYXJndi5vdmVycmlkZVBhY2tnZURpcnMsIG5hbWUpID9cbiAgICAgIGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzW25hbWVdIDogZ2V0VHNjQ29uZmlnT2ZQa2coanNvbik7XG4gICAgLy8gRm9yIHdvcmthcm91bmQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zNzk2MFxuICAgIC8vIFVzZSBhIHN5bWxpbmsgcGF0aCBpbnN0ZWFkIG9mIGEgcmVhbCBwYXRoLCBzbyB0aGF0IFR5cGVzY3JpcHQgY29tcGlsZXIgd2lsbCBub3RcbiAgICAvLyByZWNvZ25pemUgdGhlbSBhcyBmcm9tIHNvbWV3aGVyZSB3aXRoIFwibm9kZV9tb2R1bGVzXCIsIHRoZSBzeW1saW5rIG11c3QgYmUgcmVzaWRlXG4gICAgLy8gaW4gZGlyZWN0b3J5IHdoaWNoIGRvZXMgbm90IGNvbnRhaW4gXCJub2RlX21vZHVsZXNcIiBhcyBwYXJ0IG9mIGFic29sdXRlIHBhdGguXG4gICAgY29uc3Qgc3ltbGlua0RpciA9IHJlc29sdmUocGxpbmtFbnYud29ya0Rpciwgc3ltbGlua0Rpck5hbWUsIG5hbWUpO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7Li4udHNjQ2ZnLCBwa2dEaXI6IHJlYWxQYXRoLCBzeW1saW5rRGlyfSk7XG5cbiAgICBjb25zdCBzcmNEaXJzID0gW3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIGlmIChzcmNEaXIgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGpvaW4oc3ltbGlua0Rpciwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHNyY0RpcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc3ltbGlua0RpcikpIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyBkaXJlY3RvcnkgJHtjaGFsay5yZWQoc3ltbGlua0Rpcil9LGAgK1xuICAgICAgICBgIGl0IGlzIHBvc3NpYmxlIHRoYXQgcGFja2FnZSAke25hbWV9IGlzIHlldCBub3QgYWRkZWQgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZSdzIHBhY2thZ2UuanNvbiBmaWxlLGAgK1xuICAgICAgICAnIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UgaXMgbm90IHN5bmNlZCB5ZXQsIHRyeSBcInN5bmNcIi9cImluaXRcIiBjb21tYW5kIHBsZWFzZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleGlzdGluZyB0cyBzb3VyY2UgZGlyZWN0b3J5IGZvdW5kIGZvciBwYWNrYWdlICR7Y2hhbGsucmVkKG5hbWUpfTpgICtcbiAgICAgICAgICBgICR7W3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpLmpvaW4oJywgJyl9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRzY0NmZy5maWxlcykge1xuICAgICAgY29uc3QgZmlsZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuZmlsZXMpO1xuICAgICAgY29uc3QgYVJlcyA9IGF3YWl0IGFuYWx5c2VGaWxlcyhmaWxlcy5tYXAoZmlsZSA9PiByZXNvbHZlKHN5bWxpbmtEaXIsIGZpbGUpKSwgYXJndi5tZXJnZVRzY29uZmlnLCBbXSk7XG4gICAgICBsb2cuZGVidWcoJ2FuYWx5emVkIGZpbGVzOicsIGFSZXMpO1xuICAgICAgcm9vdEZpbGVzLnB1c2goLi4uKGFSZXMuZmlsZXMuZmlsdGVyKGZpbGUgPT4gZmlsZS5zdGFydHNXaXRoKHN5bWxpbmtEaXIgKyBzZXApICYmICEvXFwuKD86anN4P3xkXFwudHMpJC8udGVzdChmaWxlKSlcbiAgICAgICAgLm1hcChmaWxlID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpKSlcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgbGV0IHBhdHRlcm5zID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmluY2x1ZGUpO1xuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XG4gICAgICAgIGNvbnN0IGdsb2JQYXR0ZXJuID0gcmVzb2x2ZShzeW1saW5rRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGdsb2Iuc3luYyhnbG9iUGF0dGVybikuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0c2NDZmcuZmlsZXMgPT0gbnVsbCAmJiB0c2NDZmcuaW5jbHVkZSA9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzKSB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSByZXNvbHZlKHN5bWxpbmtEaXIsIHNyY0RpciEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgZ2xvYi5zeW5jKHJlbFBhdGggKyAnLyoqLyoudHMnKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgZ2xvYi5zeW5jKHJlbFBhdGggKyAnLyoqLyoudHN4JykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gbG9nLndhcm4oJ3Jvb3RGaWxlczpcXG4nICsgcm9vdEZpbGVzLmpvaW4oJ1xcbicpKTtcbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIHdhdGNoKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICAgIHJldHVybiBbXTtcbiAgICAvLyB3YXRjaChjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGFyZ3YuZWQsIGFyZ3YuanN4LCBvbkNvbXBpbGVkKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbWl0dGVkID0gY29tcGlsZShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAvLyBwcm9tQ29tcGlsZSA9IGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkKTtcbiAgfVxufVxuXG5jb25zdCBmb3JtYXRIb3N0OiBfdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogcGF0aCA9PiBwYXRoLFxuICBnZXRDdXJyZW50RGlyZWN0b3J5OiBfdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnksXG4gIGdldE5ld0xpbmU6ICgpID0+IF90cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gd2F0Y2gocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcGxpbmtFbnYud29ya0Rpci5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHtcbiAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICB9XG4gIGNvbnN0IHByb2dyYW1Ib3N0ID0gdHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Qocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIHRzLnN5cyxcbiAgICB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLCBfcmVwb3J0RGlhZ25vc3RpYywgZCA9PiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZCwgdHMpKTtcbiAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChwcm9ncmFtSG9zdCk7XG5cbiAgY29uc3Qgb3JpZ0NyZWF0ZVByb2dyYW0gPSBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtO1xuICAvLyBUcydzIGNyZWF0ZVdhdGNoUHJvZ3JhbSB3aWxsIGNhbGwgV2F0Y2hDb21waWxlckhvc3QuY3JlYXRlUHJvZ3JhbSgpLCB0aGlzIGlzIHdoZXJlIHdlIHBhdGNoIFwiQ29tcGlsZXJIb3N0XCJcbiAgcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10gfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBob3N0PzogX3RzLkNvbXBpbGVySG9zdCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uYXBwbHkodGhpcywgYXJndW1lbnRzIGFzIGFueSkgO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9O1xuXG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuICB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHR9LCB0cy5zeXMsXG4gICAgcGxpbmtFbnYud29ya0Rpci5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG4gIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3QoY29tcGlsZXJPcHRpb25zKTtcbiAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0KTtcbiAgY29uc3QgZW1pdHRlZCA9IHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMsIHRzKTtcbiAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGhvc3QpO1xuICBjb25zdCBlbWl0UmVzdWx0ID0gcHJvZ3JhbS5lbWl0KCk7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzID0gdHMuZ2V0UHJlRW1pdERpYWdub3N0aWNzKHByb2dyYW0pXG4gICAgLmNvbmNhdChlbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gIH1cbiAgYWxsRGlhZ25vc3RpY3MuZm9yRWFjaChkaWFnbm9zdGljID0+IHtcbiAgICBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbiAgfSk7XG4gIGlmIChlbWl0UmVzdWx0LmVtaXRTa2lwcGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb21waWxlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBlbWl0dGVkO1xufVxuXG4vKiogT3ZlcnJpZGluZyBXcml0ZUZpbGUoKSAqL1xuZnVuY3Rpb24gcGF0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLkNvbXBpbGVySG9zdCwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4gIGNvOiBfdHMuQ29tcGlsZXJPcHRpb25zLCB0czogdHlwZW9mIF90cyA9IF90cyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgZW1pdHRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4gIC8vIEl0IHNlZW1zIHRvIG5vdCBhYmxlIHRvIHdyaXRlIGZpbGUgdGhyb3VnaCBzeW1saW5rIGluIFdpbmRvd3NcbiAgLy8gY29uc3QgX3dyaXRlRmlsZSA9IGhvc3Qud3JpdGVGaWxlO1xuICBjb25zdCB3cml0ZUZpbGU6IF90cy5Xcml0ZUZpbGVDYWxsYmFjayA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSB7XG4gICAgY29uc3QgZGVzdEZpbGUgPSByZWFsUGF0aE9mKGZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKGRlc3RGaWxlID09IG51bGwpIHtcbiAgICAgIGxvZy5kZWJ1Zygnc2tpcCcsIGZpbGVOYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZW1pdHRlZExpc3QucHVzaChkZXN0RmlsZSk7XG4gICAgbG9nLmluZm8oJ3dyaXRlIGZpbGUnLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGRlc3RGaWxlKSk7XG4gICAgLy8gVHlwZXNjcmlwdCdzIHdyaXRlRmlsZSgpIGZ1bmN0aW9uIHBlcmZvcm1zIHdlaXJkIHdpdGggc3ltbGlua3MgdW5kZXIgd2F0Y2ggbW9kZSBpbiBXaW5kb3dzOlxuICAgIC8vIEV2ZXJ5IHRpbWUgYSB0cyBmaWxlIGlzIGNoYW5nZWQsIGl0IHRyaWdnZXJzIHRoZSBzeW1saW5rIGJlaW5nIGNvbXBpbGVkIGFuZCB0byBiZSB3cml0dGVuIHdoaWNoIGlzXG4gICAgLy8gYXMgZXhwZWN0ZWQgYnkgbWUsXG4gICAgLy8gYnV0IGxhdGUgb24gaXQgdHJpZ2dlcnMgdGhlIHNhbWUgcmVhbCBmaWxlIGFsc28gYmVpbmcgd3JpdHRlbiBpbW1lZGlhdGVseSwgdGhpcyBpcyBub3Qgd2hhdCBJIGV4cGVjdCxcbiAgICAvLyBhbmQgaXQgZG9lcyBub3QgYWN0dWFsbHkgd3JpdGUgb3V0IGFueSBjaGFuZ2VzIHRvIGZpbmFsIEpTIGZpbGUuXG4gICAgLy8gU28gSSBkZWNpZGUgdG8gdXNlIG9yaWdpbmFsIE5vZGUuanMgZmlsZSBzeXN0ZW0gQVBJXG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZGVzdEZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3RGaWxlLCBkYXRhKTtcbiAgICAvLyBJdCBzZWVtcyBUeXBlc2NyaXB0IGNvbXBpbGVyIGFsd2F5cyB1c2VzIHNsYXNoIGluc3RlYWQgb2YgYmFjayBzbGFzaCBpbiBmaWxlIHBhdGgsIGV2ZW4gaW4gV2luZG93c1xuICAgIC8vIHJldHVybiBfd3JpdGVGaWxlLmNhbGwodGhpcywgZGVzdEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLCAuLi5BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcbiAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZUZpbGU7XG5cbiAgLy8gY29uc3QgX2dldFNvdXJjZUZpbGUgPSBob3N0LmdldFNvdXJjZUZpbGU7XG4gIC8vIGNvbnN0IGdldFNvdXJjZUZpbGU6IHR5cGVvZiBfZ2V0U291cmNlRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG4gIC8vICAgLy8gY29uc29sZS5sb2coJ2dldFNvdXJjZUZpbGUnLCBmaWxlTmFtZSk7XG4gIC8vICAgcmV0dXJuIF9nZXRTb3VyY2VGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIC8vIH07XG4gIC8vIGhvc3QuZ2V0U291cmNlRmlsZSA9IGdldFNvdXJjZUZpbGU7XG4gIHJldHVybiBlbWl0dGVkTGlzdDtcbn1cblxuZnVuY3Rpb24gcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuV2F0Y2hDb21waWxlckhvc3RPZkZpbGVzQW5kQ29tcGlsZXJPcHRpb25zPF90cy5FbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtPiB8IF90cy5Db21waWxlckhvc3QpIHtcbiAgY29uc3QgcmVhZEZpbGUgPSBob3N0LnJlYWRGaWxlO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBob3N0LnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMgYXMgYW55KSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGNvbnRlbnQgJiYgIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdXYXRjaENvbXBpbGVySG9zdC5yZWFkRmlsZScsIHBhdGgpO1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHdlYkluamVjdG9yLmluamVjdFRvRmlsZShwYXRoLCBjb250ZW50KTtcbiAgICAgIGlmIChjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4gICAgICAgIGxvZy5pbmZvKFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSArICcgaXMgcGF0Y2hlZCcpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH07XG59XG5cbi8vIEN1c3RvbWVyIFRyYW5zZm9ybWVyIHNvbHV0aW9uIGlzIG5vdCBmZWFzaWJsZTogaW4gc29tZSBjYXNlIGxpa2UgYSBXYXRjaENvbXBpbGVyLCBpdCB0aHJvd3MgZXJyb3IgbGlrZVxuLy8gXCJjYW4gbm90IHJlZmVyZW5jZSAnLmZsYWdzJyBvZiB1bmRlZmluZWRcIiB3aGVuIGEgY3VzdG9tZXIgdHJhbnNmb3JtZXIgcmV0dXJuIGEgbmV3bHkgY3JlYXRlZCBTb3VyY2VGaWxlXG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBvdmVycmlkZVRzUHJvZ3JhbUVtaXRGbihlbWl0OiB0cy5Qcm9ncmFtWydlbWl0J10pOiB0cy5Qcm9ncmFtWydlbWl0J10ge1xuLy8gICAvLyBUT0RPOiBhbGxvdyBhZGRpbmcgdHJhbnNmb3JtZXJcbi8vICAgZnVuY3Rpb24gaGFja2VkRW1pdCguLi5hcmdzOiBQYXJhbWV0ZXJzPHRzLlByb2dyYW1bJ2VtaXQnXT4pIHtcbi8vICAgICBsZXQgWywsLCx0cmFuc2Zvcm1lcnNdID0gYXJncztcbi8vICAgICAvLyBsb2cuaW5mbygnZW1pdCcsIHNyYz8uZmlsZU5hbWUpO1xuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMgPT0gbnVsbCkge1xuLy8gICAgICAgdHJhbnNmb3JtZXJzID0ge30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xuLy8gICAgICAgYXJnc1s0XSA9IHRyYW5zZm9ybWVycztcbi8vICAgICB9XG4vLyAgICAgaWYgKHRyYW5zZm9ybWVycy5iZWZvcmUgPT0gbnVsbClcbi8vICAgICAgIHRyYW5zZm9ybWVycy5iZWZvcmUgPSBbXTtcbi8vICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlLnB1c2goY3R4ID0+ICh7XG4vLyAgICAgICB0cmFuc2Zvcm1Tb3VyY2VGaWxlKHNyYykge1xuLy8gICAgICAgICBsb2cuZGVidWcoJ3RyYW5zZm9ybVNvdXJjZUZpbGUnLCBzcmMuZmlsZU5hbWUpO1xuLy8gICAgICAgICByZXR1cm4gc3JjO1xuLy8gICAgICAgfSxcbi8vICAgICAgIHRyYW5zZm9ybUJ1bmRsZShub2RlKSB7cmV0dXJuIG5vZGU7fVxuLy8gICAgIH0pKTtcbi8vICAgICAvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhcmdzWzRdKSk7XG4vLyAgICAgcmV0dXJuIGVtaXQuYXBwbHkodGhpcywgYXJncyk7XG4vLyAgIH07XG4vLyAgIHJldHVybiBoYWNrZWRFbWl0O1xuLy8gfVxuXG5mdW5jdGlvbiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljLCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgbGV0IGZpbGVJbmZvID0gJyc7XG4gIGlmIChkaWFnbm9zdGljLmZpbGUpIHtcbiAgICBjb25zdCB7IGxpbmUsIGNoYXJhY3RlciB9ID0gZGlhZ25vc3RpYy5maWxlLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKGRpYWdub3N0aWMuc3RhcnQhKTtcbiAgICBjb25zdCByZWFsRmlsZSA9IHJlYWxQYXRoT2YoZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHJ1ZSkgfHwgZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lO1xuICAgIGZpbGVJbmZvID0gYCR7cmVhbEZpbGV9LCBsaW5lOiAke2xpbmUgKyAxfSwgY29sdW1uOiAke2NoYXJhY3RlciArIDF9YDtcbiAgfVxuICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZChgRXJyb3IgJHtkaWFnbm9zdGljLmNvZGV9ICR7ZmlsZUluZm99IDpgKSwgdHMuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dCggZGlhZ25vc3RpYy5tZXNzYWdlVGV4dCwgZm9ybWF0SG9zdC5nZXROZXdMaW5lKCkpKTtcbn1cblxuZnVuY3Rpb24gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljLCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zb2xlLmluZm8oY2hhbGsuY3lhbih0cy5mb3JtYXREaWFnbm9zdGljKGRpYWdub3N0aWMsIGZvcm1hdEhvc3QpKSk7XG59XG5cbmNvbnN0IENPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERSA9IG5ldyBTZXQoWydiYXNlVXJsJywgJ3R5cGVSb290cycsICdwYXRocycsICdyb290RGlyJ10pO1xuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBvcHRzPzogVHNjQ21kUGFyYW0sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShjd2QpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ3VycmVudCBkaXJlY3RvcnkgXCIke2N3ZH1cIiBpcyBub3QgYSB3b3JrIHNwYWNlYCk7XG4gIH1cblxuICBpZiAob3B0cz8ubWVyZ2VUc2NvbmZpZykge1xuICAgIGNvbnN0IGpzb24gPSBtZXJnZUJhc2VVcmxBbmRQYXRocyh0cywgb3B0cy5tZXJnZVRzY29uZmlnLCBjd2QsIGNvbXBpbGVyT3B0aW9ucyk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoanNvbi5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgICBpZiAoIUNPTVBJTEVSX09QVElPTlNfTUVSR0VfRVhDTFVERS5oYXMoa2V5KSkge1xuICAgICAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlO1xuICAgICAgICBsb2cuZGVidWcoJ21lcmdlIGNvbXBpbGVyIG9wdGlvbnMnLCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoY3dkLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiByZXNvbHZlKHJvb3QsIHdzS2V5KVxuICB9KTtcblxuICBpZiAob3B0cz8ucGF0aHNKc29ucykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdHMucGF0aHNKc29ucykpIHtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IG9wdHMucGF0aHNKc29ucy5yZWR1Y2UoKHBhdGhNYXAsIGpzb25TdHIpID0+IHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihwYXRoTWFwLCBKU09OLnBhcnNlKGpzb25TdHIpKTtcbiAgICAgICAgcmV0dXJuIHBhdGhNYXA7XG4gICAgICB9LCBjb21waWxlck9wdGlvbnMucGF0aHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgb3B0cy5wYXRoc0pzb25zKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3B0cz8uY29tcGlsZXJPcHRpb25zKSB7XG4gICAgZm9yIChjb25zdCBbcHJvcCwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9wdHMuY29tcGlsZXJPcHRpb25zKSkge1xuICAgICAgaWYgKHByb3AgPT09ICdiYXNlVXJsJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wID09PSAncGF0aHMnKSB7XG4gICAgICAgIGlmIChjb21waWxlck9wdGlvbnMucGF0aHMpXG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihjb21waWxlck9wdGlvbnMucGF0aHMsIHZhbHVlKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IHZhbHVlIGFzIGFueTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyT3B0aW9uc1twcm9wXSA9IHZhbHVlIGFzIGFueTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gcmVhbCBwYXRoIG9mIHRhcmdldGluZyBmaWxlLCByZXR1cm4gbnVsbCBpZiB0YXJnZXRpbmcgZmlsZSBpcyBub3QgaW4gb3VyIGNvbXBpbGlhdGlvbiBzY29wZVxuICogQHBhcmFtIGZpbGVOYW1lIFxuICogQHBhcmFtIGNvbW1vblJvb3REaXIgXG4gKiBAcGFyYW0gcGFja2FnZURpclRyZWUgXG4gKi9cbmZ1bmN0aW9uIHJlYWxQYXRoT2YoZmlsZU5hbWU6IHN0cmluZywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIGlzU3JjRmlsZSA9IGZhbHNlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgZmlsZU5hbWUpO1xuICBjb25zdCBfb3JpZ2luUGF0aCA9IGZpbGVOYW1lOyAvLyBhYnNvbHV0ZSBwYXRoXG4gIGNvbnN0IGZvdW5kUGtnSW5mbyA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpO1xuICBpZiAoZm91bmRQa2dJbmZvID09IG51bGwpIHtcbiAgICAvLyB0aGlzIGZpbGUgaXMgbm90IHBhcnQgb2Ygc291cmNlIHBhY2thZ2UuXG4gICAgLy8gbG9nLmluZm8oJ05vdCBwYXJ0IG9mIGVudHJ5IGZpbGVzJywgZmlsZU5hbWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHtzcmNEaXIsIGRlc3REaXIsIHBrZ0RpciwgaXNvbURpciwgc3ltbGlua0Rpcn0gPSBmb3VuZFBrZ0luZm87XG5cbiAgY29uc3QgcGF0aFdpdGhpblBrZyA9IHJlbGF0aXZlKHN5bWxpbmtEaXIsIF9vcmlnaW5QYXRoKTtcblxuICBpZiAoc3JjRGlyID09PSAnLicgfHwgc3JjRGlyLmxlbmd0aCA9PT0gMCkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChzcmNEaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShzcmNEaXIubGVuZ3RoICsgMSkpO1xuICB9IGVsc2UgaWYgKGlzb21EaXIgJiYgcGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKGlzb21EaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNvbURpciwgcGF0aFdpdGhpblBrZy5zbGljZShpc29tRGlyLmxlbmd0aCArIDEpKTtcbiAgfVxuICByZXR1cm4gZmlsZU5hbWU7XG59XG4iXX0=