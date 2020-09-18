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
    // delete register from command line option, to avoid child process get this option, since we have NODE_PATH set
    // for child process
    const deleteExecArgIdx = [];
    for (let i = 0, l = process.execArgv.length; i < l; i++) {
        if (i < l - 1 && /^(?:-r|--require)$/.test(process.execArgv[i]) &&
            /^dr-comp-package\/register$/.test(process.execArgv[i + 1])) {
            deleteExecArgIdx.push(i);
        }
    }
    deleteExecArgIdx.reduce((offset, deleteIdx) => {
        process.execArgv.splice(deleteIdx + offset, 2);
        return offset + 2;
    }, 0);
    const envOptions = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(Path.delimiter) : [];
    process.env.NODE_OPTIONS =
        envOptions.filter(item => !/(-r|--require)\s+dr-comp-package\/register/.test(item)).join(Path.delimiter);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7SUFDL0IsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDdkMsTUFBTSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0csTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBYSxDQUFDLENBQUM7SUFFakcsZ0hBQWdIO0lBQ2hILG9CQUFvQjtJQUNwQixNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQztJQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN2RCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELDZC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QztJQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2RCx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVELE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDdEMsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmlmIChwcm9jZXNzLmVudi5fX3BsaW5rID09IG51bGwpIHtcbiAgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG4gIGNvbnN0IHJvb3REaXIgPSBmaW5kUm9vdERpcigpO1xuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgY29uc3Qgbm9kZVBhdGggPSBzZXR1cE5vZGVQYXRoKHJvb3REaXIsIHN5bWxpbmtEaXIsIGlzRHJjcFN5bWxpbmspO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe2lzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXIsIG5vZGVQYXRofSBhcyBQbGlua0Vudik7XG5cbiAgLy8gZGVsZXRlIHJlZ2lzdGVyIGZyb20gY29tbWFuZCBsaW5lIG9wdGlvbiwgdG8gYXZvaWQgY2hpbGQgcHJvY2VzcyBnZXQgdGhpcyBvcHRpb24sIHNpbmNlIHdlIGhhdmUgTk9ERV9QQVRIIHNldFxuICAvLyBmb3IgY2hpbGQgcHJvY2Vzc1xuICBjb25zdCBkZWxldGVFeGVjQXJnSWR4OiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGkgPCBsIC0gMSAmJiAvXig/Oi1yfC0tcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gICAgICAvXmRyLWNvbXAtcGFja2FnZVxcL3JlZ2lzdGVyJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgICB9XG4gIH1cbiAgZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gICAgcHJvY2Vzcy5leGVjQXJndi5zcGxpY2UoZGVsZXRlSWR4ICsgb2Zmc2V0LCAyKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfSwgMCk7XG5cbiAgY29uc3QgZW52T3B0aW9ucyA9IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA/IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUy5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID1cbiAgICBlbnZPcHRpb25zLmZpbHRlcihpdGVtID0+ICEvKC1yfC0tcmVxdWlyZSlcXHMrZHItY29tcC1wYWNrYWdlXFwvcmVnaXN0ZXIvLnRlc3QoaXRlbSkpLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcigpIHtcbiAgbGV0IGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gIHdoaWxlICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZGlyLCAnZGlzdC9wbGluay1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gZGlyKSB7XG4gICAgICBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IHBhcmVudERpcjtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vKipcbiAqIGlmIGN3ZCBpcyBub3Qgcm9vdCBkaXJlY3RvcnksIHRoZW4gYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxjd2Q+L25vZGVfbW9kdWxlczo8cm9vdERpcj4vc3ltbGlua3MsXG4gKiBvdGhlcndpc2UgYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxyb290RGlyPi9ub2RlX21vZHVsZXNcbiAqIEBwYXJhbSByb290RGlyIFxuICogQHBhcmFtIGlzRHJjcFN5bWxpbmsgXG4gKi9cbmZ1bmN0aW9uIHNldHVwTm9kZVBhdGgocm9vdERpcjogc3RyaW5nLCBzeW1saW5rRGlyOiBzdHJpbmcsIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcbiAgbGV0IG5vZGVQYXRoczogU2V0PHN0cmluZz47XG4gIC8vIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2Rpc3QnLCAnc3ltbGlua3MnKTtcbiAgaWYgKHJvb3REaXIgIT09IHByb2Nlc3MuY3dkKCkpIHtcbiAgICBub2RlUGF0aHMgPSBuZXcgU2V0KFtcbiAgICAgIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJyksXG4gICAgICBzeW1saW5rRGlyLFxuICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKVxuICAgIF0pO1xuICB9IGVsc2Uge1xuICAgIG5vZGVQYXRocyA9IG5ldyBTZXQoW1xuICAgICAgc3ltbGlua0RpcixcbiAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICBdKTtcbiAgfVxuXG4gIGlmIChpc0RyY3BTeW1saW5rKVxuICAgIG5vZGVQYXRocy5hZGQoZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyISwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMuYWRkKHBhdGgpO1xuICAgIH1cbiAgfVxuICBjb25zdCBwYXRoQXJyYXkgPSBBcnJheS5mcm9tKG5vZGVQYXRocy52YWx1ZXMoKSk7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IHBhdGhBcnJheS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbbm9kZS1wYXRoXSBOT0RFX1BBVEgnLCBwcm9jZXNzLmVudi5OT0RFX1BBVEgpO1xuICByZXF1aXJlKCdtb2R1bGUnKS5Nb2R1bGUuX2luaXRQYXRocygpO1xuICByZXR1cm4gcGF0aEFycmF5O1xufVxuXG4vKipcbiAqIEdldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJlZGVmaW5lZCBieVxuYGBgXG5jb25zdCB7aXNEcmNwU3ltbGluaywgc3ltbGlua0Rpciwgcm9vdERpciwgbm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5gYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGlua0VudiB7XG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIHJvb3REaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xuICBub2RlUGF0aDogc3RyaW5nW107XG59XG4iXX0=