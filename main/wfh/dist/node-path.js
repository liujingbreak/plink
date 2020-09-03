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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
if (process.env.__plink == null) {
    require('source-map-support/register');
    const rootDir = findRootDir();
    const symlinkDir = Path.resolve(rootDir, 'node_modules');
    const isDrcpSymlink = fs.lstatSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')).isSymbolicLink();
    process.env.__plink = JSON.stringify({ isDrcpSymlink, rootDir, symlinkDir });
    setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
}
function findRootDir() {
    let dir = process.cwd();
    while (!fs.existsSync(Path.resolve(dir, 'dist/dr-state.json'))) {
        const parentDir = Path.dirname(dir);
        if (parentDir === dir) {
            dir = process.cwd();
            break;
        }
        dir = parentDir;
    }
    return dir;
}
/**
 * if cwd is not root directory, then append NODE_PATH with <cwd>/node_modules:<rootDir>/symlinks,
 * otherwise append NODE_PATH with <rootDir>/node_modules
 * @param rootDir
 * @param isDrcpSymlink
 */
function setupNodePath(rootDir, symlinkDir, isDrcpSymlink) {
    let nodePaths;
    // const symlinkDir = Path.resolve(rootDir, 'dist', 'symlinks');
    if (rootDir !== process.cwd()) {
        nodePaths = new Set([
            Path.resolve(process.cwd(), 'node_modules'),
            symlinkDir,
            Path.resolve(rootDir, 'node_modules')
        ]);
    }
    else {
        nodePaths = new Set([
            symlinkDir,
            Path.resolve(rootDir, 'node_modules')
        ]);
    }
    if (isDrcpSymlink)
        nodePaths.add(fs.realpathSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')) + Path.sep + 'node_modules');
    if (process.env.NODE_PATH) {
        for (const path of process.env.NODE_PATH.split(Path.delimiter)) {
            nodePaths.add(path);
        }
    }
    process.env.NODE_PATH = Array.from(nodePaths.values()).join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log('[node-path] NODE_PATH', process.env.NODE_PATH);
    require('module').Module._initPaths();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7SUFDL0IsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDdkMsTUFBTSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0csT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFhLENBQUMsQ0FBQztJQUN2RixhQUFhLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztDQUNuRDtBQUVELFNBQVMsV0FBVztJQUNsQixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDeEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxFQUFFO1FBQzlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO1lBQ3JCLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDcEIsTUFBTTtTQUNQO1FBQ0QsR0FBRyxHQUFHLFNBQVMsQ0FBQztLQUNqQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBUyxhQUFhLENBQUMsT0FBZSxFQUFFLFVBQWtCLEVBQUUsYUFBc0I7SUFDaEYsSUFBSSxTQUFzQixDQUFDO0lBQzNCLGdFQUFnRTtJQUNoRSxJQUFJLE9BQU8sS0FBSyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDN0IsU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsQ0FBQztZQUMzQyxVQUFVO1lBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDO1NBQ3RDLENBQUMsQ0FBQztLQUNKO1NBQU07UUFDTCxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUM7WUFDbEIsVUFBVTtZQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQztTQUN0QyxDQUFDLENBQUM7S0FDSjtJQUVELElBQUksYUFBYTtRQUNmLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQVEsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUMsQ0FBQztJQUNySCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFO1FBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM5RCxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3JCO0tBQ0Y7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDNUUsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1RCxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ3hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5pZiAocHJvY2Vzcy5lbnYuX19wbGluayA9PSBudWxsKSB7XG4gIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuICBjb25zdCByb290RGlyID0gZmluZFJvb3REaXIoKTtcbiAgY29uc3Qgc3ltbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCk7XG4gIHByb2Nlc3MuZW52Ll9fcGxpbmsgPSBKU09OLnN0cmluZ2lmeSh7aXNEcmNwU3ltbGluaywgcm9vdERpciwgc3ltbGlua0Rpcn0gYXMgUGxpbmtFbnYpO1xuICBzZXR1cE5vZGVQYXRoKHJvb3REaXIsIHN5bWxpbmtEaXIsIGlzRHJjcFN5bWxpbmspO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcigpIHtcbiAgbGV0IGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gIHdoaWxlICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZGlyLCAnZGlzdC9kci1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gZGlyKSB7XG4gICAgICBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IHBhcmVudERpcjtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vKipcbiAqIGlmIGN3ZCBpcyBub3Qgcm9vdCBkaXJlY3RvcnksIHRoZW4gYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxjd2Q+L25vZGVfbW9kdWxlczo8cm9vdERpcj4vc3ltbGlua3MsXG4gKiBvdGhlcndpc2UgYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxyb290RGlyPi9ub2RlX21vZHVsZXNcbiAqIEBwYXJhbSByb290RGlyIFxuICogQHBhcmFtIGlzRHJjcFN5bWxpbmsgXG4gKi9cbmZ1bmN0aW9uIHNldHVwTm9kZVBhdGgocm9vdERpcjogc3RyaW5nLCBzeW1saW5rRGlyOiBzdHJpbmcsIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcbiAgbGV0IG5vZGVQYXRoczogU2V0PHN0cmluZz47XG4gIC8vIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2Rpc3QnLCAnc3ltbGlua3MnKTtcbiAgaWYgKHJvb3REaXIgIT09IHByb2Nlc3MuY3dkKCkpIHtcbiAgICBub2RlUGF0aHMgPSBuZXcgU2V0KFtcbiAgICAgIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJyksXG4gICAgICBzeW1saW5rRGlyLFxuICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKVxuICAgIF0pO1xuICB9IGVsc2Uge1xuICAgIG5vZGVQYXRocyA9IG5ldyBTZXQoW1xuICAgICAgc3ltbGlua0RpcixcbiAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICBdKTtcbiAgfVxuXG4gIGlmIChpc0RyY3BTeW1saW5rKVxuICAgIG5vZGVQYXRocy5hZGQoZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyISwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMuYWRkKHBhdGgpO1xuICAgIH1cbiAgfVxuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBBcnJheS5mcm9tKG5vZGVQYXRocy52YWx1ZXMoKSkuam9pbihQYXRoLmRlbGltaXRlcik7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW25vZGUtcGF0aF0gTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKTtcbiAgcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbn1cblxuLyoqXG4gKiBHZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHByZWRlZmluZWQgYnlcbmBgYFxuY29uc3Qge2lzRHJjcFN5bWxpbmssIHN5bWxpbmtEaXIsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5gYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGlua0VudiB7XG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIHJvb3REaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xufVxuIl19