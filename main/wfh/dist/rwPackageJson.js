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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsbUNBQWlDO0FBRWpDLDhDQUFtQztBQUVuQyw0Q0FBb0I7QUFDcEIsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDN0MsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFcEQsU0FBZ0Isb0JBQW9CLENBQUMsT0FBZTtJQUNsRCxPQUFPLFVBQVMsR0FBaUQ7UUFDL0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUNiLElBQUEsZUFBRyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUUsRUFBRTtZQUN2QixJQUFJLE9BQWUsQ0FBQztZQUNwQixJQUFJLElBQTBCLENBQUM7WUFDL0IsSUFBSTtnQkFDRixPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLElBQUk7b0JBQ0YsSUFBSSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzlCO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLHNFQUFzRTtvQkFDdEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtxQkFDeEI7O3dCQUNDLE1BQU0sQ0FBQyxDQUFDO2lCQUNYO2dCQUVELElBQUksSUFBSSxFQUFFO29CQUNSLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTt3QkFDZixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTt3QkFDNUQsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDdkIsYUFBYSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDbEM7eUJBQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7d0JBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDekUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDdkIsYUFBYSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0Y7cUJBQU07b0JBQ0wsYUFBYSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztpQkFDbEM7YUFDRjtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXBDRCxvREFvQ0M7QUFFRCxTQUFTLFdBQVcsQ0FBQyxPQUFlLEVBQUUsUUFBZ0I7SUFDcEQsSUFBSTtRQUNGLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUM7S0FDOUM7SUFBQyxPQUFPLEVBQUUsRUFBRTtRQUNYLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBVyxFQUFFLElBQVM7SUFDM0MsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzRixHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucndQYWNrYWdlSnNvbicpO1xuY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gc3ltYm9saWNMaW5rUGFja2FnZXMoZGVzdERpcjogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IE9ic2VydmFibGU8e25hbWU6IHN0cmluZzsgcmVhbFBhdGg6IHN0cmluZ30+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgbWFwKCh7bmFtZSwgcmVhbFBhdGh9KSA9PiB7XG4gICAgICAgIGxldCBuZXdQYXRoOiBzdHJpbmc7XG4gICAgICAgIGxldCBzdGF0OiBmcy5TdGF0cyB8IHVuZGVmaW5lZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBuZXdQYXRoID0gUGF0aC5qb2luKGRlc3REaXIsIG5hbWUpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGF0ID0gZnMubHN0YXRTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RhdCkge1xuICAgICAgICAgICAgaWYgKHN0YXQuaXNGaWxlKCkgfHxcbiAgICAgICAgICAgICAgKHN0YXQuaXNTeW1ib2xpY0xpbmsoKSAmJiAhaXNTeW1saW5rVG8obmV3UGF0aCwgcmVhbFBhdGgpKSkge1xuICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdSZW1vdmUgaW5zdGFsbGVkIFwiJXNcIicsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgbmV3UGF0aCkpO1xuICAgICAgICAgICAgICBmcy5yZW1vdmVTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpc1N5bWxpbmtUbyhuZXdQYXRoOiBzdHJpbmcsIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMucmVhbHBhdGhTeW5jKG5ld1BhdGgpID09PSByZWFsUGF0aDtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3N5bWJvbGljTGluayhkaXI6IHN0cmluZywgbGluazogYW55KSB7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcbiAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGRpciksIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICBsb2cuaW5mbygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBsaW5rKSk7XG59XG5cbiJdfQ==