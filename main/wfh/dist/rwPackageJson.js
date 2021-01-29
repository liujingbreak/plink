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
const log = log4js_1.getLogger('plink.rwPackageJson');
const operators_1 = require("rxjs/operators");
// import config from './config';
const isWin32 = require('os').platform().indexOf('win32') >= 0;
// type Callback = (...args: any[]) => void;
function symbolicLinkPackages(destDir) {
    return function (src) {
        return src.pipe(operators_1.map(({ name, realPath }) => {
            let newPath;
            try {
                newPath = Path.join(destDir, name);
                let stat, exists = false;
                try {
                    stat = fs.lstatSync(newPath);
                    exists = true;
                }
                catch (e) {
                    if (e.code === 'ENOENT') {
                        exists = false;
                    }
                    else
                        throw e;
                }
                if (exists) {
                    if (stat.isFile() ||
                        (stat.isSymbolicLink() && fs.realpathSync(newPath) !== realPath)) {
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
function _symbolicLink(dir, link) {
    fs.mkdirpSync(Path.dirname(link));
    fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
    log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsbUNBQWlDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUU3Qyw4Q0FBbUM7QUFFbkMsaUNBQWlDO0FBQ2pDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRS9ELDRDQUE0QztBQUU1QyxTQUFnQixvQkFBb0IsQ0FBQyxPQUFlO0lBQ2xELE9BQU8sVUFBUyxHQUFpRDtRQUMvRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUUsRUFBRTtZQUN2QixJQUFJLE9BQWUsQ0FBQztZQUNwQixJQUFJO2dCQUNGLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxJQUFjLEVBQUUsTUFBTSxHQUFHLEtBQUssQ0FBQztnQkFDbkMsSUFBSTtvQkFDRixJQUFJLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDN0IsTUFBTSxHQUFHLElBQUksQ0FBQztpQkFDZjtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO3dCQUN2QixNQUFNLEdBQUcsS0FBSyxDQUFDO3FCQUNoQjs7d0JBQ0MsTUFBTSxDQUFDLENBQUM7aUJBQ1g7Z0JBRUQsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsSUFBSSxJQUFLLENBQUMsTUFBTSxFQUFFO3dCQUNoQixDQUFDLElBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxFQUFFO3dCQUNuRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN2QixhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNsQzt5QkFBTSxJQUFJLElBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRTt3QkFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNqRixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN2QixhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNsQztpQkFDRjtxQkFBTTtvQkFDTCxhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUNsQzthQUNGO1lBQUMsT0FBTSxHQUFHLEVBQUU7Z0JBQ1gsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtRQUNILENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7QUFDSixDQUFDO0FBckNELG9EQXFDQztBQUVELFNBQVMsYUFBYSxDQUFDLEdBQVcsRUFBRSxJQUFTO0lBQzNDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0YsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnJ3UGFja2FnZUpzb24nKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBpc1dpbjMyID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuLy8gdHlwZSBDYWxsYmFjayA9ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN5bWJvbGljTGlua1BhY2thZ2VzKGRlc3REaXI6IHN0cmluZykge1xuICByZXR1cm4gZnVuY3Rpb24oc3JjOiBPYnNlcnZhYmxlPHtuYW1lOiBzdHJpbmcsIHJlYWxQYXRoOiBzdHJpbmd9Pikge1xuICAgIHJldHVybiBzcmMucGlwZShcbiAgICAgIG1hcCgoe25hbWUsIHJlYWxQYXRofSkgPT4ge1xuICAgICAgICBsZXQgbmV3UGF0aDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5ld1BhdGggPSBQYXRoLmpvaW4oZGVzdERpciwgbmFtZSk7XG4gICAgICAgICAgbGV0IHN0YXQ6IGZzLlN0YXRzLCBleGlzdHMgPSBmYWxzZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RhdCA9IGZzLmxzdGF0U3luYyhuZXdQYXRoKTtcbiAgICAgICAgICAgIGV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgICAgZXhpc3RzID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICBpZiAoc3RhdCEuaXNGaWxlKCkgfHxcbiAgICAgICAgICAgICAgKHN0YXQhLmlzU3ltYm9saWNMaW5rKCkgJiYgZnMucmVhbHBhdGhTeW5jKG5ld1BhdGgpICE9PSByZWFsUGF0aCkpIHtcbiAgICAgICAgICAgICAgZnMudW5saW5rU3luYyhuZXdQYXRoKTtcbiAgICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXQhLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgbG9nLmluZm8oJ1JlbW92ZSBpbnN0YWxsZWQgcGFja2FnZSBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIG5ld1BhdGgpKTtcbiAgICAgICAgICAgICAgZnMucmVtb3ZlU3luYyhuZXdQYXRoKTtcbiAgICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9zeW1ib2xpY0xpbmsocmVhbFBhdGgsIG5ld1BhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICB9O1xufVxuXG5mdW5jdGlvbiBfc3ltYm9saWNMaW5rKGRpcjogc3RyaW5nLCBsaW5rOiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgZGlyKSwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIGxvZy5pbmZvKCdDcmVhdGUgc3ltbGluayBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGxpbmspKTtcbn1cblxuIl19