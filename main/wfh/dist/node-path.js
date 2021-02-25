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
exports.calcNodePaths = void 0;
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = __importDefault(require("log4js"));
const loaderHooks_1 = require("./loaderHooks");
const lodash_1 = __importDefault(require("lodash"));
let envSetDone = false;
if (!envSetDone) {
    envSetDone = true;
    require('source-map-support/register');
    /** environment varaible __plink is used for share basic Plink information between:
     * - Node.js "-r" preload module and normal modules, especially setting NODE_PATH in "-r" module
     * - Main process and forked process or thread worker
     */
    const exitingEnvVar = process.env.__plink ? JSON.parse(process.env.__plink) : null;
    if (!process.env.PLINK_DATA_DIR) {
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
    let symlinkDir = exitingEnvVar ? exitingEnvVar.symlinkDir : Path.resolve('.links');
    if (symlinkDir && !fs.existsSync(symlinkDir)) {
        symlinkDir = null;
    }
    const isDrcpSymlink = exitingEnvVar ? exitingEnvVar.isDrcpSymlink : fs.lstatSync(Path.resolve(rootDir, 'node_modules/@wfh/plink')).isSymbolicLink();
    const nodePath = setupNodePath(rootDir, symlinkDir);
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
function setupNodePath(rootDir, symlinkDir, cwd = process.cwd()) {
    const pathArray = calcNodePaths(rootDir, symlinkDir, cwd);
    process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.gray('[node-path] NODE_PATH', process.env.NODE_PATH));
    require('module').Module._initPaths();
    return pathArray;
}
function calcNodePaths(rootDir, symlinkDir, cwd = process.cwd()) {
    const nodePaths = [Path.resolve(rootDir, 'node_modules')];
    if (symlinkDir) {
        nodePaths.unshift(symlinkDir);
    }
    if (rootDir !== cwd) {
        nodePaths.unshift(Path.resolve(cwd, 'node_modules'));
    }
    /**
     * Somehow when I install @wfh/plink in an new directory, npm does not dedupe dependencies from
     * @wfh/plink/node_modules directory up to current node_modules directory, results in MODULE_NOT_FOUND
     * from @wfh/plink/redux-toolkit-abservable for rxjs
     */
    nodePaths.push(fs.realpathSync(Path.resolve(rootDir, 'node_modules/@wfh/plink')) + Path.sep + 'node_modules');
    if (process.env.NODE_PATH) {
        for (const path of process.env.NODE_PATH.split(Path.delimiter)) {
            nodePaths.push(path);
        }
    }
    return lodash_1.default.uniq(nodePaths);
}
exports.calcNodePaths = calcNodePaths;
loaderHooks_1.hookCommonJsRequire((file, target, req, resolve) => {
    if (target === 'log4js') {
        return log4js_1.default;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsK0NBQWtEO0FBQ2xELG9EQUF1QjtBQUV2QixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDbEIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFdkM7OztPQUdHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDcEMsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyw4RkFBOEY7WUFDckgsc0JBQXNCO1lBQ3RCLDRFQUE0RSxDQUFDLENBQUMsQ0FBQztLQUNoRjtTQUFNO1FBQ0wsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7S0FDdEY7SUFDRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNB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QyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBUSxFQUFFLHlCQUF5QixDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsQ0FBQyxDQUFDO0lBQy9HLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUU7UUFDekIsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzlELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdEI7S0FDRjtJQUVELE9BQU8sZ0JBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQXZCRCxzQ0F1QkM7QUFpQkQsaUNBQW1CLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNqRCxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7UUFDdkIsT0FBTyxnQkFBTSxDQUFDO0tBQ2Y7QUFDSCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtob29rQ29tbW9uSnNSZXF1aXJlfSBmcm9tICcuL2xvYWRlckhvb2tzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5cbmxldCBlbnZTZXREb25lID0gZmFsc2U7XG5cbmlmICghZW52U2V0RG9uZSkge1xuICBlbnZTZXREb25lID0gdHJ1ZTtcbiAgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG5cbiAgLyoqIGVudmlyb25tZW50IHZhcmFpYmxlIF9fcGxpbmsgaXMgdXNlZCBmb3Igc2hhcmUgYmFzaWMgUGxpbmsgaW5mb3JtYXRpb24gYmV0d2VlbjpcbiAgICogLSBOb2RlLmpzIFwiLXJcIiBwcmVsb2FkIG1vZHVsZSBhbmQgbm9ybWFsIG1vZHVsZXMsIGVzcGVjaWFsbHkgc2V0dGluZyBOT0RFX1BBVEggaW4gXCItclwiIG1vZHVsZVxuICAgKiAtIE1haW4gcHJvY2VzcyBhbmQgZm9ya2VkIHByb2Nlc3Mgb3IgdGhyZWFkIHdvcmtlclxuICAgKi9cbiAgY29uc3QgZXhpdGluZ0VudlZhciA9IHByb2Nlc3MuZW52Ll9fcGxpbmsgPyBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmspIGFzIFBsaW5rRW52IDogbnVsbDtcblxuICBpZiAoIXByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSB7XG4gICAgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIgPSAnZGlzdCc7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW25vZGUtcGF0aF0gQnkgZGVmYXVsdCwgUGxpbmsgcmVhZHMgYW5kIHdyaXRlcyBzdGF0ZSBmaWxlcyBpbiBkaXJlY3RvcnkgXCI8cm9vdC1kaXI+L2Rpc3RcIixcXG4nICtcbiAgICAneW91IG1heSBjaGFuZ2UgaXQgYnknICtcbiAgICAnIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgUExJTktfREFUQV9ESVIgdG8gYW5vdGhlciByZWxhdGl2ZSBkaXJlY3RvcnknKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW25vZGUtcGF0aF0gUExJTktfREFUQV9ESVI6ICcgKyBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikpO1xuICB9XG4gIGNvbnN0IHJvb3REaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5yb290RGlyIDogZmluZFJvb3REaXIocHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuXG4gIGxldCBzeW1saW5rRGlyID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIuc3ltbGlua0RpciA6IFBhdGgucmVzb2x2ZSgnLmxpbmtzJyk7XG4gIGlmIChzeW1saW5rRGlyICYmICFmcy5leGlzdHNTeW5jKHN5bWxpbmtEaXIpKSB7XG4gICAgc3ltbGlua0RpciA9IG51bGw7XG4gIH1cbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLmlzRHJjcFN5bWxpbmsgOiBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpKS5pc1N5bWJvbGljTGluaygpO1xuICBjb25zdCBub2RlUGF0aCA9IHNldHVwTm9kZVBhdGgocm9vdERpciwgc3ltbGlua0Rpcik7XG4gIGNvbnN0IGRpc3REaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe2Rpc3REaXIsIGlzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXIsIG5vZGVQYXRofSBhcyBQbGlua0Vudik7XG5cbiAgLy8gZGVsZXRlIHJlZ2lzdGVyIGZyb20gY29tbWFuZCBsaW5lIG9wdGlvbiwgdG8gYXZvaWQgY2hpbGQgcHJvY2VzcyBnZXQgdGhpcyBvcHRpb24sIHNpbmNlIHdlIGhhdmUgTk9ERV9QQVRIIHNldFxuICAvLyBmb3IgY2hpbGQgcHJvY2Vzc1xuICBjb25zdCBkZWxldGVFeGVjQXJnSWR4OiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGkgPCBsIC0gMSAmJiAvXig/Oi1yfC0tcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gICAgICAvXkB3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgICB9XG4gIH1cbiAgZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gICAgcHJvY2Vzcy5leGVjQXJndi5zcGxpY2UoZGVsZXRlSWR4ICsgb2Zmc2V0LCAyKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfSwgMCk7XG5cbiAgY29uc3QgZW52T3B0aW9ucyA9IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA/IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUy5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID1cbiAgICBlbnZPcHRpb25zLmZpbHRlcihpdGVtID0+ICEvKC1yfC0tcmVxdWlyZSlcXHMrQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIvLnRlc3QoaXRlbSkpLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcihkaXN0RGlyOiBzdHJpbmcpIHtcbiAgbGV0IGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gIHdoaWxlICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZGlyLCBkaXN0RGlyLCAncGxpbmstc3RhdGUuanNvbicpKSkge1xuICAgIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICAgIGlmIChwYXJlbnREaXIgPT09IGRpcikge1xuICAgICAgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLyoqXG4gKiBpZiBjd2QgaXMgbm90IHJvb3QgZGlyZWN0b3J5LCB0aGVuIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8Y3dkPi9ub2RlX21vZHVsZXM6PHJvb3REaXI+L3N5bWxpbmtzLFxuICogb3RoZXJ3aXNlIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8cm9vdERpcj4vbm9kZV9tb2R1bGVzXG4gKiBAcGFyYW0gcm9vdERpciBcbiAqIEBwYXJhbSBpc0RyY3BTeW1saW5rIFxuICovXG5mdW5jdGlvbiBzZXR1cE5vZGVQYXRoKHJvb3REaXI6IHN0cmluZywgc3ltbGlua0Rpcjogc3RyaW5nIHwgbnVsbCwgY3dkID0gcHJvY2Vzcy5jd2QoKSkge1xuICBjb25zdCBwYXRoQXJyYXkgPSBjYWxjTm9kZVBhdGhzKHJvb3REaXIsIHN5bWxpbmtEaXIsIGN3ZCk7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IHBhdGhBcnJheS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkoJ1tub2RlLXBhdGhdIE5PREVfUEFUSCcsIHByb2Nlc3MuZW52Lk5PREVfUEFUSCkpO1xuICByZXF1aXJlKCdtb2R1bGUnKS5Nb2R1bGUuX2luaXRQYXRocygpO1xuICByZXR1cm4gcGF0aEFycmF5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY05vZGVQYXRocyhyb290RGlyOiBzdHJpbmcsIHN5bWxpbmtEaXI6IHN0cmluZyB8IG51bGwsIGN3ZCA9IHByb2Nlc3MuY3dkKCkpIHtcbiAgY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IFtQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXTtcbiAgaWYgKHN5bWxpbmtEaXIpIHtcbiAgICBub2RlUGF0aHMudW5zaGlmdChzeW1saW5rRGlyKTtcbiAgfVxuICBpZiAocm9vdERpciAhPT0gY3dkKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoUGF0aC5yZXNvbHZlKGN3ZCwgJ25vZGVfbW9kdWxlcycpKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNvbWVob3cgd2hlbiBJIGluc3RhbGwgQHdmaC9wbGluayBpbiBhbiBuZXcgZGlyZWN0b3J5LCBucG0gZG9lcyBub3QgZGVkdXBlIGRlcGVuZGVuY2llcyBmcm9tIFxuICAgKiBAd2ZoL3BsaW5rL25vZGVfbW9kdWxlcyBkaXJlY3RvcnkgdXAgdG8gY3VycmVudCBub2RlX21vZHVsZXMgZGlyZWN0b3J5LCByZXN1bHRzIGluIE1PRFVMRV9OT1RfRk9VTkRcbiAgICogZnJvbSBAd2ZoL3BsaW5rL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZSBmb3Igcnhqc1xuICAgKi9cbiAgbm9kZVBhdGhzLnB1c2goZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyISwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpICsgUGF0aC5zZXAgKyAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX1BBVEgpIHtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgcHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgbm9kZVBhdGhzLnB1c2gocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIF8udW5pcShub2RlUGF0aHMpO1xufVxuXG4vKipcbiAqIEdldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJlZGVmaW5lZCBieVxuYGBgXG5jb25zdCB7aXNEcmNwU3ltbGluaywgc3ltbGlua0Rpciwgcm9vdERpciwgbm9kZVBhdGgsIGRpc3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5gYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGlua0VudiB7XG4gIGRpc3REaXI6IHN0cmluZztcbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgcm9vdERpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyOiBzdHJpbmcgfCBudWxsO1xuICBub2RlUGF0aDogc3RyaW5nW107XG59XG5cblxuaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZSwgdGFyZ2V0LCByZXEsIHJlc29sdmUpID0+IHtcbiAgaWYgKHRhcmdldCA9PT0gJ2xvZzRqcycpIHtcbiAgICByZXR1cm4gbG9nNGpzO1xuICB9XG59KTtcbiJdfQ==