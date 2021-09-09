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
        yield Promise.all(pkgInfos.map(pkg => onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath)));
        for (const info of compDirInfo.values()) {
            const treePath = (0, path_1.relative)(commonRootDir, info.symlinkDir);
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
                    const aRes = yield (0, cli_analyze_1.analyseFiles)(files.map(file => (0, path_1.resolve)(symlinkDir, file)), argv.mergeTsconfig, []);
                    log.debug('analyzed files:', aRes);
                    rootFiles.push(...(aRes.files.filter(file => file.startsWith(symlinkDir + path_1.sep) && !/\.(?:jsx?|d\.ts)$/.test(file))
                        .map(file => file.replace(/\\/g, '/'))));
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
    let wsKey = (0, package_mgr_1.workspaceKey)(cwd);
    if (!(0, package_mgr_1.getState)().workspaces.has(wsKey))
        wsKey = (0, package_mgr_1.getState)().currWorkspace;
    if (wsKey == null) {
        throw new Error(`Current directory "${cwd}" is not a work space`);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.mergeTsconfig) {
        const json = (0, ts_cmd_util_1.mergeBaseUrlAndPaths)(ts, opts.mergeTsconfig, cwd, compilerOptions);
        for (const [key, value] of Object.entries(json.compilerOptions)) {
            if (!COMPILER_OPTIONS_MERGE_EXCLUDE.has(key)) {
                compilerOptions[key] = value;
                log.debug('merge compiler options', key, value);
            }
        }
    }
    // appendTypeRoots([], cwd, compilerOptions, {});
    (0, package_list_helper_1.setTsCompilerOptForNodePath)(cwd, './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: (0, path_1.resolve)(root, wsKey),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNkI7QUFDN0IsdUNBQXdFO0FBRXhFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsNkRBQXVEO0FBQ3ZELCtDQUFrRTtBQUNsRSxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtDQUEwRTtBQUMxRSx5REFBK0M7QUFDL0MsbURBQStDO0FBSS9DLE1BQU0sRUFBQyxjQUFjLEVBQUcsT0FBTyxFQUFFLElBQUksRUFBQyxHQUFHLGVBQVEsQ0FBQztBQUNsRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQTJCN0M7Ozs7OztHQU1HO0FBQ0gsU0FBc0IsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7O1FBQy9ELGtDQUFrQztRQUNsQyxrQ0FBa0M7UUFDbEMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1FBRS9CLE1BQU0sV0FBVyxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO1FBRWxILElBQUksbUJBQTRDLENBQUM7UUFFakQsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1osTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sV0FBVyxHQUFHLElBQUEsbUNBQXFCLEVBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDakUsbUJBQW1CLEdBQUcsV0FB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LE1BQU0sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUNqRCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0Y7U0FBTSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFHLENBQUMsRUFBRTtRQUM3RCxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCwge3Jlc29sdmUsIGpvaW4sIHJlbGF0aXZlLCBzZXB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2csIFBhY2thZ2VUc0RpcnMsIHBsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgYWxsUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vY21kL3V0aWxzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzLCBwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4vdHMtY21kLXV0aWwnO1xuaW1wb3J0IHt3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCB7YW5hbHlzZUZpbGVzfSBmcm9tICcuL2NtZC9jbGktYW5hbHl6ZSc7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5leHBvcnQge1JlcXVpcmVkQ29tcGlsZXJPcHRpb25zfTtcblxuY29uc3Qge3N5bWxpbmtEaXJOYW1lICwgcm9vdERpcjogcm9vdH0gPSBwbGlua0VudjtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzLWNtZCcpO1xuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICAvKiogbWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZSAqL1xuICBtZXJnZVRzY29uZmlnPzogc3RyaW5nO1xuICAvKiogSlNPTiBzdHJpbmcsIHRvIGJlIG1lcmdlZCB0byBjb21waWxlck9wdGlvbnMgXCJwYXRoc1wiLFxuICAgKiBiZSBhd2FyZSB0aGF0IFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gXCJiYXNlVXJsXCIgd2hpY2ggaXMgcmVsYXRpdmUgdG8gYFBsaW5rRW52LndvcmtEaXJgXG4gICAqICovXG4gIHBhdGhzSnNvbnM/OiBBcnJheTxzdHJpbmc+IHwge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIC8qKlxuICAgKiBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkLCBleGNlcHQgXCJiYXNlVXJsXCIuXG4gICAqIFwicGF0aHNcIiBzaG91bGQgYmUgcmVsYXRpdmUgdG8gYHBsaW5rRW52LndvcmtEaXJgXG4gICAqL1xuICBjb21waWxlck9wdGlvbnM/OiBhbnk7XG4gIG92ZXJyaWRlUGFja2dlRGlycz86IHtbcGtnTmFtZTogc3RyaW5nXTogUGFja2FnZVRzRGlyc307XG59XG5cbmludGVyZmFjZSBQYWNrYWdlRGlySW5mbyBleHRlbmRzIFBhY2thZ2VUc0RpcnMge1xuICBwa2dEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHNjKGFyZ3Y6IFRzY0NtZFBhcmFtLCB0czogdHlwZW9mIF90cyA9IF90cyApOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIC8vIGNvbnN0IGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gY29uc3QgY29tcEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCByb290RmlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIFBhY2thZ2VEaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG5cbiAgbGV0IGJhc2VDb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zO1xuXG4gIGlmIChhcmd2LmpzeCkge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUyID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpO1xuICAgIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gdHN4VHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICAgIC8vIGJhc2VDb21waWxlck9wdGlvbnMgPSB7Li4uYmFzZUNvbXBpbGVyT3B0aW9ucywgLi4udHN4VHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9uc307XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gIH1cblxuICAvLyBjb25zdCBwcm9tQ29tcGlsZSA9IFByb21pc2UucmVzb2x2ZSggW10gYXMgRW1pdExpc3QpO1xuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPigpO1xuICBjb25zdCBjb21tb25Sb290RGlyID0gcGxpbmtFbnYud29ya0RpcjtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBsZXQgcGtnSW5mb3M6IFBhY2thZ2VJbmZvW10gfCB1bmRlZmluZWQ7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoYXJndi5wYWNrYWdlKSkuZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbCkgYXMgUGFja2FnZUluZm9bXTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKGFsbFBhY2thZ2VzKCcqJywgJ3NyYycsIGFyZ3YucHJvamVjdCkpO1xuICB9IGVsc2Uge1xuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIsIGZhbHNlKSk7XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwocGtnSW5mb3MubWFwKHBrZyA9PiBvbkNvbXBvbmVudChwa2cubmFtZSwgcGtnLnBhdGgsIG51bGwsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgpKSk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5zeW1saW5rRGlyKTtcbiAgICBsb2cuZGVidWcoJ3RyZWVQYXRoJywgdHJlZVBhdGgpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc291cmNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGRlc3REaXIgPSBjb21tb25Sb290RGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAuLi5iYXNlQ29tcGlsZXJPcHRpb25zLFxuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogZGVzdERpcixcbiAgICByb290RGlyOiBkZXN0RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBzb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwICE9PSAnaW5saW5lJyxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcblxuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMsIGFyZ3YsIHRzKTtcblxuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICAvKiogc2V0IGNvbXBHbG9icyAqL1xuICBhc3luYyBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIF9wYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZzogUGFja2FnZVRzRGlycyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXSA6IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuICAgIC8vIEZvciB3b3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc5NjBcbiAgICAvLyBVc2UgYSBzeW1saW5rIHBhdGggaW5zdGVhZCBvZiBhIHJlYWwgcGF0aCwgc28gdGhhdCBUeXBlc2NyaXB0IGNvbXBpbGVyIHdpbGwgbm90XG4gICAgLy8gcmVjb2duaXplIHRoZW0gYXMgZnJvbSBzb21ld2hlcmUgd2l0aCBcIm5vZGVfbW9kdWxlc1wiLCB0aGUgc3ltbGluayBtdXN0IGJlIHJlc2lkZVxuICAgIC8vIGluIGRpcmVjdG9yeSB3aGljaCBkb2VzIG5vdCBjb250YWluIFwibm9kZV9tb2R1bGVzXCIgYXMgcGFydCBvZiBhYnNvbHV0ZSBwYXRoLlxuICAgIGNvbnN0IHN5bWxpbmtEaXIgPSByZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBuYW1lKTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwgey4uLnRzY0NmZywgcGtnRGlyOiByZWFsUGF0aCwgc3ltbGlua0Rpcn0pO1xuXG4gICAgY29uc3Qgc3JjRGlycyA9IFt0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHN5bWxpbmtEaXIsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChzcmNEaXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHN5bWxpbmtEaXIpKSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgZGlyZWN0b3J5ICR7Y2hhbGsucmVkKHN5bWxpbmtEaXIpfSxgICtcbiAgICAgICAgYCBpdCBpcyBwb3NzaWJsZSB0aGF0IHBhY2thZ2UgJHtuYW1lfSBpcyB5ZXQgbm90IGFkZGVkIHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UncyBwYWNrYWdlLmpzb24gZmlsZSxgICtcbiAgICAgICAgJyBjdXJyZW50IHdvcmt0cmVlIHNwYWNlIGlzIG5vdCBzeW5jZWQgeWV0LCB0cnkgXCJzeW5jXCIvXCJpbml0XCIgY29tbWFuZCBwbGVhc2UnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgdHMgc291cmNlIGRpcmVjdG9yeSBmb3VuZCBmb3IgcGFja2FnZSAke2NoYWxrLnJlZChuYW1lKX06YCArXG4gICAgICAgICAgYCAke1t0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKS5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0c2NDZmcuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGZpbGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmZpbGVzKTtcbiAgICAgIGNvbnN0IGFSZXMgPSBhd2FpdCBhbmFseXNlRmlsZXMoZmlsZXMubWFwKGZpbGUgPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBmaWxlKSksIGFyZ3YubWVyZ2VUc2NvbmZpZywgW10pO1xuICAgICAgbG9nLmRlYnVnKCdhbmFseXplZCBmaWxlczonLCBhUmVzKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLihhUmVzLmZpbGVzLmZpbHRlcihmaWxlID0+IGZpbGUuc3RhcnRzV2l0aChzeW1saW5rRGlyICsgc2VwKSAmJiAhL1xcLig/OmpzeD98ZFxcLnRzKSQvLnRlc3QoZmlsZSkpXG4gICAgICAgIC5tYXAoZmlsZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgIGxldCBwYXR0ZXJucyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5pbmNsdWRlKTtcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgICBjb25zdCBnbG9iUGF0dGVybiA9IHJlc29sdmUoc3ltbGlua0RpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBnbG9iLnN5bmMoZ2xvYlBhdHRlcm4pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmZpbGVzID09IG51bGwgJiYgdHNjQ2ZnLmluY2x1ZGUgPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlycykge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShzeW1saW5rRGlyLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzJykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzeCcpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGxvZy53YXJuKCdyb290RmlsZXM6XFxuJyArIHJvb3RGaWxlcy5qb2luKCdcXG4nKSk7XG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICB3YXRjaChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICByZXR1cm4gW107XG4gICAgLy8gd2F0Y2goY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkLCBhcmd2LmpzeCwgb25Db21waWxlZCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgLy8gcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCk7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IHBhdGggPT4gcGF0aCxcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsXG4gICAgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSwgX3JlcG9ydERpYWdub3N0aWMsIGQgPT4gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGQsIHRzKSk7XG4gIHBhdGNoV2F0Y2hDb21waWxlckhvc3QocHJvZ3JhbUhvc3QpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgLy8gVHMncyBjcmVhdGVXYXRjaFByb2dyYW0gd2lsbCBjYWxsIFdhdGNoQ29tcGlsZXJIb3N0LmNyZWF0ZVByb2dyYW0oKSwgdGhpcyBpcyB3aGVyZSB3ZSBwYXRjaCBcIkNvbXBpbGVySG9zdFwiXG4gIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgaG9zdD86IF90cy5Db21waWxlckhvc3QpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgaWYgKGhvc3QgJiYgKGhvc3QgYXMgYW55KS5fb3ZlcnJpZGVkID09IG51bGwpIHtcbiAgICAgIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMsIHRzKTtcbiAgICB9XG4gICAgY29uc3QgcHJvZ3JhbSA9IG9yaWdDcmVhdGVQcm9ncmFtLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyBhcyBhbnkpIDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfTtcblxuICB0cy5jcmVhdGVXYXRjaFByb2dyYW0ocHJvZ3JhbUhvc3QpO1xufVxuXG5mdW5jdGlvbiBjb21waWxlKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPixcbiAgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucyk7XG4gIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdCk7XG4gIGNvbnN0IGVtaXR0ZWQgPSBwYXRjaENvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zLCB0cyk7XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBob3N0KTtcbiAgY29uc3QgZW1pdFJlc3VsdCA9IHByb2dyYW0uZW1pdCgpO1xuICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRzLmdldFByZUVtaXREaWFnbm9zdGljcyhwcm9ncmFtKVxuICAgIC5jb25jYXQoZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHtcbiAgICByZXR1cm4gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICB9XG4gIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYyk7XG4gIH0pO1xuICBpZiAoZW1pdFJlc3VsdC5lbWl0U2tpcHBlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ29tcGlsZSBmYWlsZWQnKTtcbiAgfVxuICByZXR1cm4gZW1pdHRlZDtcbn1cblxuLyoqIE92ZXJyaWRpbmcgV3JpdGVGaWxlKCkgKi9cbmZ1bmN0aW9uIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5Db21waWxlckhvc3QsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LFxuICBjbzogX3RzLkNvbXBpbGVyT3B0aW9ucywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGVtaXR0ZWRMaXN0OiBzdHJpbmdbXSA9IFtdO1xuICAvLyBJdCBzZWVtcyB0byBub3QgYWJsZSB0byB3cml0ZSBmaWxlIHRocm91Z2ggc3ltbGluayBpbiBXaW5kb3dzXG4gIC8vIGNvbnN0IF93cml0ZUZpbGUgPSBob3N0LndyaXRlRmlsZTtcbiAgY29uc3Qgd3JpdGVGaWxlOiBfdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPSBmdW5jdGlvbihmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcykge1xuICAgIGNvbnN0IGRlc3RGaWxlID0gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICAgIGlmIChkZXN0RmlsZSA9PSBudWxsKSB7XG4gICAgICBsb2cuZGVidWcoJ3NraXAnLCBmaWxlTmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGVtaXR0ZWRMaXN0LnB1c2goZGVzdEZpbGUpO1xuICAgIGxvZy5pbmZvKCd3cml0ZSBmaWxlJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBkZXN0RmlsZSkpO1xuICAgIC8vIFR5cGVzY3JpcHQncyB3cml0ZUZpbGUoKSBmdW5jdGlvbiBwZXJmb3JtcyB3ZWlyZCB3aXRoIHN5bWxpbmtzIHVuZGVyIHdhdGNoIG1vZGUgaW4gV2luZG93czpcbiAgICAvLyBFdmVyeSB0aW1lIGEgdHMgZmlsZSBpcyBjaGFuZ2VkLCBpdCB0cmlnZ2VycyB0aGUgc3ltbGluayBiZWluZyBjb21waWxlZCBhbmQgdG8gYmUgd3JpdHRlbiB3aGljaCBpc1xuICAgIC8vIGFzIGV4cGVjdGVkIGJ5IG1lLFxuICAgIC8vIGJ1dCBsYXRlIG9uIGl0IHRyaWdnZXJzIHRoZSBzYW1lIHJlYWwgZmlsZSBhbHNvIGJlaW5nIHdyaXR0ZW4gaW1tZWRpYXRlbHksIHRoaXMgaXMgbm90IHdoYXQgSSBleHBlY3QsXG4gICAgLy8gYW5kIGl0IGRvZXMgbm90IGFjdHVhbGx5IHdyaXRlIG91dCBhbnkgY2hhbmdlcyB0byBmaW5hbCBKUyBmaWxlLlxuICAgIC8vIFNvIEkgZGVjaWRlIHRvIHVzZSBvcmlnaW5hbCBOb2RlLmpzIGZpbGUgc3lzdGVtIEFQSVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhkZXN0RmlsZSwgZGF0YSk7XG4gICAgLy8gSXQgc2VlbXMgVHlwZXNjcmlwdCBjb21waWxlciBhbHdheXMgdXNlcyBzbGFzaCBpbnN0ZWFkIG9mIGJhY2sgc2xhc2ggaW4gZmlsZSBwYXRoLCBldmVuIGluIFdpbmRvd3NcbiAgICAvLyByZXR1cm4gX3dyaXRlRmlsZS5jYWxsKHRoaXMsIGRlc3RGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG4gIGhvc3Qud3JpdGVGaWxlID0gd3JpdGVGaWxlO1xuXG4gIC8vIGNvbnN0IF9nZXRTb3VyY2VGaWxlID0gaG9zdC5nZXRTb3VyY2VGaWxlO1xuICAvLyBjb25zdCBnZXRTb3VyY2VGaWxlOiB0eXBlb2YgX2dldFNvdXJjZUZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZSkge1xuICAvLyAgIC8vIGNvbnNvbGUubG9nKCdnZXRTb3VyY2VGaWxlJywgZmlsZU5hbWUpO1xuICAvLyAgIHJldHVybiBfZ2V0U291cmNlRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAvLyB9O1xuICAvLyBob3N0LmdldFNvdXJjZUZpbGUgPSBnZXRTb3VyY2VGaWxlO1xuICByZXR1cm4gZW1pdHRlZExpc3Q7XG59XG5cbmZ1bmN0aW9uIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLldhdGNoQ29tcGlsZXJIb3N0T2ZGaWxlc0FuZENvbXBpbGVyT3B0aW9uczxfdHMuRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbT4gfCBfdHMuQ29tcGlsZXJIb3N0KSB7XG4gIGNvbnN0IHJlYWRGaWxlID0gaG9zdC5yZWFkRmlsZTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzIGFzIGFueSkgO1xuICAgIGlmIChjb250ZW50ICYmICFwYXRoLmVuZHNXaXRoKCcuZC50cycpICYmICFwYXRoLmVuZHNXaXRoKCcuanNvbicpKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnV2F0Y2hDb21waWxlckhvc3QucmVhZEZpbGUnLCBwYXRoKTtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUocGF0aCwgY29udGVudCk7XG4gICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICBsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkgKyAnIGlzIHBhdGNoZWQnKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xuICB9O1xufVxuXG4vLyBDdXN0b21lciBUcmFuc2Zvcm1lciBzb2x1dGlvbiBpcyBub3QgZmVhc2libGU6IGluIHNvbWUgY2FzZSBsaWtlIGEgV2F0Y2hDb21waWxlciwgaXQgdGhyb3dzIGVycm9yIGxpa2Vcbi8vIFwiY2FuIG5vdCByZWZlcmVuY2UgJy5mbGFncycgb2YgdW5kZWZpbmVkXCIgd2hlbiBhIGN1c3RvbWVyIHRyYW5zZm9ybWVyIHJldHVybiBhIG5ld2x5IGNyZWF0ZWQgU291cmNlRmlsZVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gb3ZlcnJpZGVUc1Byb2dyYW1FbWl0Rm4oZW1pdDogdHMuUHJvZ3JhbVsnZW1pdCddKTogdHMuUHJvZ3JhbVsnZW1pdCddIHtcbi8vICAgLy8gVE9ETzogYWxsb3cgYWRkaW5nIHRyYW5zZm9ybWVyXG4vLyAgIGZ1bmN0aW9uIGhhY2tlZEVtaXQoLi4uYXJnczogUGFyYW1ldGVyczx0cy5Qcm9ncmFtWydlbWl0J10+KSB7XG4vLyAgICAgbGV0IFssLCwsdHJhbnNmb3JtZXJzXSA9IGFyZ3M7XG4vLyAgICAgLy8gbG9nLmluZm8oJ2VtaXQnLCBzcmM/LmZpbGVOYW1lKTtcbi8vICAgICBpZiAodHJhbnNmb3JtZXJzID09IG51bGwpIHtcbi8vICAgICAgIHRyYW5zZm9ybWVycyA9IHt9IGFzIHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbi8vICAgICAgIGFyZ3NbNF0gPSB0cmFuc2Zvcm1lcnM7XG4vLyAgICAgfVxuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMuYmVmb3JlID09IG51bGwpXG4vLyAgICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlID0gW107XG4vLyAgICAgdHJhbnNmb3JtZXJzLmJlZm9yZS5wdXNoKGN0eCA9PiAoe1xuLy8gICAgICAgdHJhbnNmb3JtU291cmNlRmlsZShzcmMpIHtcbi8vICAgICAgICAgbG9nLmRlYnVnKCd0cmFuc2Zvcm1Tb3VyY2VGaWxlJywgc3JjLmZpbGVOYW1lKTtcbi8vICAgICAgICAgcmV0dXJuIHNyYztcbi8vICAgICAgIH0sXG4vLyAgICAgICB0cmFuc2Zvcm1CdW5kbGUobm9kZSkge3JldHVybiBub2RlO31cbi8vICAgICB9KSk7XG4vLyAgICAgLy8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoYXJnc1s0XSkpO1xuLy8gICAgIHJldHVybiBlbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuLy8gICB9O1xuLy8gICByZXR1cm4gaGFja2VkRW1pdDtcbi8vIH1cblxuZnVuY3Rpb24gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGxldCBmaWxlSW5mbyA9ICcnO1xuICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgY29uc3QgcmVhbEZpbGUgPSByZWFsUGF0aE9mKGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZTtcbiAgICBmaWxlSW5mbyA9IGAke3JlYWxGaWxlfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4gIH1cbiAgY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc29sZS5pbmZvKGNoYWxrLmN5YW4odHMuZm9ybWF0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBmb3JtYXRIb3N0KSkpO1xufVxuXG5jb25zdCBDT01QSUxFUl9PUFRJT05TX01FUkdFX0VYQ0xVREUgPSBuZXcgU2V0KFsnYmFzZVVybCcsICd0eXBlUm9vdHMnLCAncGF0aHMnLCAncm9vdERpciddKTtcblxuZnVuY3Rpb24gc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgb3B0cz86IFRzY0NtZFBhcmFtLCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkoY3dkKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtjd2R9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG9wdHM/Lm1lcmdlVHNjb25maWcpIHtcbiAgICBjb25zdCBqc29uID0gbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG9wdHMubWVyZ2VUc2NvbmZpZywgY3dkLCBjb21waWxlck9wdGlvbnMpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGpzb24uY29tcGlsZXJPcHRpb25zKSkge1xuICAgICAgaWYgKCFDT01QSUxFUl9PUFRJT05TX01FUkdFX0VYQ0xVREUuaGFzKGtleSkpIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgbG9nLmRlYnVnKCdtZXJnZSBjb21waWxlciBvcHRpb25zJywga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gYXBwZW5kVHlwZVJvb3RzKFtdLCBjd2QsIGNvbXBpbGVyT3B0aW9ucywge30pO1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoY3dkLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiByZXNvbHZlKHJvb3QsIHdzS2V5KSxcbiAgICByZWFsUGFja2FnZVBhdGhzOiBmYWxzZVxuICB9KTtcblxuICBpZiAob3B0cz8ucGF0aHNKc29ucykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KG9wdHMucGF0aHNKc29ucykpIHtcbiAgICAgIGNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IG9wdHMucGF0aHNKc29ucy5yZWR1Y2UoKHBhdGhNYXAsIGpzb25TdHIpID0+IHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihwYXRoTWFwLCBKU09OLnBhcnNlKGpzb25TdHIpKTtcbiAgICAgICAgcmV0dXJuIHBhdGhNYXA7XG4gICAgICB9LCBjb21waWxlck9wdGlvbnMucGF0aHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3QuYXNzaWduKGNvbXBpbGVyT3B0aW9ucy5wYXRocywgb3B0cy5wYXRoc0pzb25zKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3B0cz8uY29tcGlsZXJPcHRpb25zKSB7XG4gICAgZm9yIChjb25zdCBbcHJvcCwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG9wdHMuY29tcGlsZXJPcHRpb25zKSkge1xuICAgICAgaWYgKHByb3AgPT09ICdiYXNlVXJsJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9wID09PSAncGF0aHMnKSB7XG4gICAgICAgIGlmIChjb21waWxlck9wdGlvbnMucGF0aHMpXG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihjb21waWxlck9wdGlvbnMucGF0aHMsIHZhbHVlKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IHZhbHVlIGFzIGFueTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyT3B0aW9uc1twcm9wXSA9IHZhbHVlIGFzIGFueTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gcmVhbCBwYXRoIG9mIHRhcmdldGluZyBmaWxlLCByZXR1cm4gbnVsbCBpZiB0YXJnZXRpbmcgZmlsZSBpcyBub3QgaW4gb3VyIGNvbXBpbGlhdGlvbiBzY29wZVxuICogQHBhcmFtIGZpbGVOYW1lIFxuICogQHBhcmFtIGNvbW1vblJvb3REaXIgXG4gKiBAcGFyYW0gcGFja2FnZURpclRyZWUgXG4gKi9cbmZ1bmN0aW9uIHJlYWxQYXRoT2YoZmlsZU5hbWU6IHN0cmluZywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIGlzU3JjRmlsZSA9IGZhbHNlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgZmlsZU5hbWUpO1xuICBjb25zdCBfb3JpZ2luUGF0aCA9IGZpbGVOYW1lOyAvLyBhYnNvbHV0ZSBwYXRoXG4gIGNvbnN0IGZvdW5kUGtnSW5mbyA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpO1xuICBpZiAoZm91bmRQa2dJbmZvID09IG51bGwpIHtcbiAgICAvLyB0aGlzIGZpbGUgaXMgbm90IHBhcnQgb2Ygc291cmNlIHBhY2thZ2UuXG4gICAgLy8gbG9nLmluZm8oJ05vdCBwYXJ0IG9mIGVudHJ5IGZpbGVzJywgZmlsZU5hbWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHtzcmNEaXIsIGRlc3REaXIsIHBrZ0RpciwgaXNvbURpciwgc3ltbGlua0Rpcn0gPSBmb3VuZFBrZ0luZm87XG5cbiAgY29uc3QgcGF0aFdpdGhpblBrZyA9IHJlbGF0aXZlKHN5bWxpbmtEaXIsIF9vcmlnaW5QYXRoKTtcblxuICBpZiAoc3JjRGlyID09PSAnLicgfHwgc3JjRGlyLmxlbmd0aCA9PT0gMCkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChzcmNEaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNTcmNGaWxlID8gc3JjRGlyIDogZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShzcmNEaXIubGVuZ3RoICsgMSkpO1xuICB9IGVsc2UgaWYgKGlzb21EaXIgJiYgcGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKGlzb21EaXIgKyBzZXApKSB7XG4gICAgZmlsZU5hbWUgPSBqb2luKHBrZ0RpciwgaXNvbURpciwgcGF0aFdpdGhpblBrZy5zbGljZShpc29tRGlyLmxlbmd0aCArIDEpKTtcbiAgfVxuICByZXR1cm4gZmlsZU5hbWU7XG59XG4iXX0=