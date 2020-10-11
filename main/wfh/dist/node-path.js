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
let envSetDone = false;
if (!envSetDone) {
    envSetDone = true;
    require('source-map-support/register');
    const rootDir = findRootDir();
    const symlinkDir = Path.resolve(rootDir, 'node_modules');
    const isDrcpSymlink = fs.lstatSync(Path.resolve(rootDir, 'node_modules/@wfh/plink')).isSymbolicLink();
    const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
    process.env.__plink = JSON.stringify({ isDrcpSymlink, rootDir, symlinkDir, nodePath });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBRXZCLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDZixVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzlCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3RHLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQWEsQ0FBQyxDQUFDO0lBRWpHLGdIQUFnSDtJQUNoSCxvQkFBb0I7SUFDcEIsTUFBTSxnQkFBZ0IsR0FBYSxFQUFFLENBQUM7SUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDdkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFB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QUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkQsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1RCxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3RDLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5sZXQgZW52U2V0RG9uZSA9IGZhbHNlO1xuXG5pZiAoIWVudlNldERvbmUpIHtcbiAgZW52U2V0RG9uZSA9IHRydWU7XG4gIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuICBjb25zdCByb290RGlyID0gZmluZFJvb3REaXIoKTtcbiAgY29uc3Qgc3ltbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpKS5pc1N5bWJvbGljTGluaygpO1xuICBjb25zdCBub2RlUGF0aCA9IHNldHVwTm9kZVBhdGgocm9vdERpciwgc3ltbGlua0RpciwgaXNEcmNwU3ltbGluayk7XG4gIHByb2Nlc3MuZW52Ll9fcGxpbmsgPSBKU09OLnN0cmluZ2lmeSh7aXNEcmNwU3ltbGluaywgcm9vdERpciwgc3ltbGlua0Rpciwgbm9kZVBhdGh9IGFzIFBsaW5rRW52KTtcblxuICAvLyBkZWxldGUgcmVnaXN0ZXIgZnJvbSBjb21tYW5kIGxpbmUgb3B0aW9uLCB0byBhdm9pZCBjaGlsZCBwcm9jZXNzIGdldCB0aGlzIG9wdGlvbiwgc2luY2Ugd2UgaGF2ZSBOT0RFX1BBVEggc2V0XG4gIC8vIGZvciBjaGlsZCBwcm9jZXNzXG4gIGNvbnN0IGRlbGV0ZUV4ZWNBcmdJZHg6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcHJvY2Vzcy5leGVjQXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaSA8IGwgLSAxICYmIC9eKD86LXJ8LS1yZXF1aXJlKSQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpXSkgJiZcbiAgICAgIC9eQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaSArIDFdKSkge1xuICAgICAgZGVsZXRlRXhlY0FyZ0lkeC5wdXNoKGkpO1xuICAgIH1cbiAgfVxuICBkZWxldGVFeGVjQXJnSWR4LnJlZHVjZSgob2Zmc2V0LCBkZWxldGVJZHgpID0+IHtcbiAgICBwcm9jZXNzLmV4ZWNBcmd2LnNwbGljZShkZWxldGVJZHggKyBvZmZzZXQsIDIpO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9LCAwKTtcblxuICBjb25zdCBlbnZPcHRpb25zID0gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID8gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPVxuICAgIGVudk9wdGlvbnMuZmlsdGVyKGl0ZW0gPT4gIS8oLXJ8LS1yZXF1aXJlKVxccytAd2ZoXFwvcGxpbmtcXC9yZWdpc3Rlci8udGVzdChpdGVtKSkuam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKCkge1xuICBsZXQgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsICdkaXN0L3BsaW5rLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSBkaXIpIHtcbiAgICAgIGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8qKlxuICogaWYgY3dkIGlzIG5vdCByb290IGRpcmVjdG9yeSwgdGhlbiBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPGN3ZD4vbm9kZV9tb2R1bGVzOjxyb290RGlyPi9zeW1saW5rcyxcbiAqIG90aGVyd2lzZSBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPHJvb3REaXI+L25vZGVfbW9kdWxlc1xuICogQHBhcmFtIHJvb3REaXIgXG4gKiBAcGFyYW0gaXNEcmNwU3ltbGluayBcbiAqL1xuZnVuY3Rpb24gc2V0dXBOb2RlUGF0aChyb290RGlyOiBzdHJpbmcsIHN5bWxpbmtEaXI6IHN0cmluZywgaXNEcmNwU3ltbGluazogYm9vbGVhbikge1xuICBsZXQgbm9kZVBhdGhzOiBTZXQ8c3RyaW5nPjtcbiAgLy8gY29uc3Qgc3ltbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnZGlzdCcsICdzeW1saW5rcycpO1xuICBpZiAocm9vdERpciAhPT0gcHJvY2Vzcy5jd2QoKSkge1xuICAgIG5vZGVQYXRocyA9IG5ldyBTZXQoW1xuICAgICAgUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnKSxcbiAgICAgIHN5bWxpbmtEaXIsXG4gICAgICBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgXSk7XG4gIH0gZWxzZSB7XG4gICAgbm9kZVBhdGhzID0gbmV3IFNldChbXG4gICAgICBzeW1saW5rRGlyLFxuICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKVxuICAgIF0pO1xuICB9XG5cbiAgaWYgKGlzRHJjcFN5bWxpbmspXG4gICAgbm9kZVBhdGhzLmFkZChmcy5yZWFscGF0aFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIhLCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSkgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMuYWRkKHBhdGgpO1xuICAgIH1cbiAgfVxuICBjb25zdCBwYXRoQXJyYXkgPSBBcnJheS5mcm9tKG5vZGVQYXRocy52YWx1ZXMoKSk7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IHBhdGhBcnJheS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbbm9kZS1wYXRoXSBOT0RFX1BBVEgnLCBwcm9jZXNzLmVudi5OT0RFX1BBVEgpO1xuICByZXF1aXJlKCdtb2R1bGUnKS5Nb2R1bGUuX2luaXRQYXRocygpO1xuICByZXR1cm4gcGF0aEFycmF5O1xufVxuXG4vKipcbiAqIEdldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJlZGVmaW5lZCBieVxuYGBgXG5jb25zdCB7aXNEcmNwU3ltbGluaywgc3ltbGlua0Rpciwgcm9vdERpciwgbm9kZVBhdGh9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5gYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGlua0VudiB7XG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIHJvb3REaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpcjogc3RyaW5nO1xuICBub2RlUGF0aDogc3RyaW5nW107XG59XG4iXX0=