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
            compGlobs.push(relPath + '/**/*.ts');
            if (argv.jsx) {
                compGlobs.push(relPath + '/**/*.tsx');
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDdEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLG1DQUEwRDtBQUMxRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDOUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFFckIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUQsdUJBQXVCO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQUMvQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQWtCcEQ7Ozs7OztHQU1HO0FB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QUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUM7U0FDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDbEIsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNYLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgdHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlLCBQYWNrYWdlVHNEaXJzfSBmcm9tICcuL3V0aWxzJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBTRVAgPSBQYXRoLnNlcDtcblxucmVxdWlyZSgnLi4vbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5jb25zdCBub2RlTW9kdWxlcyA9IFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzJyk7XG5cbmludGVyZmFjZSBBcmdzIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBDb21wb25lbnREaXJJbmZvIHtcbiAgdHNEaXJzOiBQYWNrYWdlVHNEaXJzO1xuICBkaXI6IHN0cmluZztcbn1cblxudHlwZSBFbWl0TGlzdCA9IEFycmF5PFtzdHJpbmcsIG51bWJlcl0+O1xuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IEFyZ3MsIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIHZhciBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHZhciBjb21wU3RyZWFtID0gW107XG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBDb21wb25lbnREaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IGFyZ3YuanN4ID8gcmVxdWlyZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKSA6IHJlcXVpcmUoJy4uL3RzY29uZmlnLmpzb24nKTtcbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHRzUHJvamVjdCA9IHRzLmNyZWF0ZVByb2plY3QoT2JqZWN0LmFzc2lnbih7fSwgYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAvLyBDb21waWxlciBvcHRpb25zXG4gICAgaW1wb3J0SGVscGVyczogdHJ1ZSxcbiAgICBvdXREaXI6ICcnLFxuICAgIGJhc2VVcmw6IHJvb3QsXG4gICAgcm9vdERpcjogdW5kZWZpbmVkLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gdHlwZVJvb3RzOiBbXG4gICAgLy8gICBQYXRoLmpvaW4oJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAvLyAgIFBhdGguam9pbihQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpLCAnL3dmaC90eXBlcycpXG4gICAgLy8gXVxuICB9KSk7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhhcmd2LnBhY2thZ2UsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnLCBhcmd2LnByb2plY3QpO1xuICB9IGVsc2VcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJyk7XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBkaXJzID0gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb24pO1xuICAgIGNvbnN0IHNyY0RpcnMgPSBbZGlycy5zcmNEaXIsIGRpcnMuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBzcmNEaXIpKS5pc0RpcmVjdG9yeSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHtcbiAgICAgIHRzRGlyczogZGlycyxcbiAgICAgIGRpcjogcGFja2FnZVBhdGhcbiAgICB9KTtcbiAgICBzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBkZWxheUNvbXBpbGUgPSBfLmRlYm91bmNlKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB0b0NvbXBpbGUgPSBjb21wR2xvYnM7XG4gICAgY29tcEdsb2JzID0gW107XG5cbiAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KVxuICAgICAgLnRoZW4oKCkgPT4gY29tcGlsZSh0b0NvbXBpbGUsIHRzUHJvamVjdCwgY29tcERpckluZm8sIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCkpXG4gICAgICAuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpO1xuICAgIGlmIChvbkNvbXBpbGVkKVxuICAgICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS50aGVuKGVtaXR0ZWQgPT4ge1xuICAgICAgICBvbkNvbXBpbGVkKGVtaXR0ZWQpO1xuICAgICAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAgIH0pO1xuICB9LCAyMDApO1xuXG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICBjb25zdCB3YXRjaERpcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29tcEdsb2JzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICAgIFtpbmZvLnRzRGlycy5zcmNEaXIsIGluZm8udHNEaXJzLmlzb21EaXJdLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGguam9pbihpbmZvLmRpciwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaCh3YXRjaERpcnMsIHtpZ25vcmVkOiAvKFxcLmRcXC50c3xcXC5qcykkLyB9KTtcbiAgICB3YXRjaGVyLm9uKCdhZGQnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2FkZGVkJykpO1xuICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnY2hhbmdlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCd1bmxpbmsnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ3JlbW92ZWQnKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGNvbXBEaXJJbmZvLCBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsIGFyZ3YuZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25DaGFuZ2VGaWxlKHBhdGg6IHN0cmluZywgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBpZiAocmVhc29uICE9PSAncmVtb3ZlZCcpXG4gICAgICBjb21wR2xvYnMucHVzaChwYXRoKTtcbiAgICBsb2cuaW5mbyhgRmlsZSAke2NoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShyb290LCBwYXRoKSl9IGhhcyBiZWVuIGAgKyBjaGFsay55ZWxsb3cocmVhc29uKSk7XG4gICAgZGVsYXlDb21waWxlKCk7XG4gIH1cblxuICByZXR1cm4gcHJvbUNvbXBpbGU7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGUoY29tcEdsb2JzOiBzdHJpbmdbXSwgdHNQcm9qZWN0OiBhbnksXG4gIGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBDb21wb25lbnREaXJJbmZvPiwgaW5saW5lU291cmNlTWFwOiBib29sZWFuLCBlbWl0VGRzT25seSA9IGZhbHNlKSB7XG4gIGNvbnN0IGd1bHBCYXNlID0gcm9vdCArIFNFUDtcbiAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgZnVuY3Rpb24gcHJpbnREdXJhdGlvbihpc0Vycm9yOiBib29sZWFuKSB7XG4gICAgY29uc3Qgc2VjID0gTWF0aC5jZWlsKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICBjb25zdCBtaW4gPSBgJHtNYXRoLmZsb29yKHNlYyAvIDYwKX0gbWludXRlcyAke3NlYyAlIDYwfSBzZWNlbmRzYDtcbiAgICBsb2cuaW5mbyhgQ29tcGlsZWQgJHtpc0Vycm9yID8gJ3dpdGggZXJyb3JzICcgOiAnJ31pbiBgICsgbWluKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZVBhdGgoKSB7XG4gICAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IHNob3J0UGF0aCA9IFBhdGgucmVsYXRpdmUobm9kZU1vZHVsZXMsIGZpbGUucGF0aCk7XG4gICAgICBsZXQgcGFja2FnZU5hbWUgPSAvXigoPzpAW14vXFxcXF0rWy9cXFxcXSk/W14vXFxcXF0rKS8uZXhlYyhzaG9ydFBhdGgpIVsxXTtcbiAgICAgIGlmIChTRVAgPT09ICdcXFxcJylcbiAgICAgICAgcGFja2FnZU5hbWUgPSBwYWNrYWdlTmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoIWNvbXBEaXJJbmZvLmhhcyhwYWNrYWdlTmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VuZCBub3QgZmluZCBwYWNrYWdlIGluZm8gZm9yOicgKyBmaWxlKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHt0c0RpcnMsIGRpcn0gPSBjb21wRGlySW5mby5nZXQocGFja2FnZU5hbWUpITtcbiAgICAgIGNvbnN0IHBhY2thZ2VSZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShkaXIsIGZpbGUucGF0aCk7XG5cbiAgICAgIGlmICghUGF0aC5yZWxhdGl2ZSh0c0RpcnMuc3JjRGlyLCBwYWNrYWdlUmVsUGF0aCkuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgICAgICBmaWxlLnBhdGggPSBQYXRoLnJlc29sdmUobm9kZU1vZHVsZXMsIHBhY2thZ2VOYW1lLCB0c0RpcnMuZGVzdERpcixcbiAgICAgICAgICBzaG9ydFBhdGguc3Vic3RyaW5nKHBhY2thZ2VOYW1lLmxlbmd0aCArIDEgKyAodHNEaXJzLnNyY0Rpci5sZW5ndGggPiAwID8gdHNEaXJzLnNyY0Rpci5sZW5ndGggKyAxIDogMCkpKTtcbiAgICAgIH1cbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2U8RW1pdExpc3Q+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBjb21waWxlRXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHRzUmVzdWx0ID0gZ3VscC5zcmMoY29tcEdsb2JzKVxuICAgIC5waXBlKHNvdXJjZW1hcHMuaW5pdCgpKVxuICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIGZpbGUuYmFzZSA9IGd1bHBCYXNlO1xuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KSlcbiAgICAucGlwZSh0c1Byb2plY3QoKSlcbiAgICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgIGNvbXBpbGVFcnJvcnMucHVzaChlcnIubWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBMSjogTGV0J3MgdHJ5IHRvIHVzZSAtLXNvdXJjZU1hcCB3aXRoIC0taW5saW5lU291cmNlLCBzbyB0aGF0IEkgZG9uJ3QgbmVlZCB0byBjaGFuZ2UgZmlsZSBwYXRoIGluIHNvdXJjZSBtYXBcbiAgICAvLyB3aGljaCBpcyBvdXRwdXRlZFxuXG4gICAgLy8gLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgIC8vICAgaWYgKGZpbGUuZXh0bmFtZSA9PT0gJy5tYXAnKSB7XG4gICAgLy8gICAgIGNvbnN0IHNtID0gSlNPTi5wYXJzZShmaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCkpO1xuICAgIC8vICAgICBsZXQgc0ZpbGVEaXI7XG4gICAgLy8gICAgIHNtLnNvdXJjZXMgPVxuICAgIC8vICAgICAgIHNtLnNvdXJjZXMubWFwKCAoc3BhdGg6IHN0cmluZykgPT4ge1xuICAgIC8vICAgICAgICAgY29uc3QgcmVhbEZpbGUgPSBmcy5yZWFscGF0aFN5bmMoc3BhdGgpO1xuICAgIC8vICAgICAgICAgc0ZpbGVEaXIgPSBQYXRoLmRpcm5hbWUocmVhbEZpbGUpO1xuICAgIC8vICAgICAgICAgcmV0dXJuIFBhdGgucmVsYXRpdmUoZmlsZS5iYXNlLCByZWFsRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vICAgICAgIH0pO1xuICAgIC8vICAgICBpZiAoc0ZpbGVEaXIpXG4gICAgLy8gICAgICAgc20uc291cmNlUm9vdCA9IFBhdGgucmVsYXRpdmUoc0ZpbGVEaXIsIGZpbGUuYmFzZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vICAgICBmaWxlLmNvbnRlbnRzID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoc20pLCAndXRmOCcpO1xuICAgIC8vICAgfVxuICAgIC8vICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAvLyB9KSk7XG4gICAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbiAgICBpZiAoIWVtaXRUZHNPbmx5KSB7XG4gICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuanNcbiAgICAgICAgLnBpcGUoY2hhbmdlUGF0aCgpKVxuICAgICAgICAucGlwZShpbmxpbmVTb3VyY2VNYXAgPyBzb3VyY2VtYXBzLndyaXRlKCkgOiBzb3VyY2VtYXBzLndyaXRlKCcuJykpKTtcbiAgICB9XG4gICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmR0cy5waXBlKGNoYW5nZVBhdGgoKSkpO1xuXG4gICAgY29uc3QgZW1pdHRlZExpc3QgPSBbXSBhcyBFbWl0TGlzdDtcbiAgICBjb25zdCBhbGwgPSBtZXJnZShzdHJlYW1zKVxuICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIGNvbnN0IGRpc3BsYXlQYXRoID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlcywgZmlsZS5wYXRoKTtcbiAgICAgIGNvbnN0IGRpc3BsYXlTaXplID0gTWF0aC5yb3VuZChmaWxlLmNvbnRlbnRzLmxlbmd0aCAvIDEwMjQgKiAxMCkgLyAxMDtcblxuICAgICAgbG9nLmluZm8oJyVzICVzIEtiJywgZGlzcGxheVBhdGgsIGNoYWxrLmJsdWUoZGlzcGxheVNpemUpKTtcbiAgICAgIGVtaXR0ZWRMaXN0LnB1c2goW2Rpc3BsYXlQYXRoLCBkaXNwbGF5U2l6ZV0pO1xuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KSlcbiAgICAucGlwZShndWxwLmRlc3Qocm9vdCkpO1xuICAgIGFsbC5yZXN1bWUoKTtcbiAgICBhbGwub24oJ2VuZCcsICgpID0+IHtcbiAgICAgIGlmIChjb21waWxlRXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICBjb25zb2xlLmxvZygnXFxuLS0tLS0tLS0tLSBGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzLCBjaGVjayBvdXQgYmVsb3cgZXJyb3IgbWVzc2FnZSAtLS0tLS0tLS0tLS0tXFxuJyk7XG4gICAgICAgIGNvbXBpbGVFcnJvcnMuZm9yRWFjaChtc2cgPT4gbG9nLmVycm9yKG1zZykpO1xuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcycpKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoZW1pdHRlZExpc3QpO1xuICAgIH0pO1xuICAgIGFsbC5vbignZXJyb3InLCByZWplY3QpO1xuICB9KVxuICAudGhlbihlbWl0dGVkTGlzdCA9PiB7XG4gICAgcHJpbnREdXJhdGlvbihmYWxzZSk7XG4gICAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xuICB9KVxuICAuY2F0Y2goZXJyID0+IHtcbiAgICBwcmludER1cmF0aW9uKHRydWUpO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9KTtcbn1cbiJdfQ==