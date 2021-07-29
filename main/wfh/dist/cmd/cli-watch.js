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
exports.cliWatch = void 0;
const chokidar_1 = __importDefault(require("chokidar"));
const utils_1 = require("./utils");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const log4js_1 = require("log4js");
const Path = __importStar(require("path"));
const package_mgr_1 = require("../package-mgr");
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = require("fs-extra");
const anymatch_1 = __importDefault(require("anymatch"));
const log = log4js_1.getLogger('plink.cli');
function cliWatch(packages, opt) {
    let hasUnlinkEvent = false;
    let changedPkgJson = [];
    const pkgs = [...utils_1.findPackagesByNames(packages)];
    const deletePkgMsg = new rx.Subject();
    rx.from(pkgs).pipe(op.filter((pkg, idx) => {
        if (pkg == null) {
            log.info(`Can not find source package of: ${packages[idx]}`);
            return false;
        }
        return true;
    }), op.mergeMap((pkg, idx) => {
        return new rx.Observable(sub => {
            // log.info(pkg.realPath);
            const pkgJsonFile = Path.resolve(pkg.realPath, 'package.json');
            const watcher = chokidar_1.default.watch(pkgJsonFile);
            watcher.on('change', path => {
                log.info(path, 'changed');
                // if (path === pkgJsonFile) {
                changedPkgJson.push(path);
                sub.next('change');
                // }
            });
            watcher.on('unlink', path => {
                // if (path === pkgJsonFile) {
                hasUnlinkEvent = true;
                changedPkgJson.splice(0);
                deletePkgMsg.next(pkg.name);
                sub.next('unlink');
                // }
            });
            return () => watcher.close();
        });
    }), op.debounceTime(300), op.map(() => {
        if (hasUnlinkEvent) {
            hasUnlinkEvent = false;
            package_mgr_1.actionDispatcher.scanAndSyncPackages({});
        }
        else {
            const files = changedPkgJson;
            changedPkgJson = [];
            log.info(files);
            package_mgr_1.actionDispatcher.scanAndSyncPackages({ packageJsonFiles: files });
        }
    })).subscribe();
    if (opt.copy) {
        fs_extra_1.mkdirpSync(opt.copy);
        // const copyTo = Path.resolve(opt.copy);
        rx.from(pkgs).pipe(op.filter(pkg => pkg != null), op.mergeMap((pkg, idx) => {
            const npmIgnore = Path.resolve(pkg.realPath, '.npmignore');
            return (fs_1.default.existsSync(npmIgnore) ?
                rx.from(fs_1.default.promises.readFile(npmIgnore, 'utf-8')) :
                rx.of('')).pipe(op.switchMap(content => new rx.Observable((sub) => {
                function matchNpmIgnore(relativePath) {
                    let matched = false;
                    for (const line of content.split(/\n\r?/)) {
                        if (line.trim().length === 0)
                            continue;
                        if (!line.startsWith('!')) {
                            if (anymatch_1.default([line], relativePath))
                                matched = true;
                        }
                        else if (matched && anymatch_1.default([line.slice(1)], relativePath)) {
                            // If pattern begins with ! and matched previous pattern, and now it matches the remainder part of pattern
                            matched = false;
                        }
                    }
                    return matched;
                }
                const watcher = chokidar_1.default.watch(pkg.realPath);
                watcher.on('add', path => {
                    const relPath = Path.relative(pkg.realPath, path).replace(/\\/g, '/');
                    if (!matchNpmIgnore('/' + relPath) && !matchNpmIgnore(relPath)) {
                        sub.next(path);
                    }
                });
                watcher.on('change', path => {
                    const relPath = Path.relative(pkg.realPath, path).replace(/\\/g, '/');
                    if (!matchNpmIgnore('/' + relPath) && !matchNpmIgnore(relPath)) {
                        sub.next(path);
                    }
                });
                return () => watcher.close();
            })), op.takeUntil(deletePkgMsg.pipe(op.filter(pkgName => pkgName === pkg.name))));
        }), op.mergeMap(file => {
            log.info('copy', file);
            return fs_1.default.promises.copyFile(file, opt.copy);
        })).subscribe();
    }
}
exports.cliWatch = cliWatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXdhdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS13YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esd0RBQWdDO0FBQ2hDLG1DQUE0QztBQUM1Qyx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLG1DQUFpQztBQUNqQywyQ0FBNkI7QUFDN0IsZ0RBQWdEO0FBQ2hELDRDQUFvQjtBQUNwQix1Q0FBb0M7QUFDcEMsd0RBQWdDO0FBRWhDLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFbkMsU0FBZ0IsUUFBUSxDQUFDLFFBQWtCLEVBQUUsR0FBZ0I7SUFDM0QsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzNCLElBQUksY0FBYyxHQUFHLEVBQWMsQ0FBQztJQUNwQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsMkJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUVoRCxNQUFNLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQVUsQ0FBQztJQUU5QyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDaEIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNyQixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdELE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDdkIsT0FBTyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQXNCLEdBQUcsQ0FBQyxFQUFFO1lB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QyxHQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3ZFLElBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUMvRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNoQjtnQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDSCxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixDQUFDLENBQUMsQ0FBQyxFQUNILEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLEdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQzdFLENBQUM7UUFDSixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFLLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0tBQ2Y7QUFDSCxDQUFDO0FBM0dELDRCQTJHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7V2F0Y2hPcHRpb259IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7YWN0aW9uRGlzcGF0Y2hlcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGFueW1hdGNoIGZyb20gJ2FueW1hdGNoJztcblxuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGknKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsaVdhdGNoKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0OiBXYXRjaE9wdGlvbikge1xuICBsZXQgaGFzVW5saW5rRXZlbnQgPSBmYWxzZTtcbiAgbGV0IGNoYW5nZWRQa2dKc29uID0gW10gYXMgc3RyaW5nW107XG4gIGNvbnN0IHBrZ3MgPSBbLi4uZmluZFBhY2thZ2VzQnlOYW1lcyhwYWNrYWdlcyldO1xuXG4gIGNvbnN0IGRlbGV0ZVBrZ01zZyA9IG5ldyByeC5TdWJqZWN0PHN0cmluZz4oKTtcblxuICByeC5mcm9tKHBrZ3MpLnBpcGUoXG4gICAgb3AuZmlsdGVyKChwa2csIGlkeCkgPT4ge1xuICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKGBDYW4gbm90IGZpbmQgc291cmNlIHBhY2thZ2Ugb2Y6ICR7cGFja2FnZXNbaWR4XX1gKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSksXG4gICAgb3AubWVyZ2VNYXAoKHBrZywgaWR4KSA9PiB7XG4gICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8J2NoYW5nZScgfCAndW5saW5rJz4oc3ViID0+IHtcbiAgICAgICAgLy8gbG9nLmluZm8ocGtnLnJlYWxQYXRoKTtcbiAgICAgICAgY29uc3QgcGtnSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUocGtnIS5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2gocGtnSnNvbkZpbGUpO1xuXG4gICAgICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIHBhdGggPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKHBhdGgsICdjaGFuZ2VkJyk7XG4gICAgICAgICAgLy8gaWYgKHBhdGggPT09IHBrZ0pzb25GaWxlKSB7XG4gICAgICAgICAgICBjaGFuZ2VkUGtnSnNvbi5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgc3ViLm5leHQoJ2NoYW5nZScpO1xuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgd2F0Y2hlci5vbigndW5saW5rJywgcGF0aCA9PiB7XG4gICAgICAgICAgLy8gaWYgKHBhdGggPT09IHBrZ0pzb25GaWxlKSB7XG4gICAgICAgICAgICBoYXNVbmxpbmtFdmVudCA9IHRydWU7XG4gICAgICAgICAgICBjaGFuZ2VkUGtnSnNvbi5zcGxpY2UoMCk7XG4gICAgICAgICAgICBkZWxldGVQa2dNc2cubmV4dChwa2chLm5hbWUpO1xuICAgICAgICAgICAgc3ViLm5leHQoJ3VubGluaycpO1xuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGVyLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9KSxcbiAgICBvcC5kZWJvdW5jZVRpbWUoMzAwKSxcbiAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgaWYgKGhhc1VubGlua0V2ZW50KSB7XG4gICAgICAgIGhhc1VubGlua0V2ZW50ID0gZmFsc2U7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7fSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmaWxlcyA9IGNoYW5nZWRQa2dKc29uO1xuICAgICAgICBjaGFuZ2VkUGtnSnNvbiA9IFtdO1xuICAgICAgICBsb2cuaW5mbyhmaWxlcyk7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7cGFja2FnZUpzb25GaWxlczogZmlsZXN9KTtcbiAgICAgIH1cbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGlmIChvcHQuY29weSkge1xuICAgIG1rZGlycFN5bmMob3B0LmNvcHkpO1xuICAgIC8vIGNvbnN0IGNvcHlUbyA9IFBhdGgucmVzb2x2ZShvcHQuY29weSk7XG4gICAgcnguZnJvbShwa2dzKS5waXBlKFxuICAgICAgb3AuZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbCksXG4gICAgICBvcC5tZXJnZU1hcCgocGtnLCBpZHgpID0+IHtcbiAgICAgICAgY29uc3QgbnBtSWdub3JlID0gUGF0aC5yZXNvbHZlKHBrZyEucmVhbFBhdGgsICcubnBtaWdub3JlJyk7XG4gICAgICAgIHJldHVybiAoZnMuZXhpc3RzU3luYyhucG1JZ25vcmUpID9cbiAgICAgICAgICByeC5mcm9tKGZzLnByb21pc2VzLnJlYWRGaWxlKG5wbUlnbm9yZSwgJ3V0Zi04JykpIDpcbiAgICAgICAgICByeC5vZignJylcbiAgICAgICAgKS5waXBlKFxuICAgICAgICAgIG9wLnN3aXRjaE1hcChjb250ZW50ID0+IG5ldyByeC5PYnNlcnZhYmxlPHN0cmluZz4oKHN1YikgPT4ge1xuICAgICAgICAgICAgZnVuY3Rpb24gbWF0Y2hOcG1JZ25vcmUocmVsYXRpdmVQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgbGV0IG1hdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoL1xcblxccj8vKSkge1xuICAgICAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoIWxpbmUuc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoYW55bWF0Y2goW2xpbmVdLCByZWxhdGl2ZVBhdGgpKVxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoZWQgJiYgYW55bWF0Y2goW2xpbmUuc2xpY2UoMSldLCByZWxhdGl2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiBwYXR0ZXJuIGJlZ2lucyB3aXRoICEgYW5kIG1hdGNoZWQgcHJldmlvdXMgcGF0dGVybiwgYW5kIG5vdyBpdCBtYXRjaGVzIHRoZSByZW1haW5kZXIgcGFydCBvZiBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICBtYXRjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2gocGtnIS5yZWFsUGF0aCk7XG5cbiAgICAgICAgICAgIHdhdGNoZXIub24oJ2FkZCcsIHBhdGggPT4ge1xuICAgICAgICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShwa2chLnJlYWxQYXRoLCBwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgICAgIGlmICggIW1hdGNoTnBtSWdub3JlKCcvJyArIHJlbFBhdGgpICYmICFtYXRjaE5wbUlnbm9yZShyZWxQYXRoKSkge1xuICAgICAgICAgICAgICAgIHN1Yi5uZXh0KHBhdGgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIHBhdGggPT4ge1xuICAgICAgICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShwa2chLnJlYWxQYXRoLCBwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgICAgIGlmICggIW1hdGNoTnBtSWdub3JlKCcvJyArIHJlbFBhdGgpICYmICFtYXRjaE5wbUlnbm9yZShyZWxQYXRoKSkge1xuICAgICAgICAgICAgICAgIHN1Yi5uZXh0KHBhdGgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGVyLmNsb3NlKCk7XG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIG9wLnRha2VVbnRpbChkZWxldGVQa2dNc2cucGlwZShvcC5maWx0ZXIocGtnTmFtZSA9PiBwa2dOYW1lID09PSBwa2chLm5hbWUpKSlcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdjb3B5JywgZmlsZSk7XG4gICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShmaWxlLCBvcHQuY29weSEpO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG59XG4iXX0=