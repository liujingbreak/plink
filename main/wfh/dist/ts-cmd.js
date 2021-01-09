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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
    const compGlobs = [];
    // var compStream = [];
    const compDirInfo = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
    const baseTsconfigFile = require.resolve('../tsconfig-base.json');
    const baseTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
    if (baseTsconfig.error) {
        console.error(baseTsconfig.error);
        throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile);
    }
    let baseCompilerOptions = baseTsconfig.config.compilerOptions;
    if (argv.jsx) {
        const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
        const tsxTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile2, fs.readFileSync(baseTsconfigFile2, 'utf8'));
        if (tsxTsconfig.error) {
            console.error(tsxTsconfig.error);
            throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile2);
        }
        baseCompilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), tsxTsconfig.config.compilerOptions);
    }
    let promCompile = Promise.resolve([]);
    const packageDirTree = new dir_tree_1.DirTree();
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
    const commonRootDir = misc_1.closestCommonParentDir(Array.from(compDirInfo.values()).map(el => el.pkgDir));
    for (const info of compDirInfo.values()) {
        const treePath = path_1.relative(commonRootDir, info.pkgDir);
        packageDirTree.putData(treePath, info);
    }
    const destDir = commonRootDir.replace(/\\/g, '/');
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { 
        // typescript: require('typescript'),
        // Compiler options
        importHelpers: false, declaration: true, 
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: destDir, rootDir: destDir, skipLibCheck: true, inlineSourceMap: argv.sourceMap === 'inline', sourceMap: true, inlineSources: argv.sourceMap === 'inline', emitDeclarationOnly: argv.ed });
    setupCompilerOptionsWithPackages(compilerOptions, argv.pathsJsons);
    log.info('typescript compilerOptions:', compilerOptions);
    const tsProject = gulpTs.createProject(Object.assign(Object.assign({}, compilerOptions), { typescript: require('typescript') }));
    if (argv.watch) {
        log.info('Watch mode');
        watch(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed, argv.jsx, onCompiled);
    }
    else {
        promCompile = compile(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed);
    }
    function onComponent(name, packagePath, _parsedName, json, realPath) {
        countPkg++;
        const tscCfg = misc_1.getTscConfigOfPkg(json);
        compDirInfo.set(name, Object.assign(Object.assign({}, tscCfg), { pkgDir: realPath }));
        if (tscCfg.globs) {
            compGlobs.push(...tscCfg.globs.map(file => path_1.resolve(realPath, file).replace(/\\/g, '/')));
            return;
        }
        const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
            if (srcDir == null)
                return false;
            try {
                return fs.statSync(path_1.join(realPath, srcDir)).isDirectory();
            }
            catch (e) {
                return false;
            }
        });
        if (tscCfg.include) {
            tscCfg.include = [].concat(tscCfg.include);
        }
        if (tscCfg.include && tscCfg.include.length > 0) {
            for (const pattern of tscCfg.include) {
                const includePath = path_1.resolve(realPath, pattern).replace(/\\/g, '/');
                compGlobs.push(includePath);
            }
        }
        else {
            srcDirs.forEach(srcDir => {
                const relPath = path_1.resolve(realPath, srcDir).replace(/\\/g, '/');
                compGlobs.push(relPath + '/**/*.ts');
                if (argv.jsx) {
                    compGlobs.push(relPath + '/**/*.tsx');
                }
            });
        }
    }
    return promCompile.then((list) => {
        if (argv.watch !== true && process.send) {
            process.send('plink-tsc compiled');
        }
        return list;
    });
}
exports.tsc = tsc;
function compile(compGlobs, tsProject, commonRootDir, packageDirTree, emitTdsOnly = false) {
    return __awaiter(this, void 0, void 0, function* () {
        // const gulpBase = root + SEP;
        const startTime = new Date().getTime();
        function printDuration(isError) {
            const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
            const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
            log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
        }
        const compileErrors = [];
        log.info('tsc compiles: ', compGlobs.join(', '));
        const tsResult = gulp.src(compGlobs)
            .pipe(sourcemaps.init())
            .pipe(tsProject())
            .on('error', (err) => {
            compileErrors.push(err.message);
        });
        // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
        // which is outputed
        const streams = [];
        // if (!emitTdsOnly) {
        //   const jsStream = tsResult.js
        //     .pipe(changePath(commonRootDir, packageDirTree))
        //     .pipe(sourcemaps.write('.', {includeContent: true}));
        //   streams.push(jsStream);
        // }
        const jsStream = tsResult.js
            .pipe(changePath(commonRootDir, packageDirTree))
            .pipe(sourcemaps.write('.', { includeContent: true }));
        streams.push(jsStream);
        streams.push(tsResult.dts.pipe(changePath(commonRootDir, packageDirTree)));
        const emittedList = [];
        const all = merge(streams)
            .pipe(through.obj(function (file, en, next) {
            // if (emitTdsOnly && !file.path.endsWith('.d.ts'))
            //   return next();
            const displayPath = path_1.relative(process.cwd(), file.path);
            const displaySize = Math.round(file.contents.byteLength / 1024 * 10) / 10;
            log.info('%s %s Kb', displayPath, chalk_1.default.blueBright(displaySize + ''));
            emittedList.push([displayPath, displaySize]);
            next(null, file);
        }))
            .pipe(gulp.dest(commonRootDir));
        try {
            yield new Promise((resolve, reject) => {
                all.on('end', () => {
                    if (compileErrors.length > 0) {
                        log.error('\n---------- Failed to compile Typescript files, check out below error message -------------\n');
                        compileErrors.forEach(msg => log.error(msg));
                        return reject(new Error('Failed to compile Typescript files'));
                    }
                    resolve(emittedList);
                });
                all.on('error', reject);
                all.resume();
            });
            return emittedList;
        }
        finally {
            printDuration(false);
        }
    });
}
function watch(compGlobs, tsProject, commonRootDir, packageDirTree, emitTdsOnly = false, hasTsx = false, onCompiled) {
    const compileFiles = [];
    let promCompile = Promise.resolve([]);
    const delayCompile = _.debounce((globs) => {
        const globsCopy = globs.slice(0, globs.length);
        globs.splice(0);
        promCompile = promCompile.catch(() => [])
            .then(() => compile(globsCopy, tsProject, commonRootDir, packageDirTree, emitTdsOnly))
            .catch(() => []);
        if (onCompiled)
            promCompile = promCompile.then(emitted => {
                onCompiled(emitted);
                return emitted;
            });
    }, 200);
    const watcher = chokidar.watch(compGlobs, { ignored: /(\.d\.ts|\.js)$/ });
    watcher.on('add', (path) => onChangeFile(path, 'added'));
    watcher.on('change', (path) => onChangeFile(path, 'changed'));
    watcher.on('unlink', (path) => onChangeFile(path, 'removed'));
    function onChangeFile(path, reason) {
        if (reason !== 'removed')
            compileFiles.push(path);
        log.info(`File ${chalk_1.default.cyan(path_1.relative(root, path))} has been ` + chalk_1.default.yellow(reason));
        delayCompile(compileFiles);
    }
}
function changePath(commonRootDir, packageDirTree) {
    return through.obj(function (file, en, next) {
        const treePath = path_1.relative(commonRootDir, file.path);
        file._originPath = file.path;
        const { srcDir, destDir, pkgDir: dir } = packageDirTree.getAllData(treePath).pop();
        const absFile = path_1.resolve(commonRootDir, treePath);
        const pathWithinPkg = path_1.relative(dir, absFile);
        // console.log(dir, tsDirs);
        const prefix = srcDir;
        // for (const prefix of [tsDirs.srcDir, tsDirs.isomDir]) {
        if (prefix === '.' || prefix.length === 0) {
            file.path = path_1.join(dir, destDir, pathWithinPkg);
            // break;
        }
        else if (pathWithinPkg.startsWith(prefix + path_1.sep)) {
            file.path = path_1.join(dir, destDir, pathWithinPkg.slice(prefix.length + 1));
            // break;
        }
        // }
        // console.log('pathWithinPkg', pathWithinPkg);
        // console.log('file.path', file.path);
        file.base = commonRootDir;
        // console.log('file.base', file.base);
        // console.log('file.relative', file.relative);
        next(null, file);
    });
}
function setupCompilerOptionsWithPackages(compilerOptions, pathsJsons) {
    let wsKey = package_mgr_1.workspaceKey(process.cwd());
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    config_handler_1.setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: path_1.resolve(root, wsKey)
    });
    pathsJsons.reduce((pathMap, jsonStr) => {
        return Object.assign(Object.assign({}, pathMap), JSON.parse(jsonStr));
    }, compilerOptions.paths);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrQ0FBa0M7QUFDbEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsa0RBQTBCO0FBQzFCLG1DQUFtQztBQUNuQyw4REFBZ0Q7QUFDaEQsNkNBQStCO0FBQy9CLDBDQUE0QjtBQUM1QiwrQkFBa0Q7QUFDbEQsNERBQTRCO0FBRTVCLHVDQUFzRjtBQUV0RixzREFBOEI7QUFDOUIscURBQXlHO0FBQ3pHLDZEQUF1RDtBQUN2RCwrQ0FBcUQ7QUFDckQsb0RBQTRCO0FBQzVCLDREQUE4QztBQUU5QywyQkFBMkI7QUFDM0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDckMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLGlEQUFpRDtBQUVqRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQy9DLHVCQUF1QjtBQUN2QixNQUFNLElBQUksR0FBRyxnQkFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0FBcUIvQjs7Ozs7O0dBTUc7QUFDSCxTQUFnQixHQUFHLENBQUMsSUFBaUIsRUFBRSxVQUF3QztJQUM3RSwwQ0FBMEM7SUFDMUMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQy9CLHVCQUF1QjtJQUN2QixNQUFNLFdBQVcsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNEQUFzRDtJQUNwSCxNQUFNLGdCQUFnQixHQUFHLE9BQU8s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QUMsQ0FBQyxDQUFDLENBQUM7WUFDdkUsU0FBUztTQUNWO1FBQ0QsSUFBSTtRQUNKLCtDQUErQztRQUMvQyx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7UUFDMUIsdUNBQXVDO1FBQ3ZDLCtDQUErQztRQUMvQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsZ0NBQWdDLENBQUMsZUFBd0MsRUFBRSxVQUFvQjtJQUN0RyxJQUFJLEtBQUssR0FBOEIsMEJBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNuRSxJQUFJLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ25DLEtBQUssR0FBRyxzQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO0lBQ25DLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7S0FDMUQ7SUFFRCw0Q0FBMkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRTtRQUNoRSxlQUFlLEVBQUUsSUFBSTtRQUNyQixZQUFZLEVBQUUsY0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7S0FDbkMsQ0FBQyxDQUFDO0lBRUgsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNyQyx1Q0FBVyxPQUFPLEdBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRTtJQUM5QyxDQUFDLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5jb25zdCBndWxwVHMgPSByZXF1aXJlKCdndWxwLXR5cGVzY3JpcHQnKTtcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidHlwZXMuZC50c1wiIC8+XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7c2VwLCByZXNvbHZlLCBqb2luLCByZWxhdGl2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgRmlsZSBmcm9tICd2aW55bCc7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnLCBQYWNrYWdlVHNEaXJzLCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgQ29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBzb3VyY2VtYXBzIGZyb20gJ2d1bHAtc291cmNlbWFwcyc7XG5cbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuY29uc3QgY2hva2lkYXIgPSByZXF1aXJlKCdjaG9raWRhcicpO1xuY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcbi8vIGNvbnN0IHNvdXJjZW1hcHMgPSByZXF1aXJlKCdndWxwLXNvdXJjZW1hcHMnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnR5cGVzY3JpcHQnKTtcbi8vIGV4cG9ydHMuaW5pdCA9IGluaXQ7XG5jb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG4vLyBjb25zdCBub2RlTW9kdWxlcyA9IGpvaW4ocm9vdCwgJ25vZGVfbW9kdWxlcycpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgaW5jbHVkZT86IHN0cmluZ1tdO1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgcGF0aHNKc29uczogc3RyaW5nW107XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXT86IGFueX07XG59XG5cbmludGVyZmFjZSBDb21wb25lbnREaXJJbmZvIGV4dGVuZHMgUGFja2FnZVRzRGlycyB7XG4gIHBrZ0Rpcjogc3RyaW5nO1xufVxuXG50eXBlIEVtaXRMaXN0ID0gQXJyYXk8W3N0cmluZywgbnVtYmVyXT47XG5cbi8qKlxuICogQHBhcmFtIHtvYmplY3R9IGFyZ3ZcbiAqIGFyZ3Yud2F0Y2g6IGJvb2xlYW5cbiAqIGFyZ3YucGFja2FnZTogc3RyaW5nW11cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uQ29tcGlsZWQgKCkgPT4gdm9pZFxuICogQHJldHVybiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c2MoYXJndjogVHNjQ21kUGFyYW0sIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcG9zc2libGVTcmNEaXJzID0gWydpc29tJywgJ3RzJ107XG4gIGNvbnN0IGNvbXBHbG9iczogc3RyaW5nW10gPSBbXTtcbiAgLy8gdmFyIGNvbXBTdHJlYW0gPSBbXTtcbiAgY29uc3QgY29tcERpckluZm86IE1hcDxzdHJpbmcsIENvbXBvbmVudERpckluZm8+ID0gbmV3IE1hcCgpOyAvLyB7W25hbWU6IHN0cmluZ106IHtzcmNEaXI6IHN0cmluZywgZGVzdERpcjogc3RyaW5nfX1cbiAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpO1xuICBpZiAoYmFzZVRzY29uZmlnLmVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihiYXNlVHNjb25maWcuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IHRzY29uZmlnIGZpbGU6ICcgKyBiYXNlVHNjb25maWdGaWxlKTtcbiAgfVxuXG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnM7XG5cbiAgaWYgKGFyZ3YuanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUyLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZTIsICd1dGY4JykpO1xuICAgIGlmICh0c3hUc2NvbmZpZy5lcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcih0c3hUc2NvbmZpZy5lcnJvcik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29ycmVjdCB0c2NvbmZpZyBmaWxlOiAnICsgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIH1cbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9XG5cbiAgbGV0IHByb21Db21waWxlID0gUHJvbWlzZS5yZXNvbHZlKCBbXSBhcyBFbWl0TGlzdCk7XG4gIGNvbnN0IHBhY2thZ2VEaXJUcmVlID0gbmV3IERpclRyZWU8Q29tcG9uZW50RGlySW5mbz4oKTtcblxuICBsZXQgY291bnRQa2cgPSAwO1xuICBpZiAoYXJndi5wYWNrYWdlICYmIGFyZ3YucGFja2FnZS5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoYXJndi5wYWNrYWdlLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlVXRpbHMucGFja2FnZXM0V29ya3NwYWNlKHByb2Nlc3MuY3dkKCksIGZhbHNlKSkge1xuICAgICAgb25Db21wb25lbnQocGtnLm5hbWUsIHBrZy5wYXRoLCBudWxsLCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoKTtcbiAgICB9XG4gIH1cblxuICBpZiAoY291bnRQa2cgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGF2YWlsYWJsZSBzcm91Y2UgcGFja2FnZSBmb3VuZCBpbiBjdXJyZW50IHdvcmtzcGFjZScpO1xuICB9XG4gIGNvbnN0IGNvbW1vblJvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oY29tcERpckluZm8udmFsdWVzKCkpLm1hcChlbCA9PiBlbC5wa2dEaXIpKTtcbiAgZm9yIChjb25zdCBpbmZvIG9mIGNvbXBEaXJJbmZvLnZhbHVlcygpKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBpbmZvLnBrZ0Rpcik7XG4gICAgcGFja2FnZURpclRyZWUucHV0RGF0YSh0cmVlUGF0aCwgaW5mbyk7XG4gIH1cbiAgY29uc3QgZGVzdERpciA9IGNvbW1vblJvb3REaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VDb21waWxlck9wdGlvbnMsXG4gICAgLy8gdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpLFxuICAgIC8vIENvbXBpbGVyIG9wdGlvbnNcbiAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbiAgICAvKipcbiAgICAgKiBmb3IgZ3VscC1zb3VyY2VtYXBzIHVzYWdlOlxuICAgICAqICBJZiB5b3Ugc2V0IHRoZSBvdXREaXIgb3B0aW9uIHRvIHRoZSBzYW1lIHZhbHVlIGFzIHRoZSBkaXJlY3RvcnkgaW4gZ3VscC5kZXN0LCB5b3Ugc2hvdWxkIHNldCB0aGUgc291cmNlUm9vdCB0byAuLy5cbiAgICAgKi9cbiAgICBvdXREaXI6IGRlc3REaXIsXG4gICAgcm9vdERpcjogZGVzdERpcixcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBhcmd2LnNvdXJjZU1hcCA9PT0gJ2lubGluZScsXG4gICAgc291cmNlTWFwOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZXM6IGFyZ3Yuc291cmNlTWFwID09PSAnaW5saW5lJyxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBhcmd2LmVkXG4gICAgLy8gcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuICBzZXR1cENvbXBpbGVyT3B0aW9uc1dpdGhQYWNrYWdlcyhjb21waWxlck9wdGlvbnMsIGFyZ3YucGF0aHNKc29ucyk7XG5cbiAgbG9nLmluZm8oJ3R5cGVzY3JpcHQgY29tcGlsZXJPcHRpb25zOicsIGNvbXBpbGVyT3B0aW9ucyk7XG5cbiAgY29uc3QgdHNQcm9qZWN0ID0gZ3VscFRzLmNyZWF0ZVByb2plY3Qoey4uLmNvbXBpbGVyT3B0aW9ucywgdHlwZXNjcmlwdDogcmVxdWlyZSgndHlwZXNjcmlwdCcpfSk7XG5cbiAgaWYgKGFyZ3Yud2F0Y2gpIHtcbiAgICBsb2cuaW5mbygnV2F0Y2ggbW9kZScpO1xuICAgIHdhdGNoKGNvbXBHbG9icywgdHNQcm9qZWN0LCBjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSwgYXJndi5lZCwgYXJndi5qc3gsIG9uQ29tcGlsZWQpO1xuICB9IGVsc2Uge1xuICAgIHByb21Db21waWxlID0gY29tcGlsZShjb21wR2xvYnMsIHRzUHJvamVjdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGFyZ3YuZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogc3RyaW5nLCBfcGFyc2VkTmFtZTogYW55LCBqc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgICBjb3VudFBrZysrO1xuICAgIGNvbnN0IHRzY0NmZyA9IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuXG4gICAgY29tcERpckluZm8uc2V0KG5hbWUsIHsuLi50c2NDZmcsIHBrZ0RpcjogcmVhbFBhdGh9KTtcblxuICAgIGlmICh0c2NDZmcuZ2xvYnMpIHtcbiAgICAgIGNvbXBHbG9icy5wdXNoKC4uLnRzY0NmZy5nbG9icy5tYXAoZmlsZSA9PiByZXNvbHZlKHJlYWxQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzcmNEaXJzID0gW3RzY0NmZy5zcmNEaXIsIHRzY0NmZy5pc29tRGlyXS5maWx0ZXIoc3JjRGlyID0+IHtcbiAgICAgIGlmIChzcmNEaXIgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGpvaW4ocmVhbFBhdGgsIHNyY0RpcikpLmlzRGlyZWN0b3J5KCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSkge1xuICAgICAgdHNjQ2ZnLmluY2x1ZGUgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdCh0c2NDZmcuaW5jbHVkZSk7XG4gICAgfVxuICAgIGlmICh0c2NDZmcuaW5jbHVkZSAmJiB0c2NDZmcuaW5jbHVkZS5sZW5ndGggPiAwKSB7XG4gICAgICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgdHNjQ2ZnLmluY2x1ZGUpIHtcbiAgICAgICAgY29uc3QgaW5jbHVkZVBhdGggPSByZXNvbHZlKHJlYWxQYXRoLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKGluY2x1ZGVQYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSByZXNvbHZlKHJlYWxQYXRoLCBzcmNEaXIhKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbXBHbG9icy5wdXNoKHJlbFBhdGggKyAnLyoqLyoudHMnKTtcbiAgICAgICAgaWYgKGFyZ3YuanN4KSB7XG4gICAgICAgICAgY29tcEdsb2JzLnB1c2gocmVsUGF0aCArICcvKiovKi50c3gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICByZXR1cm4gcHJvbUNvbXBpbGUudGhlbigobGlzdCkgPT4ge1xuICAgIGlmIChhcmd2LndhdGNoICE9PSB0cnVlICYmIHByb2Nlc3Muc2VuZCkge1xuICAgICAgcHJvY2Vzcy5zZW5kKCdwbGluay10c2MgY29tcGlsZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb21waWxlKGNvbXBHbG9iczogc3RyaW5nW10sIHRzUHJvamVjdDogYW55LCBjb21tb25Sb290RGlyOiBzdHJpbmcsIHBhY2thZ2VEaXJUcmVlOiBEaXJUcmVlPENvbXBvbmVudERpckluZm8+LCBlbWl0VGRzT25seSA9IGZhbHNlKSB7XG4gIC8vIGNvbnN0IGd1bHBCYXNlID0gcm9vdCArIFNFUDtcbiAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgZnVuY3Rpb24gcHJpbnREdXJhdGlvbihpc0Vycm9yOiBib29sZWFuKSB7XG4gICAgY29uc3Qgc2VjID0gTWF0aC5jZWlsKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICBjb25zdCBtaW4gPSBgJHtNYXRoLmZsb29yKHNlYyAvIDYwKX0gbWludXRlcyAke3NlYyAlIDYwfSBzZWNlbmRzYDtcbiAgICBsb2cuaW5mbyhgQ29tcGlsZWQgJHtpc0Vycm9yID8gJ3dpdGggZXJyb3JzICcgOiAnJ31pbiBgICsgbWluKTtcbiAgfVxuXG5cbiAgY29uc3QgY29tcGlsZUVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgbG9nLmluZm8oJ3RzYyBjb21waWxlczogJywgY29tcEdsb2JzLmpvaW4oJywgJykpO1xuICBjb25zdCB0c1Jlc3VsdCA9IGd1bHAuc3JjKGNvbXBHbG9icylcbiAgLnBpcGUoc291cmNlbWFwcy5pbml0KCkpXG4gIC5waXBlKHRzUHJvamVjdCgpKVxuICAub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICBjb21waWxlRXJyb3JzLnB1c2goZXJyLm1lc3NhZ2UpO1xuICB9KTtcblxuICAvLyBMSjogTGV0J3MgdHJ5IHRvIHVzZSAtLXNvdXJjZU1hcCB3aXRoIC0taW5saW5lU291cmNlLCBzbyB0aGF0IEkgZG9uJ3QgbmVlZCB0byBjaGFuZ2UgZmlsZSBwYXRoIGluIHNvdXJjZSBtYXBcbiAgLy8gd2hpY2ggaXMgb3V0cHV0ZWRcblxuICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuXG4gIC8vIGlmICghZW1pdFRkc09ubHkpIHtcbiAgLy8gICBjb25zdCBqc1N0cmVhbSA9IHRzUmVzdWx0LmpzXG4gIC8vICAgICAucGlwZShjaGFuZ2VQYXRoKGNvbW1vblJvb3REaXIsIHBhY2thZ2VEaXJUcmVlKSlcbiAgLy8gICAgIC5waXBlKHNvdXJjZW1hcHMud3JpdGUoJy4nLCB7aW5jbHVkZUNvbnRlbnQ6IHRydWV9KSk7XG4gIC8vICAgc3RyZWFtcy5wdXNoKGpzU3RyZWFtKTtcbiAgLy8gfVxuICBjb25zdCBqc1N0cmVhbSA9IHRzUmVzdWx0LmpzXG4gICAgLnBpcGUoY2hhbmdlUGF0aChjb21tb25Sb290RGlyLCBwYWNrYWdlRGlyVHJlZSkpXG4gICAgLnBpcGUoc291cmNlbWFwcy53cml0ZSgnLicsIHtpbmNsdWRlQ29udGVudDogdHJ1ZX0pKTtcbiAgc3RyZWFtcy5wdXNoKGpzU3RyZWFtKTtcbiAgc3RyZWFtcy5wdXNoKHRzUmVzdWx0LmR0cy5waXBlKGNoYW5nZVBhdGgoY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUpKSk7XG5cbiAgY29uc3QgZW1pdHRlZExpc3QgPSBbXSBhcyBFbWl0TGlzdDtcbiAgY29uc3QgYWxsID0gbWVyZ2Uoc3RyZWFtcylcbiAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogRmlsZSwgZW46IHN0cmluZywgbmV4dDogKC4uLmFyZzogYW55W10pID0+IHZvaWQpIHtcblxuICAgIC8vIGlmIChlbWl0VGRzT25seSAmJiAhZmlsZS5wYXRoLmVuZHNXaXRoKCcuZC50cycpKVxuICAgIC8vICAgcmV0dXJuIG5leHQoKTtcbiAgICBjb25zdCBkaXNwbGF5UGF0aCA9IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUucGF0aCk7XG4gICAgY29uc3QgZGlzcGxheVNpemUgPSBNYXRoLnJvdW5kKChmaWxlLmNvbnRlbnRzIGFzIEJ1ZmZlcikuYnl0ZUxlbmd0aCAvIDEwMjQgKiAxMCkgLyAxMDtcblxuICAgIGxvZy5pbmZvKCclcyAlcyBLYicsIGRpc3BsYXlQYXRoLCBjaGFsay5ibHVlQnJpZ2h0KGRpc3BsYXlTaXplICsgJycpKTtcbiAgICBlbWl0dGVkTGlzdC5wdXNoKFtkaXNwbGF5UGF0aCwgZGlzcGxheVNpemVdKTtcbiAgICBuZXh0KG51bGwsIGZpbGUpO1xuICB9KSlcbiAgLnBpcGUoZ3VscC5kZXN0KGNvbW1vblJvb3REaXIpKTtcblxuICB0cnkge1xuICAgIGF3YWl0IG5ldyBQcm9taXNlPEVtaXRMaXN0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBhbGwub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKGNvbXBpbGVFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGxvZy5lcnJvcignXFxuLS0tLS0tLS0tLSBGYWlsZWQgdG8gY29tcGlsZSBUeXBlc2NyaXB0IGZpbGVzLCBjaGVjayBvdXQgYmVsb3cgZXJyb3IgbWVzc2FnZSAtLS0tLS0tLS0tLS0tXFxuJyk7XG4gICAgICAgICAgY29tcGlsZUVycm9ycy5mb3JFYWNoKG1zZyA9PiBsb2cuZXJyb3IobXNnKSk7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjb21waWxlIFR5cGVzY3JpcHQgZmlsZXMnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZShlbWl0dGVkTGlzdCk7XG4gICAgICB9KTtcbiAgICAgIGFsbC5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgYWxsLnJlc3VtZSgpO1xuICAgIH0pO1xuICAgIHJldHVybiBlbWl0dGVkTGlzdDtcbiAgfSBmaW5hbGx5IHtcbiAgICBwcmludER1cmF0aW9uKGZhbHNlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3YXRjaChjb21wR2xvYnM6IHN0cmluZ1tdLCB0c1Byb2plY3Q6IGFueSwgY29tbW9uUm9vdERpcjogc3RyaW5nLCBwYWNrYWdlRGlyVHJlZTogRGlyVHJlZTxDb21wb25lbnREaXJJbmZvPixcbiAgZW1pdFRkc09ubHkgPSBmYWxzZSwgaGFzVHN4ID0gZmFsc2UsIG9uQ29tcGlsZWQ/OiAoZW1pdHRlZDogRW1pdExpc3QpID0+IHZvaWQpIHtcbiAgY29uc3QgY29tcGlsZUZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgcHJvbUNvbXBpbGUgPSBQcm9taXNlLnJlc29sdmUoIFtdIGFzIEVtaXRMaXN0KTtcblxuICBjb25zdCBkZWxheUNvbXBpbGUgPSBfLmRlYm91bmNlKChnbG9iczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCBnbG9ic0NvcHkgPSBnbG9icy5zbGljZSgwLCBnbG9icy5sZW5ndGgpO1xuICAgIGdsb2JzLnNwbGljZSgwKTtcbiAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLmNhdGNoKCgpID0+IFtdIGFzIEVtaXRMaXN0KVxuICAgICAgLnRoZW4oKCkgPT4gY29tcGlsZShnbG9ic0NvcHksIHRzUHJvamVjdCwgY29tbW9uUm9vdERpciwgcGFja2FnZURpclRyZWUsIGVtaXRUZHNPbmx5KSlcbiAgICAgIC5jYXRjaCgoKSA9PiBbXSBhcyBFbWl0TGlzdCk7XG4gICAgaWYgKG9uQ29tcGlsZWQpXG4gICAgICBwcm9tQ29tcGlsZSA9IHByb21Db21waWxlLnRoZW4oZW1pdHRlZCA9PiB7XG4gICAgICAgIG9uQ29tcGlsZWQoZW1pdHRlZCk7XG4gICAgICAgIHJldHVybiBlbWl0dGVkO1xuICAgICAgfSk7XG4gIH0sIDIwMCk7XG5cbiAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKGNvbXBHbG9icywge2lnbm9yZWQ6IC8oXFwuZFxcLnRzfFxcLmpzKSQvIH0pO1xuICB3YXRjaGVyLm9uKCdhZGQnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2FkZGVkJykpO1xuICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCAocGF0aDogc3RyaW5nKSA9PiBvbkNoYW5nZUZpbGUocGF0aCwgJ2NoYW5nZWQnKSk7XG4gIHdhdGNoZXIub24oJ3VubGluaycsIChwYXRoOiBzdHJpbmcpID0+IG9uQ2hhbmdlRmlsZShwYXRoLCAncmVtb3ZlZCcpKTtcblxuICBmdW5jdGlvbiBvbkNoYW5nZUZpbGUocGF0aDogc3RyaW5nLCByZWFzb246IHN0cmluZykge1xuICAgIGlmIChyZWFzb24gIT09ICdyZW1vdmVkJylcbiAgICAgIGNvbXBpbGVGaWxlcy5wdXNoKHBhdGgpO1xuICAgIGxvZy5pbmZvKGBGaWxlICR7Y2hhbGsuY3lhbihyZWxhdGl2ZShyb290LCBwYXRoKSl9IGhhcyBiZWVuIGAgKyBjaGFsay55ZWxsb3cocmVhc29uKSk7XG4gICAgZGVsYXlDb21waWxlKGNvbXBpbGVGaWxlcyk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBjaGFuZ2VQYXRoKGNvbW1vblJvb3REaXI6IHN0cmluZywgcGFja2FnZURpclRyZWU6IERpclRyZWU8Q29tcG9uZW50RGlySW5mbz4pIHtcbiAgcmV0dXJuIHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IEZpbGUsIGVuOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgY29uc3QgdHJlZVBhdGggPSByZWxhdGl2ZShjb21tb25Sb290RGlyLCBmaWxlLnBhdGgpO1xuICAgIGZpbGUuX29yaWdpblBhdGggPSBmaWxlLnBhdGg7XG4gICAgY29uc3Qge3NyY0RpciwgZGVzdERpciwgcGtnRGlyOiBkaXJ9ID0gcGFja2FnZURpclRyZWUuZ2V0QWxsRGF0YSh0cmVlUGF0aCkucG9wKCkhO1xuICAgIGNvbnN0IGFic0ZpbGUgPSByZXNvbHZlKGNvbW1vblJvb3REaXIsIHRyZWVQYXRoKTtcbiAgICBjb25zdCBwYXRoV2l0aGluUGtnID0gcmVsYXRpdmUoZGlyLCBhYnNGaWxlKTtcbiAgICAvLyBjb25zb2xlLmxvZyhkaXIsIHRzRGlycyk7XG4gICAgY29uc3QgcHJlZml4ID0gc3JjRGlyO1xuICAgIC8vIGZvciAoY29uc3QgcHJlZml4IG9mIFt0c0RpcnMuc3JjRGlyLCB0c0RpcnMuaXNvbURpcl0pIHtcbiAgICBpZiAocHJlZml4ID09PSAnLicgfHwgcHJlZml4Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cpO1xuICAgICAgLy8gYnJlYWs7XG4gICAgfSBlbHNlIGlmIChwYXRoV2l0aGluUGtnLnN0YXJ0c1dpdGgocHJlZml4ICsgc2VwKSkge1xuICAgICAgZmlsZS5wYXRoID0gam9pbihkaXIsIGRlc3REaXIsIHBhdGhXaXRoaW5Qa2cuc2xpY2UocHJlZml4Lmxlbmd0aCArIDEpKTtcbiAgICAgIC8vIGJyZWFrO1xuICAgIH1cbiAgICAvLyB9XG4gICAgLy8gY29uc29sZS5sb2coJ3BhdGhXaXRoaW5Qa2cnLCBwYXRoV2l0aGluUGtnKTtcbiAgICAvLyBjb25zb2xlLmxvZygnZmlsZS5wYXRoJywgZmlsZS5wYXRoKTtcbiAgICBmaWxlLmJhc2UgPSBjb21tb25Sb290RGlyO1xuICAgIC8vIGNvbnNvbGUubG9nKCdmaWxlLmJhc2UnLCBmaWxlLmJhc2UpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdmaWxlLnJlbGF0aXZlJywgZmlsZS5yZWxhdGl2ZSk7XG4gICAgbmV4dChudWxsLCBmaWxlKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ29tcGlsZXJPcHRpb25zV2l0aFBhY2thZ2VzKGNvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnMsIHBhdGhzSnNvbnM6IHN0cmluZ1tdKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgc3BhY2UnKTtcbiAgfVxuXG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiByZXNvbHZlKHJvb3QsIHdzS2V5KVxuICB9KTtcblxuICBwYXRoc0pzb25zLnJlZHVjZSgocGF0aE1hcCwganNvblN0cikgPT4ge1xuICAgIHJldHVybiB7Li4ucGF0aE1hcCwgLi4uSlNPTi5wYXJzZShqc29uU3RyKX07XG4gIH0sIGNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG59XG4iXX0=