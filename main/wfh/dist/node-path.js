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
    const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
    process.env.__plink = JSON.stringify({ isDrcpSymlink, rootDir, symlinkDir, nodePath });
    const deleteExecArgIdx = [];
    for (let i = 0, l = process.execArgv.length; i < l; i++) {
        if (i < l - 1 && /^(?:\-r|\-\-require)$/.test(process.execArgv[i]) &&
            /^dr-comp-package\/register$/.test(process.execArgv[i + 1])) {
            deleteExecArgIdx.push(i);
        }
    }
    deleteExecArgIdx.reduce((offset, deleteIdx) => {
        process.execArgv.splice(deleteIdx + offset, 2);
        return offset + 2;
    }, 0);
    // console.log('[node-path]', process.execArgv);
}
function findRootDir() {
    let dir = process.cwd();
    while (!fs.existsSync(Path.resolve(dir, 'dist/plink-state.json'))) {
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
    const pathArray = Array.from(nodePaths.values());
    process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log('[node-path] NODE_PATH', process.env.NODE_PATH);
    require('module').Module._initPaths();
    return pathArray;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7SUFDL0IsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDdkMsTUFBTSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0csTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBYSxDQUFDLENBQUM7SUFFakcsTUFBTSxnQkFBZ0IsR0FBYSxFQUFFLENBQUM7SUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDdkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsT0FBTyxD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cyBmcyBmcm9tICdmcyc7XG5cbmlmIChwcm9jZXNzLmVudi5fX3BsaW5rID09IG51bGwpIHtcbiAgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG4gIGNvbnN0IHJvb3REaXIgPSBmaW5kUm9vdERpcigpO1xuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgY29uc3Qgbm9kZVBhdGggPSBzZXR1cE5vZGVQYXRoKHJvb3REaXIsIHN5bWxpbmtEaXIsIGlzRHJjcFN5bWxpbmspO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe2lzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXIsIG5vZGVQYXRofSBhcyBQbGlua0Vudik7XG5cbiAgY29uc3QgZGVsZXRlRXhlY0FyZ0lkeDogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwcm9jZXNzLmV4ZWNBcmd2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpIDwgbCAtIDEgJiYgL14oPzpcXC1yfFxcLVxcLXJlcXVpcmUpJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2ldKSAmJlxuICAgICAgL15kci1jb21wLXBhY2thZ2VcXC9yZWdpc3RlciQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpICsgMV0pKSB7XG4gICAgICBkZWxldGVFeGVjQXJnSWR4LnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGRlbGV0ZUV4ZWNBcmdJZHgucmVkdWNlKChvZmZzZXQsIGRlbGV0ZUlkeCkgPT4ge1xuICAgIHByb2Nlc3MuZXhlY0FyZ3Yuc3BsaWNlKGRlbGV0ZUlkeCArIG9mZnNldCwgMik7XG4gICAgcmV0dXJuIG9mZnNldCArIDI7XG4gIH0sIDApO1xuICAvLyBjb25zb2xlLmxvZygnW25vZGUtcGF0aF0nLCBwcm9jZXNzLmV4ZWNBcmd2KTtcbn1cblxuZnVuY3Rpb24gZmluZFJvb3REaXIoKSB7XG4gIGxldCBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGRpciwgJ2Rpc3QvcGxpbmstc3RhdGUuanNvbicpKSkge1xuICAgIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICAgIGlmIChwYXJlbnREaXIgPT09IGRpcikge1xuICAgICAgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLyoqXG4gKiBpZiBjd2QgaXMgbm90IHJvb3QgZGlyZWN0b3J5LCB0aGVuIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8Y3dkPi9ub2RlX21vZHVsZXM6PHJvb3REaXI+L3N5bWxpbmtzLFxuICogb3RoZXJ3aXNlIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8cm9vdERpcj4vbm9kZV9tb2R1bGVzXG4gKiBAcGFyYW0gcm9vdERpciBcbiAqIEBwYXJhbSBpc0RyY3BTeW1saW5rIFxuICovXG5mdW5jdGlvbiBzZXR1cE5vZGVQYXRoKHJvb3REaXI6IHN0cmluZywgc3ltbGlua0Rpcjogc3RyaW5nLCBpc0RyY3BTeW1saW5rOiBib29sZWFuKSB7XG4gIGxldCBub2RlUGF0aHM6IFNldDxzdHJpbmc+O1xuICAvLyBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdkaXN0JywgJ3N5bWxpbmtzJyk7XG4gIGlmIChyb290RGlyICE9PSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgbm9kZVBhdGhzID0gbmV3IFNldChbXG4gICAgICBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycpLFxuICAgICAgc3ltbGlua0RpcixcbiAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICBdKTtcbiAgfSBlbHNlIHtcbiAgICBub2RlUGF0aHMgPSBuZXcgU2V0KFtcbiAgICAgIHN5bWxpbmtEaXIsXG4gICAgICBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgXSk7XG4gIH1cblxuICBpZiAoaXNEcmNwU3ltbGluaylcbiAgICBub2RlUGF0aHMuYWRkKGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUocm9vdERpciEsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpICsgUGF0aC5zZXAgKyAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX1BBVEgpIHtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgcHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgbm9kZVBhdGhzLmFkZChwYXRoKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgcGF0aEFycmF5ID0gQXJyYXkuZnJvbShub2RlUGF0aHMudmFsdWVzKCkpO1xuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBwYXRoQXJyYXkuam9pbihQYXRoLmRlbGltaXRlcik7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW25vZGUtcGF0aF0gTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKTtcbiAgcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbiAgcmV0dXJuIHBhdGhBcnJheTtcbn1cblxuLyoqXG4gKiBHZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHByZWRlZmluZWQgYnlcbmBgYFxuY29uc3Qge2lzRHJjcFN5bWxpbmssIHN5bWxpbmtEaXIsIHJvb3REaXIsIG5vZGVQYXRofSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxpbmtFbnYge1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICByb290RGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZztcbiAgbm9kZVBhdGg6IHN0cmluZ1tdO1xufVxuIl19