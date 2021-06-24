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
            log.info('Use tsconfig file:', baseTsconfig);
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
                    // log.warn('analyzed files:', aRes);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNkI7QUFDN0IsdUNBQXdFO0FBRXhFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsNkRBQXVEO0FBQ3ZELCtDQUFrRTtBQUNsRSxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtDQUEwRTtBQUMxRSx5REFBK0M7QUFDL0MsbURBQStDO0FBSS9DLE1BQU0sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxHQUFHLGVBQVEsQ0FBQztBQUNqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQTJCN0M7Ozs7OztHQU1HO0FBQ0gsU0FBc0IsR0FBRyxDQUFDLElBQWlCLEVBQUUsS0FBaUIsb0JBQUc7O1FBQy9ELGtDQUFrQztRQUNsQyxrQ0FBa0M7UUFDbEMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1FBRS9CLE1BQU0sV0FBVyxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO1FBRWxILElBQUksbUJBQTRDLENBQUM7UUFFakQsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1osTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sV0FBVyxHQUFHLG1DQUFxQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2pFLG1CQUFtQixHQUFHLFdBQVcsQ0FB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R0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQy9GO1NBQU0sSUFBSSxPQUFPLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFBRyxDQUFDLEVBQUU7UUFDN0QsUUFBUSxHQUFHLFdBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoLCB7cmVzb2x2ZSwgam9pbiwgcmVsYXRpdmUsIHNlcH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgX3RzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZywgUGFja2FnZVRzRGlycywgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9uc30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBhbGxQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi9jbWQvdXRpbHMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7bWVyZ2VCYXNlVXJsQW5kUGF0aHMsIHBhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi90cy1jbWQtdXRpbCc7XG5pbXBvcnQge3dlYkluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IHthbmFseXNlRmlsZXN9IGZyb20gJy4vY21kL2NsaS1hbmFseXplJztcbi8vIGltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbmV4cG9ydCB7UmVxdWlyZWRDb21waWxlck9wdGlvbnN9O1xuXG5jb25zdCB7c3ltbGlua0Rpck5hbWUsIHJvb3REaXI6IHJvb3R9ID0gcGxpbmtFbnY7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay50cy1jbWQnKTtcbmV4cG9ydCBpbnRlcmZhY2UgVHNjQ21kUGFyYW0ge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgLyoqIG1lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUgKi9cbiAgbWVyZ2VUc2NvbmZpZz86IHN0cmluZztcbiAgLyoqIEpTT04gc3RyaW5nLCB0byBiZSBtZXJnZWQgdG8gY29tcGlsZXJPcHRpb25zIFwicGF0aHNcIixcbiAgICogYmUgYXdhcmUgdGhhdCBcInBhdGhzXCIgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIFwiYmFzZVVybFwiIHdoaWNoIGlzIHJlbGF0aXZlIHRvIGBQbGlua0Vudi53b3JrRGlyYFxuICAgKiAqL1xuICBwYXRoc0pzb25zPzogQXJyYXk8c3RyaW5nPiB8IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICAvKipcbiAgICogUGFydGlhbCBjb21waWxlciBvcHRpb25zIHRvIGJlIG1lcmdlZCwgZXhjZXB0IFwiYmFzZVVybFwiLlxuICAgKiBcInBhdGhzXCIgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIGBwbGlua0Vudi53b3JrRGlyYFxuICAgKi9cbiAgY29tcGlsZXJPcHRpb25zPzogYW55O1xuICBvdmVycmlkZVBhY2tnZURpcnM/OiB7W3BrZ05hbWU6IHN0cmluZ106IFBhY2thZ2VUc0RpcnN9O1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZURpckluZm8gZXh0ZW5kcyBQYWNrYWdlVHNEaXJzIHtcbiAgcGtnRGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRzYyhhcmd2OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMgKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAvLyBjb25zdCBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIGNvbnN0IGNvbXBGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgcm9vdEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBQYWNrYWdlRGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuXG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcblxuICBpZiAoYXJndi5qc3gpIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlMiA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKTtcbiAgICBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGNvbnN0IHRzeFRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHRzeFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgICAvLyBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZyk7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gIH1cblxuICAvLyBjb25zdCBwcm9tQ29tcGlsZSA9IFByb21pc2UucmVzb2x2ZSggW10gYXMgRW1pdExpc3QpO1xuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPigpO1xuICBjb25zdCBjb21tb25Sb290RGlyID0gcGxpbmtFbnYud29ya0RpcjtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBsZXQgcGtnSW5mb3M6IFBhY2thZ2VJbmZvW10gfCB1bmRlZmluZWQ7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoYXJndi5wYWNrYWdlKSkuZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbCkgYXMgUGFja2FnZUluZm9bXTtcbiAgICAvLyBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGtnSW5mb3MgPSBBcnJheS5mcm9tKGFsbFBhY2thZ2VzKCcqJywgJ3NyYycsIGFyZ3YucHJvamVjdCkpO1xuICB9IGVsc2Uge1xuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIsIGZhbHNlKSk7XG4gICAgLy8gZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwbGlua0Vudi53b3JrRGlyLCBmYWxzZSkpIHtcbiAgICAvLyAgIG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCk7XG4gICAgLy8gfVxuICB9XG4gIGF3YWl0IFByb21pc2UuYWxsKHBrZ0luZm9zLm1hcChwa2cgPT4gb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKSkpO1xuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uc3ltbGlua0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNvdXJjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cblxuICBjb25zdCBkZXN0RGlyID0gY29tbW9uUm9vdERpci5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbiAgICAvKipcbiAgICAgKiBmb3IgZ3VscC1zb3VyY2VtYXBzIHVzYWdlOlxuICAgICAqICBJZiB5b3Ugc2V0IHRoZSBvdXREaXIgb3B0aW9uIHRvIHRoZSBzYW1lIHZhbHVlIGFzIHRoZSBkaXJlY3RvcnkgaW4gZ3VscC5kZXN0LCB5b3Ugc2hvdWxkIHNldCB0aGUgc291cmNlUm9vdCB0byAuLy5cbiAgICAgKi9cbiAgICBvdXREaXI6IGRlc3REaXIsXG4gICAgcm9vdERpcjogZGVzdERpcixcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgc291cmNlTWFwOiBhcmd2LnNvdXJjZU1hcCAhPT0gJ2lubGluZScsXG4gICAgaW5saW5lU291cmNlczogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWRcbiAgICAvLyBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlXG4gIH07XG5cbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zLCBhcmd2LCB0cyk7XG5cbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgLyoqIHNldCBjb21wR2xvYnMgKi9cbiAgYXN5bmMgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBfcGFja2FnZVBhdGg6IHN0cmluZywgX3BhcnNlZE5hbWU6IGFueSwganNvbjogYW55LCByZWFsUGF0aDogc3RyaW5nKSB7XG4gICAgY291bnRQa2crKztcbiAgICBjb25zdCB0c2NDZmc6IFBhY2thZ2VUc0RpcnMgPSBhcmd2Lm92ZXJyaWRlUGFja2dlRGlycyAmJiBfLmhhcyhhcmd2Lm92ZXJyaWRlUGFja2dlRGlycywgbmFtZSkgP1xuICAgICAgYXJndi5vdmVycmlkZVBhY2tnZURpcnNbbmFtZV0gOiBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICAvLyBGb3Igd29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM3OTYwXG4gICAgLy8gVXNlIGEgc3ltbGluayBwYXRoIGluc3RlYWQgb2YgYSByZWFsIHBhdGgsIHNvIHRoYXQgVHlwZXNjcmlwdCBjb21waWxlciB3aWxsIG5vdFxuICAgIC8vIHJlY29nbml6ZSB0aGVtIGFzIGZyb20gc29tZXdoZXJlIHdpdGggXCJub2RlX21vZHVsZXNcIiwgdGhlIHN5bWxpbmsgbXVzdCBiZSByZXNpZGVcbiAgICAvLyBpbiBkaXJlY3Rvcnkgd2hpY2ggZG9lcyBub3QgY29udGFpbiBcIm5vZGVfbW9kdWxlc1wiIGFzIHBhcnQgb2YgYWJzb2x1dGUgcGF0aC5cbiAgICBjb25zdCBzeW1saW5rRGlyID0gcmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgbmFtZSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGgsIHN5bWxpbmtEaXJ9KTtcblxuICAgIGNvbnN0IHNyY0RpcnMgPSBbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgaWYgKHNyY0RpciA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihzeW1saW5rRGlyLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoc3JjRGlycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzeW1saW5rRGlyKSkge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIGRpcmVjdG9yeSAke2NoYWxrLnJlZChzeW1saW5rRGlyKX0sYCArXG4gICAgICAgIGAgaXQgaXMgcG9zc2libGUgdGhhdCBwYWNrYWdlICR7bmFtZX0gaXMgeWV0IG5vdCBhZGRlZCB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlJ3MgcGFja2FnZS5qc29uIGZpbGUsYCArXG4gICAgICAgICcgY3VycmVudCB3b3JrdHJlZSBzcGFjZSBpcyBub3Qgc3luY2VkIHlldCwgdHJ5IFwic3luY1wiL1wiaW5pdFwiIGNvbW1hbmQgcGxlYXNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIHRzIHNvdXJjZSBkaXJlY3RvcnkgZm91bmQgZm9yIHBhY2thZ2UgJHtjaGFsay5yZWQobmFtZSl9OmAgK1xuICAgICAgICAgIGAgJHtbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCkuam9pbignLCAnKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHNjQ2ZnLmZpbGVzKSB7XG4gICAgICBjb25zdCBmaWxlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5maWxlcyk7XG4gICAgICBjb25zdCBhUmVzID0gYXdhaXQgYW5hbHlzZUZpbGVzKGZpbGVzLm1hcChmaWxlID0+IHJlc29sdmUoc3ltbGlua0RpciwgZmlsZSkpLCBhcmd2Lm1lcmdlVHNjb25maWcsIFtdKTtcbiAgICAgIC8vIGxvZy53YXJuKCdhbmFseXplZCBmaWxlczonLCBhUmVzKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLihhUmVzLmZpbGVzLmZpbHRlcihmaWxlID0+IGZpbGUuc3RhcnRzV2l0aChzeW1saW5rRGlyICsgc2VwKSAmJiAhL1xcLig/OmpzeD98ZFxcLnRzKSQvLnRlc3QoZmlsZSkpXG4gICAgICAgIC5tYXAoZmlsZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgIGxldCBwYXR0ZXJucyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5pbmNsdWRlKTtcbiAgICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgICBjb25zdCBnbG9iUGF0dGVybiA9IHJlc29sdmUoc3ltbGlua0RpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBnbG9iLnN5bmMoZ2xvYlBhdHRlcm4pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmZpbGVzID09IG51bGwgJiYgdHNjQ2ZnLmluY2x1ZGUgPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlycykge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShzeW1saW5rRGlyLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzJykuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpLmZvckVhY2goZmlsZSA9PiByb290RmlsZXMucHVzaChmaWxlKSk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIGdsb2Iuc3luYyhyZWxQYXRoICsgJy8qKi8qLnRzeCcpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGxvZy53YXJuKCdyb290RmlsZXM6XFxuJyArIHJvb3RGaWxlcy5qb2luKCdcXG4nKSk7XG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICB3YXRjaChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgICByZXR1cm4gW107XG4gICAgLy8gd2F0Y2goY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkLCBhcmd2LmpzeCwgb25Db21waWxlZCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgLy8gcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCk7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IHBhdGggPT4gcGF0aCxcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPiwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLFxuICAgIHBsaW5rRW52LndvcmtEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsXG4gICAgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSwgX3JlcG9ydERpYWdub3N0aWMsIGQgPT4gcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKGQsIHRzKSk7XG4gIHBhdGNoV2F0Y2hDb21waWxlckhvc3QocHJvZ3JhbUhvc3QpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgLy8gVHMncyBjcmVhdGVXYXRjaFByb2dyYW0gd2lsbCBjYWxsIFdhdGNoQ29tcGlsZXJIb3N0LmNyZWF0ZVByb2dyYW0oKSwgdGhpcyBpcyB3aGVyZSB3ZSBwYXRjaCBcIkNvbXBpbGVySG9zdFwiXG4gIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgaG9zdD86IF90cy5Db21waWxlckhvc3QpIHtcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uYXBwbHkodGhpcywgYXJndW1lbnRzKSBhcyBSZXR1cm5UeXBlPHR5cGVvZiBvcmlnQ3JlYXRlUHJvZ3JhbT47XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH07XG5cbiAgdHMuY3JlYXRlV2F0Y2hQcm9ncmFtKHByb2dyYW1Ib3N0KTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4gIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3QpO1xuICBjb25zdCBlbWl0dGVkID0gcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGVtaXRSZXN1bHQgPSBwcm9ncmFtLmVtaXQoKTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0cy5nZXRQcmVFbWl0RGlhZ25vc3RpY3MocHJvZ3JhbSlcbiAgICAuY29uY2F0KGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMpO1xuICB9KTtcbiAgaWYgKGVtaXRSZXN1bHQuZW1pdFNraXBwZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBpbGUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGVtaXR0ZWQ7XG59XG5cbi8qKiBPdmVycmlkaW5nIFdyaXRlRmlsZSgpICovXG5mdW5jdGlvbiBwYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuQ29tcGlsZXJIb3N0LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPixcbiAgY286IF90cy5Db21waWxlck9wdGlvbnMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKTogc3RyaW5nW10ge1xuICBjb25zdCBlbWl0dGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgLy8gSXQgc2VlbXMgdG8gbm90IGFibGUgdG8gd3JpdGUgZmlsZSB0aHJvdWdoIHN5bWxpbmsgaW4gV2luZG93c1xuICAvLyBjb25zdCBfd3JpdGVGaWxlID0gaG9zdC53cml0ZUZpbGU7XG4gIGNvbnN0IHdyaXRlRmlsZTogX3RzLldyaXRlRmlsZUNhbGxiYWNrID0gZnVuY3Rpb24oZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpIHtcbiAgICBjb25zdCBkZXN0RmlsZSA9IHJlYWxQYXRoT2YoZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICBpZiAoZGVzdEZpbGUgPT0gbnVsbCkge1xuICAgICAgbG9nLmRlYnVnKCdza2lwJywgZmlsZU5hbWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbWl0dGVkTGlzdC5wdXNoKGRlc3RGaWxlKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgZmlsZScsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZGVzdEZpbGUpKTtcbiAgICAvLyBUeXBlc2NyaXB0J3Mgd3JpdGVGaWxlKCkgZnVuY3Rpb24gcGVyZm9ybXMgd2VpcmQgd2l0aCBzeW1saW5rcyB1bmRlciB3YXRjaCBtb2RlIGluIFdpbmRvd3M6XG4gICAgLy8gRXZlcnkgdGltZSBhIHRzIGZpbGUgaXMgY2hhbmdlZCwgaXQgdHJpZ2dlcnMgdGhlIHN5bWxpbmsgYmVpbmcgY29tcGlsZWQgYW5kIHRvIGJlIHdyaXR0ZW4gd2hpY2ggaXNcbiAgICAvLyBhcyBleHBlY3RlZCBieSBtZSxcbiAgICAvLyBidXQgbGF0ZSBvbiBpdCB0cmlnZ2VycyB0aGUgc2FtZSByZWFsIGZpbGUgYWxzbyBiZWluZyB3cml0dGVuIGltbWVkaWF0ZWx5LCB0aGlzIGlzIG5vdCB3aGF0IEkgZXhwZWN0LFxuICAgIC8vIGFuZCBpdCBkb2VzIG5vdCBhY3R1YWxseSB3cml0ZSBvdXQgYW55IGNoYW5nZXMgdG8gZmluYWwgSlMgZmlsZS5cbiAgICAvLyBTbyBJIGRlY2lkZSB0byB1c2Ugb3JpZ2luYWwgTm9kZS5qcyBmaWxlIHN5c3RlbSBBUElcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShkZXN0RmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZGVzdEZpbGUsIGRhdGEpO1xuICAgIC8vIEl0IHNlZW1zIFR5cGVzY3JpcHQgY29tcGlsZXIgYWx3YXlzIHVzZXMgc2xhc2ggaW5zdGVhZCBvZiBiYWNrIHNsYXNoIGluIGZpbGUgcGF0aCwgZXZlbiBpbiBXaW5kb3dzXG4gICAgLy8gcmV0dXJuIF93cml0ZUZpbGUuY2FsbCh0aGlzLCBkZXN0RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyksIC4uLkFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuICBob3N0LndyaXRlRmlsZSA9IHdyaXRlRmlsZTtcblxuICAvLyBjb25zdCBfZ2V0U291cmNlRmlsZSA9IGhvc3QuZ2V0U291cmNlRmlsZTtcbiAgLy8gY29uc3QgZ2V0U291cmNlRmlsZTogdHlwZW9mIF9nZXRTb3VyY2VGaWxlID0gZnVuY3Rpb24oZmlsZU5hbWUpIHtcbiAgLy8gICAvLyBjb25zb2xlLmxvZygnZ2V0U291cmNlRmlsZScsIGZpbGVOYW1lKTtcbiAgLy8gICByZXR1cm4gX2dldFNvdXJjZUZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgLy8gfTtcbiAgLy8gaG9zdC5nZXRTb3VyY2VGaWxlID0gZ2V0U291cmNlRmlsZTtcbiAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xufVxuXG5mdW5jdGlvbiBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5XYXRjaENvbXBpbGVySG9zdE9mRmlsZXNBbmRDb21waWxlck9wdGlvbnM8X3RzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0+IHwgX3RzLkNvbXBpbGVySG9zdCkge1xuICBjb25zdCByZWFkRmlsZSA9IGhvc3QucmVhZEZpbGU7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGhvc3QucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmIChjb250ZW50ICYmICFwYXRoLmVuZHNXaXRoKCcuZC50cycpICYmICFwYXRoLmVuZHNXaXRoKCcuanNvbicpKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnV2F0Y2hDb21waWxlckhvc3QucmVhZEZpbGUnLCBwYXRoKTtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB3ZWJJbmplY3Rvci5pbmplY3RUb0ZpbGUocGF0aCwgY29udGVudCk7XG4gICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICBsb2cuaW5mbyhQYXRoLnJlbGF0aXZlKGN3ZCwgcGF0aCkgKyAnIGlzIHBhdGNoZWQnKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xuICB9O1xufVxuXG4vLyBDdXN0b21lciBUcmFuc2Zvcm1lciBzb2x1dGlvbiBpcyBub3QgZmVhc2libGU6IGluIHNvbWUgY2FzZSBsaWtlIGEgV2F0Y2hDb21waWxlciwgaXQgdGhyb3dzIGVycm9yIGxpa2Vcbi8vIFwiY2FuIG5vdCByZWZlcmVuY2UgJy5mbGFncycgb2YgdW5kZWZpbmVkXCIgd2hlbiBhIGN1c3RvbWVyIHRyYW5zZm9ybWVyIHJldHVybiBhIG5ld2x5IGNyZWF0ZWQgU291cmNlRmlsZVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gb3ZlcnJpZGVUc1Byb2dyYW1FbWl0Rm4oZW1pdDogdHMuUHJvZ3JhbVsnZW1pdCddKTogdHMuUHJvZ3JhbVsnZW1pdCddIHtcbi8vICAgLy8gVE9ETzogYWxsb3cgYWRkaW5nIHRyYW5zZm9ybWVyXG4vLyAgIGZ1bmN0aW9uIGhhY2tlZEVtaXQoLi4uYXJnczogUGFyYW1ldGVyczx0cy5Qcm9ncmFtWydlbWl0J10+KSB7XG4vLyAgICAgbGV0IFssLCwsdHJhbnNmb3JtZXJzXSA9IGFyZ3M7XG4vLyAgICAgLy8gbG9nLmluZm8oJ2VtaXQnLCBzcmM/LmZpbGVOYW1lKTtcbi8vICAgICBpZiAodHJhbnNmb3JtZXJzID09IG51bGwpIHtcbi8vICAgICAgIHRyYW5zZm9ybWVycyA9IHt9IGFzIHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbi8vICAgICAgIGFyZ3NbNF0gPSB0cmFuc2Zvcm1lcnM7XG4vLyAgICAgfVxuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMuYmVmb3JlID09IG51bGwpXG4vLyAgICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlID0gW107XG4vLyAgICAgdHJhbnNmb3JtZXJzLmJlZm9yZS5wdXNoKGN0eCA9PiAoe1xuLy8gICAgICAgdHJhbnNmb3JtU291cmNlRmlsZShzcmMpIHtcbi8vICAgICAgICAgbG9nLmRlYnVnKCd0cmFuc2Zvcm1Tb3VyY2VGaWxlJywgc3JjLmZpbGVOYW1lKTtcbi8vICAgICAgICAgcmV0dXJuIHNyYztcbi8vICAgICAgIH0sXG4vLyAgICAgICB0cmFuc2Zvcm1CdW5kbGUobm9kZSkge3JldHVybiBub2RlO31cbi8vICAgICB9KSk7XG4vLyAgICAgLy8gY29uc29sZS5sb2cocmVxdWlyZSgndXRpbCcpLmluc3BlY3QoYXJnc1s0XSkpO1xuLy8gICAgIHJldHVybiBlbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuLy8gICB9O1xuLy8gICByZXR1cm4gaGFja2VkRW1pdDtcbi8vIH1cblxuZnVuY3Rpb24gcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGxldCBmaWxlSW5mbyA9ICcnO1xuICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgY29uc3QgcmVhbEZpbGUgPSByZWFsUGF0aE9mKGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZTtcbiAgICBmaWxlSW5mbyA9IGAke3JlYWxGaWxlfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4gIH1cbiAgY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYywgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgY29uc29sZS5pbmZvKGNoYWxrLmN5YW4odHMuZm9ybWF0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBmb3JtYXRIb3N0KSkpO1xufVxuXG5jb25zdCBDT01QSUxFUl9PUFRJT05TX01FUkdFX0VYQ0xVREUgPSBuZXcgU2V0KFsnYmFzZVVybCcsICd0eXBlUm9vdHMnLCAncGF0aHMnLCAncm9vdERpciddKTtcblxuZnVuY3Rpb24gc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgb3B0cz86IFRzY0NtZFBhcmFtLCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkoY3dkKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtjd2R9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG9wdHM/Lm1lcmdlVHNjb25maWcpIHtcbiAgICBjb25zdCBqc29uID0gbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG9wdHMubWVyZ2VUc2NvbmZpZywgY3dkLCBjb21waWxlck9wdGlvbnMpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGpzb24uY29tcGlsZXJPcHRpb25zKSkge1xuICAgICAgaWYgKCFDT01QSUxFUl9PUFRJT05TX01FUkdFX0VYQ0xVREUuaGFzKGtleSkpIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgbG9nLmRlYnVnKCdtZXJnZSBjb21waWxlciBvcHRpb25zJywga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKGN3ZCwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogcmVzb2x2ZShyb290LCB3c0tleSlcbiAgfSk7XG5cbiAgaWYgKG9wdHM/LnBhdGhzSnNvbnMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRzLnBhdGhzSnNvbnMpKSB7XG4gICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSBvcHRzLnBhdGhzSnNvbnMucmVkdWNlKChwYXRoTWFwLCBqc29uU3RyKSA9PiB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocGF0aE1hcCwgSlNPTi5wYXJzZShqc29uU3RyKSk7XG4gICAgICAgIHJldHVybiBwYXRoTWFwO1xuICAgICAgfSwgY29tcGlsZXJPcHRpb25zLnBhdGhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmFzc2lnbihjb21waWxlck9wdGlvbnMucGF0aHMsIG9wdHMucGF0aHNKc29ucyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdHM/LmNvbXBpbGVyT3B0aW9ucykge1xuICAgIGZvciAoY29uc3QgW3Byb3AsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRzLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmIChwcm9wID09PSAnYmFzZVVybCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gJ3BhdGhzJykge1xuICAgICAgICBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzKVxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxlck9wdGlvbnNbcHJvcF0gPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHJlYWwgcGF0aCBvZiB0YXJnZXRpbmcgZmlsZSwgcmV0dXJuIG51bGwgaWYgdGFyZ2V0aW5nIGZpbGUgaXMgbm90IGluIG91ciBjb21waWxpYXRpb24gc2NvcGVcbiAqIEBwYXJhbSBmaWxlTmFtZSBcbiAqIEBwYXJhbSBjb21tb25Sb290RGlyIFxuICogQHBhcmFtIHBhY2thZ2VEaXJUcmVlIFxuICovXG5mdW5jdGlvbiByZWFsUGF0aE9mKGZpbGVOYW1lOiBzdHJpbmcsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBpc1NyY0ZpbGUgPSBmYWxzZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGVOYW1lKTtcbiAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICBjb25zdCBmb3VuZFBrZ0luZm8gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKTtcbiAgaWYgKGZvdW5kUGtnSW5mbyA9PSBudWxsKSB7XG4gICAgLy8gdGhpcyBmaWxlIGlzIG5vdCBwYXJ0IG9mIHNvdXJjZSBwYWNrYWdlLlxuICAgIC8vIGxvZy5pbmZvKCdOb3QgcGFydCBvZiBlbnRyeSBmaWxlcycsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3JjRGlyLCBkZXN0RGlyLCBwa2dEaXIsIGlzb21EaXIsIHN5bWxpbmtEaXJ9ID0gZm91bmRQa2dJbmZvO1xuXG4gIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShzeW1saW5rRGlyLCBfb3JpZ2luUGF0aCk7XG5cbiAgaWYgKHNyY0RpciA9PT0gJy4nIHx8IHNyY0Rpci5sZW5ndGggPT09IDApIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoc3JjRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2Uoc3JjRGlyLmxlbmd0aCArIDEpKTtcbiAgfSBlbHNlIGlmIChpc29tRGlyICYmIHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChpc29tRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzb21EaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UoaXNvbURpci5sZW5ndGggKyAxKSk7XG4gIH1cbiAgcmV0dXJuIGZpbGVOYW1lO1xufVxuIl19