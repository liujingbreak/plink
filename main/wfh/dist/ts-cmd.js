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
// const gulpTs = require('gulp-typescript');
const chalk_1 = __importDefault(require("chalk"));
/// <reference path="types.d.ts" />
const packageUtils = __importStar(require("./package-utils"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const path_1 = require("path");
const typescript_1 = __importDefault(require("typescript"));
// import File from 'vinyl';
const misc_1 = require("./utils/misc");
const config_1 = __importDefault(require("./config"));
const config_handler_1 = require("./config-handler");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_mgr_1 = require("./package-mgr");
const log4js_1 = __importDefault(require("log4js"));
// import * as sourcemaps from 'gulp-sourcemaps';
const glob_1 = __importDefault(require("glob"));
// const gulp = require('gulp');
// const through = require('through2');
// const chokidar = require('chokidar');
// const merge = require('merge2');
const log = log4js_1.default.getLogger('wfh.typescript');
const root = config_1.default().rootPath;
// type EmitList = Array<[string, number]>;
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv /*, onCompiled?: (emitted: EmitList) => void*/) {
    // const possibleSrcDirs = ['isom', 'ts'];
    const compGlobs = [];
    // var compStream = [];
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
    let countPkg = 0;
    if (argv.package && argv.package.length > 0)
        packageUtils.findAllPackages(argv.package, onComponent, 'src');
    else if (argv.project && argv.project.length > 0) {
        packageUtils.findAllPackages(onComponent, 'src', argv.project);
    }
    else {
        for (const pkg of packageUtils.packages4Workspace(process.cwd(), false)) {
            onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath);
        }
    }
    if (countPkg === 0) {
        throw new Error('No available srouce package found in current workspace');
    }
    const commonRootDir = misc_1.closestCommonParentDir(Array.from(compDirInfo.values()).map(el => el.pkgDir));
    for (const info of compDirInfo.values()) {
        const treePath = path_1.relative(commonRootDir, info.pkgDir);
        packageDirTree.putData(treePath, info);
    }
    const destDir = commonRootDir.replace(/\\/g, '/');
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { 
        // typescript: require('typescript'),
        // Compiler options
        importHelpers: false, declaration: true, 
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: destDir, rootDir: destDir, skipLibCheck: true, inlineSourceMap: argv.sourceMap === 'inline', sourceMap: argv.sourceMap !== 'inline', inlineSources: argv.sourceMap === 'inline', emitDeclarationOnly: argv.ed });
    setupCompilerOptionsWithPackages(compilerOptions, argv.pathsJsons);
    log.info('typescript compilerOptions:', compilerOptions);
    // const tsProject = gulpTs.createProject({...compilerOptions, typescript: require('typescript')});
    function onComponent(name, packagePath, _parsedName, json, realPath) {
        countPkg++;
        const tscCfg = misc_1.getTscConfigOfPkg(json);
        compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: realPath }));
        if (tscCfg.globs) {
            compGlobs.push(...tscCfg.globs.map(file => path_1.resolve(realPath, file).replace(/\\/g, '/')));
            return;
        }
        const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
            if (srcDir == null)
                return false;
            try {
                return fs.statSync(path_1.join(realPath, srcDir)).isDirectory();
            }
            catch (e) {
                return false;
            }
        });
        if (tscCfg.include) {
            tscCfg.include = [].concat(tscCfg.include);
        }
        if (tscCfg.include && tscCfg.include.length > 0) {
            for (const pattern of tscCfg.include) {
                const includePath = path_1.resolve(realPath, pattern).replace(/\\/g, '/');
                compGlobs.push(includePath);
            }
        }
        else {
            srcDirs.forEach(srcDir => {
                const relPath = path_1.resolve(realPath, srcDir).replace(/\\/g, '/');
                compGlobs.push(relPath + '/**/*.ts');
                if (argv.jsx) {
                    compGlobs.push(relPath + '/**/*.tsx');
                }
            });
        }
    }
    // return promCompile.then((list) => {
    //   if (argv.watch !== true && process.send) {
    //     process.send('plink-tsc compiled');
    //   }
    //   return list;
    // });
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
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    const programHost = typescript_1.default.createWatchCompilerHost(rootFiles, compilerOptions, typescript_1.default.sys, typescript_1.default.createEmitAndSemanticDiagnosticsBuilderProgram, reportDiagnostic, reportWatchStatusChanged);
    const origCreateProgram = programHost.createProgram;
    programHost.createProgram = function (rootNames, options, host) {
        if (host) {
            overrideCompilerHost(host, commonRootDir, packageDirTree);
        }
        return origCreateProgram.apply(this, arguments);
    };
    typescript_1.default.createWatchProgram(programHost);
}
function compile(globPatterns, jsonCompilerOpt, commonRootDir, packageDirTree) {
    const rootFiles = _.flatten(globPatterns.map(pattern => glob_1.default.sync(pattern).filter(file => !file.endsWith('.d.ts'))));
    // console.log(rootFiles);
    const compilerOptions = typescript_1.default.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt }, typescript_1.default.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    const host = typescript_1.default.createCompilerHost(compilerOptions);
    const emitted = overrideCompilerHost(host, commonRootDir, packageDirTree);
    const program = typescript_1.default.createProgram(rootFiles, compilerOptions, host);
    const emitResult = program.emit();
    const allDiagnostics = typescript_1.default.getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    allDiagnostics.forEach(diagnostic => {
        reportDiagnostic(diagnostic);
    });
    if (emitResult.emitSkipped) {
        throw new Error('Compile failed');
    }
    return emitted;
}
function overrideCompilerHost(host, commonRootDir, packageDirTree) {
    const emittedList = [];
    const _writeFile = host.writeFile;
    const writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
        const treePath = path_1.relative(commonRootDir, fileName);
        const _originPath = fileName; // absolute path
        const { srcDir, destDir, pkgDir: dir } = packageDirTree.getAllData(treePath).pop();
        const pathWithinPkg = path_1.relative(dir, _originPath);
        const prefix = srcDir;
        if (prefix === '.' || prefix.length === 0) {
            fileName = path_1.join(dir, destDir, pathWithinPkg);
        }
        else if (pathWithinPkg.startsWith(prefix + path_1.sep)) {
            fileName = path_1.join(dir, destDir, pathWithinPkg.slice(prefix.length + 1));
        }
        // const displaySize = Math.round((file.contents as Buffer).byteLength / 1024 * 10) / 10;
        // log.info('%s %s Kb', displayPath, chalk.blueBright(displaySize + ''));
        emittedList.push(fileName);
        // tslint:disable-next-line: no-console
        console.log('write file', fileName);
        // await fs.mkdirp(dirname(file.path));
        // await fs.promises.writeFile(file.path, file.contents as Buffer);
        // It seems Typescript compiler always uses slash instead of back slash in file path, even in Windows
        return _writeFile.call(this, fileName.replace(/\\/g, '/'), ...Array.prototype.slice.call(arguments, 1));
    };
    host.writeFile = writeFile;
    const _getSourceFile = host.getSourceFile;
    const getSourceFile = function (fileName) {
        // console.log('getSourceFile', fileName);
        return _getSourceFile.apply(this, arguments);
    };
    host.getSourceFile = getSourceFile;
    return emittedList;
}
function reportDiagnostic(diagnostic) {
    let fileInfo = '';
    if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        fileInfo = `${diagnostic.file.fileName}, line: ${line + 1}, column: ${character + 1}`;
    }
    console.error(chalk_1.default.red(`Error ${diagnostic.code} ${fileInfo} :`), typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()));
}
function reportWatchStatusChanged(diagnostic) {
    console.info(chalk_1.default.cyan(typescript_1.default.formatDiagnostic(diagnostic, formatHost)));
}
// async function compile(compGlobs: string[], tsProject: any, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>, emitTdsOnly = false) {
//   // const gulpBase = root + SEP;
//   const startTime = new Date().getTime();
//   function printDuration(isError: boolean) {
//     const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
//     const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
//     log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
//   }
//   const compileErrors: string[] = [];
//   log.info('tsc compiles: ', compGlobs.join(', '));
//   const tsResult = gulp.src(compGlobs)
//   .pipe(sourcemaps.init())
//   .pipe(tsProject())
//   .on('error', (err: Error) => {
//     compileErrors.push(err.message);
//   });
//   // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
//   // which is outputed
//   const streams: any[] = [];
//   const jsStream = tsResult.js
//     .pipe(changePath(commonRootDir, packageDirTree))
//     .pipe(sourcemaps.write('.', {includeContent: true})); // source map output is problematic, which mess with directories
//   streams.push(jsStream);
//   streams.push(tsResult.dts.pipe(changePath(commonRootDir, packageDirTree)));
//   const emittedList = [] as EmitList;
//   const all = merge(streams)
//   .pipe(through.obj(async function(file: File, en: string, next: (...arg: any[]) => void) {
//     if (file.path.endsWith('.map')) {
//       next(null);
//       return;
//     }
//     // if (emitTdsOnly && !file.path.endsWith('.d.ts'))
//     //   return next();
//     const displayPath = file.path;
//     const displaySize = Math.round((file.contents as Buffer).byteLength / 1024 * 10) / 10;
//     log.info('%s %s Kb', displayPath, chalk.blueBright(displaySize + ''));
//     emittedList.push([displayPath, displaySize]);
//     await fs.mkdirp(dirname(file.path));
//     await fs.promises.writeFile(file.path, file.contents as Buffer);
//     next(null, file);
//   }))
//   .resume();
//   // .pipe(gulp.dest(commonRootDir));
//   try {
//     await new Promise<EmitList>((resolve, reject) => {
//       all.on('end', () => {
//         if (compileErrors.length > 0) {
//           log.error('\n---------- Failed to compile Typescript files, check out below error message -------------\n');
//           compileErrors.forEach(msg => log.error(msg));
//           return reject(new Error('Failed to compile Typescript files'));
//         }
//         resolve(emittedList);
//       });
//       all.on('error', reject);
//       all.resume();
//     });
//     return emittedList;
//   } finally {
//     printDuration(false);
//   }
// }
// function watch(compGlobs: string[], tsProject: any, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>,
//   emitTdsOnly = false, hasTsx = false, onCompiled?: (emitted: EmitList) => void) {
//   const compileFiles: string[] = [];
//   let promCompile = Promise.resolve( [] as EmitList);
//   const delayCompile = _.debounce((globs: string[]) => {
//     const globsCopy = globs.slice(0, globs.length);
//     globs.splice(0);
//     promCompile = promCompile.catch(() => [] as EmitList)
//       .then(() => compile(globsCopy, tsProject, commonRootDir, packageDirTree, emitTdsOnly))
//       .catch(() => [] as EmitList);
//     if (onCompiled)
//       promCompile = promCompile.then(emitted => {
//         onCompiled(emitted);
//         return emitted;
//       });
//   }, 200);
//   const watcher = chokidar.watch(compGlobs, {ignored: /(\.d\.ts|\.js)$/ });
//   watcher.on('add', (path: string) => onChangeFile(path, 'added'));
//   watcher.on('change', (path: string) => onChangeFile(path, 'changed'));
//   watcher.on('unlink', (path: string) => onChangeFile(path, 'removed'));
//   function onChangeFile(path: string, reason: string) {
//     if (reason !== 'removed')
//       compileFiles.push(path);
//     log.info(`File ${chalk.cyan(relative(root, path))} has been ` + chalk.yellow(reason));
//     delayCompile(compileFiles);
//   }
// }
// function changePath(commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>) {
//   return through.obj(function(file: File, en: string, next: (...arg: any[]) => void) {
//     const treePath = relative(commonRootDir, file.path);
//     const _originPath = file.path; // absolute path
//     const {srcDir, destDir, pkgDir: dir} = packageDirTree.getAllData(treePath).pop()!;
//     // const absFile = resolve(commonRootDir, treePath);
//     const pathWithinPkg = relative(dir, _originPath);
//     // console.log(dir, tsDirs);
//     const prefix = srcDir;
//     // for (const prefix of [tsDirs.srcDir, tsDirs.isomDir]) {
//     if (prefix === '.' || prefix.length === 0) {
//       file.path = join(dir, destDir, pathWithinPkg);
//       // break;
//     } else if (pathWithinPkg.startsWith(prefix + sep)) {
//       file.path = join(dir, destDir, pathWithinPkg.slice(prefix.length + 1));
//       // break;
//     }
//     // }
//     // console.log('pathWithinPkg', pathWithinPkg);
//     // console.log('file.path', file.path);
//     file.base = commonRootDir;
//     // console.log('file.base', file.base);
//     // console.log('file.relative', file.relative);
//     next(null, file);
//   });
// }
function setupCompilerOptionsWithPackages(compilerOptions, pathsJsons) {
    const cwd = process.cwd();
    let wsKey = package_mgr_1.workspaceKey(cwd);
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    // if (compilerOptions.paths == null)
    //   compilerOptions.paths = {};
    // for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    //   const realDir = relative(cwd, realPath).replace(/\\/g, '/');
    //   compilerOptions.paths[name] = [realDir];
    //   compilerOptions.paths[name + '/*'] = [realDir + '/*'];
    // }
    config_handler_1.setTsCompilerOptForNodePath(cwd, './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
    });
    pathsJsons.reduce((pathMap, jsonStr) => {
        return Object.assign(Object.assign({}, pathMap), JSON.parse(jsonStr));
    }, compilerOptions.paths);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixtQ0FBbUM7QUFDbkMsOERBQWdEO0FBQ2hELDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsK0JBQWtEO0FBQ2xELDREQUE0QjtBQUM1Qiw0QkFBNEI7QUFDNUIsdUNBQXNGO0FBRXRGLHNEQUE4QjtBQUM5QixxREFBeUc7QUFDekcsNkRBQXVEO0FBQ3ZELCtDQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsaURBQWlEO0FBQ2pELGdEQUF3QjtBQUV4QixnQ0FBZ0M7QUFDaEMsdUNBQXVDO0FBQ3ZDLHdDQUF3QztBQUN4QyxtQ0FBbUM7QUFFbkMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMvQyxNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBa0IvQiwyQ0FBMkM7QUFFM0M7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQWlCLENBQUEsOENBQThDO0lBQ2pGLDBDQUEwQztJQUMxQyxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsdUJBQXVCO0lBQ3ZCLE1BQU0sV0FBVyxHQUFrQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO0lBQ3BILE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sWUFBWSxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQy9HLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRTtRQUN0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LGVBQWUsRUFBRTtRQUN0RCxlQUFlLEVBQUUsSUFBSTtRQUNyQixZQUFZLEVBQUUsY0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7S0FDbkMsQ0FBQyxDQUFDO0lBRUgsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNyQyx1Q0FBVyxPQUFPLEdBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUM5QyxDQUFDLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG4vLyBjb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidHlwZXMuZC50c1wiIC8+XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7cmVzb2x2ZSwgam9pbiwgcmVsYXRpdmUsIHNlcH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG4vLyBpbXBvcnQgRmlsZSBmcm9tICd2aW55bCc7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnLCBQYWNrYWdlVHNEaXJzLCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQgKiBhcyBzb3VyY2VtYXBzIGZyb20gJ2d1bHAtc291cmNlbWFwcyc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcblxuLy8gY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbi8vIGNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuLy8gY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuLy8gY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbmNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcblxuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIGluY2x1ZGU/OiBzdHJpbmdbXTtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIHBhdGhzSnNvbnM6IHN0cmluZ1tdO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xufVxuXG5pbnRlcmZhY2UgQ29tcG9uZW50RGlySW5mbyBleHRlbmRzIFBhY2thZ2VUc0RpcnMge1xuICBwa2dEaXI6IHN0cmluZztcbn1cblxuLy8gdHlwZSBFbWl0TGlzdCA9IEFycmF5PFtzdHJpbmcsIG51bWJlcl0+O1xuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IFRzY0NtZFBhcmFtLyosIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQqLyk6IHN0cmluZ1tdIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIGNvbnN0IGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xuICBpZiAoYmFzZVRzY29uZmlnLmVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihiYXNlVHNjb25maWcuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IHRzY29uZmlnIGZpbGU6ICcgKyBiYXNlVHNjb25maWdGaWxlKTtcbiAgfVxuXG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnM7XG5cbiAgaWYgKGFyZ3YuanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUyLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZTIsICd1dGY4JykpO1xuICAgIGlmICh0c3hUc2NvbmZpZy5lcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcih0c3hUc2NvbmZpZy5lcnJvcik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIH1cbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9XG5cbiAgLy8gY29uc3QgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxDb21wb25lbnREaXJJbmZvPigpO1xuXG4gIGxldCBjb3VudFBrZyA9IDA7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhhcmd2LnBhY2thZ2UsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnLCBhcmd2LnByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VVdGlscy5wYWNrYWdlczRXb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSwgZmFsc2UpKSB7XG4gICAgICBvbkNvbXBvbmVudChwa2cubmFtZSwgcGtnLnBhdGgsIG51bGwsIHBrZy5qc29uLCBwa2cucmVhbFBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNyb3VjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cbiAgY29uc3QgY29tbW9uUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShjb21wRGlySW5mby52YWx1ZXMoKSkubWFwKGVsID0+IGVsLnBrZ0RpcikpO1xuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8ucGtnRGlyKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuICBjb25zdCBkZXN0RGlyID0gY29tbW9uUm9vdERpci5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICAvLyB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogZGVzdERpcixcbiAgICByb290RGlyOiBkZXN0RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBzb3VyY2VNYXA6IGFyZ3Yuc291cmNlTWFwICE9PSAnaW5saW5lJyxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zLCBhcmd2LnBhdGhzSnNvbnMpO1xuXG4gIGxvZy5pbmZvKCd0eXBlc2NyaXB0IGNvbXBpbGVyT3B0aW9uczonLCBjb21waWxlck9wdGlvbnMpO1xuICAvLyBjb25zdCB0c1Byb2plY3QgPSBndWxwVHMuY3JlYXRlUHJvamVjdCh7Li4uY29tcGlsZXJPcHRpb25zLCB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0Jyl9KTtcblxuXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgcGFja2FnZVBhdGg6IHN0cmluZywgX3BhcnNlZE5hbWU6IGFueSwganNvbjogYW55LCByZWFsUGF0aDogc3RyaW5nKSB7XG4gICAgY291bnRQa2crKztcbiAgICBjb25zdCB0c2NDZmcgPSBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcblxuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7Li4udHNjQ2ZnLCBwa2dEaXI6IHJlYWxQYXRofSk7XG5cbiAgICBpZiAodHNjQ2ZnLmdsb2JzKSB7XG4gICAgICBjb21wR2xvYnMucHVzaCguLi50c2NDZmcuZ2xvYnMubWFwKGZpbGUgPT4gcmVzb2x2ZShyZWFsUGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc3JjRGlycyA9IFt0c2NDZmcuc3JjRGlyLCB0c2NDZmcuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHJlYWxQYXRoLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgIHRzY0NmZy5pbmNsdWRlID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQodHNjQ2ZnLmluY2x1ZGUpO1xuICAgIH1cbiAgICBpZiAodHNjQ2ZnLmluY2x1ZGUgJiYgdHNjQ2ZnLmluY2x1ZGUubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHRzY0NmZy5pbmNsdWRlKSB7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVQYXRoID0gcmVzb2x2ZShyZWFsUGF0aCwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb21wR2xvYnMucHVzaChpbmNsdWRlUGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShyZWFsUGF0aCwgc3JjRGlyISkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJldHVybiBwcm9tQ29tcGlsZS50aGVuKChsaXN0KSA9PiB7XG4gIC8vICAgaWYgKGFyZ3Yud2F0Y2ggIT09IHRydWUgJiYgcHJvY2Vzcy5zZW5kKSB7XG4gIC8vICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gbGlzdDtcbiAgLy8gfSk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIHdhdGNoKGNvbXBHbG9icywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgcmV0dXJuIFtdO1xuICAgIC8vIHdhdGNoKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCwgYXJndi5qc3gsIG9uQ29tcGlsZWQpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVtaXR0ZWQgPSBjb21waWxlKGNvbXBHbG9icywgY29tcGlsZXJPcHRpb25zLCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSk7XG4gICAgaWYgKHByb2Nlc3Muc2VuZClcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgLy8gcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCk7XG4gIH1cbn1cblxuY29uc3QgZm9ybWF0SG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogcGF0aCA9PiBwYXRoLFxuICBnZXRDdXJyZW50RGlyZWN0b3J5OiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgZ2V0TmV3TGluZTogKCkgPT4gdHMuc3lzLm5ld0xpbmVcbn07XG5cbmZ1bmN0aW9uIHdhdGNoKGdsb2JQYXR0ZXJuczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPENvbXBvbmVudERpckluZm8+KSB7XG4gIGNvbnN0IHJvb3RGaWxlczogc3RyaW5nW10gPSBfLmZsYXR0ZW4oXG4gICAgZ2xvYlBhdHRlcm5zLm1hcChwYXR0ZXJuID0+IGdsb2Iuc3luYyhwYXR0ZXJuKS5maWx0ZXIoZmlsZSA9PiAhZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkpXG4gICk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdH0sIHRzLnN5cywgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG4gIGNvbnN0IHByb2dyYW1Ib3N0ID0gdHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Qocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIHRzLnN5cywgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSxcbiAgICByZXBvcnREaWFnbm9zdGljLCByZXBvcnRXYXRjaFN0YXR1c0NoYW5nZWQpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10gfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBob3N0PzogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgaWYgKGhvc3QpIHtcbiAgICAgIG92ZXJyaWRlQ29tcGlsZXJIb3N0KGhvc3QsIGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdDcmVhdGVQcm9ncmFtLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUoZ2xvYlBhdHRlcm5zOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0OiBhbnksIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8Q29tcG9uZW50RGlySW5mbz4pIHtcbiAgY29uc3Qgcm9vdEZpbGVzOiBzdHJpbmdbXSA9IF8uZmxhdHRlbihcbiAgICBnbG9iUGF0dGVybnMubWFwKHBhdHRlcm4gPT4gZ2xvYi5zeW5jKHBhdHRlcm4pLmZpbHRlcihmaWxlID0+ICFmaWxlLmVuZHNXaXRoKCcuZC50cycpKSlcbiAgKTtcbiAgLy8gY29uc29sZS5sb2cocm9vdEZpbGVzKTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0fSwgdHMuc3lzLCBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChjb21waWxlck9wdGlvbnMpO1xuICBjb25zdCBlbWl0dGVkID0gb3ZlcnJpZGVDb21waWxlckhvc3QoaG9zdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpO1xuICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGVtaXRSZXN1bHQgPSBwcm9ncmFtLmVtaXQoKTtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3MgPSB0cy5nZXRQcmVFbWl0RGlhZ25vc3RpY3MocHJvZ3JhbSlcbiAgICAuY29uY2F0KGVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuXG4gIGFsbERpYWdub3N0aWNzLmZvckVhY2goZGlhZ25vc3RpYyA9PiB7XG4gICAgcmVwb3J0RGlhZ25vc3RpYyhkaWFnbm9zdGljKTtcbiAgfSk7XG4gIGlmIChlbWl0UmVzdWx0LmVtaXRTa2lwcGVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb21waWxlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBlbWl0dGVkO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZUNvbXBpbGVySG9zdChob3N0OiB0cy5Db21waWxlckhvc3QsIGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8Q29tcG9uZW50RGlySW5mbz4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGVtaXR0ZWRMaXN0OiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IF93cml0ZUZpbGUgPSBob3N0LndyaXRlRmlsZTtcbiAgY29uc3Qgd3JpdGVGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlTmFtZSk7XG4gICAgY29uc3QgX29yaWdpblBhdGggPSBmaWxlTmFtZTsgLy8gYWJzb2x1dGUgcGF0aFxuICAgIGNvbnN0IHtzcmNEaXIsIGRlc3REaXIsIHBrZ0RpcjogZGlyfSA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpITtcbiAgICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoZGlyLCBfb3JpZ2luUGF0aCk7XG4gICAgY29uc3QgcHJlZml4ID0gc3JjRGlyO1xuICAgIGlmIChwcmVmaXggPT09ICcuJyB8fCBwcmVmaXgubGVuZ3RoID09PSAwKSB7XG4gICAgICBmaWxlTmFtZSA9IGpvaW4oZGlyLCBkZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChwcmVmaXggKyBzZXApKSB7XG4gICAgICBmaWxlTmFtZSA9IGpvaW4oZGlyLCBkZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHByZWZpeC5sZW5ndGggKyAxKSk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGRpc3BsYXlTaXplID0gTWF0aC5yb3VuZCgoZmlsZS5jb250ZW50cyBhcyBCdWZmZXIpLmJ5dGVMZW5ndGggLyAxMDI0ICogMTApIC8gMTA7XG5cbiAgICAvLyBsb2cuaW5mbygnJXMgJXMgS2InLCBkaXNwbGF5UGF0aCwgY2hhbGsuYmx1ZUJyaWdodChkaXNwbGF5U2l6ZSArICcnKSk7XG4gICAgZW1pdHRlZExpc3QucHVzaChmaWxlTmFtZSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ3dyaXRlIGZpbGUnLCBmaWxlTmFtZSk7XG4gICAgLy8gYXdhaXQgZnMubWtkaXJwKGRpcm5hbWUoZmlsZS5wYXRoKSk7XG4gICAgLy8gYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cyBhcyBCdWZmZXIpO1xuXG4gICAgLy8gSXQgc2VlbXMgVHlwZXNjcmlwdCBjb21waWxlciBhbHdheXMgdXNlcyBzbGFzaCBpbnN0ZWFkIG9mIGJhY2sgc2xhc2ggaW4gZmlsZSBwYXRoLCBldmVuIGluIFdpbmRvd3NcbiAgICByZXR1cm4gX3dyaXRlRmlsZS5jYWxsKHRoaXMsIGZpbGVOYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZUZpbGU7XG4gIGNvbnN0IF9nZXRTb3VyY2VGaWxlID0gaG9zdC5nZXRTb3VyY2VGaWxlO1xuICBjb25zdCBnZXRTb3VyY2VGaWxlOiB0eXBlb2YgX2dldFNvdXJjZUZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZSkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdnZXRTb3VyY2VGaWxlJywgZmlsZU5hbWUpO1xuICAgIHJldHVybiBfZ2V0U291cmNlRmlsZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuICBob3N0LmdldFNvdXJjZUZpbGUgPSBnZXRTb3VyY2VGaWxlO1xuICByZXR1cm4gZW1pdHRlZExpc3Q7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydERpYWdub3N0aWMoZGlhZ25vc3RpYzogdHMuRGlhZ25vc3RpYykge1xuICBsZXQgZmlsZUluZm8gPSAnJztcbiAgaWYgKGRpYWdub3N0aWMuZmlsZSkge1xuICAgIGNvbnN0IHsgbGluZSwgY2hhcmFjdGVyIH0gPSBkaWFnbm9zdGljLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oZGlhZ25vc3RpYy5zdGFydCEpO1xuICAgIGZpbGVJbmZvID0gYCR7ZGlhZ25vc3RpYy5maWxlLmZpbGVOYW1lfSwgbGluZTogJHtsaW5lICsgMX0sIGNvbHVtbjogJHtjaGFyYWN0ZXIgKyAxfWA7XG4gIH1cbiAgY29uc29sZS5lcnJvcihjaGFsay5yZWQoYEVycm9yICR7ZGlhZ25vc3RpYy5jb2RlfSAke2ZpbGVJbmZvfSA6YCksIHRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoIGRpYWdub3N0aWMubWVzc2FnZVRleHQsIGZvcm1hdEhvc3QuZ2V0TmV3TGluZSgpKSk7XG59XG5cbmZ1bmN0aW9uIHJlcG9ydFdhdGNoU3RhdHVzQ2hhbmdlZChkaWFnbm9zdGljOiB0cy5EaWFnbm9zdGljKSB7XG4gIGNvbnNvbGUuaW5mbyhjaGFsay5jeWFuKHRzLmZvcm1hdERpYWdub3N0aWMoZGlhZ25vc3RpYywgZm9ybWF0SG9zdCkpKTtcbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gY29tcGlsZShjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxDb21wb25lbnREaXJJbmZvPiwgZW1pdFRkc09ubHkgPSBmYWxzZSkge1xuLy8gICAvLyBjb25zdCBndWxwQmFzZSA9IHJvb3QgKyBTRVA7XG4vLyAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4vLyAgIGZ1bmN0aW9uIHByaW50RHVyYXRpb24oaXNFcnJvcjogYm9vbGVhbikge1xuLy8gICAgIGNvbnN0IHNlYyA9IE1hdGguY2VpbCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4vLyAgICAgY29uc3QgbWluID0gYCR7TWF0aC5mbG9vcihzZWMgLyA2MCl9IG1pbnV0ZXMgJHtzZWMgJSA2MH0gc2VjZW5kc2A7XG4vLyAgICAgbG9nLmluZm8oYENvbXBpbGVkICR7aXNFcnJvciA/ICd3aXRoIGVycm9ycyAnIDogJyd9aW4gYCArIG1pbik7XG4vLyAgIH1cblxuXG4vLyAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4vLyAgIGxvZy5pbmZvKCd0c2MgY29tcGlsZXM6ICcsIGNvbXBHbG9icy5qb2luKCcsICcpKTtcbi8vICAgY29uc3QgdHNSZXN1bHQgPSBndWxwLnNyYyhjb21wR2xvYnMpXG4vLyAgIC5waXBlKHNvdXJjZW1hcHMuaW5pdCgpKVxuLy8gICAucGlwZSh0c1Byb2plY3QoKSlcbi8vICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4vLyAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbi8vICAgfSk7XG5cbi8vICAgLy8gTEo6IExldCdzIHRyeSB0byB1c2UgLS1zb3VyY2VNYXAgd2l0aCAtLWlubGluZVNvdXJjZSwgc28gdGhhdCBJIGRvbid0IG5lZWQgdG8gY2hhbmdlIGZpbGUgcGF0aCBpbiBzb3VyY2UgbWFwXG4vLyAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbi8vICAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbi8vICAgY29uc3QganNTdHJlYW0gPSB0c1Jlc3VsdC5qc1xuLy8gICAgIC5waXBlKGNoYW5nZVBhdGgoY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpKVxuLy8gICAgIC5waXBlKHNvdXJjZW1hcHMud3JpdGUoJy4nLCB7aW5jbHVkZUNvbnRlbnQ6IHRydWV9KSk7IC8vIHNvdXJjZSBtYXAgb3V0cHV0IGlzIHByb2JsZW1hdGljLCB3aGljaCBtZXNzIHdpdGggZGlyZWN0b3JpZXNcbi8vICAgc3RyZWFtcy5wdXNoKGpzU3RyZWFtKTtcbi8vICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmR0cy5waXBlKGNoYW5nZVBhdGgoY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpKSk7XG5cbi8vICAgY29uc3QgZW1pdHRlZExpc3QgPSBbXSBhcyBFbWl0TGlzdDtcbi8vICAgY29uc3QgYWxsID0gbWVyZ2Uoc3RyZWFtcylcbi8vICAgLnBpcGUodGhyb3VnaC5vYmooYXN5bmMgZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbi8vICAgICBpZiAoZmlsZS5wYXRoLmVuZHNXaXRoKCcubWFwJykpIHtcbi8vICAgICAgIG5leHQobnVsbCk7XG4vLyAgICAgICByZXR1cm47XG4vLyAgICAgfVxuLy8gICAgIC8vIGlmIChlbWl0VGRzT25seSAmJiAhZmlsZS5wYXRoLmVuZHNXaXRoKCcuZC50cycpKVxuLy8gICAgIC8vICAgcmV0dXJuIG5leHQoKTtcbi8vICAgICBjb25zdCBkaXNwbGF5UGF0aCA9IGZpbGUucGF0aDtcbi8vICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoKGZpbGUuY29udGVudHMgYXMgQnVmZmVyKS5ieXRlTGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4vLyAgICAgbG9nLmluZm8oJyVzICVzIEtiJywgZGlzcGxheVBhdGgsIGNoYWxrLmJsdWVCcmlnaHQoZGlzcGxheVNpemUgKyAnJykpO1xuLy8gICAgIGVtaXR0ZWRMaXN0LnB1c2goW2Rpc3BsYXlQYXRoLCBkaXNwbGF5U2l6ZV0pO1xuLy8gICAgIGF3YWl0IGZzLm1rZGlycChkaXJuYW1lKGZpbGUucGF0aCkpO1xuLy8gICAgIGF3YWl0IGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLnBhdGgsIGZpbGUuY29udGVudHMgYXMgQnVmZmVyKTtcbi8vICAgICBuZXh0KG51bGwsIGZpbGUpO1xuLy8gICB9KSlcbi8vICAgLnJlc3VtZSgpO1xuLy8gICAvLyAucGlwZShndWxwLmRlc3QoY29tbW9uUm9vdERpcikpO1xuXG4vLyAgIHRyeSB7XG4vLyAgICAgYXdhaXQgbmV3IFByb21pc2U8RW1pdExpc3Q+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbi8vICAgICAgIGFsbC5vbignZW5kJywgKCkgPT4ge1xuLy8gICAgICAgICBpZiAoY29tcGlsZUVycm9ycy5sZW5ndGggPiAwKSB7XG4vLyAgICAgICAgICAgbG9nLmVycm9yKCdcXG4tLS0tLS0tLS0tIEZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMsIGNoZWNrIG91dCBiZWxvdyBlcnJvciBtZXNzYWdlIC0tLS0tLS0tLS0tLS1cXG4nKTtcbi8vICAgICAgICAgICBjb21waWxlRXJyb3JzLmZvckVhY2gobXNnID0+IGxvZy5lcnJvcihtc2cpKTtcbi8vICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcycpKTtcbi8vICAgICAgICAgfVxuLy8gICAgICAgICByZXNvbHZlKGVtaXR0ZWRMaXN0KTtcbi8vICAgICAgIH0pO1xuLy8gICAgICAgYWxsLm9uKCdlcnJvcicsIHJlamVjdCk7XG4vLyAgICAgICBhbGwucmVzdW1lKCk7XG4vLyAgICAgfSk7XG4vLyAgICAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xuLy8gICB9IGZpbmFsbHkge1xuLy8gICAgIHByaW50RHVyYXRpb24oZmFsc2UpO1xuLy8gICB9XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIHdhdGNoKGNvbXBHbG9iczogc3RyaW5nW10sIHRzUHJvamVjdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPENvbXBvbmVudERpckluZm8+LFxuLy8gICBlbWl0VGRzT25seSA9IGZhbHNlLCBoYXNUc3ggPSBmYWxzZSwgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCkge1xuLy8gICBjb25zdCBjb21waWxlRmlsZXM6IHN0cmluZ1tdID0gW107XG4vLyAgIGxldCBwcm9tQ29tcGlsZSA9IFByb21pc2UucmVzb2x2ZSggW10gYXMgRW1pdExpc3QpO1xuXG4vLyAgIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoKGdsb2JzOiBzdHJpbmdbXSkgPT4ge1xuLy8gICAgIGNvbnN0IGdsb2JzQ29weSA9IGdsb2JzLnNsaWNlKDAsIGdsb2JzLmxlbmd0aCk7XG4vLyAgICAgZ2xvYnMuc3BsaWNlKDApO1xuLy8gICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpXG4vLyAgICAgICAudGhlbigoKSA9PiBjb21waWxlKGdsb2JzQ29weSwgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgZW1pdFRkc09ubHkpKVxuLy8gICAgICAgLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KTtcbi8vICAgICBpZiAob25Db21waWxlZClcbi8vICAgICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUudGhlbihlbWl0dGVkID0+IHtcbi8vICAgICAgICAgb25Db21waWxlZChlbWl0dGVkKTtcbi8vICAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4vLyAgICAgICB9KTtcbi8vICAgfSwgMjAwKTtcblxuLy8gICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2goY29tcEdsb2JzLCB7aWdub3JlZDogLyhcXC5kXFwudHN8XFwuanMpJC8gfSk7XG4vLyAgIHdhdGNoZXIub24oJ2FkZCcsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnYWRkZWQnKSk7XG4vLyAgIHdhdGNoZXIub24oJ2NoYW5nZScsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnY2hhbmdlZCcpKTtcbi8vICAgd2F0Y2hlci5vbigndW5saW5rJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdyZW1vdmVkJykpO1xuXG4vLyAgIGZ1bmN0aW9uIG9uQ2hhbmdlRmlsZShwYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKSB7XG4vLyAgICAgaWYgKHJlYXNvbiAhPT0gJ3JlbW92ZWQnKVxuLy8gICAgICAgY29tcGlsZUZpbGVzLnB1c2gocGF0aCk7XG4vLyAgICAgbG9nLmluZm8oYEZpbGUgJHtjaGFsay5jeWFuKHJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbi8vICAgICBkZWxheUNvbXBpbGUoY29tcGlsZUZpbGVzKTtcbi8vICAgfVxuLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGNoYW5nZVBhdGgoY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxDb21wb25lbnREaXJJbmZvPikge1xuLy8gICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcblxuLy8gICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgZmlsZS5wYXRoKTtcbi8vICAgICBjb25zdCBfb3JpZ2luUGF0aCA9IGZpbGUucGF0aDsgLy8gYWJzb2x1dGUgcGF0aFxuLy8gICAgIGNvbnN0IHtzcmNEaXIsIGRlc3REaXIsIHBrZ0RpcjogZGlyfSA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpITtcbi8vICAgICAvLyBjb25zdCBhYnNGaWxlID0gcmVzb2x2ZShjb21tb25Sb290RGlyLCB0cmVlUGF0aCk7XG4vLyAgICAgY29uc3QgcGF0aFdpdGhpblBrZyA9IHJlbGF0aXZlKGRpciwgX29yaWdpblBhdGgpO1xuLy8gICAgIC8vIGNvbnNvbGUubG9nKGRpciwgdHNEaXJzKTtcbi8vICAgICBjb25zdCBwcmVmaXggPSBzcmNEaXI7XG4vLyAgICAgLy8gZm9yIChjb25zdCBwcmVmaXggb2YgW3RzRGlycy5zcmNEaXIsIHRzRGlycy5pc29tRGlyXSkge1xuLy8gICAgIGlmIChwcmVmaXggPT09ICcuJyB8fCBwcmVmaXgubGVuZ3RoID09PSAwKSB7XG4vLyAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgZGVzdERpciwgcGF0aFdpdGhpblBrZyk7XG4vLyAgICAgICAvLyBicmVhaztcbi8vICAgICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChwcmVmaXggKyBzZXApKSB7XG4vLyAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShwcmVmaXgubGVuZ3RoICsgMSkpO1xuLy8gICAgICAgLy8gYnJlYWs7XG4vLyAgICAgfVxuLy8gICAgIC8vIH1cbi8vICAgICAvLyBjb25zb2xlLmxvZygncGF0aFdpdGhpblBrZycsIHBhdGhXaXRoaW5Qa2cpO1xuLy8gICAgIC8vIGNvbnNvbGUubG9nKCdmaWxlLnBhdGgnLCBmaWxlLnBhdGgpO1xuLy8gICAgIGZpbGUuYmFzZSA9IGNvbW1vblJvb3REaXI7XG4vLyAgICAgLy8gY29uc29sZS5sb2coJ2ZpbGUuYmFzZScsIGZpbGUuYmFzZSk7XG4vLyAgICAgLy8gY29uc29sZS5sb2coJ2ZpbGUucmVsYXRpdmUnLCBmaWxlLnJlbGF0aXZlKTtcbi8vICAgICBuZXh0KG51bGwsIGZpbGUpO1xuLy8gICB9KTtcbi8vIH1cblxuZnVuY3Rpb24gc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucywgcGF0aHNKc29uczogc3RyaW5nW10pIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KGN3ZCk7XG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpXG4gICAgd3NLZXkgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIHNwYWNlJyk7XG4gIH1cblxuICAvLyBpZiAoY29tcGlsZXJPcHRpb25zLnBhdGhzID09IG51bGwpXG4gIC8vICAgY29tcGlsZXJPcHRpb25zLnBhdGhzID0ge307XG5cbiAgLy8gZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgLy8gICBjb25zdCByZWFsRGlyID0gcmVsYXRpdmUoY3dkLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyAgIGNvbXBpbGVyT3B0aW9ucy5wYXRoc1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgLy8gICBjb21waWxlck9wdGlvbnMucGF0aHNbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgLy8gfVxuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoY3dkLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiByZXNvbHZlKHJvb3QsIHdzS2V5KVxuICB9KTtcblxuICBwYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgIHJldHVybiB7Li4ucGF0aE1hcCwgLi4uSlNPTi5wYXJzZShqc29uU3RyKX07XG4gIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG59XG4iXX0=