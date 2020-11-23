"use strict";
/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */
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
exports.getRealPath = exports.recreateSymlink = exports.validateLink = exports.symlinkAsync = exports.linkDrcp = exports.listModuleSymlinks = exports.unlinkAsync = exports._symlinkAsync = exports.lstatAsync = exports.readdirAsync = exports.isWin32 = void 0;
const fs = __importStar(require("fs"));
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
exports.readdirAsync = util_1.default.promisify(fs.readdir);
exports.lstatAsync = util_1.default.promisify(fs.lstat);
exports._symlinkAsync = util_1.default.promisify(fs.symlink);
exports.unlinkAsync = util_1.default.promisify(fs.unlink);
function scanNodeModules(deleteOption = 'invalid') {
    return __awaiter(this, void 0, void 0, function* () {
        const deleteAll = deleteOption === 'all';
        yield listModuleSymlinks(path_1.default.join(process.cwd(), 'node_modules'), link => validateLink(link, deleteAll));
    });
}
exports.default = scanNodeModules;
function listModuleSymlinks(parentDir, onFound) {
    return __awaiter(this, void 0, void 0, function* () {
        const level1Dirs = yield exports.readdirAsync(parentDir);
        yield Promise.all(level1Dirs.map((dir) => __awaiter(this, void 0, void 0, function* () {
            if (dir.startsWith('@')) {
                // it is a scope package
                const subdirs = yield exports.readdirAsync(path_1.default.resolve(parentDir, dir));
                yield Promise.all(subdirs.map(file => onEachFile(path_1.default.resolve(parentDir, dir, file))));
            }
            else {
                yield onEachFile(path_1.default.resolve(parentDir, dir));
            }
        })));
        function onEachFile(file) {
            return __awaiter(this, void 0, void 0, function* () {
                let isSymlink = false;
                try {
                    isSymlink = fs.lstatSync(file).isSymbolicLink();
                }
                catch (e) { }
                if (isSymlink) {
                    yield onFound(file);
                }
            });
        }
    });
}
exports.listModuleSymlinks = listModuleSymlinks;
/**
 * 1. create symlink node_modules/@wfh/plink --> directory "main"
 * 2. create symlink <parent directory of "main">/node_modules --> node_modules
 */
function linkDrcp() {
    const sourceDir = path_1.default.resolve(__dirname, '../../..'); // directory "main"
    // 1. create symlink node_modules/@wfh/plink --> directory "main"
    const target = getRealPath('node_modules/@wfh/plink');
    if (target !== sourceDir) {
        if (!fs.existsSync('node_modules'))
            fs.mkdirSync('node_modules');
        if (!fs.existsSync('node_modules/@wfh'))
            fs.mkdirSync('node_modules/@wfh');
        if (target != null) {
            fs_extra_1.removeSync(path_1.default.resolve('node_modules/@wfh/plink'));
            // fs.unlinkSync(Path.resolve('node_modules/@wfh/plink'));
        }
        fs.symlinkSync(path_1.default.relative(path_1.default.resolve('node_modules', '@wfh'), sourceDir), path_1.default.resolve('node_modules', '@wfh', 'plink'), exports.isWin32 ? 'junction' : 'dir');
        // tslint:disable-next-line: no-console
        console.log(path_1.default.resolve('node_modules', '@wfh/plink') + ' is created');
    }
    // // 2. create symlink <parent directory of "main">/node_modules --> node_modules
    // const topModuleDir = Path.resolve(sourceDir, '../node_modules');
    // if (fs.existsSync(topModuleDir)) {
    //   if (fs.realpathSync(topModuleDir) !== Path.resolve('node_modules')) {
    //     fs.unlinkSync(topModuleDir);
    //     fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
    //     topModuleDir, isWin32 ? 'junction' : 'dir');
    //     // tslint:disable-next-line: no-console
    //     console.log(topModuleDir + ' is created');
    //   }
    // } else {
    //   fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
    //     topModuleDir, isWin32 ? 'junction' : 'dir');
    //   // tslint:disable-next-line: no-console
    //   console.log(topModuleDir + ' is created');
    // }
}
exports.linkDrcp = linkDrcp;
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
        return exports._symlinkAsync(path_1.default.relative(path_1.default.dirname(link), linkTarget), link, exports.isWin32 ? 'junction' : 'dir');
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
/**
 * Unlike fs.realPath(), it supports symlink of which target file no longer exists
 * @param file
 */
function getRealPath(file) {
    try {
        if (fs.lstatSync(file).isSymbolicLink()) {
            return path_1.default.resolve(path_1.default.dirname(file), fs.readlinkSync(file));
        }
        else {
            return path_1.default.resolve(file);
        }
    }
    catch (e) {
        return null;
    }
}
exports.getRealPath = getRealPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6Qix1Q0FBb0M7QUFDcEMsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFFUCxRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QyxRQUFBLFlBQVksR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxQyxRQUFBLFVBQVUsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QyxRQUFBLGFBQWEsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzQyxRQUFBLFdBQVcsR0FBRyxjQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUVyRCxTQUE4QixlQUFlLENBQUMsZUFBa0MsU0FBUzs7UUFDdkYsTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLEtBQUssQ0FBQztRQUN6QyxNQUFNLGtCQUFrQixDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzVHLENBQUM7Q0FBQTtBQUhELGtDQUdDO0FBRUQsU0FBc0Isa0JBQWtCLENBQ3RDLFNBQWlCLEVBQ2pCLE9BQXVDOztRQUN2QyxNQUFNLFVBQVUsR0FBRyxNQUFNLG9CQUFZLENBQUMsU0FBUyxD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LE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRTthQUFNO1lBQ0wsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNCO0tBQ0Y7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFDSCxDQUFDO0FBVkQsa0NBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvIG5vdCBpbXBvcnQgYW55IDNyZC1wYXJ0eSBkZXBlbmRlbmN5IGluIHRoaXMgZmlsZSxcbiAqIGl0IGlzIHJ1biBieSBgaW5pdGAgY29tbWFuZCBhdCB0aGUgdGltZSB0aGVyZSBwcm9iYWJseSBpc1xuICogbm8gZGVwZW5kZW5jaWVzIGluc3RhbGxlZCB5ZXRcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3JlbW92ZVN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuZXhwb3J0IGNvbnN0IHJlYWRkaXJBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnJlYWRkaXIpO1xuZXhwb3J0IGNvbnN0IGxzdGF0QXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5sc3RhdCk7XG5leHBvcnQgY29uc3QgX3N5bWxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnN5bWxpbmspO1xuZXhwb3J0IGNvbnN0IHVubGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMudW5saW5rKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2Nhbk5vZGVNb2R1bGVzKGRlbGV0ZU9wdGlvbjogJ2FsbCcgfCAnaW52YWxpZCcgPSAnaW52YWxpZCcpIHtcbiAgY29uc3QgZGVsZXRlQWxsID0gZGVsZXRlT3B0aW9uID09PSAnYWxsJztcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKFBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJyksIGxpbmsgPT4gdmFsaWRhdGVMaW5rKGxpbmssIGRlbGV0ZUFsbCkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdE1vZHVsZVN5bWxpbmtzKFxuICBwYXJlbnREaXI6IHN0cmluZyxcbiAgb25Gb3VuZDogKGxpbms6IHN0cmluZykgPT4gUHJvbWlzZTxhbnk+KSB7XG4gIGNvbnN0IGxldmVsMURpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMocGFyZW50RGlyKTtcbiAgYXdhaXQgUHJvbWlzZS5hbGwobGV2ZWwxRGlycy5tYXAoYXN5bmMgZGlyID0+IHtcbiAgICBpZiAoZGlyLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gICAgICBjb25zdCBzdWJkaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcikpO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoc3ViZGlycy5tYXAoZmlsZSA9PiBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpciwgZmlsZSkpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gICAgfVxuICB9KSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25FYWNoRmlsZShmaWxlOiBzdHJpbmcpIHtcbiAgICBsZXQgaXNTeW1saW5rID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGlzU3ltbGluayA9IGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgaWYgKGlzU3ltbGluaykge1xuICAgICAgYXdhaXQgb25Gb3VuZChmaWxlKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiAxLiBjcmVhdGUgc3ltbGluayBub2RlX21vZHVsZXMvQHdmaC9wbGluayAtLT4gZGlyZWN0b3J5IFwibWFpblwiXG4gKiAyLiBjcmVhdGUgc3ltbGluayA8cGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmtEcmNwKCkge1xuICBjb25zdCBzb3VyY2VEaXIgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4nKTsgLy8gZGlyZWN0b3J5IFwibWFpblwiXG5cbiAgLy8gMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICBjb25zdCB0YXJnZXQgPSBnZXRSZWFsUGF0aCgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKTtcbiAgaWYgKHRhcmdldCAhPT0gc291cmNlRGlyKSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSlcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzJyk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMvQHdmaCcpKVxuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMvQHdmaCcpO1xuXG4gICAgaWYgKHRhcmdldCAhPSBudWxsKSB7XG4gICAgICByZW1vdmVTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSk7XG4gICAgICAvLyBmcy51bmxpbmtTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSk7XG4gICAgfVxuICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaCcpLCBzb3VyY2VEaXIpLFxuICAgICAgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaCcsICdwbGluaycpLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdAd2ZoL3BsaW5rJykgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgfVxuXG4gIC8vIC8vIDIuIGNyZWF0ZSBzeW1saW5rIDxwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICAvLyBjb25zdCB0b3BNb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUoc291cmNlRGlyLCAnLi4vbm9kZV9tb2R1bGVzJyk7XG4gIC8vIGlmIChmcy5leGlzdHNTeW5jKHRvcE1vZHVsZURpcikpIHtcbiAgLy8gICBpZiAoZnMucmVhbHBhdGhTeW5jKHRvcE1vZHVsZURpcikgIT09IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpIHtcbiAgLy8gICAgIGZzLnVubGlua1N5bmModG9wTW9kdWxlRGlyKTtcbiAgLy8gICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gIC8vICAgfVxuICAvLyB9IGVsc2Uge1xuICAvLyAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyh0b3BNb2R1bGVEaXIgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgLy8gfVxufVxuXG4vKipcbiAqIERvIGNoZWNrIGV4aXN0aW5nIHN5bWxpbmssIHJlY3JlYXRlIGEgbmV3IG9uZSBpZiBleGlzdGluZyBvbmUgaXMgaW52YWxpZCBzeW1saW5rXG4gKiBAcGFyYW0gbGlua1RhcmdldCBcbiAqIEBwYXJhbSBsaW5rIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0FzeW5jKGxpbmtUYXJnZXQ6IHN0cmluZywgbGluazogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhsaW5rKS5pc1N5bWJvbGljTGluaygpICYmIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkgPT09IGxpbmtUYXJnZXQpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdleGl0cycsIGxpbmspO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYHJlbW92ZSAke2xpbmt9YCk7XG4gICAgZnMudW5saW5rU3luYyhsaW5rKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyBsaW5rIGRvZXMgbm90IGV4aXN0XG4gICAgLy8gY29uc29sZS5sb2coZXgpO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgY3JlYXRlIHN5bWxpbmsgJHtsaW5rfSAtLT4gJHtsaW5rVGFyZ2V0fWApO1xuICByZXR1cm4gX3N5bWxpbmtBc3luYyhcbiAgICBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgbGlua1RhcmdldCksXG4gICAgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJ1xuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVMaW5rKGxpbms6IHN0cmluZywgZGVsZXRlQWxsID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgIChkZWxldGVBbGwgfHwgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSkpXG4gICAgICApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtzeW1saW5rIGNoZWNrXSBSZW1vdmUgJHtkZWxldGVBbGwgPyAnJyA6ICdpbnZhbGlkJ30gc3ltbGluayAke1BhdGgucmVsYXRpdmUoJy4nLCBsaW5rKX1gKTtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWxldGUgc3ltbGluayBvciBmaWxlL2RpcmVjdG9yeSBpZiBpdCBpcyBpbnZhbGlkIHN5bWxpbmsgb3IgcG9pbnRpbmcgdG8gbm9uZXhpc3RpbmcgdGFyZ2V0XG4gKiBAcGFyYW0gbGluayB0aGUgc3ltbGlua1xuICogQHBhcmFtIHRhcmdldCBcbiAqIEByZXR1cm5zIHRydWUgaWYgbmVlZHMgdG8gY3JlYXRlIGEgbmV3IHN5bWxpbmtcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY3JlYXRlU3ltbGluayhsaW5rOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKVxuICAgICAgKSB7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogVW5saWtlIGZzLnJlYWxQYXRoKCksIGl0IHN1cHBvcnRzIHN5bWxpbmsgb2Ygd2hpY2ggdGFyZ2V0IGZpbGUgbm8gbG9uZ2VyIGV4aXN0c1xuICogQHBhcmFtIGZpbGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZWFsUGF0aChmaWxlOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBmcy5yZWFkbGlua1N5bmMoZmlsZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKGZpbGUpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbiJdfQ==