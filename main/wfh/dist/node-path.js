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
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let envSetDone = false;
if (!envSetDone) {
    envSetDone = true;
    require('source-map-support/register');
    /** environment varaible __plink is used for share basic Plink information between:
     * - Node.js "-r" preload module and normal modules, especially setting NODE_PATH in "-r" module
     * - Main process and forked process or thread worker
     */
    const exitingEnvVar = process.env.__plink ? JSON.parse(process.env.__plink) : null;
    if (process.env.PLINK_DATA_DIR == null) {
        process.env.PLINK_DATA_DIR = 'dist';
    }
    const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR);
    const symlinkDir = exitingEnvVar ? exitingEnvVar.symlinkDir : Path.resolve(rootDir, 'node_modules');
    const isDrcpSymlink = exitingEnvVar ? exitingEnvVar.isDrcpSymlink : fs.lstatSync(Path.resolve(rootDir, 'node_modules/@wfh/plink')).isSymbolicLink();
    const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
    const distDir = Path.resolve(rootDir, process.env.PLINK_DATA_DIR);
    process.env.__plink = JSON.stringify({ distDir, isDrcpSymlink, rootDir, symlinkDir, nodePath });
    // delete register from command line option, to avoid child process get this option, since we have NODE_PATH set
    // for child process
    const deleteExecArgIdx = [];
    for (let i = 0, l = process.execArgv.length; i < l; i++) {
        if (i < l - 1 && /^(?:-r|--require)$/.test(process.execArgv[i]) &&
            /^@wfh\/plink\/register$/.test(process.execArgv[i + 1])) {
            deleteExecArgIdx.push(i);
        }
    }
    deleteExecArgIdx.reduce((offset, deleteIdx) => {
        process.execArgv.splice(deleteIdx + offset, 2);
        return offset + 2;
    }, 0);
    const envOptions = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(Path.delimiter) : [];
    process.env.NODE_OPTIONS =
        envOptions.filter(item => !/(-r|--require)\s+@wfh\/plink\/register/.test(item)).join(Path.delimiter);
}
function findRootDir(distDir) {
    let dir = process.cwd();
    while (!fs.existsSync(Path.resolve(dir, distDir, 'plink-state.json'))) {
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
    /**
     * Somehow when I install @wfh/plink in an new directory, npm does not dedupe dependencies from
     * @wfh/plink/node_modules directory up to current node_modules directory, results in MODULE_NOT_FOUND
     * from @wfh/plink/redux-toolkit-abservable for rxjs
     */
    nodePaths.add(fs.realpathSync(Path.resolve(rootDir, 'node_modules/@wfh/plink')) + Path.sep + 'node_modules');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBRXZCLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDZixVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRXZDOzs7T0FHRztJQUNILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUUvRixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7S0FDckM7SUFDRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRWhHLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDcEcsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxjQUFjLEVB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b20gJ2ZzJztcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9PSBudWxsKSB7XG4gICAgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIgPSAnZGlzdCc7XG4gIH1cbiAgY29uc3Qgcm9vdERpciA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLnJvb3REaXIgOiBmaW5kUm9vdERpcihwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUik7XG5cbiAgY29uc3Qgc3ltbGlua0RpciA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXIgOiBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBpc0RyY3BTeW1saW5rID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIuaXNEcmNwU3ltbGluayA6IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpLmlzU3ltYm9saWNMaW5rKCk7XG4gIGNvbnN0IG5vZGVQYXRoID0gc2V0dXBOb2RlUGF0aChyb290RGlyLCBzeW1saW5rRGlyLCBpc0RyY3BTeW1saW5rKTtcbiAgY29uc3QgZGlzdERpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUik7XG4gIHByb2Nlc3MuZW52Ll9fcGxpbmsgPSBKU09OLnN0cmluZ2lmeSh7ZGlzdERpciwgaXNEcmNwU3ltbGluaywgcm9vdERpciwgc3ltbGlua0Rpciwgbm9kZVBhdGh9IGFzIFBsaW5rRW52KTtcblxuICAvLyBkZWxldGUgcmVnaXN0ZXIgZnJvbSBjb21tYW5kIGxpbmUgb3B0aW9uLCB0byBhdm9pZCBjaGlsZCBwcm9jZXNzIGdldCB0aGlzIG9wdGlvbiwgc2luY2Ugd2UgaGF2ZSBOT0RFX1BBVEggc2V0XG4gIC8vIGZvciBjaGlsZCBwcm9jZXNzXG4gIGNvbnN0IGRlbGV0ZUV4ZWNBcmdJZHg6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcHJvY2Vzcy5leGVjQXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaSA8IGwgLSAxICYmIC9eKD86LXJ8LS1yZXF1aXJlKSQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpXSkgJiZcbiAgICAgIC9eQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaSArIDFdKSkge1xuICAgICAgZGVsZXRlRXhlY0FyZ0lkeC5wdXNoKGkpO1xuICAgIH1cbiAgfVxuICBkZWxldGVFeGVjQXJnSWR4LnJlZHVjZSgob2Zmc2V0LCBkZWxldGVJZHgpID0+IHtcbiAgICBwcm9jZXNzLmV4ZWNBcmd2LnNwbGljZShkZWxldGVJZHggKyBvZmZzZXQsIDIpO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9LCAwKTtcblxuICBjb25zdCBlbnZPcHRpb25zID0gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID8gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPVxuICAgIGVudk9wdGlvbnMuZmlsdGVyKGl0ZW0gPT4gIS8oLXJ8LS1yZXF1aXJlKVxccytAd2ZoXFwvcGxpbmtcXC9yZWdpc3Rlci8udGVzdChpdGVtKSkuam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKGRpc3REaXI6IHN0cmluZykge1xuICBsZXQgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsIGRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gZGlyKSB7XG4gICAgICBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IHBhcmVudERpcjtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vKipcbiAqIGlmIGN3ZCBpcyBub3Qgcm9vdCBkaXJlY3RvcnksIHRoZW4gYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxjd2Q+L25vZGVfbW9kdWxlczo8cm9vdERpcj4vc3ltbGlua3MsXG4gKiBvdGhlcndpc2UgYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxyb290RGlyPi9ub2RlX21vZHVsZXNcbiAqIEBwYXJhbSByb290RGlyIFxuICogQHBhcmFtIGlzRHJjcFN5bWxpbmsgXG4gKi9cbmZ1bmN0aW9uIHNldHVwTm9kZVBhdGgocm9vdERpcjogc3RyaW5nLCBzeW1saW5rRGlyOiBzdHJpbmcsIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcbiAgbGV0IG5vZGVQYXRoczogU2V0PHN0cmluZz47XG4gIC8vIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2Rpc3QnLCAnc3ltbGlua3MnKTtcbiAgaWYgKHJvb3REaXIgIT09IHByb2Nlc3MuY3dkKCkpIHtcbiAgICBub2RlUGF0aHMgPSBuZXcgU2V0KFtcbiAgICAgIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJyksXG4gICAgICBzeW1saW5rRGlyLFxuICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKVxuICAgIF0pO1xuICB9IGVsc2Uge1xuICAgIG5vZGVQYXRocyA9IG5ldyBTZXQoW1xuICAgICAgc3ltbGlua0RpcixcbiAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICBdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTb21laG93IHdoZW4gSSBpbnN0YWxsIEB3ZmgvcGxpbmsgaW4gYW4gbmV3IGRpcmVjdG9yeSwgbnBtIGRvZXMgbm90IGRlZHVwZSBkZXBlbmRlbmNpZXMgZnJvbSBcbiAgICogQHdmaC9wbGluay9ub2RlX21vZHVsZXMgZGlyZWN0b3J5IHVwIHRvIGN1cnJlbnQgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSwgcmVzdWx0cyBpbiBNT0RVTEVfTk9UX0ZPVU5EXG4gICAqIGZyb20gQHdmaC9wbGluay9yZWR1eC10b29sa2l0LWFic2VydmFibGUgZm9yIHJ4anNcbiAgICovXG4gIG5vZGVQYXRocy5hZGQoZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyISwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpICsgUGF0aC5zZXAgKyAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX1BBVEgpIHtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgcHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgbm9kZVBhdGhzLmFkZChwYXRoKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgcGF0aEFycmF5ID0gQXJyYXkuZnJvbShub2RlUGF0aHMudmFsdWVzKCkpO1xuICBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBwYXRoQXJyYXkuam9pbihQYXRoLmRlbGltaXRlcik7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW25vZGUtcGF0aF0gTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKTtcbiAgcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbiAgcmV0dXJuIHBhdGhBcnJheTtcbn1cblxuLyoqXG4gKiBHZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHByZWRlZmluZWQgYnlcbmBgYFxuY29uc3Qge2lzRHJjcFN5bWxpbmssIHN5bWxpbmtEaXIsIHJvb3REaXIsIG5vZGVQYXRoLCBkaXN0RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxpbmtFbnYge1xuICBkaXN0RGlyOiBzdHJpbmc7XG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIHJvb3REaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xuICBub2RlUGF0aDogc3RyaW5nW107XG59XG4iXX0=