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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsc = void 0;
// tslint:disable: max-line-length
const gulpTs = require('gulp-typescript');
const chalk_1 = __importDefault(require("chalk"));
/// <reference path="types.d.ts" />
const packageUtils = __importStar(require("./package-utils"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const path_1 = require("path");
const typescript_1 = __importDefault(require("typescript"));
const misc_1 = require("./utils/misc");
const config_1 = __importDefault(require("./config"));
const config_handler_1 = require("./config-handler");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_mgr_1 = require("./package-mgr");
const log4js_1 = __importDefault(require("log4js"));
const sourcemaps = __importStar(require("gulp-sourcemaps"));
// import Path from 'path';
const gulp = require('gulp');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
// const sourcemaps = require('gulp-sourcemaps');
const log = log4js_1.default.getLogger('wfh.typescript');
// exports.init = init;
const root = config_1.default().rootPath;
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
function tsc(argv, onCompiled) {
    // const possibleSrcDirs = ['isom', 'ts'];
    var compGlobs = [];
    // var compStream = [];
    const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
    const baseTsconfigFile = argv.jsx ? require.resolve('../tsconfig-tsx.json') :
        require.resolve('../tsconfig-base.json');
    const baseTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
    if (baseTsconfig.error) {
        console.error(baseTsconfig.error);
        throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile);
    }
    let promCompile = Promise.resolve([]);
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
    const commonRootDir = misc_1.closestCommonParentDir(Array.from(compDirInfo.values()).map(el => el.dir));
    const destDir = commonRootDir.replace(/\\/g, '/');
    const compilerOptions = Object.assign(Object.assign({}, baseTsconfig.config.compilerOptions), { 
        // typescript: require('typescript'),
        // Compiler options
        importHelpers: false, 
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: destDir, rootDir: destDir, skipLibCheck: true, inlineSourceMap: argv.sourceMap === 'inline', sourceMap: true, inlineSources: argv.sourceMap === 'inline', emitDeclarationOnly: argv.ed });
    setupCompilerOptionsWithPackages(compilerOptions);
    const packageDirTree = new dir_tree_1.DirTree();
    for (const info of compDirInfo.values()) {
        const treePath = path_1.relative(commonRootDir, info.dir);
        packageDirTree.putData(treePath, info);
    }
    // console.log(packageDirTree.traverse());
    log.info('typescript compilerOptions:', compilerOptions);
    function onComponent(name, packagePath, _parsedName, json, realPath) {
        countPkg++;
        // const packagePath = resolve(root, 'node_modules', name);
        const dirs = misc_1.getTsDirsOfPackage(json);
        const srcDirs = [dirs.srcDir, dirs.isomDir].filter(srcDir => {
            try {
                return fs.statSync(path_1.join(realPath, srcDir)).isDirectory();
            }
            catch (e) {
                return false;
            }
        });
        compDirInfo.set(name, {
            tsDirs: dirs,
            dir: realPath
        });
        srcDirs.forEach(srcDir => {
            const relPath = path_1.resolve(realPath, srcDir).replace(/\\/g, '/');
            compGlobs.push(relPath + '/**/*.ts');
            if (argv.jsx) {
                compGlobs.push(relPath + '/**/*.tsx');
            }
        });
    }
    const tsProject = gulpTs.createProject(Object.assign(Object.assign({}, compilerOptions), { typescript: require('typescript') }));
    const delayCompile = _.debounce(() => {
        const toCompile = compGlobs;
        compGlobs = [];
        promCompile = promCompile.catch(() => [])
            .then(() => compile(toCompile, tsProject, argv.sourceMap === 'inline', argv.ed))
            .catch(() => []);
        if (onCompiled)
            promCompile = promCompile.then(emitted => {
                onCompiled(emitted);
                return emitted;
            });
    }, 200);
    if (argv.watch) {
        log.info('Watch mode');
        const watchDirs = [];
        compGlobs = [];
        for (const info of compDirInfo.values()) {
            [info.tsDirs.srcDir, info.tsDirs.isomDir].forEach(srcDir => {
                const relPath = path_1.join(info.dir, srcDir).replace(/\\/g, '/');
                watchDirs.push(relPath + '/**/*.ts');
                if (argv.jsx) {
                    watchDirs.push(relPath + '/**/*.tsx');
                }
            });
        }
        const watcher = chokidar.watch(watchDirs, { ignored: /(\.d\.ts|\.js)$/ });
        watcher.on('add', (path) => onChangeFile(path, 'added'));
        watcher.on('change', (path) => onChangeFile(path, 'changed'));
        watcher.on('unlink', (path) => onChangeFile(path, 'removed'));
    }
    else {
        promCompile = compile(compGlobs, tsProject, argv.sourceMap === 'inline', argv.ed);
    }
    function onChangeFile(path, reason) {
        if (reason !== 'removed')
            compGlobs.push(path);
        log.info(`File ${chalk_1.default.cyan(path_1.relative(root, path))} has been ` + chalk_1.default.yellow(reason));
        delayCompile();
    }
    function compile(compGlobs, tsProject, inlineSourceMap, emitTdsOnly = false) {
        // const gulpBase = root + SEP;
        const startTime = new Date().getTime();
        function printDuration(isError) {
            const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
            const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
            log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
        }
        return new Promise((resolve, reject) => {
            const compileErrors = [];
            const tsResult = gulp.src(compGlobs)
                .pipe(sourcemaps.init())
                .pipe(tsProject())
                .on('error', (err) => {
                compileErrors.push(err.message);
            });
            // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
            // which is outputed
            const streams = [];
            if (!emitTdsOnly) {
                streams.push(tsResult.js
                    .pipe(changePath())
                    // .pipe(changePath())
                    // .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: './'}))
                    .pipe(sourcemaps.write('.', { includeContent: true }))
                // .pipe(through.obj(function(file: any, en: string, next: (...arg: any[]) => void) {
                //   if (file.extname === '.map') {
                //     const sm = JSON.parse(file.contents.toString());
                //     let sFileDir;
                //     sm.sources =
                //       sm.sources.map( (spath: string) => {
                //         const realFile = fs.realpathSync(spath);
                //         sFileDir = Path.dirname(realFile);
                //         return relative(file.base, realFile).replace(/\\/g, '/');
                //       });
                //     if (sFileDir)
                //       sm.sourceRoot = relative(sFileDir, file.base).replace(/\\/g, '/');
                //     file.contents = Buffer.from(JSON.stringify(sm), 'utf8');
                //   }
                //   next(null, file);
                // }))
                );
            }
            streams.push(tsResult.dts.pipe(changePath()));
            const emittedList = [];
            const all = merge(streams)
                .pipe(through.obj(function (file, en, next) {
                const displayPath = path_1.relative(process.cwd(), file.path);
                const displaySize = Math.round(file.contents.byteLength / 1024 * 10) / 10;
                log.info('%s %s Kb', displayPath, chalk_1.default.blueBright(displaySize + ''));
                emittedList.push([displayPath, displaySize]);
                next(null, file);
            }))
                .pipe(gulp.dest(commonRootDir));
            all.on('end', () => {
                if (compileErrors.length > 0) {
                    /* tslint:disable no-console */
                    console.log('\n---------- Failed to compile Typescript files, check out below error message -------------\n');
                    compileErrors.forEach(msg => log.error(msg));
                    return reject(new Error('Failed to compile Typescript files'));
                }
                resolve(emittedList);
            });
            all.on('error', reject);
            all.resume();
        })
            .then(emittedList => {
            printDuration(false);
            return emittedList;
        })
            .catch(err => {
            printDuration(true);
            return Promise.reject(err);
        });
    }
    // const cwd = process.cwd();
    function changePath() {
        return through.obj(function (file, en, next) {
            const treePath = path_1.relative(commonRootDir, file.path);
            file._originPath = file.path;
            const { tsDirs, dir } = packageDirTree.getAllData(treePath).pop();
            const absFile = path_1.resolve(commonRootDir, treePath);
            const pathWithinPkg = path_1.relative(dir, absFile);
            // console.log(dir, tsDirs);
            const prefix = tsDirs.srcDir;
            // for (const prefix of [tsDirs.srcDir, tsDirs.isomDir]) {
            if (prefix === '.' || prefix.length === 0) {
                file.path = path_1.join(dir, tsDirs.destDir, pathWithinPkg);
                // break;
            }
            else if (pathWithinPkg.startsWith(prefix + path_1.sep)) {
                file.path = path_1.join(dir, tsDirs.destDir, pathWithinPkg.slice(prefix.length + 1));
                // break;
            }
            // }
            // console.log('pathWithinPkg', pathWithinPkg);
            // console.log('file.path', file.path);
            file.base = commonRootDir;
            // console.log('file.base', file.base);
            // console.log('file.relative', file.relative);
            next(null, file);
        });
    }
    return promCompile.then((list) => {
        if (argv.watch !== true && process.send) {
            process.send('plink-tsc compiled');
        }
        return list;
    });
}
exports.tsc = tsc;
function setupCompilerOptionsWithPackages(compilerOptions) {
    let wsKey = package_mgr_1.workspaceKey(process.cwd());
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    // const typeRoots = Array.from(packageUtils.typeRootsFromPackages(wsKey));
    config_handler_1.setTsCompilerOptForNodePath(process.cwd(), compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsa0RBQTBCO0FBQzFCLG1DQUFtQztBQUNuQyw4REFBZ0Q7QUFDaEQsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwrQkFBa0Q7QUFDbEQsNERBQTRCO0FBRTVCLHVDQUF1RjtBQUV2RixzREFBOEI7QUFDOUIscURBQXlHO0FBQ3pHLDZEQUF1RDtBQUN2RCwrQ0FBcUQ7QUFDckQsb0RBQTRCO0FBQzVCLDREQUE4QztBQUU5QywyQkFBMkI7QUFDM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLGlEQUFpRDtBQUVqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9DLHVCQUF1QjtBQUN2QixNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBb0IvQjs7Ozs7O0dBTUc7QUFDSCxTQUFnQixHQUFHLENBQUMsSUFBaUIsRUFBRSxVQUF3QztJQUM3RSwwQ0FBMEM7SUFDMUMsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQzdCLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNwSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFH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Q0osK0NBQStDO1lBQy9DLHVDQUF1QztZQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQztZQUMxQix1Q0FBdUM7WUFDdkMsK0NBQStDO1lBQy9DLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztTQUNwQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBcFBELGtCQW9QQztBQUVELFNBQVMsZ0NBQWdDLENBQUMsZUFBd0M7SUFDaEYsSUFBSSxLQUFLLEdBQThCLDBCQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDbkUsSUFBSSxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQyxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztJQUNuQyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7UUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0tBQzFEO0lBQ0QsMkVBQTJFO0lBQzNFLDRDQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxlQUFlLEVBQUU7UUFDMUQsZUFBZSxFQUFFLElBQUk7UUFDckIsWUFBWSxFQUFFLGNBQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO0tBQ25DLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5jb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidHlwZXMuZC50c1wiIC8+XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7c2VwLCByZXNvbHZlLCBqb2luLCByZWxhdGl2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgRmlsZSBmcm9tICd2aW55bCc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZSwgUGFja2FnZVRzRGlycywgY2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgc291cmNlbWFwcyBmcm9tICdndWxwLXNvdXJjZW1hcHMnO1xuXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG4vLyBjb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC50eXBlc2NyaXB0Jyk7XG4vLyBleHBvcnRzLmluaXQgPSBpbml0O1xuY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuLy8gY29uc3Qgbm9kZU1vZHVsZXMgPSBqb2luKHJvb3QsICdub2RlX21vZHVsZXMnKTtcblxuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xufVxuXG5pbnRlcmZhY2UgQ29tcG9uZW50RGlySW5mbyB7XG4gIHRzRGlyczogUGFja2FnZVRzRGlycztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgRW1pdExpc3QgPSBBcnJheTxbc3RyaW5nLCBudW1iZXJdPjtcblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzYyhhcmd2OiBUc2NDbWRQYXJhbSwgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCkge1xuICAvLyBjb25zdCBwb3NzaWJsZVNyY0RpcnMgPSBbJ2lzb20nLCAndHMnXTtcbiAgdmFyIGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IGFyZ3YuanN4ID8gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpIDpcbiAgICByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgaWYgKGJhc2VUc2NvbmZpZy5lcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYmFzZVRzY29uZmlnLmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZSk7XG4gIH1cbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwcm9jZXNzLmN3ZCgpLCBmYWxzZSkpIHtcbiAgICAgIG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc3JvdWNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oY29tcERpckluZm8udmFsdWVzKCkpLm1hcChlbCA9PiBlbC5kaXIpKTtcbiAgY29uc3QgZGVzdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zLFxuICAgIC8vIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAvLyBDb21waWxlciBvcHRpb25zXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zKTtcblxuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPENvbXBvbmVudERpckluZm8+KCk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5kaXIpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKHBhY2thZ2VEaXJUcmVlLnRyYXZlcnNlKCkpO1xuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIHBhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgLy8gY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMnLCBuYW1lKTtcbiAgICBjb25zdCBkaXJzID0gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb24pO1xuICAgIGNvbnN0IHNyY0RpcnMgPSBbZGlycy5zcmNEaXIsIGRpcnMuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihyZWFsUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7XG4gICAgICB0c0RpcnM6IGRpcnMsXG4gICAgICBkaXI6IHJlYWxQYXRoXG4gICAgfSk7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShyZWFsUGF0aCwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHRzUHJvamVjdCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KHsuLi5jb21waWxlck9wdGlvbnMsIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKX0pO1xuXG4gIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoKCkgPT4ge1xuICAgIGNvbnN0IHRvQ29tcGlsZSA9IGNvbXBHbG9icztcbiAgICBjb21wR2xvYnMgPSBbXTtcbiAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KVxuICAgICAgLnRoZW4oKCkgPT4gY29tcGlsZSh0b0NvbXBpbGUsIHRzUHJvamVjdCwgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIGNvbnN0IHdhdGNoRGlyczogc3RyaW5nW10gPSBbXTtcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgICAgW2luZm8udHNEaXJzLnNyY0RpciwgaW5mby50c0RpcnMuaXNvbURpcl0uZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gam9pbihpbmZvLmRpciwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaCh3YXRjaERpcnMsIHtpZ25vcmVkOiAvKFxcLmRcXC50c3xcXC5qcykkLyB9KTtcbiAgICB3YXRjaGVyLm9uKCdhZGQnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2FkZGVkJykpO1xuICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnY2hhbmdlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCd1bmxpbmsnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ3JlbW92ZWQnKSk7XG4gIH0gZWxzZSB7XG4gICAgcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsIGFyZ3YuZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DaGFuZ2VGaWxlKHBhdGg6IHN0cmluZywgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBpZiAocmVhc29uICE9PSAncmVtb3ZlZCcpXG4gICAgICBjb21wR2xvYnMucHVzaChwYXRoKTtcbiAgICBsb2cuaW5mbyhgRmlsZSAke2NoYWxrLmN5YW4ocmVsYXRpdmUocm9vdCwgcGF0aCkpfSBoYXMgYmVlbiBgICsgY2hhbGsueWVsbG93KHJlYXNvbikpO1xuICAgIGRlbGF5Q29tcGlsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGlsZShjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSwgaW5saW5lU291cmNlTWFwOiBib29sZWFuLCBlbWl0VGRzT25seSA9IGZhbHNlKSB7XG4gICAgLy8gY29uc3QgZ3VscEJhc2UgPSByb290ICsgU0VQO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgZnVuY3Rpb24gcHJpbnREdXJhdGlvbihpc0Vycm9yOiBib29sZWFuKSB7XG4gICAgICBjb25zdCBzZWMgPSBNYXRoLmNlaWwoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgICAgY29uc3QgbWluID0gYCR7TWF0aC5mbG9vcihzZWMgLyA2MCl9IG1pbnV0ZXMgJHtzZWMgJSA2MH0gc2VjZW5kc2A7XG4gICAgICBsb2cuaW5mbyhgQ29tcGlsZWQgJHtpc0Vycm9yID8gJ3dpdGggZXJyb3JzICcgOiAnJ31pbiBgICsgbWluKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8RW1pdExpc3Q+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB0c1Jlc3VsdCA9IGd1bHAuc3JjKGNvbXBHbG9icylcbiAgICAgIC5waXBlKHNvdXJjZW1hcHMuaW5pdCgpKVxuICAgICAgLnBpcGUodHNQcm9qZWN0KCkpXG4gICAgICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBMSjogTGV0J3MgdHJ5IHRvIHVzZSAtLXNvdXJjZU1hcCB3aXRoIC0taW5saW5lU291cmNlLCBzbyB0aGF0IEkgZG9uJ3QgbmVlZCB0byBjaGFuZ2UgZmlsZSBwYXRoIGluIHNvdXJjZSBtYXBcbiAgICAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbiAgICAgIGNvbnN0IHN0cmVhbXM6IGFueVtdID0gW107XG4gICAgICBpZiAoIWVtaXRUZHNPbmx5KSB7XG4gICAgICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5qc1xuICAgICAgICAgIC5waXBlKGNoYW5nZVBhdGgoKSlcbiAgICAgICAgICAvLyAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgICAgLy8gLnBpcGUoc291cmNlbWFwcy53cml0ZSgnLicsIHtpbmNsdWRlQ29udGVudDogZmFsc2UsIHNvdXJjZVJvb3Q6ICcuLyd9KSlcbiAgICAgICAgICAucGlwZShzb3VyY2VtYXBzLndyaXRlKCcuJywge2luY2x1ZGVDb250ZW50OiB0cnVlfSkpXG4gICAgICAgICAgLy8gLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICAgIC8vICAgaWYgKGZpbGUuZXh0bmFtZSA9PT0gJy5tYXAnKSB7XG4gICAgICAgICAgLy8gICAgIGNvbnN0IHNtID0gSlNPTi5wYXJzZShmaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIC8vICAgICBsZXQgc0ZpbGVEaXI7XG4gICAgICAgICAgLy8gICAgIHNtLnNvdXJjZXMgPVxuICAgICAgICAgIC8vICAgICAgIHNtLnNvdXJjZXMubWFwKCAoc3BhdGg6IHN0cmluZykgPT4ge1xuICAgICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbEZpbGUgPSBmcy5yZWFscGF0aFN5bmMoc3BhdGgpO1xuICAgICAgICAgIC8vICAgICAgICAgc0ZpbGVEaXIgPSBQYXRoLmRpcm5hbWUocmVhbEZpbGUpO1xuICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIHJlbGF0aXZlKGZpbGUuYmFzZSwgcmVhbEZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAvLyAgICAgICB9KTtcbiAgICAgICAgICAvLyAgICAgaWYgKHNGaWxlRGlyKVxuICAgICAgICAgIC8vICAgICAgIHNtLnNvdXJjZVJvb3QgPSByZWxhdGl2ZShzRmlsZURpciwgZmlsZS5iYXNlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgLy8gICAgIGZpbGUuY29udGVudHMgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShzbSksICd1dGY4Jyk7XG4gICAgICAgICAgLy8gICB9XG4gICAgICAgICAgLy8gICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgICAgIC8vIH0pKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmR0cy5waXBlKGNoYW5nZVBhdGgoKSkpO1xuXG4gICAgICBjb25zdCBlbWl0dGVkTGlzdCA9IFtdIGFzIEVtaXRMaXN0O1xuICAgICAgY29uc3QgYWxsID0gbWVyZ2Uoc3RyZWFtcylcbiAgICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlQYXRoID0gcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZS5wYXRoKTtcbiAgICAgICAgY29uc3QgZGlzcGxheVNpemUgPSBNYXRoLnJvdW5kKChmaWxlLmNvbnRlbnRzIGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aCAvIDEwMjQgKiAxMCkgLyAxMDtcblxuICAgICAgICBsb2cuaW5mbygnJXMgJXMgS2InLCBkaXNwbGF5UGF0aCwgY2hhbGsuYmx1ZUJyaWdodChkaXNwbGF5U2l6ZSArICcnKSk7XG4gICAgICAgIGVtaXR0ZWRMaXN0LnB1c2goW2Rpc3BsYXlQYXRoLCBkaXNwbGF5U2l6ZV0pO1xuICAgICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgfSkpXG4gICAgICAucGlwZShndWxwLmRlc3QoY29tbW9uUm9vdERpcikpO1xuXG4gICAgICBhbGwub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICBjb25zb2xlLmxvZygnXFxuLS0tLS0tLS0tLSBGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzLCBjaGVjayBvdXQgYmVsb3cgZXJyb3IgbWVzc2FnZSAtLS0tLS0tLS0tLS0tXFxuJyk7XG4gICAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgICB9KTtcbiAgICAgIGFsbC5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgYWxsLnJlc3VtZSgpO1xuICAgIH0pXG4gICAgLnRoZW4oZW1pdHRlZExpc3QgPT4ge1xuICAgICAgcHJpbnREdXJhdGlvbihmYWxzZSk7XG4gICAgICByZXR1cm4gZW1pdHRlZExpc3Q7XG4gICAgfSlcbiAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgIHByaW50RHVyYXRpb24odHJ1ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGZ1bmN0aW9uIGNoYW5nZVBhdGgoKSB7XG4gICAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGZpbGUucGF0aCk7XG4gICAgICBmaWxlLl9vcmlnaW5QYXRoID0gZmlsZS5wYXRoO1xuICAgICAgY29uc3Qge3RzRGlycywgZGlyfSA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpITtcbiAgICAgIGNvbnN0IGFic0ZpbGUgPSByZXNvbHZlKGNvbW1vblJvb3REaXIsIHRyZWVQYXRoKTtcbiAgICAgIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShkaXIsIGFic0ZpbGUpO1xuICAgICAgLy8gY29uc29sZS5sb2coZGlyLCB0c0RpcnMpO1xuICAgICAgY29uc3QgcHJlZml4ID0gdHNEaXJzLnNyY0RpcjtcbiAgICAgIC8vIGZvciAoY29uc3QgcHJlZml4IG9mIFt0c0RpcnMuc3JjRGlyLCB0c0RpcnMuaXNvbURpcl0pIHtcbiAgICAgIGlmIChwcmVmaXggPT09ICcuJyB8fCBwcmVmaXgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGZpbGUucGF0aCA9IGpvaW4oZGlyLCB0c0RpcnMuZGVzdERpciwgcGF0aFdpdGhpblBrZyk7XG4gICAgICAgIC8vIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgocHJlZml4ICsgc2VwKSkge1xuICAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgdHNEaXJzLmRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UocHJlZml4Lmxlbmd0aCArIDEpKTtcbiAgICAgICAgLy8gYnJlYWs7XG4gICAgICB9XG4gICAgICAvLyB9XG4gICAgICAvLyBjb25zb2xlLmxvZygncGF0aFdpdGhpblBrZycsIHBhdGhXaXRoaW5Qa2cpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2ZpbGUucGF0aCcsIGZpbGUucGF0aCk7XG4gICAgICBmaWxlLmJhc2UgPSBjb21tb25Sb290RGlyO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2ZpbGUuYmFzZScsIGZpbGUuYmFzZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZmlsZS5yZWxhdGl2ZScsIGZpbGUucmVsYXRpdmUpO1xuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwcm9tQ29tcGlsZS50aGVuKChsaXN0KSA9PiB7XG4gICAgaWYgKGFyZ3Yud2F0Y2ggIT09IHRydWUgJiYgcHJvY2Vzcy5zZW5kKSB7XG4gICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMpIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBzcGFjZScpO1xuICB9XG4gIC8vIGNvbnN0IHR5cGVSb290cyA9IEFycmF5LmZyb20ocGFja2FnZVV0aWxzLnR5cGVSb290c0Zyb21QYWNrYWdlcyh3c0tleSkpO1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogcmVzb2x2ZShyb290LCB3c0tleSlcbiAgfSk7XG59XG4iXX0=