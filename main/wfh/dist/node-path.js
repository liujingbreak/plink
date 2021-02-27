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
    const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR);
    let symlinkDir = exitingEnvVar ? exitingEnvVar.symlinkDir : Path.resolve('.links');
    if (symlinkDir && !fs.existsSync(symlinkDir)) {
        symlinkDir = null;
    }
    let plinkDir = Path.resolve(rootDir, 'node_modules/@wfh/plink');
    const isDrcpSymlink = exitingEnvVar ? exitingEnvVar.isDrcpSymlink : fs.lstatSync(plinkDir).isSymbolicLink();
    if (isDrcpSymlink)
        plinkDir = fs.realpathSync(plinkDir);
    const nodePath = setupNodePath(rootDir, symlinkDir, plinkDir);
    const distDir = Path.resolve(rootDir, process.env.PLINK_DATA_DIR);
    process.env.__plink = JSON.stringify({ distDir, isDrcpSymlink, rootDir, symlinkDir, nodePath, plinkDir });
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
function setupNodePath(rootDir, symlinksDir, plinkDir) {
    const pathArray = calcNodePaths(rootDir, symlinksDir, process.cwd(), plinkDir);
    process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.gray(logPrefix + 'NODE_PATH', process.env.NODE_PATH));
    require('module').Module._initPaths();
    return pathArray;
}
function calcNodePaths(rootDir, symlinksDir, cwd = process.cwd(), plinkDir) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsK0NBQWtEO0FBQ2xELG9EQUF1QjtBQUN2QixtREFBNEM7QUFFNUMsSUFBSSxTQUFTLEdBQUcsY0FBYyxDQUFDO0FBQy9CLElBQUksT0FBTyxDQUFDLElBQUk7SUFDZCxTQUFTLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQzdDLElBQUksQ0FBQyw2QkFBWTtJQUNwQixTQUFTLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUVyQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDbEIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFdkM7OztPQUdHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDcEMsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsa0ZBQWtGO1lBQ3JILHNCQUFzQjtZQUN0Qiw0RUFBNEUsQ0FBQyxDQUFDLENBQUM7S0FDaEY7U0FBTTtRQUNMLHVDQUF1QztRQUN2QyxPQUFPLENB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MEIsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQWdCO0lBQzlHLE1BQU0sU0FBUyxHQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUNwRSxJQUFJLFdBQVcsRUFBRTtRQUNmLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDaEM7SUFDRCxJQUFJLE9BQU8sS0FBSyxHQUFHLEVBQUU7UUFDbkIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0tBQ3REO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLENBQUM7SUFDckQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtRQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDOUQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QjtLQUNGO0lBRUQsT0FBTyxnQkFBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBdEJELHNDQXNCQztBQWtCRCxpQ0FBbUIsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ2pELElBQUksTUFBTSxLQUFLLFFBQVEsRUFBRTtRQUN2QixPQUFPLGdCQUFNLENBQUM7S0FDZjtBQUNILENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2hvb2tDb21tb25Kc1JlcXVpcmV9IGZyb20gJy4vbG9hZGVySG9va3MnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCBsb2dQcmVmaXggPSAnbm9kZS1wYXRoIC0gJztcbmlmIChwcm9jZXNzLnNlbmQpXG4gIGxvZ1ByZWZpeCA9IGBbcGlkOiAke3Byb2Nlc3MucGlkfV1gICsgbG9nUHJlZml4O1xuZWxzZSBpZiAoIWlzTWFpblRocmVhZClcbiAgbG9nUHJlZml4ID0gJ1t0aHJlYWRdJyArIGxvZ1ByZWZpeDtcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmICghcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpIHtcbiAgICBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9ICdkaXN0JztcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdCeSBkZWZhdWx0LCBQbGluayByZWFkcyBhbmQgd3JpdGVzIHN0YXRlIGZpbGVzIGluIGRpcmVjdG9yeSBcIjxyb290LWRpcj4vZGlzdFwiLFxcbicgK1xuICAgICd5b3UgbWF5IGNoYW5nZSBpdCBieScgK1xuICAgICcgc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19EQVRBX0RJUiB0byBhbm90aGVyIHJlbGF0aXZlIGRpcmVjdG9yeScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdQTElOS19EQVRBX0RJUjogJyArIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSk7XG4gIH1cbiAgY29uc3Qgcm9vdERpciA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLnJvb3REaXIgOiBmaW5kUm9vdERpcihwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUik7XG5cbiAgbGV0IHN5bWxpbmtEaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5zeW1saW5rRGlyIDogUGF0aC5yZXNvbHZlKCcubGlua3MnKTtcbiAgaWYgKHN5bWxpbmtEaXIgJiYgIWZzLmV4aXN0c1N5bmMoc3ltbGlua0RpcikpIHtcbiAgICBzeW1saW5rRGlyID0gbnVsbDtcbiAgfVxuICBsZXQgcGxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJyk7XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5pc0RyY3BTeW1saW5rIDogZnMubHN0YXRTeW5jKHBsaW5rRGlyKS5pc1N5bWJvbGljTGluaygpO1xuICBpZiAoaXNEcmNwU3ltbGluaylcbiAgICBwbGlua0RpciA9IGZzLnJlYWxwYXRoU3luYyhwbGlua0Rpcik7XG4gIGNvbnN0IG5vZGVQYXRoID0gc2V0dXBOb2RlUGF0aChyb290RGlyLCBzeW1saW5rRGlyLCBwbGlua0Rpcik7XG4gIGNvbnN0IGRpc3REaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe2Rpc3REaXIsIGlzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXIsIG5vZGVQYXRoLCBwbGlua0Rpcn0gYXMgUGxpbmtFbnYpO1xuXG4gIC8vIGRlbGV0ZSByZWdpc3RlciBmcm9tIGNvbW1hbmQgbGluZSBvcHRpb24sIHRvIGF2b2lkIGNoaWxkIHByb2Nlc3MgZ2V0IHRoaXMgb3B0aW9uLCBzaW5jZSB3ZSBoYXZlIE5PREVfUEFUSCBzZXRcbiAgLy8gZm9yIGNoaWxkIHByb2Nlc3NcbiAgY29uc3QgZGVsZXRlRXhlY0FyZ0lkeDogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwcm9jZXNzLmV4ZWNBcmd2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpIDwgbCAtIDEgJiYgL14oPzotcnwtLXJlcXVpcmUpJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2ldKSAmJlxuICAgICAgL15Ad2ZoXFwvcGxpbmtcXC9yZWdpc3RlciQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpICsgMV0pKSB7XG4gICAgICBkZWxldGVFeGVjQXJnSWR4LnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGRlbGV0ZUV4ZWNBcmdJZHgucmVkdWNlKChvZmZzZXQsIGRlbGV0ZUlkeCkgPT4ge1xuICAgIHByb2Nlc3MuZXhlY0FyZ3Yuc3BsaWNlKGRlbGV0ZUlkeCArIG9mZnNldCwgMik7XG4gICAgcmV0dXJuIG9mZnNldCArIDI7XG4gIH0sIDApO1xuXG4gIGNvbnN0IGVudk9wdGlvbnMgPSBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPyBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4gIHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA9XG4gICAgZW52T3B0aW9ucy5maWx0ZXIoaXRlbSA9PiAhLygtcnwtLXJlcXVpcmUpXFxzK0B3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyLy50ZXN0KGl0ZW0pKS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuZnVuY3Rpb24gZmluZFJvb3REaXIoZGlzdERpcjogc3RyaW5nKSB7XG4gIGxldCBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGRpciwgZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSBkaXIpIHtcbiAgICAgIGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8qKlxuICogaWYgY3dkIGlzIG5vdCByb290IGRpcmVjdG9yeSwgdGhlbiBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPGN3ZD4vbm9kZV9tb2R1bGVzOjxyb290RGlyPi9zeW1saW5rcyxcbiAqIG90aGVyd2lzZSBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPHJvb3REaXI+L25vZGVfbW9kdWxlc1xuICogQHBhcmFtIHJvb3REaXIgXG4gKiBAcGFyYW0gaXNEcmNwU3ltbGluayBcbiAqL1xuZnVuY3Rpb24gc2V0dXBOb2RlUGF0aChyb290RGlyOiBzdHJpbmcsIHN5bWxpbmtzRGlyOiBzdHJpbmcgfCBudWxsLCBwbGlua0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHBhdGhBcnJheSA9IGNhbGNOb2RlUGF0aHMocm9vdERpciwgc3ltbGlua3NEaXIsIHByb2Nlc3MuY3dkKCksIHBsaW5rRGlyKTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSk7XG4gIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjTm9kZVBhdGhzKHJvb3REaXI6IHN0cmluZywgc3ltbGlua3NEaXI6IHN0cmluZyB8IG51bGwsIGN3ZCA9IHByb2Nlc3MuY3dkKCksIHBsaW5rRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IFtQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXTtcbiAgaWYgKHN5bWxpbmtzRGlyKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoc3ltbGlua3NEaXIpO1xuICB9XG4gIGlmIChyb290RGlyICE9PSBjd2QpIHtcbiAgICBub2RlUGF0aHMudW5zaGlmdChQYXRoLnJlc29sdmUoY3dkLCAnbm9kZV9tb2R1bGVzJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNvbWVob3cgd2hlbiBJIGluc3RhbGwgQHdmaC9wbGluayBpbiBhbiBuZXcgZGlyZWN0b3J5LCBucG0gZG9lcyBub3QgZGVkdXBlIGRlcGVuZGVuY2llcyBmcm9tIFxuICAgKiBAd2ZoL3BsaW5rL25vZGVfbW9kdWxlcyBkaXJlY3RvcnkgdXAgdG8gY3VycmVudCBub2RlX21vZHVsZXMgZGlyZWN0b3J5LCByZXN1bHRzIGluIE1PRFVMRV9OT1RfRk9VTkRcbiAgICogZnJvbSBAd2ZoL3BsaW5rL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZSBmb3Igcnhqc1xuICAgKi9cbiAgbm9kZVBhdGhzLnB1c2gocGxpbmtEaXIgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMucHVzaChwYXRoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gXy51bmlxKG5vZGVQYXRocyk7XG59XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBwcmVkZWZpbmVkIGJ5XG5gYGBcbmNvbnN0IHtpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyLCByb290RGlyLCBub2RlUGF0aCwgZGlzdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgZGlzdERpcjogc3RyaW5nO1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICByb290RGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZyB8IG51bGw7XG4gIG5vZGVQYXRoOiBzdHJpbmdbXTtcbiAgcGxpbmtEaXI6IHN0cmluZztcbn1cblxuXG5ob29rQ29tbW9uSnNSZXF1aXJlKChmaWxlLCB0YXJnZXQsIHJlcSwgcmVzb2x2ZSkgPT4ge1xuICBpZiAodGFyZ2V0ID09PSAnbG9nNGpzJykge1xuICAgIHJldHVybiBsb2c0anM7XG4gIH1cbn0pO1xuIl19