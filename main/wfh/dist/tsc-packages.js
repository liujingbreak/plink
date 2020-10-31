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
const config_1 = __importDefault(require("./config"));
const config_handler_1 = require("./config-handler");
const package_mgr_1 = require("./package-mgr");
const tsc_packages_slice_1 = require("./tsc-packages-slice");
const utils_1 = require("./cmd/utils");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
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
    const baseConfigFile = path_1.default.resolve(__dirname, '..', 'tsconfig-base.json');
    const baseTsxConfigFile = path_1.default.resolve(__dirname, '..', 'tsconfig-tsx.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXBhY2thZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHNjLXBhY2thZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztHQUVHO0FBQ0gsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUUzQixvREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLCtCQUFnRDtBQUNoRCw4Q0FBeUQ7QUFFekQsc0RBQThCO0FBQzlCLHFEQUErRDtBQUMvRCwrQ0FBb0U7QUFDcEUsNkRBQStEO0FBQy9ELHVDQUFnRDtBQUNoRCwyRUFBOEQ7QUFDOUQsaURBQW1DO0FBQ25DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFrQ2pELFNBQWdCLEdBQUcsQ0FBQyxJQUFpQjtJQUNuQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDaEIsTUFBTSxJQUFJLEdBQUcsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzRCxNQUFNLGFBQWEsR0FBRyxxQkFBcUIsQ0FDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDO2FBQzFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoQyxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQ3ZCLGtCQUFNLENBQVMsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLEVBQUU7WUFDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN2QixPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDTixrQkFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FB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LElBQUksSUFBSSxFQUFFO1FBQ25CLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLFdBQW1CO0lBQy9DLE1BQU0sT0FBTyxHQUFHLDZCQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtRQUNuQixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0MsT0FBTyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztBQUMvQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVc2UgVHlwZXNjcmlwdCBcIlByb2plY3QgUmVmZXJlbmNlXCIgJiBcInRzYyAtYiBDb21tYW5kbGluZVwiIGFiaWxpdHkgdG8gY29tcGlsZSBtdWx0aXBsZSBwYWNrYWdlc1xuICovXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBtZXJnZSwgT2JzZXJ2YWJsZSwgRU1QVFkgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7cmVkdWNlLCBjb25jYXRNYXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQ29tcGlsZXJPcHRpb25zIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCB9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0U3RhdGUsIFBhY2thZ2VJbmZvLCB3b3Jrc3BhY2VLZXkgfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGdldFN0YXRlIGFzIGdldFRzY1N0YXRlIH0gZnJvbSAnLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL2NtZC91dGlscyc7XG5pbXBvcnQge2FsbFBhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC50c2MtcGFja2FnZXMnKTtcblxuZXhwb3J0IGludGVyZmFjZSBUc2NvbmZpZyB7XG4gIGV4dGVuZHM/OiBzdHJpbmc7XG4gIGNvbXBpbGVyT3B0aW9uczoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXTogYW55fTtcbiAgaW5jbHVkZT86IHN0cmluZ1tdO1xuICBleGNsdWRlPzogc3RyaW5nW107XG4gIGZpbGVzPzogc3RyaW5nW107XG4gIHJlZmVyZW5jZXM/OiB7cGF0aDogc3RyaW5nfVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRzY0NtZFBhcmFtIHtcbiAgcGFja2FnZT86IHN0cmluZ1tdO1xuICBwcm9qZWN0Pzogc3RyaW5nW107XG4gIHdhdGNoPzogYm9vbGVhbjtcbiAgc291cmNlTWFwPzogc3RyaW5nO1xuICBqc3g/OiBib29sZWFuO1xuICBlZD86IGJvb2xlYW47XG4gIGNvbXBpbGVPcHRpb25zPzoge1trZXkgaW4ga2V5b2YgQ29tcGlsZXJPcHRpb25zXTogYW55fTtcbn1cblxuLyoqXG4gKiBBbGwgZGlyZWN0b3JpZXMgYXJlIHJlbGF0aXZlIHRvIHBhY2thZ2UgcmVhbCBwYXRoXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25Uc2NQcm9wZXJ0eUl0ZW0ge1xuICByb290RGlyOiBzdHJpbmc7XG4gIG91dERpcjogc3RyaW5nO1xuICBmaWxlcz86IHN0cmluZ1tdO1xuICAvKiogXCJyZWZlcmVuY2VzXCIgaW4gdHNjb25maWcgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcHJvamVjdC1yZWZlcmVuY2VzLmh0bWwgKi9cbiAgcmVmZXJlbmNlcz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlSnNvblRzY1Byb3BlcnR5ID0gUGFja2FnZUpzb25Uc2NQcm9wZXJ0eUl0ZW0gfCBQYWNrYWdlSnNvblRzY1Byb3BlcnR5SXRlbVtdO1xuXG5leHBvcnQgZnVuY3Rpb24gdHNjKG9wdHM6IFRzY0NtZFBhcmFtKSB7XG4gIGlmIChvcHRzLnBhY2thZ2UpIHtcbiAgICBjb25zdCBwa2dzID0gZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBvcHRzLnBhY2thZ2UpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSQgPSBnZW5lcmF0ZVRzY29uZmlnRmlsZXMoXG4gICAgICBBcnJheS5mcm9tKHBrZ3MpLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpXG4gICAgICAubWFwKHBrZyA9PiBwa2chLm5hbWUpLCBvcHRzKTtcbiAgICByZXR1cm4gdHNjb25maWdGaWxlJC5waXBlKFxuICAgICAgcmVkdWNlPHN0cmluZz4oKGFsbCwgdHNjb25maWdGaWxlKSA9PiB7XG4gICAgICAgIGFsbC5wdXNoKHRzY29uZmlnRmlsZSk7XG4gICAgICAgIHJldHVybiBhbGw7XG4gICAgICB9LCBbXSksXG4gICAgICBmaWx0ZXIoZmlsZXMgPT4gZmlsZXMubGVuZ3RoID4gMCksXG4gICAgICBjb25jYXRNYXAoZmlsZXMgPT4ge1xuICAgICAgICBjb25zdCBlbnYgPSBwcm9jZXNzLmVudjtcbiAgICAgICAgZGVsZXRlIGVudi5OT0RFX09QVElPTlM7XG5cbiAgICAgICAgY29uc3QgYXJnID0gWyctYicsIC4uLmZpbGVzLCAnLXYnXTtcbiAgICAgICAgaWYgKG9wdHMud2F0Y2gpXG4gICAgICAgICAgYXJnLnB1c2goJy13Jyk7XG5cbiAgICAgICAgbG9nLmluZm8oJ3RzYyAnICsgYXJnLmpvaW4oJyAnKSk7XG4gICAgICAgIGNvbnN0IGNwID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJ3R5cGVzY3JpcHQvbGliL3RzYy5qcycpLCBhcmcsIHtlbnZ9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKHN1YiA9PiB7XG4gICAgICAgICAgY3Aub24oJ2V4aXQnLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICAgICAgICBsb2cuaW5mbyhjb2RlICsgJyAnICsgc2lnbmFsKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KCk7XG4gICAgICAgICAgICBzdWIuY29tcGxldGUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjcC5vbignZXJyb3InLCBlcnIgPT4gc3ViLmVycm9yKGVycikpO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfSBlbHNlIGlmIChvcHRzLnByb2plY3QpIHtcbiAgICBhbGxQYWNrYWdlcygnKicsICdzcmMnLCBvcHRzLnByb2plY3QpO1xuICB9XG4gIHJldHVybiBFTVBUWTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHNjb25maWdGaWxlcyhwa2dzOiBJdGVyYWJsZTxzdHJpbmc+LCBvcHRzOiBUc2NDbWRQYXJhbSkge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIGNvbnN0IHdhbGtlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIHBrZ3MpIHtcbiAgICB3YWxrUmVmZXJlbmNlZFBrZyhwa2cpO1xuICB9XG5cbiAgaWYgKCFnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSlcbiAgICB3c0tleSA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgc3BhY2UnKTtcbiAgfVxuXG4gIGNvbnN0IHRzQ29uZmlnc0RpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3RzY29uZmlncycpO1xuICBmc2UubWtkaXJwU3luYyh0c0NvbmZpZ3NEaXIpO1xuICAvLyBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRzQ29uZmlnc0Rpcik7XG4gIC8vIGNvbnNvbGUubG9nKGZpbGVzKTtcblxuICBjb25zdCBiYXNlQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICd0c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgY29uc3QgYmFzZVRzeENvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAndHNjb25maWctdHN4Lmpzb24nKTtcblxuICBjb25zdCBkb25lID0gQXJyYXkuZnJvbSh3YWxrZWQudmFsdWVzKCkpXG4gIC5tYXAocGtnID0+IHtcbiAgICBjb25zdCByYXdDb25maWdzID0gZ2V0VHNjU3RhdGUoKS5jb25maWdzLmdldChwa2cpO1xuICAgIGlmIChyYXdDb25maWdzID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUGFja2FnZSAke3BrZ30gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfVxuICAgIGNvbnN0IHRzY29uZmlnRmlsZXMgPSB0c2NvbmZpZ0ZpbGVOYW1lcyhwa2cpITtcblxuICAgIGNvbnN0IHdvcmtzID0gcmF3Q29uZmlnc1xuICAgIC5tYXAoKHJhdywgaWR4KSA9PiB7XG4gICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWIgPT4ge1xuICAgICAgICBjb25zdCB0c2NvbmZpZyA9IGNyZWF0ZVRzY29uZmlncyhcbiAgICAgICAgICBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2cpISwgdHNjb25maWdGaWxlcywgaWR4LCByYXcucm9vdERpciwgcmF3Lm91dERpciwgcmF3LmZpbGVzLCByYXcucmVmZXJlbmNlcyk7XG4gICAgICAgIGNvbnN0IHRvV3JpdGUgPSBQYXRoLnJlc29sdmUodHNDb25maWdzRGlyLCB0c2NvbmZpZ0ZpbGVzW2lkeF0pO1xuICAgICAgICBmcy53cml0ZUZpbGUodG9Xcml0ZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWcsIG51bGwsICcgICcpLCAoZXJyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHN1Yi5lcnJvcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsb2cuaW5mbyhgV3JpdGUgJHt0b1dyaXRlfWApO1xuICAgICAgICAgIHN1Yi5uZXh0KHRvV3JpdGUpO1xuICAgICAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBtZXJnZSguLi53b3Jrcyk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRzY29uZmlncyhwa2c6IFBhY2thZ2VJbmZvLCBmaWxlTmFtZXM6IHN0cmluZ1tdLCBpZHg6IG51bWJlciwgcm9vdERpcjogc3RyaW5nLCBvdXREaXI6IHN0cmluZyxcbiAgICBlbnRyaWVzPzogc3RyaW5nW10sIHJlZmVyZW5jZXM/OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHJvb3REaXJWYWx1ZSA9IFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCByb290RGlyKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGNvbnN0IGNvbmZpZ0pzb246IFRzY29uZmlnID0ge1xuICAgICAgZXh0ZW5kczogUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ3NEaXIsIG9wdHMuanN4ID8gYmFzZVRzeENvbmZpZ0ZpbGUgOiBiYXNlQ29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAgIHJvb3REaXI6IHJvb3REaXJWYWx1ZSxcbiAgICAgICAgb3V0RGlyOiBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnc0RpciwgUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgb3V0RGlyKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgICBjb21wb3NpdGU6IHRydWUsIC8vIHJlcXVpcmVkIGJ5IFByb2plY3QgUmVmZXJlbmNlXG4gICAgICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgICAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICAgICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4gICAgICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgIGVtaXREZWNsYXJhdGlvbk9ubHk6IG9wdHMuZWRcbiAgICAgIH0sXG4gICAgICBleGNsdWRlOiBbXVxuICAgIH07XG5cbiAgICBpZiAoZW50cmllcyAmJiBlbnRyaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbmZpZ0pzb24uZmlsZXMgPSBlbnRyaWVzLm1hcChlbnRyeSA9PlxuICAgICAgICAgIFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBlbnRyeSkpXG4gICAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWdKc29uLmluY2x1ZGUgPSBbcm9vdERpclZhbHVlICsgJy8qKi8qLnRzJ107XG4gICAgICBpZiAob3B0cy5qc3gpIHtcbiAgICAgICAgY29uZmlnSnNvbi5pbmNsdWRlIS5wdXNoKHJvb3REaXJWYWx1ZSArICcvKiovKi50c3gnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlcykge1xuICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzID0gcmVmZXJlbmNlcy5tYXAocmVmVmFsdWUgPT4ge1xuICAgICAgICBjb25zdCByZWZGaWxlID0gdHNjb25maWdGaWxlTmFtZTRSZWYocmVmVmFsdWUpO1xuXG4gICAgICAgIGlmIChyZWZGaWxlID09IG51bGwpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZlcmVuY2VkIHBhY2thZ2UgJHtyZWZWYWx1ZX0gZG9lcyBub3QgZXhpc3QsIHJlZmVyZW5jZWQgYnkgJHtwa2cubmFtZX1gKTtcblxuICAgICAgICByZXR1cm4ge3BhdGg6IHJlZkZpbGV9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzQ29uZmlnc0RpciwgJy4vJywgY29uZmlnSnNvbi5jb21waWxlck9wdGlvbnMsIHtcbiAgICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICAgIHdvcmtzcGFjZURpcjogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCB3c0tleSEpXG4gICAgfSk7XG5cbiAgICBpZiAoaWR4ID4gMSkge1xuICAgICAgaWYgKGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9PSBudWxsKSB7XG4gICAgICAgIGNvbmZpZ0pzb24ucmVmZXJlbmNlcyA9IFtdO1xuICAgICAgfVxuICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzLnB1c2goe3BhdGg6IGZpbGVOYW1lc1tpZHggLSAxXX0pO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlnSnNvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhbGtSZWZlcmVuY2VkUGtnKHBrZzogc3RyaW5nKSB7XG4gICAgd2Fsa2VkLmFkZChwa2cpO1xuICAgIGNvbnN0IHJhd0NmZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBrZyk7XG4gICAgaWYgKHJhd0NmZ3MgPT0gbnVsbCkge1xuICAgICAgbG9nLndhcm4oYFJlZmVyZW5jZSBwYWNrYWdlIFwiJHtwa2d9XCIgaXMgbm90IGxpbmtlZCwgc2tpcCBpdGApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJhdyBvZiByYXdDZmdzKSB7XG4gICAgICBpZiAocmF3LnJlZmVyZW5jZXMgJiYgcmF3LnJlZmVyZW5jZXMubGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlZiBvZiByYXcucmVmZXJlbmNlcykge1xuICAgICAgICAgIGlmICghd2Fsa2VkLmhhcyhyZWYpKSB7XG4gICAgICAgICAgICB3YWxrUmVmZXJlbmNlZFBrZyhyZWYpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXJnZSguLi5kb25lKTtcbn1cblxuZnVuY3Rpb24gdHNjb25maWdGaWxlTmFtZXMocGFja2FnZU5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHwgbnVsbCB7XG4gIGNvbnN0IGNvbmZpZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgaWYgKGNvbmZpZ3MgPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBwYWNrYWdlTmFtZS5yZXBsYWNlKC9cXC8vZywgJy0nKTtcbiAgcmV0dXJuIGNvbmZpZ3MubWFwKChfLCBpbmRleCkgPT4gbmFtZSArIGluZGV4ICsgJy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIHRzY29uZmlnRmlsZU5hbWU0UmVmKHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgY29uZmlncyA9IGdldFRzY1N0YXRlKCkuY29uZmlncy5nZXQocGFja2FnZU5hbWUpO1xuICBpZiAoY29uZmlncyA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcLy9nLCAnLScpO1xuICByZXR1cm4gbmFtZSArIChjb25maWdzLmxlbmd0aCAtIDEpICsgJy5qc29uJztcbn1cblxuIl19