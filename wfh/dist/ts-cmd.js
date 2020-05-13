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
    const tsProject = ts.createProject(Object.assign({}, baseTsconfig.compilerOptions, Object.assign({ typescript: require('typescript'), 
        // Compiler options
        importHelpers: true, outDir: '', baseUrl: root, rootDir: undefined, skipLibCheck: true, inlineSourceMap: false, sourceMap: true, emitDeclarationOnly: argv.ed }, (argv.compileOptions ? argv.compileOptions : {})
    // typeRoots: [
    //   Path.join('node_modules/@types'),
    //   Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
    // ]
    )));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDdEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLG1DQUEwRDtBQUUxRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDOUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFFckIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUQsdUJBQXVCO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQUMvQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQW1CcEQ7Ozs7OztHQU1HO0FB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QUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUM7U0FDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDbEIsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNYLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgdHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlLCBQYWNrYWdlVHNEaXJzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBTRVAgPSBQYXRoLnNlcDtcblxucmVxdWlyZSgnLi4vbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5jb25zdCBub2RlTW9kdWxlcyA9IFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzJyk7XG5cbmludGVyZmFjZSBBcmdzIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXT86IGFueX07XG59XG5cbmludGVyZmFjZSBDb21wb25lbnREaXJJbmZvIHtcbiAgdHNEaXJzOiBQYWNrYWdlVHNEaXJzO1xuICBkaXI6IHN0cmluZztcbn1cblxudHlwZSBFbWl0TGlzdCA9IEFycmF5PFtzdHJpbmcsIG51bWJlcl0+O1xuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IEFyZ3MsIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIHZhciBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHZhciBjb21wU3RyZWFtID0gW107XG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBDb21wb25lbnREaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IGFyZ3YuanN4ID8gcmVxdWlyZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKSA6IHJlcXVpcmUoJy4uL3RzY29uZmlnLmpzb24nKTtcbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHRzUHJvamVjdCA9IHRzLmNyZWF0ZVByb2plY3QoT2JqZWN0LmFzc2lnbih7fSwgYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSxcbiAgICAvLyBDb21waWxlciBvcHRpb25zXG4gICAgaW1wb3J0SGVscGVyczogdHJ1ZSxcbiAgICBvdXREaXI6ICcnLFxuICAgIGJhc2VVcmw6IHJvb3QsXG4gICAgcm9vdERpcjogdW5kZWZpbmVkLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkLFxuICAgIC4uLihhcmd2LmNvbXBpbGVPcHRpb25zID8gYXJndi5jb21waWxlT3B0aW9ucyA6IHt9KVxuICAgIC8vIHR5cGVSb290czogW1xuICAgIC8vICAgUGF0aC5qb2luKCdub2RlX21vZHVsZXMvQHR5cGVzJyksXG4gICAgLy8gICBQYXRoLmpvaW4oUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKSwgJy93ZmgvdHlwZXMnKVxuICAgIC8vIF1cbiAgfSkpO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgfSBlbHNlXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycpO1xuXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3QgZGlycyA9IGdldFRzRGlyc09mUGFja2FnZShqc29uKTtcbiAgICBjb25zdCBzcmNEaXJzID0gW2RpcnMuc3JjRGlyLCBkaXJzLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKFBhdGguam9pbihwYWNrYWdlUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7XG4gICAgICB0c0RpcnM6IGRpcnMsXG4gICAgICBkaXI6IHBhY2thZ2VQYXRoXG4gICAgfSk7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZGVsYXlDb21waWxlID0gXy5kZWJvdW5jZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdG9Db21waWxlID0gY29tcEdsb2JzO1xuICAgIGNvbXBHbG9icyA9IFtdO1xuXG4gICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdClcbiAgICAgIC50aGVuKCgpID0+IGNvbXBpbGUodG9Db21waWxlLCB0c1Byb2plY3QsIGNvbXBEaXJJbmZvLCBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsIGFyZ3YuZWQpKVxuICAgICAgLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KTtcbiAgICBpZiAob25Db21waWxlZClcbiAgICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUudGhlbihlbWl0dGVkID0+IHtcbiAgICAgICAgb25Db21waWxlZChlbWl0dGVkKTtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9KTtcbiAgfSwgMjAwKTtcblxuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgY29uc3Qgd2F0Y2hEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbXBHbG9icyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgICBbaW5mby50c0RpcnMuc3JjRGlyLCBpbmZvLnRzRGlycy5pc29tRGlyXS5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLmpvaW4oaW5mby5kaXIsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2god2F0Y2hEaXJzLCB7aWdub3JlZDogLyhcXC5kXFwudHN8XFwuanMpJC8gfSk7XG4gICAgd2F0Y2hlci5vbignYWRkJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdhZGRlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2NoYW5nZWQnKSk7XG4gICAgd2F0Y2hlci5vbigndW5saW5rJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdyZW1vdmVkJykpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21wRGlySW5mbywgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlRmlsZShwYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgaWYgKHJlYXNvbiAhPT0gJ3JlbW92ZWQnKVxuICAgICAgY29tcEdsb2JzLnB1c2gocGF0aCk7XG4gICAgbG9nLmluZm8oYEZpbGUgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUocm9vdCwgcGF0aCkpfSBoYXMgYmVlbiBgICsgY2hhbGsueWVsbG93KHJlYXNvbikpO1xuICAgIGRlbGF5Q29tcGlsZSgpO1xuICB9XG5cbiAgcmV0dXJuIHByb21Db21waWxlO1xufVxuXG5mdW5jdGlvbiBjb21waWxlKGNvbXBHbG9iczogc3RyaW5nW10sIHRzUHJvamVjdDogYW55LFxuICBjb21wRGlySW5mbzogTWFwPHN0cmluZywgQ29tcG9uZW50RGlySW5mbz4sIGlubGluZVNvdXJjZU1hcDogYm9vbGVhbiwgZW1pdFRkc09ubHkgPSBmYWxzZSkge1xuICBjb25zdCBndWxwQmFzZSA9IHJvb3QgKyBTRVA7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gIGZ1bmN0aW9uIHByaW50RHVyYXRpb24oaXNFcnJvcjogYm9vbGVhbikge1xuICAgIGNvbnN0IHNlYyA9IE1hdGguY2VpbCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgY29uc3QgbWluID0gYCR7TWF0aC5mbG9vcihzZWMgLyA2MCl9IG1pbnV0ZXMgJHtzZWMgJSA2MH0gc2VjZW5kc2A7XG4gICAgbG9nLmluZm8oYENvbXBpbGVkICR7aXNFcnJvciA/ICd3aXRoIGVycm9ycyAnIDogJyd9aW4gYCArIG1pbik7XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuZ2VQYXRoKCkge1xuICAgIHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBzaG9ydFBhdGggPSBQYXRoLnJlbGF0aXZlKG5vZGVNb2R1bGVzLCBmaWxlLnBhdGgpO1xuICAgICAgbGV0IHBhY2thZ2VOYW1lID0gL14oKD86QFteL1xcXFxdK1svXFxcXF0pP1teL1xcXFxdKykvLmV4ZWMoc2hvcnRQYXRoKSFbMV07XG4gICAgICBpZiAoU0VQID09PSAnXFxcXCcpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKCFjb21wRGlySW5mby5oYXMocGFja2FnZU5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bmQgbm90IGZpbmQgcGFja2FnZSBpbmZvIGZvcjonICsgZmlsZSk7XG4gICAgICB9XG4gICAgICBjb25zdCB7dHNEaXJzLCBkaXJ9ID0gY29tcERpckluZm8uZ2V0KHBhY2thZ2VOYW1lKSE7XG4gICAgICBjb25zdCBwYWNrYWdlUmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoZGlyLCBmaWxlLnBhdGgpO1xuXG4gICAgICBpZiAoIVBhdGgucmVsYXRpdmUodHNEaXJzLnNyY0RpciwgcGFja2FnZVJlbFBhdGgpLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICAgICAgZmlsZS5wYXRoID0gUGF0aC5yZXNvbHZlKG5vZGVNb2R1bGVzLCBwYWNrYWdlTmFtZSwgdHNEaXJzLmRlc3REaXIsXG4gICAgICAgICAgc2hvcnRQYXRoLnN1YnN0cmluZyhwYWNrYWdlTmFtZS5sZW5ndGggKyAxICsgKHRzRGlycy5zcmNEaXIubGVuZ3RoID4gMCA/IHRzRGlycy5zcmNEaXIubGVuZ3RoICsgMSA6IDApKSk7XG4gICAgICB9XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPEVtaXRMaXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY29tcGlsZUVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB0c1Jlc3VsdCA9IGd1bHAuc3JjKGNvbXBHbG9icylcbiAgICAucGlwZShzb3VyY2VtYXBzLmluaXQoKSlcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBmaWxlLmJhc2UgPSBndWxwQmFzZTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLnBpcGUodHNQcm9qZWN0KCkpXG4gICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBjb21waWxlRXJyb3JzLnB1c2goZXJyLm1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLy8gTEo6IExldCdzIHRyeSB0byB1c2UgLS1zb3VyY2VNYXAgd2l0aCAtLWlubGluZVNvdXJjZSwgc28gdGhhdCBJIGRvbid0IG5lZWQgdG8gY2hhbmdlIGZpbGUgcGF0aCBpbiBzb3VyY2UgbWFwXG4gICAgLy8gd2hpY2ggaXMgb3V0cHV0ZWRcblxuICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAvLyAgIGlmIChmaWxlLmV4dG5hbWUgPT09ICcubWFwJykge1xuICAgIC8vICAgICBjb25zdCBzbSA9IEpTT04ucGFyc2UoZmlsZS5jb250ZW50cy50b1N0cmluZygpKTtcbiAgICAvLyAgICAgbGV0IHNGaWxlRGlyO1xuICAgIC8vICAgICBzbS5zb3VyY2VzID1cbiAgICAvLyAgICAgICBzbS5zb3VyY2VzLm1hcCggKHNwYXRoOiBzdHJpbmcpID0+IHtcbiAgICAvLyAgICAgICAgIGNvbnN0IHJlYWxGaWxlID0gZnMucmVhbHBhdGhTeW5jKHNwYXRoKTtcbiAgICAvLyAgICAgICAgIHNGaWxlRGlyID0gUGF0aC5kaXJuYW1lKHJlYWxGaWxlKTtcbiAgICAvLyAgICAgICAgIHJldHVybiBQYXRoLnJlbGF0aXZlKGZpbGUuYmFzZSwgcmVhbEZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyAgICAgICB9KTtcbiAgICAvLyAgICAgaWYgKHNGaWxlRGlyKVxuICAgIC8vICAgICAgIHNtLnNvdXJjZVJvb3QgPSBQYXRoLnJlbGF0aXZlKHNGaWxlRGlyLCBmaWxlLmJhc2UpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyAgICAgZmlsZS5jb250ZW50cyA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHNtKSwgJ3V0ZjgnKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgLy8gfSkpO1xuICAgIGNvbnN0IHN0cmVhbXM6IGFueVtdID0gW107XG4gICAgaWYgKCFlbWl0VGRzT25seSkge1xuICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmpzXG4gICAgICAgIC5waXBlKGNoYW5nZVBhdGgoKSlcbiAgICAgICAgLnBpcGUoaW5saW5lU291cmNlTWFwID8gc291cmNlbWFwcy53cml0ZSgpIDogc291cmNlbWFwcy53cml0ZSgnLicpKSk7XG4gICAgfVxuICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5kdHMucGlwZShjaGFuZ2VQYXRoKCkpKTtcblxuICAgIGNvbnN0IGVtaXR0ZWRMaXN0ID0gW10gYXMgRW1pdExpc3Q7XG4gICAgY29uc3QgYWxsID0gbWVyZ2Uoc3RyZWFtcylcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBkaXNwbGF5UGF0aCA9IFBhdGgucmVsYXRpdmUobm9kZU1vZHVsZXMsIGZpbGUucGF0aCk7XG4gICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoZmlsZS5jb250ZW50cy5sZW5ndGggLyAxMDI0ICogMTApIC8gMTA7XG5cbiAgICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlKGRpc3BsYXlTaXplKSk7XG4gICAgICBlbWl0dGVkTGlzdC5wdXNoKFtkaXNwbGF5UGF0aCwgZGlzcGxheVNpemVdKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLnBpcGUoZ3VscC5kZXN0KHJvb3QpKTtcbiAgICBhbGwucmVzdW1lKCk7XG4gICAgYWxsLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICBpZiAoY29tcGlsZUVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgY29uc29sZS5sb2coJ1xcbi0tLS0tLS0tLS0gRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcywgY2hlY2sgb3V0IGJlbG93IGVycm9yIG1lc3NhZ2UgLS0tLS0tLS0tLS0tLVxcbicpO1xuICAgICAgICBjb21waWxlRXJyb3JzLmZvckVhY2gobXNnID0+IGxvZy5lcnJvcihtc2cpKTtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMnKSk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKGVtaXR0ZWRMaXN0KTtcbiAgICB9KTtcbiAgICBhbGwub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgfSlcbiAgLnRoZW4oZW1pdHRlZExpc3QgPT4ge1xuICAgIHByaW50RHVyYXRpb24oZmFsc2UpO1xuICAgIHJldHVybiBlbWl0dGVkTGlzdDtcbiAgfSlcbiAgLmNhdGNoKGVyciA9PiB7XG4gICAgcHJpbnREdXJhdGlvbih0cnVlKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgfSk7XG59XG4iXX0=