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
exports.updateTsconfigFileForEditor = void 0;
// tslint:disable: max-line-length
const fs = __importStar(require("fs-extra"));
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const config_handler_1 = require("./config-handler");
const package_mgr_1 = require("./package-mgr");
const misc_1 = require("./utils/misc");
const log = log4js_1.default.getLogger('editor-helper');
const { parse } = require('comment-json');
function updateTsconfigFileForEditor(wsKey) {
    // const srcPackages = getState().srcPackages;
    // const wsKey = workspaceKey(payload.dir);
    const ws = package_mgr_1.getState().workspaces.get(wsKey);
    if (ws == null)
        return;
    // const pks: PackageInfo[] = [
    //   ...ws.linkedDependencies.map(([name, ver]) => srcPackages.get(name)),
    //   ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages.get(name))
    // ].filter(pk => pk != null) as PackageInfo[];
    // const wsDir = Path.resolve(getRootDir(), wsKey);
    writeTsconfig4project(package_mgr_1.getProjectList(), path_1.default.resolve(misc_1.getRootDir(), wsKey));
    // return writeTsconfigForEachPackage(wsDir, pks,
    //   (file, content) => updateGitIgnores({file, content}));
}
exports.updateTsconfigFileForEditor = updateTsconfigFileForEditor;
function writeTsconfig4project(projectDirs, workspaceDir) {
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
        const tsconfigFile = createTsConfig('', proj, workspaceDir, drcpDir, include);
        package_mgr_1.updateGitIgnores({ file: path_1.default.resolve(proj, '.gitignore'),
            lines: [path_1.default.relative(path_1.default.resolve(proj), tsconfigFile).replace(/\\/g, '/')] });
        // const gitIgnoreFile = findGitIngoreFile(proj);
        // if (gitIgnoreFile) {
        //   fs.readFile(gitIgnoreFile, 'utf8', (err, data) => {
        //     if (err) {
        //       log.error(err);
        //       return;
        //     }
        //     onGitIgnoreFileUpdate(gitIgnoreFile, data);
        //   });
        // }
    }
}
/**
 *
 * @param pkgName
 * @param dir
 * @param workspace
 * @param drcpDir
 * @param include
 * @return tsconfig file path
 */
