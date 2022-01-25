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
const Path = __importStar(require("path"));
const fs_1 = __importDefault(require("fs"));
const log4js_1 = require("log4js");
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
const chokidar_1 = __importDefault(require("chokidar"));
const fs_extra_1 = require("fs-extra");
const anymatch_1 = __importDefault(require("anymatch"));
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const log = (0, log4js_1.getLogger)('plink.cli');
function cliWatch(packages, opt) {
    let hasUnlinkEvent = false;
    let changedPkgJson = [];
    const pkgs = [...(0, utils_1.findPackagesByNames)(packages)];
    const deletePkgMsg = new rx.Subject();
    rx.from(pkgs).pipe(op.filter((pkg, idx) => {
        if (pkg == null) {
            log.info(`Can not find source package of: ${packages[idx]}`);
            return false;
        }
        return true;
    }), op.mergeMap((pkg, _idx) => {
        return new rx.Observable(sub => {
            // log.info(pkg.realPath);
            const pkgJsonFile = Path.resolve(pkg.realPath, 'package.json');
            const watcher = chokidar_1.default.watch(pkgJsonFile);
            log.info('watching', pkgJsonFile);
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
        (0, fs_extra_1.mkdirpSync)(opt.copy);
        // const copyTo = Path.resolve(opt.copy);
        rx.from(pkgs).pipe(op.filter(pkg => pkg != null), op.mergeMap((pkg) => {
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
                            if ((0, anymatch_1.default)([line], relativePath))
                                matched = true;
                        }
                        else if (matched && (0, anymatch_1.default)([line.slice(1)], relativePath)) {
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
                        sub.next([path, Path.join(pkg.name, relPath)]);
                    }
                });
                watcher.on('change', path => {
                    const relPath = Path.relative(pkg.realPath, path).replace(/\\/g, '/');
                    if (!matchNpmIgnore('/' + relPath) && !matchNpmIgnore(relPath)) {
                        sub.next([path, Path.join(pkg.name, relPath)]);
                    }
                });
                return () => watcher.close();
            })), op.takeUntil(deletePkgMsg.pipe(op.filter(pkgName => pkgName === pkg.name))));
        }), op.mergeMap(([srcFile, relPath]) => {
            const target = Path.resolve(opt.copy, relPath);
            log.info('copy', srcFile, 'to\n ', target);
            (0, fs_extra_1.mkdirpSync)(Path.dirname(target));
            return fs_1.default.promises.copyFile(srcFile, target);
        })).subscribe();
        if (opt.a && opt.a.length > 0) {
            log.info('additional watches:', opt.a);
            rx.from(opt.a).pipe(op.mergeMap(source => new rx.Observable(sub => {
                const watcher = chokidar_1.default.watch(opt.include ? Path.posix.join(source.replace(/\\/g, '/'), opt.include) : source);
                watcher.on('add', path => {
                    const relative = Path.relative(source, path);
                    log.info('chokidar add', relative);
                    sub.next([path, Path.join(opt.copy, relative)]);
                });
                watcher.on('change', path => {
                    const relative = Path.relative(source, path);
                    log.info('chokidar change', relative);
                    sub.next([path, Path.join(opt.copy, relative)]);
                });
                return () => watcher.close();
            })), op.mergeMap(([srcFile, target]) => {
                log.info('copy', srcFile, 'to\n ', target);
                (0, fs_extra_1.mkdirpSync)(Path.dirname(target));
                return fs_1.default.promises.copyFile(srcFile, target);
            })).subscribe();
        }
    }
}
exports.cliWatch = cliWatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXdhdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS13YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixtQ0FBaUM7QUFDakMsbURBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQix3REFBZ0M7QUFDaEMsdUNBQW9DO0FBQ3BDLHdEQUFnQztBQUNoQyxnREFBZ0Q7QUFDaEQsbUNBQTRDO0FBRzVDLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxXQUFXLENBQUMsQ0FBQztBQUVuQyxTQUFnQixRQUFRLENBQUMsUUFBa0IsRUFBRSxHQUFnQjtJQUMzRCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFDM0IsSUFBSSxjQUFjLEdBQUcsRUFBYyxDQUFDO0lBQ3BDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFBLDJCQUFtQixFQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFaEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFVLENBQUM7SUFFOUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2hCLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDckIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3RCxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3hCLE9BQU8sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFzQixHQUFHLENB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QkFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRTtvQkFDMUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsQ0FBQyxDQUFDLENBQUMsRUFDSCxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRTtnQkFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0MsSUFBQSxxQkFBVSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDakMsT0FBTyxZQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDL0MsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNmO0tBQ0Y7QUFDSCxDQUFDO0FBeElELDRCQXdJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCBjaG9raWRhciBmcm9tICdjaG9raWRhcic7XG5pbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBhbnltYXRjaCBmcm9tICdhbnltYXRjaCc7XG5pbXBvcnQge2FjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1dhdGNoT3B0aW9ufSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGknKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsaVdhdGNoKHBhY2thZ2VzOiBzdHJpbmdbXSwgb3B0OiBXYXRjaE9wdGlvbikge1xuICBsZXQgaGFzVW5saW5rRXZlbnQgPSBmYWxzZTtcbiAgbGV0IGNoYW5nZWRQa2dKc29uID0gW10gYXMgc3RyaW5nW107XG4gIGNvbnN0IHBrZ3MgPSBbLi4uZmluZFBhY2thZ2VzQnlOYW1lcyhwYWNrYWdlcyldO1xuXG4gIGNvbnN0IGRlbGV0ZVBrZ01zZyA9IG5ldyByeC5TdWJqZWN0PHN0cmluZz4oKTtcblxuICByeC5mcm9tKHBrZ3MpLnBpcGUoXG4gICAgb3AuZmlsdGVyKChwa2csIGlkeCkgPT4ge1xuICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgIGxvZy5pbmZvKGBDYW4gbm90IGZpbmQgc291cmNlIHBhY2thZ2Ugb2Y6ICR7cGFja2FnZXNbaWR4XX1gKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSksXG4gICAgb3AubWVyZ2VNYXAoKHBrZywgX2lkeCkgPT4ge1xuICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPCdjaGFuZ2UnIHwgJ3VubGluayc+KHN1YiA9PiB7XG4gICAgICAgIC8vIGxvZy5pbmZvKHBrZy5yZWFsUGF0aCk7XG4gICAgICAgIGNvbnN0IHBrZ0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHBrZyEucmVhbFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHBrZ0pzb25GaWxlKTtcbiAgICAgICAgbG9nLmluZm8oJ3dhdGNoaW5nJywgcGtnSnNvbkZpbGUpO1xuXG4gICAgICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIHBhdGggPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKHBhdGgsICdjaGFuZ2VkJyk7XG4gICAgICAgICAgLy8gaWYgKHBhdGggPT09IHBrZ0pzb25GaWxlKSB7XG4gICAgICAgICAgICBjaGFuZ2VkUGtnSnNvbi5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgc3ViLm5leHQoJ2NoYW5nZScpO1xuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgd2F0Y2hlci5vbigndW5saW5rJywgcGF0aCA9PiB7XG4gICAgICAgICAgLy8gaWYgKHBhdGggPT09IHBrZ0pzb25GaWxlKSB7XG4gICAgICAgICAgICBoYXNVbmxpbmtFdmVudCA9IHRydWU7XG4gICAgICAgICAgICBjaGFuZ2VkUGtnSnNvbi5zcGxpY2UoMCk7XG4gICAgICAgICAgICBkZWxldGVQa2dNc2cubmV4dChwa2chLm5hbWUpO1xuICAgICAgICAgICAgc3ViLm5leHQoJ3VubGluaycpO1xuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGVyLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9KSxcbiAgICBvcC5kZWJvdW5jZVRpbWUoMzAwKSxcbiAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgaWYgKGhhc1VubGlua0V2ZW50KSB7XG4gICAgICAgIGhhc1VubGlua0V2ZW50ID0gZmFsc2U7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7fSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmaWxlcyA9IGNoYW5nZWRQa2dKc29uO1xuICAgICAgICBjaGFuZ2VkUGtnSnNvbiA9IFtdO1xuICAgICAgICBsb2cuaW5mbyhmaWxlcyk7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7cGFja2FnZUpzb25GaWxlczogZmlsZXN9KTtcbiAgICAgIH1cbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGlmIChvcHQuY29weSkge1xuICAgIG1rZGlycFN5bmMob3B0LmNvcHkpO1xuICAgIC8vIGNvbnN0IGNvcHlUbyA9IFBhdGgucmVzb2x2ZShvcHQuY29weSk7XG4gICAgcnguZnJvbShwa2dzKS5waXBlKFxuICAgICAgb3AuZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbCksXG4gICAgICBvcC5tZXJnZU1hcCgocGtnKSA9PiB7XG4gICAgICAgIGNvbnN0IG5wbUlnbm9yZSA9IFBhdGgucmVzb2x2ZShwa2chLnJlYWxQYXRoLCAnLm5wbWlnbm9yZScpO1xuICAgICAgICByZXR1cm4gKGZzLmV4aXN0c1N5bmMobnBtSWdub3JlKSA/XG4gICAgICAgICAgcnguZnJvbShmcy5wcm9taXNlcy5yZWFkRmlsZShucG1JZ25vcmUsICd1dGYtOCcpKSA6XG4gICAgICAgICAgcngub2YoJycpXG4gICAgICAgICkucGlwZShcbiAgICAgICAgICBvcC5zd2l0Y2hNYXAoY29udGVudCA9PiBuZXcgcnguT2JzZXJ2YWJsZTxbc3RyaW5nLCBzdHJpbmddPigoc3ViKSA9PiB7XG4gICAgICAgICAgICBmdW5jdGlvbiBtYXRjaE5wbUlnbm9yZShyZWxhdGl2ZVBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgICBsZXQgbWF0Y2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgvXFxuXFxyPy8pKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmICghbGluZS5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChhbnltYXRjaChbbGluZV0sIHJlbGF0aXZlUGF0aCkpXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2hlZCAmJiBhbnltYXRjaChbbGluZS5zbGljZSgxKV0sIHJlbGF0aXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIElmIHBhdHRlcm4gYmVnaW5zIHdpdGggISBhbmQgbWF0Y2hlZCBwcmV2aW91cyBwYXR0ZXJuLCBhbmQgbm93IGl0IG1hdGNoZXMgdGhlIHJlbWFpbmRlciBwYXJ0IG9mIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChwa2chLnJlYWxQYXRoKTtcblxuICAgICAgICAgICAgd2F0Y2hlci5vbignYWRkJywgcGF0aCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHBrZyEucmVhbFBhdGgsIHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAgICAgaWYgKCAhbWF0Y2hOcG1JZ25vcmUoJy8nICsgcmVsUGF0aCkgJiYgIW1hdGNoTnBtSWdub3JlKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc3ViLm5leHQoW3BhdGgsIFBhdGguam9pbihwa2chLm5hbWUsIHJlbFBhdGgpXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2F0Y2hlci5vbignY2hhbmdlJywgcGF0aCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHBrZyEucmVhbFBhdGgsIHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAgICAgaWYgKCAhbWF0Y2hOcG1JZ25vcmUoJy8nICsgcmVsUGF0aCkgJiYgIW1hdGNoTnBtSWdub3JlKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc3ViLm5leHQoW3BhdGgsIFBhdGguam9pbihwa2chLm5hbWUsIHJlbFBhdGgpXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IHdhdGNoZXIuY2xvc2UoKTtcbiAgICAgICAgICB9KSksXG4gICAgICAgICAgb3AudGFrZVVudGlsKGRlbGV0ZVBrZ01zZy5waXBlKG9wLmZpbHRlcihwa2dOYW1lID0+IHBrZ05hbWUgPT09IHBrZyEubmFtZSkpKVxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgICBvcC5tZXJnZU1hcCgoW3NyY0ZpbGUsIHJlbFBhdGhdKSA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShvcHQuY29weSEsIHJlbFBhdGgpO1xuICAgICAgICBsb2cuaW5mbygnY29weScsIHNyY0ZpbGUsICd0b1xcbiAnLCB0YXJnZXQpO1xuICAgICAgICBta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0YXJnZXQpKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLmNvcHlGaWxlKHNyY0ZpbGUsIHRhcmdldCk7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICBpZiAob3B0LmEgJiYgb3B0LmEubGVuZ3RoID4gMCkge1xuICAgICAgbG9nLmluZm8oJ2FkZGl0aW9uYWwgd2F0Y2hlczonLCBvcHQuYSk7XG4gICAgICByeC5mcm9tKG9wdC5hKS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChzb3VyY2UgPT4gbmV3IHJ4Lk9ic2VydmFibGU8W2Zyb206IHN0cmluZywgdG86IHN0cmluZ10+KHN1YiA9PiB7XG4gICAgICAgICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKG9wdC5pbmNsdWRlID8gUGF0aC5wb3NpeC5qb2luKHNvdXJjZS5yZXBsYWNlKC9cXFxcL2csICcvJyksIG9wdC5pbmNsdWRlKSA6IHNvdXJjZSk7XG5cbiAgICAgICAgICB3YXRjaGVyLm9uKCdhZGQnLCBwYXRoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlID0gUGF0aC5yZWxhdGl2ZShzb3VyY2UsIHBhdGgpO1xuICAgICAgICAgICAgbG9nLmluZm8oJ2Nob2tpZGFyIGFkZCcsIHJlbGF0aXZlKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KFtwYXRoLCBQYXRoLmpvaW4ob3B0LmNvcHkhLCByZWxhdGl2ZSldKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCBwYXRoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlID0gUGF0aC5yZWxhdGl2ZShzb3VyY2UsIHBhdGgpO1xuICAgICAgICAgICAgbG9nLmluZm8oJ2Nob2tpZGFyIGNoYW5nZScsIHJlbGF0aXZlKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KFtwYXRoLCBQYXRoLmpvaW4ob3B0LmNvcHkhLCByZWxhdGl2ZSldKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gKCkgPT4gd2F0Y2hlci5jbG9zZSgpO1xuICAgICAgICB9KSksXG4gICAgICAgIG9wLm1lcmdlTWFwKChbc3JjRmlsZSwgdGFyZ2V0XSkgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKCdjb3B5Jywgc3JjRmlsZSwgJ3RvXFxuICcsIHRhcmdldCk7XG4gICAgICAgICAgbWtkaXJwU3luYyhQYXRoLmRpcm5hbWUodGFyZ2V0KSk7XG4gICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLmNvcHlGaWxlKHNyY0ZpbGUsIHRhcmdldCk7XG4gICAgICAgIH0pXG4gICAgICApLnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxufVxuIl19