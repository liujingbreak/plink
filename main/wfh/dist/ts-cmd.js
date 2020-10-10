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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsa0RBQTBCO0FBQzFCLG1DQUFtQztBQUNuQyw4REFBZ0Q7QUFDaEQsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwrQkFBa0Q7QUFDbEQsNERBQTRCO0FBRTVCLHVDQUF1RjtBQUV2RixzREFBOEI7QUFDOUIscURBQXlHO0FBQ3pHLDZEQUF1RDtBQUN2RCwrQ0FBcUQ7QUFDckQsb0RBQTRCO0FBQzVCLDREQUE4QztBQUU5QywyQkFBMkI7QUFDM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLGlEQUFpRDtBQUVqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9DLHVCQUF1QjtBQUN2QixNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBb0IvQjs7Ozs7O0dBTUc7QUFDSCxTQUFnQixHQUFHLENBQUMsSUFBVSxFQUFFLFVBQXdDO0lBQ3RFLDBDQUEwQztJQUMxQyxJQUFJLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDN0IsdUJBQXVCO0lBQ3ZCLE1BQU0sV0FBVyxHQUFrQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO0lBQ3BILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcs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SiwrQ0FBK0M7WUFDL0MsdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDO1lBQzFCLHVDQUF1QztZQUN2QywrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUMvQixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ3BDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFwUEQsa0JBb1BDO0FBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxlQUF3QztJQUNoRixJQUFJLEtBQUssR0FBOEIsMEJBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNuRSxJQUFJLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ25DLEtBQUssR0FBRyxzQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO0lBQ25DLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7S0FDMUQ7SUFDRCwyRUFBMkU7SUFDM0UsNENBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWUsRUFBRTtRQUMxRCxlQUFlLEVBQUUsSUFBSTtRQUNyQixZQUFZLEVBQUUsY0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7S0FDbkMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmNvbnN0IGd1bHBUcyA9IHJlcXVpcmUoJ2d1bHAtdHlwZXNjcmlwdCcpO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ0eXBlcy5kLnRzXCIgLz5cbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtzZXAsIHJlc29sdmUsIGpvaW4sIHJlbGF0aXZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBGaWxlIGZyb20gJ3ZpbnlsJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlLCBQYWNrYWdlVHNEaXJzLCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBzb3VyY2VtYXBzIGZyb20gJ2d1bHAtc291cmNlbWFwcyc7XG5cbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcbi8vIGNvbnN0IHNvdXJjZW1hcHMgPSByZXF1aXJlKCdndWxwLXNvdXJjZW1hcHMnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG4vLyBjb25zdCBub2RlTW9kdWxlcyA9IGpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcycpO1xuXG5pbnRlcmZhY2UgQXJncyB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xufVxuXG5pbnRlcmZhY2UgQ29tcG9uZW50RGlySW5mbyB7XG4gIHRzRGlyczogUGFja2FnZVRzRGlycztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgRW1pdExpc3QgPSBBcnJheTxbc3RyaW5nLCBudW1iZXJdPjtcblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzYyhhcmd2OiBBcmdzLCBvbkNvbXBpbGVkPzogKGVtaXR0ZWQ6IEVtaXRMaXN0KSA9PiB2b2lkKSB7XG4gIC8vIGNvbnN0IHBvc3NpYmxlU3JjRGlycyA9IFsnaXNvbScsICd0cyddO1xuICB2YXIgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB2YXIgY29tcFN0cmVhbSA9IFtdO1xuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgQ29tcG9uZW50RGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gYXJndi5qc3ggPyByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJykgOlxuICAgIHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xuICBpZiAoYmFzZVRzY29uZmlnLmVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihiYXNlVHNjb25maWcuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IHRzY29uZmlnIGZpbGU6ICcgKyBiYXNlVHNjb25maWdGaWxlKTtcbiAgfVxuICBsZXQgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHByb2Nlc3MuY3dkKCksIGZhbHNlKSkge1xuICAgICAgb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKTtcbiAgICB9XG4gIH1cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzcm91Y2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG5cbiAgY29uc3QgY29tbW9uUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShjb21wRGlySW5mby52YWx1ZXMoKSkubWFwKGVsID0+IGVsLmRpcikpO1xuICBjb25zdCBkZXN0RGlyID0gY29tbW9uUm9vdERpci5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZVRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnMsXG4gICAgLy8gdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpLFxuICAgIC8vIENvbXBpbGVyIG9wdGlvbnNcbiAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICAvKipcbiAgICAgKiBmb3IgZ3VscC1zb3VyY2VtYXBzIHVzYWdlOlxuICAgICAqICBJZiB5b3Ugc2V0IHRoZSBvdXREaXIgb3B0aW9uIHRvIHRoZSBzYW1lIHZhbHVlIGFzIHRoZSBkaXJlY3RvcnkgaW4gZ3VscC5kZXN0LCB5b3Ugc2hvdWxkIHNldCB0aGUgc291cmNlUm9vdCB0byAuLy5cbiAgICAgKi9cbiAgICBvdXREaXI6IGRlc3REaXIsXG4gICAgcm9vdERpcjogZGVzdERpcixcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMpO1xuXG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8Q29tcG9uZW50RGlySW5mbz4oKTtcbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLmRpcik7XG4gICAgcGFja2FnZURpclRyZWUucHV0RGF0YSh0cmVlUGF0aCwgaW5mbyk7XG4gIH1cbiAgLy8gY29uc29sZS5sb2cocGFja2FnZURpclRyZWUudHJhdmVyc2UoKSk7XG4gIGxvZy5pbmZvKCd0eXBlc2NyaXB0IGNvbXBpbGVyT3B0aW9uczonLCBjb21waWxlck9wdGlvbnMpO1xuXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgcGFja2FnZVBhdGg6IHN0cmluZywgX3BhcnNlZE5hbWU6IGFueSwganNvbjogYW55LCByZWFsUGF0aDogc3RyaW5nKSB7XG4gICAgY291bnRQa2crKztcbiAgICAvLyBjb25zdCBwYWNrYWdlUGF0aCA9IHJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcycsIG5hbWUpO1xuICAgIGNvbnN0IGRpcnMgPSBnZXRUc0RpcnNPZlBhY2thZ2UoanNvbik7XG4gICAgY29uc3Qgc3JjRGlycyA9IFtkaXJzLnNyY0RpciwgZGlycy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhqb2luKHJlYWxQYXRoLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHtcbiAgICAgIHRzRGlyczogZGlycyxcbiAgICAgIGRpcjogcmVhbFBhdGhcbiAgICB9KTtcbiAgICBzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSByZXNvbHZlKHJlYWxQYXRoLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgdHNQcm9qZWN0ID0gZ3VscFRzLmNyZWF0ZVByb2plY3Qoey4uLmNvbXBpbGVyT3B0aW9ucywgdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpfSk7XG5cbiAgY29uc3QgZGVsYXlDb21waWxlID0gXy5kZWJvdW5jZSgoKSA9PiB7XG4gICAgY29uc3QgdG9Db21waWxlID0gY29tcEdsb2JzO1xuICAgIGNvbXBHbG9icyA9IFtdO1xuICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpXG4gICAgICAudGhlbigoKSA9PiBjb21waWxlKHRvQ29tcGlsZSwgdHNQcm9qZWN0LCBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsIGFyZ3YuZWQpKVxuICAgICAgLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KTtcbiAgICBpZiAob25Db21waWxlZClcbiAgICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUudGhlbihlbWl0dGVkID0+IHtcbiAgICAgICAgb25Db21waWxlZChlbWl0dGVkKTtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9KTtcbiAgfSwgMjAwKTtcblxuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgY29uc3Qgd2F0Y2hEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbXBHbG9icyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgICBbaW5mby50c0RpcnMuc3JjRGlyLCBpbmZvLnRzRGlycy5pc29tRGlyXS5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBqb2luKGluZm8uZGlyLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHdhdGNoRGlycywge2lnbm9yZWQ6IC8oXFwuZFxcLnRzfFxcLmpzKSQvIH0pO1xuICAgIHdhdGNoZXIub24oJ2FkZCcsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnYWRkZWQnKSk7XG4gICAgd2F0Y2hlci5vbignY2hhbmdlJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdjaGFuZ2VkJykpO1xuICAgIHdhdGNoZXIub24oJ3VubGluaycsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAncmVtb3ZlZCcpKTtcbiAgfSBlbHNlIHtcbiAgICBwcm9tQ29tcGlsZSA9IGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZUZpbGUocGF0aDogc3RyaW5nLCByZWFzb246IHN0cmluZykge1xuICAgIGlmIChyZWFzb24gIT09ICdyZW1vdmVkJylcbiAgICAgIGNvbXBHbG9icy5wdXNoKHBhdGgpO1xuICAgIGxvZy5pbmZvKGBGaWxlICR7Y2hhbGsuY3lhbihyZWxhdGl2ZShyb290LCBwYXRoKSl9IGhhcyBiZWVuIGAgKyBjaGFsay55ZWxsb3cocmVhc29uKSk7XG4gICAgZGVsYXlDb21waWxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjb21waWxlKGNvbXBHbG9iczogc3RyaW5nW10sIHRzUHJvamVjdDogYW55LCBpbmxpbmVTb3VyY2VNYXA6IGJvb2xlYW4sIGVtaXRUZHNPbmx5ID0gZmFsc2UpIHtcbiAgICAvLyBjb25zdCBndWxwQmFzZSA9IHJvb3QgKyBTRVA7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICBmdW5jdGlvbiBwcmludER1cmF0aW9uKGlzRXJyb3I6IGJvb2xlYW4pIHtcbiAgICAgIGNvbnN0IHNlYyA9IE1hdGguY2VpbCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgICBjb25zdCBtaW4gPSBgJHtNYXRoLmZsb29yKHNlYyAvIDYwKX0gbWludXRlcyAke3NlYyAlIDYwfSBzZWNlbmRzYDtcbiAgICAgIGxvZy5pbmZvKGBDb21waWxlZCAke2lzRXJyb3IgPyAnd2l0aCBlcnJvcnMgJyA6ICcnfWluIGAgKyBtaW4pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxFbWl0TGlzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgY29tcGlsZUVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IHRzUmVzdWx0ID0gZ3VscC5zcmMoY29tcEdsb2JzKVxuICAgICAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gICAgICAucGlwZSh0c1Byb2plY3QoKSlcbiAgICAgIC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICBjb21waWxlRXJyb3JzLnB1c2goZXJyLm1lc3NhZ2UpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIExKOiBMZXQncyB0cnkgdG8gdXNlIC0tc291cmNlTWFwIHdpdGggLS1pbmxpbmVTb3VyY2UsIHNvIHRoYXQgSSBkb24ndCBuZWVkIHRvIGNoYW5nZSBmaWxlIHBhdGggaW4gc291cmNlIG1hcFxuICAgICAgLy8gd2hpY2ggaXMgb3V0cHV0ZWRcblxuICAgICAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbiAgICAgIGlmICghZW1pdFRkc09ubHkpIHtcbiAgICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmpzXG4gICAgICAgICAgLnBpcGUoY2hhbmdlUGF0aCgpKVxuICAgICAgICAgIC8vIC5waXBlKGNoYW5nZVBhdGgoKSlcbiAgICAgICAgICAvLyAucGlwZShzb3VyY2VtYXBzLndyaXRlKCcuJywge2luY2x1ZGVDb250ZW50OiBmYWxzZSwgc291cmNlUm9vdDogJy4vJ30pKVxuICAgICAgICAgIC5waXBlKHNvdXJjZW1hcHMud3JpdGUoJy4nLCB7aW5jbHVkZUNvbnRlbnQ6IHRydWV9KSlcbiAgICAgICAgICAvLyAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgICAgLy8gICBpZiAoZmlsZS5leHRuYW1lID09PSAnLm1hcCcpIHtcbiAgICAgICAgICAvLyAgICAgY29uc3Qgc20gPSBKU09OLnBhcnNlKGZpbGUuY29udGVudHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgLy8gICAgIGxldCBzRmlsZURpcjtcbiAgICAgICAgICAvLyAgICAgc20uc291cmNlcyA9XG4gICAgICAgICAgLy8gICAgICAgc20uc291cmNlcy5tYXAoIChzcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgLy8gICAgICAgICBjb25zdCByZWFsRmlsZSA9IGZzLnJlYWxwYXRoU3luYyhzcGF0aCk7XG4gICAgICAgICAgLy8gICAgICAgICBzRmlsZURpciA9IFBhdGguZGlybmFtZShyZWFsRmlsZSk7XG4gICAgICAgICAgLy8gICAgICAgICByZXR1cm4gcmVsYXRpdmUoZmlsZS5iYXNlLCByZWFsRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICAgIC8vICAgICAgIH0pO1xuICAgICAgICAgIC8vICAgICBpZiAoc0ZpbGVEaXIpXG4gICAgICAgICAgLy8gICAgICAgc20uc291cmNlUm9vdCA9IHJlbGF0aXZlKHNGaWxlRGlyLCBmaWxlLmJhc2UpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAvLyAgICAgZmlsZS5jb250ZW50cyA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHNtKSwgJ3V0ZjgnKTtcbiAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAvLyAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICAgICAgLy8gfSkpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuZHRzLnBpcGUoY2hhbmdlUGF0aCgpKSk7XG5cbiAgICAgIGNvbnN0IGVtaXR0ZWRMaXN0ID0gW10gYXMgRW1pdExpc3Q7XG4gICAgICBjb25zdCBhbGwgPSBtZXJnZShzdHJlYW1zKVxuICAgICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgZGlzcGxheVBhdGggPSByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlLnBhdGgpO1xuICAgICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoKGZpbGUuY29udGVudHMgYXMgQnVmZmVyKS5ieXRlTGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlQnJpZ2h0KGRpc3BsYXlTaXplICsgJycpKTtcbiAgICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlKGd1bHAuZGVzdChjb21tb25Sb290RGlyKSk7XG5cbiAgICAgIGFsbC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBpZiAoY29tcGlsZUVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG4tLS0tLS0tLS0tIEZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMsIGNoZWNrIG91dCBiZWxvdyBlcnJvciBtZXNzYWdlIC0tLS0tLS0tLS0tLS1cXG4nKTtcbiAgICAgICAgICBjb21waWxlRXJyb3JzLmZvckVhY2gobXNnID0+IGxvZy5lcnJvcihtc2cpKTtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcycpKTtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKGVtaXR0ZWRMaXN0KTtcbiAgICAgIH0pO1xuICAgICAgYWxsLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICBhbGwucmVzdW1lKCk7XG4gICAgfSlcbiAgICAudGhlbihlbWl0dGVkTGlzdCA9PiB7XG4gICAgICBwcmludER1cmF0aW9uKGZhbHNlKTtcbiAgICAgIHJldHVybiBlbWl0dGVkTGlzdDtcbiAgICB9KVxuICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgcHJpbnREdXJhdGlvbih0cnVlKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgZnVuY3Rpb24gY2hhbmdlUGF0aCgpIHtcbiAgICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgZmlsZS5wYXRoKTtcbiAgICAgIGZpbGUuX29yaWdpblBhdGggPSBmaWxlLnBhdGg7XG4gICAgICBjb25zdCB7dHNEaXJzLCBkaXJ9ID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCkhO1xuICAgICAgY29uc3QgYWJzRmlsZSA9IHJlc29sdmUoY29tbW9uUm9vdERpciwgdHJlZVBhdGgpO1xuICAgICAgY29uc3QgcGF0aFdpdGhpblBrZyA9IHJlbGF0aXZlKGRpciwgYWJzRmlsZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhkaXIsIHRzRGlycyk7XG4gICAgICBjb25zdCBwcmVmaXggPSB0c0RpcnMuc3JjRGlyO1xuICAgICAgLy8gZm9yIChjb25zdCBwcmVmaXggb2YgW3RzRGlycy5zcmNEaXIsIHRzRGlycy5pc29tRGlyXSkge1xuICAgICAgaWYgKHByZWZpeCA9PT0gJy4nIHx8IHByZWZpeC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIHRzRGlycy5kZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgICAgICAgLy8gYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChwcmVmaXggKyBzZXApKSB7XG4gICAgICAgIGZpbGUucGF0aCA9IGpvaW4oZGlyLCB0c0RpcnMuZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShwcmVmaXgubGVuZ3RoICsgMSkpO1xuICAgICAgICAvLyBicmVhaztcbiAgICAgIH1cbiAgICAgIC8vIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKCdwYXRoV2l0aGluUGtnJywgcGF0aFdpdGhpblBrZyk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZmlsZS5wYXRoJywgZmlsZS5wYXRoKTtcbiAgICAgIGZpbGUuYmFzZSA9IGNvbW1vblJvb3REaXI7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZmlsZS5iYXNlJywgZmlsZS5iYXNlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdmaWxlLnJlbGF0aXZlJywgZmlsZS5yZWxhdGl2ZSk7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHByb21Db21waWxlLnRoZW4oKGxpc3QpID0+IHtcbiAgICBpZiAoYXJndi53YXRjaCAhPT0gdHJ1ZSAmJiBwcm9jZXNzLnNlbmQpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCgncGxpbmstdHNjIGNvbXBpbGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBsaXN0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucykge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpXG4gICAgd3NLZXkgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIHNwYWNlJyk7XG4gIH1cbiAgLy8gY29uc3QgdHlwZVJvb3RzID0gQXJyYXkuZnJvbShwYWNrYWdlVXRpbHMudHlwZVJvb3RzRnJvbVBhY2thZ2VzKHdzS2V5KSk7XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiByZXNvbHZlKHJvb3QsIHdzS2V5KVxuICB9KTtcbn1cbiJdfQ==