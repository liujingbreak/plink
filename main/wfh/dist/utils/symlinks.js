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
 * 1. create symlink node_modules/dr-comp-package --> directory "main"
 * 2. create symlink <parent directory of "main">/node_modules --> node_modules
 */
function linkDrcp() {
    const sourceDir = path_1.default.resolve(__dirname, '../../..'); // directory "main"
    // 1. create symlink node_modules/dr-comp-package --> directory "main"
    const target = getRealPath('node_modules/dr-comp-package');
    if (target !== sourceDir) {
        if (!fs.existsSync('node_modules'))
            fs.mkdirSync('node_modules');
        if (target != null) {
            fs.unlinkSync(path_1.default.resolve('node_modules/dr-comp-package'));
        }
        fs.symlinkSync(path_1.default.relative(path_1.default.resolve('node_modules'), sourceDir), path_1.default.resolve('node_modules', 'dr-comp-package'), exports.isWin32 ? 'junction' : 'dir');
        // tslint:disable-next-line: no-console
        console.log(path_1.default.resolve('node_modules', 'dr-comp-package') + ' is created');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUVQLFFBQUEsT0FBTyxHQUFHLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLFFBQUEsWUFBWSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLFFBQUEsVUFBVSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLFFBQUEsYUFBYSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJELFNBQThCLGVBQWUsQ0FBQyxlQUFrQyxTQUFTOztRQUN2RixNQUFNLFNBQVMsR0FBRyxZQUFZLEtBQUssS0FBSyxDQUFDO1FBQ3pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDNUcsQ0FBQztDQUFBO0FBSEQsa0NBR0M7QUFFRCxTQUFzQixrQkFBa0IsQ0FDdEMsU0FBaUIsRUFDakIsT0FBdUM7O1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLE1BQU0sb0JBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNq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QUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFDSCxDQUFDO0FBVkQsa0NBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvIG5vdCBpbXBvcnQgYW55IDNyZC1wYXJ0eSBkZXBlbmRlbmN5IGluIHRoaXMgZmlsZSxcbiAqIGl0IGlzIHJ1biBieSBgaW5pdGAgY29tbWFuZCBhdCB0aGUgdGltZSB0aGVyZSBwcm9iYWJseSBpc1xuICogbm8gZGVwZW5kZW5jaWVzIGluc3RhbGxlZCB5ZXRcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmV4cG9ydCBjb25zdCByZWFkZGlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5yZWFkZGlyKTtcbmV4cG9ydCBjb25zdCBsc3RhdEFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMubHN0YXQpO1xuZXhwb3J0IGNvbnN0IF9zeW1saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5zeW1saW5rKTtcbmV4cG9ydCBjb25zdCB1bmxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnVubGluayk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHNjYW5Ob2RlTW9kdWxlcyhkZWxldGVPcHRpb246ICdhbGwnIHwgJ2ludmFsaWQnID0gJ2ludmFsaWQnKSB7XG4gIGNvbnN0IGRlbGV0ZUFsbCA9IGRlbGV0ZU9wdGlvbiA9PT0gJ2FsbCc7XG4gIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyhQYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycpLCBsaW5rID0+IHZhbGlkYXRlTGluayhsaW5rLCBkZWxldGVBbGwpKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RNb2R1bGVTeW1saW5rcyhcbiAgcGFyZW50RGlyOiBzdHJpbmcsXG4gIG9uRm91bmQ6IChsaW5rOiBzdHJpbmcpID0+IFByb21pc2U8YW55Pikge1xuICBjb25zdCBsZXZlbDFEaXJzID0gYXdhaXQgcmVhZGRpckFzeW5jKHBhcmVudERpcik7XG4gIGF3YWl0IFByb21pc2UuYWxsKGxldmVsMURpcnMubWFwKGFzeW5jIGRpciA9PiB7XG4gICAgaWYgKGRpci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIGl0IGlzIGEgc2NvcGUgcGFja2FnZVxuICAgICAgY29uc3Qgc3ViZGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKHN1YmRpcnMubWFwKGZpbGUgPT4gb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIsIGZpbGUpKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBvbkVhY2hGaWxlKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsIGRpcikpO1xuICAgIH1cbiAgfSkpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uRWFjaEZpbGUoZmlsZTogc3RyaW5nKSB7XG4gICAgbGV0IGlzU3ltbGluayA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBpc1N5bWxpbmsgPSBmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIGlmIChpc1N5bWxpbmspIHtcbiAgICAgIGF3YWl0IG9uRm91bmQoZmlsZSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZSAtLT4gZGlyZWN0b3J5IFwibWFpblwiXG4gKiAyLiBjcmVhdGUgc3ltbGluayA8cGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmtEcmNwKCkge1xuICBjb25zdCBzb3VyY2VEaXIgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4nKTsgLy8gZGlyZWN0b3J5IFwibWFpblwiXG5cbiAgLy8gMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZSAtLT4gZGlyZWN0b3J5IFwibWFpblwiXG4gIGNvbnN0IHRhcmdldCA9IGdldFJlYWxQYXRoKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJyk7XG4gIGlmICh0YXJnZXQgIT09IHNvdXJjZURpcikge1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzJykpXG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuXG4gICAgaWYgKHRhcmdldCAhPSBudWxsKSB7XG4gICAgICBmcy51bmxpbmtTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKTtcbiAgICB9XG4gICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpLCBzb3VyY2VEaXIpLFxuICAgICAgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJyksIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpICsgJyBpcyBjcmVhdGVkJyk7XG4gIH1cblxuICAvLyAvLyAyLiBjcmVhdGUgc3ltbGluayA8cGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAgLy8gY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHNvdXJjZURpciwgJy4uL25vZGVfbW9kdWxlcycpO1xuICAvLyBpZiAoZnMuZXhpc3RzU3luYyh0b3BNb2R1bGVEaXIpKSB7XG4gIC8vICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0b3BNb2R1bGVEaXIpICE9PSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSB7XG4gIC8vICAgICBmcy51bmxpbmtTeW5jKHRvcE1vZHVsZURpcik7XG4gIC8vICAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZSh0b3BNb2R1bGVEaXIpLCBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSxcbiAgLy8gICAgIHRvcE1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIC8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICAgIGNvbnNvbGUubG9nKHRvcE1vZHVsZURpciArICcgaXMgY3JlYXRlZCcpO1xuICAvLyAgIH1cbiAgLy8gfSBlbHNlIHtcbiAgLy8gICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZSh0b3BNb2R1bGVEaXIpLCBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSxcbiAgLy8gICAgIHRvcE1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gIC8vIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtBc3luYyhsaW5rVGFyZ2V0OiBzdHJpbmcsIGxpbms6IHN0cmluZykge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMobGluaykuaXNTeW1ib2xpY0xpbmsoKSAmJiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpID09PSBsaW5rVGFyZ2V0KVxuICAgICAgcmV0dXJuO1xuICAgIGZzLnVubGlua1N5bmMobGluayk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYHJlbW92ZSAke2xpbmt9YCk7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgLy8gbGluayBkb2VzIG5vdCBleGlzdFxuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgY3JlYXRlIHN5bWxpbmsgJHtsaW5rfSAtLT4gJHtsaW5rVGFyZ2V0fWApO1xuICByZXR1cm4gX3N5bWxpbmtBc3luYyhcbiAgICBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShsaW5rKSwgbGlua1RhcmdldCksXG4gICAgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJ1xuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVMaW5rKGxpbms6IHN0cmluZywgZGVsZXRlQWxsID0gZmFsc2UpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgIChkZWxldGVBbGwgfHwgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSkpXG4gICAgICApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtzeW1saW5rIGNoZWNrXSBSZW1vdmUgJHtkZWxldGVBbGwgPyAnJyA6ICdpbnZhbGlkJ30gc3ltbGluayAke1BhdGgucmVsYXRpdmUoJy4nLCBsaW5rKX1gKTtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWxldGUgc3ltbGluayBvciBmaWxlL2RpcmVjdG9yeSBpZiBpdCBpcyBpbnZhbGlkIHN5bWxpbmsgb3IgcG9pbnRpbmcgdG8gbm9uZXhpc3RpbmcgdGFyZ2V0XG4gKiBAcGFyYW0gbGluayB0aGUgc3ltbGlua1xuICogQHBhcmFtIHRhcmdldCBcbiAqIEByZXR1cm5zIHRydWUgaWYgbmVlZHMgdG8gY3JlYXRlIGEgbmV3IHN5bWxpbmtcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY3JlYXRlU3ltbGluayhsaW5rOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKVxuICAgICAgKSB7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogVW5saWtlIGZzLnJlYWxQYXRoKCksIGl0IHN1cHBvcnRzIHN5bWxpbmsgb2Ygd2hpY2ggdGFyZ2V0IGZpbGUgbm8gbG9uZ2VyIGV4aXN0c1xuICogQHBhcmFtIGZpbGUgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZWFsUGF0aChmaWxlOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBmcy5yZWFkbGlua1N5bmMoZmlsZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKGZpbGUpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbiJdfQ==