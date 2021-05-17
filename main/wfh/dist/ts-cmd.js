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
// tslint:disable: max-line-length
const chalk_1 = __importDefault(require("chalk"));
const packageUtils = __importStar(require("./package-utils"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const path_1 = __importStar(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const misc_1 = require("./utils/misc");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_mgr_1 = require("./package-mgr");
const log4js_1 = __importDefault(require("log4js"));
const glob_1 = __importDefault(require("glob"));
const ts_cmd_util_1 = require("./ts-cmd-util");
const injector_factory_1 = require("./injector-factory");
const { symlinkDirName, rootDir: root } = misc_1.plinkEnv;
const log = log4js_1.default.getLogger('plink.ts-cmd');
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv /*, onCompiled?: (emitted: EmitList) => void*/) {
    const compGlobs = [];
    const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
    const baseTsconfigFile = require.resolve('../tsconfig-base.json');
    const baseTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
    if (baseTsconfig.error) {
        console.error(baseTsconfig.error);
        throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile);
    }
    let baseCompilerOptions = baseTsconfig.config.compilerOptions;
    if (argv.jsx) {
        const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
        const tsxTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile2, fs.readFileSync(baseTsconfigFile2, 'utf8'));
        if (tsxTsconfig.error) {
            console.error(tsxTsconfig.error);
            throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile2);
        }
        baseCompilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), tsxTsconfig.config.compilerOptions);
    }
    // const promCompile = Promise.resolve( [] as EmitList);
    const packageDirTree = new dir_tree_1.DirTree();
    const commonRootDir = misc_1.plinkEnv.workDir;
    let countPkg = 0;
    if (argv.package && argv.package.length > 0)
        packageUtils.findAllPackages(argv.package, onComponent, 'src');
    else if (argv.project && argv.project.length > 0) {
        packageUtils.findAllPackages(onComponent, 'src', argv.project);
    }
    else {
        for (const pkg of packageUtils.packages4Workspace(misc_1.plinkEnv.workDir, false)) {
            onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath);
        }
    }
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
    setupCompilerOptionsWithPackages(compilerOptions, argv);
    log.info('typescript compilerOptions:', compilerOptions);
    /** set compGlobs */
    function onComponent(name, _packagePath, _parsedName, json, realPath) {
        countPkg++;
        const tscCfg = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
            argv.overridePackgeDirs[name] : misc_1.getTscConfigOfPkg(json);
        // For workaround https://github.com/microsoft/TypeScript/issues/37960
        // Use a symlink path instead of a real path, so that Typescript compiler will not
        // recognize them as from somewhere with "node_modules", the symlink must be reside
        // in directory which does not contain "node_modules" as part of absolute path.
        const symlinkDir = path_1.resolve(misc_1.plinkEnv.workDir, symlinkDirName, name);
        compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: realPath, symlinkDir }));
        // if (tscCfg.globs) {
        //   compGlobs.push(...tscCfg.globs.map(file => resolve(symlinkDir, file).replace(/\\/g, '/')));
        //   return;
        // }
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
                    ` ${[tscCfg.srcDir, tscCfg.isomDir].filter(item => item != null)}`);
            }
        }
        if (tscCfg.include) {
            tscCfg.include = [].concat(tscCfg.include);
        }
        if (tscCfg.include && tscCfg.include.length > 0) {
            compGlobs.push(...tscCfg.include.map(pattern => path_1.resolve(symlinkDir, pattern).replace(/\\/g, '/')));
        }
        else {
            srcDirs.forEach(srcDir => {
                const relPath = path_1.resolve(symlinkDir, srcDir).replace(/\\/g, '/');
                compGlobs.push(relPath + '/**/*.ts');
                if (argv.jsx) {
                    compGlobs.push(relPath + '/**/*.tsx');
                }
            });
        }
    }
    if (argv.watch) {
        log.info('Watch mode');
        watch(compGlobs, compilerOptions, commonRootDir, packageDirTree);
        return [];
        // watch(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed, argv.jsx, onCompiled);
    }
    else {
        const emitted = compile(compGlobs, compilerOptions, commonRootDir, packageDirTree);
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
function watch(globPatterns, jsonCompilerOpt, commonRootDir, packageDirTree) {
    const rootFiles = _.flatten(globPatterns.map(pattern => glob_1.default.sync(pattern).filter(file => !file.endsWith('.d.ts'))));
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree);
    }
    const programHost = typescript_1.default.createWatchCompilerHost(rootFiles, compilerOptions, typescript_1.default.sys, typescript_1.default.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, reportWatchStatusChanged);
    patchWatchCompilerHost(programHost);
    const origCreateProgram = programHost.createProgram;
    // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
    programHost.createProgram = function (rootNames, options, host) {
        if (host && host._overrided == null) {
            patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
        }
        const program = origCreateProgram.apply(this, arguments);
        return program;
    };
    typescript_1.default.createWatchProgram(programHost);
}
function compile(globPatterns, jsonCompilerOpt, commonRootDir, packageDirTree) {
    const rootFiles = _.flatten(globPatterns.map(pattern => glob_1.default.sync(pattern, { cwd: misc_1.plinkEnv.workDir }).filter(file => !file.endsWith('.d.ts'))));
    // log.info('rootFiles:\n', rootFiles.join('\n'));
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, misc_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    const host = typescript_1.default.createCompilerHost(compilerOptions);
    patchWatchCompilerHost(host);
    const emitted = patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
    const program = typescript_1.default.createProgram(rootFiles, compilerOptions, host);
    const emitResult = program.emit();
    const allDiagnostics = typescript_1.default.getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    function _reportDiagnostic(diagnostic) {
        return reportDiagnostic(diagnostic, commonRootDir, packageDirTree);
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
function patchCompilerHost(host, commonRootDir, packageDirTree, co) {
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
        if (!path.endsWith('.d.ts') && !path.endsWith('.json')) {
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
function reportDiagnostic(diagnostic, commonRootDir, packageDirTree) {
    let fileInfo = '';
    if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
        fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
    }
    console.error(chalk_1.default.red(`Error ${diagnostic.code} ${fileInfo} :`), typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()));
}
function reportWatchStatusChanged(diagnostic) {
    console.info(chalk_1.default.cyan(typescript_1.default.formatDiagnostic(diagnostic, formatHost)));
}
const COMPILER_OPTIONS_MERGE_EXCLUDE = new Set(['baseUrl', 'typeRoots', 'paths', 'rootDir']);
function setupCompilerOptionsWithPackages(compilerOptions, opts) {
    const cwd = misc_1.plinkEnv.workDir;
    let wsKey = package_mgr_1.workspaceKey(cwd);
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error(`Current directory "${cwd}" is not a work space`);
    }
    if (opts === null || opts === void 0 ? void 0 : opts.mergeTsconfig) {
        const json = ts_cmd_util_1.mergeBaseUrlAndPaths(typescript_1.default, opts.mergeTsconfig, cwd, compilerOptions);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLDhEQUFnRDtBQUNoRCw2Q0FBK0I7QUFDL0IsMENBQTRCO0FBQzVCLDZDQUF3RDtBQUN4RCw0REFBNEI7QUFDNUIsdUNBQXdFO0FBRXhFLDJFQUEwSDtBQUMxSCw2REFBdUQ7QUFDdkQsK0NBQXFEO0FBQ3JELG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsK0NBQW1EO0FBQ25ELHlEQUErQztBQUkvQyxNQUFNLEVBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFDakQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUEyQjdDOzs7Ozs7R0FNRztBQUNILFNBQWdCLEdBQUcsQ0FBQyxJQUFpQixDQUFBLDhDQUE4QztJQUNqRixNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsTUFBTSxXQUFXLEdBQWdDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFDbEgsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDbEUsTUFBTSxZQUFZLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDL0csSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztLQUNqRTtJQUVELElBQUks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QUcsV0FBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQy9GO1NBQU0sSUFBSSxPQUFPLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFBRyxDQUFDLEVBQUU7UUFDN0QsUUFBUSxHQUFHLFdBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoLCB7cmVzb2x2ZSwgam9pbiwgcmVsYXRpdmUsIHNlcH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnLCBQYWNrYWdlVHNEaXJzLCBwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBDb21waWxlck9wdGlvbnMgYXMgUmVxdWlyZWRDb21waWxlck9wdGlvbnN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge21lcmdlQmFzZVVybEFuZFBhdGhzfSBmcm9tICcuL3RzLWNtZC11dGlsJztcbmltcG9ydCB7d2ViSW5qZWN0b3J9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG4vLyBpbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5leHBvcnQge1JlcXVpcmVkQ29tcGlsZXJPcHRpb25zfTtcblxuY29uc3Qge3N5bWxpbmtEaXJOYW1lLCByb290RGlyOiByb290fSA9IHBsaW5rRW52O1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsudHMtY21kJyk7XG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIC8qKiBtZXJnZSBjb21waWxlck9wdGlvbnMgXCJiYXNlVXJsXCIgYW5kIFwicGF0aHNcIiBmcm9tIHNwZWNpZmllZCB0c2NvbmZpZyBmaWxlICovXG4gIG1lcmdlVHNjb25maWc/OiBzdHJpbmc7XG4gIC8qKiBKU09OIHN0cmluZywgdG8gYmUgbWVyZ2VkIHRvIGNvbXBpbGVyT3B0aW9ucyBcInBhdGhzXCIsXG4gICAqIGJlIGF3YXJlIHRoYXQgXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBcImJhc2VVcmxcIiB3aGljaCBpcyByZWxhdGl2ZSB0byBgUGxpbmtFbnYud29ya0RpcmBcbiAgICogKi9cbiAgcGF0aHNKc29ucz86IEFycmF5PHN0cmluZz4gfCB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgLyoqXG4gICAqIFBhcnRpYWwgY29tcGlsZXIgb3B0aW9ucyB0byBiZSBtZXJnZWQsIGV4Y2VwdCBcImJhc2VVcmxcIi5cbiAgICogXCJwYXRoc1wiIHNob3VsZCBiZSByZWxhdGl2ZSB0byBgUGxpbmtFbnYud29ya0RpcmBcbiAgICovXG4gIGNvbXBpbGVyT3B0aW9ucz86IGFueTtcbiAgb3ZlcnJpZGVQYWNrZ2VEaXJzPzoge1twa2dOYW1lOiBzdHJpbmddOiBQYWNrYWdlVHNEaXJzfTtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VEaXJJbmZvIGV4dGVuZHMgUGFja2FnZVRzRGlycyB7XG4gIHBrZ0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c2MoYXJndjogVHNjQ21kUGFyYW0vKiwgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCovKTogc3RyaW5nW10ge1xuICBjb25zdCBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBQYWNrYWdlRGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgY29uc3QgYmFzZVRzY29uZmlnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSk7XG4gIGlmIChiYXNlVHNjb25maWcuZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGJhc2VUc2NvbmZpZy5lcnJvcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgdHNjb25maWcgZmlsZTogJyArIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICB9XG5cbiAgbGV0IGJhc2VDb21waWxlck9wdGlvbnMgPSBiYXNlVHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcblxuICBpZiAoYXJndi5qc3gpIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlMiA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKTtcbiAgICBjb25zdCB0c3hUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZTIsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlMiwgJ3V0ZjgnKSk7XG4gICAgaWYgKHRzeFRzY29uZmlnLmVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHRzeFRzY29uZmlnLmVycm9yKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IHRzY29uZmlnIGZpbGU6ICcgKyBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgfVxuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSB7Li4uYmFzZUNvbXBpbGVyT3B0aW9ucywgLi4udHN4VHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9uc307XG4gIH1cblxuICAvLyBjb25zdCBwcm9tQ29tcGlsZSA9IFByb21pc2UucmVzb2x2ZSggW10gYXMgRW1pdExpc3QpO1xuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VEaXJJbmZvPigpO1xuICBjb25zdCBjb21tb25Sb290RGlyID0gcGxpbmtFbnYud29ya0RpcjtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHBsaW5rRW52LndvcmtEaXIsIGZhbHNlKSkge1xuICAgICAgb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLnN5bWxpbmtEaXIpO1xuICAgIGxvZy5kZWJ1ZygndHJlZVBhdGgnLCB0cmVlUGF0aCk7XG4gICAgcGFja2FnZURpclRyZWUucHV0RGF0YSh0cmVlUGF0aCwgaW5mbyk7XG4gIH1cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzb3VyY2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG5cbiAgY29uc3QgZGVzdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VDb21waWxlck9wdGlvbnMsXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgIT09ICdpbmxpbmUnLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuXG4gIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9ucywgYXJndik7XG5cbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgLyoqIHNldCBjb21wR2xvYnMgKi9cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBfcGFja2FnZVBhdGg6IHN0cmluZywgX3BhcnNlZE5hbWU6IGFueSwganNvbjogYW55LCByZWFsUGF0aDogc3RyaW5nKSB7XG4gICAgY291bnRQa2crKztcbiAgICBjb25zdCB0c2NDZmc6IFBhY2thZ2VUc0RpcnMgPSBhcmd2Lm92ZXJyaWRlUGFja2dlRGlycyAmJiBfLmhhcyhhcmd2Lm92ZXJyaWRlUGFja2dlRGlycywgbmFtZSkgP1xuICAgICAgYXJndi5vdmVycmlkZVBhY2tnZURpcnNbbmFtZV0gOiBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICAvLyBGb3Igd29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM3OTYwXG4gICAgLy8gVXNlIGEgc3ltbGluayBwYXRoIGluc3RlYWQgb2YgYSByZWFsIHBhdGgsIHNvIHRoYXQgVHlwZXNjcmlwdCBjb21waWxlciB3aWxsIG5vdFxuICAgIC8vIHJlY29nbml6ZSB0aGVtIGFzIGZyb20gc29tZXdoZXJlIHdpdGggXCJub2RlX21vZHVsZXNcIiwgdGhlIHN5bWxpbmsgbXVzdCBiZSByZXNpZGVcbiAgICAvLyBpbiBkaXJlY3Rvcnkgd2hpY2ggZG9lcyBub3QgY29udGFpbiBcIm5vZGVfbW9kdWxlc1wiIGFzIHBhcnQgb2YgYWJzb2x1dGUgcGF0aC5cbiAgICBjb25zdCBzeW1saW5rRGlyID0gcmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgbmFtZSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGgsIHN5bWxpbmtEaXJ9KTtcblxuICAgIC8vIGlmICh0c2NDZmcuZ2xvYnMpIHtcbiAgICAvLyAgIGNvbXBHbG9icy5wdXNoKC4uLnRzY0NmZy5nbG9icy5tYXAoZmlsZSA9PiByZXNvbHZlKHN5bWxpbmtEaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpO1xuICAgIC8vICAgcmV0dXJuO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IHNyY0RpcnMgPSBbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgaWYgKHNyY0RpciA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihzeW1saW5rRGlyLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoc3JjRGlycy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzeW1saW5rRGlyKSkge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIGRpcmVjdG9yeSAke2NoYWxrLnJlZChzeW1saW5rRGlyKX0sYCArXG4gICAgICAgIGAgaXQgaXMgcG9zc2libGUgdGhhdCBwYWNrYWdlICR7bmFtZX0gaXMgeWV0IG5vdCBhZGRlZCB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlJ3MgcGFja2FnZS5qc29uIGZpbGUsYCArXG4gICAgICAgICcgY3VycmVudCB3b3JrdHJlZSBzcGFjZSBpcyBub3Qgc3luY2VkIHlldCwgdHJ5IFwic3luY1wiL1wiaW5pdFwiIGNvbW1hbmQgcGxlYXNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4aXN0aW5nIHRzIHNvdXJjZSBkaXJlY3RvcnkgZm91bmQgZm9yIHBhY2thZ2UgJHtjaGFsay5yZWQobmFtZSl9OmAgK1xuICAgICAgICAgIGAgJHtbdHNjQ2ZnLnNyY0RpciwgdHNjQ2ZnLmlzb21EaXJdLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCl9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRzY0NmZy5pbmNsdWRlKSB7XG4gICAgICB0c2NDZmcuaW5jbHVkZSA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHRzY0NmZy5pbmNsdWRlKTtcbiAgICB9XG4gICAgaWYgKHRzY0NmZy5pbmNsdWRlICYmIHRzY0NmZy5pbmNsdWRlLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbXBHbG9icy5wdXNoKC4uLih0c2NDZmcuaW5jbHVkZSBhcyBzdHJpbmdbXSkubWFwKHBhdHRlcm4gPT4gcmVzb2x2ZShzeW1saW5rRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJykpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSByZXNvbHZlKHN5bWxpbmtEaXIsIHNyY0RpciEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgd2F0Y2goY29tcEdsb2JzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICByZXR1cm4gW107XG4gICAgLy8gd2F0Y2goY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkLCBhcmd2LmpzeCwgb25Db21waWxlZCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW1pdHRlZCA9IGNvbXBpbGUoY29tcEdsb2JzLCBjb21waWxlck9wdGlvbnMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAvLyBwcm9tQ29tcGlsZSA9IGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBhcmd2LmVkKTtcbiAgfVxufVxuXG5jb25zdCBmb3JtYXRIb3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gIGdldENhbm9uaWNhbEZpbGVOYW1lOiBwYXRoID0+IHBhdGgsXG4gIGdldEN1cnJlbnREaXJlY3Rvcnk6IHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gd2F0Y2goZ2xvYlBhdHRlcm5zOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+KSB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBfLmZsYXR0ZW4oXG4gICAgZ2xvYlBhdHRlcm5zLm1hcChwYXR0ZXJuID0+IGdsb2Iuc3luYyhwYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkpXG4gICk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcblxuICBmdW5jdGlvbiBfcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSB7XG4gICAgcmV0dXJuIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYywgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICB9XG4gIGNvbnN0IHByb2dyYW1Ib3N0ID0gdHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Qocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIHRzLnN5cyxcbiAgICB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLCBfcmVwb3J0RGlhZ25vc3RpYywgcmVwb3J0V2F0Y2hTdGF0dXNDaGFuZ2VkKTtcbiAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChwcm9ncmFtSG9zdCk7XG5cbiAgY29uc3Qgb3JpZ0NyZWF0ZVByb2dyYW0gPSBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtO1xuICAvLyBUcydzIGNyZWF0ZVdhdGNoUHJvZ3JhbSB3aWxsIGNhbGwgV2F0Y2hDb21waWxlckhvc3QuY3JlYXRlUHJvZ3JhbSgpLCB0aGlzIGlzIHdoZXJlIHdlIHBhdGNoIFwiQ29tcGlsZXJIb3N0XCJcbiAgcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10gfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBob3N0PzogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgaWYgKGhvc3QgJiYgKGhvc3QgYXMgYW55KS5fb3ZlcnJpZGVkID09IG51bGwpIHtcbiAgICAgIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlLCBjb21waWxlck9wdGlvbnMpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtOiBSZXR1cm5UeXBlPHR5cGVvZiBvcmlnQ3JlYXRlUHJvZ3JhbT4gPSBvcmlnQ3JlYXRlUHJvZ3JhbS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9O1xuXG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUoZ2xvYlBhdHRlcm5zOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+KSB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBfLmZsYXR0ZW4oXG4gICAgZ2xvYlBhdHRlcm5zLm1hcChwYXR0ZXJuID0+IGdsb2Iuc3luYyhwYXR0ZXJuLCB7Y3dkOiBwbGlua0Vudi53b3JrRGlyfSkuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZW5kc1dpdGgoJy5kLnRzJykpKVxuICApO1xuICAvLyBsb2cuaW5mbygncm9vdEZpbGVzOlxcbicsIHJvb3RGaWxlcy5qb2luKCdcXG4nKSk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cyxcbiAgICBwbGlua0Vudi53b3JrRGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3QpO1xuICBjb25zdCBlbWl0dGVkID0gcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCBob3N0KTtcbiAgY29uc3QgZW1pdFJlc3VsdCA9IHByb2dyYW0uZW1pdCgpO1xuICBjb25zdCBhbGxEaWFnbm9zdGljcyA9IHRzLmdldFByZUVtaXREaWFnbm9zdGljcyhwcm9ncmFtKVxuICAgIC5jb25jYXQoZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG5cbiAgZnVuY3Rpb24gX3JlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYykge1xuICAgIHJldHVybiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgfVxuICBhbGxEaWFnbm9zdGljcy5mb3JFYWNoKGRpYWdub3N0aWMgPT4ge1xuICAgIF9yZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWMpO1xuICB9KTtcbiAgaWYgKGVtaXRSZXN1bHQuZW1pdFNraXBwZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBpbGUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGVtaXR0ZWQ7XG59XG5cbi8qKiBPdmVycmlkaW5nIFdyaXRlRmlsZSgpICovXG5mdW5jdGlvbiBwYXRjaENvbXBpbGVySG9zdChob3N0OiB0cy5Db21waWxlckhvc3QsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBjbzogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nW10ge1xuICBjb25zdCBlbWl0dGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgLy8gSXQgc2VlbXMgdG8gbm90IGFibGUgdG8gd3JpdGUgZmlsZSB0aHJvdWdoIHN5bWxpbmsgaW4gV2luZG93c1xuICAvLyBjb25zdCBfd3JpdGVGaWxlID0gaG9zdC53cml0ZUZpbGU7XG4gIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPSBmdW5jdGlvbihmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcykge1xuICAgIGNvbnN0IGRlc3RGaWxlID0gcmVhbFBhdGhPZihmaWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICAgIGlmIChkZXN0RmlsZSA9PSBudWxsKSB7XG4gICAgICBsb2cuZGVidWcoJ3NraXAnLCBmaWxlTmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGVtaXR0ZWRMaXN0LnB1c2goZGVzdEZpbGUpO1xuICAgIGxvZy5pbmZvKCd3cml0ZSBmaWxlJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBkZXN0RmlsZSkpO1xuICAgIC8vIFR5cGVzY3JpcHQncyB3cml0ZUZpbGUoKSBmdW5jdGlvbiBwZXJmb3JtcyB3ZWlyZCB3aXRoIHN5bWxpbmtzIHVuZGVyIHdhdGNoIG1vZGUgaW4gV2luZG93czpcbiAgICAvLyBFdmVyeSB0aW1lIGEgdHMgZmlsZSBpcyBjaGFuZ2VkLCBpdCB0cmlnZ2VycyB0aGUgc3ltbGluayBiZWluZyBjb21waWxlZCBhbmQgdG8gYmUgd3JpdHRlbiB3aGljaCBpc1xuICAgIC8vIGFzIGV4cGVjdGVkIGJ5IG1lLFxuICAgIC8vIGJ1dCBsYXRlIG9uIGl0IHRyaWdnZXJzIHRoZSBzYW1lIHJlYWwgZmlsZSBhbHNvIGJlaW5nIHdyaXR0ZW4gaW1tZWRpYXRlbHksIHRoaXMgaXMgbm90IHdoYXQgSSBleHBlY3QsXG4gICAgLy8gYW5kIGl0IGRvZXMgbm90IGFjdHVhbGx5IHdyaXRlIG91dCBhbnkgY2hhbmdlcyB0byBmaW5hbCBKUyBmaWxlLlxuICAgIC8vIFNvIEkgZGVjaWRlIHRvIHVzZSBvcmlnaW5hbCBOb2RlLmpzIGZpbGUgc3lzdGVtIEFQSVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGRlc3RGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhkZXN0RmlsZSwgZGF0YSk7XG4gICAgLy8gSXQgc2VlbXMgVHlwZXNjcmlwdCBjb21waWxlciBhbHdheXMgdXNlcyBzbGFzaCBpbnN0ZWFkIG9mIGJhY2sgc2xhc2ggaW4gZmlsZSBwYXRoLCBldmVuIGluIFdpbmRvd3NcbiAgICAvLyByZXR1cm4gX3dyaXRlRmlsZS5jYWxsKHRoaXMsIGRlc3RGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG4gIGhvc3Qud3JpdGVGaWxlID0gd3JpdGVGaWxlO1xuXG4gIC8vIGNvbnN0IF9nZXRTb3VyY2VGaWxlID0gaG9zdC5nZXRTb3VyY2VGaWxlO1xuICAvLyBjb25zdCBnZXRTb3VyY2VGaWxlOiB0eXBlb2YgX2dldFNvdXJjZUZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZSkge1xuICAvLyAgIC8vIGNvbnNvbGUubG9nKCdnZXRTb3VyY2VGaWxlJywgZmlsZU5hbWUpO1xuICAvLyAgIHJldHVybiBfZ2V0U291cmNlRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAvLyB9O1xuICAvLyBob3N0LmdldFNvdXJjZUZpbGUgPSBnZXRTb3VyY2VGaWxlO1xuICByZXR1cm4gZW1pdHRlZExpc3Q7XG59XG5cbmZ1bmN0aW9uIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdDogdHMuV2F0Y2hDb21waWxlckhvc3RPZkZpbGVzQW5kQ29tcGlsZXJPcHRpb25zPHRzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0+IHwgdHMuQ29tcGlsZXJIb3N0KSB7XG4gIGNvbnN0IHJlYWRGaWxlID0gaG9zdC5yZWFkRmlsZTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoIXBhdGguZW5kc1dpdGgoJy5kLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5qc29uJykpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdXYXRjaENvbXBpbGVySG9zdC5yZWFkRmlsZScsIHBhdGgpO1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHdlYkluamVjdG9yLmluamVjdFRvRmlsZShwYXRoLCBjb250ZW50KTtcbiAgICAgIGlmIChjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4gICAgICAgIGxvZy5pbmZvKFBhdGgucmVsYXRpdmUoY3dkLCBwYXRoKSArICcgaXMgcGF0Y2hlZCcpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH07XG59XG5cbi8vIEN1c3RvbWVyIFRyYW5zZm9ybWVyIHNvbHV0aW9uIGlzIG5vdCBmZWFzaWJsZTogaW4gc29tZSBjYXNlIGxpa2UgYSBXYXRjaENvbXBpbGVyLCBpdCB0aHJvd3MgZXJyb3IgbGlrZVxuLy8gXCJjYW4gbm90IHJlZmVyZW5jZSAnLmZsYWdzJyBvZiB1bmRlZmluZWRcIiB3aGVuIGEgY3VzdG9tZXIgdHJhbnNmb3JtZXIgcmV0dXJuIGEgbmV3bHkgY3JlYXRlZCBTb3VyY2VGaWxlXG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBvdmVycmlkZVRzUHJvZ3JhbUVtaXRGbihlbWl0OiB0cy5Qcm9ncmFtWydlbWl0J10pOiB0cy5Qcm9ncmFtWydlbWl0J10ge1xuLy8gICAvLyBUT0RPOiBhbGxvdyBhZGRpbmcgdHJhbnNmb3JtZXJcbi8vICAgZnVuY3Rpb24gaGFja2VkRW1pdCguLi5hcmdzOiBQYXJhbWV0ZXJzPHRzLlByb2dyYW1bJ2VtaXQnXT4pIHtcbi8vICAgICBsZXQgWywsLCx0cmFuc2Zvcm1lcnNdID0gYXJncztcbi8vICAgICAvLyBsb2cuaW5mbygnZW1pdCcsIHNyYz8uZmlsZU5hbWUpO1xuLy8gICAgIGlmICh0cmFuc2Zvcm1lcnMgPT0gbnVsbCkge1xuLy8gICAgICAgdHJhbnNmb3JtZXJzID0ge30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xuLy8gICAgICAgYXJnc1s0XSA9IHRyYW5zZm9ybWVycztcbi8vICAgICB9XG4vLyAgICAgaWYgKHRyYW5zZm9ybWVycy5iZWZvcmUgPT0gbnVsbClcbi8vICAgICAgIHRyYW5zZm9ybWVycy5iZWZvcmUgPSBbXTtcbi8vICAgICB0cmFuc2Zvcm1lcnMuYmVmb3JlLnB1c2goY3R4ID0+ICh7XG4vLyAgICAgICB0cmFuc2Zvcm1Tb3VyY2VGaWxlKHNyYykge1xuLy8gICAgICAgICBsb2cuZGVidWcoJ3RyYW5zZm9ybVNvdXJjZUZpbGUnLCBzcmMuZmlsZU5hbWUpO1xuLy8gICAgICAgICByZXR1cm4gc3JjO1xuLy8gICAgICAgfSxcbi8vICAgICAgIHRyYW5zZm9ybUJ1bmRsZShub2RlKSB7cmV0dXJuIG5vZGU7fVxuLy8gICAgIH0pKTtcbi8vICAgICAvLyBjb25zb2xlLmxvZyhyZXF1aXJlKCd1dGlsJykuaW5zcGVjdChhcmdzWzRdKSk7XG4vLyAgICAgcmV0dXJuIGVtaXQuYXBwbHkodGhpcywgYXJncyk7XG4vLyAgIH07XG4vLyAgIHJldHVybiBoYWNrZWRFbWl0O1xuLy8gfVxuXG5mdW5jdGlvbiByZXBvcnREaWFnbm9zdGljKGRpYWdub3N0aWM6IHRzLkRpYWdub3N0aWMsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+KSB7XG4gIGxldCBmaWxlSW5mbyA9ICcnO1xuICBpZiAoZGlhZ25vc3RpYy5maWxlKSB7XG4gICAgY29uc3QgeyBsaW5lLCBjaGFyYWN0ZXIgfSA9IGRpYWdub3N0aWMuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihkaWFnbm9zdGljLnN0YXJ0ISk7XG4gICAgY29uc3QgcmVhbEZpbGUgPSByZWFsUGF0aE9mKGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZSwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIHRydWUpIHx8IGRpYWdub3N0aWMuZmlsZS5maWxlTmFtZTtcbiAgICBmaWxlSW5mbyA9IGAke3JlYWxGaWxlfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4gIH1cbiAgY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSB7XG4gIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWMoZGlhZ25vc3RpYywgZm9ybWF0SG9zdCkpKTtcbn1cblxuY29uc3QgQ09NUElMRVJfT1BUSU9OU19NRVJHRV9FWENMVURFID0gbmV3IFNldChbJ2Jhc2VVcmwnLCAndHlwZVJvb3RzJywgJ3BhdGhzJywgJ3Jvb3REaXInXSk7XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIG9wdHM/OiBUc2NDbWRQYXJhbSkge1xuICBjb25zdCBjd2QgPSBwbGlua0Vudi53b3JrRGlyO1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkoY3dkKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEN1cnJlbnQgZGlyZWN0b3J5IFwiJHtjd2R9XCIgaXMgbm90IGEgd29yayBzcGFjZWApO1xuICB9XG5cbiAgaWYgKG9wdHM/Lm1lcmdlVHNjb25maWcpIHtcbiAgICBjb25zdCBqc29uID0gbWVyZ2VCYXNlVXJsQW5kUGF0aHModHMsIG9wdHMubWVyZ2VUc2NvbmZpZywgY3dkLCBjb21waWxlck9wdGlvbnMpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGpzb24uY29tcGlsZXJPcHRpb25zKSkge1xuICAgICAgaWYgKCFDT01QSUxFUl9PUFRJT05TX01FUkdFX0VYQ0xVREUuaGFzKGtleSkpIHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgbG9nLmRlYnVnKCdtZXJnZSBjb21waWxlciBvcHRpb25zJywga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKGN3ZCwgJy4vJywgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogcmVzb2x2ZShyb290LCB3c0tleSlcbiAgfSk7XG5cbiAgaWYgKG9wdHM/LnBhdGhzSnNvbnMpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRzLnBhdGhzSnNvbnMpKSB7XG4gICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSBvcHRzLnBhdGhzSnNvbnMucmVkdWNlKChwYXRoTWFwLCBqc29uU3RyKSA9PiB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocGF0aE1hcCwgSlNPTi5wYXJzZShqc29uU3RyKSk7XG4gICAgICAgIHJldHVybiBwYXRoTWFwO1xuICAgICAgfSwgY29tcGlsZXJPcHRpb25zLnBhdGhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmFzc2lnbihjb21waWxlck9wdGlvbnMucGF0aHMsIG9wdHMucGF0aHNKc29ucyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdHM/LmNvbXBpbGVyT3B0aW9ucykge1xuICAgIGZvciAoY29uc3QgW3Byb3AsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvcHRzLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmIChwcm9wID09PSAnYmFzZVVybCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocHJvcCA9PT0gJ3BhdGhzJykge1xuICAgICAgICBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzKVxuICAgICAgICAgIE9iamVjdC5hc3NpZ24oY29tcGlsZXJPcHRpb25zLnBhdGhzLCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb21waWxlck9wdGlvbnMucGF0aHMgPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxlck9wdGlvbnNbcHJvcF0gPSB2YWx1ZSBhcyBhbnk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHJlYWwgcGF0aCBvZiB0YXJnZXRpbmcgZmlsZSwgcmV0dXJuIG51bGwgaWYgdGFyZ2V0aW5nIGZpbGUgaXMgbm90IGluIG91ciBjb21waWxpYXRpb24gc2NvcGVcbiAqIEBwYXJhbSBmaWxlTmFtZSBcbiAqIEBwYXJhbSBjb21tb25Sb290RGlyIFxuICogQHBhcmFtIHBhY2thZ2VEaXJUcmVlIFxuICovXG5mdW5jdGlvbiByZWFsUGF0aE9mKGZpbGVOYW1lOiBzdHJpbmcsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8UGFja2FnZURpckluZm8+LCBpc1NyY0ZpbGUgPSBmYWxzZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGVOYW1lKTtcbiAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICBjb25zdCBmb3VuZFBrZ0luZm8gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKTtcbiAgaWYgKGZvdW5kUGtnSW5mbyA9PSBudWxsKSB7XG4gICAgLy8gdGhpcyBmaWxlIGlzIG5vdCBwYXJ0IG9mIHNvdXJjZSBwYWNrYWdlLlxuICAgIC8vIGxvZy5pbmZvKCdOb3QgcGFydCBvZiBlbnRyeSBmaWxlcycsIGZpbGVOYW1lKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3JjRGlyLCBkZXN0RGlyLCBwa2dEaXIsIGlzb21EaXIsIHN5bWxpbmtEaXJ9ID0gZm91bmRQa2dJbmZvO1xuXG4gIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShzeW1saW5rRGlyLCBfb3JpZ2luUGF0aCk7XG5cbiAgaWYgKHNyY0RpciA9PT0gJy4nIHx8IHNyY0Rpci5sZW5ndGggPT09IDApIHtcbiAgICBmaWxlTmFtZSA9IGpvaW4ocGtnRGlyLCBpc1NyY0ZpbGUgPyBzcmNEaXIgOiBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgoc3JjRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzU3JjRmlsZSA/IHNyY0RpciA6IGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2Uoc3JjRGlyLmxlbmd0aCArIDEpKTtcbiAgfSBlbHNlIGlmIChpc29tRGlyICYmIHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChpc29tRGlyICsgc2VwKSkge1xuICAgIGZpbGVOYW1lID0gam9pbihwa2dEaXIsIGlzb21EaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UoaXNvbURpci5sZW5ndGggKyAxKSk7XG4gIH1cbiAgcmV0dXJuIGZpbGVOYW1lO1xufVxuIl19