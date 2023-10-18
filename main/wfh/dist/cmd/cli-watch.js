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
//# sourceMappingURL=cli-watch.js.map