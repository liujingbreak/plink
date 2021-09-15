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
async function scanNodeModules(dir = process.cwd(), deleteOption = 'invalid') {
    const deleteAll = deleteOption === 'all';
    const deletedList = [];
    await listModuleSymlinks(path_1.default.join(dir, 'node_modules'), async (link) => {
        if (await validateLink(link, deleteAll)) {
            deletedList.push(link);
        }
    });
    return deletedList;
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
    async function onEachFile(file) {
        let isSymlink = false;
        try {
            isSymlink = fs.lstatSync(file).isSymbolicLink();
        }
        catch (e) { }
        if (isSymlink) {
            await Promise.resolve(onFound(file));
        }
    }
}
exports.listModuleSymlinks = listModuleSymlinks;
/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget
 * @param link
 */
async function symlinkAsync(linkTarget, link) {
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
}
exports.symlinkAsync = symlinkAsync;
async function validateLink(link, deleteAll = false) {
    try {
        if ((await (0, exports.lstatAsync)(link)).isSymbolicLink() &&
            (deleteAll || !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link))))) {
            // eslint-disable-next-line no-console
            console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', link)}`);
            await (0, exports.unlinkAsync)(link);
            return false;
        }
        return true;
    }
    catch (ex) {
        return false;
    }
}
exports.validateLink = validateLink;
/**
 * Delete symlink or file/directory if it is invalid symlink or pointing to nonexisting target
 * @param link the symlink
 * @param target
 * @returns true if needs to create a new symlink
 */
