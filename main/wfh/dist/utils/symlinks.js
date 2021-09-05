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
        yield listModuleSymlinks(path_1.default.join(dir, 'node_modules'), (link) => __awaiter(this, void 0, void 0, function* () {
            if (yield validateLink(link, deleteAll)) {
                deletedList.push(link);
            }
        }));
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
            if ((yield (0, exports.lstatAsync)(link)).isSymbolicLink() &&
                (deleteAll || !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link))))) {
                // eslint-disable-next-line no-console
                console.log(`[symlink check] Remove ${deleteAll ? '' : 'invalid'} symlink ${path_1.default.relative('.', link)}`);
                yield (0, exports.unlinkAsync)(link);
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
            if ((yield (0, exports.lstatAsync)(link)).isSymbolicLink() &&
                !fs.existsSync(path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)))) {
                yield (0, exports.unlinkAsync)(link);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHFDQUFxQztBQUV4QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCwwREFBMEQ7QUFDN0MsUUFBQSxVQUFVLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkQsMkRBQTJEO0FBQzlDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJEOzs7R0FHRztBQUNILFNBQThCLGVBQWUsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWtDLFNBQVM7O1FBQzVHLE1BQU0sU0FBUyxHQUFHLFlBQVksS0FBSyxLQUFLLENBQUM7UUFDekMsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEVBQ3JELENBQU0sSUFBSSxFQUFDLEVBQUU7WUFDWCxJQUFJLE1BQU0sWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDdkMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN4QjtRQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDTCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFWRCxrQ0FV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Q0FBQyxDQUFDLENBQUMsRUFDckU7Z0JBQ0YsTUFBTSxJQUFBLG1CQUFXLEVBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztDQUFBO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQge3JlbW92ZVN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQge2dldFdvcmtEaXJ9IGZyb20gJy4vbWlzYyc7XG5cbmV4cG9ydCBjb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG4vLyBleHBvcnQgY29uc3QgcmVhZGRpckFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMucmVhZGRpcik7XG5leHBvcnQgY29uc3QgbHN0YXRBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLmxzdGF0KTtcbi8vIGV4cG9ydCBjb25zdCBfc3ltbGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMuc3ltbGluayk7XG5leHBvcnQgY29uc3QgdW5saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy51bmxpbmspO1xuXG4vKipcbiAqIFJldHVybiBhbGwgZGVsZXRlZCBzeW1saW5rc1xuICogQHBhcmFtIGRlbGV0ZU9wdGlvbiBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2Nhbk5vZGVNb2R1bGVzKGRpciA9IHByb2Nlc3MuY3dkKCksIGRlbGV0ZU9wdGlvbjogJ2FsbCcgfCAnaW52YWxpZCcgPSAnaW52YWxpZCcpIHtcbiAgY29uc3QgZGVsZXRlQWxsID0gZGVsZXRlT3B0aW9uID09PSAnYWxsJztcbiAgY29uc3QgZGVsZXRlZExpc3Q6IHN0cmluZ1tdID0gW107XG4gIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyhQYXRoLmpvaW4oZGlyLCAnbm9kZV9tb2R1bGVzJyksXG4gICAgYXN5bmMgbGluayA9PiB7XG4gICAgICBpZiAoYXdhaXQgdmFsaWRhdGVMaW5rKGxpbmssIGRlbGV0ZUFsbCkpIHtcbiAgICAgICAgZGVsZXRlZExpc3QucHVzaChsaW5rKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgcmV0dXJuIGRlbGV0ZWRMaXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdE1vZHVsZVN5bWxpbmtzKFxuICBwYXJlbnREaXI6IHN0cmluZyxcbiAgb25Gb3VuZDogKGxpbms6IHN0cmluZykgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHtcbiAgLy8gY29uc3QgbGV2ZWwxRGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhwYXJlbnREaXIpO1xuICByZXR1cm4gcnguZnJvbShmcy5wcm9taXNlcy5yZWFkZGlyKHBhcmVudERpcikpLnBpcGUoXG4gICAgb3AuY29uY2F0TWFwKGxldmVsMURpcnMgPT4gbGV2ZWwxRGlycyksXG4gICAgb3AubWVyZ2VNYXAoZGlybmFtZSA9PiB7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXJuYW1lKTtcbiAgICAgIGlmIChkaXJuYW1lLnN0YXJ0c1dpdGgoJ0AnKSAmJiBmcy5zdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gICAgICAgIHJldHVybiByeC5mcm9tKGZzLnByb21pc2VzLnJlYWRkaXIoZGlyKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgb3AubWVyZ2VNYXAoc3ViZGlycyA9PiBzdWJkaXJzKSxcbiAgICAgICAgICBvcC5tZXJnZU1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKGRpciwgZmlsZSkpKVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9uRWFjaEZpbGUoZGlyKTtcbiAgICAgIH1cbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuICAvLyBhd2FpdCBQcm9taXNlLmFsbChsZXZlbDFEaXJzLm1hcChhc3luYyBkaXIgPT4ge1xuICAvLyAgIGlmIChkaXIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gIC8vICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgLy8gICAgIGNvbnN0IHN1YmRpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gIC8vICAgICBhd2FpdCBQcm9taXNlLmFsbChzdWJkaXJzLm1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyLCBmaWxlKSkpKTtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgYXdhaXQgb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgLy8gICB9XG4gIC8vIH0pKTtcblxuICBhc3luYyBmdW5jdGlvbiBvbkVhY2hGaWxlKGZpbGU6IHN0cmluZykge1xuICAgIGxldCBpc1N5bWxpbmsgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgaXNTeW1saW5rID0gZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICBpZiAoaXNTeW1saW5rKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25Gb3VuZChmaWxlKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRG8gY2hlY2sgZXhpc3Rpbmcgc3ltbGluaywgcmVjcmVhdGUgYSBuZXcgb25lIGlmIGV4aXN0aW5nIG9uZSBpcyBpbnZhbGlkIHN5bWxpbmtcbiAqIEBwYXJhbSBsaW5rVGFyZ2V0IFxuICogQHBhcmFtIGxpbmsgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW1saW5rQXN5bmMobGlua1RhcmdldDogc3RyaW5nLCBsaW5rOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGxpbmspLmlzU3ltYm9saWNMaW5rKCkgJiYgUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSA9PT0gbGlua1RhcmdldCkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ2V4aXRzJywgbGluayk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGByZW1vdmUgJHtsaW5rfWApO1xuICAgIGZzLnVubGlua1N5bmMobGluayk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gbGluayBkb2VzIG5vdCBleGlzdFxuICAgIC8vIGNvbnNvbGUubG9nKGV4KTtcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgY3JlYXRlIHN5bWxpbmsgJHtsaW5rfSAtLT4gJHtsaW5rVGFyZ2V0fWApO1xuICByZXR1cm4gZnMucHJvbWlzZXMuc3ltbGluayhcbiAgICBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgbGlua1RhcmdldCksXG4gICAgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJ1xuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVMaW5rKGxpbms6IHN0cmluZywgZGVsZXRlQWxsID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgIChkZWxldGVBbGwgfHwgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSkpXG4gICAgICApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3N5bWxpbmsgY2hlY2tdIFJlbW92ZSAke2RlbGV0ZUFsbCA/ICcnIDogJ2ludmFsaWQnfSBzeW1saW5rICR7UGF0aC5yZWxhdGl2ZSgnLicsIGxpbmspfWApO1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIERlbGV0ZSBzeW1saW5rIG9yIGZpbGUvZGlyZWN0b3J5IGlmIGl0IGlzIGludmFsaWQgc3ltbGluayBvciBwb2ludGluZyB0byBub25leGlzdGluZyB0YXJnZXRcbiAqIEBwYXJhbSBsaW5rIHRoZSBzeW1saW5rXG4gKiBAcGFyYW0gdGFyZ2V0IFxuICogQHJldHVybnMgdHJ1ZSBpZiBuZWVkcyB0byBjcmVhdGUgYSBuZXcgc3ltbGlua1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVjcmVhdGVTeW1saW5rKGxpbms6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpXG4gICAgICApIHtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuIl19