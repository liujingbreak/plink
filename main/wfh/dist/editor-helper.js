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
        const projDir = path_1.default.resolve(proj);
        package_mgr_1.updateGitIgnores({ file: path_1.default.resolve(proj, '.gitignore'),
            lines: [
                path_1.default.relative(projDir, tsconfigFile).replace(/\\/g, '/')
            ]
        });
        package_mgr_1.updateGitIgnores({
            file: path_1.default.resolve(misc_1.getRootDir(), '.gitignore'),
            lines: [path_1.default.relative(misc_1.getRootDir(), path_1.default.resolve(workspaceDir, 'types'))]
        });
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
        declaration: false,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyw2Q0FBK0I7QUFPL0Isb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QixxREFBK0Q7QUFDL0QsK0NBQTJFO0FBRTNFLHVDQUFrRTtBQUNsRSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUM5QyxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXhDLFNBQWdCLDJCQUEyQixDQUFDLEtBQWE7SUFDdkQsOENBQThDO0lBQ3BDLDJDQUEyQztJQUNyRCxNQUFNLEVBQUUsR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLEVBQUUsSUFBSSxJQUFJO1FBQ1osT0FBTztJQUVULG1EQUFtRDtJQUNuRCxxQkFBcUIsQ0FBQyw0QkFBYyxFQUFFLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMzRSxpREFBaUQ7SUFDakQsMkRBQTJEO0FBQzdELENBQUM7QUFYRCxrRUFXQztBQUVELFNBQVMscUJBQXFCLENBQUMsV0FBcUIsRUFBRSxZQUFvQjtJQUN4RSxNQUFNLE9BQU8sR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBUSxFQUFFLENBQUMsVUFBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7SUFFM0QsTUFBTSxhQUFhLEdBQWlCLE9BQU8sQ0FBQyxrQkFBa0Is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ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbi8vIGltcG9ydCB7bWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7b2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuL3N0b3JlJztcbi8vIGltcG9ydCB7UGF5bG9hZEFjdGlvbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG4vLyBpbXBvcnQge3R5cGVSb290c0Zyb21QYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCB9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0UHJvamVjdExpc3QsIGdldFN0YXRlLCB1cGRhdGVHaXRJZ25vcmVzIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7IGNsb3Nlc3RDb21tb25QYXJlbnREaXIsIGdldFJvb3REaXIgfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlVHNjb25maWdGaWxlRm9yRWRpdG9yKHdzS2V5OiBzdHJpbmcpIHtcbiAgLy8gY29uc3Qgc3JjUGFja2FnZXMgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICAgICAgICAgICAgLy8gY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkocGF5bG9hZC5kaXIpO1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgLy8gY29uc3Qgd3NEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG4gIHdyaXRlVHNjb25maWc0cHJvamVjdChnZXRQcm9qZWN0TGlzdCgpLCBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSkpO1xuICAvLyByZXR1cm4gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdzRGlyLCBwa3MsXG4gIC8vICAgKGZpbGUsIGNvbnRlbnQpID0+IHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNjb25maWc0cHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbiAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyOiB0eXBlb2YgX3JlY3AgPSByZXF1aXJlKCcuL3JlY2lwZS1tYW5hZ2VyJyk7XG5cbiAgZm9yIChjb25zdCBwcm9qIG9mIHByb2plY3REaXJzKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBjcmVhdGVUc0NvbmZpZygnJywgcHJvaiwgd29ya3NwYWNlRGlyLCBkcmNwRGlyLCBpbmNsdWRlICk7XG4gICAgY29uc3QgcHJvakRpciA9IFBhdGgucmVzb2x2ZShwcm9qKTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlOiBQYXRoLnJlc29sdmUocHJvaiwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbXG4gICAgICAgIFBhdGgucmVsYXRpdmUocHJvakRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIF1cbiAgICB9KTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1BhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAndHlwZXMnKSldXG4gICAgfSk7XG4gICAgLy8gY29uc3QgZ2l0SWdub3JlRmlsZSA9IGZpbmRHaXRJbmdvcmVGaWxlKHByb2opO1xuICAgIC8vIGlmIChnaXRJZ25vcmVGaWxlKSB7XG4gICAgLy8gICBmcy5yZWFkRmlsZShnaXRJZ25vcmVGaWxlLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAvLyAgICAgaWYgKGVycikge1xuICAgIC8vICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIC8vICAgICAgIHJldHVybjtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBvbkdpdElnbm9yZUZpbGVVcGRhdGUoZ2l0SWdub3JlRmlsZSwgZGF0YSk7XG4gICAgLy8gICB9KTtcbiAgICAvLyB9XG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa2dOYW1lIFxuICogQHBhcmFtIGRpciBcbiAqIEBwYXJhbSB3b3Jrc3BhY2UgXG4gKiBAcGFyYW0gZHJjcERpciBcbiAqIEBwYXJhbSBpbmNsdWRlIFxuICogQHJldHVybiB0c2NvbmZpZyBmaWxlIHBhdGhcbiAqL1xuZnVuY3Rpb24gY3JlYXRlVHNDb25maWcocGtnTmFtZTogc3RyaW5nLCBkaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLCBkcmNwRGlyOiBzdHJpbmcsXG4gIGluY2x1ZGUgPSBbJy4nXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgY29uc3QgcHJvaiA9IGRpcjtcbiAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIFBhdGgucmVzb2x2ZShkcmNwRGlyLCAnd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpKTtcbiAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gIH1cbiAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcbiAgY29uc3QgZXh0cmFOb2RlUGF0aDogc3RyaW5nW10gPSBbUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpXTtcbiAgY29uc3QgY29tbW9uRGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihBcnJheS5mcm9tKGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpLm1hcChlbCA9PiBlbC5yZWFsUGF0aCkpO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIHtyZWFsUGF0aH1dIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZW50cmllcygpIHx8IFtdKSB7XG4gICAgaWYgKHBrZ05hbWUgPT09IG5hbWUpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gIH1cblxuICBpZiAocGtnTmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgZHJjcERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgfVxuXG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcjogUGF0aC5yZWxhdGl2ZShwcm9qLCBjb21tb25EaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBkZWNsYXJhdGlvbjogZmFsc2UsIC8vIEltcG9ydGFudDogdG8gYXZvaWQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yOTgwOCNpc3N1ZWNvbW1lbnQtNDg3ODExODMyXG4gICAgcGF0aHM6IHBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogd29ya3NwYWNlICE9IG51bGwgPyB3b3Jrc3BhY2UgOiB1bmRlZmluZWQsXG4gICAgLy8gSWYgdXNlciBleGVjdXRlICdpbml0IDx3b3Jrc3BhY2U+JyBpbiByb290IGRpcmVjdG9yeSwgZW52Lk5PREVfUEFUSCBkb2VzIG5vdCBjb250YWluIHdvcmtzcGFjZSBcbiAgICAvLyBkaXJlY3RvcnksIGluIHRoaXMgY2FzZSB3ZSBuZWVkIGV4cGxpY2l0eWx5IGFkZCBub2RlIHBhdGggXG4gICAgZXh0cmFOb2RlUGF0aFxuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhzcmM6IGFueSwgdGFyZ2V0OiBhbnkpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgIGlmIChrZXkgPT09ICdjb21waWxlck9wdGlvbnMnKSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVyT3B0aW9ucylcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0YXJnZXQuY29tcGlsZXJPcHRpb25zLCBzcmMuY29tcGlsZXJPcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlOiBzdHJpbmcsIHRzY29uZmlnT3ZlcnJpZGVTcmM6IGFueSkge1xuICBpZiAoZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ092ZXJyaWRlU3JjLCBudWxsLCAnICAnKSk7XG4gIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwa3M6IFBhY2thZ2VJbmZvW10sXG4vLyAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG5cbi8vICAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuLy8gICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4vLyAgIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbi8vICAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuLy8gICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhway5uYW1lLCBway5yZWFsUGF0aCwgd29ya3NwYWNlRGlyLCBkcmNwRGlyKTtcbi8vICAgfSk7XG5cbi8vICAgYXBwZW5kR2l0aWdub3JlKGlnQ29uZmlnRmlsZXMsIG9uR2l0SWdub3JlRmlsZVVwZGF0ZSk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGZpbmRHaXRJbmdvcmVGaWxlKHN0YXJ0RGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbi8vICAgbGV0IGRpciA9IHN0YXJ0RGlyO1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUoc3RhcnREaXIsICcuZ2l0aWdub3JlJyk7XG4vLyAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbi8vICAgICAgIHJldHVybiB0ZXN0O1xuLy8gICAgIH1cbi8vICAgICBjb25zdCBwYXJlbnQgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbi8vICAgICBpZiAocGFyZW50ID09PSBkaXIpXG4vLyAgICAgICByZXR1cm4gbnVsbDtcbi8vICAgICBkaXIgPSBwYXJlbnQ7XG4vLyAgIH1cbi8vIH1cbiJdfQ==