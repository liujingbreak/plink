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
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbolicLinkPackages = void 0;
const fs = __importStar(require("fs-extra"));
const Path = __importStar(require("path"));
const log4js_1 = require("log4js");
const operators_1 = require("rxjs/operators");
const log = (0, log4js_1.getLogger)('plink.rwPackageJson');
// import config from './config';
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
const isWin32 = require('os').platform().indexOf('win32') >= 0;
// type Callback = (...args: any[]) => void;
function symbolicLinkPackages(destDir) {
    return function (src) {
        return src.pipe((0, operators_1.map)(({ name, realPath }) => {
            let newPath;
            try {
                newPath = Path.join(destDir, name);
                let stat, exists = false;
                try {
                    stat = fs.lstatSync(newPath);
                    exists = true;
                }
                catch (e) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (e.code === 'ENOENT') {
                        exists = false;
                    }
                    else
                        throw e;
                }
                if (exists) {
                    if (stat.isFile() ||
                        (stat.isSymbolicLink() && isSymlinkTo(newPath, realPath))) {
                        fs.unlinkSync(newPath);
                        _symbolicLink(realPath, newPath);
                    }
                    else if (stat.isDirectory()) {
                        log.info('Remove installed package "%s"', Path.relative(process.cwd(), newPath));
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
        return fs.realpathSync(newPath) !== realPath;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsbUNBQWlDO0FBRWpDLDhDQUFtQztBQUVuQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMscUJBQXFCLENBQUMsQ0FBQztBQUM3QyxpQ0FBaUM7QUFDakMseUdBQXlHO0FBQ3pHLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRS9ELDRDQUE0QztBQUU1QyxTQUFnQixvQkFBb0IsQ0FBQyxPQUFlO0lBQ2xELE9BQU8sVUFBUyxHQUFpRDtRQUMvRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsSUFBQSxlQUFHLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsRUFBRSxFQUFFO1lBQ3ZCLElBQUksT0FBZSxDQUFDO1lBQ3BCLElBQUk7Z0JBQ0YsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLElBQWMsRUFBRSxNQUFNLEdBQUcsS0FBSyxDQUFDO2dCQUNuQyxJQUFJO29CQUNGLElBQUksR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUM3QixNQUFNLEdBQUcsSUFBSSxDQUFDO2lCQUNmO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLHNFQUFzRTtvQkFDdEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTt3QkFDdkIsTUFBTSxHQUFHLEtBQUssQ0FBQztxQkFDaEI7O3dCQUNDLE1BQU0sQ0FBQyxDQUFDO2lCQUNYO2dCQUVELElBQUksTUFBTSxFQUFFO29CQUNWLElBQUksSUFBSyxDQUFDLE1BQU0sRUFBRTt3QkFDaEIsQ0FBQyxJQUFLLENBQUMsY0FBYyxFQUFFLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO3dCQUM1RCxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN2QixhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNsQzt5QkFBTSxJQUFJLElBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRTt3QkFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNqRixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN2QixhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNsQztpQkFDRjtxQkFBTTtvQkFDTCxhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUNsQzthQUNGO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtRQUNILENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBdENELG9EQXNDQztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQWUsRUFBRSxRQUFnQjtJQUNwRCxJQUFJO1FBQ0YsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQztLQUM5QztJQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFXLEVBQUUsSUFBUztJQUMzQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNGLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnJ3UGFja2FnZUpzb24nKTtcbi8vIGltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2VzcywgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG5jb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuLy8gdHlwZSBDYWxsYmFjayA9ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN5bWJvbGljTGlua1BhY2thZ2VzKGRlc3REaXI6IHN0cmluZykge1xuICByZXR1cm4gZnVuY3Rpb24oc3JjOiBPYnNlcnZhYmxlPHtuYW1lOiBzdHJpbmc7IHJlYWxQYXRoOiBzdHJpbmd9Pikge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG1hcCgoe25hbWUsIHJlYWxQYXRofSkgPT4ge1xuICAgICAgICBsZXQgbmV3UGF0aDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5ld1BhdGggPSBQYXRoLmpvaW4oZGVzdERpciwgbmFtZSk7XG4gICAgICAgICAgbGV0IHN0YXQ6IGZzLlN0YXRzLCBleGlzdHMgPSBmYWxzZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RhdCA9IGZzLmxzdGF0U3luYyhuZXdQYXRoKTtcbiAgICAgICAgICAgIGV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgICAgZXhpc3RzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICBpZiAoc3RhdCEuaXNGaWxlKCkgfHxcbiAgICAgICAgICAgICAgKHN0YXQhLmlzU3ltYm9saWNMaW5rKCkgJiYgaXNTeW1saW5rVG8obmV3UGF0aCwgcmVhbFBhdGgpKSkge1xuICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdCEuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICBsb2cuaW5mbygnUmVtb3ZlIGluc3RhbGxlZCBwYWNrYWdlIFwiJXNcIicsIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgbmV3UGF0aCkpO1xuICAgICAgICAgICAgICBmcy5yZW1vdmVTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5mdW5jdGlvbiBpc1N5bWxpbmtUbyhuZXdQYXRoOiBzdHJpbmcsIHJlYWxQYXRoOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMucmVhbHBhdGhTeW5jKG5ld1BhdGgpICE9PSByZWFsUGF0aDtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3N5bWJvbGljTGluayhkaXI6IHN0cmluZywgbGluazogYW55KSB7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcbiAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGRpciksIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICBsb2cuaW5mbygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBsaW5rKSk7XG59XG5cbiJdfQ==