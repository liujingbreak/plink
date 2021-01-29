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
const log = log4js_1.default.getLogger('plink.editor-helper');
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
    const srcRootDir = misc_1.closestCommonParentDir(Array.from(package_mgr_1.getState().srcPackages.values()).map(el => el.realPath));
    for (const proj of projectDirs) {
        const include = [];
        recipeManager.eachRecipeSrc(proj, (srcDir) => {
            let includeDir = path_1.default.relative(proj, srcDir).replace(/\\/g, '/');
            if (includeDir && includeDir !== '/')
                includeDir += '/';
            include.push(includeDir + '**/*.ts');
            include.push(includeDir + '**/*.tsx');
        });
        const tsconfigFile = createTsConfig(proj, srcRootDir, workspaceDir, drcpDir, include);
        const projDir = path_1.default.resolve(proj);
        package_mgr_1.updateGitIgnores({ file: path_1.default.resolve(proj, '.gitignore'),
            lines: [
                path_1.default.relative(projDir, tsconfigFile).replace(/\\/g, '/')
            ]
        });
        package_mgr_1.updateGitIgnores({
            file: path_1.default.resolve(misc_1.getRootDir(), '.gitignore'),
            lines: [path_1.default.relative(misc_1.getRootDir(), path_1.default.resolve(workspaceDir, 'types')).replace(/\\/g, '/')]
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
function createTsConfig(proj, srcRootDir, workspace, drcpDir, include = ['.']) {
    const tsjson = {
        extends: null,
        include
    };
    // tsjson.include = [];
    tsjson.extends = path_1.default.relative(proj, path_1.default.resolve(drcpDir, 'wfh/tsconfig-base.json'));
    if (!path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
        tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    const pathMapping = {};
    const extraNodePath = [path_1.default.resolve(proj, 'node_modules')];
    for (const [name, { realPath }] of package_mgr_1.getState().srcPackages.entries() || []) {
        const realDir = path_1.default.relative(proj, realPath).replace(/\\/g, '/');
        pathMapping[name] = [realDir];
        pathMapping[name + '/*'] = [realDir + '/*'];
    }
    // if (pkgName !== '@wfh/plink') {
    drcpDir = path_1.default.relative(proj, drcpDir).replace(/\\/g, '/');
    pathMapping['@wfh/plink'] = [drcpDir];
    pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
    // }
    tsjson.compilerOptions = {
        rootDir: path_1.default.relative(proj, srcRootDir).replace(/\\/g, '/'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyw2Q0FBK0I7QUFPL0Isb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QixxREFBK0Q7QUFDL0QsK0NBQTJFO0FBRTNFLHVDQUFrRTtBQUNsRSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFeEMsU0FBZ0IsMkJBQTJCLENBQUMsS0FBYTtJQUN2RCw4Q0FBOEM7SUFDcEMsMkNBQTJDO0lBQ3JELE1BQU0sRUFBRSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLElBQUksRUFBRSxJQUFJLElBQUk7UUFDWixPQUFPO0lBRVQsbURBQW1EO0lBQ25ELHFCQUFxQixDQUFDLDRCQUFjLEVBQUUsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNFLGlEQUFpRDtJQUNqRCwyREFBMkQ7QUFDN0QsQ0FBQztBQVhELGtFQVdDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxXQUFxQixFQUFFLFlBQW9CO0lBQ3hFLE1BQU0sT0FBTyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFRLEVBQUUsQ0FBQyxVQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztJQUUzRCxNQUFNLGFBQWEsR0FBaUIsT0FBTyxDQUFDLGtCQUFr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bmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbi8vIGltcG9ydCB7bWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7b2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuL3N0b3JlJztcbi8vIGltcG9ydCB7UGF5bG9hZEFjdGlvbn0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG4vLyBpbXBvcnQge3R5cGVSb290c0Zyb21QYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCB9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0UHJvamVjdExpc3QsIGdldFN0YXRlLCB1cGRhdGVHaXRJZ25vcmVzIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7IGNsb3Nlc3RDb21tb25QYXJlbnREaXIsIGdldFJvb3REaXIgfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlVHNjb25maWdGaWxlRm9yRWRpdG9yKHdzS2V5OiBzdHJpbmcpIHtcbiAgLy8gY29uc3Qgc3JjUGFja2FnZXMgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICAgICAgICAgICAgLy8gY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkocGF5bG9hZC5kaXIpO1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgLy8gY29uc3Qgd3NEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG4gIHdyaXRlVHNjb25maWc0cHJvamVjdChnZXRQcm9qZWN0TGlzdCgpLCBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSkpO1xuICAvLyByZXR1cm4gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdzRGlyLCBwa3MsXG4gIC8vICAgKGZpbGUsIGNvbnRlbnQpID0+IHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSk7XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNjb25maWc0cHJvamVjdChwcm9qZWN0RGlyczogc3RyaW5nW10sIHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbiAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyOiB0eXBlb2YgX3JlY3AgPSByZXF1aXJlKCcuL3JlY2lwZS1tYW5hZ2VyJyk7XG5cbiAgY29uc3Qgc3JjUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKS5tYXAoZWwgPT4gZWwucmVhbFBhdGgpKTtcblxuICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKHByb2osIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwgZHJjcERpciwgaW5jbHVkZSApO1xuICAgIGNvbnN0IHByb2pEaXIgPSBQYXRoLnJlc29sdmUocHJvaik7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZTogUGF0aC5yZXNvbHZlKHByb2osICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1xuICAgICAgICBQYXRoLnJlbGF0aXZlKHByb2pEaXIsIHRzY29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICBdXG4gICAgfSk7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtQYXRoLnJlbGF0aXZlKGdldFJvb3REaXIoKSwgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV1cbiAgICB9KTtcbiAgICAvLyBjb25zdCBnaXRJZ25vcmVGaWxlID0gZmluZEdpdEluZ29yZUZpbGUocHJvaik7XG4gICAgLy8gaWYgKGdpdElnbm9yZUZpbGUpIHtcbiAgICAvLyAgIGZzLnJlYWRGaWxlKGdpdElnbm9yZUZpbGUsICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgIC8vICAgICBpZiAoZXJyKSB7XG4gICAgLy8gICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgLy8gICAgICAgcmV0dXJuO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZShnaXRJZ25vcmVGaWxlLCBkYXRhKTtcbiAgICAvLyAgIH0pO1xuICAgIC8vIH1cbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLCBkcmNwRGlyOiBzdHJpbmcsXG4gIGluY2x1ZGUgPSBbJy4nXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIFBhdGgucmVzb2x2ZShkcmNwRGlyLCAnd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpKTtcbiAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gIH1cbiAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcbiAgY29uc3QgZXh0cmFOb2RlUGF0aDogc3RyaW5nW10gPSBbUGF0aC5yZXNvbHZlKHByb2osICdub2RlX21vZHVsZXMnKV07XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gIH1cblxuICAvLyBpZiAocGtnTmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsnXSA9IFtkcmNwRGlyXTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgLy8gfVxuXG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcjogUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNSb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBwYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgcHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHdvcmtzcGFjZSAhPSBudWxsID8gd29ya3NwYWNlIDogdW5kZWZpbmVkLFxuICAgIC8vIElmIHVzZXIgZXhlY3V0ZSAnaW5pdCA8d29ya3NwYWNlPicgaW4gcm9vdCBkaXJlY3RvcnksIGVudi5OT0RFX1BBVEggZG9lcyBub3QgY29udGFpbiB3b3Jrc3BhY2UgXG4gICAgLy8gZGlyZWN0b3J5LCBpbiB0aGlzIGNhc2Ugd2UgbmVlZCBleHBsaWNpdHlseSBhZGQgbm9kZSBwYXRoIFxuICAgIGV4dHJhTm9kZVBhdGhcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoc3JjOiBhbnksIHRhcmdldDogYW55KSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICBpZiAoa2V5ID09PSAnY29tcGlsZXJPcHRpb25zJykge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlck9wdGlvbnMpXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LmNvbXBpbGVyT3B0aW9ucywgc3JjLmNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZTogc3RyaW5nLCB0c2NvbmZpZ092ZXJyaWRlU3JjOiBhbnkpIHtcbiAgaWYgKGZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBleGlzdGluZ0pzb24gPSBwYXJzZShleGlzdGluZyk7XG4gICAgb3ZlcnJpZGVUc0NvbmZpZyh0c2NvbmZpZ092ZXJyaWRlU3JjLCBleGlzdGluZ0pzb24pO1xuICAgIGNvbnN0IG5ld0pzb25TdHIgPSBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpO1xuICAgIGlmIChuZXdKc29uU3RyICE9PSBleGlzdGluZykge1xuICAgICAgbG9nLmluZm8oJ1dyaXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoYCR7dHNjb25maWdGaWxlfSBpcyBub3QgY2hhbmdlZC5gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oJ0NyZWF0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLFxuLy8gICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuXG4vLyAgIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbi8vICAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuLy8gICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4vLyAgICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbi8vICAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4vLyAgIH0pO1xuXG4vLyAgIGFwcGVuZEdpdGlnbm9yZShpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4vLyAgIGxldCBkaXIgPSBzdGFydERpcjtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4vLyAgICAgICByZXR1cm4gdGVzdDtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4vLyAgICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuLy8gICAgICAgcmV0dXJuIG51bGw7XG4vLyAgICAgZGlyID0gcGFyZW50O1xuLy8gICB9XG4vLyB9XG4iXX0=