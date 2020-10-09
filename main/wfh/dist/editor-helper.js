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
exports.updateTsconfigFileForEditor = void 0;
// tslint:disable: max-line-length
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const misc_1 = require("./utils/misc");
const package_mgr_1 = require("./package-mgr");
const os_1 = require("os");
const config_handler_1 = require("./config-handler");
const log4js_1 = __importDefault(require("log4js"));
const misc_2 = require("./utils/misc");
// import {map, distinctUntilChanged} from 'rxjs/operators';
// import {Observable} from 'rxjs';
// import {ofPayloadAction} from './store';
// import {PayloadAction} from '@reduxjs/toolkit';
// import {typeRootsFromPackages} from './package-utils';
const lodash_1 = __importDefault(require("lodash"));
const log = log4js_1.default.getLogger('editor-helper');
const { parse } = require('comment-json');
function updateTsconfigFileForEditor(wsKey) {
    const srcPackages = package_mgr_1.getState().srcPackages;
    // const wsKey = workspaceKey(payload.dir);
    const ws = package_mgr_1.getState().workspaces.get(wsKey);
    if (ws == null)
        return;
    const pks = [
        ...ws.linkedDependencies.map(([name, ver]) => srcPackages.get(name)),
        ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages.get(name))
    ].filter(pk => pk != null);
    // const typeRoots = Array.from(typeRootsFromPackages(wsKey));
    // console.log(typeRoots);
    const wsDir = path_1.default.resolve(misc_1.getRootDir(), wsKey);
    const wsTypesDir = [path_1.default.resolve(wsDir, 'types')];
    writeTsconfig4project(package_mgr_1.getProjectList(), wsTypesDir, (file, content) => package_mgr_1.updateGitIgnores({ file, content }));
    return writeTsconfigForEachPackage(wsDir, pks, wsTypesDir, (file, content) => package_mgr_1.updateGitIgnores({ file, content }));
}
exports.updateTsconfigFileForEditor = updateTsconfigFileForEditor;
function writeTsconfig4project(projectDirs, typeRoots, onGitIgnoreFileUpdate) {
    const drcpDir = package_mgr_1.getState().linkedDrcp ? package_mgr_1.getState().linkedDrcp.realPath :
        path_1.default.dirname(require.resolve('@wfh/plink/package.json'));
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
        createTsConfig('', proj, null, drcpDir, include);
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
function writeTsconfigForEachPackage(workspaceDir, pks, typeRoots, onGitIgnoreFileUpdate) {
    return __awaiter(this, void 0, void 0, function* () {
        // const commonPaths = [
        //   '',
        //   Path.resolve(workspaceDir, 'node_modules'),
        //   Path.resolve(getRootDir(), 'node_modules')
        // ];
        const drcpDir = package_mgr_1.getState().linkedDrcp ? package_mgr_1.getState().linkedDrcp.realPath :
            path_1.default.dirname(require.resolve('@wfh/plink/package.json'));
        const igConfigFiles = pks.map(pk => {
            // commonPaths[0] = Path.resolve(pk.realPath, 'node_modules');
            return createTsConfig(pk.name, pk.realPath, workspaceDir, drcpDir, typeRoots);
        });
        appendGitIgnoreFiles(igConfigFiles, onGitIgnoreFileUpdate);
    });
}
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
        const origList = lodash_1.default.uniq(origContent.split(/(?:\n\r?)+/)
            .map(line => /^\s*(.*?)\s*$/m.exec(line)[1])
            .filter(line => line.length > 0));
        const itemsToAppend = lodash_1.default.difference(ignoreItems, origList);
        if (itemsToAppend.length > 0)
            onGitIgnoreFileUpdate(ignoreFile, [
                ...origList,
                `# -------${new Date().toLocaleDateString()}---------`,
                ...itemsToAppend
            ].join(os_1.EOL));
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
function createTsConfig(pkgName, pkgRealPath, workspace, drcpDir, typeRoots, include = ['.']) {
    const tsjson = {
        extends: null,
        include
    };
    // tsjson.include = [];
    const proj = pkgRealPath;
    tsjson.extends = path_1.default.relative(proj, path_1.default.resolve(drcpDir, 'wfh/tsconfig-base.json'));
    if (!path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
        tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    const pathMapping = {};
    const extraNodePath = [path_1.default.resolve(pkgRealPath, 'node_modules')];
    if (workspace) {
        extraNodePath.push(path_1.default.resolve(workspace, 'node_modules'));
    }
    const commonDir = misc_2.closestCommonParentDir(Array.from(package_mgr_1.getState().srcPackages.values()).map(el => el.realPath));
    for (const [name, { realPath }] of package_mgr_1.getState().srcPackages.entries() || []) {
        if (pkgName === name)
            continue;
        const realDir = path_1.default.relative(proj, realPath).replace(/\\/g, '/');
        pathMapping[name] = [realDir];
        pathMapping[name + '/*'] = [realDir + '/*'];
    }
    if (pkgName !== '@wfh/plink') {
        drcpDir = path_1.default.relative(proj, drcpDir).replace(/\\/g, '/');
        pathMapping['@wfh/plink'] = [drcpDir];
        pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
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
        extraNodePath,
        extraTypeRoot: typeRoots
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsNkNBQStCO0FBRS9CLHVDQUF3QztBQUN4QywrQ0FBc0Y7QUFDdEYsMkJBQXVCO0FBQ3ZCLHFEQUE2RDtBQUM3RCxvREFBNEI7QUFDNUIsdUNBQW9EO0FBQ3BELDREQUE0RDtBQUM1RCxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLGtEQUFrRDtBQUNsRCx5REFBeUQ7QUFDekQsb0RBQXVCO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFJeEMsU0FBZ0IsMkJBQTJCLENBQUMsS0FBYTtJQUN2RCxNQUFNLFdBQVcsR0FBRyxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ2pDLDJDQUEyQztJQUNyRCxNQUFNLEVBQUUsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLEVBQUUsSUFBSSxJQUFJO1FBQ1osT0FBTztJQUNULE1BQU0sR0FBRyxHQUFrQjtRQUN6QixHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcs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QVksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3BELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RCxJQUFJLFVBQVUsS0FBSyxRQUFRLEVBQUU7WUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUM7WUFDbEMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDMUU7YUFBTTtZQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxZQUFZLGtCQUFrQixDQUFDLENBQUM7U0FDOUM7S0FDRjtTQUFNO1FBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDbkMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNqRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF9yZWNwIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgUGFja2FnZUluZm8sIGdldFByb2plY3RMaXN0LCB1cGRhdGVHaXRJZ25vcmVzfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7RU9MfSBmcm9tICdvcyc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2Nsb3Nlc3RDb21tb25QYXJlbnREaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQge21hcCwgZGlzdGluY3RVbnRpbENoYW5nZWR9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQge29mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi9zdG9yZSc7XG4vLyBpbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuLy8gaW1wb3J0IHt0eXBlUm9vdHNGcm9tUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVRzY29uZmlnRmlsZUZvckVkaXRvcih3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgICAgICAgICAgIC8vIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25zdCBwa3M6IFBhY2thZ2VJbmZvW10gPSBbXG4gICAgLi4ud3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcCgoW25hbWUsIHZlcl0pID0+IHNyY1BhY2thZ2VzLmdldChuYW1lKSksXG4gICAgLi4ud3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcCgoW25hbWUsIHZlcl0pID0+IHNyY1BhY2thZ2VzLmdldChuYW1lKSlcbiAgXS5maWx0ZXIocGsgPT4gcGsgIT0gbnVsbCkgYXMgUGFja2FnZUluZm9bXTtcblxuICAvLyBjb25zdCB0eXBlUm9vdHMgPSBBcnJheS5mcm9tKHR5cGVSb290c0Zyb21QYWNrYWdlcyh3c0tleSkpO1xuICAvLyBjb25zb2xlLmxvZyh0eXBlUm9vdHMpO1xuXG4gIGNvbnN0IHdzRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuICBjb25zdCB3c1R5cGVzRGlyID0gW1BhdGgucmVzb2x2ZSh3c0RpciwgJ3R5cGVzJyldO1xuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgd3NUeXBlc0RpciwgKGZpbGUsIGNvbnRlbnQpID0+IHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSk7XG4gIHJldHVybiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod3NEaXIsIHBrcywgd3NUeXBlc0RpcixcbiAgICAoZmlsZSwgY29udGVudCkgPT4gdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZSwgY29udGVudH0pKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVUc2NvbmZpZzRwcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSwgdHlwZVJvb3RzOiBzdHJpbmdbXSwgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuICAgIGNyZWF0ZVRzQ29uZmlnKCcnLCBwcm9qLCBudWxsLCBkcmNwRGlyLCBpbmNsdWRlICk7XG5cbiAgICBjb25zdCBnaXRJZ25vcmVGaWxlID0gZmluZEdpdEluZ29yZUZpbGUocHJvaik7XG4gICAgaWYgKGdpdElnbm9yZUZpbGUpIHtcbiAgICAgIGZzLnJlYWRGaWxlKGdpdElnbm9yZUZpbGUsICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZShnaXRJZ25vcmVGaWxlLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSwgdHlwZVJvb3RzOiBzdHJpbmdbXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgY29tbW9uUGF0aHMgPSBbXG4gIC8vICAgJycsXG4gIC8vICAgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpLFxuICAvLyAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKVxuICAvLyBdO1xuXG4gIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbiAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4gICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpciwgdHlwZVJvb3RzKTtcbiAgfSk7XG5cbiAgYXBwZW5kR2l0SWdub3JlRmlsZXMoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRHaXRJZ25vcmVGaWxlcyhpZ25vcmVUc0NvbmZpZ0ZpbGVzOiBzdHJpbmdbXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiBQYXJhbWV0ZXJzPHR5cGVvZiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2U+WzNdKSB7XG4gIGNvbnN0IGdpdEZvbGRlclRvSW5nb3JlRmlsZToge2Rpcjogc3RyaW5nOyBpZ25vcmVGaWxlOiBzdHJpbmcsIGlnbm9yZUl0ZW1zOiBzdHJpbmdbXX0gW10gPVxuICAgIE9iamVjdC5lbnRyaWVzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKChbZmlsZSwgY29udGVudF0pID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpcjogUGF0aC5kaXJuYW1lKGZpbGUpICsgUGF0aC5zZXAsXG4gICAgICAgIGlnbm9yZUZpbGU6IGZpbGUsXG4gICAgICAgIGlnbm9yZUl0ZW1zOiBbXVxuICAgICAgfTtcbiAgICB9KTtcblxuICBmb3IgKGNvbnN0IHRzY29uZmlnRmlsZSBvZiBpZ25vcmVUc0NvbmZpZ0ZpbGVzKSB7XG4gICAgZ2l0Rm9sZGVyVG9JbmdvcmVGaWxlLnNvbWUoKHtkaXIsIGlnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSkgPT4ge1xuICAgICAgaWYgKHRzY29uZmlnRmlsZS5zdGFydHNXaXRoKGRpcikpIHtcbiAgICAgICAgaWdub3JlSXRlbXMucHVzaChQYXRoLnJlbGF0aXZlKGRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIGZvciAoY29uc3Qge2lnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSBvZiBnaXRGb2xkZXJUb0luZ29yZUZpbGUpIHtcbiAgICBjb25zdCBvcmlnQ29udGVudCA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tpZ25vcmVGaWxlXTtcbiAgICBjb25zdCBvcmlnTGlzdCA9ICBfLnVuaXEob3JpZ0NvbnRlbnQuc3BsaXQoLyg/Olxcblxccj8pKy8pXG4gICAgICAubWFwKGxpbmUgPT4gL15cXHMqKC4qPylcXHMqJC9tLmV4ZWMobGluZSkhWzFdKVxuICAgICAgLmZpbHRlcihsaW5lID0+IGxpbmUubGVuZ3RoID4gMCkpO1xuICAgIGNvbnN0IGl0ZW1zVG9BcHBlbmQgPSBfLmRpZmZlcmVuY2UoaWdub3JlSXRlbXMsIG9yaWdMaXN0KTtcbiAgICBpZiAoaXRlbXNUb0FwcGVuZC5sZW5ndGggPiAwKVxuICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGlnbm9yZUZpbGUsIFtcbiAgICAgICAgLi4ub3JpZ0xpc3QsXG4gICAgICAgIGAjIC0tLS0tLS0ke25ldyBEYXRlKCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9LS0tLS0tLS0tYCxcbiAgICAgICAgLi4uaXRlbXNUb0FwcGVuZF0uam9pbihFT0wpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBkaXIgPSBzdGFydERpcjtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZGlyID0gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHBrZ05hbWU6IHN0cmluZywgcGtnUmVhbFBhdGg6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLCBkcmNwRGlyOiBzdHJpbmcsXG4gIHR5cGVSb290czogc3RyaW5nW10sIGluY2x1ZGUgPSBbJy4nXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgY29uc3QgcHJvaiA9IHBrZ1JlYWxQYXRoO1xuICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgUGF0aC5yZXNvbHZlKGRyY3BEaXIsICd3ZmgvdHNjb25maWctYmFzZS5qc29uJykpO1xuICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgfVxuICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuXG4gIGNvbnN0IGV4dHJhTm9kZVBhdGg6IHN0cmluZ1tdID0gW1BhdGgucmVzb2x2ZShwa2dSZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpXTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgZXh0cmFOb2RlUGF0aC5wdXNoKFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UsICdub2RlX21vZHVsZXMnKSk7XG4gIH1cblxuICBjb25zdCBjb21tb25EaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkubWFwKGVsID0+IGVsLnJlYWxQYXRoKSk7XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBpZiAocGtnTmFtZSA9PT0gbmFtZSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgfVxuXG4gIGlmIChwa2dOYW1lICE9PSAnQHdmaC9wbGluaycpIHtcbiAgICBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBkcmNwRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZ1snQHdmaC9wbGluay8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICB9XG5cbiAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICByb290RGlyOiBQYXRoLnJlbGF0aXZlKHByb2osIGNvbW1vbkRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgIHNraXBMaWJDaGVjazogZmFsc2UsXG4gICAganN4OiAncHJlc2VydmUnLFxuICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgbW9kdWxlOiAnY29tbW9uanMnLFxuICAgIHBhdGhzOiBwYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAvLyBJZiB1c2VyIGV4ZWN1dGUgJ2luaXQgPHdvcmtzcGFjZT4nIGluIHJvb3QgZGlyZWN0b3J5LCBlbnYuTk9ERV9QQVRIIGRvZXMgbm90IGNvbnRhaW4gd29ya3NwYWNlIFxuICAgIC8vIGRpcmVjdG9yeSwgaW4gdGhpcyBjYXNlIHdlIG5lZWQgZXhwbGljaXR5bHkgYWRkIG5vZGUgcGF0aCBcbiAgICBleHRyYU5vZGVQYXRoLFxuICAgIGV4dHJhVHlwZVJvb3Q6IHR5cGVSb290c1xuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhzcmM6IGFueSwgdGFyZ2V0OiBhbnkpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgIGlmIChrZXkgPT09ICdjb21waWxlck9wdGlvbnMnKSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVyT3B0aW9ucylcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0YXJnZXQuY29tcGlsZXJPcHRpb25zLCBzcmMuY29tcGlsZXJPcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlOiBzdHJpbmcsIHRzY29uZmlnT3ZlcnJpZGVTcmM6IGFueSkge1xuICBpZiAoZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ092ZXJyaWRlU3JjLCBudWxsLCAnICAnKSk7XG4gIH1cbn1cblxuIl19