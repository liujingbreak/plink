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
const log = log4js_1.getLogger('plink.rwPackageJson');
// import config from './config';
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsbUNBQWlDO0FBRWpDLDhDQUFtQztBQUVuQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDN0MsaUNBQWlDO0FBQ2pDLHlHQUF5RztBQUN6RyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUvRCw0Q0FBNEM7QUFFNUMsU0FBZ0Isb0JBQW9CLENBQUMsT0FBZTtJQUNsRCxPQUFPLFVBQVMsR0FBaUQ7UUFDL0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUNiLGVBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxFQUFFLEVBQUU7WUFDdkIsSUFBSSxPQUFlLENBQUM7WUFDcEIsSUFBSTtnQkFDRixPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLElBQUksSUFBYyxFQUFFLE1BQU0sR0FBRyxLQUFLLENBQUM7Z0JBQ25DLElBQUk7b0JBQ0YsSUFBSSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzdCLE1BQU0sR0FBRyxJQUFJLENBQUM7aUJBQ2Y7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1Ysc0VBQXNFO29CQUN0RSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO3dCQUN2QixNQUFNLEdBQUcsS0FBSyxDQUFDO3FCQUNoQjs7d0JBQ0MsTUFBTSxDQUFDLENBQUM7aUJBQ1g7Z0JBRUQsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsSUFBSSxJQUFLLENBQUMsTUFBTSxFQUFFO3dCQUNoQixDQUFDLElBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7d0JBQzVELEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3ZCLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQ2xDO3lCQUFNLElBQUksSUFBSyxDQUFDLFdBQVcsRUFBRSxFQUFFO3dCQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ2pGLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3ZCLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7cUJBQ2xDO2lCQUNGO3FCQUFNO29CQUNMLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQ2xDO2FBQ0Y7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hCO1FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUM7QUF0Q0Qsb0RBc0NDO0FBRUQsU0FBUyxXQUFXLENBQUMsT0FBZSxFQUFFLFFBQWdCO0lBQ3BELElBQUk7UUFDRixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDO0tBQzlDO0lBQUMsT0FBTyxFQUFFLEVBQUU7UUFDWCxPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEdBQVcsRUFBRSxJQUFTO0lBQzNDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0YsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucndQYWNrYWdlSnNvbicpO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbmNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG4vLyB0eXBlIENhbGxiYWNrID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gc3ltYm9saWNMaW5rUGFja2FnZXMoZGVzdERpcjogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IE9ic2VydmFibGU8e25hbWU6IHN0cmluZzsgcmVhbFBhdGg6IHN0cmluZ30+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgbWFwKCh7bmFtZSwgcmVhbFBhdGh9KSA9PiB7XG4gICAgICAgIGxldCBuZXdQYXRoOiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmV3UGF0aCA9IFBhdGguam9pbihkZXN0RGlyLCBuYW1lKTtcbiAgICAgICAgICBsZXQgc3RhdDogZnMuU3RhdHMsIGV4aXN0cyA9IGZhbHNlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGF0ID0gZnMubHN0YXRTeW5jKG5ld1BhdGgpO1xuICAgICAgICAgICAgZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgICAgICBleGlzdHMgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgIGlmIChzdGF0IS5pc0ZpbGUoKSB8fFxuICAgICAgICAgICAgICAoc3RhdCEuaXNTeW1ib2xpY0xpbmsoKSAmJiBpc1N5bWxpbmtUbyhuZXdQYXRoLCByZWFsUGF0aCkpKSB7XG4gICAgICAgICAgICAgIGZzLnVubGlua1N5bmMobmV3UGF0aCk7XG4gICAgICAgICAgICAgIF9zeW1ib2xpY0xpbmsocmVhbFBhdGgsIG5ld1BhdGgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0IS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdSZW1vdmUgaW5zdGFsbGVkIHBhY2thZ2UgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBuZXdQYXRoKSk7XG4gICAgICAgICAgICAgIGZzLnJlbW92ZVN5bmMobmV3UGF0aCk7XG4gICAgICAgICAgICAgIF9zeW1ib2xpY0xpbmsocmVhbFBhdGgsIG5ld1BhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfc3ltYm9saWNMaW5rKHJlYWxQYXRoLCBuZXdQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzU3ltbGlua1RvKG5ld1BhdGg6IHN0cmluZywgcmVhbFBhdGg6IHN0cmluZykge1xuICB0cnkge1xuICAgIHJldHVybiBmcy5yZWFscGF0aFN5bmMobmV3UGF0aCkgIT09IHJlYWxQYXRoO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfc3ltYm9saWNMaW5rKGRpcjogc3RyaW5nLCBsaW5rOiBhbnkpIHtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgZGlyKSwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIGxvZy5pbmZvKCdDcmVhdGUgc3ltbGluayBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGxpbmspKTtcbn1cblxuIl19