async function recreateSymlink(link, target) {
    try {
        if ((await (0, exports.lstatAsync)(link)).isSymbolicLink() &&
            !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)))) {
            await (0, exports.unlinkAsync)(link);
            return false;
        }
        return true;
    }
    catch (ex) {
        return false;
    }
}
exports.recreateSymlink = recreateSymlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHFDQUFxQztBQUV4QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCwwREFBMEQ7QUFDN0MsUUFBQSxVQUFVLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkQsMkRBQTJEO0FBQzlDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJEOzs7R0FHRztBQUNZLEtBQUssVUFBVSxlQUFlLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxlQUFrQyxTQUFTO0lBQzVHLE1BQU0sU0FBUyxHQUFHLFlBQVksS0FBSyxLQUFLLENBQUM7SUFDekMsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO0lBQ2pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEVBQ3JELEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTtRQUNYLElBQUksTUFBTSxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFO1lBQ3ZDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDeEI7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFWRCxrQ0FVQztBQUVELFNBQWdC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RixNQUFNLElBQUEsbUJBQVcsRUFBQyxJQUFJLENBQUMsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUM7QUFaRCwwQ0FZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB7cmVtb3ZlU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7Z2V0V29ya0Rpcn0gZnJvbSAnLi9taXNjJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbi8vIGV4cG9ydCBjb25zdCByZWFkZGlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5yZWFkZGlyKTtcbmV4cG9ydCBjb25zdCBsc3RhdEFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMubHN0YXQpO1xuLy8gZXhwb3J0IGNvbnN0IF9zeW1saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5zeW1saW5rKTtcbmV4cG9ydCBjb25zdCB1bmxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnVubGluayk7XG5cbi8qKlxuICogUmV0dXJuIGFsbCBkZWxldGVkIHN5bWxpbmtzXG4gKiBAcGFyYW0gZGVsZXRlT3B0aW9uIFxuICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBzY2FuTm9kZU1vZHVsZXMoZGlyID0gcHJvY2Vzcy5jd2QoKSwgZGVsZXRlT3B0aW9uOiAnYWxsJyB8ICdpbnZhbGlkJyA9ICdpbnZhbGlkJykge1xuICBjb25zdCBkZWxldGVBbGwgPSBkZWxldGVPcHRpb24gPT09ICdhbGwnO1xuICBjb25zdCBkZWxldGVkTGlzdDogc3RyaW5nW10gPSBbXTtcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKFBhdGguam9pbihkaXIsICdub2RlX21vZHVsZXMnKSxcbiAgICBhc3luYyBsaW5rID0+IHtcbiAgICAgIGlmIChhd2FpdCB2YWxpZGF0ZUxpbmsobGluaywgZGVsZXRlQWxsKSkge1xuICAgICAgICBkZWxldGVkTGlzdC5wdXNoKGxpbmspO1xuICAgICAgfVxuICAgIH0pO1xuICByZXR1cm4gZGVsZXRlZExpc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0TW9kdWxlU3ltbGlua3MoXG4gIHBhcmVudERpcjogc3RyaW5nLFxuICBvbkZvdW5kOiAobGluazogc3RyaW5nKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikge1xuICAvLyBjb25zdCBsZXZlbDFEaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKHBhcmVudERpcik7XG4gIHJldHVybiByeC5mcm9tKGZzLnByb21pc2VzLnJlYWRkaXIocGFyZW50RGlyKSkucGlwZShcbiAgICBvcC5jb25jYXRNYXAobGV2ZWwxRGlycyA9PiBsZXZlbDFEaXJzKSxcbiAgICBvcC5tZXJnZU1hcChkaXJuYW1lID0+IHtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcm5hbWUpO1xuICAgICAgaWYgKGRpcm5hbWUuc3RhcnRzV2l0aCgnQCcpICYmIGZzLnN0YXRTeW5jKGRpcikuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgICAgICAgcmV0dXJuIHJ4LmZyb20oZnMucHJvbWlzZXMucmVhZGRpcihkaXIpKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICBvcC5tZXJnZU1hcChzdWJkaXJzID0+IHN1YmRpcnMpLFxuICAgICAgICAgIG9wLm1lcmdlTWFwKGZpbGUgPT4gb25FYWNoRmlsZShQYXRoLnJlc29sdmUoZGlyLCBmaWxlKSkpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb25FYWNoRmlsZShkaXIpO1xuICAgICAgfVxuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG4gIC8vIGF3YWl0IFByb21pc2UuYWxsKGxldmVsMURpcnMubWFwKGFzeW5jIGRpciA9PiB7XG4gIC8vICAgaWYgKGRpci5zdGFydHNXaXRoKCdAJykpIHtcbiAgLy8gICAgIC8vIGl0IGlzIGEgc2NvcGUgcGFja2FnZVxuICAvLyAgICAgY29uc3Qgc3ViZGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgLy8gICAgIGF3YWl0IFByb21pc2UuYWxsKHN1YmRpcnMubWFwKGZpbGUgPT4gb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIsIGZpbGUpKSkpO1xuICAvLyAgIH0gZWxzZSB7XG4gIC8vICAgICBhd2FpdCBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcikpO1xuICAvLyAgIH1cbiAgLy8gfSkpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uRWFjaEZpbGUoZmlsZTogc3RyaW5nKSB7XG4gICAgbGV0IGlzU3ltbGluayA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc1N5bWxpbmsgPSBmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIGlmIChpc1N5bWxpbmspIHtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShvbkZvdW5kKGZpbGUpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEbyBjaGVjayBleGlzdGluZyBzeW1saW5rLCByZWNyZWF0ZSBhIG5ldyBvbmUgaWYgZXhpc3Rpbmcgb25lIGlzIGludmFsaWQgc3ltbGlua1xuICogQHBhcmFtIGxpbmtUYXJnZXQgXG4gKiBAcGFyYW0gbGluayBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtBc3luYyhsaW5rVGFyZ2V0OiBzdHJpbmcsIGxpbms6IHN0cmluZykge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMobGluaykuaXNTeW1ib2xpY0xpbmsoKSAmJiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpID09PSBsaW5rVGFyZ2V0KSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZXhpdHMnLCBsaW5rKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYHJlbW92ZSAke2xpbmt9YCk7XG4gICAgZnMudW5saW5rU3luYyhsaW5rKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyBsaW5rIGRvZXMgbm90IGV4aXN0XG4gICAgLy8gY29uc29sZS5sb2coZXgpO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGBjcmVhdGUgc3ltbGluayAke2xpbmt9IC0tPiAke2xpbmtUYXJnZXR9YCk7XG4gIHJldHVybiBmcy5wcm9taXNlcy5zeW1saW5rKFxuICAgIFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBsaW5rVGFyZ2V0KSxcbiAgICBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUxpbmsobGluazogc3RyaW5nLCBkZWxldGVBbGwgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgKGRlbGV0ZUFsbCB8fCAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKSlcbiAgICAgICkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbc3ltbGluayBjaGVja10gUmVtb3ZlICR7ZGVsZXRlQWxsID8gJycgOiAnaW52YWxpZCd9IHN5bWxpbmsgJHtQYXRoLnJlbGF0aXZlKCcuJywgbGluayl9YCk7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlIHN5bWxpbmsgb3IgZmlsZS9kaXJlY3RvcnkgaWYgaXQgaXMgaW52YWxpZCBzeW1saW5rIG9yIHBvaW50aW5nIHRvIG5vbmV4aXN0aW5nIHRhcmdldFxuICogQHBhcmFtIGxpbmsgdGhlIHN5bWxpbmtcbiAqIEBwYXJhbSB0YXJnZXQgXG4gKiBAcmV0dXJucyB0cnVlIGlmIG5lZWRzIHRvIGNyZWF0ZSBhIG5ldyBzeW1saW5rXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNyZWF0ZVN5bWxpbmsobGluazogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSlcbiAgICAgICkge1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4iXX0=