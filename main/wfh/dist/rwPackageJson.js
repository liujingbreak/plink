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
exports.symbolicLinkPackages = void 0;
const fs = __importStar(require("fs-extra"));
const Path = __importStar(require("path"));
const log4js_1 = require("log4js");
const operators_1 = require("rxjs/operators");
const os_1 = __importDefault(require("os"));
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
                        (stat.isSymbolicLink() && isSymlinkTo(newPath, realPath))) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsbUNBQWlDO0FBRWpDLDhDQUFtQztBQUVuQyw0Q0FBb0I7QUFDcEIsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDN0MsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFcEQsU0FBZ0Isb0JBQW9CLENBQUMsT0FBZTtJQUNsRCxPQUFPLFVBQVMsR0FBaUQ7UUFDL0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUNiLElBQUEsZUFBRyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUUsRUFBRTtZQUN2QixJQUFJLE9BQWUsQ0FBQztZQUNwQixJQUFJLElBQTBCLENBQUM7WUFDL0IsSUFBSTtnQkFDRixPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLElBQUk7b0JBQ0YsSUFBSSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzlCO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLHNFQUFzRTtvQkFDdEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtxQkFDeEI7O3dCQUNDLE1BQU0sQ0FBQyxDQUFDO2lCQUNYO2dCQUVELElBQUksSUFBSSxFQUFFO29CQUNSLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTt3QkFDZixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7d0JBQzNELEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3ZCLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQ2xDO3lCQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFO3dCQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ3pFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3ZCLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQ2xDO2lCQUNGO3FCQUFNO29CQUNMLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQ2xDO2FBQ0Y7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hCO1FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUM7QUFwQ0Qsb0RBb0NDO0FBRUQsU0FBUyxXQUFXLENBQUMsT0FBZSxFQUFFLFFBQWdCO0lBQ3BELElBQUk7UUFDRixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDO0tBQzlDO0lBQUMsT0FBTyxFQUFFLEVBQUU7UUFDWCxPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEdBQVcsRUFBRSxJQUFTO0lBQzNDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0YsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnJ3UGFja2FnZUpzb24nKTtcbmNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN5bWJvbGljTGlua1BhY2thZ2VzKGRlc3REaXI6IHN0cmluZykge1xuICByZXR1cm4gZnVuY3Rpb24oc3JjOiBPYnNlcnZhYmxlPHtuYW1lOiBzdHJpbmc7IHJlYWxQYXRoOiBzdHJpbmd9Pikge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG1hcCgoe25hbWUsIHJlYWxQYXRofSkgPT4ge1xuICAgICAgICBsZXQgbmV3UGF0aDogc3RyaW5nO1xuICAgICAgICBsZXQgc3RhdDogZnMuU3RhdHMgfCB1bmRlZmluZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmV3UGF0aCA9IFBhdGguam9pbihkZXN0RGlyLCBuYW1lKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RhdCA9IGZzLmxzdGF0U3luYyhuZXdQYXRoKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHN0YXQpIHtcbiAgICAgICAgICAgIGlmIChzdGF0LmlzRmlsZSgpIHx8XG4gICAgICAgICAgICAgIChzdGF0LmlzU3ltYm9saWNMaW5rKCkgJiYgaXNTeW1saW5rVG8obmV3UGF0aCwgcmVhbFBhdGgpKSkge1xuICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdSZW1vdmUgaW5zdGFsbGVkIFwiJXNcIicsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgbmV3UGF0aCkpO1xuICAgICAgICAgICAgICBmcy5yZW1vdmVTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpc1N5bWxpbmtUbyhuZXdQYXRoOiBzdHJpbmcsIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMucmVhbHBhdGhTeW5jKG5ld1BhdGgpID09PSByZWFsUGF0aDtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3N5bWJvbGljTGluayhkaXI6IHN0cmluZywgbGluazogYW55KSB7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcbiAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGRpciksIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICBsb2cuaW5mbygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBsaW5rKSk7XG59XG5cbiJdfQ==