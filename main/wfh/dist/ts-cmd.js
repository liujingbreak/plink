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
const chalk = require('chalk');
const packageUtils = __importStar(require("./package-utils"));
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
    function onComponent(name, entryPath, _parsedName, json, packagePath) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN0QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsOERBQWdEO0FBQ2hELDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLG1DQUEwRDtBQUUxRCxzREFBOEI7QUFDOUIscURBQWtEO0FBQ2xELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBRXJCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCx1QkFBdUI7QUFDdkIsTUFBTSxJQUFJLEdBQUcsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQUMvQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztBQW1CcEQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQVUsRUFBRSxVQUF3QztJ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QUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDO2FBQ2hFO1lBQ0QsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDO1NBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQ2xCLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDWCxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHRzID0gcmVxdWlyZSgnZ3VscC10eXBlc2NyaXB0Jyk7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZSwgUGFja2FnZVRzRGlyc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9uc30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdH0gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5jb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuY29uc3QgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG5jb25zdCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5jb25zdCBtZXJnZSA9IHJlcXVpcmUoJ21lcmdlMicpO1xuY29uc3Qgc291cmNlbWFwcyA9IHJlcXVpcmUoJ2d1bHAtc291cmNlbWFwcycpO1xuY29uc3QgU0VQID0gUGF0aC5zZXA7XG5cbnJlcXVpcmUoJy4uL2xpYi9sb2dDb25maWcnKShjb25maWcoKSk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC50eXBlc2NyaXB0Jyk7XG4vLyBleHBvcnRzLmluaXQgPSBpbml0O1xuY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuY29uc3Qgbm9kZU1vZHVsZXMgPSBQYXRoLmpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcycpO1xuXG5pbnRlcmZhY2UgQXJncyB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc10/OiBhbnl9O1xufVxuXG5pbnRlcmZhY2UgQ29tcG9uZW50RGlySW5mbyB7XG4gIHRzRGlyczogUGFja2FnZVRzRGlycztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgRW1pdExpc3QgPSBBcnJheTxbc3RyaW5nLCBudW1iZXJdPjtcblxuLyoqXG4gKiBAcGFyYW0ge29iamVjdH0gYXJndlxuICogYXJndi53YXRjaDogYm9vbGVhblxuICogYXJndi5wYWNrYWdlOiBzdHJpbmdbXVxuICogQHBhcmFtIHtmdW5jdGlvbn0gb25Db21waWxlZCAoKSA9PiB2b2lkXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRzYyhhcmd2OiBBcmdzLCBvbkNvbXBpbGVkPzogKGVtaXR0ZWQ6IEVtaXRMaXN0KSA9PiB2b2lkKSB7XG4gIC8vIGNvbnN0IHBvc3NpYmxlU3JjRGlycyA9IFsnaXNvbScsICd0cyddO1xuICB2YXIgY29tcEdsb2JzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB2YXIgY29tcFN0cmVhbSA9IFtdO1xuICBjb25zdCBjb21wRGlySW5mbzogTWFwPHN0cmluZywgQ29tcG9uZW50RGlySW5mbz4gPSBuZXcgTWFwKCk7IC8vIHtbbmFtZTogc3RyaW5nXToge3NyY0Rpcjogc3RyaW5nLCBkZXN0RGlyOiBzdHJpbmd9fVxuICBjb25zdCBiYXNlVHNjb25maWcgPSBhcmd2LmpzeCA/IHJlcXVpcmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJykgOiByZXF1aXJlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG5cbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnMsXG4gICAgLy8gdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpLFxuICAgIC8vIENvbXBpbGVyIG9wdGlvbnNcbiAgICBpbXBvcnRIZWxwZXJzOiB0cnVlLFxuICAgIG91dERpcjogJycsXG4gICAgcm9vdERpcjogY29uZmlnKCkucm9vdFBhdGgsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWRcbiAgICAvLyBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlLFxuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0KHByb2Nlc3MuY3dkKCksIGNvbXBpbGVyT3B0aW9ucyk7XG4gIC8vIGNvbnNvbGUubG9nKGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgY29uc3QgdHNQcm9qZWN0ID0gdHMuY3JlYXRlUHJvamVjdCh7Li4uY29tcGlsZXJPcHRpb25zLCB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0Jyl9KTtcbiAgLy8gZGVidWdnZXI7XG4gIGlmIChhcmd2LnBhY2thZ2UgJiYgYXJndi5wYWNrYWdlLmxlbmd0aCA+IDApXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhhcmd2LnBhY2thZ2UsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnLCBhcmd2LnByb2plY3QpO1xuICB9IGVsc2VcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJyk7XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgX3BhcnNlZE5hbWU6IGFueSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3QgZGlycyA9IGdldFRzRGlyc09mUGFja2FnZShqc29uKTtcbiAgICBjb25zdCBzcmNEaXJzID0gW2RpcnMuc3JjRGlyLCBkaXJzLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKFBhdGguam9pbihwYWNrYWdlUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7XG4gICAgICB0c0RpcnM6IGRpcnMsXG4gICAgICBkaXI6IHBhY2thZ2VQYXRoXG4gICAgfSk7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzeCcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZGVsYXlDb21waWxlID0gXy5kZWJvdW5jZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdG9Db21waWxlID0gY29tcEdsb2JzO1xuICAgIGNvbXBHbG9icyA9IFtdO1xuXG4gICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdClcbiAgICAgIC50aGVuKCgpID0+IGNvbXBpbGUodG9Db21waWxlLCB0c1Byb2plY3QsIGNvbXBEaXJJbmZvLCBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsIGFyZ3YuZWQpKVxuICAgICAgLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KTtcbiAgICBpZiAob25Db21waWxlZClcbiAgICAgIHByb21Db21waWxlID0gcHJvbUNvbXBpbGUudGhlbihlbWl0dGVkID0+IHtcbiAgICAgICAgb25Db21waWxlZChlbWl0dGVkKTtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9KTtcbiAgfSwgMjAwKTtcblxuICBpZiAoYXJndi53YXRjaCkge1xuICAgIGxvZy5pbmZvKCdXYXRjaCBtb2RlJyk7XG4gICAgY29uc3Qgd2F0Y2hEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbXBHbG9icyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgICBbaW5mby50c0RpcnMuc3JjRGlyLCBpbmZvLnRzRGlycy5pc29tRGlyXS5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLmpvaW4oaW5mby5kaXIsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2god2F0Y2hEaXJzLCB7aWdub3JlZDogLyhcXC5kXFwudHN8XFwuanMpJC8gfSk7XG4gICAgd2F0Y2hlci5vbignYWRkJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdhZGRlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2NoYW5nZWQnKSk7XG4gICAgd2F0Y2hlci5vbigndW5saW5rJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdyZW1vdmVkJykpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjb21waWxlKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21wRGlySW5mbywgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlRmlsZShwYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgaWYgKHJlYXNvbiAhPT0gJ3JlbW92ZWQnKVxuICAgICAgY29tcEdsb2JzLnB1c2gocGF0aCk7XG4gICAgbG9nLmluZm8oYEZpbGUgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUocm9vdCwgcGF0aCkpfSBoYXMgYmVlbiBgICsgY2hhbGsueWVsbG93KHJlYXNvbikpO1xuICAgIGRlbGF5Q29tcGlsZSgpO1xuICB9XG5cbiAgcmV0dXJuIHByb21Db21waWxlO1xufVxuXG5mdW5jdGlvbiBjb21waWxlKGNvbXBHbG9iczogc3RyaW5nW10sIHRzUHJvamVjdDogYW55LFxuICBjb21wRGlySW5mbzogTWFwPHN0cmluZywgQ29tcG9uZW50RGlySW5mbz4sIGlubGluZVNvdXJjZU1hcDogYm9vbGVhbiwgZW1pdFRkc09ubHkgPSBmYWxzZSkge1xuICBjb25zdCBndWxwQmFzZSA9IHJvb3QgKyBTRVA7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gIGZ1bmN0aW9uIHByaW50RHVyYXRpb24oaXNFcnJvcjogYm9vbGVhbikge1xuICAgIGNvbnN0IHNlYyA9IE1hdGguY2VpbCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgY29uc3QgbWluID0gYCR7TWF0aC5mbG9vcihzZWMgLyA2MCl9IG1pbnV0ZXMgJHtzZWMgJSA2MH0gc2VjZW5kc2A7XG4gICAgbG9nLmluZm8oYENvbXBpbGVkICR7aXNFcnJvciA/ICd3aXRoIGVycm9ycyAnIDogJyd9aW4gYCArIG1pbik7XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuZ2VQYXRoKCkge1xuICAgIHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBzaG9ydFBhdGggPSBQYXRoLnJlbGF0aXZlKG5vZGVNb2R1bGVzLCBmaWxlLnBhdGgpO1xuICAgICAgbGV0IHBhY2thZ2VOYW1lID0gL14oKD86QFteL1xcXFxdK1svXFxcXF0pP1teL1xcXFxdKykvLmV4ZWMoc2hvcnRQYXRoKSFbMV07XG4gICAgICBpZiAoU0VQID09PSAnXFxcXCcpXG4gICAgICAgIHBhY2thZ2VOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKCFjb21wRGlySW5mby5oYXMocGFja2FnZU5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bmQgbm90IGZpbmQgcGFja2FnZSBpbmZvIGZvcjonICsgZmlsZSk7XG4gICAgICB9XG4gICAgICBjb25zdCB7dHNEaXJzLCBkaXJ9ID0gY29tcERpckluZm8uZ2V0KHBhY2thZ2VOYW1lKSE7XG4gICAgICBjb25zdCBwYWNrYWdlUmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoZGlyLCBmaWxlLnBhdGgpO1xuXG4gICAgICBpZiAoIVBhdGgucmVsYXRpdmUodHNEaXJzLnNyY0RpciwgcGFja2FnZVJlbFBhdGgpLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICAgICAgZmlsZS5wYXRoID0gUGF0aC5yZXNvbHZlKG5vZGVNb2R1bGVzLCBwYWNrYWdlTmFtZSwgdHNEaXJzLmRlc3REaXIsXG4gICAgICAgICAgc2hvcnRQYXRoLnN1YnN0cmluZyhwYWNrYWdlTmFtZS5sZW5ndGggKyAxICsgKHRzRGlycy5zcmNEaXIubGVuZ3RoID4gMCA/IHRzRGlycy5zcmNEaXIubGVuZ3RoICsgMSA6IDApKSk7XG4gICAgICB9XG4gICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPEVtaXRMaXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY29tcGlsZUVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB0c1Jlc3VsdCA9IGd1bHAuc3JjKGNvbXBHbG9icylcbiAgICAucGlwZShzb3VyY2VtYXBzLmluaXQoKSlcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBmaWxlLmJhc2UgPSBndWxwQmFzZTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLnBpcGUodHNQcm9qZWN0KCkpXG4gICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICBjb21waWxlRXJyb3JzLnB1c2goZXJyLm1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLy8gTEo6IExldCdzIHRyeSB0byB1c2UgLS1zb3VyY2VNYXAgd2l0aCAtLWlubGluZVNvdXJjZSwgc28gdGhhdCBJIGRvbid0IG5lZWQgdG8gY2hhbmdlIGZpbGUgcGF0aCBpbiBzb3VyY2UgbWFwXG4gICAgLy8gd2hpY2ggaXMgb3V0cHV0ZWRcblxuICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAvLyAgIGlmIChmaWxlLmV4dG5hbWUgPT09ICcubWFwJykge1xuICAgIC8vICAgICBjb25zdCBzbSA9IEpTT04ucGFyc2UoZmlsZS5jb250ZW50cy50b1N0cmluZygpKTtcbiAgICAvLyAgICAgbGV0IHNGaWxlRGlyO1xuICAgIC8vICAgICBzbS5zb3VyY2VzID1cbiAgICAvLyAgICAgICBzbS5zb3VyY2VzLm1hcCggKHNwYXRoOiBzdHJpbmcpID0+IHtcbiAgICAvLyAgICAgICAgIGNvbnN0IHJlYWxGaWxlID0gZnMucmVhbHBhdGhTeW5jKHNwYXRoKTtcbiAgICAvLyAgICAgICAgIHNGaWxlRGlyID0gUGF0aC5kaXJuYW1lKHJlYWxGaWxlKTtcbiAgICAvLyAgICAgICAgIHJldHVybiBQYXRoLnJlbGF0aXZlKGZpbGUuYmFzZSwgcmVhbEZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyAgICAgICB9KTtcbiAgICAvLyAgICAgaWYgKHNGaWxlRGlyKVxuICAgIC8vICAgICAgIHNtLnNvdXJjZVJvb3QgPSBQYXRoLnJlbGF0aXZlKHNGaWxlRGlyLCBmaWxlLmJhc2UpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyAgICAgZmlsZS5jb250ZW50cyA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHNtKSwgJ3V0ZjgnKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgLy8gfSkpO1xuICAgIGNvbnN0IHN0cmVhbXM6IGFueVtdID0gW107XG4gICAgaWYgKCFlbWl0VGRzT25seSkge1xuICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmpzXG4gICAgICAgIC5waXBlKGNoYW5nZVBhdGgoKSlcbiAgICAgICAgLnBpcGUoaW5saW5lU291cmNlTWFwID8gc291cmNlbWFwcy53cml0ZSgpIDogc291cmNlbWFwcy53cml0ZSgnLicpKSk7XG4gICAgfVxuICAgIHN0cmVhbXMucHVzaCh0c1Jlc3VsdC5kdHMucGlwZShjaGFuZ2VQYXRoKCkpKTtcblxuICAgIGNvbnN0IGVtaXR0ZWRMaXN0ID0gW10gYXMgRW1pdExpc3Q7XG4gICAgY29uc3QgYWxsID0gbWVyZ2Uoc3RyZWFtcylcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBjb25zdCBkaXNwbGF5UGF0aCA9IFBhdGgucmVsYXRpdmUobm9kZU1vZHVsZXMsIGZpbGUucGF0aCk7XG4gICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoZmlsZS5jb250ZW50cy5sZW5ndGggLyAxMDI0ICogMTApIC8gMTA7XG5cbiAgICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlKGRpc3BsYXlTaXplKSk7XG4gICAgICBlbWl0dGVkTGlzdC5wdXNoKFtkaXNwbGF5UGF0aCwgZGlzcGxheVNpemVdKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLnBpcGUoZ3VscC5kZXN0KHJvb3QpKTtcbiAgICBhbGwucmVzdW1lKCk7XG4gICAgYWxsLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICBpZiAoY29tcGlsZUVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgY29uc29sZS5sb2coJ1xcbi0tLS0tLS0tLS0gRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcywgY2hlY2sgb3V0IGJlbG93IGVycm9yIG1lc3NhZ2UgLS0tLS0tLS0tLS0tLVxcbicpO1xuICAgICAgICBjb21waWxlRXJyb3JzLmZvckVhY2gobXNnID0+IGxvZy5lcnJvcihtc2cpKTtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMnKSk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKGVtaXR0ZWRMaXN0KTtcbiAgICB9KTtcbiAgICBhbGwub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgfSlcbiAgLnRoZW4oZW1pdHRlZExpc3QgPT4ge1xuICAgIHByaW50RHVyYXRpb24oZmFsc2UpO1xuICAgIHJldHVybiBlbWl0dGVkTGlzdDtcbiAgfSlcbiAgLmNhdGNoKGVyciA9PiB7XG4gICAgcHJpbnREdXJhdGlvbih0cnVlKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgfSk7XG59XG4iXX0=