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
const package_mgr_1 = require("./package-mgr");
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
    setupCompilerOptionsWithPackages(compilerOptions);
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
    const packageDirTree = new dir_tree_1.DirTree();
    for (const info of compDirInfo.values()) {
        const treePath = path_1.relative(commonRootDir, info.dir);
        packageDirTree.putData(treePath, info);
    }
    // console.log(packageDirTree.traverse());
    compilerOptions.rootDir = commonRootDir.replace(/\\/g, '/');
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
function setupCompilerOptionsWithPackages(compilerOptions) {
    let wsKey = package_mgr_1.workspaceKey(process.cwd());
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    const typeRoots = Array.from(packageUtils.typeRootsFromPackages(wsKey));
    config_handler_1.setTsCompilerOptForNodePath(process.cwd(), compilerOptions, { enableTypeRoots: true, extraTypeRoot: typeRoots });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxrREFBMEI7QUFDMUIsOERBQWdEO0FBQ2hELDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsK0JBQWtEO0FBQ2xELDREQUE0QjtBQUU1Qix1Q0FBdUY7QUFFdkYsc0RBQThCO0FBQzlCLHFEQUF5RztBQUN6Ryw2REFBdUQ7QUFDdkQsK0NBQXFEO0FBQ3JELG9EQUE0QjtBQUM1QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDOUMsTUFBTSxHQUFHLEdBQUcsVUFBRyxDQUFDO0FBRWhCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDL0MsdUJBQXVCO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUM7QUFvQi9COzs7Ozs7R0FNRztBQUNILFNBQWdCLEdBQUcsQ0FBQyxJQUFVLEVBQUUsVUFBd0M7SUFDdEUsMENBQTBDO0lBQzFDLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUM3Qix1QkFBdUI7SUFDdkIsTUFBTSxXQUFXLEdBQWtDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzREFBc0Q7SUFDcEgsTUFBTSxnQkFBZ0IsR0FBRyxJ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RUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQztBQUNqSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ3VscFRzID0gcmVxdWlyZSgnZ3VscC10eXBlc2NyaXB0Jyk7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3NlcCwgcmVzb2x2ZSwgam9pbiwgcmVsYXRpdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IEZpbGUgZnJvbSAndmlueWwnO1xuaW1wb3J0IHtnZXRUc0RpcnNPZlBhY2thZ2UsIFBhY2thZ2VUc0RpcnMsIGNsb3Nlc3RDb21tb25QYXJlbnREaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge0NvbXBpbGVyT3B0aW9uc30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBDb21waWxlck9wdGlvbnMgYXMgUmVxdWlyZWRDb21waWxlck9wdGlvbnN9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBzb3VyY2VtYXBzID0gcmVxdWlyZSgnZ3VscC1zb3VyY2VtYXBzJyk7XG5jb25zdCBTRVAgPSBzZXA7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC50eXBlc2NyaXB0Jyk7XG4vLyBleHBvcnRzLmluaXQgPSBpbml0O1xuY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuLy8gY29uc3Qgbm9kZU1vZHVsZXMgPSBqb2luKHJvb3QsICdub2RlX21vZHVsZXMnKTtcblxuaW50ZXJmYWNlIEFyZ3Mge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgY29tcGlsZU9wdGlvbnM/OiB7W2tleSBpbiBrZXlvZiBDb21waWxlck9wdGlvbnNdPzogYW55fTtcbn1cblxuaW50ZXJmYWNlIENvbXBvbmVudERpckluZm8ge1xuICB0c0RpcnM6IFBhY2thZ2VUc0RpcnM7XG4gIGRpcjogc3RyaW5nO1xufVxuXG50eXBlIEVtaXRMaXN0ID0gQXJyYXk8W3N0cmluZywgbnVtYmVyXT47XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c2MoYXJndjogQXJncywgb25Db21waWxlZD86IChlbWl0dGVkOiBFbWl0TGlzdCkgPT4gdm9pZCkge1xuICAvLyBjb25zdCBwb3NzaWJsZVNyY0RpcnMgPSBbJ2lzb20nLCAndHMnXTtcbiAgdmFyIGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IGFyZ3YuanN4ID8gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpIDpcbiAgICByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKTtcbiAgaWYgKGJhc2VUc2NvbmZpZy5lcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYmFzZVRzY29uZmlnLmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZSk7XG4gIH1cbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG5cbiAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAuLi5iYXNlVHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAvLyB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIG91dERpcjogJycsXG4gICAgLy8gcm9vdERpcjogY29uZmlnKCkucm9vdFBhdGgsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWRcbiAgICAvLyBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlXG4gIH07XG5cbiAgc2V0dXBDb21waWxlck9wdGlvbnNXaXRoUGFja2FnZXMoY29tcGlsZXJPcHRpb25zKTtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHByb2Nlc3MuY3dkKCksIGZhbHNlKSkge1xuICAgICAgb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKTtcbiAgICB9XG4gIH1cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzcm91Y2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oY29tcERpckluZm8udmFsdWVzKCkpLm1hcChlbCA9PiBlbC5kaXIpKTtcbiAgY29uc3QgcGFja2FnZURpclRyZWUgPSBuZXcgRGlyVHJlZTxDb21wb25lbnREaXJJbmZvPigpO1xuICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGNvbW1vblJvb3REaXIsIGluZm8uZGlyKTtcbiAgICBwYWNrYWdlRGlyVHJlZS5wdXREYXRhKHRyZWVQYXRoLCBpbmZvKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhwYWNrYWdlRGlyVHJlZS50cmF2ZXJzZSgpKTtcbiAgY29tcGlsZXJPcHRpb25zLnJvb3REaXIgPSBjb21tb25Sb290RGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIC8vIGNvbnN0IHBhY2thZ2VQYXRoID0gcmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzJywgbmFtZSk7XG4gICAgY29uc3QgZGlycyA9IGdldFRzRGlyc09mUGFja2FnZShqc29uKTtcbiAgICBjb25zdCBzcmNEaXJzID0gW2RpcnMuc3JjRGlyLCBkaXJzLmlzb21EaXJdLmZpbHRlcihzcmNEaXIgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGpvaW4ocmVhbFBhdGgsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBjb21wRGlySW5mby5zZXQobmFtZSwge1xuICAgICAgdHNEaXJzOiBkaXJzLFxuICAgICAgZGlyOiByZWFsUGF0aFxuICAgIH0pO1xuICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgY29uc3QgcmVsUGF0aCA9IHJlc29sdmUocmVhbFBhdGgsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50cycpO1xuICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCB0c1Byb2plY3QgPSBndWxwVHMuY3JlYXRlUHJvamVjdCh7Li4uY29tcGlsZXJPcHRpb25zLCB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0Jyl9KTtcblxuICBjb25zdCBkZWxheUNvbXBpbGUgPSBfLmRlYm91bmNlKCgpID0+IHtcbiAgICBjb25zdCB0b0NvbXBpbGUgPSBjb21wR2xvYnM7XG4gICAgY29tcEdsb2JzID0gW107XG4gICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdClcbiAgICAgIC50aGVuKCgpID0+IGNvbXBpbGUodG9Db21waWxlLCB0c1Byb2plY3QsIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCkpXG4gICAgICAuY2F0Y2goKCkgPT4gW10gYXMgRW1pdExpc3QpO1xuICAgIGlmIChvbkNvbXBpbGVkKVxuICAgICAgcHJvbUNvbXBpbGUgPSBwcm9tQ29tcGlsZS50aGVuKGVtaXR0ZWQgPT4ge1xuICAgICAgICBvbkNvbXBpbGVkKGVtaXR0ZWQpO1xuICAgICAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAgIH0pO1xuICB9LCAyMDApO1xuXG4gIGlmIChhcmd2LndhdGNoKSB7XG4gICAgbG9nLmluZm8oJ1dhdGNoIG1vZGUnKTtcbiAgICBjb25zdCB3YXRjaERpcnM6IHN0cmluZ1tdID0gW107XG4gICAgY29tcEdsb2JzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGluZm8gb2YgY29tcERpckluZm8udmFsdWVzKCkpIHtcbiAgICAgIFtpbmZvLnRzRGlycy5zcmNEaXIsIGluZm8udHNEaXJzLmlzb21EaXJdLmZvckVhY2goc3JjRGlyID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IGpvaW4oaW5mby5kaXIsIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB3YXRjaERpcnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICAgIGlmIChhcmd2LmpzeCkge1xuICAgICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHN4Jyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2god2F0Y2hEaXJzLCB7aWdub3JlZDogLyhcXC5kXFwudHN8XFwuanMpJC8gfSk7XG4gICAgd2F0Y2hlci5vbignYWRkJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdhZGRlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2NoYW5nZWQnKSk7XG4gICAgd2F0Y2hlci5vbigndW5saW5rJywgKHBhdGg6IHN0cmluZykgPT4gb25DaGFuZ2VGaWxlKHBhdGgsICdyZW1vdmVkJykpO1xuICB9IGVsc2Uge1xuICAgIHByb21Db21waWxlID0gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uQ2hhbmdlRmlsZShwYXRoOiBzdHJpbmcsIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgaWYgKHJlYXNvbiAhPT0gJ3JlbW92ZWQnKVxuICAgICAgY29tcEdsb2JzLnB1c2gocGF0aCk7XG4gICAgbG9nLmluZm8oYEZpbGUgJHtjaGFsay5jeWFuKHJlbGF0aXZlKHJvb3QsIHBhdGgpKX0gaGFzIGJlZW4gYCArIGNoYWxrLnllbGxvdyhyZWFzb24pKTtcbiAgICBkZWxheUNvbXBpbGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbXBpbGUoY29tcEdsb2JzOiBzdHJpbmdbXSwgdHNQcm9qZWN0OiBhbnksIGlubGluZVNvdXJjZU1hcDogYm9vbGVhbiwgZW1pdFRkc09ubHkgPSBmYWxzZSkge1xuICAgIGNvbnN0IGd1bHBCYXNlID0gcm9vdCArIFNFUDtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIGZ1bmN0aW9uIHByaW50RHVyYXRpb24oaXNFcnJvcjogYm9vbGVhbikge1xuICAgICAgY29uc3Qgc2VjID0gTWF0aC5jZWlsKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICAgIGNvbnN0IG1pbiA9IGAke01hdGguZmxvb3Ioc2VjIC8gNjApfSBtaW51dGVzICR7c2VjICUgNjB9IHNlY2VuZHNgO1xuICAgICAgbG9nLmluZm8oYENvbXBpbGVkICR7aXNFcnJvciA/ICd3aXRoIGVycm9ycyAnIDogJyd9aW4gYCArIG1pbik7XG4gICAgfVxuXG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBmdW5jdGlvbiBjaGFuZ2VQYXRoKCkge1xuICAgICAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY3dkLCBmaWxlLnBhdGgpO1xuICAgICAgICBjb25zdCB7dHNEaXJzLCBkaXJ9ID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCkhO1xuICAgICAgICBjb25zdCBhYnNGaWxlID0gcmVzb2x2ZShjb21tb25Sb290RGlyLCB0cmVlUGF0aCk7XG4gICAgICAgIGNvbnN0IHBhdGhXaXRoaW5Qa2cgPSByZWxhdGl2ZShkaXIsIGFic0ZpbGUpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhkaXIsIHRzRGlycyk7ICBcbiAgICAgICAgZm9yIChjb25zdCBwcmVmaXggb2YgW3RzRGlycy5zcmNEaXIsIHRzRGlycy5pc29tRGlyXSkge1xuICAgICAgICAgIGlmIChwcmVmaXggPT09ICcuJyB8fCBwcmVmaXgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmaWxlLnBhdGggPSBqb2luKGRpciwgdHNEaXJzLmRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgocHJlZml4ICsgc2VwKSkge1xuICAgICAgICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIHRzRGlycy5kZXN0RGlyLCBwYXRoV2l0aGluUGtnLnNsaWNlKHByZWZpeC5sZW5ndGggKyAxKSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZmlsZS5iYXNlID0gY29tbW9uUm9vdERpcjtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZmlsZS5iYXNlLCBmaWxlLnJlbGF0aXZlKTtcbiAgICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxFbWl0TGlzdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgY29tcGlsZUVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IHRzUmVzdWx0ID0gZ3VscC5zcmMoY29tcEdsb2JzKVxuICAgICAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gICAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBGaWxlLCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICBmaWxlLmJhc2UgPSBndWxwQmFzZTtcbiAgICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICAgIH0pKVxuICAgICAgLnBpcGUodHNQcm9qZWN0KCkpXG4gICAgICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgY29tcGlsZUVycm9ycy5wdXNoKGVyci5tZXNzYWdlKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBMSjogTGV0J3MgdHJ5IHRvIHVzZSAtLXNvdXJjZU1hcCB3aXRoIC0taW5saW5lU291cmNlLCBzbyB0aGF0IEkgZG9uJ3QgbmVlZCB0byBjaGFuZ2UgZmlsZSBwYXRoIGluIHNvdXJjZSBtYXBcbiAgICAgIC8vIHdoaWNoIGlzIG91dHB1dGVkXG5cbiAgICAgIC8vIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIC8vICAgaWYgKGZpbGUuZXh0bmFtZSA9PT0gJy5tYXAnKSB7XG4gICAgICAvLyAgICAgY29uc3Qgc20gPSBKU09OLnBhcnNlKGZpbGUuY29udGVudHMudG9TdHJpbmcoKSk7XG4gICAgICAvLyAgICAgbGV0IHNGaWxlRGlyO1xuICAgICAgLy8gICAgIHNtLnNvdXJjZXMgPVxuICAgICAgLy8gICAgICAgc20uc291cmNlcy5tYXAoIChzcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAvLyAgICAgICAgIGNvbnN0IHJlYWxGaWxlID0gZnMucmVhbHBhdGhTeW5jKHNwYXRoKTtcbiAgICAgIC8vICAgICAgICAgc0ZpbGVEaXIgPSBQYXRoLmRpcm5hbWUocmVhbEZpbGUpO1xuICAgICAgLy8gICAgICAgICByZXR1cm4gcmVsYXRpdmUoZmlsZS5iYXNlLCByZWFsRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgLy8gICAgICAgfSk7XG4gICAgICAvLyAgICAgaWYgKHNGaWxlRGlyKVxuICAgICAgLy8gICAgICAgc20uc291cmNlUm9vdCA9IHJlbGF0aXZlKHNGaWxlRGlyLCBmaWxlLmJhc2UpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIC8vICAgICBmaWxlLmNvbnRlbnRzID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoc20pLCAndXRmOCcpO1xuICAgICAgLy8gICB9XG4gICAgICAvLyAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICAvLyB9KSk7XG4gICAgICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICAgICAgaWYgKCFlbWl0VGRzT25seSkge1xuICAgICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuanNcbiAgICAgICAgICAucGlwZShjaGFuZ2VQYXRoKCkpXG4gICAgICAgICAgLnBpcGUoaW5saW5lU291cmNlTWFwID8gc291cmNlbWFwcy53cml0ZSgpIDogc291cmNlbWFwcy53cml0ZSgnLicpKSk7XG4gICAgICB9XG4gICAgICBzdHJlYW1zLnB1c2godHNSZXN1bHQuZHRzLnBpcGUoY2hhbmdlUGF0aCgpKSk7XG5cbiAgICAgIGNvbnN0IGVtaXR0ZWRMaXN0ID0gW10gYXMgRW1pdExpc3Q7XG4gICAgICBjb25zdCBhbGwgPSBtZXJnZShzdHJlYW1zKVxuICAgICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgZGlzcGxheVBhdGggPSByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlLnBhdGgpO1xuICAgICAgICBjb25zdCBkaXNwbGF5U2l6ZSA9IE1hdGgucm91bmQoKGZpbGUuY29udGVudHMgYXMgQnVmZmVyKS5ieXRlTGVuZ3RoIC8gMTAyNCAqIDEwKSAvIDEwO1xuXG4gICAgICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlQnJpZ2h0KGRpc3BsYXlTaXplICsgJycpKTtcbiAgICAgICAgZW1pdHRlZExpc3QucHVzaChbZGlzcGxheVBhdGgsIGRpc3BsYXlTaXplXSk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlKGd1bHAuZGVzdChjb21tb25Sb290RGlyKSk7XG4gICAgICBhbGwucmVzdW1lKCk7XG4gICAgICBhbGwub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgICAgICBjb25zb2xlLmxvZygnXFxuLS0tLS0tLS0tLSBGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzLCBjaGVjayBvdXQgYmVsb3cgZXJyb3IgbWVzc2FnZSAtLS0tLS0tLS0tLS0tXFxuJyk7XG4gICAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgICB9KTtcbiAgICAgIGFsbC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pXG4gICAgLnRoZW4oZW1pdHRlZExpc3QgPT4ge1xuICAgICAgcHJpbnREdXJhdGlvbihmYWxzZSk7XG4gICAgICByZXR1cm4gZW1pdHRlZExpc3Q7XG4gICAgfSlcbiAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgIHByaW50RHVyYXRpb24odHJ1ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwcm9tQ29tcGlsZS50aGVuKChsaXN0KSA9PiB7XG4gICAgaWYgKGFyZ3Yud2F0Y2ggIT09IHRydWUgJiYgcHJvY2Vzcy5zZW5kKSB7XG4gICAgICBwcm9jZXNzLnNlbmQoJ3BsaW5rLXRzYyBjb21waWxlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMpIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpO1xuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBzcGFjZScpO1xuICB9XG4gIGNvbnN0IHR5cGVSb290cyA9IEFycmF5LmZyb20ocGFja2FnZVV0aWxzLnR5cGVSb290c0Zyb21QYWNrYWdlcyh3c0tleSkpO1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvY2Vzcy5jd2QoKSwgY29tcGlsZXJPcHRpb25zLCB7ZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCBleHRyYVR5cGVSb290OiB0eXBlUm9vdHN9KTtcbn1cbiJdfQ==