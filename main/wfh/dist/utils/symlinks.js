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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
            fs.unlinkSync(path_1.default.resolve('node_modules/@wfh/plink'));
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
function symlinkAsync(linkTarget, link) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (fs.lstatSync(link).isSymbolicLink() && path_1.default.resolve(path_1.default.dirname(link), fs.readlinkSync(link)) === linkTarget)
                return;
            fs.unlinkSync(link);
            // tslint:disable-next-line: no-console
            console.log(`remove ${link}`);
        }
        catch (ex) {
            // link does not exist
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUVQLFFBQUEsT0FBTyxHQUFHLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLFFBQUEsWUFBWSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLFFBQUEsVUFBVSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLFFBQUEsYUFBYSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJELFNBQThCLGVBQWUsQ0FBQyxlQUFrQyxTQUFTOztRQUN2RixNQUFNLFNBQVMsR0FBRyxZQUFZLEtBQUssS0FBSyxDQUFDO1FBQ3pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDNUcsQ0FBQztDQUFBO0FBSEQsa0NBR0M7QUFFRCxTQUFzQixrQkFBa0IsQ0FDdEMsU0FBaUIsRUFDakIsT0FBdUM7O1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLE1BQU0sb0JBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNq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QUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO2FBQU07WUFDTCxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7S0FDRjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxJQUFJLENBQUM7S0FDYjtBQUNILENBQUM7QUFWRCxrQ0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRG8gbm90IGltcG9ydCBhbnkgM3JkLXBhcnR5IGRlcGVuZGVuY3kgaW4gdGhpcyBmaWxlLFxuICogaXQgaXMgcnVuIGJ5IGBpbml0YCBjb21tYW5kIGF0IHRoZSB0aW1lIHRoZXJlIHByb2JhYmx5IGlzXG4gKiBubyBkZXBlbmRlbmNpZXMgaW5zdGFsbGVkIHlldFxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuZXhwb3J0IGNvbnN0IHJlYWRkaXJBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnJlYWRkaXIpO1xuZXhwb3J0IGNvbnN0IGxzdGF0QXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5sc3RhdCk7XG5leHBvcnQgY29uc3QgX3N5bWxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnN5bWxpbmspO1xuZXhwb3J0IGNvbnN0IHVubGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMudW5saW5rKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2Nhbk5vZGVNb2R1bGVzKGRlbGV0ZU9wdGlvbjogJ2FsbCcgfCAnaW52YWxpZCcgPSAnaW52YWxpZCcpIHtcbiAgY29uc3QgZGVsZXRlQWxsID0gZGVsZXRlT3B0aW9uID09PSAnYWxsJztcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKFBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJyksIGxpbmsgPT4gdmFsaWRhdGVMaW5rKGxpbmssIGRlbGV0ZUFsbCkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdE1vZHVsZVN5bWxpbmtzKFxuICBwYXJlbnREaXI6IHN0cmluZyxcbiAgb25Gb3VuZDogKGxpbms6IHN0cmluZykgPT4gUHJvbWlzZTxhbnk+KSB7XG4gIGNvbnN0IGxldmVsMURpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMocGFyZW50RGlyKTtcbiAgYXdhaXQgUHJvbWlzZS5hbGwobGV2ZWwxRGlycy5tYXAoYXN5bmMgZGlyID0+IHtcbiAgICBpZiAoZGlyLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgLy8gaXQgaXMgYSBzY29wZSBwYWNrYWdlXG4gICAgICBjb25zdCBzdWJkaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcikpO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoc3ViZGlycy5tYXAoZmlsZSA9PiBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpciwgZmlsZSkpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gICAgfVxuICB9KSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25FYWNoRmlsZShmaWxlOiBzdHJpbmcpIHtcbiAgICBsZXQgaXNTeW1saW5rID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGlzU3ltbGluayA9IGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgaWYgKGlzU3ltbGluaykge1xuICAgICAgYXdhaXQgb25Gb3VuZChmaWxlKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiAxLiBjcmVhdGUgc3ltbGluayBub2RlX21vZHVsZXMvQHdmaC9wbGluayAtLT4gZGlyZWN0b3J5IFwibWFpblwiXG4gKiAyLiBjcmVhdGUgc3ltbGluayA8cGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmtEcmNwKCkge1xuICBjb25zdCBzb3VyY2VEaXIgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4nKTsgLy8gZGlyZWN0b3J5IFwibWFpblwiXG5cbiAgLy8gMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICBjb25zdCB0YXJnZXQgPSBnZXRSZWFsUGF0aCgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKTtcbiAgaWYgKHRhcmdldCAhPT0gc291cmNlRGlyKSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSlcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzJyk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMvQHdmaCcpKVxuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMvQHdmaCcpO1xuXG4gICAgaWYgKHRhcmdldCAhPSBudWxsKSB7XG4gICAgICBmcy51bmxpbmtTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSk7XG4gICAgfVxuICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaCcpLCBzb3VyY2VEaXIpLFxuICAgICAgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaCcsICdwbGluaycpLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdAd2ZoL3BsaW5rJykgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgfVxuXG4gIC8vIC8vIDIuIGNyZWF0ZSBzeW1saW5rIDxwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICAvLyBjb25zdCB0b3BNb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUoc291cmNlRGlyLCAnLi4vbm9kZV9tb2R1bGVzJyk7XG4gIC8vIGlmIChmcy5leGlzdHNTeW5jKHRvcE1vZHVsZURpcikpIHtcbiAgLy8gICBpZiAoZnMucmVhbHBhdGhTeW5jKHRvcE1vZHVsZURpcikgIT09IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpIHtcbiAgLy8gICAgIGZzLnVubGlua1N5bmModG9wTW9kdWxlRGlyKTtcbiAgLy8gICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gIC8vICAgfVxuICAvLyB9IGVsc2Uge1xuICAvLyAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyh0b3BNb2R1bGVEaXIgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgLy8gfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0FzeW5jKGxpbmtUYXJnZXQ6IHN0cmluZywgbGluazogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhsaW5rKS5pc1N5bWJvbGljTGluaygpICYmIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkgPT09IGxpbmtUYXJnZXQpXG4gICAgICByZXR1cm47XG4gICAgZnMudW5saW5rU3luYyhsaW5rKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgcmVtb3ZlICR7bGlua31gKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyBsaW5rIGRvZXMgbm90IGV4aXN0XG4gIH1cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGBjcmVhdGUgc3ltbGluayAke2xpbmt9IC0tPiAke2xpbmtUYXJnZXR9YCk7XG4gIHJldHVybiBfc3ltbGlua0FzeW5jKFxuICAgIFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBsaW5rVGFyZ2V0KSxcbiAgICBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUxpbmsobGluazogc3RyaW5nLCBkZWxldGVBbGwgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgKGRlbGV0ZUFsbCB8fCAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKSlcbiAgICAgICkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3N5bWxpbmsgY2hlY2tdIFJlbW92ZSAke2RlbGV0ZUFsbCA/ICcnIDogJ2ludmFsaWQnfSBzeW1saW5rICR7UGF0aC5yZWxhdGl2ZSgnLicsIGxpbmspfWApO1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIERlbGV0ZSBzeW1saW5rIG9yIGZpbGUvZGlyZWN0b3J5IGlmIGl0IGlzIGludmFsaWQgc3ltbGluayBvciBwb2ludGluZyB0byBub25leGlzdGluZyB0YXJnZXRcbiAqIEBwYXJhbSBsaW5rIHRoZSBzeW1saW5rXG4gKiBAcGFyYW0gdGFyZ2V0IFxuICogQHJldHVybnMgdHJ1ZSBpZiBuZWVkcyB0byBjcmVhdGUgYSBuZXcgc3ltbGlua1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVjcmVhdGVTeW1saW5rKGxpbms6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpXG4gICAgICApIHtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBVbmxpa2UgZnMucmVhbFBhdGgoKSwgaXQgc3VwcG9ydHMgc3ltbGluayBvZiB3aGljaCB0YXJnZXQgZmlsZSBubyBsb25nZXIgZXhpc3RzXG4gKiBAcGFyYW0gZmlsZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlYWxQYXRoKGZpbGU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGZzLnJlYWRsaW5rU3luYyhmaWxlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoZmlsZSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuIl19