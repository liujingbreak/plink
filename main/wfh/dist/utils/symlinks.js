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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recreateSymlink = exports.validateLink = exports.symlinkAsync = exports.listModuleSymlinks = exports.unlinkAsync = exports.lstatAsync = exports.isWin32 = void 0;
const fs = __importStar(require("fs"));
// import {removeSync} from 'fs-extra';
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
// import {getWorkDir} from './misc';
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
// export const readdirAsync = util.promisify(fs.readdir);
exports.lstatAsync = util_1.default.promisify(fs.lstat);
// export const _symlinkAsync = util.promisify(fs.symlink);
exports.unlinkAsync = util_1.default.promisify(fs.unlink);
/**
 * Return all deleted symlinks
 * @param deleteOption
 */
function scanNodeModules(dir = process.cwd(), deleteOption = 'invalid') {
    return __awaiter(this, void 0, void 0, function* () {
        const deleteAll = deleteOption === 'all';
        const deletedList = [];
        yield listModuleSymlinks(path_1.default.join(dir, 'node_modules'), link => {
            if (validateLink(link, deleteAll)) {
                deletedList.push(link);
            }
        });
        return deletedList;
    });
}
exports.default = scanNodeModules;
function listModuleSymlinks(parentDir, onFound) {
    // const level1Dirs = await readdirAsync(parentDir);
    return rx.from(fs.promises.readdir(parentDir)).pipe(op.concatMap(level1Dirs => level1Dirs), op.mergeMap(dirname => {
        const dir = path_1.default.resolve(parentDir, dirname);
        if (dirname.startsWith('@') && fs.statSync(dir).isDirectory()) {
            // it is a scope package
            return rx.from(fs.promises.readdir(dir))
                .pipe(op.mergeMap(subdirs => subdirs), op.mergeMap(file => onEachFile(path_1.default.resolve(dir, file))));
        }
        else {
            return onEachFile(dir);
        }
    })).toPromise();
    // await Promise.all(level1Dirs.map(async dir => {
    //   if (dir.startsWith('@')) {
    //     // it is a scope package
    //     const subdirs = await readdirAsync(Path.resolve(parentDir, dir));
    //     await Promise.all(subdirs.map(file => onEachFile(Path.resolve(parentDir, dir, file))));
    //   } else {
    //     await onEachFile(Path.resolve(parentDir, dir));
    //   }
    // }));
    function onEachFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            let isSymlink = false;
            try {
                isSymlink = fs.lstatSync(file).isSymbolicLink();
            }
            catch (e) { }
            if (isSymlink) {
                yield Promise.resolve(onFound(file));
            }
        });
    }
}
exports.listModuleSymlinks = listModuleSymlinks;
/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget
 * @param link
 */
function symlinkAsync(linkTarget, link) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (fs.lstatSync(link).isSymbolicLink() && path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)) === linkTarget) {
                // console.log('exits', link);
                return;
            }
            // eslint-disable-next-line no-console
            console.log(`remove ${link}`);
            fs.unlinkSync(link);
        }
        catch (ex) {
            // link does not exist
            // console.log(ex);
        }
        // eslint-disable-next-line no-console
        console.log(`create symlink ${link} --> ${linkTarget}`);
        return fs.promises.symlink(path_1.default.relative(path_1.default.dirname(link), linkTarget), link, exports.isWin32 ? 'junction' : 'dir');
    });
}
exports.symlinkAsync = symlinkAsync;
function validateLink(link, deleteAll = false) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if ((yield exports.lstatAsync(link)).isSymbolicLink() &&
                (deleteAll || !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link))))) {
                // eslint-disable-next-line no-console
                console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', link)}`);
                yield exports.unlinkAsync(link);
                return false;
            }
            return true;
        }
        catch (ex) {
            return false;
        }
    });
}
exports.validateLink = validateLink;
/**
 * Delete symlink or file/directory if it is invalid symlink or pointing to nonexisting target
 * @param link the symlink
 * @param target
 * @returns true if needs to create a new symlink
 */
