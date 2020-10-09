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
    writeTsconfig4project(package_mgr_1.getProjectList(), typeRoots, (file, content) => package_mgr_1.updateGitIgnores({ file, content }));
    return writeTsconfigForEachPackage(path_1.default.resolve(misc_1.getRootDir(), wsKey), pks, typeRoots, (file, content) => package_mgr_1.updateGitIgnores({ file, content }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsNkNBQStCO0FBRS9CLHVDQUF3QztBQUN4QywrQ0FBc0Y7QUFDdEYsMkJBQXVCO0FBQ3ZCLHFEQUE2RDtBQUM3RCxvREFBNEI7QUFDNUIsdUNBQW9EO0FBQ3BELDREQUE0RDtBQUM1RCxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLGtEQUFrRDtBQUNsRCxtREFBc0Q7QUFDdEQsb0RBQXVCO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFJeEMsU0FBZ0IsMkJBQTJCLENBQUMsS0FBYTtJQUN2RCxNQUFNLFdBQVcsR0FBRyxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ2pDLDJDQUEyQztJQUNyRCxNQUFNLEVBQUUsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLEVBQUUsSUFBSSxJQUFJO1FBQ1osT0FBTztJQUNULE1BQU0sR0FBRyxHQUFrQjtRQUN6QixHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN4RSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQWtCLENBQUM7SUFFNUMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxxQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNELDBCQUEwQjtJQUUxQixxQkFBcUIsQ0FBQyw0QkFBYyxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsOEJBQWdCLENBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pHLE9BQU8sMkJBQTJCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFDbEYsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyw4QkFBZ0IsQ0FBQyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQWpCRCxrRUFpQkM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLFdBQXFCLEVBQUUsU0FBbUIsRUFBRSxxQkFBOEQ7SUFDdkksTUFBTSxPQUFPLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO0lBRTNELE1BQU0sYUFBYSxHQUFpQixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUVoRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtRQUM5QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtZQUNuRCxJQUFJLFVBQVUsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pFLElBQUksVUFBVSxJQUFJLFVBQVUsS0FBSyxHQUFHO2dCQUNsQyxVQUFVLElBQUksR0FBRyxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsY0FBYyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUUsQ0FBQztRQUVsRCxNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLGFBQWEsRUFBRTtZQUNqQixFQUFFLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQy9DLElBQUksR0FBRyxFQUFFO29CQUNQLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2YsT0FBTztpQkFDUjtnQkFDRCxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0MsQ0FBQyxDQUFDLENBQUM7U0FDSjtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQWUsMkJBQTJCLENBQUMsWUFBb0IsRUFBRSxHQUFrQixFQUFFLFNBQW1CLEVBQ3RHLHFCQUE4RDs7UUFDOUQsd0JBQXdCO1FBQ3hCLFFBQVE7UUFDUixnREFBZ0Q7UUFDaEQsK0NBQStDO1FBQy9DLEtBQUs7UUFFTCxNQUFNLE9BQU8sR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBUSxFQUFFLENBQUMsVUFBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7UUFFM0QsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNqQyw4REFBOEQ7WUFDOUQsT0FBTyxjQUFjLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDaEYsQ0FBQyxDQUFDLENBQUM7UUFFSCxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQUE7QUFHRCxTQUFTLG9CQUFvQixDQUFDLG1CQUE2QixFQUN6RCxxQkFBd0U7SUFDeEUsTUFBTSxxQkFBcUIsR0FDekIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRTtRQUM1RCxPQUFPO1lBQ0wsR0FBRyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBSSxDQUFDLEdBQUc7WUFDbEMsVUFBVSxFQUFFLElBQUk7WUFDaEIsV0FBVyxFQUFFLEVBQUU7U0FDaEIsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUwsS0FBSyxNQUFNLFlBQVksSUFBSSxtQkFBbUIsRUFBRTtRQUM5QyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFDLEVBQUUsRUFBRTtZQUM1RCxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ2hDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2RSxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztLQUNKO0lBRUQsS0FBSyxNQUFNLEVBQUMsVUFBVSxFQUFFLFdBQVcsRUFBQyxJQUFJLHFCQUFxQixFQUFFO1FBQzdELE1BQU0sV0FBVyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEQsTUFBTSxRQUFRLEdBQUksZ0JBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUM7YUFDckQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLGFBQWEsR0FBRyxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDMUQsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDMUIscUJBQXFCLENBQUMsVUFBVSxFQUFFO2dCQUNoQyxHQUFHLFFBQVE7Z0JBQ1gsWUFBWSxJQUFJLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFLFdBQVc7Z0JBQ3RELEdBQUcsYUFBYTthQUFDLENBQUMsSUFBSSxDQUFDLFFBQUcsQ0FBQyxDQUFDLENBQUM7S0FDbEM7QUFDSCxDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxRQUFnQjtJQUN6QyxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUM7SUFDbkIsT0FBTyxJQUFJLEVBQUU7UUFDWCxNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNsRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsSUFBSSxNQUFNLEtBQUssR0FBRztZQUNoQixPQUFPLElBQUksQ0FBQztRQUNkLEdBQUcsR0FBRyxNQUFNLENBQUM7S0FDZDtBQUNILENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxPQUFlLEVBQUUsV0FBbUIsRUFBRSxTQUF3QixFQUFFLE9BQWUsRUFDckcsU0FBbUIsRUFBRSxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFDcEMsTUFBTSxNQUFNLEdBQVE7UUFDbEIsT0FBTyxFQUFFLElBQUk7UUFDYixPQUFPO0tBQ1IsQ0FBQztJQUNGLHVCQUF1QjtJQUN2QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUM7SUFDekIsTUFBTSxDQUFDLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7SUFDdEYsSUFBSSxDQUFDLGNBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDeEUsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztLQUN4QztJQUNELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRXBELE1BQU0sV0FBVyxHQUE4QixFQUFFLENBQUM7SUFFbEQsTUFBTSxhQUFhLEdBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBRTVFLElBQUksU0FBUyxFQUFFO1FBQ2IsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0tBQzdEO0lBRUQsTUFBTSxTQUFTLEdBQUcsNkJBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFN0csS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUMsUUFBUSxFQUFDLENBQUMsSUFBSSxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN2RSxJQUFJLE9BQU8sS0FBSyxJQUFJO1lBQ2xCLFNBQVM7UUFDWCxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLFdBQVcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDN0M7SUFFRCxJQUFJLE9BQU8sS0FBSyxZQUFZLEVBQUU7UUFDNUIsT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0QsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO0tBQ2hEO0lBRUQsTUFBTSxDQUFDLGVBQWUsR0FBRztRQUN2QixPQUFPLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7UUFDekQscUZBQXFGO1FBQ3ZGLFlBQVksRUFBRSxLQUFLO1FBQ25CLEdBQUcsRUFBRSxVQUFVO1FBQ2YsTUFBTSxFQUFFLFFBQVE7UUFDaEIsTUFBTSxFQUFFLFVBQVU7UUFDbEIsS0FBSyxFQUFFLFdBQVc7S0FDbkIsQ0FBQztJQUNGLDRDQUEyQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFO1FBQ3hELGVBQWUsRUFBRSxJQUFJO1FBQ3JCLGtHQUFrRztRQUNsRyw2REFBNkQ7UUFDN0QsYUFBYTtRQUNiLGFBQWEsRUFBRSxTQUFTO0tBQ3pCLENBQUMsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3pELGlCQUFpQixDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN4QyxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFRLEVBQUUsTUFBVztJQUM3QyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDbEMsSUFBSSxHQUFHLEtBQUssaUJBQWlCLEVBQUU7WUFDN0IsSUFBSSxNQUFNLENBQUMsZUFBZTtnQkFDeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUM5RDthQUFNO1lBQ0wsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN4QjtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsWUFBb0IsRUFBRSxtQkFBd0I7SUFDdkUsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQy9CLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUQsSUFBSSxVQUFVLEtBQUssUUFBUSxFQUFFO1lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO1lBQ2xDLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzFFO2FBQU07WUFDTCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsWUFBWSxrQkFBa0IsQ0FBQyxDQUFDO1NBQzlDO0tBQ0Y7U0FBTTtRQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ25DLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakY7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0U3RhdGUsIFBhY2thZ2VJbmZvLCBnZXRQcm9qZWN0TGlzdCwgdXBkYXRlR2l0SWdub3Jlc30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge0VPTH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuLy8gaW1wb3J0IHtvZlBheWxvYWRBY3Rpb259IGZyb20gJy4vc3RvcmUnO1xuLy8gaW1wb3J0IHtQYXlsb2FkQWN0aW9ufSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7dHlwZVJvb3RzRnJvbVBhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2VkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JFZGl0b3Iod3NLZXk6IHN0cmluZykge1xuICBjb25zdCBzcmNQYWNrYWdlcyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gICAgICAgICAgICAvLyBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgcGtzOiBQYWNrYWdlSW5mb1tdID0gW1xuICAgIC4uLndzLmxpbmtlZERlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpLFxuICAgIC4uLndzLmxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpXG4gIF0uZmlsdGVyKHBrID0+IHBrICE9IG51bGwpIGFzIFBhY2thZ2VJbmZvW107XG5cbiAgY29uc3QgdHlwZVJvb3RzID0gQXJyYXkuZnJvbSh0eXBlUm9vdHNGcm9tUGFja2FnZXMod3NLZXkpKTtcbiAgLy8gY29uc29sZS5sb2codHlwZVJvb3RzKTtcblxuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgdHlwZVJvb3RzLCAoZmlsZSwgY29udGVudCkgPT4gdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZSwgY29udGVudH0pKTtcbiAgcmV0dXJuIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSksIHBrcywgdHlwZVJvb3RzLFxuICAgIChmaWxlLCBjb250ZW50KSA9PiB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlLCBjb250ZW50fSkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNHByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCB0eXBlUm9vdHM6IHN0cmluZ1tdLCBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4gICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlcjogdHlwZW9mIF9yZWNwID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpO1xuXG4gIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgIGNvbnN0IGluY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgfSk7XG4gICAgY3JlYXRlVHNDb25maWcoJycsIHByb2osIG51bGwsIGRyY3BEaXIsIGluY2x1ZGUgKTtcblxuICAgIGNvbnN0IGdpdElnbm9yZUZpbGUgPSBmaW5kR2l0SW5nb3JlRmlsZShwcm9qKTtcbiAgICBpZiAoZ2l0SWdub3JlRmlsZSkge1xuICAgICAgZnMucmVhZEZpbGUoZ2l0SWdub3JlRmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGdpdElnbm9yZUZpbGUsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLCB0eXBlUm9vdHM6IHN0cmluZ1tdLFxuICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuICAvLyBjb25zdCBjb21tb25QYXRocyA9IFtcbiAgLy8gICAnJyxcbiAgLy8gICBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJyksXG4gIC8vICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpXG4gIC8vIF07XG5cbiAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4gIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbiAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhway5uYW1lLCBway5yZWFsUGF0aCwgd29ya3NwYWNlRGlyLCBkcmNwRGlyLCB0eXBlUm9vdHMpO1xuICB9KTtcblxuICBhcHBlbmRHaXRJZ25vcmVGaWxlcyhpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xufVxuXG5cbmZ1bmN0aW9uIGFwcGVuZEdpdElnbm9yZUZpbGVzKGlnbm9yZVRzQ29uZmlnRmlsZXM6IHN0cmluZ1tdLFxuICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IFBhcmFtZXRlcnM8dHlwZW9mIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZT5bM10pIHtcbiAgY29uc3QgZ2l0Rm9sZGVyVG9JbmdvcmVGaWxlOiB7ZGlyOiBzdHJpbmc7IGlnbm9yZUZpbGU6IHN0cmluZywgaWdub3JlSXRlbXM6IHN0cmluZ1tdfSBbXSA9XG4gICAgT2JqZWN0LmVudHJpZXMoZ2V0U3RhdGUoKS5naXRJZ25vcmVzKS5tYXAoKFtmaWxlLCBjb250ZW50XSkgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGlyOiBQYXRoLmRpcm5hbWUoZmlsZSkgKyBQYXRoLnNlcCxcbiAgICAgICAgaWdub3JlRmlsZTogZmlsZSxcbiAgICAgICAgaWdub3JlSXRlbXM6IFtdXG4gICAgICB9O1xuICAgIH0pO1xuXG4gIGZvciAoY29uc3QgdHNjb25maWdGaWxlIG9mIGlnbm9yZVRzQ29uZmlnRmlsZXMpIHtcbiAgICBnaXRGb2xkZXJUb0luZ29yZUZpbGUuc29tZSgoe2RpciwgaWdub3JlRmlsZSwgaWdub3JlSXRlbXN9KSA9PiB7XG4gICAgICBpZiAodHNjb25maWdGaWxlLnN0YXJ0c1dpdGgoZGlyKSkge1xuICAgICAgICBpZ25vcmVJdGVtcy5wdXNoKFBhdGgucmVsYXRpdmUoZGlyLCB0c2NvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgZm9yIChjb25zdCB7aWdub3JlRmlsZSwgaWdub3JlSXRlbXN9IG9mIGdpdEZvbGRlclRvSW5nb3JlRmlsZSkge1xuICAgIGNvbnN0IG9yaWdDb250ZW50ID0gZ2V0U3RhdGUoKS5naXRJZ25vcmVzW2lnbm9yZUZpbGVdO1xuICAgIGNvbnN0IG9yaWdMaXN0ID0gIF8udW5pcShvcmlnQ29udGVudC5zcGxpdCgvKD86XFxuXFxyPykrLylcbiAgICAgIC5tYXAobGluZSA9PiAvXlxccyooLio/KVxccyokL20uZXhlYyhsaW5lKSFbMV0pXG4gICAgICAuZmlsdGVyKGxpbmUgPT4gbGluZS5sZW5ndGggPiAwKSk7XG4gICAgY29uc3QgaXRlbXNUb0FwcGVuZCA9IF8uZGlmZmVyZW5jZShpZ25vcmVJdGVtcywgb3JpZ0xpc3QpO1xuICAgIGlmIChpdGVtc1RvQXBwZW5kLmxlbmd0aCA+IDApXG4gICAgICBvbkdpdElnbm9yZUZpbGVVcGRhdGUoaWdub3JlRmlsZSwgW1xuICAgICAgICAuLi5vcmlnTGlzdCxcbiAgICAgICAgYCMgLS0tLS0tLSR7bmV3IERhdGUoKS50b0xvY2FsZURhdGVTdHJpbmcoKX0tLS0tLS0tLS1gLFxuICAgICAgICAuLi5pdGVtc1RvQXBwZW5kXS5qb2luKEVPTCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRHaXRJbmdvcmVGaWxlKHN0YXJ0RGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgbGV0IGRpciA9IHN0YXJ0RGlyO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUoc3RhcnREaXIsICcuZ2l0aWdub3JlJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbiAgICAgIHJldHVybiB0ZXN0O1xuICAgIH1cbiAgICBjb25zdCBwYXJlbnQgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50ID09PSBkaXIpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBkaXIgPSBwYXJlbnQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVHNDb25maWcocGtnTmFtZTogc3RyaW5nLCBwa2dSZWFsUGF0aDogc3RyaW5nLCB3b3Jrc3BhY2U6IHN0cmluZyB8IG51bGwsIGRyY3BEaXI6IHN0cmluZyxcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXSwgaW5jbHVkZSA9IFsnLiddKSB7XG4gIGNvbnN0IHRzanNvbjogYW55ID0ge1xuICAgIGV4dGVuZHM6IG51bGwsXG4gICAgaW5jbHVkZVxuICB9O1xuICAvLyB0c2pzb24uaW5jbHVkZSA9IFtdO1xuICBjb25zdCBwcm9qID0gcGtnUmVhbFBhdGg7XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cbiAgY29uc3QgZXh0cmFOb2RlUGF0aDogc3RyaW5nW10gPSBbUGF0aC5yZXNvbHZlKHBrZ1JlYWxQYXRoLCAnbm9kZV9tb2R1bGVzJyldO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBleHRyYU5vZGVQYXRoLnB1c2goUGF0aC5yZXNvbHZlKHdvcmtzcGFjZSwgJ25vZGVfbW9kdWxlcycpKTtcbiAgfVxuXG4gIGNvbnN0IGNvbW1vbkRpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKS5tYXAoZWwgPT4gZWwucmVhbFBhdGgpKTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAgIGlmIChwa2dOYW1lID09PSBuYW1lKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICB9XG5cbiAgaWYgKHBrZ05hbWUgIT09ICdAd2ZoL3BsaW5rJykge1xuICAgIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snQHdmaC9wbGluayddID0gW2RyY3BEaXJdO1xuICAgIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIH1cblxuICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgIHJvb3REaXI6IFBhdGgucmVsYXRpdmUocHJvaiwgY29tbW9uRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgcGF0aHM6IHBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIC8vIElmIHVzZXIgZXhlY3V0ZSAnaW5pdCA8d29ya3NwYWNlPicgaW4gcm9vdCBkaXJlY3RvcnksIGVudi5OT0RFX1BBVEggZG9lcyBub3QgY29udGFpbiB3b3Jrc3BhY2UgXG4gICAgLy8gZGlyZWN0b3J5LCBpbiB0aGlzIGNhc2Ugd2UgbmVlZCBleHBsaWNpdHlseSBhZGQgbm9kZSBwYXRoIFxuICAgIGV4dHJhTm9kZVBhdGgsXG4gICAgZXh0cmFUeXBlUm9vdDogdHlwZVJvb3RzXG4gIH0pO1xuICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCB0c2pzb24pO1xuICByZXR1cm4gdHNjb25maWdGaWxlO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4iXX0=