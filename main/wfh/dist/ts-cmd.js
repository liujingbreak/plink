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
const gulpTs = require('gulp-typescript');
const chalk_1 = __importDefault(require("chalk"));
const packageUtils = __importStar(require("./package-utils"));
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const path_1 = require("path");
const typescript_1 = __importDefault(require("typescript"));
const misc_1 = require("./utils/misc");
const config_1 = __importDefault(require("./config"));
const config_handler_1 = require("./config-handler");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const log4js_1 = __importDefault(require("log4js"));
const gulp = require('gulp');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const SEP = path_1.sep;
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
    const compilerOptions = Object.assign(Object.assign({}, baseTsconfig.config.compilerOptions), { 
        // typescript: require('typescript'),
        // Compiler options
        importHelpers: false, outDir: '', 
        // rootDir: config().rootPath,
        skipLibCheck: true, inlineSourceMap: false, sourceMap: true, emitDeclarationOnly: argv.ed });
    config_handler_1.setTsCompilerOptForNodePath(process.cwd(), compilerOptions, { enableTypeRoots: true });
    let countPkg = 0;
    if (argv.package && argv.package.length > 0)
        packageUtils.findAllPackages(argv.package, onComponent, 'src');
    else if (argv.project && argv.project.length > 0) {
        packageUtils.findAllPackages(onComponent, 'src', argv.project);
    }
    else
        packageUtils.findAllPackages(onComponent, 'src');
    if (countPkg === 0) {
        throw new Error('No available srouce package found in current workspace');
    }
    const commonRootDir = misc_1.closestCommonParentDir(Array.from(compDirInfo.values()).map(el => el.dir));
    const packageDirTree = new dir_tree_1.DirTree();
    for (const info of compDirInfo.values()) {
        const treePath = path_1.relative(commonRootDir, info.dir);
        packageDirTree.putData(treePath, info);
    }
    // console.log(packageDirTree.traverse());
    compilerOptions.rootDir = commonRootDir.replace(/\\/g, '/');
    // console.log('rootDir:', commonRootDir);
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
        const gulpBase = root + SEP;
        const startTime = new Date().getTime();
        function printDuration(isError) {
            const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
            const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
            log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
        }
        const cwd = process.cwd();
        function changePath() {
            return through.obj(function (file, en, next) {
                const treePath = path_1.relative(cwd, file.path);
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
                file.base = commonRootDir;
                // console.log(file.base, file.relative);
                next(null, file);
            });
        }
        return new Promise((resolve, reject) => {
            const compileErrors = [];
            const tsResult = gulp.src(compGlobs)
                .pipe(sourcemaps.init())
                .pipe(through.obj(function (file, en, next) {
                file.base = gulpBase;
                next(null, file);
            }))
                .pipe(tsProject())
                .on('error', (err) => {
                compileErrors.push(err.message);
            });
            // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
            // which is outputed
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
            // }));
            const streams = [];
            if (!emitTdsOnly) {
                streams.push(tsResult.js
                    .pipe(changePath())
                    .pipe(inlineSourceMap ? sourcemaps.write() : sourcemaps.write('.')));
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
            all.resume();
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
    return promCompile.then((list) => {
        if (argv.watch !== true && process.send) {
            process.send('plink-tsc compiled');
        }
        return list;
    });
}
exports.tsc = tsc;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxrREFBMEI7QUFDMUIsOERBQWdEO0FBQ2hELDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsK0JBQWtEO0FBQ2xELDREQUE0QjtBQUU1Qix1Q0FBdUY7QUFFdkYsc0RBQThCO0FBQzlCLHFEQUE2RDtBQUM3RCw2REFBdUQ7QUFDdkQsb0RBQTRCO0FBQzVCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5QyxNQUFNLEdBQUcsR0FBRyxVQUFHLENBQUM7QUFFaEIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMvQyx1QkFBdUI7QUFDdkIsTUFBTSxJQUFJLEdBQUcsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQW9CL0I7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQVUsRUFBRSxVQUF3QztJQUN0RSwwQ0FBMEM7SUFDMUMsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQzdCLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNwSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUMzQyxNQUFNLFlBQVksR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRyxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUU7UUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ2pFO0lBQ0QsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBRSxFQUFjLENBQUMsQ0FBQztJQUVuRCxNQUFNLGVBQWUsbUNBQ2hCLFlBQVksQ0FBQyxNQUFNLENBQUMsZUFBZTtRQUN0QyxxQ0FBcUM7UUFDckMsbUJBQW1CO1FBQ25CLGFBQWEsRUFBRSxLQUFLLEVBQ3BCLE1BQU0sRUFBRSxFQUFFO1FBQ1YsOEJBQThCO1FBQzlCLFlBQVksRUFBRSxJQUFJLEVBQ2xCLGVBQWUsRUFBRSxLQUFLLEVBQ3RCLFNBQVMsRUFBRSxJQUFJLEVBQ2YsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FFN0IsQ0FBQztJQUNGLDRDQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBQyxlQUFlLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztJQUVyRixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDakIsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDekMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUM1RCxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ2hELFlBQVksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDaEU7O1FBQ0MsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFbkQsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztLQUMzRTtJQUNELE1BQU0sYUFBYSxHQUFHLDZCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDakcsTUFBTSxjQUFjLEdBQUcsSUFBSSxrQkFBTyxFQUFvQixDQUFDO0lBQ3ZELEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLGVBQVEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25ELGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hDO0lBQ0QsMENBQTBDO0lBQzFDLGVBQWUsQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDNUQsMENBQTBDO0lBRTFDLFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxXQUFtQixFQUFFLFdBQWdCLEVBQUUsSUFBUyxFQUFFLFFBQWdCO1FBQ25HLFFBQVEsRUFBRSxDQUFDO1FBQ1gsMkRBQTJEO1FBQzNELE1BQU0sSUFBSSxHQUFHLHlCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzFELElBQUk7Z0JBQ0YsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUMxRDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxJQUFJO1lBQ1osR0FBRyxFQUFFLFFBQVE7U0FDZCxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM5RCxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ1osU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7YUFDdkM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsYUFBYSxpQ0FBSyxlQUFlLEtBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBRSxDQUFDO0lBRWhHLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ25DLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUM1QixTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBYyxDQUFDO2FBQ2xELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0UsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQWMsQ0FBQyxDQUFDO1FBQy9CLElBQUksVUFBVTtZQUNaLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN2QyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BCLE9BQU8sT0FBTyxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRVIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QixNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7UUFDL0IsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVmLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3ZDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3pELE1BQU0sT0FBTyxHQUFHLFdBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzNELFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ1osU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7aUJBQ3ZDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUN6RSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN2RTtTQUFNO1FBQ0wsV0FBVyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNuRjtJQUVELFNBQVMsWUFBWSxDQUFDLElBQVksRUFBRSxNQUFjO1FBQ2hELElBQUksTUFBTSxLQUFLLFNBQVM7WUFDdEIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsZUFBSyxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLFlBQVksR0FBRyxlQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdEYsWUFBWSxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVELFNBQVMsT0FBTyxDQUFDLFNBQW1CLEVBQUUsU0FBYyxFQUFFLGVBQXdCLEVBQUUsV0FBVyxHQUFHLEtBQUs7UUFDakcsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXZDLFNBQVMsYUFBYSxDQUFDLE9BQWdCO1lBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLFlBQVksR0FBRyxHQUFHLEVBQUUsVUFBVSxDQUFDO1lBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQixTQUFTLFVBQVU7WUFDakIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBVSxFQUFFLEVBQVUsRUFBRSxJQUE2QjtnQkFDL0UsTUFBTSxRQUFRLEdBQUcsZUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFDLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUcsQ0FBQztnQkFDakUsTUFBTSxPQUFPLEdBQUcsY0FBTyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDakQsTUFBTSxhQUFhLEdBQUcsZUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDN0MsOEJBQThCO2dCQUM5QixLQUFLLE1BQU0sTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ3BELElBQUksTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTt3QkFDekMsSUFBSSxDQUFDLElBQUksR0FBRyxXQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7d0JBQ3JELE1BQU07cUJBQ1A7eUJBQU0sSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFHLENBQUMsRUFBRTt3QkFDakQsSUFBSSxDQUFDLElBQUksR0FBRyxXQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzlFLE1BQU07cUJBQ1A7aUJBQ0Y7Z0JBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7Z0JBQzFCLHlDQUF5QztnQkFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLElBQUksT0FBTyxDQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQy9DLE1BQU0sYUFBYSxHQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztpQkFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBUyxJQUFVLEVBQUUsRUFBVSxFQUFFLElBQTZCO2dCQUM5RSxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztnQkFDckIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsQ0FBQztpQkFDRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7aUJBQ2pCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDMUIsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEMsQ0FBQyxDQUFDLENBQUM7WUFFSCwrR0FBK0c7WUFDL0csb0JBQW9CO1lBRXBCLHFGQUFxRjtZQUNyRixtQ0FBbUM7WUFDbkMsdURBQXVEO1lBQ3ZELG9CQUFvQjtZQUNwQixtQkFBbUI7WUFDbkIsNkNBQTZDO1lBQzdDLG1EQUFtRDtZQUNuRCw2Q0FBNkM7WUFDN0Msb0VBQW9FO1lBQ3BFLFlBQVk7WUFDWixvQkFBb0I7WUFDcEIsMkVBQTJFO1lBQzNFLCtEQUErRDtZQUMvRCxNQUFNO1lBQ04sc0JBQXNCO1lBQ3RCLE9BQU87WUFDUCxNQUFNLE9BQU8sR0FBVSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtxQkFDckIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3FCQUNsQixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3hFO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFOUMsTUFBTSxXQUFXLEdBQUcsRUFBYyxDQUFDO1lBQ25DLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7aUJBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBVSxFQUFFLEVBQVUsRUFBRSxJQUE2QjtnQkFDOUUsTUFBTSxXQUFXLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsSUFBSSxDQUFDLFFBQW1CLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBRXRGLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxlQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN0RSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7aUJBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUNoQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ2pCLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQzVCLCtCQUErQjtvQkFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnR0FBZ0csQ0FBQyxDQUFDO29CQUM5RyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM3QyxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7aUJBQ2hFO2dCQUNELE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN2QixDQUFDLENBQUMsQ0FBQztZQUNILEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNsQixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckIsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ1gsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUMvQixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1NBQ3BDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUF0T0Qsa0JBc09DIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ3VscFRzID0gcmVxdWlyZSgnZ3VscC10eXBlc2NyaXB0Jyk7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3NlcCwgcmVzb2x2ZSwgam9pbiwgcmVsYXRpdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHR5cGUgRmlsZSBmcm9tICd2aW55bCc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZSwgUGFja2FnZVRzRGlycywgY2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcbmNvbnN0IHNvdXJjZW1hcHMgPSByZXF1aXJlKCdndWxwLXNvdXJjZW1hcHMnKTtcbmNvbnN0IFNFUCA9IHNlcDtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG4vLyBjb25zdCBub2RlTW9kdWxlcyA9IGpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcycpO1xuXG5pbnRlcmZhY2UgQXJncyB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xufVxuXG5pbnRlcmZhY2UgQ29tcG9uZW50RGlySW5mbyB7XG4gIHRzRGlyczogUGFja2FnZVRzRGlycztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgRW1pdExpc3QgPSBBcnJheTxbc3RyaW5nLCBudW1iZXJdPjtcblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzYyhhcmd2OiBBcmdzLCBvbkNvbXBpbGVkPzogKGVtaXR0ZWQ6IEVtaXRMaXN0KSA9PiB2b2lkKSB7XG4gIC8vIGNvbnN0IHBvc3NpYmxlU3JjRGlycyA9IFsnaXNvbScsICd0cyddO1xuICB2YXIgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB2YXIgY29tcFN0cmVhbSA9IFtdO1xuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgQ29tcG9uZW50RGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gYXJndi5qc3ggPyByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJykgOlxuICAgIHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xuICBpZiAoYmFzZVRzY29uZmlnLmVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihiYXNlVHNjb25maWcuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IHRzY29uZmlnIGZpbGU6ICcgKyBiYXNlVHNjb25maWdGaWxlKTtcbiAgfVxuICBsZXQgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcblxuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZVRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnMsXG4gICAgLy8gdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpLFxuICAgIC8vIENvbXBpbGVyIG9wdGlvbnNcbiAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICBvdXREaXI6ICcnLFxuICAgIC8vIHJvb3REaXI6IGNvbmZpZygpLnJvb3RQYXRoLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zLCB7ZW5hYmxlVHlwZVJvb3RzOiB0cnVlfSk7XG5cbiAgbGV0IGNvdW50UGtnID0gMDtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnKTtcblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzcm91Y2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oY29tcERpckluZm8udmFsdWVzKCkpLm1hcChlbCA9PiBlbC5kaXIpKTtcbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxDb21wb25lbnREaXJJbmZvPigpO1xuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uZGlyKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhwYWNrYWdlRGlyVHJlZS50cmF2ZXJzZSgpKTtcbiAgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgPSBjb21tb25Sb290RGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgLy8gY29uc29sZS5sb2coJ3Jvb3REaXI6JywgY29tbW9uUm9vdERpcik7XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIC8vIGNvbnN0IHBhY2thZ2VQYXRoID0gcmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzJywgbmFtZSk7XG4gICAgY29uc3QgZGlycyA9IGdldFRzRGlyc09mUGFja2FnZShqc29uKTtcbiAgICBjb25zdCBzcmNEaXJzID0gW2RpcnMuc3JjRGlyLCBkaXJzLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGpvaW4ocmVhbFBhdGgsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwge1xuICAgICAgdHNEaXJzOiBkaXJzLFxuICAgICAgZGlyOiByZWFsUGF0aFxuICAgIH0pO1xuICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUocmVhbFBhdGgsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCB0c1Byb2plY3QgPSBndWxwVHMuY3JlYXRlUHJvamVjdCh7Li4uY29tcGlsZXJPcHRpb25zLCB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0Jyl9KTtcblxuICBjb25zdCBkZWxheUNvbXBpbGUgPSBfLmRlYm91bmNlKCgpID0+IHtcbiAgICBjb25zdCB0b0NvbXBpbGUgPSBjb21wR2xvYnM7XG4gICAgY29tcEdsb2JzID0gW107XG4gICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdClcbiAgICAgIC50aGVuKCgpID0+IGNvbXBpbGUodG9Db21waWxlLCB0c1Byb2plY3QsIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCkpXG4gICAgICAuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpO1xuICAgIGlmIChvbkNvbXBpbGVkKVxuICAgICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS50aGVuKGVtaXR0ZWQgPT4ge1xuICAgICAgICBvbkNvbXBpbGVkKGVtaXR0ZWQpO1xuICAgICAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAgIH0pO1xuICB9LCAyMDApO1xuXG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICBjb25zdCB3YXRjaERpcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29tcEdsb2JzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICAgIFtpbmZvLnRzRGlycy5zcmNEaXIsIGluZm8udHNEaXJzLmlzb21EaXJdLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IGpvaW4oaW5mby5kaXIsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2god2F0Y2hEaXJzLCB7aWdub3JlZDogLyhcXC5kXFwudHN8XFwuanMpJC8gfSk7XG4gICAgd2F0Y2hlci5vbignYWRkJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdhZGRlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2NoYW5nZWQnKSk7XG4gICAgd2F0Y2hlci5vbigndW5saW5rJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdyZW1vdmVkJykpO1xuICB9IGVsc2Uge1xuICAgIHByb21Db21waWxlID0gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlRmlsZShwYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgaWYgKHJlYXNvbiAhPT0gJ3JlbW92ZWQnKVxuICAgICAgY29tcEdsb2JzLnB1c2gocGF0aCk7XG4gICAgbG9nLmluZm8oYEZpbGUgJHtjaGFsay5jeWFuKHJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbiAgICBkZWxheUNvbXBpbGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBpbGUoY29tcEdsb2JzOiBzdHJpbmdbXSwgdHNQcm9qZWN0OiBhbnksIGlubGluZVNvdXJjZU1hcDogYm9vbGVhbiwgZW1pdFRkc09ubHkgPSBmYWxzZSkge1xuICAgIGNvbnN0IGd1bHBCYXNlID0gcm9vdCArIFNFUDtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIGZ1bmN0aW9uIHByaW50RHVyYXRpb24oaXNFcnJvcjogYm9vbGVhbikge1xuICAgICAgY29uc3Qgc2VjID0gTWF0aC5jZWlsKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICAgIGNvbnN0IG1pbiA9IGAke01hdGguZmxvb3Ioc2VjIC8gNjApfSBtaW51dGVzICR7c2VjICUgNjB9IHNlY2VuZHNgO1xuICAgICAgbG9nLmluZm8oYENvbXBpbGVkICR7aXNFcnJvciA/ICd3aXRoIGVycm9ycyAnIDogJyd9aW4gYCArIG1pbik7XG4gICAgfVxuXG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBmdW5jdGlvbiBjaGFuZ2VQYXRoKCkge1xuICAgICAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY3dkLCBmaWxlLnBhdGgpO1xuICAgICAgICBjb25zdCB7dHNEaXJzLCBkaXJ9ID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCkhO1xuICAgICAgICBjb25zdCBhYnNGaWxlID0gcmVzb2x2ZShjb21tb25Sb290RGlyLCB0cmVlUGF0aCk7XG4gICAgICAgIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShkaXIsIGFic0ZpbGUpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhkaXIsIHRzRGlycyk7ICBcbiAgICAgICAgZm9yIChjb25zdCBwcmVmaXggb2YgW3RzRGlycy5zcmNEaXIsIHRzRGlycy5pc29tRGlyXSkge1xuICAgICAgICAgIGlmIChwcmVmaXggPT09ICcuJyB8fCBwcmVmaXgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgdHNEaXJzLmRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgocHJlZml4ICsgc2VwKSkge1xuICAgICAgICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIHRzRGlycy5kZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHByZWZpeC5sZW5ndGggKyAxKSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZmlsZS5iYXNlID0gY29tbW9uUm9vdERpcjtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZmlsZS5iYXNlLCBmaWxlLnJlbGF0aXZlKTtcbiAgICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxFbWl0TGlzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgY29tcGlsZUVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IHRzUmVzdWx0ID0gZ3VscC5zcmMoY29tcEdsb2JzKVxuICAgICAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gICAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBGaWxlLCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICBmaWxlLmJhc2UgPSBndWxwQmFzZTtcbiAgICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAgIH0pKVxuICAgICAgLnBpcGUodHNQcm9qZWN0KCkpXG4gICAgICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBMSjogTGV0J3MgdHJ5IHRvIHVzZSAtLXNvdXJjZU1hcCB3aXRoIC0taW5saW5lU291cmNlLCBzbyB0aGF0IEkgZG9uJ3QgbmVlZCB0byBjaGFuZ2UgZmlsZSBwYXRoIGluIHNvdXJjZSBtYXBcbiAgICAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbiAgICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIC8vICAgaWYgKGZpbGUuZXh0bmFtZSA9PT0gJy5tYXAnKSB7XG4gICAgICAvLyAgICAgY29uc3Qgc20gPSBKU09OLnBhcnNlKGZpbGUuY29udGVudHMudG9TdHJpbmcoKSk7XG4gICAgICAvLyAgICAgbGV0IHNGaWxlRGlyO1xuICAgICAgLy8gICAgIHNtLnNvdXJjZXMgPVxuICAgICAgLy8gICAgICAgc20uc291cmNlcy5tYXAoIChzcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAvLyAgICAgICAgIGNvbnN0IHJlYWxGaWxlID0gZnMucmVhbHBhdGhTeW5jKHNwYXRoKTtcbiAgICAgIC8vICAgICAgICAgc0ZpbGVEaXIgPSBQYXRoLmRpcm5hbWUocmVhbEZpbGUpO1xuICAgICAgLy8gICAgICAgICByZXR1cm4gcmVsYXRpdmUoZmlsZS5iYXNlLCByZWFsRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgLy8gICAgICAgfSk7XG4gICAgICAvLyAgICAgaWYgKHNGaWxlRGlyKVxuICAgICAgLy8gICAgICAgc20uc291cmNlUm9vdCA9IHJlbGF0aXZlKHNGaWxlRGlyLCBmaWxlLmJhc2UpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIC8vICAgICBmaWxlLmNvbnRlbnRzID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoc20pLCAndXRmOCcpO1xuICAgICAgLy8gICB9XG4gICAgICAvLyAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICAvLyB9KSk7XG4gICAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgICAgaWYgKCFlbWl0VGRzT25seSkge1xuICAgICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuanNcbiAgICAgICAgICAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgICAgLnBpcGUoaW5saW5lU291cmNlTWFwID8gc291cmNlbWFwcy53cml0ZSgpIDogc291cmNlbWFwcy53cml0ZSgnLicpKSk7XG4gICAgICB9XG4gICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuZHRzLnBpcGUoY2hhbmdlUGF0aCgpKSk7XG5cbiAgICAgIGNvbnN0IGVtaXR0ZWRMaXN0ID0gW10gYXMgRW1pdExpc3Q7XG4gICAgICBjb25zdCBhbGwgPSBtZXJnZShzdHJlYW1zKVxuICAgICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgZGlzcGxheVBhdGggPSByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlLnBhdGgpO1xuICAgICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoKGZpbGUuY29udGVudHMgYXMgQnVmZmVyKS5ieXRlTGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlQnJpZ2h0KGRpc3BsYXlTaXplICsgJycpKTtcbiAgICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlKGd1bHAuZGVzdChjb21tb25Sb290RGlyKSk7XG4gICAgICBhbGwucmVzdW1lKCk7XG4gICAgICBhbGwub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICBjb25zb2xlLmxvZygnXFxuLS0tLS0tLS0tLSBGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzLCBjaGVjayBvdXQgYmVsb3cgZXJyb3IgbWVzc2FnZSAtLS0tLS0tLS0tLS0tXFxuJyk7XG4gICAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgICB9KTtcbiAgICAgIGFsbC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pXG4gICAgLnRoZW4oZW1pdHRlZExpc3QgPT4ge1xuICAgICAgcHJpbnREdXJhdGlvbihmYWxzZSk7XG4gICAgICByZXR1cm4gZW1pdHRlZExpc3Q7XG4gICAgfSlcbiAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgIHByaW50RHVyYXRpb24odHJ1ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwcm9tQ29tcGlsZS50aGVuKChsaXN0KSA9PiB7XG4gICAgaWYgKGFyZ3Yud2F0Y2ggIT09IHRydWUgJiYgcHJvY2Vzcy5zZW5kKSB7XG4gICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbiAgfSk7XG59XG4iXX0=