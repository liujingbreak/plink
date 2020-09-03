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
exports.writeTsconfigForEachPackage = exports.writeTsconfig4project = void 0;
// tslint:disable: max-line-length
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const package_mgr_1 = require("./package-mgr");
const os_1 = require("os");
const config_handler_1 = require("./config-handler");
const log4js_1 = __importDefault(require("log4js"));
const misc_1 = require("./utils/misc");
// import {map, distinctUntilChanged} from 'rxjs/operators';
const lodash_1 = __importDefault(require("lodash"));
const log = log4js_1.default.getLogger('editor-helper');
const { parse } = require('comment-json');
function writeTsconfig4project(projectDirs, onGitIgnoreFileUpdate) {
    const drcpDir = package_mgr_1.getState().linkedDrcp ? package_mgr_1.getState().linkedDrcp.realPath :
        path_1.default.dirname(require.resolve('dr-comp-package/package.json'));
    const recipeManager = require('./recipe-manager');
    for (const proj of projectDirs) {
        const include = [];
        recipeManager.eachRecipeSrc(proj, (srcDir) => {
            let includeDir = path_1.default.relative(proj, srcDir).replace(/\\/g, '/');
            if (includeDir && includeDir !== '/')
                includeDir += '/';
            include.push(includeDir + '**/*.ts');
            include.push(includeDir + '**/*.tsx');
        });
        createTsConfig({ name: '', realPath: proj }, null, drcpDir, include);
        const gitIgnoreFile = findGitIngoreFile(proj);
        if (gitIgnoreFile) {
            fs.readFile(gitIgnoreFile, 'utf8', (err, data) => {
                if (err) {
                    log.error(err);
                    return;
                }
                onGitIgnoreFileUpdate(gitIgnoreFile, data);
            });
        }
    }
}
exports.writeTsconfig4project = writeTsconfig4project;
function writeTsconfigForEachPackage(workspaceDir, pks, onGitIgnoreFileUpdate) {
    return __awaiter(this, void 0, void 0, function* () {
        // const commonPaths = [
        //   '',
        //   Path.resolve(workspaceDir, 'node_modules'),
        //   Path.resolve(getRootDir(), 'node_modules')
        // ];
        const drcpDir = package_mgr_1.getState().linkedDrcp ? package_mgr_1.getState().linkedDrcp.realPath :
            path_1.default.dirname(require.resolve('dr-comp-package/package.json'));
        const igConfigFiles = pks.map(pk => {
            // commonPaths[0] = Path.resolve(pk.realPath, 'node_modules');
            return createTsConfig(pk, workspaceDir, drcpDir);
        });
        appendGitIgnoreFiles(igConfigFiles, onGitIgnoreFileUpdate);
    });
}
exports.writeTsconfigForEachPackage = writeTsconfigForEachPackage;
function appendGitIgnoreFiles(ignoreTsConfigFiles, onGitIgnoreFileUpdate) {
    const gitFolderToIngoreFile = Object.entries(package_mgr_1.getState().gitIgnores).map(([file, content]) => {
        return {
            dir: path_1.default.dirname(file) + path_1.default.sep,
            ignoreFile: file,
            ignoreItems: []
        };
    });
    for (const tsconfigFile of ignoreTsConfigFiles) {
        gitFolderToIngoreFile.some(({ dir, ignoreFile, ignoreItems }) => {
            if (tsconfigFile.startsWith(dir)) {
                ignoreItems.push(path_1.default.relative(dir, tsconfigFile).replace(/\\/g, '/'));
                return true;
            }
            return false;
        });
    }
    for (const { ignoreFile, ignoreItems } of gitFolderToIngoreFile) {
        const origContent = package_mgr_1.getState().gitIgnores[ignoreFile];
        const itemsToAppend = lodash_1.default.difference(ignoreItems, origContent.split(/(?:\n\r?)+/).filter(line => line.trim().length > 0));
        if (itemsToAppend.length > 0)
            onGitIgnoreFileUpdate(ignoreFile, origContent + os_1.EOL + itemsToAppend.join(os_1.EOL));
    }
}
function findGitIngoreFile(startDir) {
    let dir = startDir;
    while (true) {
        const test = path_1.default.resolve(startDir, '.gitignore');
        if (fs.existsSync(test)) {
            return test;
        }
        const parent = path_1.default.dirname(dir);
        if (parent === dir)
            return null;
        dir = parent;
    }
}
function createTsConfig(pkg, workspace, drcpDir, include = ['.']) {
    const tsjson = {
        extends: null,
        include
    };
    // tsjson.include = [];
    const proj = pkg.realPath;
    tsjson.extends = path_1.default.relative(proj, path_1.default.resolve(drcpDir, 'wfh/tsconfig-base.json'));
    if (!path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
        tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    const pathMapping = {};
    const extraNodePath = [path_1.default.resolve(pkg.realPath, 'node_modules')];
    if (workspace) {
        extraNodePath.push(path_1.default.resolve(workspace, 'node_modules'));
    }
    const commonDir = misc_1.closestCommonParentDir(Array.from(package_mgr_1.getState().srcPackages.values()).map(el => el.realPath));
    for (const [name, { realPath }] of package_mgr_1.getState().srcPackages.entries() || []) {
        if (pkg.name === name)
            continue;
        const realDir = path_1.default.relative(proj, realPath).replace(/\\/g, '/');
        pathMapping[name] = [realDir];
        pathMapping[name + '/*'] = [realDir + '/*'];
    }
    if (pkg.name !== 'dr-comp-package') {
        drcpDir = path_1.default.relative(proj, drcpDir).replace(/\\/g, '/');
        pathMapping['dr-comp-package'] = [drcpDir];
        pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
    }
    tsjson.compilerOptions = {
        rootDir: path_1.default.relative(proj, commonDir).replace(/\\/g, '/'),
        // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
        skipLibCheck: false,
        jsx: 'preserve',
        target: 'es2015',
        module: 'commonjs',
        paths: pathMapping
    };
    config_handler_1.setTsCompilerOptForNodePath(proj, tsjson.compilerOptions, {
        enableTypeRoots: true,
        // If user execute 'init <workspace>' in root directory, env.NODE_PATH does not contain workspace 
        // directory, in this case we need explicityly add node path 
        extraNodePath
    });
    const tsconfigFile = path_1.default.resolve(proj, 'tsconfig.json');
    writeTsConfigFile(tsconfigFile, tsjson);
    return tsconfigFile;
}
function overrideTsConfig(src, target) {
    for (const key of Object.keys(src)) {
        if (key === 'compilerOptions') {
            if (target.compilerOptions)
                Object.assign(target.compilerOptions, src.compilerOptions);
        }
        else {
            target[key] = src[key];
        }
    }
}
function writeTsConfigFile(tsconfigFile, tsconfigOverrideSrc) {
    if (fs.existsSync(tsconfigFile)) {
        const existing = fs.readFileSync(tsconfigFile, 'utf8');
        const existingJson = parse(existing);
        overrideTsConfig(tsconfigOverrideSrc, existingJson);
        const newJsonStr = JSON.stringify(existingJson, null, '  ');
        if (newJsonStr !== existing) {
            log.info('Write ' + tsconfigFile);
            fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
        }
        else {
            log.debug(`${tsconfigFile} is not changed.`);
        }
    }
    else {
        log.info('Create ' + tsconfigFile);
        fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfigOverrideSrc, null, '  '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsNkNBQStCO0FBRS9CLCtDQUFvRDtBQUNwRCwyQkFBdUI7QUFDdkIscURBQTZEO0FBQzdELG9EQUE0QjtBQUM1Qix1Q0FBb0Q7QUFDcEQsNERBQTREO0FBQzVELG9EQUF1QjtBQUN2QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QyxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXhDLFNBQWdCLHFCQUFxQixDQUFDLFdBQXFCLEVBQUUscUJBQThEO0lBQ3pILE1BQU0sT0FBTyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQztJQUVoRSxNQUFNLGFBQWEsR0FBaUIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFaEUsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUU7UUFDOUIsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzdCLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBYyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxVQUFVLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqRSxJQUFJLFVBQVUsSUFBSSxVQUFVLEtB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SUFBSSxDQUFDLENBQUMsQ0FBQztTQUMxRTthQUFNO1lBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLFlBQVksa0JBQWtCLENBQUMsQ0FBQztTQUM5QztLQUNGO1NBQU07UUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUNuQyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2pGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQge2dldFN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge0VPTH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZzRwcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSwgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlcjogdHlwZW9mIF9yZWNwID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpO1xuXG4gIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgIGNvbnN0IGluY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgfSk7XG4gICAgY3JlYXRlVHNDb25maWcoXG4gICAgICB7bmFtZTogJycsIHJlYWxQYXRoOiBwcm9qfSxcbiAgICAgIG51bGwsXG4gICAgICBkcmNwRGlyLFxuICAgICAgaW5jbHVkZVxuICAgICk7XG5cbiAgICBjb25zdCBnaXRJZ25vcmVGaWxlID0gZmluZEdpdEluZ29yZUZpbGUocHJvaik7XG4gICAgaWYgKGdpdElnbm9yZUZpbGUpIHtcbiAgICAgIGZzLnJlYWRGaWxlKGdpdElnbm9yZUZpbGUsICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZShnaXRJZ25vcmVGaWxlLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwa3M6IFBhY2thZ2VJbmZvW10sXG4gIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIC8vIGNvbnN0IGNvbW1vblBhdGhzID0gW1xuICAvLyAgICcnLFxuICAvLyAgIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKSxcbiAgLy8gICBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzJylcbiAgLy8gXTtcblxuICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4gICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4gICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGssIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4gIH0pO1xuXG4gIGFwcGVuZEdpdElnbm9yZUZpbGVzKGlnQ29uZmlnRmlsZXMsIG9uR2l0SWdub3JlRmlsZVVwZGF0ZSk7XG59XG5cblxuZnVuY3Rpb24gYXBwZW5kR2l0SWdub3JlRmlsZXMoaWdub3JlVHNDb25maWdGaWxlczogc3RyaW5nW10sXG4gIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogUGFyYW1ldGVyczx0eXBlb2Ygd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlPlsyXSkge1xuICBjb25zdCBnaXRGb2xkZXJUb0luZ29yZUZpbGU6IHtkaXI6IHN0cmluZzsgaWdub3JlRmlsZTogc3RyaW5nLCBpZ25vcmVJdGVtczogc3RyaW5nW119IFtdID1cbiAgICBPYmplY3QuZW50cmllcyhnZXRTdGF0ZSgpLmdpdElnbm9yZXMpLm1hcCgoW2ZpbGUsIGNvbnRlbnRdKSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaXI6IFBhdGguZGlybmFtZShmaWxlKSArIFBhdGguc2VwLFxuICAgICAgICBpZ25vcmVGaWxlOiBmaWxlLFxuICAgICAgICBpZ25vcmVJdGVtczogW11cbiAgICAgIH07XG4gICAgfSk7XG5cbiAgZm9yIChjb25zdCB0c2NvbmZpZ0ZpbGUgb2YgaWdub3JlVHNDb25maWdGaWxlcykge1xuICAgIGdpdEZvbGRlclRvSW5nb3JlRmlsZS5zb21lKCh7ZGlyLCBpZ25vcmVGaWxlLCBpZ25vcmVJdGVtc30pID0+IHtcbiAgICAgIGlmICh0c2NvbmZpZ0ZpbGUuc3RhcnRzV2l0aChkaXIpKSB7XG4gICAgICAgIGlnbm9yZUl0ZW1zLnB1c2goUGF0aC5yZWxhdGl2ZShkaXIsIHRzY29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH1cblxuICBmb3IgKGNvbnN0IHtpZ25vcmVGaWxlLCBpZ25vcmVJdGVtc30gb2YgZ2l0Rm9sZGVyVG9JbmdvcmVGaWxlKSB7XG4gICAgY29uc3Qgb3JpZ0NvbnRlbnQgPSBnZXRTdGF0ZSgpLmdpdElnbm9yZXNbaWdub3JlRmlsZV07XG4gICAgY29uc3QgaXRlbXNUb0FwcGVuZCA9IF8uZGlmZmVyZW5jZShpZ25vcmVJdGVtcyxcbiAgICAgIG9yaWdDb250ZW50LnNwbGl0KC8oPzpcXG5cXHI/KSsvKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKSk7XG4gICAgaWYgKGl0ZW1zVG9BcHBlbmQubGVuZ3RoID4gMClcbiAgICAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZShpZ25vcmVGaWxlLCBvcmlnQ29udGVudCArIEVPTCArIGl0ZW1zVG9BcHBlbmQuam9pbihFT0wpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBkaXIgPSBzdGFydERpcjtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZGlyID0gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHBrZzoge25hbWU6IHN0cmluZywgcmVhbFBhdGg6IHN0cmluZ30sIHdvcmtzcGFjZTogc3RyaW5nIHwgbnVsbCwgZHJjcERpcjogc3RyaW5nLCBpbmNsdWRlID0gWycuJ10pIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbCxcbiAgICBpbmNsdWRlXG4gIH07XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIGNvbnN0IHByb2ogPSBwa2cucmVhbFBhdGg7XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cbiAgY29uc3QgZXh0cmFOb2RlUGF0aDogc3RyaW5nW10gPSBbUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpXTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgZXh0cmFOb2RlUGF0aC5wdXNoKFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UsICdub2RlX21vZHVsZXMnKSk7XG4gIH1cblxuICBjb25zdCBjb21tb25EaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkubWFwKGVsID0+IGVsLnJlYWxQYXRoKSk7XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBpZiAocGtnLm5hbWUgPT09IG5hbWUpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gIH1cblxuICBpZiAocGtnLm5hbWUgIT09ICdkci1jb21wLXBhY2thZ2UnKSB7XG4gICAgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgZHJjcERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIH1cblxuICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgIHJvb3REaXI6IFBhdGgucmVsYXRpdmUocHJvaiwgY29tbW9uRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgcGF0aHM6IHBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIC8vIElmIHVzZXIgZXhlY3V0ZSAnaW5pdCA8d29ya3NwYWNlPicgaW4gcm9vdCBkaXJlY3RvcnksIGVudi5OT0RFX1BBVEggZG9lcyBub3QgY29udGFpbiB3b3Jrc3BhY2UgXG4gICAgLy8gZGlyZWN0b3J5LCBpbiB0aGlzIGNhc2Ugd2UgbmVlZCBleHBsaWNpdHlseSBhZGQgbm9kZSBwYXRoIFxuICAgIGV4dHJhTm9kZVBhdGhcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoc3JjOiBhbnksIHRhcmdldDogYW55KSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICBpZiAoa2V5ID09PSAnY29tcGlsZXJPcHRpb25zJykge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlck9wdGlvbnMpXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LmNvbXBpbGVyT3B0aW9ucywgc3JjLmNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZTogc3RyaW5nLCB0c2NvbmZpZ092ZXJyaWRlU3JjOiBhbnkpIHtcbiAgaWYgKGZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBleGlzdGluZ0pzb24gPSBwYXJzZShleGlzdGluZyk7XG4gICAgb3ZlcnJpZGVUc0NvbmZpZyh0c2NvbmZpZ092ZXJyaWRlU3JjLCBleGlzdGluZ0pzb24pO1xuICAgIGNvbnN0IG5ld0pzb25TdHIgPSBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpO1xuICAgIGlmIChuZXdKc29uU3RyICE9PSBleGlzdGluZykge1xuICAgICAgbG9nLmluZm8oJ1dyaXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoYCR7dHNjb25maWdGaWxlfSBpcyBub3QgY2hhbmdlZC5gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oJ0NyZWF0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbiJdfQ==