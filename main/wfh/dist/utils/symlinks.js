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
exports.getRealPath = exports.recreateSymlink = exports.validateLink = exports.symlinkAsync = exports.linkDrcp = exports.scanNodeModulesForSymlinks = exports.unlinkAsync = exports._symlinkAsync = exports.lstatAsync = exports.readdirAsync = exports.isWin32 = void 0;
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
        yield scanNodeModulesForSymlinks(process.cwd(), link => validateLink(link, deleteAll));
    });
}
exports.default = scanNodeModules;
function scanNodeModulesForSymlinks(workspaceDir, onFound) {
    return __awaiter(this, void 0, void 0, function* () {
        const level1Dirs = yield exports.readdirAsync(path_1.default.resolve(workspaceDir, 'node_modules'));
        yield Promise.all(level1Dirs.map((dir) => __awaiter(this, void 0, void 0, function* () {
            if (dir.startsWith('@')) {
                // it is a scope package
                const subdirs = yield exports.readdirAsync(path_1.default.resolve(workspaceDir, 'node_modules', dir));
                yield Promise.all(subdirs.map(file => onEachFile(path_1.default.resolve(workspaceDir, 'node_modules', dir, file))));
            }
            else {
                yield onEachFile(path_1.default.resolve(workspaceDir, 'node_modules', dir));
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
exports.scanNodeModulesForSymlinks = scanNodeModulesForSymlinks;
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
    // 2. create symlink <parent directory of "main">/node_modules --> node_modules
    const topModuleDir = path_1.default.resolve(sourceDir, '../node_modules');
    if (fs.existsSync(topModuleDir)) {
        if (fs.realpathSync(topModuleDir) !== path_1.default.resolve('node_modules')) {
            fs.unlinkSync(topModuleDir);
            fs.symlinkSync(path_1.default.relative(path_1.default.dirname(topModuleDir), path_1.default.resolve('node_modules')), topModuleDir, exports.isWin32 ? 'junction' : 'dir');
            // tslint:disable-next-line: no-console
            console.log(topModuleDir + ' is created');
        }
    }
    else {
        fs.symlinkSync(path_1.default.relative(path_1.default.dirname(topModuleDir), path_1.default.resolve('node_modules')), topModuleDir, exports.isWin32 ? 'junction' : 'dir');
        // tslint:disable-next-line: no-console
        console.log(topModuleDir + ' is created');
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9zeW1saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUF5QjtBQUN6QixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUVQLFFBQUEsT0FBTyxHQUFHLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLFFBQUEsWUFBWSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLFFBQUEsVUFBVSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLFFBQUEsYUFBYSxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNDLFFBQUEsV0FBVyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXJELFNBQThCLGVBQWUsQ0FBQyxlQUFrQyxTQUFTOztRQUN2RixNQUFNLFNBQVMsR0FBRyxZQUFZLEtBQUssS0FBSyxDQUFDO1FBQ3pDLE1BQU0sMEJBQTBCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7Q0FBQTtBQUhELGtDQUdDO0FBRUQsU0FBc0IsMEJBQTBCLENBQzlDLFlBQW9CLEVBQ3BCLE9BQXVDOztRQUN2QyxNQUFNLFVBQVUsR0FBRyxNQUFNLG9CQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUVs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QyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNyRTtnQkFDRixNQUFNLG1CQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLEtBQUssQ0FBQztTQUNkO0lBQ0gsQ0FBQztDQUFBO0FBWkQsMENBWUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixXQUFXLENBQUMsSUFBWTtJQUN0QyxJQUFJO1FBQ0YsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lBQ3ZDLE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRTthQUFNO1lBQ0wsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNCO0tBQ0Y7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFDSCxDQUFDO0FBVkQsa0NBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvIG5vdCBpbXBvcnQgYW55IDNyZC1wYXJ0eSBkZXBlbmRlbmN5IGluIHRoaXMgZmlsZSxcbiAqIGl0IGlzIHJ1biBieSBgaW5pdGAgY29tbWFuZCBhdCB0aGUgdGltZSB0aGVyZSBwcm9iYWJseSBpc1xuICogbm8gZGVwZW5kZW5jaWVzIGluc3RhbGxlZCB5ZXRcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmV4cG9ydCBjb25zdCByZWFkZGlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5yZWFkZGlyKTtcbmV4cG9ydCBjb25zdCBsc3RhdEFzeW5jID0gdXRpbC5wcm9taXNpZnkoZnMubHN0YXQpO1xuZXhwb3J0IGNvbnN0IF9zeW1saW5rQXN5bmMgPSB1dGlsLnByb21pc2lmeShmcy5zeW1saW5rKTtcbmV4cG9ydCBjb25zdCB1bmxpbmtBc3luYyA9IHV0aWwucHJvbWlzaWZ5KGZzLnVubGluayk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIHNjYW5Ob2RlTW9kdWxlcyhkZWxldGVPcHRpb246ICdhbGwnIHwgJ2ludmFsaWQnID0gJ2ludmFsaWQnKSB7XG4gIGNvbnN0IGRlbGV0ZUFsbCA9IGRlbGV0ZU9wdGlvbiA9PT0gJ2FsbCc7XG4gIGF3YWl0IHNjYW5Ob2RlTW9kdWxlc0ZvclN5bWxpbmtzKHByb2Nlc3MuY3dkKCksIGxpbmsgPT4gdmFsaWRhdGVMaW5rKGxpbmssIGRlbGV0ZUFsbCkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3MoXG4gIHdvcmtzcGFjZURpcjogc3RyaW5nLFxuICBvbkZvdW5kOiAobGluazogc3RyaW5nKSA9PiBQcm9taXNlPGFueT4pIHtcbiAgY29uc3QgbGV2ZWwxRGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJykpO1xuXG4gIGF3YWl0IFByb21pc2UuYWxsKGxldmVsMURpcnMubWFwKGFzeW5jIGRpciA9PiB7XG4gICAgaWYgKGRpci5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIC8vIGl0IGlzIGEgc2NvcGUgcGFja2FnZVxuICAgICAgY29uc3Qgc3ViZGlycyA9IGF3YWl0IHJlYWRkaXJBc3luYyhQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJywgZGlyKSk7XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChzdWJkaXJzLm1hcChmaWxlID0+IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycsIGRpciwgZmlsZSkpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IG9uRWFjaEZpbGUoUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycsIGRpcikpO1xuICAgIH1cbiAgfSkpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uRWFjaEZpbGUoZmlsZTogc3RyaW5nKSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBhd2FpdCBvbkZvdW5kKGZpbGUpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIDEuIGNyZWF0ZSBzeW1saW5rIG5vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICogMi4gY3JlYXRlIHN5bWxpbmsgPHBhcmVudCBkaXJlY3Rvcnkgb2YgXCJtYWluXCI+L25vZGVfbW9kdWxlcyAtLT4gbm9kZV9tb2R1bGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW5rRHJjcCgpIHtcbiAgY29uc3Qgc291cmNlRGlyID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uJyk7IC8vIGRpcmVjdG9yeSBcIm1haW5cIlxuXG4gIC8vIDEuIGNyZWF0ZSBzeW1saW5rIG5vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICBjb25zdCB0YXJnZXQgPSBnZXRSZWFsUGF0aCgnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpO1xuICBpZiAodGFyZ2V0ICE9PSBzb3VyY2VEaXIpIHtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcycpKVxuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMnKTtcblxuICAgIGlmICh0YXJnZXQgIT0gbnVsbCkge1xuICAgICAgZnMudW5saW5rU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSk7XG4gICAgfVxuICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSwgc291cmNlRGlyKSxcbiAgICAgIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSArICcgaXMgY3JlYXRlZCcpO1xuICB9XG5cbiAgLy8gMi4gY3JlYXRlIHN5bWxpbmsgPHBhcmVudCBkaXJlY3Rvcnkgb2YgXCJtYWluXCI+L25vZGVfbW9kdWxlcyAtLT4gbm9kZV9tb2R1bGVzXG4gIGNvbnN0IHRvcE1vZHVsZURpciA9IFBhdGgucmVzb2x2ZShzb3VyY2VEaXIsICcuLi9ub2RlX21vZHVsZXMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModG9wTW9kdWxlRGlyKSkge1xuICAgIGlmIChmcy5yZWFscGF0aFN5bmModG9wTW9kdWxlRGlyKSAhPT0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgZnMudW5saW5rU3luYyh0b3BNb2R1bGVEaXIpO1xuICAgICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodG9wTW9kdWxlRGlyKSwgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSksXG4gICAgICB0b3BNb2R1bGVEaXIsIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyh0b3BNb2R1bGVEaXIgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodG9wTW9kdWxlRGlyKSwgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSksXG4gICAgICB0b3BNb2R1bGVEaXIsIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHRvcE1vZHVsZURpciArICcgaXMgY3JlYXRlZCcpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW1saW5rQXN5bmMobGlua1RhcmdldDogc3RyaW5nLCBsaW5rOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGxpbmspLmlzU3ltYm9saWNMaW5rKCkgJiYgUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSA9PT0gbGlua1RhcmdldClcbiAgICAgIHJldHVybjtcbiAgICBmcy51bmxpbmtTeW5jKGxpbmspO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGByZW1vdmUgJHtsaW5rfWApO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIGxpbmsgZG9lcyBub3QgZXhpc3RcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYGNyZWF0ZSBzeW1saW5rICR7bGlua30gLS0+ICR7bGlua1RhcmdldH1gKTtcbiAgcmV0dXJuIF9zeW1saW5rQXN5bmMoXG4gICAgUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUobGluayksIGxpbmtUYXJnZXQpLFxuICAgIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcidcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlTGluayhsaW5rOiBzdHJpbmcsIGRlbGV0ZUFsbCA9IGZhbHNlKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgaWYgKChhd2FpdCBsc3RhdEFzeW5jKGxpbmspKS5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAoZGVsZXRlQWxsIHx8ICFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobGluayksIGZzLnJlYWRsaW5rU3luYyhsaW5rKSkpKVxuICAgICAgKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbc3ltbGluayBjaGVja10gUmVtb3ZlICR7ZGVsZXRlQWxsID8gJycgOiAnaW52YWxpZCd9IHN5bWxpbmsgJHtQYXRoLnJlbGF0aXZlKCcuJywgbGluayl9YCk7XG4gICAgICBhd2FpdCB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlIHN5bWxpbmsgb3IgZmlsZS9kaXJlY3RvcnkgaWYgaXQgaXMgaW52YWxpZCBzeW1saW5rIG9yIHBvaW50aW5nIHRvIG5vbmV4aXN0aW5nIHRhcmdldFxuICogQHBhcmFtIGxpbmsgdGhlIHN5bWxpbmtcbiAqIEBwYXJhbSB0YXJnZXQgXG4gKiBAcmV0dXJucyB0cnVlIGlmIG5lZWRzIHRvIGNyZWF0ZSBhIG5ldyBzeW1saW5rXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNyZWF0ZVN5bWxpbmsobGluazogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGlmICgoYXdhaXQgbHN0YXRBc3luYyhsaW5rKSkuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShsaW5rKSwgZnMucmVhZGxpbmtTeW5jKGxpbmspKSlcbiAgICAgICkge1xuICAgICAgYXdhaXQgdW5saW5rQXN5bmMobGluayk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChleCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIFVubGlrZSBmcy5yZWFsUGF0aCgpLCBpdCBzdXBwb3J0cyBzeW1saW5rIG9mIHdoaWNoIHRhcmdldCBmaWxlIG5vIGxvbmdlciBleGlzdHNcbiAqIEBwYXJhbSBmaWxlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVhbFBhdGgoZmlsZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShmaWxlKSwgZnMucmVhZGxpbmtTeW5jKGZpbGUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShmaWxlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4iXX0=