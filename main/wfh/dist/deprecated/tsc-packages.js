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
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const package_mgr_1 = require("../package-mgr");
const tsc_packages_slice_1 = require("./tsc-packages-slice");
const utils_1 = require("../cmd/utils");
const package_list_helper_2 = require("../package-mgr/package-list-helper");
const child_process_1 = require("child_process");
const misc_1 = require("../utils/misc");
const log = log4js_1.default.getLogger('plink.tsc-packages');
function tsc(opts) {
    if (opts.package) {
        const pkgs = (0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), opts.package);
        const tsconfigFile$ = generateTsconfigFiles(Array.from(pkgs).filter(pkg => pkg != null)
            .map(pkg => pkg.name), opts);
        return tsconfigFile$.pipe((0, operators_1.reduce)((all, tsconfigFile) => {
            all.push(tsconfigFile);
            return all;
        }, []), (0, operators_1.filter)(files => files.length > 0), (0, operators_1.concatMap)(files => {
            const env = process.env;
            delete env.NODE_OPTIONS;
            const arg = ['-b', ...files, '-v'];
            if (opts.watch)
                arg.push('-w');
            log.info('tsc ' + arg.join(' '));
            const cp = (0, child_process_1.fork)(require.resolve('typescript/lib/tsc.js'), arg, { env });
            return new rxjs_1.Observable(sub => {
                cp.on('exit', (code, signal) => {
                    log.info(code + ' ' + signal);
                    sub.next();
                    sub.complete();
                });
                cp.on('error', err => sub.error(err));
            });
        }));
    }
    else if (opts.project) {
        (0, package_list_helper_2.allPackages)('*', 'src', opts.project);
    }
    return rxjs_1.EMPTY;
}
exports.tsc = tsc;
function generateTsconfigFiles(pkgs, opts) {
    let wsKey = (0, package_mgr_1.workspaceKey)(misc_1.plinkEnv.workDir);
    const walked = new Set();
    for (const pkg of pkgs) {
        walkReferencedPkg(pkg);
    }
    if (!(0, package_mgr_1.getState)().workspaces.has(wsKey))
        wsKey = (0, package_mgr_1.getState)().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a work space');
    }
    const tsConfigsDir = config_1.default.resolve('destDir', 'tsconfigs');
    fs_extra_1.default.mkdirpSync(tsConfigsDir);
    // const files = fs.readdirSync(tsConfigsDir);
    // console.log(files);
    const baseConfigFile = path_1.default.resolve(__dirname, '..', '..', 'tsconfig-base.json');
    const baseTsxConfigFile = path_1.default.resolve(__dirname, '..', '..', 'tsconfig-tsx.json');
    const done = Array.from(walked.values())
        .map(pkg => {
        const rawConfigs = (0, tsc_packages_slice_1.getState)().configs.get(pkg);
        if (rawConfigs == null) {
            throw new Error(`Package ${pkg} does not exist.`);
        }
        const tsconfigFiles = tsconfigFileNames(pkg);
        const works = rawConfigs
            .map((raw, idx) => {
            return new rxjs_1.Observable(sub => {
                const tsconfig = createTsconfigs((0, package_mgr_1.getState)().srcPackages.get(pkg), tsconfigFiles, idx, raw.rootDir, raw.outDir, raw.files, raw.references);
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
        return (0, rxjs_1.merge)(...works);
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
                inlineSourceMap: false,
                emitDeclarationOnly: opts.ed
            },
            exclude: []
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
        (0, package_list_helper_1.setTsCompilerOptForNodePath)(tsConfigsDir, './', configJson.compilerOptions, {
            enableTypeRoots: true,
            workspaceDir: path_1.default.resolve((0, config_1.default)().rootPath, wsKey)
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
        const rawCfgs = (0, tsc_packages_slice_1.getState)().configs.get(pkg);
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
    return (0, rxjs_1.merge)(...done);
}
exports.generateTsconfigFiles = generateTsconfigFiles;
function tsconfigFileNames(packageName) {
    const configs = (0, tsc_packages_slice_1.getState)().configs.get(packageName);
    if (configs == null) {
        return null;
    }
    const name = packageName.replace(/\//g, '-');
    return configs.map((_, index) => name + index + '.json');
}
function tsconfigFileName4Ref(packageName) {
    const configs = (0, tsc_packages_slice_1.getState)().configs.get(packageName);
    if (configs == null) {
        return null;
    }
    const name = packageName.replace(/\//g, '-');
    return name + (configs.length - 1) + '.json';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXBhY2thZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvZGVwcmVjYXRlZC90c2MtcGFja2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7O0dBRUc7QUFDSCw0Q0FBb0I7QUFDcEIsd0RBQTJCO0FBRTNCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsK0JBQWdEO0FBQ2hELDhDQUF5RDtBQUV6RCx1REFBK0I7QUFDL0IsNEVBQWlGO0FBQ2pGLGdEQUFxRTtBQUNyRSw2REFBK0Q7QUFDL0Qsd0NBQWlEO0FBQ2pELDRFQUErRDtBQUMvRCxpREFBbUM7QUFDbkMsd0NBQXVDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFrQ25ELFNBQWdCLEdBQUcsQ0FBQyxJQUFpQjtJQUNuQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDaEIsTUFBTSxJQUFJLEdBQUcsSUFBQSwyQkFBbUIsRUFBQyxJQUFBLHNCQUFRLEdBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0QsTUFBTSxhQUFhLEdBQUcscUJBQXFCLENBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQzthQUMxQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEMsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUN2QixJQUFBLGtCQUFNLEVBQVMsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLEVBQUU7WUFDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN2QixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDTixJQUFBLGtC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QTdIRCxzREE2SEM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFdBQW1CO0lBQzVDLE1BQU0sT0FBTyxHQUFHLElBQUEsNkJBQVcsR0FBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkQsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1FBQ25CLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLFdBQW1CO0lBQy9DLE1BQU0sT0FBTyxHQUFHLElBQUEsNkJBQVcsR0FBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkQsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1FBQ25CLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxPQUFPLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQy9DLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVzZSBUeXBlc2NyaXB0IFwiUHJvamVjdCBSZWZlcmVuY2VcIiAmIFwidHNjIC1iIENvbW1hbmRsaW5lXCIgYWJpbGl0eSB0byBjb21waWxlIG11bHRpcGxlIHBhY2thZ2VzXG4gKi9cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IG1lcmdlLCBPYnNlcnZhYmxlLCBFTVBUWSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtyZWR1Y2UsIGNvbmNhdE1hcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBDb21waWxlck9wdGlvbnMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCB9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHsgZ2V0U3RhdGUsIFBhY2thZ2VJbmZvLCB3b3Jrc3BhY2VLZXkgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBnZXRTdGF0ZSBhcyBnZXRUc2NTdGF0ZSB9IGZyb20gJy4vdHNjLXBhY2thZ2VzLXNsaWNlJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi4vY21kL3V0aWxzJztcbmltcG9ydCB7YWxsUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsudHNjLXBhY2thZ2VzJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNjb25maWcge1xuICBleHRlbmRzPzogc3RyaW5nO1xuICBjb21waWxlck9wdGlvbnM6IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc106IGFueX07XG4gIGluY2x1ZGU/OiBzdHJpbmdbXTtcbiAgZXhjbHVkZT86IHN0cmluZ1tdO1xuICBmaWxlcz86IHN0cmluZ1tdO1xuICByZWZlcmVuY2VzPzoge3BhdGg6IHN0cmluZ31bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUc2NDbWRQYXJhbSB7XG4gIHBhY2thZ2U/OiBzdHJpbmdbXTtcbiAgcHJvamVjdD86IHN0cmluZ1tdO1xuICB3YXRjaD86IGJvb2xlYW47XG4gIHNvdXJjZU1hcD86IHN0cmluZztcbiAganN4PzogYm9vbGVhbjtcbiAgZWQ/OiBib29sZWFuO1xuICBjb21waWxlT3B0aW9ucz86IHtba2V5IGluIGtleW9mIENvbXBpbGVyT3B0aW9uc106IGFueX07XG59XG5cbi8qKlxuICogQWxsIGRpcmVjdG9yaWVzIGFyZSByZWxhdGl2ZSB0byBwYWNrYWdlIHJlYWwgcGF0aFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uVHNjUHJvcGVydHlJdGVtIHtcbiAgcm9vdERpcjogc3RyaW5nO1xuICBvdXREaXI6IHN0cmluZztcbiAgZmlsZXM/OiBzdHJpbmdbXTtcbiAgLyoqIFwicmVmZXJlbmNlc1wiIGluIHRzY29uZmlnIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL3Byb2plY3QtcmVmZXJlbmNlcy5odG1sICovXG4gIHJlZmVyZW5jZXM/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IHR5cGUgUGFja2FnZUpzb25Uc2NQcm9wZXJ0eSA9IFBhY2thZ2VKc29uVHNjUHJvcGVydHlJdGVtIHwgUGFja2FnZUpzb25Uc2NQcm9wZXJ0eUl0ZW1bXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRzYyhvcHRzOiBUc2NDbWRQYXJhbSkge1xuICBpZiAob3B0cy5wYWNrYWdlKSB7XG4gICAgY29uc3QgcGtncyA9IGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgb3B0cy5wYWNrYWdlKTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUkID0gZ2VuZXJhdGVUc2NvbmZpZ0ZpbGVzKFxuICAgICAgQXJyYXkuZnJvbShwa2dzKS5maWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKVxuICAgICAgLm1hcChwa2cgPT4gcGtnIS5uYW1lKSwgb3B0cyk7XG4gICAgcmV0dXJuIHRzY29uZmlnRmlsZSQucGlwZShcbiAgICAgIHJlZHVjZTxzdHJpbmc+KChhbGwsIHRzY29uZmlnRmlsZSkgPT4ge1xuICAgICAgICBhbGwucHVzaCh0c2NvbmZpZ0ZpbGUpO1xuICAgICAgICByZXR1cm4gYWxsO1xuICAgICAgfSwgW10pLFxuICAgICAgZmlsdGVyKGZpbGVzID0+IGZpbGVzLmxlbmd0aCA+IDApLFxuICAgICAgY29uY2F0TWFwKGZpbGVzID0+IHtcbiAgICAgICAgY29uc3QgZW52ID0gcHJvY2Vzcy5lbnY7XG4gICAgICAgIGRlbGV0ZSBlbnYuTk9ERV9PUFRJT05TO1xuXG4gICAgICAgIGNvbnN0IGFyZyA9IFsnLWInLCAuLi5maWxlcywgJy12J107XG4gICAgICAgIGlmIChvcHRzLndhdGNoKVxuICAgICAgICAgIGFyZy5wdXNoKCctdycpO1xuXG4gICAgICAgIGxvZy5pbmZvKCd0c2MgJyArIGFyZy5qb2luKCcgJykpO1xuICAgICAgICBjb25zdCBjcCA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0L2xpYi90c2MuanMnKSwgYXJnLCB7ZW52fSk7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShzdWIgPT4ge1xuICAgICAgICAgIGNwLm9uKCdleGl0JywgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICAgICAgbG9nLmluZm8oY29kZSArICcgJyArIHNpZ25hbCk7XG4gICAgICAgICAgICBzdWIubmV4dCgpO1xuICAgICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHN1Yi5lcnJvcihlcnIpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICk7XG4gIH0gZWxzZSBpZiAob3B0cy5wcm9qZWN0KSB7XG4gICAgYWxsUGFja2FnZXMoJyonLCAnc3JjJywgb3B0cy5wcm9qZWN0KTtcbiAgfVxuICByZXR1cm4gRU1QVFk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVRzY29uZmlnRmlsZXMocGtnczogSXRlcmFibGU8c3RyaW5nPiwgb3B0czogVHNjQ21kUGFyYW0pIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBjb25zdCB3YWxrZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBwa2dzKSB7XG4gICAgd2Fsa1JlZmVyZW5jZWRQa2cocGtnKTtcbiAgfVxuXG4gIGlmICghZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpXG4gICAgd3NLZXkgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIHNwYWNlJyk7XG4gIH1cblxuICBjb25zdCB0c0NvbmZpZ3NEaXIgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICd0c2NvbmZpZ3MnKTtcbiAgZnNlLm1rZGlycFN5bmModHNDb25maWdzRGlyKTtcbiAgLy8gY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyh0c0NvbmZpZ3NEaXIpO1xuICAvLyBjb25zb2xlLmxvZyhmaWxlcyk7XG5cbiAgY29uc3QgYmFzZUNvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAndHNjb25maWctYmFzZS5qc29uJyk7XG4gIGNvbnN0IGJhc2VUc3hDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3RzY29uZmlnLXRzeC5qc29uJyk7XG5cbiAgY29uc3QgZG9uZSA9IEFycmF5LmZyb20od2Fsa2VkLnZhbHVlcygpKVxuICAubWFwKHBrZyA9PiB7XG4gICAgY29uc3QgcmF3Q29uZmlncyA9IGdldFRzY1N0YXRlKCkuY29uZmlncy5nZXQocGtnKTtcbiAgICBpZiAocmF3Q29uZmlncyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhY2thZ2UgJHtwa2d9IGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGVzID0gdHNjb25maWdGaWxlTmFtZXMocGtnKSE7XG5cbiAgICBjb25zdCB3b3JrcyA9IHJhd0NvbmZpZ3NcbiAgICAubWFwKChyYXcsIGlkeCkgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3ViID0+IHtcbiAgICAgICAgY29uc3QgdHNjb25maWcgPSBjcmVhdGVUc2NvbmZpZ3MoXG4gICAgICAgICAgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnKSEsIHRzY29uZmlnRmlsZXMsIGlkeCwgcmF3LnJvb3REaXIsIHJhdy5vdXREaXIsIHJhdy5maWxlcywgcmF3LnJlZmVyZW5jZXMpO1xuICAgICAgICBjb25zdCB0b1dyaXRlID0gUGF0aC5yZXNvbHZlKHRzQ29uZmlnc0RpciwgdHNjb25maWdGaWxlc1tpZHhdKTtcbiAgICAgICAgZnMud3JpdGVGaWxlKHRvV3JpdGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnLCBudWxsLCAnICAnKSwgKGVycikgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBzdWIuZXJyb3IoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbG9nLmluZm8oYFdyaXRlICR7dG9Xcml0ZX1gKTtcbiAgICAgICAgICBzdWIubmV4dCh0b1dyaXRlKTtcbiAgICAgICAgICBzdWIuY29tcGxldGUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWVyZ2UoLi4ud29ya3MpO1xuICB9KTtcblxuICBmdW5jdGlvbiBjcmVhdGVUc2NvbmZpZ3MocGtnOiBQYWNrYWdlSW5mbywgZmlsZU5hbWVzOiBzdHJpbmdbXSwgaWR4OiBudW1iZXIsIHJvb3REaXI6IHN0cmluZywgb3V0RGlyOiBzdHJpbmcsXG4gICAgZW50cmllcz86IHN0cmluZ1tdLCByZWZlcmVuY2VzPzogc3RyaW5nW10pIHtcbiAgICBjb25zdCByb290RGlyVmFsdWUgPSBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnc0RpciwgUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgcm9vdERpcikpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBjb25zdCBjb25maWdKc29uOiBUc2NvbmZpZyA9IHtcbiAgICAgIGV4dGVuZHM6IFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBvcHRzLmpzeCA/IGJhc2VUc3hDb25maWdGaWxlIDogYmFzZUNvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgICByb290RGlyOiByb290RGlyVmFsdWUsXG4gICAgICAgIG91dERpcjogUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ3NEaXIsIFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIG91dERpcikpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgICAgY29tcG9zaXRlOiB0cnVlLCAvLyByZXF1aXJlZCBieSBQcm9qZWN0IFJlZmVyZW5jZVxuICAgICAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbiAgICAgICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICBpbmxpbmVTb3VyY2VzOiB0cnVlLFxuICAgICAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICBlbWl0RGVjbGFyYXRpb25Pbmx5OiBvcHRzLmVkXG4gICAgICB9LFxuICAgICAgZXhjbHVkZTogW11cbiAgICB9O1xuXG4gICAgaWYgKGVudHJpZXMgJiYgZW50cmllcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25maWdKc29uLmZpbGVzID0gZW50cmllcy5tYXAoZW50cnkgPT5cbiAgICAgICAgICBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnc0RpciwgUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgZW50cnkpKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uZmlnSnNvbi5pbmNsdWRlID0gW3Jvb3REaXJWYWx1ZSArICcvKiovKi50cyddO1xuICAgICAgaWYgKG9wdHMuanN4KSB7XG4gICAgICAgIGNvbmZpZ0pzb24uaW5jbHVkZSEucHVzaChyb290RGlyVmFsdWUgKyAnLyoqLyoudHN4Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJlZmVyZW5jZXMpIHtcbiAgICAgIGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9IHJlZmVyZW5jZXMubWFwKHJlZlZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgcmVmRmlsZSA9IHRzY29uZmlnRmlsZU5hbWU0UmVmKHJlZlZhbHVlKTtcblxuICAgICAgICBpZiAocmVmRmlsZSA9PSBudWxsKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVmZXJlbmNlZCBwYWNrYWdlICR7cmVmVmFsdWV9IGRvZXMgbm90IGV4aXN0LCByZWZlcmVuY2VkIGJ5ICR7cGtnLm5hbWV9YCk7XG5cbiAgICAgICAgcmV0dXJuIHtwYXRoOiByZWZGaWxlfTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCh0c0NvbmZpZ3NEaXIsICcuLycsIGNvbmZpZ0pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgICB3b3Jrc3BhY2VEaXI6IFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgd3NLZXkhKVxuICAgIH0pO1xuXG4gICAgaWYgKGlkeCA+IDEpIHtcbiAgICAgIGlmIChjb25maWdKc29uLnJlZmVyZW5jZXMgPT0gbnVsbCkge1xuICAgICAgICBjb25maWdKc29uLnJlZmVyZW5jZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGNvbmZpZ0pzb24ucmVmZXJlbmNlcy5wdXNoKHtwYXRoOiBmaWxlTmFtZXNbaWR4IC0gMV19KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZ0pzb247XG4gIH1cblxuICBmdW5jdGlvbiB3YWxrUmVmZXJlbmNlZFBrZyhwa2c6IHN0cmluZykge1xuICAgIHdhbGtlZC5hZGQocGtnKTtcbiAgICBjb25zdCByYXdDZmdzID0gZ2V0VHNjU3RhdGUoKS5jb25maWdzLmdldChwa2cpO1xuICAgIGlmIChyYXdDZmdzID09IG51bGwpIHtcbiAgICAgIGxvZy53YXJuKGBSZWZlcmVuY2UgcGFja2FnZSBcIiR7cGtnfVwiIGlzIG5vdCBsaW5rZWQsIHNraXAgaXRgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCByYXcgb2YgcmF3Q2Zncykge1xuICAgICAgaWYgKHJhdy5yZWZlcmVuY2VzICYmIHJhdy5yZWZlcmVuY2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yIChjb25zdCByZWYgb2YgcmF3LnJlZmVyZW5jZXMpIHtcbiAgICAgICAgICBpZiAoIXdhbGtlZC5oYXMocmVmKSkge1xuICAgICAgICAgICAgd2Fsa1JlZmVyZW5jZWRQa2cocmVmKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWVyZ2UoLi4uZG9uZSk7XG59XG5cbmZ1bmN0aW9uIHRzY29uZmlnRmlsZU5hbWVzKHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB8IG51bGwge1xuICBjb25zdCBjb25maWdzID0gZ2V0VHNjU3RhdGUoKS5jb25maWdzLmdldChwYWNrYWdlTmFtZSk7XG4gIGlmIChjb25maWdzID09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBuYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZSgvXFwvL2csICctJyk7XG4gIHJldHVybiBjb25maWdzLm1hcCgoXywgaW5kZXgpID0+IG5hbWUgKyBpbmRleCArICcuanNvbicpO1xufVxuXG5mdW5jdGlvbiB0c2NvbmZpZ0ZpbGVOYW1lNFJlZihwYWNrYWdlTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGNvbmZpZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgaWYgKGNvbmZpZ3MgPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBwYWNrYWdlTmFtZS5yZXBsYWNlKC9cXC8vZywgJy0nKTtcbiAgcmV0dXJuIG5hbWUgKyAoY29uZmlncy5sZW5ndGggLSAxKSArICcuanNvbic7XG59XG5cbiJdfQ==