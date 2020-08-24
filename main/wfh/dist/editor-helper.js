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
const _fs = __importStar(require("fs-extra"));
const package_mgr_1 = require("./package-mgr");
const os_1 = require("os");
const config_handler_1 = require("./config-handler");
const log4js_1 = __importDefault(require("log4js"));
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
            _fs.readFile(gitIgnoreFile, 'utf8', (err, data) => {
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
        if (_fs.existsSync(test)) {
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
        rootDir: '.',
        // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
        skipLibCheck: false,
        jsx: 'preserve',
        noImplicitAny: true,
        target: 'es2015',
        module: 'commonjs',
        paths: pathMapping
    };
    config_handler_1.setTsCompilerOpt(proj, tsjson.compilerOptions, {
        setTypeRoots: true,
        // If user execute 'init <workspace>' in root directory, env.NODE_PATH does not contain workspace 
        // directory, in this case we need explicityly add node path 
        extraNodePath: workspace ? [path_1.default.resolve(workspace, 'node_modules')] : undefined
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
    if (_fs.existsSync(tsconfigFile)) {
        const existing = _fs.readFileSync(tsconfigFile, 'utf8');
        const existingJson = parse(existing);
        overrideTsConfig(tsconfigOverrideSrc, existingJson);
        const newJsonStr = JSON.stringify(existingJson, null, '  ');
        if (newJsonStr !== existing) {
            log.info('Write ' + tsconfigFile);
            _fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
        }
        else {
            log.info(`${tsconfigFile} is not changed.`);
        }
    }
    else {
        log.info('Create ' + tsconfigFile);
        _fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfigOverrideSrc, null, '  '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsOENBQWdDO0FBRWhDLCtDQUFvRDtBQUNwRCwyQkFBdUI7QUFDdkIscURBQWtEO0FBQ2xELG9EQUE0QjtBQUM1Qiw0REFBNEQ7QUFDNUQsb0RBQXVCO0FBQ3ZCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsU0FBZ0IscUJBQXFCLENBQUMsV0FBcUIsRUFBRSxxQkFBOEQ7SUFDekgsTUFBTSxPQUFPLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO0lBRWhFLE1BQU0sYUFBYSxHQUFpQixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUVoRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtRQUM5QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtZQUNuRCxJQUFJLFVBQVUsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pFLElBQUksVUFBVSxJQUFJLFVBQVUsS0FBSyxHQUFHO2dCQUNs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bmd0aFxuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQge2dldFN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge0VPTH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0fSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCB7bWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2VkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlVHNjb25maWc0cHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbiAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuICAgIGNyZWF0ZVRzQ29uZmlnKFxuICAgICAge25hbWU6ICcnLCByZWFsUGF0aDogcHJvan0sXG4gICAgICBudWxsLFxuICAgICAgZHJjcERpcixcbiAgICAgIGluY2x1ZGVcbiAgICApO1xuXG4gICAgY29uc3QgZ2l0SWdub3JlRmlsZSA9IGZpbmRHaXRJbmdvcmVGaWxlKHByb2opO1xuICAgIGlmIChnaXRJZ25vcmVGaWxlKSB7XG4gICAgICBfZnMucmVhZEZpbGUoZ2l0SWdub3JlRmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGdpdElnbm9yZUZpbGUsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgY29tbW9uUGF0aHMgPSBbXG4gIC8vICAgJycsXG4gIC8vICAgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpLFxuICAvLyAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKVxuICAvLyBdO1xuXG4gIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbiAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpO1xuXG4gIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbiAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhwaywgd29ya3NwYWNlRGlyLCBkcmNwRGlyKTtcbiAgfSk7XG5cbiAgYXBwZW5kR2l0SWdub3JlRmlsZXMoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbn1cblxuXG5mdW5jdGlvbiBhcHBlbmRHaXRJZ25vcmVGaWxlcyhpZ25vcmVUc0NvbmZpZ0ZpbGVzOiBzdHJpbmdbXSxcbiAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiBQYXJhbWV0ZXJzPHR5cGVvZiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2U+WzJdKSB7XG4gIGNvbnN0IGdpdEZvbGRlclRvSW5nb3JlRmlsZToge2Rpcjogc3RyaW5nOyBpZ25vcmVGaWxlOiBzdHJpbmcsIGlnbm9yZUl0ZW1zOiBzdHJpbmdbXX0gW10gPVxuICAgIE9iamVjdC5lbnRyaWVzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKChbZmlsZSwgY29udGVudF0pID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpcjogUGF0aC5kaXJuYW1lKGZpbGUpICsgUGF0aC5zZXAsXG4gICAgICAgIGlnbm9yZUZpbGU6IGZpbGUsXG4gICAgICAgIGlnbm9yZUl0ZW1zOiBbXVxuICAgICAgfTtcbiAgICB9KTtcblxuICBmb3IgKGNvbnN0IHRzY29uZmlnRmlsZSBvZiBpZ25vcmVUc0NvbmZpZ0ZpbGVzKSB7XG4gICAgZ2l0Rm9sZGVyVG9JbmdvcmVGaWxlLnNvbWUoKHtkaXIsIGlnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSkgPT4ge1xuICAgICAgaWYgKHRzY29uZmlnRmlsZS5zdGFydHNXaXRoKGRpcikpIHtcbiAgICAgICAgaWdub3JlSXRlbXMucHVzaChQYXRoLnJlbGF0aXZlKGRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIGZvciAoY29uc3Qge2lnbm9yZUZpbGUsIGlnbm9yZUl0ZW1zfSBvZiBnaXRGb2xkZXJUb0luZ29yZUZpbGUpIHtcbiAgICBjb25zdCBvcmlnQ29udGVudCA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tpZ25vcmVGaWxlXTtcbiAgICBjb25zdCBpdGVtc1RvQXBwZW5kID0gXy5kaWZmZXJlbmNlKGlnbm9yZUl0ZW1zLFxuICAgICAgb3JpZ0NvbnRlbnQuc3BsaXQoLyg/Olxcblxccj8pKy8pLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApKTtcbiAgICBpZiAoaXRlbXNUb0FwcGVuZC5sZW5ndGggPiAwKVxuICAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGlnbm9yZUZpbGUsIG9yaWdDb250ZW50ICsgRU9MICsgaXRlbXNUb0FwcGVuZC5qb2luKEVPTCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRHaXRJbmdvcmVGaWxlKHN0YXJ0RGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgbGV0IGRpciA9IHN0YXJ0RGlyO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUoc3RhcnREaXIsICcuZ2l0aWdub3JlJyk7XG4gICAgaWYgKF9mcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4gICAgICByZXR1cm4gdGVzdDtcbiAgICB9XG4gICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgZGlyID0gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHBrZzoge25hbWU6IHN0cmluZywgcmVhbFBhdGg6IHN0cmluZ30sIHdvcmtzcGFjZTogc3RyaW5nIHwgbnVsbCwgZHJjcERpcjogc3RyaW5nLCBpbmNsdWRlID0gWycuJ10pIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbCxcbiAgICBpbmNsdWRlXG4gIH07XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIGNvbnN0IHByb2ogPSBwa2cucmVhbFBhdGg7XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gIGZvciAoY29uc3QgW25hbWUsIHtyZWFsUGF0aH1dIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZW50cmllcygpIHx8IFtdKSB7XG4gICAgaWYgKHBrZy5uYW1lID09PSBuYW1lKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICB9XG5cbiAgaWYgKHBrZy5uYW1lICE9PSAnZHItY29tcC1wYWNrYWdlJykge1xuICAgIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICB9XG5cbiAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICByb290RGlyOiAnLicsXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBwYXRoczogcGF0aE1hcHBpbmdcbiAgfTtcbiAgc2V0VHNDb21waWxlck9wdChwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgc2V0VHlwZVJvb3RzOiB0cnVlLFxuICAgIC8vIElmIHVzZXIgZXhlY3V0ZSAnaW5pdCA8d29ya3NwYWNlPicgaW4gcm9vdCBkaXJlY3RvcnksIGVudi5OT0RFX1BBVEggZG9lcyBub3QgY29udGFpbiB3b3Jrc3BhY2UgXG4gICAgLy8gZGlyZWN0b3J5LCBpbiB0aGlzIGNhc2Ugd2UgbmVlZCBleHBsaWNpdHlseSBhZGQgbm9kZSBwYXRoIFxuICAgIGV4dHJhTm9kZVBhdGg6IHdvcmtzcGFjZSA/IFtQYXRoLnJlc29sdmUod29ya3NwYWNlLCAnbm9kZV9tb2R1bGVzJyldIDogdW5kZWZpbmVkXG4gIH0pO1xuXG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoc3JjOiBhbnksIHRhcmdldDogYW55KSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICBpZiAoa2V5ID09PSAnY29tcGlsZXJPcHRpb25zJykge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlck9wdGlvbnMpXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LmNvbXBpbGVyT3B0aW9ucywgc3JjLmNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZTogc3RyaW5nLCB0c2NvbmZpZ092ZXJyaWRlU3JjOiBhbnkpIHtcbiAgaWYgKF9mcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IF9mcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgICBfZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgIF9mcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbiJdfQ==