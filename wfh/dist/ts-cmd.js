"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require('gulp-typescript');
const packageUtils = require('../lib/packageMgr/packageUtils');
const chalk = require('chalk');
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const utils_1 = require("./utils");
const gulp = require('gulp');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const config = require('../lib/config');
const SEP = Path.sep;
require('../lib/logConfig')(config());
const log = require('log4js').getLogger('wfh.typescript');
// exports.init = init;
const root = config().rootPath;
const nodeModules = Path.join(root, 'node_modules');
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
    const baseTsconfig = argv.jsx ? require('../tsconfig-tsx.json') : require('../tsconfig.json');
    let promCompile = Promise.resolve([]);
    const tsProject = ts.createProject(Object.assign({}, baseTsconfig.compilerOptions, {
        typescript: require('typescript'),
        // Compiler options
        importHelpers: true,
        outDir: '',
        baseUrl: root,
        rootDir: undefined,
        skipLibCheck: true,
        inlineSourceMap: false,
        sourceMap: true,
        emitDeclarationOnly: argv.ed
        // typeRoots: [
        //   Path.join('node_modules/@types'),
        //   Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
        // ]
    }));
    if (argv.package && argv.package.length > 0)
        packageUtils.findAllPackages(argv.package, onComponent, 'src');
    else if (argv.project && argv.project.length > 0) {
        packageUtils.findAllPackages(onComponent, 'src', argv.project);
    }
    else
        packageUtils.findAllPackages(onComponent, 'src');
    function onComponent(name, entryPath, parsedName, json, packagePath) {
        const dirs = utils_1.getTsDirsOfPackage(json);
        const srcDirs = [dirs.srcDir, dirs.isomDir].filter(srcDir => {
            try {
                return fs.statSync(Path.join(packagePath, srcDir)).isDirectory();
            }
            catch (e) {
                return false;
            }
        });
        compDirInfo.set(name, {
            tsDirs: dirs,
            dir: packagePath
        });
        srcDirs.forEach(srcDir => {
            const relPath = Path.resolve(packagePath, srcDir).replace(/\\/g, '/');
            compGlobs.push(relPath + '/**/*.ts', relPath + '/**/*.tsx');
        });
    }
    const delayCompile = _.debounce(() => __awaiter(this, void 0, void 0, function* () {
        const toCompile = compGlobs;
        compGlobs = [];
        promCompile = promCompile.catch(() => [])
            .then(() => compile(toCompile, tsProject, compDirInfo, argv.sourceMap === 'inline', argv.ed))
            .catch(() => []);
        if (onCompiled)
            promCompile = promCompile.then(emitted => {
                onCompiled(emitted);
                return emitted;
            });
    }), 200);
    if (argv.watch) {
        log.info('Watch mode');
        const watchDirs = [];
        compGlobs = [];
        for (const info of compDirInfo.values()) {
            [info.tsDirs.srcDir, info.tsDirs.isomDir].forEach(srcDir => {
                const relPath = Path.join(info.dir, srcDir).replace(/\\/g, '/');
                watchDirs.push(relPath + '/**/*.ts', relPath + '/**/*.tsx');
            });
        }
        const watcher = chokidar.watch(watchDirs, { ignored: /(\.d\.ts|\.js)$/ });
        watcher.on('add', (path) => onChangeFile(path, 'added'));
        watcher.on('change', (path) => onChangeFile(path, 'changed'));
        watcher.on('unlink', (path) => onChangeFile(path, 'removed'));
    }
    else {
        return compile(compGlobs, tsProject, compDirInfo, argv.sourceMap === 'inline', argv.ed);
    }
    function onChangeFile(path, reason) {
        if (reason !== 'removed')
            compGlobs.push(path);
        log.info(`File ${chalk.cyan(Path.relative(root, path))} has been ` + chalk.yellow(reason));
        delayCompile();
    }
    return promCompile;
}
exports.tsc = tsc;
function compile(compGlobs, tsProject, compDirInfo, inlineSourceMap, emitTdsOnly = false) {
    const gulpBase = root + SEP;
    const startTime = new Date().getTime();
    function printDuration(isError) {
        const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
        const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
        log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
    }
    function changePath() {
        return through.obj(function (file, en, next) {
            const shortPath = Path.relative(nodeModules, file.path);
            let packageName = /^((?:@[^/\\]+[/\\])?[^/\\]+)/.exec(shortPath)[1];
            if (SEP === '\\')
                packageName = packageName.replace(/\\/g, '/');
            if (!compDirInfo.has(packageName)) {
                throw new Error('Cound not find package info for:' + file);
            }
            const { tsDirs, dir } = compDirInfo.get(packageName);
            const packageRelPath = Path.relative(dir, file.path);
            if (!Path.relative(tsDirs.srcDir, packageRelPath).startsWith('..')) {
                file.path = Path.resolve(nodeModules, packageName, tsDirs.destDir, shortPath.substring(packageName.length + 1 + (tsDirs.srcDir.length > 0 ? tsDirs.srcDir.length + 1 : 0)));
            }
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
        //         return Path.relative(file.base, realFile).replace(/\\/g, '/');
        //       });
        //     if (sFileDir)
        //       sm.sourceRoot = Path.relative(sFileDir, file.base).replace(/\\/g, '/');
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
            const displayPath = Path.relative(nodeModules, file.path);
            const displaySize = Math.round(file.contents.length / 1024 * 10) / 10;
            log.info('%s %s Kb', displayPath, chalk.blue(displaySize));
            emittedList.push([displayPath, displaySize]);
            next(null, file);
        }))
            .pipe(gulp.dest(root));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDdEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLG1DQUEwRDtBQUMxRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDOUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFFckIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUQsdUJBQXVCO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQUMvQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQWtCcEQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQVUsRUFBRSxVQUF3QztJQUN0RSwwQ0FBMEM7SUFDMUMsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQzdCLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNwSCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDOUYsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBRSxFQUFjLENBQUMsQ0FBQztJQUNuRCxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxlQUFlLEVBQUU7UUFDakYsVUFBVSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDakMsbUJBQW1CO1FBQ25CLGFBQWEsRUFBRSxJQUFJO1FBQ25CLE1BQU0sRUFBRSxFQUFFO1FBQ1YsT0FBTyxFQUFFLElBQUk7UUFDYixPQUFPLEVBQUUsU0FBUztRQUNsQixZQUFZLEVBQUUsSUFBSTtRQUNsQixlQUFlLEVBQUUsS0FBSztRQUN0QixTQUFTLEVBQUUsSUFBSTtRQUNmLG1CQUFtQixFQUFFLElBQUksQ0FBQyxFQUFFO1FBQzVCLGVBQWU7UUFDZixzQ0FBc0M7UUFDdEMsMkZBQTJGO1FBQzNGLElBQUk7S0FDTCxDQUFDLENBQUMsQ0FBQztJQUNKLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3pDLFlBQVksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDNUQsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNoRCxZQUFZLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ2hFOztRQUNDLFlBQVksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRW5ELFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxTQUFpQixFQUFFLFVBQWtCLEVBQUUsSUFBUyxFQUFFLFdBQW1CO1FBQ3RHLE1BQU0sSUFBSSxHQUFHLDBCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzFELElBQUk7Z0JBQ0YsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDbEU7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixPQUFPLEtBQUssQ0FBQzthQUNkO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtZQUNwQixNQUFNLEVBQUUsSUFBSTtZQUNaLEdBQUcsRUFBRSxXQUFXO1NBQ2pCLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN0RSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLEVBQUUsT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBUyxFQUFFO1FBQ3pDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUM1QixTQUFTLEdBQUcsRUFBRSxDQUFDO1FBRWYsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBYyxDQUFDO2FBQ2xELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzVGLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFjLENBQUMsQ0FBQztRQUMvQixJQUFJLFVBQVU7WUFDWixXQUFXLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDdkMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNwQixPQUFPLE9BQU8sQ0FBQztZQUNqQixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRVIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QixNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7UUFDL0IsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVmLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3ZDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLEVBQUUsT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1lBQzlELENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDekUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNqRSxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7S0FDdkU7U0FBTTtRQUNMLE9BQU8sT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN6RjtJQUVELFNBQVMsWUFBWSxDQUFDLElBQVksRUFBRSxNQUFjO1FBQ2hELElBQUksTUFBTSxLQUFLLFNBQVM7WUFDdEIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzNGLFlBQVksRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBMUZELGtCQTBGQztBQUVELFNBQVMsT0FBTyxDQUFDLFNBQW1CLEVBQUUsU0FBYyxFQUNsRCxXQUEwQyxFQUFFLGVBQXdCLEVBQUUsV0FBVyxHQUFHLEtBQUs7SUFDekYsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztJQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRXZDLFNBQVMsYUFBYSxDQUFDLE9BQWdCO1FBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLFlBQVksR0FBRyxHQUFHLEVBQUUsVUFBVSxDQUFDO1FBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELFNBQVMsVUFBVTtRQUNqQixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBUyxJQUFTLEVBQUUsRUFBVSxFQUFFLElBQTZCO1lBQzlFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4RCxJQUFJLFdBQVcsR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckUsSUFBSSxHQUFHLEtBQUssSUFBSTtnQkFDZCxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDNUQ7WUFDRCxNQUFNLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFFLENBQUM7WUFDcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXJELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsT0FBTyxFQUMvRCxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM1RztZQUNELElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUMvQyxNQUFNLGFBQWEsR0FBYSxFQUFFLENBQUM7UUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7YUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxFQUFVLEVBQUUsSUFBNkI7WUFDN0UsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7WUFDckIsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQzthQUNGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzthQUNqQixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBVSxFQUFFLEVBQUU7WUFDMUIsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7UUFFSCwrR0FBK0c7UUFDL0csb0JBQW9CO1FBRXBCLHFGQUFxRjtRQUNyRixtQ0FBbUM7UUFDbkMsdURBQXVEO1FBQ3ZELG9CQUFvQjtRQUNwQixtQkFBbUI7UUFDbkIsNkNBQTZDO1FBQzdDLG1EQUFtRDtRQUNuRCw2Q0FBNkM7UUFDN0MseUVBQXlFO1FBQ3pFLFlBQVk7UUFDWixvQkFBb0I7UUFDcEIsZ0ZBQWdGO1FBQ2hGLCtEQUErRDtRQUMvRCxNQUFNO1FBQ04sc0JBQXNCO1FBQ3RCLE9BQU87UUFDUCxNQUFNLE9BQU8sR0FBVSxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2lCQUNyQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7aUJBQ2xCLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDeEU7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5QyxNQUFNLFdBQVcsR0FBRyxFQUFjLENBQUM7UUFDbkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQzthQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxFQUFVLEVBQUUsSUFBNkI7WUFDN0UsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUV0RSxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDO2FBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2QixHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFDakIsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDNUIsK0JBQStCO2dCQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGdHQUFnRyxDQUFDLENBQUM7Z0JBQzlHLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FBQzthQUNoRTtZQUNELE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFCLENBQUMsQ0FBQztTQUNELElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRTtRQUNsQixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckIsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQyxDQUFDO1NBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1gsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCB0cyA9IHJlcXVpcmUoJ2d1bHAtdHlwZXNjcmlwdCcpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRUc0RpcnNPZlBhY2thZ2UsIFBhY2thZ2VUc0RpcnN9IGZyb20gJy4vdXRpbHMnO1xuY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcbmNvbnN0IHNvdXJjZW1hcHMgPSByZXF1aXJlKCdndWxwLXNvdXJjZW1hcHMnKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2xpYi9jb25maWcnKTtcbmNvbnN0IFNFUCA9IFBhdGguc2VwO1xuXG5yZXF1aXJlKCcuLi9saWIvbG9nQ29uZmlnJykoY29uZmlnKCkpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmgudHlwZXNjcmlwdCcpO1xuLy8gZXhwb3J0cy5pbml0ID0gaW5pdDtcbmNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcbmNvbnN0IG5vZGVNb2R1bGVzID0gUGF0aC5qb2luKHJvb3QsICdub2RlX21vZHVsZXMnKTtcblxuaW50ZXJmYWNlIEFyZ3Mge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIENvbXBvbmVudERpckluZm8ge1xuICB0c0RpcnM6IFBhY2thZ2VUc0RpcnM7XG4gIGRpcjogc3RyaW5nO1xufVxuXG50eXBlIEVtaXRMaXN0ID0gQXJyYXk8W3N0cmluZywgbnVtYmVyXT47XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c2MoYXJndjogQXJncywgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCkge1xuICAvLyBjb25zdCBwb3NzaWJsZVNyY0RpcnMgPSBbJ2lzb20nLCAndHMnXTtcbiAgdmFyIGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnID0gYXJndi5qc3ggPyByZXF1aXJlKCcuLi90c2NvbmZpZy10c3guanNvbicpIDogcmVxdWlyZSgnLi4vdHNjb25maWcuanNvbicpO1xuICBsZXQgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcbiAgY29uc3QgdHNQcm9qZWN0ID0gdHMuY3JlYXRlUHJvamVjdChPYmplY3QuYXNzaWduKHt9LCBiYXNlVHNjb25maWcuY29tcGlsZXJPcHRpb25zLCB7XG4gICAgdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpLFxuICAgIC8vIENvbXBpbGVyIG9wdGlvbnNcbiAgICBpbXBvcnRIZWxwZXJzOiB0cnVlLFxuICAgIG91dERpcjogJycsXG4gICAgYmFzZVVybDogcm9vdCxcbiAgICByb290RGlyOiB1bmRlZmluZWQsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWRcbiAgICAvLyB0eXBlUm9vdHM6IFtcbiAgICAvLyAgIFBhdGguam9pbignbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgIC8vICAgUGF0aC5qb2luKFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSksICcvd2ZoL3R5cGVzJylcbiAgICAvLyBdXG4gIH0pKTtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuICAgIGNvbnN0IGRpcnMgPSBnZXRUc0RpcnNPZlBhY2thZ2UoanNvbik7XG4gICAgY29uc3Qgc3JjRGlycyA9IFtkaXJzLnNyY0RpciwgZGlycy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhQYXRoLmpvaW4ocGFja2FnZVBhdGgsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwge1xuICAgICAgdHNEaXJzOiBkaXJzLFxuICAgICAgZGlyOiBwYWNrYWdlUGF0aFxuICAgIH0pO1xuICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJywgcmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRvQ29tcGlsZSA9IGNvbXBHbG9icztcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpXG4gICAgICAudGhlbigoKSA9PiBjb21waWxlKHRvQ29tcGlsZSwgdHNQcm9qZWN0LCBjb21wRGlySW5mbywgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIGNvbnN0IHdhdGNoRGlyczogc3RyaW5nW10gPSBbXTtcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgICAgW2luZm8udHNEaXJzLnNyY0RpciwgaW5mby50c0RpcnMuaXNvbURpcl0uZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5qb2luKGluZm8uZGlyLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycsIHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHdhdGNoRGlycywge2lnbm9yZWQ6IC8oXFwuZFxcLnRzfFxcLmpzKSQvIH0pO1xuICAgIHdhdGNoZXIub24oJ2FkZCcsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnYWRkZWQnKSk7XG4gICAgd2F0Y2hlci5vbignY2hhbmdlJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdjaGFuZ2VkJykpO1xuICAgIHdhdGNoZXIub24oJ3VubGluaycsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAncmVtb3ZlZCcpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tcERpckluZm8sIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZUZpbGUocGF0aDogc3RyaW5nLCByZWFzb246IHN0cmluZykge1xuICAgIGlmIChyZWFzb24gIT09ICdyZW1vdmVkJylcbiAgICAgIGNvbXBHbG9icy5wdXNoKHBhdGgpO1xuICAgIGxvZy5pbmZvKGBGaWxlICR7Y2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbiAgICBkZWxheUNvbXBpbGUoKTtcbiAgfVxuXG4gIHJldHVybiBwcm9tQ29tcGlsZTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSxcbiAgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+LCBpbmxpbmVTb3VyY2VNYXA6IGJvb2xlYW4sIGVtaXRUZHNPbmx5ID0gZmFsc2UpIHtcbiAgY29uc3QgZ3VscEJhc2UgPSByb290ICsgU0VQO1xuICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICBmdW5jdGlvbiBwcmludER1cmF0aW9uKGlzRXJyb3I6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzZWMgPSBNYXRoLmNlaWwoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgIGNvbnN0IG1pbiA9IGAke01hdGguZmxvb3Ioc2VjIC8gNjApfSBtaW51dGVzICR7c2VjICUgNjB9IHNlY2VuZHNgO1xuICAgIGxvZy5pbmZvKGBDb21waWxlZCAke2lzRXJyb3IgPyAnd2l0aCBlcnJvcnMgJyA6ICcnfWluIGAgKyBtaW4pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlUGF0aCgpIHtcbiAgICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3Qgc2hvcnRQYXRoID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlcywgZmlsZS5wYXRoKTtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IC9eKCg/OkBbXi9cXFxcXStbL1xcXFxdKT9bXi9cXFxcXSspLy5leGVjKHNob3J0UGF0aCkhWzFdO1xuICAgICAgaWYgKFNFUCA9PT0gJ1xcXFwnKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmICghY29tcERpckluZm8uaGFzKHBhY2thZ2VOYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdW5kIG5vdCBmaW5kIHBhY2thZ2UgaW5mbyBmb3I6JyArIGZpbGUpO1xuICAgICAgfVxuICAgICAgY29uc3Qge3RzRGlycywgZGlyfSA9IGNvbXBEaXJJbmZvLmdldChwYWNrYWdlTmFtZSkhO1xuICAgICAgY29uc3QgcGFja2FnZVJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKGRpciwgZmlsZS5wYXRoKTtcblxuICAgICAgaWYgKCFQYXRoLnJlbGF0aXZlKHRzRGlycy5zcmNEaXIsIHBhY2thZ2VSZWxQYXRoKS5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICAgIGZpbGUucGF0aCA9IFBhdGgucmVzb2x2ZShub2RlTW9kdWxlcywgcGFja2FnZU5hbWUsIHRzRGlycy5kZXN0RGlyLFxuICAgICAgICAgIHNob3J0UGF0aC5zdWJzdHJpbmcocGFja2FnZU5hbWUubGVuZ3RoICsgMSArICh0c0RpcnMuc3JjRGlyLmxlbmd0aCA+IDAgPyB0c0RpcnMuc3JjRGlyLmxlbmd0aCArIDEgOiAwKSkpO1xuICAgICAgfVxuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxFbWl0TGlzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdHNSZXN1bHQgPSBndWxwLnNyYyhjb21wR2xvYnMpXG4gICAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgZmlsZS5iYXNlID0gZ3VscEJhc2U7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pKVxuICAgIC5waXBlKHRzUHJvamVjdCgpKVxuICAgIC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIExKOiBMZXQncyB0cnkgdG8gdXNlIC0tc291cmNlTWFwIHdpdGggLS1pbmxpbmVTb3VyY2UsIHNvIHRoYXQgSSBkb24ndCBuZWVkIHRvIGNoYW5nZSBmaWxlIHBhdGggaW4gc291cmNlIG1hcFxuICAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbiAgICAvLyAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgLy8gICBpZiAoZmlsZS5leHRuYW1lID09PSAnLm1hcCcpIHtcbiAgICAvLyAgICAgY29uc3Qgc20gPSBKU09OLnBhcnNlKGZpbGUuY29udGVudHMudG9TdHJpbmcoKSk7XG4gICAgLy8gICAgIGxldCBzRmlsZURpcjtcbiAgICAvLyAgICAgc20uc291cmNlcyA9XG4gICAgLy8gICAgICAgc20uc291cmNlcy5tYXAoIChzcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgLy8gICAgICAgICBjb25zdCByZWFsRmlsZSA9IGZzLnJlYWxwYXRoU3luYyhzcGF0aCk7XG4gICAgLy8gICAgICAgICBzRmlsZURpciA9IFBhdGguZGlybmFtZShyZWFsRmlsZSk7XG4gICAgLy8gICAgICAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZShmaWxlLmJhc2UsIHJlYWxGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgICAgfSk7XG4gICAgLy8gICAgIGlmIChzRmlsZURpcilcbiAgICAvLyAgICAgICBzbS5zb3VyY2VSb290ID0gUGF0aC5yZWxhdGl2ZShzRmlsZURpciwgZmlsZS5iYXNlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgIGZpbGUuY29udGVudHMgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShzbSksICd1dGY4Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIC8vIH0pKTtcbiAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgIGlmICghZW1pdFRkc09ubHkpIHtcbiAgICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5qc1xuICAgICAgICAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgIC5waXBlKGlubGluZVNvdXJjZU1hcCA/IHNvdXJjZW1hcHMud3JpdGUoKSA6IHNvdXJjZW1hcHMud3JpdGUoJy4nKSkpO1xuICAgIH1cbiAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuZHRzLnBpcGUoY2hhbmdlUGF0aCgpKSk7XG5cbiAgICBjb25zdCBlbWl0dGVkTGlzdCA9IFtdIGFzIEVtaXRMaXN0O1xuICAgIGNvbnN0IGFsbCA9IG1lcmdlKHN0cmVhbXMpXG4gICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3QgZGlzcGxheVBhdGggPSBQYXRoLnJlbGF0aXZlKG5vZGVNb2R1bGVzLCBmaWxlLnBhdGgpO1xuICAgICAgY29uc3QgZGlzcGxheVNpemUgPSBNYXRoLnJvdW5kKGZpbGUuY29udGVudHMubGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICBsb2cuaW5mbygnJXMgJXMgS2InLCBkaXNwbGF5UGF0aCwgY2hhbGsuYmx1ZShkaXNwbGF5U2l6ZSkpO1xuICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pKVxuICAgIC5waXBlKGd1bHAuZGVzdChyb290KSk7XG4gICAgYWxsLnJlc3VtZSgpO1xuICAgIGFsbC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgIGNvbnNvbGUubG9nKCdcXG4tLS0tLS0tLS0tIEZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMsIGNoZWNrIG91dCBiZWxvdyBlcnJvciBtZXNzYWdlIC0tLS0tLS0tLS0tLS1cXG4nKTtcbiAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzJykpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgfSk7XG4gICAgYWxsLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pXG4gIC50aGVuKGVtaXR0ZWRMaXN0ID0+IHtcbiAgICBwcmludER1cmF0aW9uKGZhbHNlKTtcbiAgICByZXR1cm4gZW1pdHRlZExpc3Q7XG4gIH0pXG4gIC5jYXRjaChlcnIgPT4ge1xuICAgIHByaW50RHVyYXRpb24odHJ1ZSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gIH0pO1xufVxuIl19