function recreateSymlink(link, target) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if ((yield exports.lstatAsync(link)).isSymbolicLink() &&
                !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)))) {
                yield exports.unlinkAsync(link);
                return false;
            }
            return true;
        }
        catch (ex) {
            return false;
        }
    });
}
exports.recreateSymlink = recreateSymlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHFDQUFxQztBQUV4QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCwwREFBMEQ7QUFDN0MsUUFBQSxVQUFVLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkQsMkRBQTJEO0FBQzlDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJEOzs7R0FHRztBQUNILFNBQThCLGVBQWUsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWtDLFNBQVM7O1FBQzVHLE1BQU0sU0FBUyxHQUFHLFlBQVksS0FBSyxLQUFLLENBQUM7UUFDekMsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEVBQ3JELElBQUksQ0FBQyxFQUFFO1lBQ0wsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3hCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFWRCxrQ0FVQztBQUVELFNBQWdCLGtC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TSxtQkFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7Q0FBQTtBQVpELDBDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtyZW1vdmVTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0IHtnZXRXb3JrRGlyfSBmcm9tICcuL21pc2MnO1xuXG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuLy8gZXhwb3J0IGNvbnN0IHJlYWRkaXJBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnJlYWRkaXIpO1xuZXhwb3J0IGNvbnN0IGxzdGF0QXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5sc3RhdCk7XG4vLyBleHBvcnQgY29uc3QgX3N5bWxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnN5bWxpbmspO1xuZXhwb3J0IGNvbnN0IHVubGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMudW5saW5rKTtcblxuLyoqXG4gKiBSZXR1cm4gYWxsIGRlbGV0ZWQgc3ltbGlua3NcbiAqIEBwYXJhbSBkZWxldGVPcHRpb24gXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHNjYW5Ob2RlTW9kdWxlcyhkaXIgPSBwcm9jZXNzLmN3ZCgpLCBkZWxldGVPcHRpb246ICdhbGwnIHwgJ2ludmFsaWQnID0gJ2ludmFsaWQnKSB7XG4gIGNvbnN0IGRlbGV0ZUFsbCA9IGRlbGV0ZU9wdGlvbiA9PT0gJ2FsbCc7XG4gIGNvbnN0IGRlbGV0ZWRMaXN0OiBzdHJpbmdbXSA9IFtdO1xuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3MoUGF0aC5qb2luKGRpciwgJ25vZGVfbW9kdWxlcycpLFxuICAgIGxpbmsgPT4ge1xuICAgICAgaWYgKHZhbGlkYXRlTGluayhsaW5rLCBkZWxldGVBbGwpKSB7XG4gICAgICAgIGRlbGV0ZWRMaXN0LnB1c2gobGluayk7XG4gICAgICB9XG4gICAgfSk7XG4gIHJldHVybiBkZWxldGVkTGlzdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RNb2R1bGVTeW1saW5rcyhcbiAgcGFyZW50RGlyOiBzdHJpbmcsXG4gIG9uRm91bmQ6IChsaW5rOiBzdHJpbmcpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB7XG4gIC8vIGNvbnN0IGxldmVsMURpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMocGFyZW50RGlyKTtcbiAgcmV0dXJuIHJ4LmZyb20oZnMucHJvbWlzZXMucmVhZGRpcihwYXJlbnREaXIpKS5waXBlKFxuICAgIG9wLmNvbmNhdE1hcChsZXZlbDFEaXJzID0+IGxldmVsMURpcnMpLFxuICAgIG9wLm1lcmdlTWFwKGRpcm5hbWUgPT4ge1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlybmFtZSk7XG4gICAgICBpZiAoZGlybmFtZS5zdGFydHNXaXRoKCdAJykgJiYgZnMuc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIC8vIGl0IGlzIGEgc2NvcGUgcGFja2FnZVxuICAgICAgICByZXR1cm4gcnguZnJvbShmcy5wcm9taXNlcy5yZWFkZGlyKGRpcikpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIG9wLm1lcmdlTWFwKHN1YmRpcnMgPT4gc3ViZGlycyksXG4gICAgICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShkaXIsIGZpbGUpKSlcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvbkVhY2hGaWxlKGRpcik7XG4gICAgICB9XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcbiAgLy8gYXdhaXQgUHJvbWlzZS5hbGwobGV2ZWwxRGlycy5tYXAoYXN5bmMgZGlyID0+IHtcbiAgLy8gICBpZiAoZGlyLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAvLyAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gIC8vICAgICBjb25zdCBzdWJkaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcikpO1xuICAvLyAgICAgYXdhaXQgUHJvbWlzZS5hbGwoc3ViZGlycy5tYXAoZmlsZSA9PiBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpciwgZmlsZSkpKSk7XG4gIC8vICAgfSBlbHNlIHtcbiAgLy8gICAgIGF3YWl0IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gIC8vICAgfVxuICAvLyB9KSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25FYWNoRmlsZShmaWxlOiBzdHJpbmcpIHtcbiAgICBsZXQgaXNTeW1saW5rID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGlzU3ltbGluayA9IGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgaWYgKGlzU3ltbGluaykge1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKG9uRm91bmQoZmlsZSkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERvIGNoZWNrIGV4aXN0aW5nIHN5bWxpbmssIHJlY3JlYXRlIGEgbmV3IG9uZSBpZiBleGlzdGluZyBvbmUgaXMgaW52YWxpZCBzeW1saW5rXG4gKiBAcGFyYW0gbGlua1RhcmdldCBcbiAqIEBwYXJhbSBsaW5rIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0FzeW5jKGxpbmtUYXJnZXQ6IHN0cmluZywgbGluazogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhsaW5rKS5pc1N5bWJvbGljTGluaygpICYmIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkgPT09IGxpbmtUYXJnZXQpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdleGl0cycsIGxpbmspO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgcmVtb3ZlICR7bGlua31gKTtcbiAgICBmcy51bmxpbmtTeW5jKGxpbmspO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIGxpbmsgZG9lcyBub3QgZXhpc3RcbiAgICAvLyBjb25zb2xlLmxvZyhleCk7XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYGNyZWF0ZSBzeW1saW5rICR7bGlua30gLS0+ICR7bGlua1RhcmdldH1gKTtcbiAgcmV0dXJuIGZzLnByb21pc2VzLnN5bWxpbmsoXG4gICAgUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGxpbmtUYXJnZXQpLFxuICAgIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcidcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlTGluayhsaW5rOiBzdHJpbmcsIGRlbGV0ZUFsbCA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAoZGVsZXRlQWxsIHx8ICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpKVxuICAgICAgKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtzeW1saW5rIGNoZWNrXSBSZW1vdmUgJHtkZWxldGVBbGwgPyAnJyA6ICdpbnZhbGlkJ30gc3ltbGluayAke1BhdGgucmVsYXRpdmUoJy4nLCBsaW5rKX1gKTtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWxldGUgc3ltbGluayBvciBmaWxlL2RpcmVjdG9yeSBpZiBpdCBpcyBpbnZhbGlkIHN5bWxpbmsgb3IgcG9pbnRpbmcgdG8gbm9uZXhpc3RpbmcgdGFyZ2V0XG4gKiBAcGFyYW0gbGluayB0aGUgc3ltbGlua1xuICogQHBhcmFtIHRhcmdldCBcbiAqIEByZXR1cm5zIHRydWUgaWYgbmVlZHMgdG8gY3JlYXRlIGEgbmV3IHN5bWxpbmtcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY3JlYXRlU3ltbGluayhsaW5rOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKVxuICAgICAgKSB7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbiJdfQ==