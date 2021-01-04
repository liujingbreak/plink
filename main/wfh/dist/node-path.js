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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
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
        // tslint:disable-next-line: no-console
        console.log(chalk_1.default.gray('[node-path] By default, Plink reads and writes state files in directory "<root-dir>/dist",\n' +
            'you may change it by' +
            ' setting environment variable PLINK_DATA_DIR to another relative directory'));
    }
    else {
        // tslint:disable-next-line: no-console
        console.log(chalk_1.default.gray('[node-path] PLINK_DATA_DIR: ' + process.env.PLINK_DATA_DIR));
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
    console.log(chalk_1.default.gray('[node-path] NODE_PATH', process.env.NODE_PATH));
    require('module').Module._initPaths();
    return pathArray;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBRTFCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztBQUV2QixJQUFJLENBQUMsVUFBVSxFQUFFO0lBQ2YsVUFBVSxHQUFHLElBQUksQ0FBQztJQUNsQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUV2Qzs7O09BR0c7SUFDSCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFL0YsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQ3BDLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsOEZBQThGO1lBQ3JILHNCQUFzQjtZQUN0Qiw0RUFBNEUsQ0FBQyxDQUFDLENBQUM7S0FDaEY7U0FBTTtRQUNMLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0tBQ3RGO0lBQ0QsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVoRyxNQUFNLFVBQVUsR0FBRyxh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QztJQUN2RCx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN4RSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3RDLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9PSBudWxsKSB7XG4gICAgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIgPSAnZGlzdCc7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW25vZGUtcGF0aF0gQnkgZGVmYXVsdCwgUGxpbmsgcmVhZHMgYW5kIHdyaXRlcyBzdGF0ZSBmaWxlcyBpbiBkaXJlY3RvcnkgXCI8cm9vdC1kaXI+L2Rpc3RcIixcXG4nICtcbiAgICAneW91IG1heSBjaGFuZ2UgaXQgYnknICtcbiAgICAnIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgUExJTktfREFUQV9ESVIgdG8gYW5vdGhlciByZWxhdGl2ZSBkaXJlY3RvcnknKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW25vZGUtcGF0aF0gUExJTktfREFUQV9ESVI6ICcgKyBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikpO1xuICB9XG4gIGNvbnN0IHJvb3REaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5yb290RGlyIDogZmluZFJvb3REaXIocHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuXG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5zeW1saW5rRGlyIDogUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLmlzRHJjcFN5bWxpbmsgOiBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpKS5pc1N5bWJvbGljTGluaygpO1xuICBjb25zdCBub2RlUGF0aCA9IHNldHVwTm9kZVBhdGgocm9vdERpciwgc3ltbGlua0RpciwgaXNEcmNwU3ltbGluayk7XG4gIGNvbnN0IGRpc3REaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe2Rpc3REaXIsIGlzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXIsIG5vZGVQYXRofSBhcyBQbGlua0Vudik7XG5cbiAgLy8gZGVsZXRlIHJlZ2lzdGVyIGZyb20gY29tbWFuZCBsaW5lIG9wdGlvbiwgdG8gYXZvaWQgY2hpbGQgcHJvY2VzcyBnZXQgdGhpcyBvcHRpb24sIHNpbmNlIHdlIGhhdmUgTk9ERV9QQVRIIHNldFxuICAvLyBmb3IgY2hpbGQgcHJvY2Vzc1xuICBjb25zdCBkZWxldGVFeGVjQXJnSWR4OiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGkgPCBsIC0gMSAmJiAvXig/Oi1yfC0tcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gICAgICAvXkB3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgICB9XG4gIH1cbiAgZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gICAgcHJvY2Vzcy5leGVjQXJndi5zcGxpY2UoZGVsZXRlSWR4ICsgb2Zmc2V0LCAyKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfSwgMCk7XG5cbiAgY29uc3QgZW52T3B0aW9ucyA9IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA/IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUy5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID1cbiAgICBlbnZPcHRpb25zLmZpbHRlcihpdGVtID0+ICEvKC1yfC0tcmVxdWlyZSlcXHMrQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIvLnRlc3QoaXRlbSkpLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcihkaXN0RGlyOiBzdHJpbmcpIHtcbiAgbGV0IGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gIHdoaWxlICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZGlyLCBkaXN0RGlyLCAncGxpbmstc3RhdGUuanNvbicpKSkge1xuICAgIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICAgIGlmIChwYXJlbnREaXIgPT09IGRpcikge1xuICAgICAgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLyoqXG4gKiBpZiBjd2QgaXMgbm90IHJvb3QgZGlyZWN0b3J5LCB0aGVuIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8Y3dkPi9ub2RlX21vZHVsZXM6PHJvb3REaXI+L3N5bWxpbmtzLFxuICogb3RoZXJ3aXNlIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8cm9vdERpcj4vbm9kZV9tb2R1bGVzXG4gKiBAcGFyYW0gcm9vdERpciBcbiAqIEBwYXJhbSBpc0RyY3BTeW1saW5rIFxuICovXG5mdW5jdGlvbiBzZXR1cE5vZGVQYXRoKHJvb3REaXI6IHN0cmluZywgc3ltbGlua0Rpcjogc3RyaW5nLCBpc0RyY3BTeW1saW5rOiBib29sZWFuKSB7XG4gIGxldCBub2RlUGF0aHM6IFNldDxzdHJpbmc+O1xuICAvLyBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdkaXN0JywgJ3N5bWxpbmtzJyk7XG4gIGlmIChyb290RGlyICE9PSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgbm9kZVBhdGhzID0gbmV3IFNldChbXG4gICAgICBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ25vZGVfbW9kdWxlcycpLFxuICAgICAgc3ltbGlua0RpcixcbiAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICBdKTtcbiAgfSBlbHNlIHtcbiAgICBub2RlUGF0aHMgPSBuZXcgU2V0KFtcbiAgICAgIHN5bWxpbmtEaXIsXG4gICAgICBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgXSk7XG4gIH1cblxuICAvKipcbiAgICogU29tZWhvdyB3aGVuIEkgaW5zdGFsbCBAd2ZoL3BsaW5rIGluIGFuIG5ldyBkaXJlY3RvcnksIG5wbSBkb2VzIG5vdCBkZWR1cGUgZGVwZW5kZW5jaWVzIGZyb20gXG4gICAqIEB3ZmgvcGxpbmsvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB1cCB0byBjdXJyZW50IG5vZGVfbW9kdWxlcyBkaXJlY3RvcnksIHJlc3VsdHMgaW4gTU9EVUxFX05PVF9GT1VORFxuICAgKiBmcm9tIEB3ZmgvcGxpbmsvcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlIGZvciByeGpzXG4gICAqL1xuICBub2RlUGF0aHMuYWRkKGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUocm9vdERpciEsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpKSArIFBhdGguc2VwICsgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSB7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIHByb2Nlc3MuZW52Lk5PREVfUEFUSC5zcGxpdChQYXRoLmRlbGltaXRlcikpIHtcbiAgICAgIG5vZGVQYXRocy5hZGQocGF0aCk7XG4gICAgfVxuICB9XG4gIGNvbnN0IHBhdGhBcnJheSA9IEFycmF5LmZyb20obm9kZVBhdGhzLnZhbHVlcygpKTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW25vZGUtcGF0aF0gTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSk7XG4gIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBwcmVkZWZpbmVkIGJ5XG5gYGBcbmNvbnN0IHtpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyLCByb290RGlyLCBub2RlUGF0aCwgZGlzdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgZGlzdERpcjogc3RyaW5nO1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICByb290RGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZztcbiAgbm9kZVBhdGg6IHN0cmluZ1tdO1xufVxuIl19