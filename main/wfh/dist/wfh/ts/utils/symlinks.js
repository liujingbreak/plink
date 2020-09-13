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
                if (fs.lstatSync(file).isSymbolicLink()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUVQLFFBQUEsT0FBTyxHQUFHLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLFFBQUEsWUFBWSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLFFBQUEsVUFBVSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLFFBQUEsYUFBYSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJELFNBQThCLGVBQWUsQ0FBQyxlQUFrQyxTQUFTOztRQUN2RixNQUFNLFNBQVMsR0FBRyxZQUFZLEtBQUssS0FBSyxDQUFDO1FBQ3pDLE1BQU0sa0JBQWtCLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDNUcsQ0FBQztDQUFBO0FBSEQsa0NBR0M7QUFFRCxTQUFzQixrQkFBa0IsQ0FDdEMsU0FBaUIsRUFDakIsT0FBdUM7O1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLE1BQU0sb0JBQVksQ0FBQyxTQUFTLENBQUMsQ0FB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aW1wb3J0IGFueSAzcmQtcGFydHkgZGVwZW5kZW5jeSBpbiB0aGlzIGZpbGUsXG4gKiBpdCBpcyBydW4gYnkgYGluaXRgIGNvbW1hbmQgYXQgdGhlIHRpbWUgdGhlcmUgcHJvYmFibHkgaXNcbiAqIG5vIGRlcGVuZGVuY2llcyBpbnN0YWxsZWQgeWV0XG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5cbmV4cG9ydCBjb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5leHBvcnQgY29uc3QgcmVhZGRpckFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMucmVhZGRpcik7XG5leHBvcnQgY29uc3QgbHN0YXRBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLmxzdGF0KTtcbmV4cG9ydCBjb25zdCBfc3ltbGlua0FzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMuc3ltbGluayk7XG5leHBvcnQgY29uc3QgdW5saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy51bmxpbmspO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBzY2FuTm9kZU1vZHVsZXMoZGVsZXRlT3B0aW9uOiAnYWxsJyB8ICdpbnZhbGlkJyA9ICdpbnZhbGlkJykge1xuICBjb25zdCBkZWxldGVBbGwgPSBkZWxldGVPcHRpb24gPT09ICdhbGwnO1xuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3MoUGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnKSwgbGluayA9PiB2YWxpZGF0ZUxpbmsobGluaywgZGVsZXRlQWxsKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0TW9kdWxlU3ltbGlua3MoXG4gIHBhcmVudERpcjogc3RyaW5nLFxuICBvbkZvdW5kOiAobGluazogc3RyaW5nKSA9PiBQcm9taXNlPGFueT4pIHtcbiAgY29uc3QgbGV2ZWwxRGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhwYXJlbnREaXIpO1xuICBhd2FpdCBQcm9taXNlLmFsbChsZXZlbDFEaXJzLm1hcChhc3luYyBkaXIgPT4ge1xuICAgIGlmIChkaXIuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAvLyBpdCBpcyBhIHNjb3BlIHBhY2thZ2VcbiAgICAgIGNvbnN0IHN1YmRpcnMgPSBhd2FpdCByZWFkZGlyQXN5bmMoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyKSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChzdWJkaXJzLm1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHBhcmVudERpciwgZGlyLCBmaWxlKSkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgb25FYWNoRmlsZShQYXRoLnJlc29sdmUocGFyZW50RGlyLCBkaXIpKTtcbiAgICB9XG4gIH0pKTtcblxuICBhc3luYyBmdW5jdGlvbiBvbkVhY2hGaWxlKGZpbGU6IHN0cmluZykge1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgb25Gb3VuZChmaWxlKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiAxLiBjcmVhdGUgc3ltbGluayBub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlIC0tPiBkaXJlY3RvcnkgXCJtYWluXCJcbiAqIDIuIGNyZWF0ZSBzeW1saW5rIDxwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gbGlua0RyY3AoKSB7XG4gIGNvbnN0IHNvdXJjZURpciA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi8uLicpOyAvLyBkaXJlY3RvcnkgXCJtYWluXCJcblxuICAvLyAxLiBjcmVhdGUgc3ltbGluayBub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlIC0tPiBkaXJlY3RvcnkgXCJtYWluXCJcbiAgY29uc3QgdGFyZ2V0ID0gZ2V0UmVhbFBhdGgoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKTtcbiAgaWYgKHRhcmdldCAhPT0gc291cmNlRGlyKSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSlcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzJyk7XG5cbiAgICBpZiAodGFyZ2V0ICE9IG51bGwpIHtcbiAgICAgIGZzLnVubGlua1N5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpO1xuICAgIH1cbiAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJyksIHNvdXJjZURpciksXG4gICAgICBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJykgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgfVxuXG4gIC8vIC8vIDIuIGNyZWF0ZSBzeW1saW5rIDxwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICAvLyBjb25zdCB0b3BNb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUoc291cmNlRGlyLCAnLi4vbm9kZV9tb2R1bGVzJyk7XG4gIC8vIGlmIChmcy5leGlzdHNTeW5jKHRvcE1vZHVsZURpcikpIHtcbiAgLy8gICBpZiAoZnMucmVhbHBhdGhTeW5jKHRvcE1vZHVsZURpcikgIT09IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpIHtcbiAgLy8gICAgIGZzLnVubGlua1N5bmModG9wTW9kdWxlRGlyKTtcbiAgLy8gICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gIC8vICAgfVxuICAvLyB9IGVsc2Uge1xuICAvLyAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyh0b3BNb2R1bGVEaXIgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgLy8gfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0FzeW5jKGxpbmtUYXJnZXQ6IHN0cmluZywgbGluazogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhsaW5rKS5pc1N5bWJvbGljTGluaygpICYmIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkgPT09IGxpbmtUYXJnZXQpXG4gICAgICByZXR1cm47XG4gICAgZnMudW5saW5rU3luYyhsaW5rKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgcmVtb3ZlICR7bGlua31gKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICAvLyBsaW5rIGRvZXMgbm90IGV4aXN0XG4gIH1cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGBjcmVhdGUgc3ltbGluayAke2xpbmt9IC0tPiAke2xpbmtUYXJnZXR9YCk7XG4gIHJldHVybiBfc3ltbGlua0FzeW5jKFxuICAgIFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBsaW5rVGFyZ2V0KSxcbiAgICBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInXG4gICk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZUxpbmsobGluazogc3RyaW5nLCBkZWxldGVBbGwgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgKGRlbGV0ZUFsbCB8fCAhZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGxpbmspLCBmcy5yZWFkbGlua1N5bmMobGluaykpKSlcbiAgICAgICkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3N5bWxpbmsgY2hlY2tdIFJlbW92ZSAke2RlbGV0ZUFsbCA/ICcnIDogJ2ludmFsaWQnfSBzeW1saW5rICR7UGF0aC5yZWxhdGl2ZSgnLicsIGxpbmspfWApO1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIERlbGV0ZSBzeW1saW5rIG9yIGZpbGUvZGlyZWN0b3J5IGlmIGl0IGlzIGludmFsaWQgc3ltbGluayBvciBwb2ludGluZyB0byBub25leGlzdGluZyB0YXJnZXRcbiAqIEBwYXJhbSBsaW5rIHRoZSBzeW1saW5rXG4gKiBAcGFyYW0gdGFyZ2V0IFxuICogQHJldHVybnMgdHJ1ZSBpZiBuZWVkcyB0byBjcmVhdGUgYSBuZXcgc3ltbGlua1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVjcmVhdGVTeW1saW5rKGxpbms6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBpZiAoKGF3YWl0IGxzdGF0QXN5bmMobGluaykpLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpXG4gICAgICApIHtcbiAgICAgIGF3YWl0IHVubGlua0FzeW5jKGxpbmspO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBVbmxpa2UgZnMucmVhbFBhdGgoKSwgaXQgc3VwcG9ydHMgc3ltbGluayBvZiB3aGljaCB0YXJnZXQgZmlsZSBubyBsb25nZXIgZXhpc3RzXG4gKiBAcGFyYW0gZmlsZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlYWxQYXRoKGZpbGU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGZzLnJlYWRsaW5rU3luYyhmaWxlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoZmlsZSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuIl19