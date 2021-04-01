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
const worker_threads_1 = require("worker_threads");
let logPrefix = 'node-path - ';
if (process.send)
    logPrefix = `[pid: ${process.pid}]` + logPrefix;
else if (!worker_threads_1.isMainThread)
    logPrefix = '[thread]' + logPrefix;
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
        console.log(chalk_1.default.gray(logPrefix + 'By default, Plink reads and writes state files in directory "<root-dir>/dist",\n' +
            'you may change it by' +
            ' setting environment variable PLINK_DATA_DIR to another relative directory'));
    }
    else {
        // tslint:disable-next-line: no-console
        console.log(chalk_1.default.gray(logPrefix + 'PLINK_DATA_DIR: ' + process.env.PLINK_DATA_DIR));
    }
    const workDir = process.env.PLINK_WORK_DIR ? Path.resolve(process.env.PLINK_WORK_DIR) : process.cwd();
    const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR, workDir);
    // We can change this path to another directory like '.links',
    // if we don't want node_modules to be polluted by symlinks;
    const symlinkDirName = exitingEnvVar && exitingEnvVar.symlinkDirName ?
        exitingEnvVar.symlinkDirName : 'node_modules';
    let plinkDir = Path.resolve(rootDir, 'node_modules/@wfh/plink');
    const isDrcpSymlink = exitingEnvVar ? exitingEnvVar.isDrcpSymlink : fs.lstatSync(plinkDir).isSymbolicLink();
    if (isDrcpSymlink)
        plinkDir = fs.realpathSync(plinkDir);
    const nodePath = setupNodePath(workDir, rootDir, fs.existsSync(Path.resolve(symlinkDirName)) ? Path.resolve(symlinkDirName) : null, plinkDir);
    const distDir = Path.resolve(rootDir, process.env.PLINK_DATA_DIR);
    process.env.__plink = JSON.stringify({
        workDir, distDir, isDrcpSymlink, rootDir, symlinkDirName, nodePath, plinkDir
    });
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
function findRootDir(distDir, currDir) {
    let dir = currDir;
    while (!fs.existsSync(Path.resolve(dir, distDir, 'plink-state.json'))) {
        const parentDir = Path.dirname(dir);
        if (parentDir === dir) {
            dir = currDir;
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
function setupNodePath(currDir, rootDir, symlinksDir, plinkDir) {
    const pathArray = calcNodePaths(rootDir, symlinksDir, currDir, plinkDir);
    process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.gray(logPrefix + 'NODE_PATH', process.env.NODE_PATH));
    require('module').Module._initPaths();
    return pathArray;
}
function calcNodePaths(rootDir, symlinksDir, cwd, plinkDir) {
    const nodePaths = [Path.resolve(rootDir, 'node_modules')];
    if (symlinksDir) {
        nodePaths.unshift(symlinksDir);
    }
    if (rootDir !== cwd) {
        nodePaths.unshift(Path.resolve(cwd, 'node_modules'));
    }
    /**
     * Somehow when I install @wfh/plink in an new directory, npm does not dedupe dependencies from
     * @wfh/plink/node_modules directory up to current node_modules directory, results in MODULE_NOT_FOUND
     * from @wfh/plink/redux-toolkit-abservable for rxjs
     */
    nodePaths.push(plinkDir + Path.sep + 'node_modules');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsK0NBQWtEO0FBQ2xELG9EQUF1QjtBQUN2QixtREFBNEM7QUFFNUMsSUFBSSxTQUFTLEdBQUcsY0FBYyxDQUFDO0FBQy9CLElBQUksT0FBTyxDQUFDLElBQUk7SUFDZCxTQUFTLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQzdDLElBQUksQ0FBQyw2QkFBWTtJQUNwQixTQUFTLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUVyQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDbEIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFdkM7OztPQUdHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDcEMsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsa0ZBQWtGO1lBQ3JILHNCQUFzQjtZQUN0Qiw0RUFBNEUsQ0FBQyxDQUFDLENBQUM7S0FDaEY7U0FBTTtRQUNMLHVDQUF1QztRQUN2QyxPQUFPLENB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TSxLQUFLLFFBQVEsRUFBRTtRQUN2QixPQUFPLGdCQUFNLENBQUM7S0FDZjtBQUNILENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2hvb2tDb21tb25Kc1JlcXVpcmV9IGZyb20gJy4vbG9hZGVySG9va3MnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCBsb2dQcmVmaXggPSAnbm9kZS1wYXRoIC0gJztcbmlmIChwcm9jZXNzLnNlbmQpXG4gIGxvZ1ByZWZpeCA9IGBbcGlkOiAke3Byb2Nlc3MucGlkfV1gICsgbG9nUHJlZml4O1xuZWxzZSBpZiAoIWlzTWFpblRocmVhZClcbiAgbG9nUHJlZml4ID0gJ1t0aHJlYWRdJyArIGxvZ1ByZWZpeDtcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmICghcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpIHtcbiAgICBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9ICdkaXN0JztcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdCeSBkZWZhdWx0LCBQbGluayByZWFkcyBhbmQgd3JpdGVzIHN0YXRlIGZpbGVzIGluIGRpcmVjdG9yeSBcIjxyb290LWRpcj4vZGlzdFwiLFxcbicgK1xuICAgICd5b3UgbWF5IGNoYW5nZSBpdCBieScgK1xuICAgICcgc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19EQVRBX0RJUiB0byBhbm90aGVyIHJlbGF0aXZlIGRpcmVjdG9yeScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdQTElOS19EQVRBX0RJUjogJyArIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSk7XG4gIH1cbiAgY29uc3Qgd29ya0RpciA9IHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSID8gUGF0aC5yZXNvbHZlKHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSKSA6IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IHJvb3REaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5yb290RGlyIDogZmluZFJvb3REaXIocHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIsIHdvcmtEaXIpO1xuXG4gIC8vIFdlIGNhbiBjaGFuZ2UgdGhpcyBwYXRoIHRvIGFub3RoZXIgZGlyZWN0b3J5IGxpa2UgJy5saW5rcycsXG4gIC8vIGlmIHdlIGRvbid0IHdhbnQgbm9kZV9tb2R1bGVzIHRvIGJlIHBvbGx1dGVkIGJ5IHN5bWxpbmtzO1xuICBjb25zdCBzeW1saW5rRGlyTmFtZSA9IGV4aXRpbmdFbnZWYXIgJiYgZXhpdGluZ0VudlZhci5zeW1saW5rRGlyTmFtZSA/XG4gICAgZXhpdGluZ0VudlZhci5zeW1saW5rRGlyTmFtZSA6ICdub2RlX21vZHVsZXMnO1xuXG5cbiAgbGV0IHBsaW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpO1xuICBjb25zdCBpc0RyY3BTeW1saW5rID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIuaXNEcmNwU3ltbGluayA6IGZzLmxzdGF0U3luYyhwbGlua0RpcikuaXNTeW1ib2xpY0xpbmsoKTtcbiAgaWYgKGlzRHJjcFN5bWxpbmspXG4gICAgcGxpbmtEaXIgPSBmcy5yZWFscGF0aFN5bmMocGxpbmtEaXIpO1xuICBjb25zdCBub2RlUGF0aCA9IHNldHVwTm9kZVBhdGgod29ya0Rpciwgcm9vdERpcixcbiAgICBmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShzeW1saW5rRGlyTmFtZSkpID8gUGF0aC5yZXNvbHZlKHN5bWxpbmtEaXJOYW1lKSA6IG51bGwsXG4gICAgcGxpbmtEaXIpO1xuICBjb25zdCBkaXN0RGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKTtcbiAgcHJvY2Vzcy5lbnYuX19wbGluayA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICB3b3JrRGlyLCBkaXN0RGlyLCBpc0RyY3BTeW1saW5rLCByb290RGlyLCBzeW1saW5rRGlyTmFtZSwgbm9kZVBhdGgsIHBsaW5rRGlyfSBhcyBQbGlua0Vudik7XG5cbiAgLy8gZGVsZXRlIHJlZ2lzdGVyIGZyb20gY29tbWFuZCBsaW5lIG9wdGlvbiwgdG8gYXZvaWQgY2hpbGQgcHJvY2VzcyBnZXQgdGhpcyBvcHRpb24sIHNpbmNlIHdlIGhhdmUgTk9ERV9QQVRIIHNldFxuICAvLyBmb3IgY2hpbGQgcHJvY2Vzc1xuICBjb25zdCBkZWxldGVFeGVjQXJnSWR4OiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGkgPCBsIC0gMSAmJiAvXig/Oi1yfC0tcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gICAgICAvXkB3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgICB9XG4gIH1cbiAgZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gICAgcHJvY2Vzcy5leGVjQXJndi5zcGxpY2UoZGVsZXRlSWR4ICsgb2Zmc2V0LCAyKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfSwgMCk7XG5cbiAgY29uc3QgZW52T3B0aW9ucyA9IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA/IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUy5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID1cbiAgICBlbnZPcHRpb25zLmZpbHRlcihpdGVtID0+ICEvKC1yfC0tcmVxdWlyZSlcXHMrQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIvLnRlc3QoaXRlbSkpLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcihkaXN0RGlyOiBzdHJpbmcsIGN1cnJEaXI6IHN0cmluZykge1xuICBsZXQgZGlyID0gY3VyckRpcjtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsIGRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gZGlyKSB7XG4gICAgICBkaXIgPSBjdXJyRGlyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IHBhcmVudERpcjtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vKipcbiAqIGlmIGN3ZCBpcyBub3Qgcm9vdCBkaXJlY3RvcnksIHRoZW4gYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxjd2Q+L25vZGVfbW9kdWxlczo8cm9vdERpcj4vc3ltbGlua3MsXG4gKiBvdGhlcndpc2UgYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxyb290RGlyPi9ub2RlX21vZHVsZXNcbiAqIEBwYXJhbSByb290RGlyIFxuICogQHBhcmFtIGlzRHJjcFN5bWxpbmsgXG4gKi9cbmZ1bmN0aW9uIHNldHVwTm9kZVBhdGgoY3VyckRpcjogc3RyaW5nLCByb290RGlyOiBzdHJpbmcsIHN5bWxpbmtzRGlyOiBzdHJpbmcgfCBudWxsLCBwbGlua0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHBhdGhBcnJheSA9IGNhbGNOb2RlUGF0aHMocm9vdERpciwgc3ltbGlua3NEaXIsIGN1cnJEaXIsIHBsaW5rRGlyKTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSk7XG4gIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjTm9kZVBhdGhzKHJvb3REaXI6IHN0cmluZywgc3ltbGlua3NEaXI6IHN0cmluZyB8IG51bGwsIGN3ZDogc3RyaW5nLCBwbGlua0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IG5vZGVQYXRoczogc3RyaW5nW10gPSBbUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKV07XG4gIGlmIChzeW1saW5rc0Rpcikge1xuICAgIG5vZGVQYXRocy51bnNoaWZ0KHN5bWxpbmtzRGlyKTtcbiAgfVxuICBpZiAocm9vdERpciAhPT0gY3dkKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoUGF0aC5yZXNvbHZlKGN3ZCwgJ25vZGVfbW9kdWxlcycpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTb21laG93IHdoZW4gSSBpbnN0YWxsIEB3ZmgvcGxpbmsgaW4gYW4gbmV3IGRpcmVjdG9yeSwgbnBtIGRvZXMgbm90IGRlZHVwZSBkZXBlbmRlbmNpZXMgZnJvbSBcbiAgICogQHdmaC9wbGluay9ub2RlX21vZHVsZXMgZGlyZWN0b3J5IHVwIHRvIGN1cnJlbnQgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSwgcmVzdWx0cyBpbiBNT0RVTEVfTk9UX0ZPVU5EXG4gICAqIGZyb20gQHdmaC9wbGluay9yZWR1eC10b29sa2l0LWFic2VydmFibGUgZm9yIHJ4anNcbiAgICovXG4gIG5vZGVQYXRocy5wdXNoKHBsaW5rRGlyICsgUGF0aC5zZXAgKyAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX1BBVEgpIHtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgcHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgbm9kZVBhdGhzLnB1c2gocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIF8udW5pcShub2RlUGF0aHMpO1xufVxuXG4vKipcbiAqIEdldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJlZGVmaW5lZCBieVxuYGBgXG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxpbmtFbnYge1xuICBkaXN0RGlyOiBzdHJpbmc7XG4gIC8qKiBpcyBQbGluayBhIHN5bWxpbmssIERyY3AgaXMgb2xkIG5hbWUgb2YgUGxpbmsgKi9cbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgcm9vdERpcjogc3RyaW5nO1xuICAvKiogdG8gYWxsb3cgUGxpbmsgY29tbWFuZCBsaW5lIHdvcmsgZm9yIGFueSBkaXJlY3Rvcnkgb3RoZXIgdGhhbiBwcm9jZXNzLmN3ZCgpICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpck5hbWU6IHN0cmluZyB8ICdub2RlX21vZHVsZXMnO1xuICBub2RlUGF0aDogc3RyaW5nW107XG4gIHBsaW5rRGlyOiBzdHJpbmc7XG59XG5cblxuaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZSwgdGFyZ2V0LCByZXEsIHJlc29sdmUpID0+IHtcbiAgaWYgKHRhcmdldCA9PT0gJ2xvZzRqcycpIHtcbiAgICByZXR1cm4gbG9nNGpzO1xuICB9XG59KTtcbiJdfQ==