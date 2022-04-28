"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXdhdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS13YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qiw0Q0FBb0I7QUFDcEIsbUNBQWlDO0FBQ2pDLG1EQUFxQztBQUNyQyx5Q0FBMkI7QUFDM0Isd0RBQWdDO0FBQ2hDLHVDQUFvQztBQUNwQyx3REFBZ0M7QUFDaEMsZ0RBQWdEO0FBQ2hELG1DQUE0QztBQUc1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsV0FBVyxDQUFDLENBQUM7QUFFbkMsU0FBZ0IsUUFBUSxDQUFDLFFBQWtCLEVBQUUsR0FBZ0I7SUFDM0QsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzNCLElBQUksY0FBYyxHQUFHLEVBQWMsQ0FBQztJQUNwQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBQSwyQkFBbUIsRUFBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRWhELE1BQU0sWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBVSxDQUFDO0lBRTlDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUNoQixFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3JCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0QsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN4QixPQUFPLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBc0IsR0FBRyxDQUFDLEVBQUU7WUFDbEQsMEJBQTBCO1lBQzFCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBSSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNoRSxNQUFNLE9BQU8sR0FBRyxrQkFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUVsQyxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzFCLDhCQUE4QjtnQkFDNUIsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckIsSUFBSTtZQUNOLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLDhCQUE4QjtnQkFDNUIsY0FBYyxHQUFHLElBQUksQ0FBQztnQkFDdEIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekIsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3JCLElBQUk7WUFDTixDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFDcEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7UUFDVixJQUFJLGNBQWMsRUFBRTtZQUNsQixjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQ3ZCLDhCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzFDO2FBQU07WUFDTCxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUM7WUFDN0IsY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLDhCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztTQUNqRTtJQUNILENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7SUFFZCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUU7UUFDWixJQUFBLHFCQUFVLEVBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLHlDQUF5QztRQUN6QyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDaEIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFDN0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2xCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBSSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM1RCxPQUFPLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQ1YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBbUIsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDbEUsU0FBUyxjQUFjLENBQUMsWUFBb0I7b0JBQzFDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztvQkFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUN6QyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQzs0QkFDMUIsU0FBUzt3QkFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTs0QkFDekIsSUFBSSxJQUFBLGtCQUFRLEVBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQUM7Z0NBQ2hDLE9BQU8sR0FBRyxJQUFJLENBQUM7eUJBQ2xCOzZCQUFNLElBQUksT0FBTyxJQUFJLElBQUEsa0JBQVEsRUFBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsRUFBRTs0QkFDN0QsMEdBQTBHOzRCQUMxRyxPQUFPLEdBQUcsS0FBSyxDQUFDO3lCQUNqQjtxQkFDRjtvQkFDRCxPQUFPLE9BQU8sQ0FBQztnQkFDakIsQ0FBQztnQkFFRCxNQUFNLE9BQU8sR0FBRyxrQkFBUSxDQUFDLEtBQUssQ0FBQyxHQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTlDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFO29CQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDdkUsSUFBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQy9ELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDakQ7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUN2RSxJQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRTt3QkFDL0QsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNqRDtnQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDSCxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixDQUFDLENBQUMsQ0FBQyxFQUNILEVBQUUsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLEdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQzdFLENBQUM7UUFDSixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRTtZQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMzQyxJQUFBLHFCQUFVLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDakIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBNkIsR0FBRyxDQUFDLEVBQUU7Z0JBQ3hFLE1BQU0sT0FBTyxHQUFHLGtCQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWhILE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFO29CQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDN0MsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQ25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQzFCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELENBQUMsQ0FBQyxDQUFDO2dCQUNILE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFDLEVBQ0gsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLElBQUEscUJBQVUsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQy9DLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7U0FDZjtLQUNGO0FBQ0gsQ0FBQztBQXhJRCw0QkF3SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgYW55bWF0Y2ggZnJvbSAnYW55bWF0Y2gnO1xuaW1wb3J0IHthY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtXYXRjaE9wdGlvbn0gZnJvbSAnLi90eXBlcyc7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGlXYXRjaChwYWNrYWdlczogc3RyaW5nW10sIG9wdDogV2F0Y2hPcHRpb24pIHtcbiAgbGV0IGhhc1VubGlua0V2ZW50ID0gZmFsc2U7XG4gIGxldCBjaGFuZ2VkUGtnSnNvbiA9IFtdIGFzIHN0cmluZ1tdO1xuICBjb25zdCBwa2dzID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMocGFja2FnZXMpXTtcblxuICBjb25zdCBkZWxldGVQa2dNc2cgPSBuZXcgcnguU3ViamVjdDxzdHJpbmc+KCk7XG5cbiAgcnguZnJvbShwa2dzKS5waXBlKFxuICAgIG9wLmZpbHRlcigocGtnLCBpZHgpID0+IHtcbiAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICBsb2cuaW5mbyhgQ2FuIG5vdCBmaW5kIHNvdXJjZSBwYWNrYWdlIG9mOiAke3BhY2thZ2VzW2lkeF19YCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pLFxuICAgIG9wLm1lcmdlTWFwKChwa2csIF9pZHgpID0+IHtcbiAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTwnY2hhbmdlJyB8ICd1bmxpbmsnPihzdWIgPT4ge1xuICAgICAgICAvLyBsb2cuaW5mbyhwa2cucmVhbFBhdGgpO1xuICAgICAgICBjb25zdCBwa2dKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwa2chLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChwa2dKc29uRmlsZSk7XG4gICAgICAgIGxvZy5pbmZvKCd3YXRjaGluZycsIHBrZ0pzb25GaWxlKTtcblxuICAgICAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCBwYXRoID0+IHtcbiAgICAgICAgICBsb2cuaW5mbyhwYXRoLCAnY2hhbmdlZCcpO1xuICAgICAgICAgIC8vIGlmIChwYXRoID09PSBwa2dKc29uRmlsZSkge1xuICAgICAgICAgICAgY2hhbmdlZFBrZ0pzb24ucHVzaChwYXRoKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KCdjaGFuZ2UnKTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHdhdGNoZXIub24oJ3VubGluaycsIHBhdGggPT4ge1xuICAgICAgICAgIC8vIGlmIChwYXRoID09PSBwa2dKc29uRmlsZSkge1xuICAgICAgICAgICAgaGFzVW5saW5rRXZlbnQgPSB0cnVlO1xuICAgICAgICAgICAgY2hhbmdlZFBrZ0pzb24uc3BsaWNlKDApO1xuICAgICAgICAgICAgZGVsZXRlUGtnTXNnLm5leHQocGtnIS5uYW1lKTtcbiAgICAgICAgICAgIHN1Yi5uZXh0KCd1bmxpbmsnKTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gKCkgPT4gd2F0Y2hlci5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfSksXG4gICAgb3AuZGVib3VuY2VUaW1lKDMwMCksXG4gICAgb3AubWFwKCgpID0+IHtcbiAgICAgIGlmIChoYXNVbmxpbmtFdmVudCkge1xuICAgICAgICBoYXNVbmxpbmtFdmVudCA9IGZhbHNlO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe30pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSBjaGFuZ2VkUGtnSnNvbjtcbiAgICAgICAgY2hhbmdlZFBrZ0pzb24gPSBbXTtcbiAgICAgICAgbG9nLmluZm8oZmlsZXMpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe3BhY2thZ2VKc29uRmlsZXM6IGZpbGVzfSk7XG4gICAgICB9XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBpZiAob3B0LmNvcHkpIHtcbiAgICBta2RpcnBTeW5jKG9wdC5jb3B5KTtcbiAgICAvLyBjb25zdCBjb3B5VG8gPSBQYXRoLnJlc29sdmUob3B0LmNvcHkpO1xuICAgIHJ4LmZyb20ocGtncykucGlwZShcbiAgICAgIG9wLmZpbHRlcihwa2cgPT4gcGtnICE9IG51bGwpLFxuICAgICAgb3AubWVyZ2VNYXAoKHBrZykgPT4ge1xuICAgICAgICBjb25zdCBucG1JZ25vcmUgPSBQYXRoLnJlc29sdmUocGtnIS5yZWFsUGF0aCwgJy5ucG1pZ25vcmUnKTtcbiAgICAgICAgcmV0dXJuIChmcy5leGlzdHNTeW5jKG5wbUlnbm9yZSkgP1xuICAgICAgICAgIHJ4LmZyb20oZnMucHJvbWlzZXMucmVhZEZpbGUobnBtSWdub3JlLCAndXRmLTgnKSkgOlxuICAgICAgICAgIHJ4Lm9mKCcnKVxuICAgICAgICApLnBpcGUoXG4gICAgICAgICAgb3Auc3dpdGNoTWFwKGNvbnRlbnQgPT4gbmV3IHJ4Lk9ic2VydmFibGU8W3N0cmluZywgc3RyaW5nXT4oKHN1YikgPT4ge1xuICAgICAgICAgICAgZnVuY3Rpb24gbWF0Y2hOcG1JZ25vcmUocmVsYXRpdmVQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgbGV0IG1hdGNoZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGNvbnRlbnQuc3BsaXQoL1xcblxccj8vKSkge1xuICAgICAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoIWxpbmUuc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoYW55bWF0Y2goW2xpbmVdLCByZWxhdGl2ZVBhdGgpKVxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoZWQgJiYgYW55bWF0Y2goW2xpbmUuc2xpY2UoMSldLCByZWxhdGl2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiBwYXR0ZXJuIGJlZ2lucyB3aXRoICEgYW5kIG1hdGNoZWQgcHJldmlvdXMgcGF0dGVybiwgYW5kIG5vdyBpdCBtYXRjaGVzIHRoZSByZW1haW5kZXIgcGFydCBvZiBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICBtYXRjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2gocGtnIS5yZWFsUGF0aCk7XG5cbiAgICAgICAgICAgIHdhdGNoZXIub24oJ2FkZCcsIHBhdGggPT4ge1xuICAgICAgICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShwa2chLnJlYWxQYXRoLCBwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgICAgIGlmICggIW1hdGNoTnBtSWdub3JlKCcvJyArIHJlbFBhdGgpICYmICFtYXRjaE5wbUlnbm9yZShyZWxQYXRoKSkge1xuICAgICAgICAgICAgICAgIHN1Yi5uZXh0KFtwYXRoLCBQYXRoLmpvaW4ocGtnIS5uYW1lLCByZWxQYXRoKV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIHBhdGggPT4ge1xuICAgICAgICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShwa2chLnJlYWxQYXRoLCBwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgICAgICAgIGlmICggIW1hdGNoTnBtSWdub3JlKCcvJyArIHJlbFBhdGgpICYmICFtYXRjaE5wbUlnbm9yZShyZWxQYXRoKSkge1xuICAgICAgICAgICAgICAgIHN1Yi5uZXh0KFtwYXRoLCBQYXRoLmpvaW4ocGtnIS5uYW1lLCByZWxQYXRoKV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiAoKSA9PiB3YXRjaGVyLmNsb3NlKCk7XG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIG9wLnRha2VVbnRpbChkZWxldGVQa2dNc2cucGlwZShvcC5maWx0ZXIocGtnTmFtZSA9PiBwa2dOYW1lID09PSBwa2chLm5hbWUpKSlcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgb3AubWVyZ2VNYXAoKFtzcmNGaWxlLCByZWxQYXRoXSkgPT4ge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUob3B0LmNvcHkhLCByZWxQYXRoKTtcbiAgICAgICAgbG9nLmluZm8oJ2NvcHknLCBzcmNGaWxlLCAndG9cXG4gJywgdGFyZ2V0KTtcbiAgICAgICAgbWtkaXJwU3luYyhQYXRoLmRpcm5hbWUodGFyZ2V0KSk7XG4gICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShzcmNGaWxlLCB0YXJnZXQpO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgaWYgKG9wdC5hICYmIG9wdC5hLmxlbmd0aCA+IDApIHtcbiAgICAgIGxvZy5pbmZvKCdhZGRpdGlvbmFsIHdhdGNoZXM6Jywgb3B0LmEpO1xuICAgICAgcnguZnJvbShvcHQuYSkucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoc291cmNlID0+IG5ldyByeC5PYnNlcnZhYmxlPFtmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmddPihzdWIgPT4ge1xuICAgICAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChvcHQuaW5jbHVkZSA/IFBhdGgucG9zaXguam9pbihzb3VyY2UucmVwbGFjZSgvXFxcXC9nLCAnLycpLCBvcHQuaW5jbHVkZSkgOiBzb3VyY2UpO1xuXG4gICAgICAgICAgd2F0Y2hlci5vbignYWRkJywgcGF0aCA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWxhdGl2ZSA9IFBhdGgucmVsYXRpdmUoc291cmNlLCBwYXRoKTtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdjaG9raWRhciBhZGQnLCByZWxhdGl2ZSk7XG4gICAgICAgICAgICBzdWIubmV4dChbcGF0aCwgUGF0aC5qb2luKG9wdC5jb3B5ISwgcmVsYXRpdmUpXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgd2F0Y2hlci5vbignY2hhbmdlJywgcGF0aCA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWxhdGl2ZSA9IFBhdGgucmVsYXRpdmUoc291cmNlLCBwYXRoKTtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdjaG9raWRhciBjaGFuZ2UnLCByZWxhdGl2ZSk7XG4gICAgICAgICAgICBzdWIubmV4dChbcGF0aCwgUGF0aC5qb2luKG9wdC5jb3B5ISwgcmVsYXRpdmUpXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuICgpID0+IHdhdGNoZXIuY2xvc2UoKTtcbiAgICAgICAgfSkpLFxuICAgICAgICBvcC5tZXJnZU1hcCgoW3NyY0ZpbGUsIHRhcmdldF0pID0+IHtcbiAgICAgICAgICBsb2cuaW5mbygnY29weScsIHNyY0ZpbGUsICd0b1xcbiAnLCB0YXJnZXQpO1xuICAgICAgICAgIG1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHRhcmdldCkpO1xuICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShzcmNGaWxlLCB0YXJnZXQpO1xuICAgICAgICB9KVxuICAgICAgKS5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==