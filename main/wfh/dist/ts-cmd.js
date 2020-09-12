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
        return compile(compGlobs, tsProject, argv.sourceMap === 'inline', argv.ed);
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
    return promCompile;
}
exports.tsc = tsc;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxrREFBMEI7QUFDMUIsOERBQWdEO0FBQ2hELDZDQUErQjtBQUMvQiwwQ0FBNEI7QUFDNUIsK0JBQWtEO0FBQ2xELDREQUE0QjtBQUU1Qix1Q0FBdUY7QUFFdkYsc0RBQThCO0FBQzlCLHFEQUE2RDtBQUM3RCw2REFBdUQ7QUFDdkQsb0RBQTRCO0FBQzVCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUM5QyxNQUFNLEdBQUcsR0FBRyxVQUFHLENBQUM7QUFFaEIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMvQyx1QkFBdUI7QUFDdkIsTUFBTSxJQUFJLEdBQUcsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztBQW9CL0I7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLElBQVUsRUFBRSxVQUF3QztJQUN0RSwwQ0FBMEM7SUFDMUMsSUFBSSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQzdCLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNwSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFH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Q0FBQztZQUNwQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQWpPRCxrQkFpT0MiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7c2VwLCByZXNvbHZlLCBqb2luLCByZWxhdGl2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgdHlwZSBGaWxlIGZyb20gJ3ZpbnlsJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlLCBQYWNrYWdlVHNEaXJzLCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuY29uc3QgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG5jb25zdCBjaG9raWRhciA9IHJlcXVpcmUoJ2Nob2tpZGFyJyk7XG5jb25zdCBtZXJnZSA9IHJlcXVpcmUoJ21lcmdlMicpO1xuY29uc3Qgc291cmNlbWFwcyA9IHJlcXVpcmUoJ2d1bHAtc291cmNlbWFwcycpO1xuY29uc3QgU0VQID0gc2VwO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmgudHlwZXNjcmlwdCcpO1xuLy8gZXhwb3J0cy5pbml0ID0gaW5pdDtcbmNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcbi8vIGNvbnN0IG5vZGVNb2R1bGVzID0gam9pbihyb290LCAnbm9kZV9tb2R1bGVzJyk7XG5cbmludGVyZmFjZSBBcmdzIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXT86IGFueX07XG59XG5cbmludGVyZmFjZSBDb21wb25lbnREaXJJbmZvIHtcbiAgdHNEaXJzOiBQYWNrYWdlVHNEaXJzO1xuICBkaXI6IHN0cmluZztcbn1cblxudHlwZSBFbWl0TGlzdCA9IEFycmF5PFtzdHJpbmcsIG51bWJlcl0+O1xuXG4vKipcbiAqIEBwYXJhbSB7b2JqZWN0fSBhcmd2XG4gKiBhcmd2LndhdGNoOiBib29sZWFuXG4gKiBhcmd2LnBhY2thZ2U6IHN0cmluZ1tdXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkNvbXBpbGVkICgpID0+IHZvaWRcbiAqIEByZXR1cm4gdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdHNjKGFyZ3Y6IEFyZ3MsIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIHZhciBjb21wR2xvYnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHZhciBjb21wU3RyZWFtID0gW107XG4gIGNvbnN0IGNvbXBEaXJJbmZvOiBNYXA8c3RyaW5nLCBDb21wb25lbnREaXJJbmZvPiA9IG5ldyBNYXAoKTsgLy8ge1tuYW1lOiBzdHJpbmddOiB7c3JjRGlyOiBzdHJpbmcsIGRlc3REaXI6IHN0cmluZ319XG4gIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSBhcmd2LmpzeCA/IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKSA6XG4gICAgcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgY29uc3QgYmFzZVRzY29uZmlnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSk7XG4gIGlmIChiYXNlVHNjb25maWcuZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGJhc2VUc2NvbmZpZy5lcnJvcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgdHNjb25maWcgZmlsZTogJyArIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICB9XG4gIGxldCBwcm9tQ29tcGlsZSA9IFByb21pc2UucmVzb2x2ZSggW10gYXMgRW1pdExpc3QpO1xuXG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAuLi5iYXNlVHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAvLyB0eXBlc2NyaXB0OiByZXF1aXJlKCd0eXBlc2NyaXB0JyksXG4gICAgLy8gQ29tcGlsZXIgb3B0aW9uc1xuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIG91dERpcjogJycsXG4gICAgLy8gcm9vdERpcjogY29uZmlnKCkucm9vdFBhdGgsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IGFyZ3YuZWRcbiAgICAvLyBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCBjb21waWxlck9wdGlvbnMsIHtlbmFibGVUeXBlUm9vdHM6IHRydWV9KTtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgfSBlbHNlXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycpO1xuXG4gIGlmIChjb3VudFBrZyA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm8gYXZhaWxhYmxlIHNyb3VjZSBwYWNrYWdlIGZvdW5kIGluIGN1cnJlbnQgd29ya3NwYWNlJyk7XG4gIH1cbiAgY29uc3QgY29tbW9uUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShjb21wRGlySW5mby52YWx1ZXMoKSkubWFwKGVsID0+IGVsLmRpcikpO1xuICBjb25zdCBwYWNrYWdlRGlyVHJlZSA9IG5ldyBEaXJUcmVlPENvbXBvbmVudERpckluZm8+KCk7XG4gIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgIGNvbnN0IHRyZWVQYXRoID0gcmVsYXRpdmUoY29tbW9uUm9vdERpciwgaW5mby5kaXIpO1xuICAgIHBhY2thZ2VEaXJUcmVlLnB1dERhdGEodHJlZVBhdGgsIGluZm8pO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKHBhY2thZ2VEaXJUcmVlLnRyYXZlcnNlKCkpO1xuICBjb21waWxlck9wdGlvbnMucm9vdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyBjb25zb2xlLmxvZygncm9vdERpcjonLCBjb21tb25Sb290RGlyKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIHBhY2thZ2VQYXRoOiBzdHJpbmcsIF9wYXJzZWROYW1lOiBhbnksIGpzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykge1xuICAgIGNvdW50UGtnKys7XG4gICAgLy8gY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMnLCBuYW1lKTtcbiAgICBjb25zdCBkaXJzID0gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb24pO1xuICAgIGNvbnN0IHNyY0RpcnMgPSBbZGlycy5zcmNEaXIsIGRpcnMuaXNvbURpcl0uZmlsdGVyKHNyY0RpciA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoam9pbihyZWFsUGF0aCwgc3JjRGlyKSkuaXNEaXJlY3RvcnkoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGNvbXBEaXJJbmZvLnNldChuYW1lLCB7XG4gICAgICB0c0RpcnM6IGRpcnMsXG4gICAgICBkaXI6IHJlYWxQYXRoXG4gICAgfSk7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICBjb25zdCByZWxQYXRoID0gcmVzb2x2ZShyZWFsUGF0aCwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBjb21wR2xvYnMucHVzaChyZWxQYXRoICsgJy8qKi8qLnRzJyk7XG4gICAgICBpZiAoYXJndi5qc3gpIHtcbiAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHRzUHJvamVjdCA9IGd1bHBUcy5jcmVhdGVQcm9qZWN0KHsuLi5jb21waWxlck9wdGlvbnMsIHR5cGVzY3JpcHQ6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKX0pO1xuXG4gIGNvbnN0IGRlbGF5Q29tcGlsZSA9IF8uZGVib3VuY2UoKCkgPT4ge1xuICAgIGNvbnN0IHRvQ29tcGlsZSA9IGNvbXBHbG9icztcbiAgICBjb21wR2xvYnMgPSBbXTtcbiAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KVxuICAgICAgLnRoZW4oKCkgPT4gY29tcGlsZSh0b0NvbXBpbGUsIHRzUHJvamVjdCwgYXJndi5zb3VyY2VNYXAgPT09ICdpbmxpbmUnLCBhcmd2LmVkKSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIGNvbnN0IHdhdGNoRGlyczogc3RyaW5nW10gPSBbXTtcbiAgICBjb21wR2xvYnMgPSBbXTtcblxuICAgIGZvciAoY29uc3QgaW5mbyBvZiBjb21wRGlySW5mby52YWx1ZXMoKSkge1xuICAgICAgW2luZm8udHNEaXJzLnNyY0RpciwgaW5mby50c0RpcnMuaXNvbURpcl0uZm9yRWFjaChzcmNEaXIgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gam9pbihpbmZvLmRpciwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIHdhdGNoRGlycy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgd2F0Y2hEaXJzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaCh3YXRjaERpcnMsIHtpZ25vcmVkOiAvKFxcLmRcXC50c3xcXC5qcykkLyB9KTtcbiAgICB3YXRjaGVyLm9uKCdhZGQnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2FkZGVkJykpO1xuICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAnY2hhbmdlZCcpKTtcbiAgICB3YXRjaGVyLm9uKCd1bmxpbmsnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ3JlbW92ZWQnKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNvbXBpbGUoY29tcEdsb2JzLCB0c1Byb2plY3QsIGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJywgYXJndi5lZCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkNoYW5nZUZpbGUocGF0aDogc3RyaW5nLCByZWFzb246IHN0cmluZykge1xuICAgIGlmIChyZWFzb24gIT09ICdyZW1vdmVkJylcbiAgICAgIGNvbXBHbG9icy5wdXNoKHBhdGgpO1xuICAgIGxvZy5pbmZvKGBGaWxlICR7Y2hhbGsuY3lhbihyZWxhdGl2ZShyb290LCBwYXRoKSl9IGhhcyBiZWVuIGAgKyBjaGFsay55ZWxsb3cocmVhc29uKSk7XG4gICAgZGVsYXlDb21waWxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjb21waWxlKGNvbXBHbG9iczogc3RyaW5nW10sIHRzUHJvamVjdDogYW55LCBpbmxpbmVTb3VyY2VNYXA6IGJvb2xlYW4sIGVtaXRUZHNPbmx5ID0gZmFsc2UpIHtcbiAgICBjb25zdCBndWxwQmFzZSA9IHJvb3QgKyBTRVA7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICBmdW5jdGlvbiBwcmludER1cmF0aW9uKGlzRXJyb3I6IGJvb2xlYW4pIHtcbiAgICAgIGNvbnN0IHNlYyA9IE1hdGguY2VpbCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgICBjb25zdCBtaW4gPSBgJHtNYXRoLmZsb29yKHNlYyAvIDYwKX0gbWludXRlcyAke3NlYyAlIDYwfSBzZWNlbmRzYDtcbiAgICAgIGxvZy5pbmZvKGBDb21waWxlZCAke2lzRXJyb3IgPyAnd2l0aCBlcnJvcnMgJyA6ICcnfWluIGAgKyBtaW4pO1xuICAgIH1cblxuICAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgZnVuY3Rpb24gY2hhbmdlUGF0aCgpIHtcbiAgICAgIHJldHVybiB0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBGaWxlLCBlbjogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgICBjb25zdCB0cmVlUGF0aCA9IHJlbGF0aXZlKGN3ZCwgZmlsZS5wYXRoKTtcbiAgICAgICAgY29uc3Qge3RzRGlycywgZGlyfSA9IHBhY2thZ2VEaXJUcmVlLmdldEFsbERhdGEodHJlZVBhdGgpLnBvcCgpITtcbiAgICAgICAgY29uc3QgYWJzRmlsZSA9IHJlc29sdmUoY29tbW9uUm9vdERpciwgdHJlZVBhdGgpO1xuICAgICAgICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoZGlyLCBhYnNGaWxlKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coZGlyLCB0c0RpcnMpOyAgXG4gICAgICAgIGZvciAoY29uc3QgcHJlZml4IG9mIFt0c0RpcnMuc3JjRGlyLCB0c0RpcnMuaXNvbURpcl0pIHtcbiAgICAgICAgICBpZiAocHJlZml4ID09PSAnLicgfHwgcHJlZml4Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIHRzRGlycy5kZXN0RGlyLCBwYXRoV2l0aGluUGtnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSBpZiAocGF0aFdpdGhpblBrZy5zdGFydHNXaXRoKHByZWZpeCArIHNlcCkpIHtcbiAgICAgICAgICAgIGZpbGUucGF0aCA9IGpvaW4oZGlyLCB0c0RpcnMuZGVzdERpciwgcGF0aFdpdGhpblBrZy5zbGljZShwcmVmaXgubGVuZ3RoICsgMSkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZpbGUuYmFzZSA9IGNvbW1vblJvb3REaXI7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGZpbGUuYmFzZSwgZmlsZS5yZWxhdGl2ZSk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8RW1pdExpc3Q+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGVFcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB0c1Jlc3VsdCA9IGd1bHAuc3JjKGNvbXBHbG9icylcbiAgICAgIC5waXBlKHNvdXJjZW1hcHMuaW5pdCgpKVxuICAgICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcbiAgICAgICAgZmlsZS5iYXNlID0gZ3VscEJhc2U7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSlcbiAgICAgIC5waXBlKHRzUHJvamVjdCgpKVxuICAgICAgLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgIGNvbXBpbGVFcnJvcnMucHVzaChlcnIubWVzc2FnZSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gTEo6IExldCdzIHRyeSB0byB1c2UgLS1zb3VyY2VNYXAgd2l0aCAtLWlubGluZVNvdXJjZSwgc28gdGhhdCBJIGRvbid0IG5lZWQgdG8gY2hhbmdlIGZpbGUgcGF0aCBpbiBzb3VyY2UgbWFwXG4gICAgICAvLyB3aGljaCBpcyBvdXRwdXRlZFxuXG4gICAgICAvLyAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAvLyAgIGlmIChmaWxlLmV4dG5hbWUgPT09ICcubWFwJykge1xuICAgICAgLy8gICAgIGNvbnN0IHNtID0gSlNPTi5wYXJzZShmaWxlLmNvbnRlbnRzLnRvU3RyaW5nKCkpO1xuICAgICAgLy8gICAgIGxldCBzRmlsZURpcjtcbiAgICAgIC8vICAgICBzbS5zb3VyY2VzID1cbiAgICAgIC8vICAgICAgIHNtLnNvdXJjZXMubWFwKCAoc3BhdGg6IHN0cmluZykgPT4ge1xuICAgICAgLy8gICAgICAgICBjb25zdCByZWFsRmlsZSA9IGZzLnJlYWxwYXRoU3luYyhzcGF0aCk7XG4gICAgICAvLyAgICAgICAgIHNGaWxlRGlyID0gUGF0aC5kaXJuYW1lKHJlYWxGaWxlKTtcbiAgICAgIC8vICAgICAgICAgcmV0dXJuIHJlbGF0aXZlKGZpbGUuYmFzZSwgcmVhbEZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIC8vICAgICAgIH0pO1xuICAgICAgLy8gICAgIGlmIChzRmlsZURpcilcbiAgICAgIC8vICAgICAgIHNtLnNvdXJjZVJvb3QgPSByZWxhdGl2ZShzRmlsZURpciwgZmlsZS5iYXNlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAvLyAgICAgZmlsZS5jb250ZW50cyA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHNtKSwgJ3V0ZjgnKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgLy8gfSkpO1xuICAgICAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbiAgICAgIGlmICghZW1pdFRkc09ubHkpIHtcbiAgICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmpzXG4gICAgICAgICAgLnBpcGUoY2hhbmdlUGF0aCgpKVxuICAgICAgICAgIC5waXBlKGlubGluZVNvdXJjZU1hcCA/IHNvdXJjZW1hcHMud3JpdGUoKSA6IHNvdXJjZW1hcHMud3JpdGUoJy4nKSkpO1xuICAgICAgfVxuICAgICAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmR0cy5waXBlKGNoYW5nZVBhdGgoKSkpO1xuXG4gICAgICBjb25zdCBlbWl0dGVkTGlzdCA9IFtdIGFzIEVtaXRMaXN0O1xuICAgICAgY29uc3QgYWxsID0gbWVyZ2Uoc3RyZWFtcylcbiAgICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlQYXRoID0gcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZS5wYXRoKTtcbiAgICAgICAgY29uc3QgZGlzcGxheVNpemUgPSBNYXRoLnJvdW5kKChmaWxlLmNvbnRlbnRzIGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aCAvIDEwMjQgKiAxMCkgLyAxMDtcblxuICAgICAgICBsb2cuaW5mbygnJXMgJXMgS2InLCBkaXNwbGF5UGF0aCwgY2hhbGsuYmx1ZUJyaWdodChkaXNwbGF5U2l6ZSArICcnKSk7XG4gICAgICAgIGVtaXR0ZWRMaXN0LnB1c2goW2Rpc3BsYXlQYXRoLCBkaXNwbGF5U2l6ZV0pO1xuICAgICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgfSkpXG4gICAgICAucGlwZShndWxwLmRlc3QoY29tbW9uUm9vdERpcikpO1xuICAgICAgYWxsLnJlc3VtZSgpO1xuICAgICAgYWxsLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGlmIChjb21waWxlRXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICAgICAgY29uc29sZS5sb2coJ1xcbi0tLS0tLS0tLS0gRmFpbGVkIHRvIGNvbXBpbGUgVHlwZXNjcmlwdCBmaWxlcywgY2hlY2sgb3V0IGJlbG93IGVycm9yIG1lc3NhZ2UgLS0tLS0tLS0tLS0tLVxcbicpO1xuICAgICAgICAgIGNvbXBpbGVFcnJvcnMuZm9yRWFjaChtc2cgPT4gbG9nLmVycm9yKG1zZykpO1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzJykpO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUoZW1pdHRlZExpc3QpO1xuICAgICAgfSk7XG4gICAgICBhbGwub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICB9KVxuICAgIC50aGVuKGVtaXR0ZWRMaXN0ID0+IHtcbiAgICAgIHByaW50RHVyYXRpb24oZmFsc2UpO1xuICAgICAgcmV0dXJuIGVtaXR0ZWRMaXN0O1xuICAgIH0pXG4gICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICBwcmludER1cmF0aW9uKHRydWUpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcHJvbUNvbXBpbGU7XG59XG4iXX0=