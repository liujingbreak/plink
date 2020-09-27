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
const package_utils_1 = require("./package-utils");
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
    const typeRoots = Array.from(package_utils_1.typeRootsFromPackages(wsKey));
    // console.log(typeRoots);
    writeTsconfig4project(package_mgr_1.getProjectList(), typeRoots, (file, content) => package_mgr_1.actionDispatcher._updateGitIgnores({ file, content }));
    return writeTsconfigForEachPackage(path_1.default.resolve(misc_1.getRootDir(), wsKey), pks, typeRoots, (file, content) => package_mgr_1.actionDispatcher._updateGitIgnores({ file, content }));
}
exports.updateTsconfigFileForEditor = updateTsconfigFileForEditor;
function writeTsconfig4project(projectDirs, typeRoots, onGitIgnoreFileUpdate) {
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
            path_1.default.dirname(require.resolve('dr-comp-package/package.json'));
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
    if (pkgName !== 'dr-comp-package') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsNkNBQStCO0FBRS9CLHVDQUF3QztBQUN4QywrQ0FBc0Y7QUFDdEYsMkJBQXVCO0FBQ3ZCLHFEQUE2RDtBQUM3RCxvREFBNEI7QUFDNUIsdUNBQW9EO0FBQ3BELDREQUE0RDtBQUM1RCxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLGtEQUFrRDtBQUNsRCxtREFBc0Q7QUFDdEQsb0RBQXVCO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFJeEMsU0FBZ0IsMkJBQTJCLENBQUMsS0FBYTtJQUN2RCxNQUFNLFdBQVcsR0FBRyxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ2pDLDJDQUEyQztJQUNyRCxNQUFNLEVBQUUsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLEVBQUUsSUFBSSxJQUFJO1FBQ1osT0FBTztJQUNULE1BQU0sR0FBRyxHQUFrQjtRQUN6QixHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcs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LE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsSUFBSSxVQUFVLEtBQUssUUFBUSxFQUFFO1lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO1lBQ2xDLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzFFO2FBQU07WUFDTCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsWUFBWSxrQkFBa0IsQ0FBQyxDQUFDO1NBQzlDO0tBQ0Y7U0FBTTtRQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ25DLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakY7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0U3RhdGUsIFBhY2thZ2VJbmZvLCBnZXRQcm9qZWN0TGlzdCwgYWN0aW9uRGlzcGF0Y2hlcn0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge0VPTH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuLy8gaW1wb3J0IHtvZlBheWxvYWRBY3Rpb259IGZyb20gJy4vc3RvcmUnO1xuLy8gaW1wb3J0IHtQYXlsb2FkQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7dHlwZVJvb3RzRnJvbVBhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2VkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JFZGl0b3Iod3NLZXk6IHN0cmluZykge1xuICBjb25zdCBzcmNQYWNrYWdlcyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gICAgICAgICAgICAvLyBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgcGtzOiBQYWNrYWdlSW5mb1tdID0gW1xuICAgIC4uLndzLmxpbmtlZERlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpLFxuICAgIC4uLndzLmxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpXG4gIF0uZmlsdGVyKHBrID0+IHBrICE9IG51bGwpIGFzIFBhY2thZ2VJbmZvW107XG5cbiAgY29uc3QgdHlwZVJvb3RzID0gQXJyYXkuZnJvbSh0eXBlUm9vdHNGcm9tUGFja2FnZXMod3NLZXkpKTtcbiAgLy8gY29uc29sZS5sb2codHlwZVJvb3RzKTtcblxuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgdHlwZVJvb3RzLCAoZmlsZSwgY29udGVudCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZSwgY29udGVudH0pKTtcbiAgcmV0dXJuIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSksIHBrcywgdHlwZVJvb3RzLFxuICAgIChmaWxlLCBjb250ZW50KSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVHaXRJZ25vcmVzKHtmaWxlLCBjb250ZW50fSkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNHByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCB0eXBlUm9vdHM6IHN0cmluZ1tdLCBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4gICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyOiB0eXBlb2YgX3JlY3AgPSByZXF1aXJlKCcuL3JlY2lwZS1tYW5hZ2VyJyk7XG5cbiAgZm9yIChjb25zdCBwcm9qIG9mIHByb2plY3REaXJzKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcbiAgICBjcmVhdGVUc0NvbmZpZygnJywgcHJvaiwgbnVsbCwgZHJjcERpciwgaW5jbHVkZSApO1xuXG4gICAgY29uc3QgZ2l0SWdub3JlRmlsZSA9IGZpbmRHaXRJbmdvcmVGaWxlKHByb2opO1xuICAgIGlmIChnaXRJZ25vcmVGaWxlKSB7XG4gICAgICBmcy5yZWFkRmlsZShnaXRJZ25vcmVGaWxlLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvbkdpdElnbm9yZUZpbGVVcGRhdGUoZ2l0SWdub3JlRmlsZSwgZGF0YSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwa3M6IFBhY2thZ2VJbmZvW10sIHR5cGVSb290czogc3RyaW5nW10sXG4gIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIC8vIGNvbnN0IGNvbW1vblBhdGhzID0gW1xuICAvLyAgICcnLFxuICAvLyAgIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKSxcbiAgLy8gICBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzJylcbiAgLy8gXTtcblxuICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4gICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4gICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpciwgdHlwZVJvb3RzKTtcbiAgfSk7XG5cbiAgYXBwZW5kR2l0SWdub3JlRmlsZXMoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRHaXRJZ25vcmVGaWxlcyhpZ25vcmVUc0NvbmZpZ0ZpbGVzOiBzdHJpbmdbXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiBQYXJhbWV0ZXJzPHR5cGVvZiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2U+WzNdKSB7XG4gIGNvbnN0IGdpdEZvbGRlclRvSW5nb3JlRmlsZToge2Rpcjogc3RyaW5nOyBpZ25vcmVGaWxlOiBzdHJpbmcsIGlnbm9yZUl0ZW1zOiBzdHJpbmdbXX0gW10gPVxuICAgIE9iamVjdC5lbnRyaWVzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKChbZmlsZSwgY29udGVudF0pID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpcjogUGF0aC5kaXJuYW1lKGZpbGUpICsgUGF0aC5zZXAsXG4gICAgICAgIGlnbm9yZUZpbGU6IGZpbGUsXG4gICAgICAgIGlnbm9yZUl0ZW1zOiBbXVxuICAgICAgfTtcbiAgICB9KTtcblxuICBmb3IgKGNvbnN0IHRzY29uZmlnRmlsZSBvZiBpZ25vcmVUc0NvbmZpZ0ZpbGVzKSB7XG4gICAgZ2l0Rm9sZGVyVG9JbmdvcmVGaWxlLnNvbWUoKHtkaXIsIGlnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSkgPT4ge1xuICAgICAgaWYgKHRzY29uZmlnRmlsZS5zdGFydHNXaXRoKGRpcikpIHtcbiAgICAgICAgaWdub3JlSXRlbXMucHVzaChQYXRoLnJlbGF0aXZlKGRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIGZvciAoY29uc3Qge2lnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSBvZiBnaXRGb2xkZXJUb0luZ29yZUZpbGUpIHtcbiAgICBjb25zdCBvcmlnQ29udGVudCA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tpZ25vcmVGaWxlXTtcbiAgICBjb25zdCBvcmlnTGlzdCA9ICBfLnVuaXEob3JpZ0NvbnRlbnQuc3BsaXQoLyg/Olxcblxccj8pKy8pXG4gICAgICAubWFwKGxpbmUgPT4gL15cXHMqKC4qPylcXHMqJC9tLmV4ZWMobGluZSkhWzFdKVxuICAgICAgLmZpbHRlcihsaW5lID0+IGxpbmUubGVuZ3RoID4gMCkpO1xuICAgIGNvbnN0IGl0ZW1zVG9BcHBlbmQgPSBfLmRpZmZlcmVuY2UoaWdub3JlSXRlbXMsIG9yaWdMaXN0KTtcbiAgICBpZiAoaXRlbXNUb0FwcGVuZC5sZW5ndGggPiAwKVxuICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGlnbm9yZUZpbGUsIFtcbiAgICAgICAgLi4ub3JpZ0xpc3QsXG4gICAgICAgIGAjIC0tLS0tLS0ke25ldyBEYXRlKCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9LS0tLS0tLS0tYCxcbiAgICAgICAgLi4uaXRlbXNUb0FwcGVuZF0uam9pbihFT0wpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBkaXIgPSBzdGFydERpcjtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZGlyID0gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHBrZ05hbWU6IHN0cmluZywgcGtnUmVhbFBhdGg6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLCBkcmNwRGlyOiBzdHJpbmcsXG4gIHR5cGVSb290czogc3RyaW5nW10sIGluY2x1ZGUgPSBbJy4nXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgY29uc3QgcHJvaiA9IHBrZ1JlYWxQYXRoO1xuICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgUGF0aC5yZXNvbHZlKGRyY3BEaXIsICd3ZmgvdHNjb25maWctYmFzZS5qc29uJykpO1xuICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgfVxuICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuXG4gIGNvbnN0IGV4dHJhTm9kZVBhdGg6IHN0cmluZ1tdID0gW1BhdGgucmVzb2x2ZShwa2dSZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpXTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgZXh0cmFOb2RlUGF0aC5wdXNoKFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UsICdub2RlX21vZHVsZXMnKSk7XG4gIH1cblxuICBjb25zdCBjb21tb25EaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkubWFwKGVsID0+IGVsLnJlYWxQYXRoKSk7XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBpZiAocGtnTmFtZSA9PT0gbmFtZSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgfVxuXG4gIGlmIChwa2dOYW1lICE9PSAnZHItY29tcC1wYWNrYWdlJykge1xuICAgIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICB9XG5cbiAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICByb290RGlyOiBQYXRoLnJlbGF0aXZlKHByb2osIGNvbW1vbkRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgIHNraXBMaWJDaGVjazogZmFsc2UsXG4gICAganN4OiAncHJlc2VydmUnLFxuICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgbW9kdWxlOiAnY29tbW9uanMnLFxuICAgIHBhdGhzOiBwYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAvLyBJZiB1c2VyIGV4ZWN1dGUgJ2luaXQgPHdvcmtzcGFjZT4nIGluIHJvb3QgZGlyZWN0b3J5LCBlbnYuTk9ERV9QQVRIIGRvZXMgbm90IGNvbnRhaW4gd29ya3NwYWNlIFxuICAgIC8vIGRpcmVjdG9yeSwgaW4gdGhpcyBjYXNlIHdlIG5lZWQgZXhwbGljaXR5bHkgYWRkIG5vZGUgcGF0aCBcbiAgICBleHRyYU5vZGVQYXRoLFxuICAgIGV4dHJhVHlwZVJvb3Q6IHR5cGVSb290c1xuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhzcmM6IGFueSwgdGFyZ2V0OiBhbnkpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgIGlmIChrZXkgPT09ICdjb21waWxlck9wdGlvbnMnKSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVyT3B0aW9ucylcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0YXJnZXQuY29tcGlsZXJPcHRpb25zLCBzcmMuY29tcGlsZXJPcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlOiBzdHJpbmcsIHRzY29uZmlnT3ZlcnJpZGVTcmM6IGFueSkge1xuICBpZiAoZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ092ZXJyaWRlU3JjLCBudWxsLCAnICAnKSk7XG4gIH1cbn1cblxuIl19