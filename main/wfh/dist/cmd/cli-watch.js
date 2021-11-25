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
    }), op.mergeMap((pkg, idx) => {
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
    }
}
exports.cliWatch = cliWatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXdhdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS13YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixtQ0FBaUM7QUFDakMsbURBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQix3REFBZ0M7QUFDaEMsdUNBQW9DO0FBQ3BDLHdEQUFnQztBQUNoQyxnREFBZ0Q7QUFDaEQsbUNBQTRDO0FBRzVDLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxXQUFXLENBQUMsQ0FBQztBQUVuQyxTQUFnQixRQUFRLENBQUMsUUFBa0IsRUFBRSxHQUFnQjtJQUMzRCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFDM0IsSUFBSSxjQUFjLEdBQUcsRUFBYyxDQUFDO0lBQ3BDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFBLDJCQUFtQixFQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFaEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFVLENBQUM7SUFFOUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2hCLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDckIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3RCxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3ZCLE9BQU8sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFzQixHQUFHLENBQUMsRUFBRTtZQUNsRCwwQkFBMEI7WUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFJLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sT0FBTyxHQUFHLGtCQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBRWxDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUMxQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDMUIsOEJBQThCO2dCQUM1QixjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNyQixJQUFJO1lBQ04sQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDMUIsOEJBQThCO2dCQUM1QixjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUN0QixjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QixZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckIsSUFBSTtZQUNOLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUNwQixFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtRQUNWLElBQUksY0FBYyxFQUFFO1lBQ2xCLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDdkIsOEJBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDMUM7YUFBTTtZQUNMLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQztZQUM3QixjQUFjLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsOEJBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1NBQ2pFO0lBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVkLElBQUksR0FBRyxDQUFDLElBQUksRUFBRTtRQUNaLElBQUEscUJBQVUsRUFBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIseUNBQXlDO1FBQ3pDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUNoQixFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUM3QixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3ZCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBSSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM1RCxPQUFPLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQ1YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBbUIsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDbEUsU0FBUyxjQUFjLENBQUMsWUFBb0I7b0JBQzFDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztvQkFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUN6QyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQzs0QkFDMUIsU0FBUzt3QkFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTs0QkFDekIsSUFBSSxJQUFBLGtCQUFRLEVBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUM7Z0NBQ2hDLE9BQU8sR0FBRyxJQUFJLENBQUM7eUJBQ2xCOzZCQUFNLElBQUksT0FBTyxJQUFJLElBQUEsa0JBQVEsRUFBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsRUFBRTs0QkFDN0QsMEdBQTBHOzRCQUMxRyxPQUFPLEdBQUcsS0FBSyxDQUFDO3lCQUNqQjtxQkFDRjtvQkFDRCxPQUFPLE9BQU8sQ0FBQztnQkFDakIsQ0FBQztnQkFFRCxNQUFNLE9BQU8sR0FBRyxrQkFBUSxDQUFDLEtBQUssQ0FBQyxHQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTlDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFO29CQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDdkUsSUFBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQy9ELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDakQ7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUN2RSxJQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRTt3QkFDL0QsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNqRDtnQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDSCxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixDQUFDLENBQUMsQ0FBQyxFQUNILEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLEdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQzdFLENBQUM7UUFDSixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRTtZQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMzQyxJQUFBLHFCQUFVLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7S0FDZjtBQUNILENBQUM7QUE5R0QsNEJBOEdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJztcbmltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGFueW1hdGNoIGZyb20gJ2FueW1hdGNoJztcbmltcG9ydCB7YWN0aW9uRGlzcGF0Y2hlcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7V2F0Y2hPcHRpb259IGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaScpO1xuXG5leHBvcnQgZnVuY3Rpb24gY2xpV2F0Y2gocGFja2FnZXM6IHN0cmluZ1tdLCBvcHQ6IFdhdGNoT3B0aW9uKSB7XG4gIGxldCBoYXNVbmxpbmtFdmVudCA9IGZhbHNlO1xuICBsZXQgY2hhbmdlZFBrZ0pzb24gPSBbXSBhcyBzdHJpbmdbXTtcbiAgY29uc3QgcGtncyA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKHBhY2thZ2VzKV07XG5cbiAgY29uc3QgZGVsZXRlUGtnTXNnID0gbmV3IHJ4LlN1YmplY3Q8c3RyaW5nPigpO1xuXG4gIHJ4LmZyb20ocGtncykucGlwZShcbiAgICBvcC5maWx0ZXIoKHBrZywgaWR4KSA9PiB7XG4gICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgbG9nLmluZm8oYENhbiBub3QgZmluZCBzb3VyY2UgcGFja2FnZSBvZjogJHtwYWNrYWdlc1tpZHhdfWApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KSxcbiAgICBvcC5tZXJnZU1hcCgocGtnLCBpZHgpID0+IHtcbiAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTwnY2hhbmdlJyB8ICd1bmxpbmsnPihzdWIgPT4ge1xuICAgICAgICAvLyBsb2cuaW5mbyhwa2cucmVhbFBhdGgpO1xuICAgICAgICBjb25zdCBwa2dKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwa2chLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChwa2dKc29uRmlsZSk7XG4gICAgICAgIGxvZy5pbmZvKCd3YXRjaGluZycsIHBrZ0pzb25GaWxlKTtcblxuICAgICAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCBwYXRoID0+IHtcbiAgICAgICAgICBsb2cuaW5mbyhwYXRoLCAnY2hhbmdlZCcpO1xuICAgICAgICAgIC8vIGlmIChwYXRoID09PSBwa2dKc29uRmlsZSkge1xuICAgICAgICAgICAgY2hhbmdlZFBrZ0pzb24ucHVzaChwYXRoKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KCdjaGFuZ2UnKTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHdhdGNoZXIub24oJ3VubGluaycsIHBhdGggPT4ge1xuICAgICAgICAgIC8vIGlmIChwYXRoID09PSBwa2dKc29uRmlsZSkge1xuICAgICAgICAgICAgaGFzVW5saW5rRXZlbnQgPSB0cnVlO1xuICAgICAgICAgICAgY2hhbmdlZFBrZ0pzb24uc3BsaWNlKDApO1xuICAgICAgICAgICAgZGVsZXRlUGtnTXNnLm5leHQocGtnIS5uYW1lKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KCd1bmxpbmsnKTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gKCkgPT4gd2F0Y2hlci5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfSksXG4gICAgb3AuZGVib3VuY2VUaW1lKDMwMCksXG4gICAgb3AubWFwKCgpID0+IHtcbiAgICAgIGlmIChoYXNVbmxpbmtFdmVudCkge1xuICAgICAgICBoYXNVbmxpbmtFdmVudCA9IGZhbHNlO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSBjaGFuZ2VkUGtnSnNvbjtcbiAgICAgICAgY2hhbmdlZFBrZ0pzb24gPSBbXTtcbiAgICAgICAgbG9nLmluZm8oZmlsZXMpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe3BhY2thZ2VKc29uRmlsZXM6IGZpbGVzfSk7XG4gICAgICB9XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBpZiAob3B0LmNvcHkpIHtcbiAgICBta2RpcnBTeW5jKG9wdC5jb3B5KTtcbiAgICAvLyBjb25zdCBjb3B5VG8gPSBQYXRoLnJlc29sdmUob3B0LmNvcHkpO1xuICAgIHJ4LmZyb20ocGtncykucGlwZShcbiAgICAgIG9wLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpLFxuICAgICAgb3AubWVyZ2VNYXAoKHBrZywgaWR4KSA9PiB7XG4gICAgICAgIGNvbnN0IG5wbUlnbm9yZSA9IFBhdGgucmVzb2x2ZShwa2chLnJlYWxQYXRoLCAnLm5wbWlnbm9yZScpO1xuICAgICAgICByZXR1cm4gKGZzLmV4aXN0c1N5bmMobnBtSWdub3JlKSA/XG4gICAgICAgICAgcnguZnJvbShmcy5wcm9taXNlcy5yZWFkRmlsZShucG1JZ25vcmUsICd1dGYtOCcpKSA6XG4gICAgICAgICAgcngub2YoJycpXG4gICAgICAgICkucGlwZShcbiAgICAgICAgICBvcC5zd2l0Y2hNYXAoY29udGVudCA9PiBuZXcgcnguT2JzZXJ2YWJsZTxbc3RyaW5nLCBzdHJpbmddPigoc3ViKSA9PiB7XG4gICAgICAgICAgICBmdW5jdGlvbiBtYXRjaE5wbUlnbm9yZShyZWxhdGl2ZVBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgICBsZXQgbWF0Y2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29udGVudC5zcGxpdCgvXFxuXFxyPy8pKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmICghbGluZS5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChhbnltYXRjaChbbGluZV0sIHJlbGF0aXZlUGF0aCkpXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2hlZCAmJiBhbnltYXRjaChbbGluZS5zbGljZSgxKV0sIHJlbGF0aXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIElmIHBhdHRlcm4gYmVnaW5zIHdpdGggISBhbmQgbWF0Y2hlZCBwcmV2aW91cyBwYXR0ZXJuLCBhbmQgbm93IGl0IG1hdGNoZXMgdGhlIHJlbWFpbmRlciBwYXJ0IG9mIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChwa2chLnJlYWxQYXRoKTtcblxuICAgICAgICAgICAgd2F0Y2hlci5vbignYWRkJywgcGF0aCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHBrZyEucmVhbFBhdGgsIHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAgICAgaWYgKCAhbWF0Y2hOcG1JZ25vcmUoJy8nICsgcmVsUGF0aCkgJiYgIW1hdGNoTnBtSWdub3JlKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc3ViLm5leHQoW3BhdGgsIFBhdGguam9pbihwa2chLm5hbWUsIHJlbFBhdGgpXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2F0Y2hlci5vbignY2hhbmdlJywgcGF0aCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHBrZyEucmVhbFBhdGgsIHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgICAgICAgaWYgKCAhbWF0Y2hOcG1JZ25vcmUoJy8nICsgcmVsUGF0aCkgJiYgIW1hdGNoTnBtSWdub3JlKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc3ViLm5leHQoW3BhdGgsIFBhdGguam9pbihwa2chLm5hbWUsIHJlbFBhdGgpXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuICgpID0+IHdhdGNoZXIuY2xvc2UoKTtcbiAgICAgICAgICB9KSksXG4gICAgICAgICAgb3AudGFrZVVudGlsKGRlbGV0ZVBrZ01zZy5waXBlKG9wLmZpbHRlcihwa2dOYW1lID0+IHBrZ05hbWUgPT09IHBrZyEubmFtZSkpKVxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgICBvcC5tZXJnZU1hcCgoW3NyY0ZpbGUsIHJlbFBhdGhdKSA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShvcHQuY29weSEsIHJlbFBhdGgpO1xuICAgICAgICBsb2cuaW5mbygnY29weScsIHNyY0ZpbGUsICd0b1xcbiAnLCB0YXJnZXQpO1xuICAgICAgICBta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0YXJnZXQpKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLmNvcHlGaWxlKHNyY0ZpbGUsIHRhcmdldCk7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cbn1cbiJdfQ==