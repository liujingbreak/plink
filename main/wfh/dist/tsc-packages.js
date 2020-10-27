"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTsconfigFiles = exports.tsc = void 0;
/**
 * Use Typescript "Project Reference" & "tsc -b Commandline" ability to compile multiple packages
 */
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const config_1 = __importDefault(require("./config"));
const config_handler_1 = require("./config-handler");
const package_mgr_1 = require("./package-mgr");
const tsc_packages_slice_1 = require("./tsc-packages-slice");
const utils_1 = require("./cmd/utils");
const log = log4js_1.default.getLogger('wfh.tsc-packages');
function tsc(opts) {
    if (opts.package) {
        // TODO
        utils_1.findPackagesByNames(package_mgr_1.getState(), opts.package);
    }
}
exports.tsc = tsc;
function generateTsconfigFiles(pkgs, opts) {
    let wsKey = package_mgr_1.workspaceKey(process.cwd());
    const walked = new Set();
    for (const pkg of pkgs) {
        walkReferencedPkg(pkg);
    }
    if (!package_mgr_1.getState().workspaces.has(wsKey))
        wsKey = package_mgr_1.getState().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    const tsConfigsDir = config_1.default.resolve('destDir', 'tsconfigs');
    fs_extra_1.default.mkdirpSync(tsConfigsDir);
    // const files = fs.readdirSync(tsConfigsDir);
    // console.log(files);
    const baseConfigFile = path_1.default.resolve(__dirname, 'tsconfig-base.json');
    const baseTsxConfigFile = path_1.default.resolve(__dirname, 'tsconfig-tsx.json');
    const done = Array.from(walked.values())
        .map(pkg => {
        const rawConfigs = tsc_packages_slice_1.getState().configs.get(pkg);
        if (rawConfigs == null) {
            throw new Error(`Package ${pkg} does not exist.`);
        }
        const tsconfigFiles = tsconfigFileNames(pkg);
        const works = rawConfigs
            .map((raw, idx) => {
            return new rxjs_1.Observable(sub => {
                const tsconfig = createTsconfigs(package_mgr_1.getState().srcPackages.get(pkg), tsconfigFiles, idx, raw.rootDir, raw.outDir, raw.files, raw.references);
                const toWrite = path_1.default.resolve(tsConfigsDir, tsconfigFiles[idx]);
                fs_1.default.writeFile(toWrite, JSON.stringify(tsconfig, null, '  '), (err) => {
                    if (err) {
                        return sub.error();
                    }
                    log.info(`Write ${toWrite}`);
                    sub.next(toWrite);
                    sub.complete();
                });
            });
        });
        return rxjs_1.merge(...works);
    });
    function createTsconfigs(pkg, fileNames, idx, rootDir, outDir, entries, references) {
        const rootDirValue = path_1.default.relative(tsConfigsDir, path_1.default.resolve(pkg.realPath, rootDir)).replace(/\\/g, '/');
        const configJson = {
            extends: path_1.default.relative(tsConfigsDir, opts.jsx ? baseTsxConfigFile : baseConfigFile).replace(/\\/g, '/'),
            compilerOptions: {
                rootDir: rootDirValue,
                outDir: path_1.default.relative(tsConfigsDir, path_1.default.resolve(pkg.realPath, outDir)).replace(/\\/g, '/'),
                composite: true,
                declaration: true,
                importHelpers: false,
                skipLibCheck: true,
                sourceMap: true,
                inlineSources: true,
                emitDeclarationOnly: opts.ed
            }
        };
        if (entries && entries.length > 0) {
            configJson.files = entries.map(entry => path_1.default.relative(tsConfigsDir, path_1.default.resolve(pkg.realPath, entry))
                .replace(/\\/g, '/'));
        }
        else {
            configJson.include = [rootDirValue + '/**/*.ts'];
            if (opts.jsx) {
                configJson.include.push(rootDirValue + '/**/*.tsx');
            }
        }
        if (references) {
            configJson.references = references.map(refValue => {
                const refFile = tsconfigFileName4Ref(refValue);
                if (refFile == null)
                    throw new Error(`Referenced package ${refValue} does not exist, referenced by ${pkg.name}`);
                return { path: refFile };
            });
        }
        config_handler_1.setTsCompilerOptForNodePath(tsConfigsDir, './', configJson.compilerOptions, {
            enableTypeRoots: true,
            workspaceDir: path_1.default.resolve(config_1.default().rootPath, wsKey)
        });
        if (idx > 1) {
            if (configJson.references == null) {
                configJson.references = [];
            }
            configJson.references.push({ path: fileNames[idx - 1] });
        }
        return configJson;
    }
    function walkReferencedPkg(pkg) {
        walked.add(pkg);
        const rawCfgs = tsc_packages_slice_1.getState().configs.get(pkg);
        if (rawCfgs == null) {
            log.warn(`Reference package "${pkg}" is not linked, skip it`);
            return;
        }
        for (const raw of rawCfgs) {
            if (raw.references && raw.references.length > 0) {
                for (const ref of raw.references) {
                    if (!walked.has(ref)) {
                        walkReferencedPkg(ref);
                    }
                }
            }
        }
    }
    return rxjs_1.merge(...done);
}
exports.generateTsconfigFiles = generateTsconfigFiles;
function tsconfigFileNames(packageName) {
    const configs = tsc_packages_slice_1.getState().configs.get(packageName);
    if (configs == null) {
        return null;
    }
    const name = packageName.replace(/\//g, '-');
    return configs.map((_, index) => name + index + '.json');
}
function tsconfigFileName4Ref(packageName) {
    const configs = tsc_packages_slice_1.getState().configs.get(packageName);
    if (configs == null) {
        return null;
    }
    const name = packageName.replace(/\//g, '-');
    return name + (configs.length - 1) + '.json';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXBhY2thZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHNjLXBhY2thZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztHQUVHO0FBQ0gsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUUzQixvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtCQUF5QztBQUV6QyxzREFBOEI7QUFDOUIscURBQStEO0FBQy9ELCtDQUFvRTtBQUNwRSw2REFBK0Q7QUFDL0QsdUNBQWdEO0FBQ2hELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFrQ2pELFNBQWdCLEdBQUcsQ0FBQyxJQUFpQjtJQUNuQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDaEIsT0FBTztRQUNQLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDL0M7QUFDSCxDQUFDO0FBTEQsa0JBS0M7QUFFRCxTQUFnQixxQkFBcUIsQ0FBQyxJQUFzQixFQUFFLElBQWlCO0lBQzdFLElBQUksS0FBSyxHQUE4QiwwQkFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFFakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7UUFDdEIsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDeEI7SUFFRCxJQUFJLENBQUMsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ25DLEtBQUssR0FBRyxzQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO0lBQ25DLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7S0FDMUQ7SUFFRCxNQUFNLFlBQVksR0FBRyxnQkFB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cmlwdCBcIlByb2plY3QgUmVmZXJlbmNlXCIgJiBcInRzYyAtYiBDb21tYW5kbGluZVwiIGFiaWxpdHkgdG8gY29tcGlsZSBtdWx0aXBsZSBwYWNrYWdlc1xuICovXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBtZXJnZSwgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgQ29tcGlsZXJPcHRpb25zIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCB9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0U3RhdGUsIFBhY2thZ2VJbmZvLCB3b3Jrc3BhY2VLZXkgfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGdldFN0YXRlIGFzIGdldFRzY1N0YXRlIH0gZnJvbSAnLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL2NtZC91dGlscyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmgudHNjLXBhY2thZ2VzJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNjb25maWcge1xuICBleHRlbmRzPzogc3RyaW5nO1xuICBjb21waWxlck9wdGlvbnM6IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc106IGFueX07XG4gIGluY2x1ZGU/OiBzdHJpbmdbXTtcbiAgZXhjbHVkZT86IHN0cmluZ1tdO1xuICBmaWxlcz86IHN0cmluZ1tdO1xuICByZWZlcmVuY2VzPzoge3BhdGg6IHN0cmluZ31bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc106IGFueX07XG59XG5cbi8qKlxuICogQWxsIGRpcmVjdG9yaWVzIGFyZSByZWxhdGl2ZSB0byBwYWNrYWdlIHJlYWwgcGF0aFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uVHNjUHJvcGVydHlJdGVtIHtcbiAgcm9vdERpcjogc3RyaW5nO1xuICBvdXREaXI6IHN0cmluZztcbiAgZmlsZXM/OiBzdHJpbmdbXTtcbiAgLyoqIFwicmVmZXJlbmNlc1wiIGluIHRzY29uZmlnIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL3Byb2plY3QtcmVmZXJlbmNlcy5odG1sICovXG4gIHJlZmVyZW5jZXM/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IHR5cGUgUGFja2FnZUpzb25Uc2NQcm9wZXJ0eSA9IFBhY2thZ2VKc29uVHNjUHJvcGVydHlJdGVtIHwgUGFja2FnZUpzb25Uc2NQcm9wZXJ0eUl0ZW1bXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRzYyhvcHRzOiBUc2NDbWRQYXJhbSkge1xuICBpZiAob3B0cy5wYWNrYWdlKSB7XG4gICAgLy8gVE9ET1xuICAgIGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUc2NvbmZpZ0ZpbGVzKHBrZ3M6IEl0ZXJhYmxlPHN0cmluZz4sIG9wdHM6IFRzY0NtZFBhcmFtKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd2Fsa2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGtncykge1xuICAgIHdhbGtSZWZlcmVuY2VkUGtnKHBrZyk7XG4gIH1cblxuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBzcGFjZScpO1xuICB9XG5cbiAgY29uc3QgdHNDb25maWdzRGlyID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAndHNjb25maWdzJyk7XG4gIGZzZS5ta2RpcnBTeW5jKHRzQ29uZmlnc0Rpcik7XG4gIC8vIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmModHNDb25maWdzRGlyKTtcbiAgLy8gY29uc29sZS5sb2coZmlsZXMpO1xuXG4gIGNvbnN0IGJhc2VDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHN4Q29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0c2NvbmZpZy10c3guanNvbicpO1xuXG4gIGNvbnN0IGRvbmUgPSBBcnJheS5mcm9tKHdhbGtlZC52YWx1ZXMoKSlcbiAgLm1hcChwa2cgPT4ge1xuICAgIGNvbnN0IHJhd0NvbmZpZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBrZyk7XG4gICAgaWYgKHJhd0NvbmZpZ3MgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlICR7cGtnfSBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgY29uc3QgdHNjb25maWdGaWxlcyA9IHRzY29uZmlnRmlsZU5hbWVzKHBrZykhO1xuXG4gICAgY29uc3Qgd29ya3MgPSByYXdDb25maWdzXG4gICAgLm1hcCgocmF3LCBpZHgpID0+IHtcbiAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YiA9PiB7XG4gICAgICAgIGNvbnN0IHRzY29uZmlnID0gY3JlYXRlVHNjb25maWdzKFxuICAgICAgICAgIGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZykhLCB0c2NvbmZpZ0ZpbGVzLCBpZHgsIHJhdy5yb290RGlyLCByYXcub3V0RGlyLCByYXcuZmlsZXMsIHJhdy5yZWZlcmVuY2VzKTtcbiAgICAgICAgY29uc3QgdG9Xcml0ZSA9IFBhdGgucmVzb2x2ZSh0c0NvbmZpZ3NEaXIsIHRzY29uZmlnRmlsZXNbaWR4XSk7XG4gICAgICAgIGZzLndyaXRlRmlsZSh0b1dyaXRlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZywgbnVsbCwgJyAgJyksIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gc3ViLmVycm9yKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxvZy5pbmZvKGBXcml0ZSAke3RvV3JpdGV9YCk7XG4gICAgICAgICAgc3ViLm5leHQodG9Xcml0ZSk7XG4gICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lcmdlKC4uLndvcmtzKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlVHNjb25maWdzKHBrZzogUGFja2FnZUluZm8sIGZpbGVOYW1lczogc3RyaW5nW10sIGlkeDogbnVtYmVyLCByb290RGlyOiBzdHJpbmcsIG91dERpcjogc3RyaW5nLFxuICAgIGVudHJpZXM/OiBzdHJpbmdbXSwgcmVmZXJlbmNlcz86IHN0cmluZ1tdKSB7XG4gICAgY29uc3Qgcm9vdERpclZhbHVlID0gUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ3NEaXIsIFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHJvb3REaXIpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgY29uc3QgY29uZmlnSnNvbjogVHNjb25maWcgPSB7XG4gICAgICBleHRlbmRzOiBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnc0Rpciwgb3B0cy5qc3ggPyBiYXNlVHN4Q29uZmlnRmlsZSA6IGJhc2VDb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgICAgcm9vdERpcjogcm9vdERpclZhbHVlLFxuICAgICAgICBvdXREaXI6IFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBvdXREaXIpKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgIGNvbXBvc2l0ZTogdHJ1ZSwgLy8gcmVxdWlyZWQgYnkgUHJvamVjdCBSZWZlcmVuY2VcbiAgICAgICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgICAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgaW5saW5lU291cmNlczogdHJ1ZSxcbiAgICAgICAgZW1pdERlY2xhcmF0aW9uT25seTogb3B0cy5lZFxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoZW50cmllcyAmJiBlbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbmZpZ0pzb24uZmlsZXMgPSBlbnRyaWVzLm1hcChlbnRyeSA9PlxuICAgICAgICAgIFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBlbnRyeSkpXG4gICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWdKc29uLmluY2x1ZGUgPSBbcm9vdERpclZhbHVlICsgJy8qKi8qLnRzJ107XG4gICAgICBpZiAob3B0cy5qc3gpIHtcbiAgICAgICAgY29uZmlnSnNvbi5pbmNsdWRlIS5wdXNoKHJvb3REaXJWYWx1ZSArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlcykge1xuICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcy5tYXAocmVmVmFsdWUgPT4ge1xuICAgICAgICBjb25zdCByZWZGaWxlID0gdHNjb25maWdGaWxlTmFtZTRSZWYocmVmVmFsdWUpO1xuXG4gICAgICAgIGlmIChyZWZGaWxlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZlcmVuY2VkIHBhY2thZ2UgJHtyZWZWYWx1ZX0gZG9lcyBub3QgZXhpc3QsIHJlZmVyZW5jZWQgYnkgJHtwa2cubmFtZX1gKTtcblxuICAgICAgICByZXR1cm4ge3BhdGg6IHJlZkZpbGV9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzQ29uZmlnc0RpciwgJy4vJywgY29uZmlnSnNvbi5jb21waWxlck9wdGlvbnMsIHtcbiAgICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAgIHdvcmtzcGFjZURpcjogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCB3c0tleSEpXG4gICAgfSk7XG5cbiAgICBpZiAoaWR4ID4gMSkge1xuICAgICAgaWYgKGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9PSBudWxsKSB7XG4gICAgICAgIGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9IFtdO1xuICAgICAgfVxuICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzLnB1c2goe3BhdGg6IGZpbGVOYW1lc1tpZHggLSAxXX0pO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlnSnNvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhbGtSZWZlcmVuY2VkUGtnKHBrZzogc3RyaW5nKSB7XG4gICAgd2Fsa2VkLmFkZChwa2cpO1xuICAgIGNvbnN0IHJhd0NmZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBrZyk7XG4gICAgaWYgKHJhd0NmZ3MgPT0gbnVsbCkge1xuICAgICAgbG9nLndhcm4oYFJlZmVyZW5jZSBwYWNrYWdlIFwiJHtwa2d9XCIgaXMgbm90IGxpbmtlZCwgc2tpcCBpdGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJhdyBvZiByYXdDZmdzKSB7XG4gICAgICBpZiAocmF3LnJlZmVyZW5jZXMgJiYgcmF3LnJlZmVyZW5jZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlZiBvZiByYXcucmVmZXJlbmNlcykge1xuICAgICAgICAgIGlmICghd2Fsa2VkLmhhcyhyZWYpKSB7XG4gICAgICAgICAgICB3YWxrUmVmZXJlbmNlZFBrZyhyZWYpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXJnZSguLi5kb25lKTtcbn1cblxuZnVuY3Rpb24gdHNjb25maWdGaWxlTmFtZXMocGFja2FnZU5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHwgbnVsbCB7XG4gIGNvbnN0IGNvbmZpZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgaWYgKGNvbmZpZ3MgPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBwYWNrYWdlTmFtZS5yZXBsYWNlKC9cXC8vZywgJy0nKTtcbiAgcmV0dXJuIGNvbmZpZ3MubWFwKChfLCBpbmRleCkgPT4gbmFtZSArIGluZGV4ICsgJy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIHRzY29uZmlnRmlsZU5hbWU0UmVmKHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgY29uZmlncyA9IGdldFRzY1N0YXRlKCkuY29uZmlncy5nZXQocGFja2FnZU5hbWUpO1xuICBpZiAoY29uZmlncyA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcLy9nLCAnLScpO1xuICByZXR1cm4gbmFtZSArIChjb25maWdzLmxlbmd0aCAtIDEpICsgJy5qc29uJztcbn1cblxuIl19