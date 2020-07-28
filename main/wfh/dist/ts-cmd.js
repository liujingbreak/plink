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
    const baseTsconfig = argv.jsx ? require('../tsconfig-tsx.json') : require('../tsconfig.json');
    let promCompile = Promise.resolve([]);
    let paths;
    const baseUrl = Path.relative(process.cwd(), config_1.default().rootPath).replace(/\\/g, '/');
    let typeRoots;
    if (baseUrl !== process.cwd()) {
        let relativeNm = Path.relative(baseUrl, process.cwd()).replace(/\\/g, '/');
        if (relativeNm.length > 0)
            relativeNm = relativeNm + '/';
        // compilerOptions.typeRoots.push(Path.resolve(config().rootPath, 'node_modules'));
        paths = {
            '*': [
                relativeNm + 'node_modules/*',
                relativeNm + 'node_modules/@types/*',
                'node_modules/*',
                'node_modules/@types/*'
            ]
        };
        typeRoots = [
            Path.resolve('node_modules/@types'),
            Path.resolve(config_1.default().rootPath, 'node_modules/@types')
        ];
    }
    else {
        paths = {
            '*': [
                'node_modules/*',
                'node_modules/@types/*'
            ]
        };
    }
    console.log(paths, typeRoots);
    const tsProject = ts.createProject(Object.assign({}, baseTsconfig.compilerOptions, {
        typescript: require('typescript'),
        // Compiler options
        importHelpers: true,
        outDir: '',
        baseUrl,
        rootDir: baseUrl,
        skipLibCheck: true,
        inlineSourceMap: false,
        sourceMap: true,
        emitDeclarationOnly: argv.ed,
        // preserveSymlinks: true,
        paths,
        typeRoots
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN0QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUMvRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsbUNBQTBEO0FBRTFELHNEQUE4QjtBQUM5QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUVyQixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUQsdUJBQXVCO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUM7QUFDL0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFtQnBEOzs7Ozs7R0FNRztBQUNILFNBQWdCLEdBQUcs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QUFDO1FBQ0gsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO1NBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQ2xCLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDWCxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHRzID0gcmVxdWlyZSgnZ3VscC10eXBlc2NyaXB0Jyk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZSwgUGFja2FnZVRzRGlyc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9uc30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBTRVAgPSBQYXRoLnNlcDtcblxucmVxdWlyZSgnLi4vbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5jb25zdCBub2RlTW9kdWxlcyA9IFBhdGguam9pbihyb290LCAnbm9kZV9tb2R1bGVzJyk7XG5cbmludGVyZmFjZSBBcmdzIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXT86IGFueX07XG59XG5cbmludGVyZmFjZSBDb21wb25lbnREaXJJbmZvIHtcbiAgdHNEaXJzOiBQYWNrYWdlVHNEaXJzO1xuICBkaXI6IHN0cmluZztcbn1cblxudHlwZSBFbWl0TGlzdCA9IEFycmF5PFtzdHJpbmcsIG51bWJlcl0+O1xuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IEFyZ3MsIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIHZhciBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHZhciBjb21wU3RyZWFtID0gW107XG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBDb21wb25lbnREaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IGFyZ3YuanN4ID8gcmVxdWlyZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKSA6IHJlcXVpcmUoJy4uL3RzY29uZmlnLmpzb24nKTtcbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG5cbiAgbGV0IHBhdGhzOiBhbnk7XG4gIGNvbnN0IGJhc2VVcmwgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGNvbmZpZygpLnJvb3RQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGxldCB0eXBlUm9vdHM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuXG4gIGlmIChiYXNlVXJsICE9PSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgbGV0IHJlbGF0aXZlTm0gPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmwsIHByb2Nlc3MuY3dkKCkpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAocmVsYXRpdmVObS5sZW5ndGggPiAwIClcbiAgICAgIHJlbGF0aXZlTm0gPSByZWxhdGl2ZU5tICsgJy8nO1xuICAgIC8vIGNvbXBpbGVyT3B0aW9ucy50eXBlUm9vdHMucHVzaChQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMnKSk7XG4gICAgcGF0aHMgPSB7XG4gICAgICAnKic6IFtcbiAgICAgICAgcmVsYXRpdmVObSArICdub2RlX21vZHVsZXMvKicsXG4gICAgICAgIHJlbGF0aXZlTm0gKyAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJyxcbiAgICAgICAgJ25vZGVfbW9kdWxlcy8qJyxcbiAgICAgICAgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKidcbiAgICAgIF1cbiAgICB9O1xuICAgIHR5cGVSb290cyA9IFtcbiAgICAgIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgICAgUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpXG4gICAgXTtcbiAgfSBlbHNlIHtcbiAgICBwYXRocyA9IHtcbiAgICAgICcqJzogW1xuICAgICAgICAnbm9kZV9tb2R1bGVzLyonLFxuICAgICAgICAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ1xuICAgICAgXVxuICAgIH07XG4gIH1cblxuICBjb25zb2xlLmxvZyhwYXRocywgdHlwZVJvb3RzKTtcblxuICBjb25zdCB0c1Byb2plY3QgPSB0cy5jcmVhdGVQcm9qZWN0KE9iamVjdC5hc3NpZ24oe30sIGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnMsIHtcbiAgICB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXG4gICAgb3V0RGlyOiAnJyxcbiAgICBiYXNlVXJsLFxuICAgIHJvb3REaXI6IGJhc2VVcmwsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWQsXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZSxcbiAgICBwYXRocyxcbiAgICB0eXBlUm9vdHNcbiAgICAvLyB0eXBlUm9vdHM6IFtcbiAgICAvLyAgIFBhdGguam9pbignbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgIC8vICAgUGF0aC5qb2luKFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSksICcvd2ZoL3R5cGVzJylcbiAgICAvLyBdXG4gIH0pKTtcbiAgaWYgKGFyZ3YucGFja2FnZSAmJiBhcmd2LnBhY2thZ2UubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKGFyZ3YucGFja2FnZSwgb25Db21wb25lbnQsICdzcmMnKTtcbiAgZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIH0gZWxzZVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuICAgIGNvbnN0IGRpcnMgPSBnZXRUc0RpcnNPZlBhY2thZ2UoanNvbik7XG4gICAgY29uc3Qgc3JjRGlycyA9IFtkaXJzLnNyY0RpciwgZGlycy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmcy5zdGF0U3luYyhQYXRoLmpvaW4ocGFja2FnZVBhdGgsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwge1xuICAgICAgdHNEaXJzOiBkaXJzLFxuICAgICAgZGlyOiBwYWNrYWdlUGF0aFxuICAgIH0pO1xuICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRvQ29tcGlsZSA9IGNvbXBHbG9icztcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpXG4gICAgICAudGhlbigoKSA9PiBjb21waWxlKHRvQ29tcGlsZSwgdHNQcm9qZWN0LCBjb21wRGlySW5mbywgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIGNvbnN0IHdhdGNoRGlyczogc3RyaW5nW10gPSBbXTtcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgICAgW2luZm8udHNEaXJzLnNyY0RpciwgaW5mby50c0RpcnMuaXNvbURpcl0uZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5qb2luKGluZm8uZGlyLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHdhdGNoRGlycywge2lnbm9yZWQ6IC8oXFwuZFxcLnRzfFxcLmpzKSQvIH0pO1xuICAgIHdhdGNoZXIub24oJ2FkZCcsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnYWRkZWQnKSk7XG4gICAgd2F0Y2hlci5vbignY2hhbmdlJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdjaGFuZ2VkJykpO1xuICAgIHdhdGNoZXIub24oJ3VubGluaycsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAncmVtb3ZlZCcpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tcERpckluZm8sIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZUZpbGUocGF0aDogc3RyaW5nLCByZWFzb246IHN0cmluZykge1xuICAgIGlmIChyZWFzb24gIT09ICdyZW1vdmVkJylcbiAgICAgIGNvbXBHbG9icy5wdXNoKHBhdGgpO1xuICAgIGxvZy5pbmZvKGBGaWxlICR7Y2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbiAgICBkZWxheUNvbXBpbGUoKTtcbiAgfVxuXG4gIHJldHVybiBwcm9tQ29tcGlsZTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSxcbiAgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+LCBpbmxpbmVTb3VyY2VNYXA6IGJvb2xlYW4sIGVtaXRUZHNPbmx5ID0gZmFsc2UpIHtcbiAgY29uc3QgZ3VscEJhc2UgPSByb290ICsgU0VQO1xuICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICBmdW5jdGlvbiBwcmludER1cmF0aW9uKGlzRXJyb3I6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzZWMgPSBNYXRoLmNlaWwoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgIGNvbnN0IG1pbiA9IGAke01hdGguZmxvb3Ioc2VjIC8gNjApfSBtaW51dGVzICR7c2VjICUgNjB9IHNlY2VuZHNgO1xuICAgIGxvZy5pbmZvKGBDb21waWxlZCAke2lzRXJyb3IgPyAnd2l0aCBlcnJvcnMgJyA6ICcnfWluIGAgKyBtaW4pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hhbmdlUGF0aCgpIHtcbiAgICByZXR1cm4gdGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3Qgc2hvcnRQYXRoID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlcywgZmlsZS5wYXRoKTtcbiAgICAgIGxldCBwYWNrYWdlTmFtZSA9IC9eKCg/OkBbXi9cXFxcXStbL1xcXFxdKT9bXi9cXFxcXSspLy5leGVjKHNob3J0UGF0aCkhWzFdO1xuICAgICAgaWYgKFNFUCA9PT0gJ1xcXFwnKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmICghY29tcERpckluZm8uaGFzKHBhY2thZ2VOYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdW5kIG5vdCBmaW5kIHBhY2thZ2UgaW5mbyBmb3I6JyArIGZpbGUpO1xuICAgICAgfVxuICAgICAgY29uc3Qge3RzRGlycywgZGlyfSA9IGNvbXBEaXJJbmZvLmdldChwYWNrYWdlTmFtZSkhO1xuICAgICAgY29uc3QgcGFja2FnZVJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKGRpciwgZmlsZS5wYXRoKTtcblxuICAgICAgaWYgKCFQYXRoLnJlbGF0aXZlKHRzRGlycy5zcmNEaXIsIHBhY2thZ2VSZWxQYXRoKS5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgICAgIGZpbGUucGF0aCA9IFBhdGgucmVzb2x2ZShub2RlTW9kdWxlcywgcGFja2FnZU5hbWUsIHRzRGlycy5kZXN0RGlyLFxuICAgICAgICAgIHNob3J0UGF0aC5zdWJzdHJpbmcocGFja2FnZU5hbWUubGVuZ3RoICsgMSArICh0c0RpcnMuc3JjRGlyLmxlbmd0aCA+IDAgPyB0c0RpcnMuc3JjRGlyLmxlbmd0aCArIDEgOiAwKSkpO1xuICAgICAgfVxuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxFbWl0TGlzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdHNSZXN1bHQgPSBndWxwLnNyYyhjb21wR2xvYnMpXG4gICAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgZmlsZS5iYXNlID0gZ3VscEJhc2U7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pKVxuICAgIC5waXBlKHRzUHJvamVjdCgpKVxuICAgIC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIExKOiBMZXQncyB0cnkgdG8gdXNlIC0tc291cmNlTWFwIHdpdGggLS1pbmxpbmVTb3VyY2UsIHNvIHRoYXQgSSBkb24ndCBuZWVkIHRvIGNoYW5nZSBmaWxlIHBhdGggaW4gc291cmNlIG1hcFxuICAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbiAgICAvLyAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgLy8gICBpZiAoZmlsZS5leHRuYW1lID09PSAnLm1hcCcpIHtcbiAgICAvLyAgICAgY29uc3Qgc20gPSBKU09OLnBhcnNlKGZpbGUuY29udGVudHMudG9TdHJpbmcoKSk7XG4gICAgLy8gICAgIGxldCBzRmlsZURpcjtcbiAgICAvLyAgICAgc20uc291cmNlcyA9XG4gICAgLy8gICAgICAgc20uc291cmNlcy5tYXAoIChzcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgLy8gICAgICAgICBjb25zdCByZWFsRmlsZSA9IGZzLnJlYWxwYXRoU3luYyhzcGF0aCk7XG4gICAgLy8gICAgICAgICBzRmlsZURpciA9IFBhdGguZGlybmFtZShyZWFsRmlsZSk7XG4gICAgLy8gICAgICAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZShmaWxlLmJhc2UsIHJlYWxGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgICAgfSk7XG4gICAgLy8gICAgIGlmIChzRmlsZURpcilcbiAgICAvLyAgICAgICBzbS5zb3VyY2VSb290ID0gUGF0aC5yZWxhdGl2ZShzRmlsZURpciwgZmlsZS5iYXNlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgIGZpbGUuY29udGVudHMgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShzbSksICd1dGY4Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIC8vIH0pKTtcbiAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgIGlmICghZW1pdFRkc09ubHkpIHtcbiAgICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5qc1xuICAgICAgICAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgIC5waXBlKGlubGluZVNvdXJjZU1hcCA/IHNvdXJjZW1hcHMud3JpdGUoKSA6IHNvdXJjZW1hcHMud3JpdGUoJy4nKSkpO1xuICAgIH1cbiAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuZHRzLnBpcGUoY2hhbmdlUGF0aCgpKSk7XG5cbiAgICBjb25zdCBlbWl0dGVkTGlzdCA9IFtdIGFzIEVtaXRMaXN0O1xuICAgIGNvbnN0IGFsbCA9IG1lcmdlKHN0cmVhbXMpXG4gICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgY29uc3QgZGlzcGxheVBhdGggPSBQYXRoLnJlbGF0aXZlKG5vZGVNb2R1bGVzLCBmaWxlLnBhdGgpO1xuICAgICAgY29uc3QgZGlzcGxheVNpemUgPSBNYXRoLnJvdW5kKGZpbGUuY29udGVudHMubGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICBsb2cuaW5mbygnJXMgJXMgS2InLCBkaXNwbGF5UGF0aCwgY2hhbGsuYmx1ZShkaXNwbGF5U2l6ZSkpO1xuICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pKVxuICAgIC5waXBlKGd1bHAuZGVzdChyb290KSk7XG4gICAgYWxsLnJlc3VtZSgpO1xuICAgIGFsbC5vbignZW5kJywgKCkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgIGNvbnNvbGUubG9nKCdcXG4tLS0tLS0tLS0tIEZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMsIGNoZWNrIG91dCBiZWxvdyBlcnJvciBtZXNzYWdlIC0tLS0tLS0tLS0tLS1cXG4nKTtcbiAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzJykpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgfSk7XG4gICAgYWxsLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pXG4gIC50aGVuKGVtaXR0ZWRMaXN0ID0+IHtcbiAgICBwcmludER1cmF0aW9uKGZhbHNlKTtcbiAgICByZXR1cm4gZW1pdHRlZExpc3Q7XG4gIH0pXG4gIC5jYXRjaChlcnIgPT4ge1xuICAgIHByaW50RHVyYXRpb24odHJ1ZSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gIH0pO1xufVxuIl19