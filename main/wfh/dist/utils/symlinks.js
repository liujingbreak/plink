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
const misc_1 = require("./misc");
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
// export const readdirAsync = util.promisify(fs.readdir);
exports.lstatAsync = util_1.default.promisify(fs.lstat);
// export const _symlinkAsync = util.promisify(fs.symlink);
exports.unlinkAsync = util_1.default.promisify(fs.unlink);
/**
 * Return all deleted symlinks
 * @param deleteOption
 */
function scanNodeModules(deleteOption = 'invalid') {
    return __awaiter(this, void 0, void 0, function* () {
        const deleteAll = deleteOption === 'all';
        const deletedList = [];
        yield listModuleSymlinks(path_1.default.join(misc_1.getWorkDir(), 'node_modules'), link => {
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
            // tslint:disable-next-line: no-console
            console.log(`remove ${link}`);
            fs.unlinkSync(link);
        }
        catch (ex) {
            // link does not exist
            // console.log(ex);
        }
        // tslint:disable-next-line: no-console
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
                // tslint:disable-next-line: no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLGlDQUFrQztBQUVyQixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCwwREFBMEQ7QUFDN0MsUUFBQSxVQUFVLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkQsMkRBQTJEO0FBQzlDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJEOzs7R0FHRztBQUNILFNBQThCLGVBQWUsQ0FBQyxlQUFrQyxTQUFTOztRQUN2RixNQUFNLFNBQVMsR0FBRyxZQUFZLEtBQUssS0FBSyxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztRQUNqQyxNQUFNLGtCQUFrQixDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsaUJBQVUsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUM5RCxJQUFJLENBQUMsRUFBRTtZQUNMLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN4QjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUFBO0FBVkQsa0NBVUM7QUFFRCxTQUFnQixrQkFBa0IsQ0FDaEMsU0FBaUIsRUFDakIsT0FBK0M7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QkFDeEIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0NBQUE7QUFaRCwwQ0FZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB7cmVtb3ZlU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Z2V0V29ya0Rpcn0gZnJvbSAnLi9taXNjJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbi8vIGV4cG9ydCBjb25zdCByZWFkZGlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5yZWFkZGlyKTtcbmV4cG9ydCBjb25zdCBsc3RhdEFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMubHN0YXQpO1xuLy8gZXhwb3J0IGNvbnN0IF9zeW1saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5zeW1saW5rKTtcbmV4cG9ydCBjb25zdCB1bmxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnVubGluayk7XG5cbi8qKlxuICogUmV0dXJuIGFsbCBkZWxldGVkIHN5bWxpbmtzXG4gKiBAcGFyYW0gZGVsZXRlT3B0aW9uIFxuICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBzY2FuTm9kZU1vZHVsZXMoZGVsZXRlT3B0aW9uOiAnYWxsJyB8ICdpbnZhbGlkJyA9ICdpbnZhbGlkJykge1xuICBjb25zdCBkZWxldGVBbGwgPSBkZWxldGVPcHRpb24gPT09ICdhbGwnO1xuICBjb25zdCBkZWxldGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKFBhdGguam9pbihnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnKSxcbiAgICBsaW5rID0+IHtcbiAgICAgIGlmICh2YWxpZGF0ZUxpbmsobGluaywgZGVsZXRlQWxsKSkge1xuICAgICAgICBkZWxldGVkTGlzdC5wdXNoKGxpbmspO1xuICAgICAgfVxuICAgIH0pO1xuICByZXR1cm4gZGVsZXRlZExpc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0TW9kdWxlU3ltbGlua3MoXG4gIHBhcmVudERpcjogc3RyaW5nLFxuICBvbkZvdW5kOiAobGluazogc3RyaW5nKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikge1xuICAvLyBjb25zdCBsZXZlbDFEaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKHBhcmVudERpcik7XG4gIHJldHVybiByeC5mcm9tKGZzLnByb21pc2VzLnJlYWRkaXIocGFyZW50RGlyKSkucGlwZShcbiAgICBvcC5jb25jYXRNYXAobGV2ZWwxRGlycyA9PiBsZXZlbDFEaXJzKSxcbiAgICBvcC5tZXJnZU1hcChkaXJuYW1lID0+IHtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcm5hbWUpO1xuICAgICAgaWYgKGRpcm5hbWUuc3RhcnRzV2l0aCgnQCcpICYmIGZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgICAgICAgcmV0dXJuIHJ4LmZyb20oZnMucHJvbWlzZXMucmVhZGRpcihkaXIpKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICBvcC5tZXJnZU1hcChzdWJkaXJzID0+IHN1YmRpcnMpLFxuICAgICAgICAgIG9wLm1lcmdlTWFwKGZpbGUgPT4gb25FYWNoRmlsZShQYXRoLnJlc29sdmUoZGlyLCBmaWxlKSkpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb25FYWNoRmlsZShkaXIpO1xuICAgICAgfVxuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG4gIC8vIGF3YWl0IFByb21pc2UuYWxsKGxldmVsMURpcnMubWFwKGFzeW5jIGRpciA9PiB7XG4gIC8vICAgaWYgKGRpci5zdGFydHNXaXRoKCdAJykpIHtcbiAgLy8gICAgIC8vIGl0IGlzIGEgc2NvcGUgcGFja2FnZVxuICAvLyAgICAgY29uc3Qgc3ViZGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgLy8gICAgIGF3YWl0IFByb21pc2UuYWxsKHN1YmRpcnMubWFwKGZpbGUgPT4gb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIsIGZpbGUpKSkpO1xuICAvLyAgIH0gZWxzZSB7XG4gIC8vICAgICBhd2FpdCBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcikpO1xuICAvLyAgIH1cbiAgLy8gfSkpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uRWFjaEZpbGUoZmlsZTogc3RyaW5nKSB7XG4gICAgbGV0IGlzU3ltbGluayA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc1N5bWxpbmsgPSBmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIGlmIChpc1N5bWxpbmspIHtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShvbkZvdW5kKGZpbGUpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEbyBjaGVjayBleGlzdGluZyBzeW1saW5rLCByZWNyZWF0ZSBhIG5ldyBvbmUgaWYgZXhpc3Rpbmcgb25lIGlzIGludmFsaWQgc3ltbGlua1xuICogQHBhcmFtIGxpbmtUYXJnZXQgXG4gKiBAcGFyYW0gbGluayBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtBc3luYyhsaW5rVGFyZ2V0OiBzdHJpbmcsIGxpbms6IHN0cmluZykge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMobGluaykuaXNTeW1ib2xpY0xpbmsoKSAmJiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpID09PSBsaW5rVGFyZ2V0KSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZXhpdHMnLCBsaW5rKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGByZW1vdmUgJHtsaW5rfWApO1xuICAgIGZzLnVubGlua1N5bmMobGluayk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gbGluayBkb2VzIG5vdCBleGlzdFxuICAgIC8vIGNvbnNvbGUubG9nKGV4KTtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYGNyZWF0ZSBzeW1saW5rICR7bGlua30gLS0+ICR7bGlua1RhcmdldH1gKTtcbiAgcmV0dXJuIGZzLnByb21pc2VzLnN5bWxpbmsoXG4gICAgUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGxpbmtUYXJnZXQpLFxuICAgIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcidcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlTGluayhsaW5rOiBzdHJpbmcsIGRlbGV0ZUFsbCA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAoZGVsZXRlQWxsIHx8ICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpKVxuICAgICAgKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbc3ltbGluayBjaGVja10gUmVtb3ZlICR7ZGVsZXRlQWxsID8gJycgOiAnaW52YWxpZCd9IHN5bWxpbmsgJHtQYXRoLnJlbGF0aXZlKCcuJywgbGluayl9YCk7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlIHN5bWxpbmsgb3IgZmlsZS9kaXJlY3RvcnkgaWYgaXQgaXMgaW52YWxpZCBzeW1saW5rIG9yIHBvaW50aW5nIHRvIG5vbmV4aXN0aW5nIHRhcmdldFxuICogQHBhcmFtIGxpbmsgdGhlIHN5bWxpbmtcbiAqIEBwYXJhbSB0YXJnZXQgXG4gKiBAcmV0dXJucyB0cnVlIGlmIG5lZWRzIHRvIGNyZWF0ZSBhIG5ldyBzeW1saW5rXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNyZWF0ZVN5bWxpbmsobGluazogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSlcbiAgICAgICkge1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4iXX0=