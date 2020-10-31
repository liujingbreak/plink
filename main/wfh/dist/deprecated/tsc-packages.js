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
const config_handler_1 = require("../config-handler");
const package_mgr_1 = require("../package-mgr");
const tsc_packages_slice_1 = require("./tsc-packages-slice");
const utils_1 = require("../cmd/utils");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const child_process_1 = require("child_process");
const log = log4js_1.default.getLogger('wfh.tsc-packages');
function tsc(opts) {
    if (opts.package) {
        const pkgs = utils_1.findPackagesByNames(package_mgr_1.getState(), opts.package);
        const tsconfigFile$ = generateTsconfigFiles(Array.from(pkgs).filter(pkg => pkg != null)
            .map(pkg => pkg.name), opts);
        return tsconfigFile$.pipe(operators_1.reduce((all, tsconfigFile) => {
            all.push(tsconfigFile);
            return all;
        }, []), operators_1.filter(files => files.length > 0), operators_1.concatMap(files => {
            const env = process.env;
            delete env.NODE_OPTIONS;
            const arg = ['-b', ...files, '-v'];
            if (opts.watch)
                arg.push('-w');
            log.info('tsc ' + arg.join(' '));
            const cp = child_process_1.fork(require.resolve('typescript/lib/tsc.js'), arg, { env });
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
        package_list_helper_1.allPackages('*', 'src', opts.project);
    }
    return rxjs_1.EMPTY;
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
    const baseConfigFile = path_1.default.resolve(__dirname, '..', '..', 'tsconfig-base.json');
    const baseTsxConfigFile = path_1.default.resolve(__dirname, '..', '..', 'tsconfig-tsx.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXBhY2thZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvZGVwcmVjYXRlZC90c2MtcGFja2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7O0dBRUc7QUFDSCw0Q0FBb0I7QUFDcEIsd0RBQTJCO0FBRTNCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsK0JBQWdEO0FBQ2hELDhDQUF5RDtBQUV6RCx1REFBK0I7QUFDL0Isc0RBQWdFO0FBQ2hFLGdEQUFxRTtBQUNyRSw2REFBK0Q7QUFDL0Qsd0NBQWlEO0FBQ2pELDRFQUErRDtBQUMvRCxpREFBbUM7QUFDbkMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQWtDakQsU0FBZ0IsR0FBRyxDQUFDLElBQWlCO0lBQ25DLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNoQixNQUFNLElBQUksR0FBRywyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLHFCQUFxQixDQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUM7YUFDMUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FDdkIsa0JBQU0sQ0FBUyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsRUFBRTtZQUNuQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3ZCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNOLGtCQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFL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QUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtRQUNuQixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0MsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxXQUFtQjtJQUMvQyxNQUFNLE9BQU8sR0FBRyw2QkFBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2RCxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7UUFDbkIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUNELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdDLE9BQU8sSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7QUFDL0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlIFR5cGVzY3JpcHQgXCJQcm9qZWN0IFJlZmVyZW5jZVwiICYgXCJ0c2MgLWIgQ29tbWFuZGxpbmVcIiBhYmlsaXR5IHRvIGNvbXBpbGUgbXVsdGlwbGUgcGFja2FnZXNcbiAqL1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgbWVyZ2UsIE9ic2VydmFibGUsIEVNUFRZIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3JlZHVjZSwgY29uY2F0TWFwLCBmaWx0ZXJ9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IENvbXBpbGVyT3B0aW9ucyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoIH0gZnJvbSAnLi4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0U3RhdGUsIFBhY2thZ2VJbmZvLCB3b3Jrc3BhY2VLZXkgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBnZXRTdGF0ZSBhcyBnZXRUc2NTdGF0ZSB9IGZyb20gJy4vdHNjLXBhY2thZ2VzLXNsaWNlJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi4vY21kL3V0aWxzJztcbmltcG9ydCB7YWxsUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC50c2MtcGFja2FnZXMnKTtcblxuZXhwb3J0IGludGVyZmFjZSBUc2NvbmZpZyB7XG4gIGV4dGVuZHM/OiBzdHJpbmc7XG4gIGNvbXBpbGVyT3B0aW9uczoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXTogYW55fTtcbiAgaW5jbHVkZT86IHN0cmluZ1tdO1xuICBleGNsdWRlPzogc3RyaW5nW107XG4gIGZpbGVzPzogc3RyaW5nW107XG4gIHJlZmVyZW5jZXM/OiB7cGF0aDogc3RyaW5nfVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXTogYW55fTtcbn1cblxuLyoqXG4gKiBBbGwgZGlyZWN0b3JpZXMgYXJlIHJlbGF0aXZlIHRvIHBhY2thZ2UgcmVhbCBwYXRoXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25Uc2NQcm9wZXJ0eUl0ZW0ge1xuICByb290RGlyOiBzdHJpbmc7XG4gIG91dERpcjogc3RyaW5nO1xuICBmaWxlcz86IHN0cmluZ1tdO1xuICAvKiogXCJyZWZlcmVuY2VzXCIgaW4gdHNjb25maWcgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcHJvamVjdC1yZWZlcmVuY2VzLmh0bWwgKi9cbiAgcmVmZXJlbmNlcz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlSnNvblRzY1Byb3BlcnR5ID0gUGFja2FnZUpzb25Uc2NQcm9wZXJ0eUl0ZW0gfCBQYWNrYWdlSnNvblRzY1Byb3BlcnR5SXRlbVtdO1xuXG5leHBvcnQgZnVuY3Rpb24gdHNjKG9wdHM6IFRzY0NtZFBhcmFtKSB7XG4gIGlmIChvcHRzLnBhY2thZ2UpIHtcbiAgICBjb25zdCBwa2dzID0gZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2UpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSQgPSBnZW5lcmF0ZVRzY29uZmlnRmlsZXMoXG4gICAgICBBcnJheS5mcm9tKHBrZ3MpLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpXG4gICAgICAubWFwKHBrZyA9PiBwa2chLm5hbWUpLCBvcHRzKTtcbiAgICByZXR1cm4gdHNjb25maWdGaWxlJC5waXBlKFxuICAgICAgcmVkdWNlPHN0cmluZz4oKGFsbCwgdHNjb25maWdGaWxlKSA9PiB7XG4gICAgICAgIGFsbC5wdXNoKHRzY29uZmlnRmlsZSk7XG4gICAgICAgIHJldHVybiBhbGw7XG4gICAgICB9LCBbXSksXG4gICAgICBmaWx0ZXIoZmlsZXMgPT4gZmlsZXMubGVuZ3RoID4gMCksXG4gICAgICBjb25jYXRNYXAoZmlsZXMgPT4ge1xuICAgICAgICBjb25zdCBlbnYgPSBwcm9jZXNzLmVudjtcbiAgICAgICAgZGVsZXRlIGVudi5OT0RFX09QVElPTlM7XG5cbiAgICAgICAgY29uc3QgYXJnID0gWyctYicsIC4uLmZpbGVzLCAnLXYnXTtcbiAgICAgICAgaWYgKG9wdHMud2F0Y2gpXG4gICAgICAgICAgYXJnLnB1c2goJy13Jyk7XG5cbiAgICAgICAgbG9nLmluZm8oJ3RzYyAnICsgYXJnLmpvaW4oJyAnKSk7XG4gICAgICAgIGNvbnN0IGNwID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJ3R5cGVzY3JpcHQvbGliL3RzYy5qcycpLCBhcmcsIHtlbnZ9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKHN1YiA9PiB7XG4gICAgICAgICAgY3Aub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICAgICAgICBsb2cuaW5mbyhjb2RlICsgJyAnICsgc2lnbmFsKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KCk7XG4gICAgICAgICAgICBzdWIuY29tcGxldGUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjcC5vbignZXJyb3InLCBlcnIgPT4gc3ViLmVycm9yKGVycikpO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfSBlbHNlIGlmIChvcHRzLnByb2plY3QpIHtcbiAgICBhbGxQYWNrYWdlcygnKicsICdzcmMnLCBvcHRzLnByb2plY3QpO1xuICB9XG4gIHJldHVybiBFTVBUWTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHNjb25maWdGaWxlcyhwa2dzOiBJdGVyYWJsZTxzdHJpbmc+LCBvcHRzOiBUc2NDbWRQYXJhbSkge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIGNvbnN0IHdhbGtlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIHBrZ3MpIHtcbiAgICB3YWxrUmVmZXJlbmNlZFBrZyhwa2cpO1xuICB9XG5cbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IHRzQ29uZmlnc0RpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3RzY29uZmlncycpO1xuICBmc2UubWtkaXJwU3luYyh0c0NvbmZpZ3NEaXIpO1xuICAvLyBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRzQ29uZmlnc0Rpcik7XG4gIC8vIGNvbnNvbGUubG9nKGZpbGVzKTtcblxuICBjb25zdCBiYXNlQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicsICd0c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgY29uc3QgYmFzZVRzeENvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAndHNjb25maWctdHN4Lmpzb24nKTtcblxuICBjb25zdCBkb25lID0gQXJyYXkuZnJvbSh3YWxrZWQudmFsdWVzKCkpXG4gIC5tYXAocGtnID0+IHtcbiAgICBjb25zdCByYXdDb25maWdzID0gZ2V0VHNjU3RhdGUoKS5jb25maWdzLmdldChwa2cpO1xuICAgIGlmIChyYXdDb25maWdzID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUGFja2FnZSAke3BrZ30gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfVxuICAgIGNvbnN0IHRzY29uZmlnRmlsZXMgPSB0c2NvbmZpZ0ZpbGVOYW1lcyhwa2cpITtcblxuICAgIGNvbnN0IHdvcmtzID0gcmF3Q29uZmlnc1xuICAgIC5tYXAoKHJhdywgaWR4KSA9PiB7XG4gICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWIgPT4ge1xuICAgICAgICBjb25zdCB0c2NvbmZpZyA9IGNyZWF0ZVRzY29uZmlncyhcbiAgICAgICAgICBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2cpISwgdHNjb25maWdGaWxlcywgaWR4LCByYXcucm9vdERpciwgcmF3Lm91dERpciwgcmF3LmZpbGVzLCByYXcucmVmZXJlbmNlcyk7XG4gICAgICAgIGNvbnN0IHRvV3JpdGUgPSBQYXRoLnJlc29sdmUodHNDb25maWdzRGlyLCB0c2NvbmZpZ0ZpbGVzW2lkeF0pO1xuICAgICAgICBmcy53cml0ZUZpbGUodG9Xcml0ZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWcsIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHN1Yi5lcnJvcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsb2cuaW5mbyhgV3JpdGUgJHt0b1dyaXRlfWApO1xuICAgICAgICAgIHN1Yi5uZXh0KHRvV3JpdGUpO1xuICAgICAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBtZXJnZSguLi53b3Jrcyk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRzY29uZmlncyhwa2c6IFBhY2thZ2VJbmZvLCBmaWxlTmFtZXM6IHN0cmluZ1tdLCBpZHg6IG51bWJlciwgcm9vdERpcjogc3RyaW5nLCBvdXREaXI6IHN0cmluZyxcbiAgICBlbnRyaWVzPzogc3RyaW5nW10sIHJlZmVyZW5jZXM/OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHJvb3REaXJWYWx1ZSA9IFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCByb290RGlyKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGNvbnN0IGNvbmZpZ0pzb246IFRzY29uZmlnID0ge1xuICAgICAgZXh0ZW5kczogUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ3NEaXIsIG9wdHMuanN4ID8gYmFzZVRzeENvbmZpZ0ZpbGUgOiBiYXNlQ29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAgIHJvb3REaXI6IHJvb3REaXJWYWx1ZSxcbiAgICAgICAgb3V0RGlyOiBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnc0RpciwgUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgb3V0RGlyKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICBjb21wb3NpdGU6IHRydWUsIC8vIHJlcXVpcmVkIGJ5IFByb2plY3QgUmVmZXJlbmNlXG4gICAgICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgICAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICAgICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4gICAgICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IG9wdHMuZWRcbiAgICAgIH0sXG4gICAgICBleGNsdWRlOiBbXVxuICAgIH07XG5cbiAgICBpZiAoZW50cmllcyAmJiBlbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbmZpZ0pzb24uZmlsZXMgPSBlbnRyaWVzLm1hcChlbnRyeSA9PlxuICAgICAgICAgIFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBlbnRyeSkpXG4gICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWdKc29uLmluY2x1ZGUgPSBbcm9vdERpclZhbHVlICsgJy8qKi8qLnRzJ107XG4gICAgICBpZiAob3B0cy5qc3gpIHtcbiAgICAgICAgY29uZmlnSnNvbi5pbmNsdWRlIS5wdXNoKHJvb3REaXJWYWx1ZSArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlcykge1xuICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcy5tYXAocmVmVmFsdWUgPT4ge1xuICAgICAgICBjb25zdCByZWZGaWxlID0gdHNjb25maWdGaWxlTmFtZTRSZWYocmVmVmFsdWUpO1xuXG4gICAgICAgIGlmIChyZWZGaWxlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZlcmVuY2VkIHBhY2thZ2UgJHtyZWZWYWx1ZX0gZG9lcyBub3QgZXhpc3QsIHJlZmVyZW5jZWQgYnkgJHtwa2cubmFtZX1gKTtcblxuICAgICAgICByZXR1cm4ge3BhdGg6IHJlZkZpbGV9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzQ29uZmlnc0RpciwgJy4vJywgY29uZmlnSnNvbi5jb21waWxlck9wdGlvbnMsIHtcbiAgICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAgIHdvcmtzcGFjZURpcjogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCB3c0tleSEpXG4gICAgfSk7XG5cbiAgICBpZiAoaWR4ID4gMSkge1xuICAgICAgaWYgKGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9PSBudWxsKSB7XG4gICAgICAgIGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9IFtdO1xuICAgICAgfVxuICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzLnB1c2goe3BhdGg6IGZpbGVOYW1lc1tpZHggLSAxXX0pO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlnSnNvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhbGtSZWZlcmVuY2VkUGtnKHBrZzogc3RyaW5nKSB7XG4gICAgd2Fsa2VkLmFkZChwa2cpO1xuICAgIGNvbnN0IHJhd0NmZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBrZyk7XG4gICAgaWYgKHJhd0NmZ3MgPT0gbnVsbCkge1xuICAgICAgbG9nLndhcm4oYFJlZmVyZW5jZSBwYWNrYWdlIFwiJHtwa2d9XCIgaXMgbm90IGxpbmtlZCwgc2tpcCBpdGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJhdyBvZiByYXdDZmdzKSB7XG4gICAgICBpZiAocmF3LnJlZmVyZW5jZXMgJiYgcmF3LnJlZmVyZW5jZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlZiBvZiByYXcucmVmZXJlbmNlcykge1xuICAgICAgICAgIGlmICghd2Fsa2VkLmhhcyhyZWYpKSB7XG4gICAgICAgICAgICB3YWxrUmVmZXJlbmNlZFBrZyhyZWYpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXJnZSguLi5kb25lKTtcbn1cblxuZnVuY3Rpb24gdHNjb25maWdGaWxlTmFtZXMocGFja2FnZU5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHwgbnVsbCB7XG4gIGNvbnN0IGNvbmZpZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgaWYgKGNvbmZpZ3MgPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBwYWNrYWdlTmFtZS5yZXBsYWNlKC9cXC8vZywgJy0nKTtcbiAgcmV0dXJuIGNvbmZpZ3MubWFwKChfLCBpbmRleCkgPT4gbmFtZSArIGluZGV4ICsgJy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIHRzY29uZmlnRmlsZU5hbWU0UmVmKHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgY29uZmlncyA9IGdldFRzY1N0YXRlKCkuY29uZmlncy5nZXQocGFja2FnZU5hbWUpO1xuICBpZiAoY29uZmlncyA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcLy9nLCAnLScpO1xuICByZXR1cm4gbmFtZSArIChjb25maWdzLmxlbmd0aCAtIDEpICsgJy5qc29uJztcbn1cblxuIl19