function createTsConfig(pkgName, dir, workspace, drcpDir, include = ['.']) {
    const tsjson = {
        extends: null,
        include
    };
    // tsjson.include = [];
    const proj = dir;
    tsjson.extends = path_1.default.relative(proj, path_1.default.resolve(drcpDir, 'wfh/tsconfig-base.json'));
    if (!path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
        tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    const pathMapping = {};
    const extraNodePath = [path_1.default.resolve(dir, 'node_modules')];
    const commonDir = misc_1.closestCommonParentDir(Array.from(package_mgr_1.getState().srcPackages.values()).map(el => el.realPath));
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
    config_handler_1.setTsCompilerOptForNodePath(proj, proj, tsjson.compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: workspace != null ? workspace : undefined,
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
// async function writeTsconfigForEachPackage(workspaceDir: string, pks: PackageInfo[],
//   onGitIgnoreFileUpdate: (file: string, content: string) => void) {
//   const drcpDir = getState().linkedDrcp ? getState().linkedDrcp!.realPath :
//     Path.dirname(require.resolve('@wfh/plink/package.json'));
//   const igConfigFiles = pks.map(pk => {
//     // commonPaths[0] = Path.resolve(pk.realPath, 'node_modules');
//     return createTsConfig(pk.name, pk.realPath, workspaceDir, drcpDir);
//   });
//   appendGitignore(igConfigFiles, onGitIgnoreFileUpdate);
// }
// function findGitIngoreFile(startDir: string): string | null {
//   let dir = startDir;
//   while (true) {
//     const test = Path.resolve(startDir, '.gitignore');
//     if (fs.existsSync(test)) {
//       return test;
//     }
//     const parent = Path.dirname(dir);
//     if (parent === dir)
//       return null;
//     dir = parent;
//   }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyw2Q0FBK0I7QUFPL0Isb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QixxREFBK0Q7QUFDL0QsK0NBQTJFO0FBRTNFLHVDQUFrRTtBQUNsRSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QyxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXhDLFNBQWdCLDJCQUEyQixDQUFDLEtBQWE7SUFDdkQsOENBQThDO0lBQ3BDLDJDQUEyQztJQUNyRCxNQUFNLEVBQUUsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLEVBQUUsSUFBSSxJQUFJO1FBQ1osT0FBTztJQUNULCtCQUErQjtJQUMvQiwwRUFBMEU7SUFDMUUsNEVBQTRFO0lBQzVFLCtDQUErQztJQUcvQyxtREFBbUQ7SUFDbkQscUJBQXFCLENBQUMsNEJBQWMsRUFBRSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDM0UsaURBQWlEO0lBQ2pELDJEQUEyRDtBQUM3RCxDQUFDO0FBaEJELGtFQWdCQztBQUVELFNBQVMscUJBQXFCLENBQUMsV0FBcUIsRUFBRSxZQUEyQjtJQUMvRSxNQUFNLE9BQU8sR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBUSxFQUFFLENBQUMsVUFBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIs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QUssUUFBUSxFQUFFO1lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO1lBQ2xDLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzFFO2FBQU07WUFDTCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsWUFBWSxrQkFBa0IsQ0FBQyxDQUFDO1NBQzlDO0tBQ0Y7U0FBTTtRQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ25DLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakY7QUFDSCxDQUFDO0FBRUQsdUZBQXVGO0FBQ3ZGLHNFQUFzRTtBQUV0RSw4RUFBOEU7QUFDOUUsZ0VBQWdFO0FBRWhFLDBDQUEwQztBQUMxQyxxRUFBcUU7QUFDckUsMEVBQTBFO0FBQzFFLFFBQVE7QUFFUiwyREFBMkQ7QUFDM0QsSUFBSTtBQUVKLGdFQUFnRTtBQUNoRSx3QkFBd0I7QUFDeEIsbUJBQW1CO0FBQ25CLHlEQUF5RDtBQUN6RCxpQ0FBaUM7QUFDakMscUJBQXFCO0FBQ3JCLFFBQVE7QUFDUix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG4vLyBpbXBvcnQge21hcCwgZGlzdGluY3RVbnRpbENoYW5nZWR9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQge29mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi9zdG9yZSc7XG4vLyBpbXBvcnQge1BheWxvYWRBY3Rpb259IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuLy8gaW1wb3J0IHt0eXBlUm9vdHNGcm9tUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGggfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBnZXRTdGF0ZSwgdXBkYXRlR2l0SWdub3JlcyB9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBnZXRSb290RGlyIH0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2VkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVRzY29uZmlnRmlsZUZvckVkaXRvcih3c0tleTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgICAgICAgICAgIC8vIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuO1xuICAvLyBjb25zdCBwa3M6IFBhY2thZ2VJbmZvW10gPSBbXG4gIC8vICAgLi4ud3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcCgoW25hbWUsIHZlcl0pID0+IHNyY1BhY2thZ2VzLmdldChuYW1lKSksXG4gIC8vICAgLi4ud3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcCgoW25hbWUsIHZlcl0pID0+IHNyY1BhY2thZ2VzLmdldChuYW1lKSlcbiAgLy8gXS5maWx0ZXIocGsgPT4gcGsgIT0gbnVsbCkgYXMgUGFja2FnZUluZm9bXTtcblxuXG4gIC8vIGNvbnN0IHdzRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpKTtcbiAgLy8gcmV0dXJuIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3c0RpciwgcGtzLFxuICAvLyAgIChmaWxlLCBjb250ZW50KSA9PiB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlLCBjb250ZW50fSkpO1xufVxuXG5mdW5jdGlvbiB3cml0ZVRzY29uZmlnNHByb2plY3QocHJvamVjdERpcnM6IHN0cmluZ1tdLCB3b3Jrc3BhY2VEaXI6IHN0cmluZyB8IG51bGwpIHtcbiAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKCcnLCBwcm9qLCB3b3Jrc3BhY2VEaXIsIGRyY3BEaXIsIGluY2x1ZGUgKTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlOiBQYXRoLnJlc29sdmUocHJvaiwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUocHJvaiksIHRzY29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXX0pO1xuICAgIC8vIGNvbnN0IGdpdElnbm9yZUZpbGUgPSBmaW5kR2l0SW5nb3JlRmlsZShwcm9qKTtcbiAgICAvLyBpZiAoZ2l0SWdub3JlRmlsZSkge1xuICAgIC8vICAgZnMucmVhZEZpbGUoZ2l0SWdub3JlRmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgLy8gICAgIGlmIChlcnIpIHtcbiAgICAvLyAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAvLyAgICAgICByZXR1cm47XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlKGdpdElnbm9yZUZpbGUsIGRhdGEpO1xuICAgIC8vICAgfSk7XG4gICAgLy8gfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtnTmFtZSBcbiAqIEBwYXJhbSBkaXIgXG4gKiBAcGFyYW0gd29ya3NwYWNlIFxuICogQHBhcmFtIGRyY3BEaXIgXG4gKiBAcGFyYW0gaW5jbHVkZSBcbiAqIEByZXR1cm4gdHNjb25maWcgZmlsZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHBrZ05hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcsIHdvcmtzcGFjZTogc3RyaW5nIHwgbnVsbCwgZHJjcERpcjogc3RyaW5nLFxuICBpbmNsdWRlID0gWycuJ10pIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbCxcbiAgICBpbmNsdWRlXG4gIH07XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIGNvbnN0IHByb2ogPSBkaXI7XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4gIGNvbnN0IGV4dHJhTm9kZVBhdGg6IHN0cmluZ1tdID0gW1BhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnKV07XG4gIGNvbnN0IGNvbW1vbkRpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKS5tYXAoZWwgPT4gZWwucmVhbFBhdGgpKTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAgIGlmIChwa2dOYW1lID09PSBuYW1lKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICB9XG5cbiAgaWYgKHBrZ05hbWUgIT09ICdAd2ZoL3BsaW5rJykge1xuICAgIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snQHdmaC9wbGluayddID0gW2RyY3BEaXJdO1xuICAgIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIH1cblxuICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgIHJvb3REaXI6IFBhdGgucmVsYXRpdmUocHJvaiwgY29tbW9uRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgcGF0aHM6IHBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogd29ya3NwYWNlICE9IG51bGwgPyB3b3Jrc3BhY2UgOiB1bmRlZmluZWQsXG4gICAgLy8gSWYgdXNlciBleGVjdXRlICdpbml0IDx3b3Jrc3BhY2U+JyBpbiByb290IGRpcmVjdG9yeSwgZW52Lk5PREVfUEFUSCBkb2VzIG5vdCBjb250YWluIHdvcmtzcGFjZSBcbiAgICAvLyBkaXJlY3RvcnksIGluIHRoaXMgY2FzZSB3ZSBuZWVkIGV4cGxpY2l0eWx5IGFkZCBub2RlIHBhdGggXG4gICAgZXh0cmFOb2RlUGF0aFxuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhzcmM6IGFueSwgdGFyZ2V0OiBhbnkpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgIGlmIChrZXkgPT09ICdjb21waWxlck9wdGlvbnMnKSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVyT3B0aW9ucylcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0YXJnZXQuY29tcGlsZXJPcHRpb25zLCBzcmMuY29tcGlsZXJPcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlOiBzdHJpbmcsIHRzY29uZmlnT3ZlcnJpZGVTcmM6IGFueSkge1xuICBpZiAoZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ092ZXJyaWRlU3JjLCBudWxsLCAnICAnKSk7XG4gIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwa3M6IFBhY2thZ2VJbmZvW10sXG4vLyAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG5cbi8vICAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuLy8gICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4vLyAgIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbi8vICAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuLy8gICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhway5uYW1lLCBway5yZWFsUGF0aCwgd29ya3NwYWNlRGlyLCBkcmNwRGlyKTtcbi8vICAgfSk7XG5cbi8vICAgYXBwZW5kR2l0aWdub3JlKGlnQ29uZmlnRmlsZXMsIG9uR2l0SWdub3JlRmlsZVVwZGF0ZSk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGZpbmRHaXRJbmdvcmVGaWxlKHN0YXJ0RGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbi8vICAgbGV0IGRpciA9IHN0YXJ0RGlyO1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUoc3RhcnREaXIsICcuZ2l0aWdub3JlJyk7XG4vLyAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbi8vICAgICAgIHJldHVybiB0ZXN0O1xuLy8gICAgIH1cbi8vICAgICBjb25zdCBwYXJlbnQgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbi8vICAgICBpZiAocGFyZW50ID09PSBkaXIpXG4vLyAgICAgICByZXR1cm4gbnVsbDtcbi8vICAgICBkaXIgPSBwYXJlbnQ7XG4vLyAgIH1cbi8vIH1cbiJdfQ==