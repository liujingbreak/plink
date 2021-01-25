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
// const jsonLint = require('json-lint');
const log = require('log4js').getLogger('@wfh/plink.rwPackageJson');
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
                log.debug('symblink to %s', newPath);
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
        })
        // filter((pkjsonNContent) => pkjsonNContent[1] != null)
        );
    };
}
exports.symbolicLinkPackages = symbolicLinkPackages;
function _symbolicLink(dir, link) {
    fs.mkdirpSync(Path.dirname(link));
    fs.symlinkSync(Path.relative(Path.dirname(link), dir), link, isWin32 ? 'junction' : 'dir');
    log.info('Create symlink "%s"', Path.relative(process.cwd(), link));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicndQYWNrYWdlSnNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3J3UGFja2FnZUpzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IseUNBQXlDO0FBQ3pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUVwRSw4Q0FBbUM7QUFFbkMsaUNBQWlDO0FBQ2pDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRS9ELDRDQUE0QztBQUU1QyxTQUFnQixvQkFBb0IsQ0FBQyxPQUFlO0lBQ2xELE9BQU8sVUFBUyxHQUFpRDtRQUMvRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLEVBQUUsRUFBRTtZQUN2QixJQUFJLE9BQWUsQ0FBQztZQUNwQixJQUFJO2dCQUVGLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxJQUFjLEVBQUUsTUFBTSxHQUFHLEtBQUssQ0FBQztnQkFDbkMsSUFBSTtvQkFDRixJQUFJLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDN0IsTUFBTSxHQUFHLElBQUksQ0FBQztpQkFDZjtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO3dCQUN2QixNQUFNLEdBQUcsS0FBSyxDQUFDO3FCQUNoQjs7d0JBQ0MsTUFBTSxDQUFDLENBQUM7aUJBQ1g7Z0JBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDckMsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsSUFBSSxJQUFLLENBQUMsTUFBTSxFQUFFO3dCQUNoQixDQUFDLElBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxFQUFFO3dCQUNuRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN2QixhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNsQzt5QkFBTSxJQUFJLElBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRTt3QkFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNqRixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN2QixhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNsQztpQkFDRjtxQkFBTTtvQkFDTCxhQUFhLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUNsQzthQUNGO1lBQUMsT0FBTSxHQUFHLEVBQUU7Z0JBQ1gsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtRQUNILENBQUMsQ0FBQztRQUNGLHdEQUF3RDtTQUN6RCxDQUFDO0lBQ0osQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZDRCxvREF1Q0M7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFXLEVBQUUsSUFBUztJQUMzQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNGLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGNvbnN0IGpzb25MaW50ID0gcmVxdWlyZSgnanNvbi1saW50Jyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0B3ZmgvcGxpbmsucndQYWNrYWdlSnNvbicpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmNvbnN0IGlzV2luMzIgPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG4vLyB0eXBlIENhbGxiYWNrID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gc3ltYm9saWNMaW5rUGFja2FnZXMoZGVzdERpcjogc3RyaW5nKSB7XG4gIHJldHVybiBmdW5jdGlvbihzcmM6IE9ic2VydmFibGU8e25hbWU6IHN0cmluZywgcmVhbFBhdGg6IHN0cmluZ30+KSB7XG4gICAgcmV0dXJuIHNyYy5waXBlKFxuICAgICAgbWFwKCh7bmFtZSwgcmVhbFBhdGh9KSA9PiB7XG4gICAgICAgIGxldCBuZXdQYXRoOiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICBuZXdQYXRoID0gUGF0aC5qb2luKGRlc3REaXIsIG5hbWUpO1xuICAgICAgICAgIGxldCBzdGF0OiBmcy5TdGF0cywgZXhpc3RzID0gZmFsc2U7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0YXQgPSBmcy5sc3RhdFN5bmMobmV3UGF0aCk7XG4gICAgICAgICAgICBleGlzdHMgPSB0cnVlO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICAgIGV4aXN0cyA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxvZy5kZWJ1Zygnc3ltYmxpbmsgdG8gJXMnLCBuZXdQYXRoKTtcbiAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICBpZiAoc3RhdCEuaXNGaWxlKCkgfHxcbiAgICAgICAgICAgICAgKHN0YXQhLmlzU3ltYm9saWNMaW5rKCkgJiYgZnMucmVhbHBhdGhTeW5jKG5ld1BhdGgpICE9PSByZWFsUGF0aCkpIHtcbiAgICAgICAgICAgICAgZnMudW5saW5rU3luYyhuZXdQYXRoKTtcbiAgICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXQhLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgbG9nLmluZm8oJ1JlbW92ZSBpbnN0YWxsZWQgcGFja2FnZSBcIiVzXCInLCBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIG5ld1BhdGgpKTtcbiAgICAgICAgICAgICAgZnMucmVtb3ZlU3luYyhuZXdQYXRoKTtcbiAgICAgICAgICAgICAgX3N5bWJvbGljTGluayhyZWFsUGF0aCwgbmV3UGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9zeW1ib2xpY0xpbmsocmVhbFBhdGgsIG5ld1BhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC8vIGZpbHRlcigocGtqc29uTkNvbnRlbnQpID0+IHBranNvbk5Db250ZW50WzFdICE9IG51bGwpXG4gICAgKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gX3N5bWJvbGljTGluayhkaXI6IHN0cmluZywgbGluazogYW55KSB7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcbiAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGRpciksIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICBsb2cuaW5mbygnQ3JlYXRlIHN5bWxpbmsgXCIlc1wiJywgUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBsaW5rKSk7XG59XG5cbiJdfQ==