"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbolicLinkPackages = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs-extra"));
const Path = tslib_1.__importStar(require("path"));
const log4js_1 = require("log4js");
const operators_1 = require("rxjs/operators");
const os_1 = tslib_1.__importDefault(require("os"));
const log = (0, log4js_1.getLogger)('plink.rwPackageJson');
const isWin32 = os_1.default.platform().indexOf('win32') >= 0;
function symbolicLinkPackages(destDir) {
    return function (src) {
        return src.pipe((0, operators_1.map)(({ name, realPath }) => {
            let newPath;
            let stat;
            try {
                newPath = Path.join(destDir, name);
                try {
                    stat = fs.lstatSync(newPath);
                }
                catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (e.code === 'ENOENT') {
                    }
                    else
                        throw e;
                }
                if (stat) {
                    if (stat.isFile() ||
                        (stat.isSymbolicLink() && !isSymlinkTo(newPath, realPath))) {
                        fs.unlinkSync(newPath);
                        _symbolicLink(realPath, newPath);
                    }
                    else if (stat.isDirectory()) {
                        log.info('Remove installed "%s"', Path.relative(process.cwd(), newPath));
                        fs.removeSync(newPath);
                        _symbolicLink(realPath, newPath);
                    }
                }
                else {
                    _symbolicLink(realPath, newPath);
                }
            }
            catch (err) {
                log.error(err);
            }
        }));
    };
}
exports.symbolicLinkPackages = symbolicLinkPackages;
function isSymlinkTo(newPath, realPath) {
    try {
        return fs.realpathSync(newPath) === realPath;
    }
    catch (ex) {
        return false;
    }
}
function _symbolicLink(dir, link) {
    fs.mkdirpSync(Path.dirname(link));
    fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
    log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}
//# sourceMappingURL=rwPackageJson.js.map