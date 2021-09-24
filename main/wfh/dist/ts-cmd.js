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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNkI7QUFDN0IsdUNBQXdFO0FBRXhFLDJFQUF1STtBQUN2SSx1Q0FBZ0Q7QUFDaEQsNkRBQXVEO0FBQ3ZELCtDQUFrRTtBQUNsRSxvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtDQUEwRTtBQUMxRSx5REFBK0M7QUFDL0MsbURBQStDO0FBSS9DLE1BQU0sRUFBQyxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFDbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUEyQjdDOzs7Ozs7R0FNRztBQUNJLEtBQUssVUFBVSxHQUFHLENBQUMsSUFBaUIsRUFBRSxLQUFpQixvQkFBRztJQUMvRCxrQ0FBa0M7SUFDbEMsa0NBQWtDO0lBQ2xDLE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUUvQixNQUFNLFdBQVcsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUVsSCxJQUFJLG1CQUE0QyxDQUFDO0lBRWpELElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNaLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNsRCxNQUFNLFdBQVcsR0FBRyxJQUFBLG1DQUFxQixFQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pFLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUM7UUFDbEQseUZB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QyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7S0FDdEU7U0FBTSxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFVBQUcsQ0FBQyxFQUFFO1FBQ2pELFFBQVEsR0FBRyxJQUFBLFdBQUksRUFBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMvRjtTQUFNLElBQUksT0FBTyxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLFVBQUcsQ0FBQyxFQUFFO1FBQzdELFFBQVEsR0FBRyxJQUFBLFdBQUksRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoLCB7cmVzb2x2ZSwgam9pbiwgcmVsYXRpdmUsIHNlcH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgX3RzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZywgUGFja2FnZVRzRGlycywgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9uc30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zLCBhbGxQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi9jbWQvdXRpbHMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7bWVyZ2VCYXNlVXJsQW5kUGF0aHMsIHBhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi90cy1jbWQtdXRpbCc7XG5pbXBvcnQge3dlYkluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IHthbmFseXNlRmlsZXN9IGZyb20gJy4vY21kL2NsaS1hbmFseXplJztcbi8vIGltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbmV4cG9ydCB7UmVxdWlyZWRDb21waWxlck9wdGlvbnN9O1xuXG5jb25zdCB7c3ltbGlua0Rpck5hbWV9ID0gcGxpbmtFbnY7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay50cy1jbWQnKTtcbmV4cG9ydCBpbnRlcmZhY2UgVHNjQ21kUGFyYW0ge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgLyoqIG1lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUgKi9cbiAgbWVyZ2VUc2NvbmZpZz86IHN0cmluZztcbiAgLyoqIEpTT04gc3RyaW5nLCB0byBiZSBtZXJnZWQgdG8gY29tcGlsZXJPcHRpb25zIFwicGF0aHNcIixcbiAgICogYmUgYXdhcmUgdGhhdCBcInBhdGhzXCIgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIFwiYmFzZVVybFwiIHdoaWNoIGlzIHJlbGF0aXZlIHRvIGBQbGlua0Vudi53b3JrRGlyYFxuICAgKiAqL1xuICBwYXRoc0pzb25zPzogQXJyYXk8c3RyaW5nPiB8IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICAvKipcbiAgICogUGFydGlhbCBjb21waWxlciBvcHRpb25zIHRvIGJlIG1lcmdlZCwgZXhjZXB0IFwiYmFzZVVybFwiLlxuICAgKiBcInBhdGhzXCIgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIGBwbGlua0Vudi53b3JrRGlyYFxuICAgKi9cbiAgY29tcGlsZXJPcHRpb25zPzogYW55O1xuICBvdmVycmlkZVBhY2tnZURpcnM/OiB7W3BrZ05hbWU6IHN0cmluZ106IFBhY2thZ2VUc0RpcnN9O1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZURpckluZm8gZXh0ZW5kcyBQYWNrYWdlVHNEaXJzIHtcbiAgcGtnRGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRzYyhhcmd2OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMgKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAvLyBjb25zdCBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIGNvbnN0IGNvbXBGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgcm9vdEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBQYWNrYWdlRGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuXG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcblxuICBpZiAoYXJndi5qc3gpIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlMiA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKTtcbiAgICBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGNvbnN0IHRzeFRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHRzeFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgICAvLyBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSBiYXNlVHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICB9XG5cbiAgLy8gY29uc3QgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4oKTtcbiAgY29uc3QgY29tbW9uUm9vdERpciA9IHBsaW5rRW52LndvcmtEaXI7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgbGV0IHBrZ0luZm9zOiBQYWNrYWdlSW5mb1tdIHwgdW5kZWZpbmVkO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGFyZ3YucGFja2FnZSkpLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpIGFzIFBhY2thZ2VJbmZvW107XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBrZ0luZm9zID0gQXJyYXkuZnJvbShhbGxQYWNrYWdlcygnKicsICdzcmMnLCBhcmd2LnByb2plY3QpKTtcbiAgfSBlbHNlIHtcbiAgICBwa2dJbmZvcyA9IEFycmF5LmZyb20ocGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwbGlua0Vudi53b3JrRGlyLCBmYWxzZSkpO1xuICB9XG4gIGF3YWl0IFByb21pc2UuYWxsKHBrZ0luZm9zLm1hcChwa2cgPT4gb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKSkpO1xuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uc3ltbGlua0Rpcik7XG4gICAgbG9nLmRlYnVnKCd0cmVlUGF0aCcsIHRyZWVQYXRoKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNvdXJjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cblxuICBjb25zdCBkZXN0RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBjb21tb25Sb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICB0YXJnZXQ6ICdFUzIwMTcnLFxuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8vIG1vZHVsZTogJ0VTTmV4dCcsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgIT09ICdpbmxpbmUnLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkLFxuICAgIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcblxuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMsIGFyZ3YsIHRzKTtcblxuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICAvKiogc2V0IGNvbXBHbG9icyAqL1xuICBhc3luYyBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIF9wYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZyA9IGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzICYmIF8uaGFzKGFyZ3Yub3ZlcnJpZGVQYWNrZ2VEaXJzLCBuYW1lKSA/XG4gICAgICBhcmd2Lm92ZXJyaWRlUGFja2dlRGlyc1tuYW1lXSA6IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuICAgIC8vIEZvciB3b3JrYXJvdW5kIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzc5NjBcbiAgICAvLyBVc2UgYSBzeW1saW5rIHBhdGggaW5zdGVhZCBvZiBhIHJlYWwgcGF0aCwgc28gdGhhdCBUeXBlc2NyaXB0IGNvbXBpbGVyIHdpbGwgbm90XG4gICAgLy8gcmVjb2duaXplIHRoZW0gYXMgZnJvbSBzb21ld2hlcmUgd2l0aCBcIm5vZGVfbW9kdWxlc1wiLCB0aGUgc3ltbGluayBtdXN0IGJlIHJlc2lkZVxuICAgIC8vIGluIGRpcmVjdG9yeSB3aGljaCBkb2VzIG5vdCBjb250YWluIFwibm9kZV9tb2R1bGVzXCIgYXMgcGFydCBvZiBhYnNvbHV0ZSBwYXRoLlxuICAgIGNvbnN0IHN5bWxpbmtEaXIgPSByZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBuYW1lKTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwgey4uLnRzY0NmZywgcGtnRGlyOiByZWFsUGF0aCwgc3ltbGlua0Rpcn0pO1xuXG4gICAgY29uc3Qgc3JjRGlycyA9IFt0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHN5bWxpbmtEaXIsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChzcmNEaXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHN5bWxpbmtEaXIpKSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgZGlyZWN0b3J5ICR7Y2hhbGsucmVkKHN5bWxpbmtEaXIpfSxgICtcbiAgICAgICAgYCBpdCBpcyBwb3NzaWJsZSB0aGF0IHBhY2thZ2UgJHtuYW1lfSBpcyB5ZXQgbm90IGFkZGVkIHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UncyBwYWNrYWdlLmpzb24gZmlsZSxgICtcbiAgICAgICAgJyBjdXJyZW50IHdvcmt0cmVlIHNwYWNlIGlzIG5vdCBzeW5jZWQgeWV0LCB0cnkgXCJzeW5jXCIvXCJpbml0XCIgY29tbWFuZCBwbGVhc2UnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhpc3RpbmcgdHMgc291cmNlIGRpcmVjdG9yeSBmb3VuZCBmb3IgcGFja2FnZSAke2NoYWxrLnJlZChuYW1lKX06YCArXG4gICAgICAgICAgYCAke1t0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKS5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0c2NDZmcuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGZpbGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmZpbGVzKTtcbiAgICAgIGNvbnN0IGFSZXMgPSBhd2FpdCBhbmFseXNlRmlsZXMoZmlsZXMubWFwKGZpbGUgPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBmaWxlKSksIGFyZ3YubWVyZ2VUc2NvbmZpZywgW10pO1xuICAgICAgbG9nLmRlYnVnKCdhbmFseXplZCBmaWxlczonLCBhUmVzKTtcbiAgICAgIGlmIChhUmVzKSB7XG4gICAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLihhUmVzLmZpbGVzLmZpbHRlcihmaWxlID0+IGZpbGUuc3RhcnRzV2l0aChzeW1saW5rRGlyICsgc2VwKSAmJiAhL1xcLig/OmpzeD98ZFxcLnRzKSQvLnRlc3QoZmlsZSkpXG4gICAgICAgICAgLm1hcChmaWxlID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpKSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRzY0NmZy5pbmNsdWRlKSB7XG4gICAgICBsZXQgcGF0dGVybnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuaW5jbHVkZSk7XG4gICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgcGF0dGVybnMpIHtcbiAgICAgICAgY29uc3QgZ2xvYlBhdHRlcm4gPSByZXNvbHZlKHN5bWxpbmtEaXIsIHBhdHRlcm4pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgZ2xvYi5zeW5jKGdsb2JQYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRzY0NmZy5maWxlcyA9PSBudWxsICYmIHRzY0NmZy5pbmNsdWRlID09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnMpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUoc3ltbGlua0Rpciwgc3JjRGlyISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBnbG9iLnN5bmMocmVsUGF0aCArICcvKiovKi50cycpLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKS5mb3JFYWNoKGZpbGUgPT4gcm9vdEZpbGVzLnB1c2goZmlsZSkpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICBnbG9iLnN5bmMocmVsUGF0aCArICcvKiovKi50c3gnKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkuZm9yRWFjaChmaWxlID0+IHJvb3RGaWxlcy5wdXNoKGZpbGUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBsb2cud2Fybigncm9vdEZpbGVzOlxcbicgKyByb290RmlsZXMuam9pbignXFxuJykpO1xuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgd2F0Y2gocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gICAgcmV0dXJuIFtdO1xuICAgIC8vIHdhdGNoKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCwgYXJndi5qc3gsIG9uQ29tcGlsZWQpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVtaXR0ZWQgPSBjb21waWxlKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgdHMpO1xuICAgIGlmIChwcm9jZXNzLnNlbmQpXG4gICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAgIHJldHVybiBlbWl0dGVkO1xuICAgIC8vIHByb21Db21waWxlID0gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGFyZ3YuZWQpO1xuICB9XG59XG5cbmNvbnN0IGZvcm1hdEhvc3Q6IF90cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lOiBwYXRoID0+IHBhdGgsXG4gIGdldEN1cnJlbnREaXJlY3Rvcnk6IF90cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgZ2V0TmV3TGluZTogKCkgPT4gX3RzLnN5cy5uZXdMaW5lXG59O1xuXG5mdW5jdGlvbiB3YXRjaChyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cyk7XG4gIH1cbiAgY29uc3QgcHJvZ3JhbUhvc3QgPSB0cy5jcmVhdGVXYXRjaENvbXBpbGVySG9zdChyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgdHMuc3lzLFxuICAgIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sIF9yZXBvcnREaWFnbm9zdGljLCBkID0+IHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkLCB0cykpO1xuICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KHByb2dyYW1Ib3N0KTtcblxuICBjb25zdCBvcmlnQ3JlYXRlUHJvZ3JhbSA9IHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW07XG4gIC8vIFRzJ3MgY3JlYXRlV2F0Y2hQcm9ncmFtIHdpbGwgY2FsbCBXYXRjaENvbXBpbGVySG9zdC5jcmVhdGVQcm9ncmFtKCksIHRoaXMgaXMgd2hlcmUgd2UgcGF0Y2ggXCJDb21waWxlckhvc3RcIlxuICBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtID0gZnVuY3Rpb24ocm9vdE5hbWVzOiByZWFkb25seSBzdHJpbmdbXSB8IHVuZGVmaW5lZCwgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIGhvc3Q/OiBfdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgIGlmIChob3N0ICYmIChob3N0IGFzIGFueSkuX292ZXJyaWRlZCA9PSBudWxsKSB7XG4gICAgICBwYXRjaENvbXBpbGVySG9zdChob3N0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgY29tcGlsZXJPcHRpb25zLCB0cyk7XG4gICAgfVxuICAgIGNvbnN0IHByb2dyYW0gPSBvcmlnQ3JlYXRlUHJvZ3JhbS5hcHBseSh0aGlzLCBhcmd1bWVudHMgYXMgYW55KSA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH07XG5cbiAgdHMuY3JlYXRlV2F0Y2hQcm9ncmFtKHByb2dyYW1Ib3N0KTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlRGlySW5mbz4sXG4gIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3QpO1xuICBjb25zdCBlbWl0dGVkID0gcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucywgdHMpO1xuICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGVtaXRSZXN1bHQgPSBwcm9ncmFtLmVtaXQoKTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0cy5nZXRQcmVFbWl0RGlhZ25vc3RpY3MocHJvZ3JhbSlcbiAgICAuY29uY2F0KGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuXG4gIGZ1bmN0aW9uIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRzKTtcbiAgfVxuICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMpO1xuICB9KTtcbiAgaWYgKGVtaXRSZXN1bHQuZW1pdFNraXBwZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBpbGUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGVtaXR0ZWQ7XG59XG5cbi8qKiBPdmVycmlkaW5nIFdyaXRlRmlsZSgpICovXG5mdW5jdGlvbiBwYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuQ29tcGlsZXJIb3N0LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPixcbiAgY286IF90cy5Db21waWxlck9wdGlvbnMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKTogc3RyaW5nW10ge1xuICBjb25zdCBlbWl0dGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgLy8gSXQgc2VlbXMgdG8gbm90IGFibGUgdG8gd3JpdGUgZmlsZSB0aHJvdWdoIHN5bWxpbmsgaW4gV2luZG93c1xuICAvLyBjb25zdCBfd3JpdGVGaWxlID0gaG9zdC53cml0ZUZpbGU7XG4gIGNvbnN0IHdyaXRlRmlsZTogX3RzLldyaXRlRmlsZUNhbGxiYWNrID0gZnVuY3Rpb24oZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpIHtcbiAgICBjb25zdCBkZXN0RmlsZSA9IHJlYWxQYXRoT2YoZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICBpZiAoZGVzdEZpbGUgPT0gbnVsbCkge1xuICAgICAgbG9nLmRlYnVnKCdza2lwJywgZmlsZU5hbWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbWl0dGVkTGlzdC5wdXNoKGRlc3RGaWxlKTtcbiAgICBsb2cuaW5mbygnd3JpdGUgZmlsZScsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZGVzdEZpbGUpKTtcbiAgICAvLyBUeXBlc2NyaXB0J3Mgd3JpdGVGaWxlKCkgZnVuY3Rpb24gcGVyZm9ybXMgd2VpcmQgd2l0aCBzeW1saW5rcyB1bmRlciB3YXRjaCBtb2RlIGluIFdpbmRvd3M6XG4gICAgLy8gRXZlcnkgdGltZSBhIHRzIGZpbGUgaXMgY2hhbmdlZCwgaXQgdHJpZ2dlcnMgdGhlIHN5bWxpbmsgYmVpbmcgY29tcGlsZWQgYW5kIHRvIGJlIHdyaXR0ZW4gd2hpY2ggaXNcbiAgICAvLyBhcyBleHBlY3RlZCBieSBtZSxcbiAgICAvLyBidXQgbGF0ZSBvbiBpdCB0cmlnZ2VycyB0aGUgc2FtZSByZWFsIGZpbGUgYWxzbyBiZWluZyB3cml0dGVuIGltbWVkaWF0ZWx5LCB0aGlzIGlzIG5vdCB3aGF0IEkgZXhwZWN0LFxuICAgIC8vIGFuZCBpdCBkb2VzIG5vdCBhY3R1YWxseSB3cml0ZSBvdXQgYW55IGNoYW5nZXMgdG8gZmluYWwgSlMgZmlsZS5cbiAgICAvLyBTbyBJIGRlY2lkZSB0byB1c2Ugb3JpZ2luYWwgTm9kZS5qcyBmaWxlIHN5c3RlbSBBUElcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShkZXN0RmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZGVzdEZpbGUsIGRhdGEpO1xuICAgIC8vIEl0IHNlZW1zIFR5cGVzY3JpcHQgY29tcGlsZXIgYWx3YXlzIHVzZXMgc2xhc2ggaW5zdGVhZCBvZiBiYWNrIHNsYXNoIGluIGZpbGUgcGF0aCwgZXZlbiBpbiBXaW5kb3dzXG4gICAgLy8gcmV0dXJuIF93cml0ZUZpbGUuY2FsbCh0aGlzLCBkZXN0RmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyksIC4uLkFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuICBob3N0LndyaXRlRmlsZSA9IHdyaXRlRmlsZTtcblxuICAvLyBjb25zdCBfZ2V0U291cmNlRmlsZSA9IGhvc3QuZ2V0U291cmNlRmlsZTtcbiAgLy8gY29uc3QgZ2V0U291cmNlRmlsZTogdHlwZW9mIF9nZXRTb3VyY2VGaWxlID0gZnVuY3Rpb24oZmlsZU5hbWUpIHtcbiAgLy8gICAvLyBjb25zb2xlLmxvZygnZ2V0U291cmNlRmlsZScsIGZpbGVOYW1lKTtcbiAgLy8gICByZXR1cm4gX2dldFNvdXJjZUZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgLy8gfTtcbiAgLy8gaG9zdC5nZXRTb3VyY2VGaWxlID0gZ2V0U291cmNlRmlsZTtcbiAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xufVxuXG5mdW5jdGlvbiBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5XYXRjaENvbXBpbGVySG9zdE9mRmlsZXNBbmRDb21waWxlck9wdGlvbnM8X3RzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0+IHwgX3RzLkNvbXBpbGVySG9zdCkge1xuICBjb25zdCByZWFkRmlsZSA9IGhvc3QucmVhZEZpbGU7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGhvc3QucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyBhcyBhbnkpIDtcbiAgICBpZiAoY29udGVudCAmJiAhcGF0aC5lbmRzV2l0aCgnLmQudHMnKSAmJiAhcGF0aC5lbmRzV2l0aCgnLmpzb24nKSkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ1dhdGNoQ29tcGlsZXJIb3N0LnJlYWRGaWxlJywgcGF0aCk7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gd2ViSW5qZWN0b3IuaW5qZWN0VG9GaWxlKHBhdGgsIGNvbnRlbnQpO1xuICAgICAgaWYgKGNoYW5nZWQgIT09IGNvbnRlbnQpIHtcbiAgICAgICAgbG9nLmluZm8oUGF0aC5yZWxhdGl2ZShjd2QsIHBhdGgpICsgJyBpcyBwYXRjaGVkJyk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudDtcbiAgfTtcbn1cblxuLy8gQ3VzdG9tZXIgVHJhbnNmb3JtZXIgc29sdXRpb24gaXMgbm90IGZlYXNpYmxlOiBpbiBzb21lIGNhc2UgbGlrZSBhIFdhdGNoQ29tcGlsZXIsIGl0IHRocm93cyBlcnJvciBsaWtlXG4vLyBcImNhbiBub3QgcmVmZXJlbmNlICcuZmxhZ3MnIG9mIHVuZGVmaW5lZFwiIHdoZW4gYSBjdXN0b21lciB0cmFuc2Zvcm1lciByZXR1cm4gYSBuZXdseSBjcmVhdGVkIFNvdXJjZUZpbGVcblxuLy8gZXhwb3J0IGZ1bmN0aW9uIG92ZXJyaWRlVHNQcm9ncmFtRW1pdEZuKGVtaXQ6IHRzLlByb2dyYW1bJ2VtaXQnXSk6IHRzLlByb2dyYW1bJ2VtaXQnXSB7XG4vLyAgIC8vIFRPRE86IGFsbG93IGFkZGluZyB0cmFuc2Zvcm1lclxuLy8gICBmdW5jdGlvbiBoYWNrZWRFbWl0KC4uLmFyZ3M6IFBhcmFtZXRlcnM8dHMuUHJvZ3JhbVsnZW1pdCddPikge1xuLy8gICAgIGxldCBbLCwsLHRyYW5zZm9ybWVyc10gPSBhcmdzO1xuLy8gICAgIC8vIGxvZy5pbmZvKCdlbWl0Jywgc3JjPy5maWxlTmFtZSk7XG4vLyAgICAgaWYgKHRyYW5zZm9ybWVycyA9PSBudWxsKSB7XG4vLyAgICAgICB0cmFuc2Zvcm1lcnMgPSB7fSBhcyB0cy5DdXN0b21UcmFuc2Zvcm1lcnM7XG4vLyAgICAgICBhcmdzWzRdID0gdHJhbnNmb3JtZXJzO1xuLy8gICAgIH1cbi8vICAgICBpZiAodHJhbnNmb3JtZXJzLmJlZm9yZSA9PSBudWxsKVxuLy8gICAgICAgdHJhbnNmb3JtZXJzLmJlZm9yZSA9IFtdO1xuLy8gICAgIHRyYW5zZm9ybWVycy5iZWZvcmUucHVzaChjdHggPT4gKHtcbi8vICAgICAgIHRyYW5zZm9ybVNvdXJjZUZpbGUoc3JjKSB7XG4vLyAgICAgICAgIGxvZy5kZWJ1ZygndHJhbnNmb3JtU291cmNlRmlsZScsIHNyYy5maWxlTmFtZSk7XG4vLyAgICAgICAgIHJldHVybiBzcmM7XG4vLyAgICAgICB9LFxuLy8gICAgICAgdHJhbnNmb3JtQnVuZGxlKG5vZGUpIHtyZXR1cm4gbm9kZTt9XG4vLyAgICAgfSkpO1xuLy8gICAgIC8vIGNvbnNvbGUubG9nKHJlcXVpcmUoJ3V0aWwnKS5pbnNwZWN0KGFyZ3NbNF0pKTtcbi8vICAgICByZXR1cm4gZW1pdC5hcHBseSh0aGlzLCBhcmdzKTtcbi8vICAgfTtcbi8vICAgcmV0dXJuIGhhY2tlZEVtaXQ7XG4vLyB9XG5cbmZ1bmN0aW9uIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCB0czogdHlwZW9mIF90cyA9IF90cykge1xuICBsZXQgZmlsZUluZm8gPSAnJztcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSkge1xuICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgIGNvbnN0IHJlYWxGaWxlID0gcmVhbFBhdGhPZihkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWUsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCB0cnVlKSB8fCBkaWFnbm9zdGljLmZpbGUuZmlsZU5hbWU7XG4gICAgZmlsZUluZm8gPSBgJHtyZWFsRmlsZX0sIGxpbmU6ICR7bGluZSArIDF9LCBjb2x1bW46ICR7Y2hhcmFjdGVyICsgMX1gO1xuICB9XG4gIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKGBFcnJvciAke2RpYWdub3N0aWMuY29kZX0gJHtmaWxlSW5mb30gOmApLCB0cy5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KCBkaWFnbm9zdGljLm1lc3NhZ2VUZXh0LCBmb3JtYXRIb3N0LmdldE5ld0xpbmUoKSkpO1xufVxuXG5mdW5jdGlvbiByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQoZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMsIHRzOiB0eXBlb2YgX3RzID0gX3RzKSB7XG4gIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWMoZGlhZ25vc3RpYywgZm9ybWF0SG9zdCkpKTtcbn1cblxuY29uc3QgQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFID0gbmV3IFNldChbJ2Jhc2VVcmwnLCAndHlwZVJvb3RzJywgJ3BhdGhzJywgJ3Jvb3REaXInXSk7XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIG9wdHM/OiBUc2NDbWRQYXJhbSwgdHM6IHR5cGVvZiBfdHMgPSBfdHMpIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ3VycmVudCBkaXJlY3RvcnkgXCIke3BsaW5rRW52LndvcmtEaXJ9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG9wdHM/Lm1lcmdlVHNjb25maWcpIHtcbiAgICBjb25zdCBqc29uID0gbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG9wdHMubWVyZ2VUc2NvbmZpZywgcHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zKTtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhqc29uLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmICghQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFLmhhcyhrZXkpKSB7XG4gICAgICAgIGNvbXBpbGVyT3B0aW9uc1trZXldID0gdmFsdWU7XG4gICAgICAgIGxvZy5kZWJ1ZygnbWVyZ2UgY29tcGlsZXIgb3B0aW9ucycsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIGFwcGVuZFR5cGVSb290cyhbXSwgY3dkLCBjb21waWxlck9wdGlvbnMsIHt9KTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHBsaW5rRW52LndvcmtEaXIsXG4gICAgcmVhbFBhY2thZ2VQYXRoczogZmFsc2VcbiAgfSk7XG5cbiAgaWYgKG9wdHM/LnBhdGhzSnNvbnMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRzLnBhdGhzSnNvbnMpKSB7XG4gICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSBvcHRzLnBhdGhzSnNvbnMucmVkdWNlKChwYXRoTWFwLCBqc29uU3RyKSA9PiB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocGF0aE1hcCwgSlNPTi5wYXJzZShqc29uU3RyKSk7XG4gICAgICAgIHJldHVybiBwYXRoTWFwO1xuICAgICAgfSwgY29tcGlsZXJPcHRpb25zLnBhdGhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmFzc2lnbihjb21waWxlck9wdGlvbnMucGF0aHMsIG9wdHMucGF0aHNKc29ucyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdHM/LmNvbXBpbGVyT3B0aW9ucykge1xuICAgIGZvciAoY29uc3QgW3Byb3AsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRzLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmIChwcm9wID09PSAnYmFzZVVybCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gJ3BhdGhzJykge1xuICAgICAgICBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzKVxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxlck9wdGlvbnNbcHJvcF0gPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHJlYWwgcGF0aCBvZiB0YXJnZXRpbmcgZmlsZSwgcmV0dXJuIG51bGwgaWYgdGFyZ2V0aW5nIGZpbGUgaXMgbm90IGluIG91ciBjb21waWxpYXRpb24gc2NvcGVcbiAqIEBwYXJhbSBmaWxlTmFtZSBcbiAqIEBwYXJhbSBjb21tb25Sb290RGlyIFxuICogQHBhcmFtIHBhY2thZ2VEaXJUcmVlIFxuICovXG5mdW5jdGlvbiByZWFsUGF0aE9mKGZpbGVOYW1lOiBzdHJpbmcsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBpc1NyY0ZpbGUgPSBmYWxzZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGVOYW1lKTtcbiAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICBjb25zdCBmb3VuZFBrZ0luZm8gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKTtcbiAgaWYgKGZvdW5kUGtnSW5mbyA9PSBudWxsKSB7XG4gICAgLy8gdGhpcyBmaWxlIGlzIG5vdCBwYXJ0IG9mIHNvdXJjZSBwYWNrYWdlLlxuICAgIC8vIGxvZy5pbmZvKCdOb3QgcGFydCBvZiBlbnRyeSBmaWxlcycsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3JjRGlyLCBkZXN0RGlyLCBwa2dEaXIsIGlzb21EaXIsIHN5bWxpbmtEaXJ9ID0gZm91bmRQa2dJbmZvO1xuXG4gIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShzeW1saW5rRGlyLCBfb3JpZ2luUGF0aCk7XG5cbiAgaWYgKHNyY0RpciA9PT0gJy4nIHx8IHNyY0Rpci5sZW5ndGggPT09IDApIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoc3JjRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2Uoc3JjRGlyLmxlbmd0aCArIDEpKTtcbiAgfSBlbHNlIGlmIChpc29tRGlyICYmIHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChpc29tRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzb21EaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UoaXNvbURpci5sZW5ndGggKyAxKSk7XG4gIH1cbiAgcmV0dXJuIGZpbGVOYW1lO1xufVxuIl19