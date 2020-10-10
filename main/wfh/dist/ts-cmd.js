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
                // .pipe(through.obj(function(file: File, en: string, next: (...arg: any[]) => void) {
                //   file.base = commonRootDir;
                //   next(null, file);
                // }))
                .pipe(changePath())
                .pipe(sourcemaps.init())
                // .pipe(sourcemaps.mapSources((srcPath, file) => {
                //   console.log(srcPath);
                //   return basename(srcPath);
                // }))
                .pipe(tsProject())
                .on('error', (err) => {
                compileErrors.push(err.message);
            });
            // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
            // which is outputed
            const streams = [];
            if (!emitTdsOnly) {
                streams.push(tsResult.js
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
            streams.push(tsResult.dts);
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
            for (const prefix of [tsDirs.srcDir, tsDirs.isomDir]) {
                if (prefix === '.' || prefix.length === 0) {
                    file.path = path_1.join(dir, tsDirs.destDir, pathWithinPkg);
                    break;
                }
                else if (pathWithinPkg.startsWith(prefix + path_1.sep)) {
                    file.path = path_1.join(dir, tsDirs.destDir, pathWithinPkg.slice(prefix.length + 1));
                    break;
                }
            }
            // console.log(file.path);
            file.base = commonRootDir;
            // console.log(file.base, file.relative);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsa0RBQTBCO0FBQzFCLG1DQUFtQztBQUNuQyw4REFBZ0Q7QUFDaEQsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwrQkFBa0Q7QUFDbEQsNERBQTRCO0FBRTVCLHVDQUF1RjtBQUV2RixzREFBOEI7QUFDOUIscURBQXlHO0FBQ3pHLDZEQUF1RDtBQUN2RCwrQ0FBcUQ7QUFDckQsb0RBQTRCO0FBQzVCLDREQUE4QztBQUU5QywyQkFBMkI7QUFDM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLGlEQUFpRDtBQUVqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9DLHVCQUF1QjtBQUN2QixNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBb0IvQjs7Ozs7O0dBTUc7QUFDSCxTQUFnQixHQUFHLENBQUMsSUFBVSxFQUFFLFVBQXdDO0lBQ3RFLDBDQUEwQztJQUMxQyxJQUFJLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDN0IsdUJBQXVCO0lBQ3ZCLE1BQU0sV0FBVyxHQUFrQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO0lBQ3BILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFDM0UsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sWUFBWSxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQy9HLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRTtRQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixHQUFHLGdCQUFnQixDQUFDLENBQUM7S0FDakU7SUFDRCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFFLEVBQWMsQ0FBQyxDQUFDO0lBRW5ELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztJQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUN6QyxZQUFZLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDaEQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNoRTtTQUFNO1FBQ0wsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQ3ZFLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQy9EO0tBQ0Y7SUFFRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0tBQzNFO0lBRUQsTUFBTSxhQUFhLEdBQUcsNkJBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNqRyxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsRCxNQUFNLGVBQWUsbUNBQ2hCLFlBQVksQ0FBQyxNQUFNLENBQUMsZUFBZTtRQUN0QyxxQ0FBcUM7UUFDckMsbUJBQW1CO1FBQ25CLGFBQWEsRUFBRSxLQUFLO1FBQ3BCOzs7V0FHRztRQUNILE1BQU0sRUFBRSxPQUFPLEVBQ2YsT0FBTyxFQUFFLE9BQU8sRUFDaEIsWUFBWSxFQUFFLElBQUksRUFDbEIsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUM1QyxTQUFTLEVBQUUsSUFBSSxFQUNmLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFDMUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FFN0IsQ0FBQztJQUNGLGdDQUFnQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRWxELE1BQU0sY0FBYyxHQUFHLElBQUksa0JBQU8sRUFBb0IsQ0FBQztJQUN2RCxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUN2QyxNQUFNLFFBQVEsR0FBRyxlQUFRLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuRCxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QztJQUNELDBDQUEwQztJQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRXpELFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxXQUFtQixFQUFFLFdBQWdCLEVBQUUsSUFBUyxFQUFFLFFBQWdCO1FBQ25HLFFBQVEsRUFBRSxDQUFDO1FBQ1gsMkRBQTJEO1FBQzNELE1BQU0sSUFBSSxHQUFHLHlCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzFELElBQUk7Z0JBQ0YsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUMxRDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxJQUFJO1lBQ1osR0FBRyxFQUFFLFFBQVE7U0FDZCxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM5RCxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ1osU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7YUFDdkM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsYUFBYSxpQ0FBSyxlQUFlLEtBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBRSxDQUFDO0lBRWhHLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ25DLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUM1QixTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBYyxDQUFDO2FBQ2xELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0UsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQWMsQ0FBQyxDQUFDO1FBQy9CLElBQUksVUFBVTtZQUNaLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN2QyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BCLE9BQU8sT0FBTyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRVIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QixNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7UUFDL0IsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVmLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3ZDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3pELE1BQU0sT0FBTyxHQUFHLFdBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzNELFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ1osU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7aUJBQ3ZDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUN6RSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN2RTtTQUFNO1FBQ0wsV0FBVyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNuRjtJQUVELFNBQVMsWUFBWSxDQUFDLElBQVksRUFBRSxNQUFjO1FBQ2hELElBQUksTUFBTSxLQUFLLFNBQVM7WUFDdEIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsZUFBSyxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLFlBQVksR0FBRyxlQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdEYsWUFBWSxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVELFNBQVMsT0FBTyxDQUFDLFNBQW1CLEVBQUUsU0FBYyxFQUFFLGVBQXdCLEVBQUUsV0FBVyxHQUFHLEtBQUs7UUFDakcsK0JBQStCO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdkMsU0FBUyxhQUFhLENBQUMsT0FBZ0I7WUFDckMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDakUsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsWUFBWSxHQUFHLEdBQUcsRUFBRSxVQUFVLENBQUM7WUFDbEUsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMvQyxNQUFNLGFBQWEsR0FBYSxFQUFFLENBQUM7WUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7Z0JBQ3BDLHNGQUFzRjtnQkFDdEYsK0JBQStCO2dCQUMvQixzQkFBc0I7Z0JBQ3RCLE1BQU07aUJBQ0wsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2lCQUNsQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4QixtREFBbUQ7Z0JBQ25ELDBCQUEwQjtnQkFDMUIsOEJBQThCO2dCQUM5QixNQUFNO2lCQUNMLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztpQkFDakIsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFO2dCQUMxQixhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUMsQ0FBQztZQUVILCtHQUErRztZQUMvRyxvQkFBb0I7WUFFcEIsTUFBTSxPQUFPLEdBQVUsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3RCLHNCQUFzQjtvQkFDdEIsMEVBQTBFO3FCQUN6RSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBQyxjQUFjLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDcEQscUZBQXFGO2dCQUNyRixtQ0FBbUM7Z0JBQ25DLHVEQUF1RDtnQkFDdkQsb0JBQW9CO2dCQUNwQixtQkFBbUI7Z0JBQ25CLDZDQUE2QztnQkFDN0MsbURBQW1EO2dCQUNuRCw2Q0FBNkM7Z0JBQzdDLG9FQUFvRTtnQkFDcEUsWUFBWTtnQkFDWixvQkFBb0I7Z0JBQ3BCLDJFQUEyRTtnQkFDM0UsK0RBQStEO2dCQUMvRCxNQUFNO2dCQUNOLHNCQUFzQjtnQkFDdEIsTUFBTTtpQkFDUCxDQUFDO2FBQ0g7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUUzQixNQUFNLFdBQVcsR0FBRyxFQUFjLENBQUM7WUFDbkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztpQkFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBUyxJQUFVLEVBQUUsRUFBVSxFQUFFLElBQTZCO2dCQUM5RSxNQUFNLFdBQVcsR0FBRyxlQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBRSxJQUFJLENBQUMsUUFBbUIsQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFFdEYsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLGVBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztpQkFDRixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBRWhDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtnQkFDakIsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDNUIsK0JBQStCO29CQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGdHQUFnRyxDQUFDLENBQUM7b0JBQzlHLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzdDLE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQztpQkFDaEU7Z0JBQ0QsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ2xCLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixPQUFPLFdBQVcsQ0FBQztRQUNyQixDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDWCxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELDZCQUE2QjtJQUM3QixTQUFTLFVBQVU7UUFDakIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBVSxFQUFFLEVBQVUsRUFBRSxJQUE2QjtZQUMvRSxNQUFNLFFBQVEsR0FBRyxlQUFRLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDN0IsTUFBTSxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUMsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRyxDQUFDO1lBQ2pFLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDakQsTUFBTSxhQUFhLEdBQUcsZUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM3Qyw4QkFBOEI7WUFDOUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNwRCxJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQ3pDLElBQUksQ0FBQyxJQUFJLEdBQUcsV0FBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUNyRCxNQUFNO2lCQUNQO3FCQUFNLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBRyxDQUFDLEVBQUU7b0JBQ2pELElBQUksQ0FBQyxJQUFJLEdBQUcsV0FBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5RSxNQUFNO2lCQUNQO2FBQ0Y7WUFDRCwwQkFBMEI7WUFDMUIsSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7WUFDMUIseUNBQXlDO1lBQ3pDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztTQUNwQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBelBELGtCQXlQQztBQUVELFNBQVMsZ0NBQWdDLENBQUMsZUFBd0M7SUFDaEYsSUFBSSxLQUFLLEdBQThCLDBCQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDbkUsSUFBSSxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQyxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztJQUNuQyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7UUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0tBQzFEO0lBQ0QsMkVBQTJFO0lBQzNFLDRDQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxlQUFlLEVBQUU7UUFDMUQsZUFBZSxFQUFFLElBQUk7UUFDckIsWUFBWSxFQUFFLGNBQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO0tBQ25DLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5jb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidHlwZXMuZC50c1wiIC8+XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7c2VwLCByZXNvbHZlLCBqb2luLCByZWxhdGl2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgRmlsZSBmcm9tICd2aW55bCc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZSwgUGFja2FnZVRzRGlycywgY2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgc291cmNlbWFwcyBmcm9tICdndWxwLXNvdXJjZW1hcHMnO1xuXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG4vLyBjb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC50eXBlc2NyaXB0Jyk7XG4vLyBleHBvcnRzLmluaXQgPSBpbml0O1xuY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuLy8gY29uc3Qgbm9kZU1vZHVsZXMgPSBqb2luKHJvb3QsICdub2RlX21vZHVsZXMnKTtcblxuaW50ZXJmYWNlIEFyZ3Mge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgY29tcGlsZU9wdGlvbnM/OiB7W2tleSBpbiBrZXlvZiBDb21waWxlck9wdGlvbnNdPzogYW55fTtcbn1cblxuaW50ZXJmYWNlIENvbXBvbmVudERpckluZm8ge1xuICB0c0RpcnM6IFBhY2thZ2VUc0RpcnM7XG4gIGRpcjogc3RyaW5nO1xufVxuXG50eXBlIEVtaXRMaXN0ID0gQXJyYXk8W3N0cmluZywgbnVtYmVyXT47XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c2MoYXJndjogQXJncywgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCkge1xuICAvLyBjb25zdCBwb3NzaWJsZVNyY0RpcnMgPSBbJ2lzb20nLCAndHMnXTtcbiAgdmFyIGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IGFyZ3YuanN4ID8gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpIDpcbiAgICByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgaWYgKGJhc2VUc2NvbmZpZy5lcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYmFzZVRzY29uZmlnLmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZSk7XG4gIH1cbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZShwcm9jZXNzLmN3ZCgpLCBmYWxzZSkpIHtcbiAgICAgIG9uQ29tcG9uZW50KHBrZy5uYW1lLCBwa2cucGF0aCwgbnVsbCwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNvdW50UGtnID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBhdmFpbGFibGUgc3JvdWNlIHBhY2thZ2UgZm91bmQgaW4gY3VycmVudCB3b3Jrc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oY29tcERpckluZm8udmFsdWVzKCkpLm1hcChlbCA9PiBlbC5kaXIpKTtcbiAgY29uc3QgZGVzdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zLFxuICAgIC8vIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAvLyBDb21waWxlciBvcHRpb25zXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBkZXN0RGlyLFxuICAgIHJvb3REaXI6IGRlc3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLFxuICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VzOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zKTtcblxuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPENvbXBvbmVudERpckluZm8+KCk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5kaXIpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKHBhY2thZ2VEaXJUcmVlLnRyYXZlcnNlKCkpO1xuICBsb2cuaW5mbygndHlwZXNjcmlwdCBjb21waWxlck9wdGlvbnM6JywgY29tcGlsZXJPcHRpb25zKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIHBhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgLy8gY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMnLCBuYW1lKTtcbiAgICBjb25zdCBkaXJzID0gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb24pO1xuICAgIGNvbnN0IHNyY0RpcnMgPSBbZGlycy5zcmNEaXIsIGRpcnMuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihyZWFsUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7XG4gICAgICB0c0RpcnM6IGRpcnMsXG4gICAgICBkaXI6IHJlYWxQYXRoXG4gICAgfSk7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShyZWFsUGF0aCwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHRzUHJvamVjdCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KHsuLi5jb21waWxlck9wdGlvbnMsIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKX0pO1xuXG4gIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoKCkgPT4ge1xuICAgIGNvbnN0IHRvQ29tcGlsZSA9IGNvbXBHbG9icztcbiAgICBjb21wR2xvYnMgPSBbXTtcbiAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KVxuICAgICAgLnRoZW4oKCkgPT4gY29tcGlsZSh0b0NvbXBpbGUsIHRzUHJvamVjdCwgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIGNvbnN0IHdhdGNoRGlyczogc3RyaW5nW10gPSBbXTtcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgICAgW2luZm8udHNEaXJzLnNyY0RpciwgaW5mby50c0RpcnMuaXNvbURpcl0uZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gam9pbihpbmZvLmRpciwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaCh3YXRjaERpcnMsIHtpZ25vcmVkOiAvKFxcLmRcXC50c3xcXC5qcykkLyB9KTtcbiAgICB3YXRjaGVyLm9uKCdhZGQnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2FkZGVkJykpO1xuICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnY2hhbmdlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCd1bmxpbmsnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ3JlbW92ZWQnKSk7XG4gIH0gZWxzZSB7XG4gICAgcHJvbUNvbXBpbGUgPSBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsIGFyZ3YuZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DaGFuZ2VGaWxlKHBhdGg6IHN0cmluZywgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBpZiAocmVhc29uICE9PSAncmVtb3ZlZCcpXG4gICAgICBjb21wR2xvYnMucHVzaChwYXRoKTtcbiAgICBsb2cuaW5mbyhgRmlsZSAke2NoYWxrLmN5YW4ocmVsYXRpdmUocm9vdCwgcGF0aCkpfSBoYXMgYmVlbiBgICsgY2hhbGsueWVsbG93KHJlYXNvbikpO1xuICAgIGRlbGF5Q29tcGlsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGlsZShjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSwgaW5saW5lU291cmNlTWFwOiBib29sZWFuLCBlbWl0VGRzT25seSA9IGZhbHNlKSB7XG4gICAgLy8gY29uc3QgZ3VscEJhc2UgPSByb290ICsgU0VQO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgZnVuY3Rpb24gcHJpbnREdXJhdGlvbihpc0Vycm9yOiBib29sZWFuKSB7XG4gICAgICBjb25zdCBzZWMgPSBNYXRoLmNlaWwoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgICAgY29uc3QgbWluID0gYCR7TWF0aC5mbG9vcihzZWMgLyA2MCl9IG1pbnV0ZXMgJHtzZWMgJSA2MH0gc2VjZW5kc2A7XG4gICAgICBsb2cuaW5mbyhgQ29tcGlsZWQgJHtpc0Vycm9yID8gJ3dpdGggZXJyb3JzICcgOiAnJ31pbiBgICsgbWluKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8RW1pdExpc3Q+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB0c1Jlc3VsdCA9IGd1bHAuc3JjKGNvbXBHbG9icylcbiAgICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAvLyAgIGZpbGUuYmFzZSA9IGNvbW1vblJvb3REaXI7XG4gICAgICAvLyAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICAvLyB9KSlcbiAgICAgIC5waXBlKGNoYW5nZVBhdGgoKSlcbiAgICAgIC5waXBlKHNvdXJjZW1hcHMuaW5pdCgpKVxuICAgICAgLy8gLnBpcGUoc291cmNlbWFwcy5tYXBTb3VyY2VzKChzcmNQYXRoLCBmaWxlKSA9PiB7XG4gICAgICAvLyAgIGNvbnNvbGUubG9nKHNyY1BhdGgpO1xuICAgICAgLy8gICByZXR1cm4gYmFzZW5hbWUoc3JjUGF0aCk7XG4gICAgICAvLyB9KSlcbiAgICAgIC5waXBlKHRzUHJvamVjdCgpKVxuICAgICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgIGNvbXBpbGVFcnJvcnMucHVzaChlcnIubWVzc2FnZSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gTEo6IExldCdzIHRyeSB0byB1c2UgLS1zb3VyY2VNYXAgd2l0aCAtLWlubGluZVNvdXJjZSwgc28gdGhhdCBJIGRvbid0IG5lZWQgdG8gY2hhbmdlIGZpbGUgcGF0aCBpbiBzb3VyY2UgbWFwXG4gICAgICAvLyB3aGljaCBpcyBvdXRwdXRlZFxuXG4gICAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgICAgaWYgKCFlbWl0VGRzT25seSkge1xuICAgICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuanNcbiAgICAgICAgICAvLyAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgICAgLy8gLnBpcGUoc291cmNlbWFwcy53cml0ZSgnLicsIHtpbmNsdWRlQ29udGVudDogZmFsc2UsIHNvdXJjZVJvb3Q6ICcuLyd9KSlcbiAgICAgICAgICAucGlwZShzb3VyY2VtYXBzLndyaXRlKCcuJywge2luY2x1ZGVDb250ZW50OiB0cnVlfSkpXG4gICAgICAgICAgLy8gLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICAgIC8vICAgaWYgKGZpbGUuZXh0bmFtZSA9PT0gJy5tYXAnKSB7XG4gICAgICAgICAgLy8gICAgIGNvbnN0IHNtID0gSlNPTi5wYXJzZShmaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIC8vICAgICBsZXQgc0ZpbGVEaXI7XG4gICAgICAgICAgLy8gICAgIHNtLnNvdXJjZXMgPVxuICAgICAgICAgIC8vICAgICAgIHNtLnNvdXJjZXMubWFwKCAoc3BhdGg6IHN0cmluZykgPT4ge1xuICAgICAgICAgIC8vICAgICAgICAgY29uc3QgcmVhbEZpbGUgPSBmcy5yZWFscGF0aFN5bmMoc3BhdGgpO1xuICAgICAgICAgIC8vICAgICAgICAgc0ZpbGVEaXIgPSBQYXRoLmRpcm5hbWUocmVhbEZpbGUpO1xuICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIHJlbGF0aXZlKGZpbGUuYmFzZSwgcmVhbEZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAvLyAgICAgICB9KTtcbiAgICAgICAgICAvLyAgICAgaWYgKHNGaWxlRGlyKVxuICAgICAgICAgIC8vICAgICAgIHNtLnNvdXJjZVJvb3QgPSByZWxhdGl2ZShzRmlsZURpciwgZmlsZS5iYXNlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgLy8gICAgIGZpbGUuY29udGVudHMgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShzbSksICd1dGY4Jyk7XG4gICAgICAgICAgLy8gICB9XG4gICAgICAgICAgLy8gICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgICAgIC8vIH0pKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmR0cyk7XG5cbiAgICAgIGNvbnN0IGVtaXR0ZWRMaXN0ID0gW10gYXMgRW1pdExpc3Q7XG4gICAgICBjb25zdCBhbGwgPSBtZXJnZShzdHJlYW1zKVxuICAgICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgZGlzcGxheVBhdGggPSByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlLnBhdGgpO1xuICAgICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoKGZpbGUuY29udGVudHMgYXMgQnVmZmVyKS5ieXRlTGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlQnJpZ2h0KGRpc3BsYXlTaXplICsgJycpKTtcbiAgICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlKGd1bHAuZGVzdChjb21tb25Sb290RGlyKSk7XG5cbiAgICAgIGFsbC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBpZiAoY29tcGlsZUVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG4tLS0tLS0tLS0tIEZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMsIGNoZWNrIG91dCBiZWxvdyBlcnJvciBtZXNzYWdlIC0tLS0tLS0tLS0tLS1cXG4nKTtcbiAgICAgICAgICBjb21waWxlRXJyb3JzLmZvckVhY2gobXNnID0+IGxvZy5lcnJvcihtc2cpKTtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcycpKTtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKGVtaXR0ZWRMaXN0KTtcbiAgICAgIH0pO1xuICAgICAgYWxsLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICBhbGwucmVzdW1lKCk7XG4gICAgfSlcbiAgICAudGhlbihlbWl0dGVkTGlzdCA9PiB7XG4gICAgICBwcmludER1cmF0aW9uKGZhbHNlKTtcbiAgICAgIHJldHVybiBlbWl0dGVkTGlzdDtcbiAgICB9KVxuICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgcHJpbnREdXJhdGlvbih0cnVlKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgZnVuY3Rpb24gY2hhbmdlUGF0aCgpIHtcbiAgICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgZmlsZS5wYXRoKTtcbiAgICAgIGZpbGUuX29yaWdpblBhdGggPSBmaWxlLnBhdGg7XG4gICAgICBjb25zdCB7dHNEaXJzLCBkaXJ9ID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCkhO1xuICAgICAgY29uc3QgYWJzRmlsZSA9IHJlc29sdmUoY29tbW9uUm9vdERpciwgdHJlZVBhdGgpO1xuICAgICAgY29uc3QgcGF0aFdpdGhpblBrZyA9IHJlbGF0aXZlKGRpciwgYWJzRmlsZSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhkaXIsIHRzRGlycyk7ICBcbiAgICAgIGZvciAoY29uc3QgcHJlZml4IG9mIFt0c0RpcnMuc3JjRGlyLCB0c0RpcnMuaXNvbURpcl0pIHtcbiAgICAgICAgaWYgKHByZWZpeCA9PT0gJy4nIHx8IHByZWZpeC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgdHNEaXJzLmRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKHBhdGhXaXRoaW5Qa2cuc3RhcnRzV2l0aChwcmVmaXggKyBzZXApKSB7XG4gICAgICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIHRzRGlycy5kZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHByZWZpeC5sZW5ndGggKyAxKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKGZpbGUucGF0aCk7XG4gICAgICBmaWxlLmJhc2UgPSBjb21tb25Sb290RGlyO1xuICAgICAgLy8gY29uc29sZS5sb2coZmlsZS5iYXNlLCBmaWxlLnJlbGF0aXZlKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcHJvbUNvbXBpbGUudGhlbigobGlzdCkgPT4ge1xuICAgIGlmIChhcmd2LndhdGNoICE9PSB0cnVlICYmIHByb2Nlc3Muc2VuZCkge1xuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgc3BhY2UnKTtcbiAgfVxuICAvLyBjb25zdCB0eXBlUm9vdHMgPSBBcnJheS5mcm9tKHBhY2thZ2VVdGlscy50eXBlUm9vdHNGcm9tUGFja2FnZXMod3NLZXkpKTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksIGNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHJlc29sdmUocm9vdCwgd3NLZXkpXG4gIH0pO1xufVxuIl19