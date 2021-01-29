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
const log = log4js_1.default.getLogger('plink.tsc-packages');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXBhY2thZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvZGVwcmVjYXRlZC90c2MtcGFja2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7O0dBRUc7QUFDSCw0Q0FBb0I7QUFDcEIsd0RBQTJCO0FBRTNCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsK0JBQWdEO0FBQ2hELDhDQUF5RDtBQUV6RCx1REFBK0I7QUFDL0Isc0RBQWdFO0FBQ2hFLGdEQUFxRTtBQUNyRSw2REFBK0Q7QUFDL0Qsd0NBQWlEO0FBQ2pELDRFQUErRDtBQUMvRCxpREFBbUM7QUFDbkMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQWtDbkQsU0FBZ0IsR0FBRyxDQUFDLElBQWlCO0lBQ25DLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNoQixNQUFNLElBQUksR0FBRywyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLHFCQUFxQixDQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUM7YUFDMUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FDdkIsa0JBQU0sQ0FBUyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsRUFBRTtZQUNuQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3ZCLE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNOLGtCQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFL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QUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtRQUNuQixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0MsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxXQUFtQjtJQUMvQyxNQUFNLE9BQU8sR0FBRyw2QkFBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2RCxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7UUFDbkIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUNELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdDLE9BQU8sSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7QUFDL0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlIFR5cGVzY3JpcHQgXCJQcm9qZWN0IFJlZmVyZW5jZVwiICYgXCJ0c2MgLWIgQ29tbWFuZGxpbmVcIiBhYmlsaXR5IHRvIGNvbXBpbGUgbXVsdGlwbGUgcGFja2FnZXNcbiAqL1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgbWVyZ2UsIE9ic2VydmFibGUsIEVNUFRZIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3JlZHVjZSwgY29uY2F0TWFwLCBmaWx0ZXJ9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IENvbXBpbGVyT3B0aW9ucyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoIH0gZnJvbSAnLi4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0U3RhdGUsIFBhY2thZ2VJbmZvLCB3b3Jrc3BhY2VLZXkgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBnZXRTdGF0ZSBhcyBnZXRUc2NTdGF0ZSB9IGZyb20gJy4vdHNjLXBhY2thZ2VzLXNsaWNlJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi4vY21kL3V0aWxzJztcbmltcG9ydCB7YWxsUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnRzYy1wYWNrYWdlcycpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRzY29uZmlnIHtcbiAgZXh0ZW5kcz86IHN0cmluZztcbiAgY29tcGlsZXJPcHRpb25zOiB7W2tleSBpbiBrZXlvZiBDb21waWxlck9wdGlvbnNdOiBhbnl9O1xuICBpbmNsdWRlPzogc3RyaW5nW107XG4gIGV4Y2x1ZGU/OiBzdHJpbmdbXTtcbiAgZmlsZXM/OiBzdHJpbmdbXTtcbiAgcmVmZXJlbmNlcz86IHtwYXRoOiBzdHJpbmd9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNjQ21kUGFyYW0ge1xuICBwYWNrYWdlPzogc3RyaW5nW107XG4gIHByb2plY3Q/OiBzdHJpbmdbXTtcbiAgd2F0Y2g/OiBib29sZWFuO1xuICBzb3VyY2VNYXA/OiBzdHJpbmc7XG4gIGpzeD86IGJvb2xlYW47XG4gIGVkPzogYm9vbGVhbjtcbiAgY29tcGlsZU9wdGlvbnM/OiB7W2tleSBpbiBrZXlvZiBDb21waWxlck9wdGlvbnNdOiBhbnl9O1xufVxuXG4vKipcbiAqIEFsbCBkaXJlY3RvcmllcyBhcmUgcmVsYXRpdmUgdG8gcGFja2FnZSByZWFsIHBhdGhcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvblRzY1Byb3BlcnR5SXRlbSB7XG4gIHJvb3REaXI6IHN0cmluZztcbiAgb3V0RGlyOiBzdHJpbmc7XG4gIGZpbGVzPzogc3RyaW5nW107XG4gIC8qKiBcInJlZmVyZW5jZXNcIiBpbiB0c2NvbmZpZyBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9wcm9qZWN0LXJlZmVyZW5jZXMuaHRtbCAqL1xuICByZWZlcmVuY2VzPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VKc29uVHNjUHJvcGVydHkgPSBQYWNrYWdlSnNvblRzY1Byb3BlcnR5SXRlbSB8IFBhY2thZ2VKc29uVHNjUHJvcGVydHlJdGVtW107XG5cbmV4cG9ydCBmdW5jdGlvbiB0c2Mob3B0czogVHNjQ21kUGFyYW0pIHtcbiAgaWYgKG9wdHMucGFja2FnZSkge1xuICAgIGNvbnN0IHBrZ3MgPSBmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIG9wdHMucGFja2FnZSk7XG4gICAgY29uc3QgdHNjb25maWdGaWxlJCA9IGdlbmVyYXRlVHNjb25maWdGaWxlcyhcbiAgICAgIEFycmF5LmZyb20ocGtncykuZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbClcbiAgICAgIC5tYXAocGtnID0+IHBrZyEubmFtZSksIG9wdHMpO1xuICAgIHJldHVybiB0c2NvbmZpZ0ZpbGUkLnBpcGUoXG4gICAgICByZWR1Y2U8c3RyaW5nPigoYWxsLCB0c2NvbmZpZ0ZpbGUpID0+IHtcbiAgICAgICAgYWxsLnB1c2godHNjb25maWdGaWxlKTtcbiAgICAgICAgcmV0dXJuIGFsbDtcbiAgICAgIH0sIFtdKSxcbiAgICAgIGZpbHRlcihmaWxlcyA9PiBmaWxlcy5sZW5ndGggPiAwKSxcbiAgICAgIGNvbmNhdE1hcChmaWxlcyA9PiB7XG4gICAgICAgIGNvbnN0IGVudiA9IHByb2Nlc3MuZW52O1xuICAgICAgICBkZWxldGUgZW52Lk5PREVfT1BUSU9OUztcblxuICAgICAgICBjb25zdCBhcmcgPSBbJy1iJywgLi4uZmlsZXMsICctdiddO1xuICAgICAgICBpZiAob3B0cy53YXRjaClcbiAgICAgICAgICBhcmcucHVzaCgnLXcnKTtcblxuICAgICAgICBsb2cuaW5mbygndHNjICcgKyBhcmcuam9pbignICcpKTtcbiAgICAgICAgY29uc3QgY3AgPSBmb3JrKHJlcXVpcmUucmVzb2x2ZSgndHlwZXNjcmlwdC9saWIvdHNjLmpzJyksIGFyZywge2Vudn0pO1xuICAgICAgICByZXR1cm4gbmV3IE9ic2VydmFibGUoc3ViID0+IHtcbiAgICAgICAgICBjcC5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgICAgICAgIGxvZy5pbmZvKGNvZGUgKyAnICcgKyBzaWduYWwpO1xuICAgICAgICAgICAgc3ViLm5leHQoKTtcbiAgICAgICAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiBzdWIuZXJyb3IoZXJyKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICApO1xuICB9IGVsc2UgaWYgKG9wdHMucHJvamVjdCkge1xuICAgIGFsbFBhY2thZ2VzKCcqJywgJ3NyYycsIG9wdHMucHJvamVjdCk7XG4gIH1cbiAgcmV0dXJuIEVNUFRZO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVUc2NvbmZpZ0ZpbGVzKHBrZ3M6IEl0ZXJhYmxlPHN0cmluZz4sIG9wdHM6IFRzY0NtZFBhcmFtKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd2Fsa2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGtncykge1xuICAgIHdhbGtSZWZlcmVuY2VkUGtnKHBrZyk7XG4gIH1cblxuICBpZiAoIWdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKVxuICAgIHdzS2V5ID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBzcGFjZScpO1xuICB9XG5cbiAgY29uc3QgdHNDb25maWdzRGlyID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAndHNjb25maWdzJyk7XG4gIGZzZS5ta2RpcnBTeW5jKHRzQ29uZmlnc0Rpcik7XG4gIC8vIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmModHNDb25maWdzRGlyKTtcbiAgLy8gY29uc29sZS5sb2coZmlsZXMpO1xuXG4gIGNvbnN0IGJhc2VDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3RzY29uZmlnLWJhc2UuanNvbicpO1xuICBjb25zdCBiYXNlVHN4Q29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsICcuLicsICd0c2NvbmZpZy10c3guanNvbicpO1xuXG4gIGNvbnN0IGRvbmUgPSBBcnJheS5mcm9tKHdhbGtlZC52YWx1ZXMoKSlcbiAgLm1hcChwa2cgPT4ge1xuICAgIGNvbnN0IHJhd0NvbmZpZ3MgPSBnZXRUc2NTdGF0ZSgpLmNvbmZpZ3MuZ2V0KHBrZyk7XG4gICAgaWYgKHJhd0NvbmZpZ3MgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlICR7cGtnfSBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgY29uc3QgdHNjb25maWdGaWxlcyA9IHRzY29uZmlnRmlsZU5hbWVzKHBrZykhO1xuXG4gICAgY29uc3Qgd29ya3MgPSByYXdDb25maWdzXG4gICAgLm1hcCgocmF3LCBpZHgpID0+IHtcbiAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YiA9PiB7XG4gICAgICAgIGNvbnN0IHRzY29uZmlnID0gY3JlYXRlVHNjb25maWdzKFxuICAgICAgICAgIGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZykhLCB0c2NvbmZpZ0ZpbGVzLCBpZHgsIHJhdy5yb290RGlyLCByYXcub3V0RGlyLCByYXcuZmlsZXMsIHJhdy5yZWZlcmVuY2VzKTtcbiAgICAgICAgY29uc3QgdG9Xcml0ZSA9IFBhdGgucmVzb2x2ZSh0c0NvbmZpZ3NEaXIsIHRzY29uZmlnRmlsZXNbaWR4XSk7XG4gICAgICAgIGZzLndyaXRlRmlsZSh0b1dyaXRlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZywgbnVsbCwgJyAgJyksIChlcnIpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gc3ViLmVycm9yKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxvZy5pbmZvKGBXcml0ZSAke3RvV3JpdGV9YCk7XG4gICAgICAgICAgc3ViLm5leHQodG9Xcml0ZSk7XG4gICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lcmdlKC4uLndvcmtzKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlVHNjb25maWdzKHBrZzogUGFja2FnZUluZm8sIGZpbGVOYW1lczogc3RyaW5nW10sIGlkeDogbnVtYmVyLCByb290RGlyOiBzdHJpbmcsIG91dERpcjogc3RyaW5nLFxuICAgIGVudHJpZXM/OiBzdHJpbmdbXSwgcmVmZXJlbmNlcz86IHN0cmluZ1tdKSB7XG4gICAgY29uc3Qgcm9vdERpclZhbHVlID0gUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ3NEaXIsIFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHJvb3REaXIpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgY29uc3QgY29uZmlnSnNvbjogVHNjb25maWcgPSB7XG4gICAgICBleHRlbmRzOiBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnc0Rpciwgb3B0cy5qc3ggPyBiYXNlVHN4Q29uZmlnRmlsZSA6IGJhc2VDb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgICAgcm9vdERpcjogcm9vdERpclZhbHVlLFxuICAgICAgICBvdXREaXI6IFBhdGgucmVsYXRpdmUodHNDb25maWdzRGlyLCBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBvdXREaXIpKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAgIGNvbXBvc2l0ZTogdHJ1ZSwgLy8gcmVxdWlyZWQgYnkgUHJvamVjdCBSZWZlcmVuY2VcbiAgICAgICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgICAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgaW5saW5lU291cmNlczogdHJ1ZSxcbiAgICAgICAgaW5saW5lU291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgZW1pdERlY2xhcmF0aW9uT25seTogb3B0cy5lZFxuICAgICAgfSxcbiAgICAgIGV4Y2x1ZGU6IFtdXG4gICAgfTtcblxuICAgIGlmIChlbnRyaWVzICYmIGVudHJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uZmlnSnNvbi5maWxlcyA9IGVudHJpZXMubWFwKGVudHJ5ID0+XG4gICAgICAgICAgUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ3NEaXIsIFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIGVudHJ5KSlcbiAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZ0pzb24uaW5jbHVkZSA9IFtyb290RGlyVmFsdWUgKyAnLyoqLyoudHMnXTtcbiAgICAgIGlmIChvcHRzLmpzeCkge1xuICAgICAgICBjb25maWdKc29uLmluY2x1ZGUhLnB1c2gocm9vdERpclZhbHVlICsgJy8qKi8qLnRzeCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyZWZlcmVuY2VzKSB7XG4gICAgICBjb25maWdKc29uLnJlZmVyZW5jZXMgPSByZWZlcmVuY2VzLm1hcChyZWZWYWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IHJlZkZpbGUgPSB0c2NvbmZpZ0ZpbGVOYW1lNFJlZihyZWZWYWx1ZSk7XG5cbiAgICAgICAgaWYgKHJlZkZpbGUgPT0gbnVsbClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZmVyZW5jZWQgcGFja2FnZSAke3JlZlZhbHVlfSBkb2VzIG5vdCBleGlzdCwgcmVmZXJlbmNlZCBieSAke3BrZy5uYW1lfWApO1xuXG4gICAgICAgIHJldHVybiB7cGF0aDogcmVmRmlsZX07XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNDb25maWdzRGlyLCAnLi8nLCBjb25maWdKc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgICAgd29ya3NwYWNlRGlyOiBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIHdzS2V5ISlcbiAgICB9KTtcblxuICAgIGlmIChpZHggPiAxKSB7XG4gICAgICBpZiAoY29uZmlnSnNvbi5yZWZlcmVuY2VzID09IG51bGwpIHtcbiAgICAgICAgY29uZmlnSnNvbi5yZWZlcmVuY2VzID0gW107XG4gICAgICB9XG4gICAgICBjb25maWdKc29uLnJlZmVyZW5jZXMucHVzaCh7cGF0aDogZmlsZU5hbWVzW2lkeCAtIDFdfSk7XG4gICAgfVxuICAgIHJldHVybiBjb25maWdKc29uO1xuICB9XG5cbiAgZnVuY3Rpb24gd2Fsa1JlZmVyZW5jZWRQa2cocGtnOiBzdHJpbmcpIHtcbiAgICB3YWxrZWQuYWRkKHBrZyk7XG4gICAgY29uc3QgcmF3Q2ZncyA9IGdldFRzY1N0YXRlKCkuY29uZmlncy5nZXQocGtnKTtcbiAgICBpZiAocmF3Q2ZncyA9PSBudWxsKSB7XG4gICAgICBsb2cud2FybihgUmVmZXJlbmNlIHBhY2thZ2UgXCIke3BrZ31cIiBpcyBub3QgbGlua2VkLCBza2lwIGl0YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgcmF3IG9mIHJhd0NmZ3MpIHtcbiAgICAgIGlmIChyYXcucmVmZXJlbmNlcyAmJiByYXcucmVmZXJlbmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZvciAoY29uc3QgcmVmIG9mIHJhdy5yZWZlcmVuY2VzKSB7XG4gICAgICAgICAgaWYgKCF3YWxrZWQuaGFzKHJlZikpIHtcbiAgICAgICAgICAgIHdhbGtSZWZlcmVuY2VkUGtnKHJlZik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1lcmdlKC4uLmRvbmUpO1xufVxuXG5mdW5jdGlvbiB0c2NvbmZpZ0ZpbGVOYW1lcyhwYWNrYWdlTmFtZTogc3RyaW5nKTogc3RyaW5nW10gfCBudWxsIHtcbiAgY29uc3QgY29uZmlncyA9IGdldFRzY1N0YXRlKCkuY29uZmlncy5nZXQocGFja2FnZU5hbWUpO1xuICBpZiAoY29uZmlncyA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgbmFtZSA9IHBhY2thZ2VOYW1lLnJlcGxhY2UoL1xcLy9nLCAnLScpO1xuICByZXR1cm4gY29uZmlncy5tYXAoKF8sIGluZGV4KSA9PiBuYW1lICsgaW5kZXggKyAnLmpzb24nKTtcbn1cblxuZnVuY3Rpb24gdHNjb25maWdGaWxlTmFtZTRSZWYocGFja2FnZU5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBjb25maWdzID0gZ2V0VHNjU3RhdGUoKS5jb25maWdzLmdldChwYWNrYWdlTmFtZSk7XG4gIGlmIChjb25maWdzID09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBuYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZSgvXFwvL2csICctJyk7XG4gIHJldHVybiBuYW1lICsgKGNvbmZpZ3MubGVuZ3RoIC0gMSkgKyAnLmpzb24nO1xufVxuXG4iXX0=