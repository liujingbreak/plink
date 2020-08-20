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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsc = void 0;
const ts = require('gulp-typescript');
const packageUtils = require('../lib/packageMgr/packageUtils');
const chalk = require('chalk');
const fs = __importStar(require("fs-extra"));
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const utils_1 = require("./utils");
const config_1 = __importDefault(require("./config"));
const config_handler_1 = require("./config-handler");
const gulp = require('gulp');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const SEP = Path.sep;
require('../lib/logConfig')(config_1.default());
const log = require('log4js').getLogger('wfh.typescript');
// exports.init = init;
const root = config_1.default().rootPath;
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
    const baseTsconfig = argv.jsx ? require('../tsconfig-tsx.json') : require('../tsconfig-base.json');
    let promCompile = Promise.resolve([]);
    const compilerOptions = Object.assign(Object.assign({}, baseTsconfig.compilerOptions), { 
        // typescript: require('typescript'),
        // Compiler options
        importHelpers: true, outDir: '', rootDir: config_1.default().rootPath, skipLibCheck: true, inlineSourceMap: false, sourceMap: true, emitDeclarationOnly: argv.ed });
    config_handler_1.setTsCompilerOpt(process.cwd(), compilerOptions);
    // console.log(compilerOptions);
    const tsProject = ts.createProject(Object.assign(Object.assign({}, compilerOptions), { typescript: require('typescript') }));
    // debugger;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN0QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUMvRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsbUNBQTBEO0FBRTFELHNEQUE4QjtBQUM5QixxREFBa0Q7QUFDbEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFFckIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFELHVCQUF1QjtBQUN2QixNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBbUJwRDs7Ozs7O0dBTUc7QUFD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QyxDQUFDO2dCQUM3QyxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUM7U0FDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDbEIsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUMsQ0FBQztTQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNYLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgdHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlLCBQYWNrYWdlVHNEaXJzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0fSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBTRVAgPSBQYXRoLnNlcDtcblxucmVxdWlyZSgnLi4vbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5jb25zdCBub2RlTW9kdWxlcyA9IFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzJyk7XG5cbmludGVyZmFjZSBBcmdzIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXT86IGFueX07XG59XG5cbmludGVyZmFjZSBDb21wb25lbnREaXJJbmZvIHtcbiAgdHNEaXJzOiBQYWNrYWdlVHNEaXJzO1xuICBkaXI6IHN0cmluZztcbn1cblxudHlwZSBFbWl0TGlzdCA9IEFycmF5PFtzdHJpbmcsIG51bWJlcl0+O1xuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IEFyZ3MsIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIHZhciBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHZhciBjb21wU3RyZWFtID0gW107XG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBDb21wb25lbnREaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IGFyZ3YuanN4ID8gcmVxdWlyZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKSA6IHJlcXVpcmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBsZXQgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcblxuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAvLyB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXG4gICAgb3V0RGlyOiAnJyxcbiAgICByb290RGlyOiBjb25maWcoKS5yb290UGF0aCxcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBmYWxzZSxcbiAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seTogYXJndi5lZFxuICAgIC8vIHByZXNlcnZlU3ltbGlua3M6IHRydWUsXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHQocHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zKTtcbiAgLy8gY29uc29sZS5sb2coY29tcGlsZXJPcHRpb25zKTtcblxuICBjb25zdCB0c1Byb2plY3QgPSB0cy5jcmVhdGVQcm9qZWN0KHsuLi5jb21waWxlck9wdGlvbnMsIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKX0pO1xuICAvLyBkZWJ1Z2dlcjtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuICAgIGNvbnN0IGRpcnMgPSBnZXRUc0RpcnNPZlBhY2thZ2UoanNvbik7XG4gICAgY29uc3Qgc3JjRGlycyA9IFtkaXJzLnNyY0RpciwgZGlycy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhQYXRoLmpvaW4ocGFja2FnZVBhdGgsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwge1xuICAgICAgdHNEaXJzOiBkaXJzLFxuICAgICAgZGlyOiBwYWNrYWdlUGF0aFxuICAgIH0pO1xuICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRvQ29tcGlsZSA9IGNvbXBHbG9icztcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpXG4gICAgICAudGhlbigoKSA9PiBjb21waWxlKHRvQ29tcGlsZSwgdHNQcm9qZWN0LCBjb21wRGlySW5mbywgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIGNvbnN0IHdhdGNoRGlyczogc3RyaW5nW10gPSBbXTtcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgICAgW2luZm8udHNEaXJzLnNyY0RpciwgaW5mby50c0RpcnMuaXNvbURpcl0uZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5qb2luKGluZm8uZGlyLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHdhdGNoRGlycywge2lnbm9yZWQ6IC8oXFwuZFxcLnRzfFxcLmpzKSQvIH0pO1xuICAgIHdhdGNoZXIub24oJ2FkZCcsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnYWRkZWQnKSk7XG4gICAgd2F0Y2hlci5vbignY2hhbmdlJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdjaGFuZ2VkJykpO1xuICAgIHdhdGNoZXIub24oJ3VubGluaycsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAncmVtb3ZlZCcpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tcERpckluZm8sIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZUZpbGUocGF0aDogc3RyaW5nLCByZWFzb246IHN0cmluZykge1xuICAgIGlmIChyZWFzb24gIT09ICdyZW1vdmVkJylcbiAgICAgIGNvbXBHbG9icy5wdXNoKHBhdGgpO1xuICAgIGxvZy5pbmZvKGBGaWxlICR7Y2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbiAgICBkZWxheUNvbXBpbGUoKTtcbiAgfVxuXG4gIHJldHVybiBwcm9tQ29tcGlsZTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSxcbiAgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+LCBpbmxpbmVTb3VyY2VNYXA6IGJvb2xlYW4sIGVtaXRUZHNPbmx5ID0gZmFsc2UpIHtcbiAgY29uc3QgZ3VscEJhc2UgPSByb290ICsgU0VQO1xuICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICBmdW5jdGlvbiBwcmludER1cmF0aW9uKGlzRXJyb3I6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzZWMgPSBNYXRoLmNlaWwoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgIGNvbnN0IG1pbiA9IGAke01hdGguZmxvb3Ioc2VjIC8gNjApfSBtaW51dGVzICR7c2VjICUgNjB9IHNlY2VuZHNgO1xuICAgIGxvZy5pbmZvKGBDb21waWxlZCAke2lzRXJyb3IgPyAnd2l0aCBlcnJvcnMgJyA6ICcnfWluIGAgKyBtaW4pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlUGF0aCgpIHtcbiAgICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3Qgc2hvcnRQYXRoID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlcywgZmlsZS5wYXRoKTtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IC9eKCg/OkBbXi9cXFxcXStbL1xcXFxdKT9bXi9cXFxcXSspLy5leGVjKHNob3J0UGF0aCkhWzFdO1xuICAgICAgaWYgKFNFUCA9PT0gJ1xcXFwnKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmICghY29tcERpckluZm8uaGFzKHBhY2thZ2VOYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdW5kIG5vdCBmaW5kIHBhY2thZ2UgaW5mbyBmb3I6JyArIGZpbGUpO1xuICAgICAgfVxuICAgICAgY29uc3Qge3RzRGlycywgZGlyfSA9IGNvbXBEaXJJbmZvLmdldChwYWNrYWdlTmFtZSkhO1xuICAgICAgY29uc3QgcGFja2FnZVJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKGRpciwgZmlsZS5wYXRoKTtcblxuICAgICAgaWYgKCFQYXRoLnJlbGF0aXZlKHRzRGlycy5zcmNEaXIsIHBhY2thZ2VSZWxQYXRoKS5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICAgIGZpbGUucGF0aCA9IFBhdGgucmVzb2x2ZShub2RlTW9kdWxlcywgcGFja2FnZU5hbWUsIHRzRGlycy5kZXN0RGlyLFxuICAgICAgICAgIHNob3J0UGF0aC5zdWJzdHJpbmcocGFja2FnZU5hbWUubGVuZ3RoICsgMSArICh0c0RpcnMuc3JjRGlyLmxlbmd0aCA+IDAgPyB0c0RpcnMuc3JjRGlyLmxlbmd0aCArIDEgOiAwKSkpO1xuICAgICAgfVxuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxFbWl0TGlzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdHNSZXN1bHQgPSBndWxwLnNyYyhjb21wR2xvYnMpXG4gICAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgZmlsZS5iYXNlID0gZ3VscEJhc2U7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pKVxuICAgIC5waXBlKHRzUHJvamVjdCgpKVxuICAgIC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIExKOiBMZXQncyB0cnkgdG8gdXNlIC0tc291cmNlTWFwIHdpdGggLS1pbmxpbmVTb3VyY2UsIHNvIHRoYXQgSSBkb24ndCBuZWVkIHRvIGNoYW5nZSBmaWxlIHBhdGggaW4gc291cmNlIG1hcFxuICAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbiAgICAvLyAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgLy8gICBpZiAoZmlsZS5leHRuYW1lID09PSAnLm1hcCcpIHtcbiAgICAvLyAgICAgY29uc3Qgc20gPSBKU09OLnBhcnNlKGZpbGUuY29udGVudHMudG9TdHJpbmcoKSk7XG4gICAgLy8gICAgIGxldCBzRmlsZURpcjtcbiAgICAvLyAgICAgc20uc291cmNlcyA9XG4gICAgLy8gICAgICAgc20uc291cmNlcy5tYXAoIChzcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgLy8gICAgICAgICBjb25zdCByZWFsRmlsZSA9IGZzLnJlYWxwYXRoU3luYyhzcGF0aCk7XG4gICAgLy8gICAgICAgICBzRmlsZURpciA9IFBhdGguZGlybmFtZShyZWFsRmlsZSk7XG4gICAgLy8gICAgICAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZShmaWxlLmJhc2UsIHJlYWxGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgICAgfSk7XG4gICAgLy8gICAgIGlmIChzRmlsZURpcilcbiAgICAvLyAgICAgICBzbS5zb3VyY2VSb290ID0gUGF0aC5yZWxhdGl2ZShzRmlsZURpciwgZmlsZS5iYXNlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgIGZpbGUuY29udGVudHMgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShzbSksICd1dGY4Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIC8vIH0pKTtcbiAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgIGlmICghZW1pdFRkc09ubHkpIHtcbiAgICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5qc1xuICAgICAgICAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgIC5waXBlKGlubGluZVNvdXJjZU1hcCA/IHNvdXJjZW1hcHMud3JpdGUoKSA6IHNvdXJjZW1hcHMud3JpdGUoJy4nKSkpO1xuICAgIH1cbiAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuZHRzLnBpcGUoY2hhbmdlUGF0aCgpKSk7XG5cbiAgICBjb25zdCBlbWl0dGVkTGlzdCA9IFtdIGFzIEVtaXRMaXN0O1xuICAgIGNvbnN0IGFsbCA9IG1lcmdlKHN0cmVhbXMpXG4gICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3QgZGlzcGxheVBhdGggPSBQYXRoLnJlbGF0aXZlKG5vZGVNb2R1bGVzLCBmaWxlLnBhdGgpO1xuICAgICAgY29uc3QgZGlzcGxheVNpemUgPSBNYXRoLnJvdW5kKGZpbGUuY29udGVudHMubGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICBsb2cuaW5mbygnJXMgJXMgS2InLCBkaXNwbGF5UGF0aCwgY2hhbGsuYmx1ZShkaXNwbGF5U2l6ZSkpO1xuICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pKVxuICAgIC5waXBlKGd1bHAuZGVzdChyb290KSk7XG4gICAgYWxsLnJlc3VtZSgpO1xuICAgIGFsbC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgIGNvbnNvbGUubG9nKCdcXG4tLS0tLS0tLS0tIEZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMsIGNoZWNrIG91dCBiZWxvdyBlcnJvciBtZXNzYWdlIC0tLS0tLS0tLS0tLS1cXG4nKTtcbiAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzJykpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgfSk7XG4gICAgYWxsLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pXG4gIC50aGVuKGVtaXR0ZWRMaXN0ID0+IHtcbiAgICBwcmludER1cmF0aW9uKGZhbHNlKTtcbiAgICByZXR1cm4gZW1pdHRlZExpc3Q7XG4gIH0pXG4gIC5jYXRjaChlcnIgPT4ge1xuICAgIHByaW50RHVyYXRpb24odHJ1ZSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gIH0pO1xufVxuIl19