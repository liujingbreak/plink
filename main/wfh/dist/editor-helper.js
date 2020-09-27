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
            return createTsConfig(pk.name, pk.realPath, workspaceDir, drcpDir);
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
function createTsConfig(pkgName, pkgRealPath, workspace, drcpDir, include = ['.']) {
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
    const commonDir = misc_1.closestCommonParentDir(Array.from(package_mgr_1.getState().srcPackages.values()).map(el => el.realPath));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsNkNBQStCO0FBRS9CLCtDQUFvRDtBQUNwRCwyQkFBdUI7QUFDdkIscURBQTZEO0FBQzdELG9EQUE0QjtBQUM1Qix1Q0FBb0Q7QUFDcEQsNERBQTREO0FBQzVELG9EQUF1QjtBQUN2QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QyxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXhDLFNBQWdCLHFCQUFxQixDQUFDLFdBQXFCLEVBQUUscUJBQThEO0lBQ3pILE1BQU0sT0FBTyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQztJQUVoRSxNQUFNLGFBQWEsR0FBaUIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFaEUsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUU7UUFDOUIsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzdCLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBYyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxVQUFVLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNqRSxJQUFJLFVBQVUsSUFBSSxVQUFVLEtBQUssR0FBRztnQkFDbEMsVUFBVSxJQUFJLEdBQUcsQ0FBQztZQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsQ0FBQztZQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUNILGNBQWMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFbEQsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBSSxhQUFhLEVBQUU7WUFDakIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUMvQyxJQUFJLEdBQUcsRUFBRTtvQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNmLE9BQU87aUJBQ1I7Z0JBQ0QscUJBQXFCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzdDLENBQUMsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtBQUNILENBQUM7QUE1QkQsc0RBNEJDO0FBRUQsU0FBc0IsMkJBQTJCLENBQUMsWUFBb0IsRUFBRSxHQUFrQixFQUN4RixxQkFBOEQ7O1FBQzlELHdCQUF3QjtRQUN4QixRQUFRO1FBQ1IsZ0RBQWdEO1FBQ2hELCtDQUErQztRQUMvQyxLQUFLO1FBRUwsTUFBTSxPQUFPLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDakMsOERBQThEO1lBQzlELE9BQU8sY0FBYyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDLENBQUM7UUFFSCxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQUE7QUFqQkQsa0VBaUJDO0FBR0QsU0FBUyxvQkFBb0IsQ0FBQyxtQkFBNkIsRUFDekQscUJBQXdFO0lBQ3hFLE1BQU0scUJBQXFCLEdBQ3pCLE1BQU0sQ0FBQyxPQUFPLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUU7UUFDNUQsT0FBTztZQUNMLEdBQUcsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLGNBQUksQ0FBQyxHQUFHO1lBQ2xDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFdBQVcsRUFBRSxFQUFFO1NBQ2hCLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVMLEtBQUssTUFBTSxZQUFZLElBQUksbUJBQW1CLEVBQUU7UUFDOUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBQyxFQUFFLEVBQUU7WUFDNUQsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNoQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkUsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUVELEtBQUssTUFBTSxFQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUMsSUFBSSxxQkFBcUIsRUFBRTtRQUM3RCxNQUFNLFdBQVcsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFJLGdCQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO2FBQ3JELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM1QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxhQUFhLEdBQUcsZ0JBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFELElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQzFCLHFCQUFxQixDQUFDLFVBQVUsRUFBRTtnQkFDaEMsR0FBRyxRQUFRO2dCQUNYLFlBQVksSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXO2dCQUN0RCxHQUFHLGFBQWE7YUFBQyxDQUFDLElBQUksQ0FBQyxRQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2xDO0FBQ0gsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsUUFBZ0I7SUFDekMsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDO0lBQ25CLE9BQU8sSUFBSSxFQUFFO1FBQ1gsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksTUFBTSxLQUFLLEdBQUc7WUFDaEIsT0FBTyxJQUFJLENBQUM7UUFDZCxHQUFHLEdBQUcsTUFBTSxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsT0FBZSxFQUFFLFdBQW1CLEVBQUUsU0FBd0IsRUFBRSxPQUFlLEVBQUUsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBQ3RILE1BQU0sTUFBTSxHQUFRO1FBQ2xCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsT0FBTztLQUNSLENBQUM7SUFDRix1QkFBdUI7SUFDdkIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLElBQUksQ0FBQyxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3hFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7S0FDeEM7SUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVwRCxNQUFNLFdBQVcsR0FBOEIsRUFBRSxDQUFDO0lBRWxELE1BQU0sYUFBYSxHQUFhLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUU1RSxJQUFJLFNBQVMsRUFBRTtRQUNiLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUVELE1BQU0sU0FBUyxHQUFHLDZCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRTdHLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFDLFFBQVEsRUFBQyxDQUFDLElBQUksc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDdkUsSUFBSSxPQUFPLEtBQUssSUFBSTtZQUNsQixTQUFTO1FBQ1gsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsRSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixXQUFXLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO0tBQzdDO0lBRUQsSUFBSSxPQUFPLEtBQUssaUJBQWlCLEVBQUU7UUFDakMsT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0QsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztLQUNyRDtJQUVELE1BQU0sQ0FBQyxlQUFlLEdBQUc7UUFDdkIsT0FBTyxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO1FBQ3pELHFGQUFxRjtRQUN2RixZQUFZLEVBQUUsS0FBSztRQUNuQixHQUFHLEVBQUUsVUFBVTtRQUNmLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLE1BQU0sRUFBRSxVQUFVO1FBQ2xCLEtBQUssRUFBRSxXQUFXO0tBQ25CLENBQUM7SUFDRiw0Q0FBMkIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGVBQWUsRUFBRTtRQUN4RCxlQUFlLEVBQUUsSUFBSTtRQUNyQixrR0FBa0c7UUFDbEcsNkRBQTZEO1FBQzdELGFBQWE7S0FDZCxDQUFDLENBQUM7SUFDSCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN6RCxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEMsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsR0FBUSxFQUFFLE1BQVc7SUFDN0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2xDLElBQUksR0FBRyxLQUFLLGlCQUFpQixFQUFFO1lBQzdCLElBQUksTUFBTSxDQUFDLGVBQWU7Z0JBQ3hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDOUQ7YUFBTTtZQUNMLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEI7S0FDRjtBQUNILENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFlBQW9CLEVBQUUsbUJBQXdCO0lBQ3ZFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUMvQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2RCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELElBQUksVUFBVSxLQUFLLFFBQVEsRUFBRTtZQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztZQUNsQyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUMxRTthQUFNO1lBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLFlBQVksa0JBQWtCLENBQUMsQ0FBQztTQUM5QztLQUNGO1NBQU07UUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUNuQyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2pGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQge2dldFN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge0VPTH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZzRwcm9qZWN0KHByb2plY3REaXJzOiBzdHJpbmdbXSwgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlcjogdHlwZW9mIF9yZWNwID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpO1xuXG4gIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgIGNvbnN0IGluY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgfSk7XG4gICAgY3JlYXRlVHNDb25maWcoJycsIHByb2osIG51bGwsIGRyY3BEaXIsIGluY2x1ZGUgKTtcblxuICAgIGNvbnN0IGdpdElnbm9yZUZpbGUgPSBmaW5kR2l0SW5nb3JlRmlsZShwcm9qKTtcbiAgICBpZiAoZ2l0SWdub3JlRmlsZSkge1xuICAgICAgZnMucmVhZEZpbGUoZ2l0SWdub3JlRmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGdpdElnbm9yZUZpbGUsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgY29tbW9uUGF0aHMgPSBbXG4gIC8vICAgJycsXG4gIC8vICAgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpLFxuICAvLyAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKVxuICAvLyBdO1xuXG4gIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbiAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpO1xuXG4gIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbiAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhway5uYW1lLCBway5yZWFsUGF0aCwgd29ya3NwYWNlRGlyLCBkcmNwRGlyKTtcbiAgfSk7XG5cbiAgYXBwZW5kR2l0SWdub3JlRmlsZXMoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRHaXRJZ25vcmVGaWxlcyhpZ25vcmVUc0NvbmZpZ0ZpbGVzOiBzdHJpbmdbXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiBQYXJhbWV0ZXJzPHR5cGVvZiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2U+WzJdKSB7XG4gIGNvbnN0IGdpdEZvbGRlclRvSW5nb3JlRmlsZToge2Rpcjogc3RyaW5nOyBpZ25vcmVGaWxlOiBzdHJpbmcsIGlnbm9yZUl0ZW1zOiBzdHJpbmdbXX0gW10gPVxuICAgIE9iamVjdC5lbnRyaWVzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKChbZmlsZSwgY29udGVudF0pID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpcjogUGF0aC5kaXJuYW1lKGZpbGUpICsgUGF0aC5zZXAsXG4gICAgICAgIGlnbm9yZUZpbGU6IGZpbGUsXG4gICAgICAgIGlnbm9yZUl0ZW1zOiBbXVxuICAgICAgfTtcbiAgICB9KTtcblxuICBmb3IgKGNvbnN0IHRzY29uZmlnRmlsZSBvZiBpZ25vcmVUc0NvbmZpZ0ZpbGVzKSB7XG4gICAgZ2l0Rm9sZGVyVG9JbmdvcmVGaWxlLnNvbWUoKHtkaXIsIGlnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSkgPT4ge1xuICAgICAgaWYgKHRzY29uZmlnRmlsZS5zdGFydHNXaXRoKGRpcikpIHtcbiAgICAgICAgaWdub3JlSXRlbXMucHVzaChQYXRoLnJlbGF0aXZlKGRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIGZvciAoY29uc3Qge2lnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSBvZiBnaXRGb2xkZXJUb0luZ29yZUZpbGUpIHtcbiAgICBjb25zdCBvcmlnQ29udGVudCA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tpZ25vcmVGaWxlXTtcbiAgICBjb25zdCBvcmlnTGlzdCA9ICBfLnVuaXEob3JpZ0NvbnRlbnQuc3BsaXQoLyg/Olxcblxccj8pKy8pXG4gICAgICAubWFwKGxpbmUgPT4gL15cXHMqKC4qPylcXHMqJC9tLmV4ZWMobGluZSkhWzFdKVxuICAgICAgLmZpbHRlcihsaW5lID0+IGxpbmUubGVuZ3RoID4gMCkpO1xuICAgIGNvbnN0IGl0ZW1zVG9BcHBlbmQgPSBfLmRpZmZlcmVuY2UoaWdub3JlSXRlbXMsIG9yaWdMaXN0KTtcbiAgICBpZiAoaXRlbXNUb0FwcGVuZC5sZW5ndGggPiAwKVxuICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGlnbm9yZUZpbGUsIFtcbiAgICAgICAgLi4ub3JpZ0xpc3QsXG4gICAgICAgIGAjIC0tLS0tLS0ke25ldyBEYXRlKCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9LS0tLS0tLS0tYCxcbiAgICAgICAgLi4uaXRlbXNUb0FwcGVuZF0uam9pbihFT0wpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBkaXIgPSBzdGFydERpcjtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZGlyID0gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHBrZ05hbWU6IHN0cmluZywgcGtnUmVhbFBhdGg6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLCBkcmNwRGlyOiBzdHJpbmcsIGluY2x1ZGUgPSBbJy4nXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgY29uc3QgcHJvaiA9IHBrZ1JlYWxQYXRoO1xuICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgUGF0aC5yZXNvbHZlKGRyY3BEaXIsICd3ZmgvdHNjb25maWctYmFzZS5qc29uJykpO1xuICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgfVxuICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuXG4gIGNvbnN0IGV4dHJhTm9kZVBhdGg6IHN0cmluZ1tdID0gW1BhdGgucmVzb2x2ZShwa2dSZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpXTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgZXh0cmFOb2RlUGF0aC5wdXNoKFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2UsICdub2RlX21vZHVsZXMnKSk7XG4gIH1cblxuICBjb25zdCBjb21tb25EaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20oZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkubWFwKGVsID0+IGVsLnJlYWxQYXRoKSk7XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBpZiAocGtnTmFtZSA9PT0gbmFtZSlcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgfVxuXG4gIGlmIChwa2dOYW1lICE9PSAnZHItY29tcC1wYWNrYWdlJykge1xuICAgIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICB9XG5cbiAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICByb290RGlyOiBQYXRoLnJlbGF0aXZlKHByb2osIGNvbW1vbkRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgIHNraXBMaWJDaGVjazogZmFsc2UsXG4gICAganN4OiAncHJlc2VydmUnLFxuICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgbW9kdWxlOiAnY29tbW9uanMnLFxuICAgIHBhdGhzOiBwYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAvLyBJZiB1c2VyIGV4ZWN1dGUgJ2luaXQgPHdvcmtzcGFjZT4nIGluIHJvb3QgZGlyZWN0b3J5LCBlbnYuTk9ERV9QQVRIIGRvZXMgbm90IGNvbnRhaW4gd29ya3NwYWNlIFxuICAgIC8vIGRpcmVjdG9yeSwgaW4gdGhpcyBjYXNlIHdlIG5lZWQgZXhwbGljaXR5bHkgYWRkIG5vZGUgcGF0aCBcbiAgICBleHRyYU5vZGVQYXRoXG4gIH0pO1xuICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCB0c2pzb24pO1xuICByZXR1cm4gdHNjb25maWdGaWxlO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4iXX0=