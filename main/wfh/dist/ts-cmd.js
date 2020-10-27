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
        importHelpers: false, declaration: true, 
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
    function onComponent(name, packagePath, _parsedName, json, realPath) {
        countPkg++;
        // const packagePath = resolve(root, 'node_modules', name);
        const dirs = misc_1.getTsDirsOfPackage(json);
        const srcDirs = [dirs.srcDir, dirs.isomDir].filter(srcDir => {
            if (srcDir == null)
                return false;
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
    config_handler_1.setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsa0RBQTBCO0FBQzFCLG1DQUFtQztBQUNuQyw4REFBZ0Q7QUFDaEQsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwrQkFBa0Q7QUFDbEQsNERBQTRCO0FBRTVCLHVDQUF1RjtBQUV2RixzREFBOEI7QUFDOUIscURBQXlHO0FBQ3pHLDZEQUF1RDtBQUN2RCwrQ0FBcUQ7QUFDckQsb0RBQTRCO0FBQzVCLDREQUE4QztBQUU5QywyQkFBMkI7QUFDM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLGlEQUFpRDtBQUVqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9DLHVCQUF1QjtBQUN2QixNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBb0IvQjs7Ozs7O0dBTUc7QUFDSCxTQUFnQixHQUFHLENBQUMsSUFBaUIsRUFBRSxVQUF3QztJQUM3RSwwQ0FBMEM7SUFDMUMsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQzdCLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNwSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFH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Q29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5jb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidHlwZXMuZC50c1wiIC8+XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7c2VwLCByZXNvbHZlLCBqb2luLCByZWxhdGl2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgRmlsZSBmcm9tICd2aW55bCc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZSwgUGFja2FnZVRzRGlycywgY2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgc291cmNlbWFwcyBmcm9tICdndWxwLXNvdXJjZW1hcHMnO1xuXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG4vLyBjb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC50eXBlc2NyaXB0Jyk7XG4vLyBleHBvcnRzLmluaXQgPSBpbml0O1xuY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuLy8gY29uc3Qgbm9kZU1vZHVsZXMgPSBqb2luKHJvb3QsICdub2RlX21vZHVsZXMnKTtcblxuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xufVxuXG5pbnRlcmZhY2UgQ29tcG9uZW50RGlySW5mbyB7XG4gIHRzRGlyczogUGFja2FnZVRzRGlycztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgRW1pdExpc3QgPSBBcnJheTxbc3RyaW5nLCBudW1iZXJdPjtcblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzYyhhcmd2OiBUc2NDbWRQYXJhbSwgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCkge1xuICAvLyBjb25zdCBwb3NzaWJsZVNyY0RpcnMgPSBbJ2lzb20nLCAndHMnXTtcbiAgdmFyIGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IGFyZ3YuanN4ID8gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpIDpcbiAgICByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgaWYgKGJhc2VUc2NvbmZpZy5lcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYmFzZVRzY29uZmlnLmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZSk7XG4gIH1cbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwcm9jZXNzLmN3ZCgpLCBmYWxzZSkpIHtcbiAgICAgIG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc3JvdWNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oY29tcERpckluZm8udmFsdWVzKCkpLm1hcChlbCA9PiBlbC5kaXIpKTtcbiAgY29uc3QgZGVzdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zLFxuICAgIC8vIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAvLyBDb21waWxlciBvcHRpb25zXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zKTtcblxuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPENvbXBvbmVudERpckluZm8+KCk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5kaXIpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKHBhY2thZ2VEaXJUcmVlLnRyYXZlcnNlKCkpO1xuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICBjb25zdCB0c1Byb2plY3QgPSBndWxwVHMuY3JlYXRlUHJvamVjdCh7Li4uY29tcGlsZXJPcHRpb25zLCB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0Jyl9KTtcblxuICBjb25zdCBkZWxheUNvbXBpbGUgPSBfLmRlYm91bmNlKCgpID0+IHtcbiAgICBjb25zdCB0b0NvbXBpbGUgPSBjb21wR2xvYnM7XG4gICAgY29tcEdsb2JzID0gW107XG4gICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdClcbiAgICAgIC50aGVuKCgpID0+IGNvbXBpbGUodG9Db21waWxlLCB0c1Byb2plY3QsIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCkpXG4gICAgICAuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpO1xuICAgIGlmIChvbkNvbXBpbGVkKVxuICAgICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS50aGVuKGVtaXR0ZWQgPT4ge1xuICAgICAgICBvbkNvbXBpbGVkKGVtaXR0ZWQpO1xuICAgICAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAgIH0pO1xuICB9LCAyMDApO1xuXG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICBjb25zdCB3YXRjaERpcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29tcEdsb2JzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICAgIFtpbmZvLnRzRGlycy5zcmNEaXIsIGluZm8udHNEaXJzLmlzb21EaXJdLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IGpvaW4oaW5mby5kaXIsIHNyY0RpciEpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHdhdGNoRGlycywge2lnbm9yZWQ6IC8oXFwuZFxcLnRzfFxcLmpzKSQvIH0pO1xuICAgIHdhdGNoZXIub24oJ2FkZCcsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnYWRkZWQnKSk7XG4gICAgd2F0Y2hlci5vbignY2hhbmdlJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdjaGFuZ2VkJykpO1xuICAgIHdhdGNoZXIub24oJ3VubGluaycsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAncmVtb3ZlZCcpKTtcbiAgfSBlbHNlIHtcbiAgICBwcm9tQ29tcGlsZSA9IGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIHBhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgLy8gY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMnLCBuYW1lKTtcbiAgICBjb25zdCBkaXJzID0gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb24pO1xuICAgIGNvbnN0IHNyY0RpcnMgPSBbZGlycy5zcmNEaXIsIGRpcnMuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICBpZiAoc3JjRGlyID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHJlYWxQYXRoLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHtcbiAgICAgIHRzRGlyczogZGlycyxcbiAgICAgIGRpcjogcmVhbFBhdGhcbiAgICB9KTtcbiAgICBzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSByZXNvbHZlKHJlYWxQYXRoLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlRmlsZShwYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgaWYgKHJlYXNvbiAhPT0gJ3JlbW92ZWQnKVxuICAgICAgY29tcEdsb2JzLnB1c2gocGF0aCk7XG4gICAgbG9nLmluZm8oYEZpbGUgJHtjaGFsay5jeWFuKHJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbiAgICBkZWxheUNvbXBpbGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBpbGUoY29tcEdsb2JzOiBzdHJpbmdbXSwgdHNQcm9qZWN0OiBhbnksIGlubGluZVNvdXJjZU1hcDogYm9vbGVhbiwgZW1pdFRkc09ubHkgPSBmYWxzZSkge1xuICAgIC8vIGNvbnN0IGd1bHBCYXNlID0gcm9vdCArIFNFUDtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIGZ1bmN0aW9uIHByaW50RHVyYXRpb24oaXNFcnJvcjogYm9vbGVhbikge1xuICAgICAgY29uc3Qgc2VjID0gTWF0aC5jZWlsKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICAgIGNvbnN0IG1pbiA9IGAke01hdGguZmxvb3Ioc2VjIC8gNjApfSBtaW51dGVzICR7c2VjICUgNjB9IHNlY2VuZHNgO1xuICAgICAgbG9nLmluZm8oYENvbXBpbGVkICR7aXNFcnJvciA/ICd3aXRoIGVycm9ycyAnIDogJyd9aW4gYCArIG1pbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEVtaXRMaXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBjb21waWxlRXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3QgdHNSZXN1bHQgPSBndWxwLnNyYyhjb21wR2xvYnMpXG4gICAgICAucGlwZShzb3VyY2VtYXBzLmluaXQoKSlcbiAgICAgIC5waXBlKHRzUHJvamVjdCgpKVxuICAgICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgIGNvbXBpbGVFcnJvcnMucHVzaChlcnIubWVzc2FnZSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gTEo6IExldCdzIHRyeSB0byB1c2UgLS1zb3VyY2VNYXAgd2l0aCAtLWlubGluZVNvdXJjZSwgc28gdGhhdCBJIGRvbid0IG5lZWQgdG8gY2hhbmdlIGZpbGUgcGF0aCBpbiBzb3VyY2UgbWFwXG4gICAgICAvLyB3aGljaCBpcyBvdXRwdXRlZFxuXG4gICAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgICAgaWYgKCFlbWl0VGRzT25seSkge1xuICAgICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuanNcbiAgICAgICAgICAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgICAgLy8gLnBpcGUoY2hhbmdlUGF0aCgpKVxuICAgICAgICAgIC8vIC5waXBlKHNvdXJjZW1hcHMud3JpdGUoJy4nLCB7aW5jbHVkZUNvbnRlbnQ6IGZhbHNlLCBzb3VyY2VSb290OiAnLi8nfSkpXG4gICAgICAgICAgLnBpcGUoc291cmNlbWFwcy53cml0ZSgnLicsIHtpbmNsdWRlQ29udGVudDogdHJ1ZX0pKVxuICAgICAgICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgICAvLyAgIGlmIChmaWxlLmV4dG5hbWUgPT09ICcubWFwJykge1xuICAgICAgICAgIC8vICAgICBjb25zdCBzbSA9IEpTT04ucGFyc2UoZmlsZS5jb250ZW50cy50b1N0cmluZygpKTtcbiAgICAgICAgICAvLyAgICAgbGV0IHNGaWxlRGlyO1xuICAgICAgICAgIC8vICAgICBzbS5zb3VyY2VzID1cbiAgICAgICAgICAvLyAgICAgICBzbS5zb3VyY2VzLm1hcCggKHNwYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAvLyAgICAgICAgIGNvbnN0IHJlYWxGaWxlID0gZnMucmVhbHBhdGhTeW5jKHNwYXRoKTtcbiAgICAgICAgICAvLyAgICAgICAgIHNGaWxlRGlyID0gUGF0aC5kaXJuYW1lKHJlYWxGaWxlKTtcbiAgICAgICAgICAvLyAgICAgICAgIHJldHVybiByZWxhdGl2ZShmaWxlLmJhc2UsIHJlYWxGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgLy8gICAgICAgfSk7XG4gICAgICAgICAgLy8gICAgIGlmIChzRmlsZURpcilcbiAgICAgICAgICAvLyAgICAgICBzbS5zb3VyY2VSb290ID0gcmVsYXRpdmUoc0ZpbGVEaXIsIGZpbGUuYmFzZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICAgIC8vICAgICBmaWxlLmNvbnRlbnRzID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoc20pLCAndXRmOCcpO1xuICAgICAgICAgIC8vICAgfVxuICAgICAgICAgIC8vICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAgICAgICAvLyB9KSlcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5kdHMucGlwZShjaGFuZ2VQYXRoKCkpKTtcblxuICAgICAgY29uc3QgZW1pdHRlZExpc3QgPSBbXSBhcyBFbWl0TGlzdDtcbiAgICAgIGNvbnN0IGFsbCA9IG1lcmdlKHN0cmVhbXMpXG4gICAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBGaWxlLCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICBjb25zdCBkaXNwbGF5UGF0aCA9IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUucGF0aCk7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlTaXplID0gTWF0aC5yb3VuZCgoZmlsZS5jb250ZW50cyBhcyBCdWZmZXIpLmJ5dGVMZW5ndGggLyAxMDI0ICogMTApIC8gMTA7XG5cbiAgICAgICAgbG9nLmluZm8oJyVzICVzIEtiJywgZGlzcGxheVBhdGgsIGNoYWxrLmJsdWVCcmlnaHQoZGlzcGxheVNpemUgKyAnJykpO1xuICAgICAgICBlbWl0dGVkTGlzdC5wdXNoKFtkaXNwbGF5UGF0aCwgZGlzcGxheVNpemVdKTtcbiAgICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAgIH0pKVxuICAgICAgLnBpcGUoZ3VscC5kZXN0KGNvbW1vblJvb3REaXIpKTtcblxuICAgICAgYWxsLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGlmIChjb21waWxlRXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgICAgY29uc29sZS5sb2coJ1xcbi0tLS0tLS0tLS0gRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcywgY2hlY2sgb3V0IGJlbG93IGVycm9yIG1lc3NhZ2UgLS0tLS0tLS0tLS0tLVxcbicpO1xuICAgICAgICAgIGNvbXBpbGVFcnJvcnMuZm9yRWFjaChtc2cgPT4gbG9nLmVycm9yKG1zZykpO1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzJykpO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUoZW1pdHRlZExpc3QpO1xuICAgICAgfSk7XG4gICAgICBhbGwub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICAgIGFsbC5yZXN1bWUoKTtcbiAgICB9KVxuICAgIC50aGVuKGVtaXR0ZWRMaXN0ID0+IHtcbiAgICAgIHByaW50RHVyYXRpb24oZmFsc2UpO1xuICAgICAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xuICAgIH0pXG4gICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICBwcmludER1cmF0aW9uKHRydWUpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gICAgfSk7XG4gIH1cblxuICAvLyBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBmdW5jdGlvbiBjaGFuZ2VQYXRoKCkge1xuICAgIHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBGaWxlLCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlLnBhdGgpO1xuICAgICAgZmlsZS5fb3JpZ2luUGF0aCA9IGZpbGUucGF0aDtcbiAgICAgIGNvbnN0IHt0c0RpcnMsIGRpcn0gPSBwYWNrYWdlRGlyVHJlZS5nZXRBbGxEYXRhKHRyZWVQYXRoKS5wb3AoKSE7XG4gICAgICBjb25zdCBhYnNGaWxlID0gcmVzb2x2ZShjb21tb25Sb290RGlyLCB0cmVlUGF0aCk7XG4gICAgICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoZGlyLCBhYnNGaWxlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGRpciwgdHNEaXJzKTtcbiAgICAgIGNvbnN0IHByZWZpeCA9IHRzRGlycy5zcmNEaXI7XG4gICAgICAvLyBmb3IgKGNvbnN0IHByZWZpeCBvZiBbdHNEaXJzLnNyY0RpciwgdHNEaXJzLmlzb21EaXJdKSB7XG4gICAgICBpZiAocHJlZml4ID09PSAnLicgfHwgcHJlZml4Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgdHNEaXJzLmRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICAgICAgICAvLyBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAocGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKHByZWZpeCArIHNlcCkpIHtcbiAgICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIHRzRGlycy5kZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHByZWZpeC5sZW5ndGggKyAxKSk7XG4gICAgICAgIC8vIGJyZWFrO1xuICAgICAgfVxuICAgICAgLy8gfVxuICAgICAgLy8gY29uc29sZS5sb2coJ3BhdGhXaXRoaW5Qa2cnLCBwYXRoV2l0aGluUGtnKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdmaWxlLnBhdGgnLCBmaWxlLnBhdGgpO1xuICAgICAgZmlsZS5iYXNlID0gY29tbW9uUm9vdERpcjtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdmaWxlLmJhc2UnLCBmaWxlLmJhc2UpO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2ZpbGUucmVsYXRpdmUnLCBmaWxlLnJlbGF0aXZlKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcHJvbUNvbXBpbGUudGhlbigobGlzdCkgPT4ge1xuICAgIGlmIChhcmd2LndhdGNoICE9PSB0cnVlICYmIHByb2Nlc3Muc2VuZCkge1xuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgc3BhY2UnKTtcbiAgfVxuICAvLyBjb25zdCB0eXBlUm9vdHMgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy50eXBlUm9vdHNGcm9tUGFja2FnZXMod3NLZXkpKTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksICcuLycsIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHJlc29sdmUocm9vdCwgd3NLZXkpXG4gIH0pO1xufVxuIl19