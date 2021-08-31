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
let logPrefix = '> ';
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
        if (worker_threads_1.isMainThread || process.send == null) {
            // eslint-disable-next-line no-console
            console.log(chalk_1.default.gray(logPrefix + 'By default, Plink reads and writes state files in directory "<root-dir>/dist",\n' +
                'you may change it by' +
                ' setting environment variable PLINK_DATA_DIR to another relative directory'));
        }
    }
    else {
        // eslint-disable-next-line no-console
        console.log(chalk_1.default.gray(logPrefix + 'PLINK_DATA_DIR: ' + process.env.PLINK_DATA_DIR));
    }
    const PLINK_WORK_DIR = process.env.PLINK_WORK_DIR;
    if (PLINK_WORK_DIR) {
        // eslint-disable-next-line no-console
        console.log(logPrefix + `Environment variable PLINK_WORK_DIR is set, default workspace is: ${PLINK_WORK_DIR}`);
    }
    const workDir = PLINK_WORK_DIR ? Path.resolve(PLINK_WORK_DIR) : process.cwd();
    const rootDir = exitingEnvVar ? exitingEnvVar.rootDir : findRootDir(process.env.PLINK_DATA_DIR, workDir);
    checkUpLevelNodeModules(rootDir);
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
    let dir = Path.resolve(currDir);
    const { root } = Path.parse(dir);
    while (!fs.existsSync(Path.resolve(dir, distDir, 'plink-state.json'))) {
        const parentDir = Path.dirname(dir);
        if (parentDir === root) {
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
    // eslint-disable-next-line no-console
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
/**
 * Webpack and TS compiler by default will look up node_modules from up level directries,
 * this breaks Plink's way of adding extra node path for Node.js, TS or Webpack, it leads
 * to problematic module loading issue.
 */
function checkUpLevelNodeModules(rootDir) {
    const dirs = [];
    let currDir = rootDir;
    const { root } = Path.parse(rootDir);
    let parentDir = Path.dirname(currDir);
    while (parentDir !== root) {
        dirs.push(Path.resolve(parentDir, 'node_modules'));
        currDir = parentDir;
        parentDir = Path.dirname(currDir);
    }
    const nodeModule = dirs.find(dir => fs.existsSync(dir));
    if (nodeModule) {
        // eslint-disable-next-line no-console
        console.log(`Please change another directory to install, or remove ${chalk_1.default.red(nodeModule)},` +
            'which is getting the higher priority than loading Plink dependency for monorepo environment');
        throw new Error(chalk_1.default.red(`Found "${nodeModule}" in Plink CLI's upper level directory, ` +
            'this could be problematic for Plink or Webpack to load proper module.'));
    }
}
loaderHooks_1.hookCommonJsRequire((file, target, req, resolve) => {
    if (target === 'log4js') {
        return log4js_1.default;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsK0NBQWtEO0FBQ2xELG9EQUF1QjtBQUN2QixtREFBNEM7QUFFNUMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLElBQUksT0FBTyxDQUFDLElBQUk7SUFDZCxTQUFTLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQzdDLElBQUksQ0FBQyw2QkFBWTtJQUNwQixTQUFTLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUVyQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDbEIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFdkM7OztPQUdHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDcEMsSUFBSSw2QkFBWSxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ3hDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLGtGQUFrRjtnQkFDckgsc0JBQXNCO2dCQUN0Qiw0RUFB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QUFVLFVBQVUsMENBQTBDO1lBQ3RGLHVFQUF1RSxDQUFDLENBQUMsQ0FBQztLQUM3RTtBQUNILENBQUM7QUFHRCxpQ0FBbUIsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ2pELElBQUksTUFBTSxLQUFLLFFBQVEsRUFBRTtRQUN2QixPQUFPLGdCQUFNLENBQUM7S0FDZjtBQUNILENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2hvb2tDb21tb25Kc1JlcXVpcmV9IGZyb20gJy4vbG9hZGVySG9va3MnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCBsb2dQcmVmaXggPSAnPiAnO1xuaWYgKHByb2Nlc3Muc2VuZClcbiAgbG9nUHJlZml4ID0gYFtwaWQ6ICR7cHJvY2Vzcy5waWR9XWAgKyBsb2dQcmVmaXg7XG5lbHNlIGlmICghaXNNYWluVGhyZWFkKVxuICBsb2dQcmVmaXggPSAnW3RocmVhZF0nICsgbG9nUHJlZml4O1xuXG5sZXQgZW52U2V0RG9uZSA9IGZhbHNlO1xuXG5pZiAoIWVudlNldERvbmUpIHtcbiAgZW52U2V0RG9uZSA9IHRydWU7XG4gIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuXG4gIC8qKiBlbnZpcm9ubWVudCB2YXJhaWJsZSBfX3BsaW5rIGlzIHVzZWQgZm9yIHNoYXJlIGJhc2ljIFBsaW5rIGluZm9ybWF0aW9uIGJldHdlZW46XG4gICAqIC0gTm9kZS5qcyBcIi1yXCIgcHJlbG9hZCBtb2R1bGUgYW5kIG5vcm1hbCBtb2R1bGVzLCBlc3BlY2lhbGx5IHNldHRpbmcgTk9ERV9QQVRIIGluIFwiLXJcIiBtb2R1bGVcbiAgICogLSBNYWluIHByb2Nlc3MgYW5kIGZvcmtlZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXJcbiAgICovXG4gIGNvbnN0IGV4aXRpbmdFbnZWYXIgPSBwcm9jZXNzLmVudi5fX3BsaW5rID8gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rKSBhcyBQbGlua0VudiA6IG51bGw7XG5cbiAgaWYgKCFwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikge1xuICAgIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSID0gJ2Rpc3QnO1xuICAgIGlmIChpc01haW5UaHJlYWQgfHwgcHJvY2Vzcy5zZW5kID09IG51bGwpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdCeSBkZWZhdWx0LCBQbGluayByZWFkcyBhbmQgd3JpdGVzIHN0YXRlIGZpbGVzIGluIGRpcmVjdG9yeSBcIjxyb290LWRpcj4vZGlzdFwiLFxcbicgK1xuICAgICAgJ3lvdSBtYXkgY2hhbmdlIGl0IGJ5JyArXG4gICAgICAnIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgUExJTktfREFUQV9ESVIgdG8gYW5vdGhlciByZWxhdGl2ZSBkaXJlY3RvcnknKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnUExJTktfREFUQV9ESVI6ICcgKyBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikpO1xuICB9XG4gIGNvbnN0IFBMSU5LX1dPUktfRElSID0gcHJvY2Vzcy5lbnYuUExJTktfV09SS19ESVI7XG4gIGlmIChQTElOS19XT1JLX0RJUikge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2cobG9nUHJlZml4ICsgYEVudmlyb25tZW50IHZhcmlhYmxlIFBMSU5LX1dPUktfRElSIGlzIHNldCwgZGVmYXVsdCB3b3Jrc3BhY2UgaXM6ICR7UExJTktfV09SS19ESVJ9YCk7XG4gIH1cbiAgY29uc3Qgd29ya0RpciA9IFBMSU5LX1dPUktfRElSID8gUGF0aC5yZXNvbHZlKFBMSU5LX1dPUktfRElSKSA6IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IHJvb3REaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5yb290RGlyIDogZmluZFJvb3REaXIocHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIsIHdvcmtEaXIpO1xuICBjaGVja1VwTGV2ZWxOb2RlTW9kdWxlcyhyb290RGlyKTtcbiAgLy8gV2UgY2FuIGNoYW5nZSB0aGlzIHBhdGggdG8gYW5vdGhlciBkaXJlY3RvcnkgbGlrZSAnLmxpbmtzJyxcbiAgLy8gaWYgd2UgZG9uJ3Qgd2FudCBub2RlX21vZHVsZXMgdG8gYmUgcG9sbHV0ZWQgYnkgc3ltbGlua3M7XG4gIGNvbnN0IHN5bWxpbmtEaXJOYW1lID0gZXhpdGluZ0VudlZhciAmJiBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXJOYW1lID9cbiAgICBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXJOYW1lIDogJ25vZGVfbW9kdWxlcyc7XG5cblxuICBsZXQgcGxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJyk7XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5pc0RyY3BTeW1saW5rIDogZnMubHN0YXRTeW5jKHBsaW5rRGlyKS5pc1N5bWJvbGljTGluaygpO1xuICBpZiAoaXNEcmNwU3ltbGluaylcbiAgICBwbGlua0RpciA9IGZzLnJlYWxwYXRoU3luYyhwbGlua0Rpcik7XG4gIGNvbnN0IG5vZGVQYXRoID0gc2V0dXBOb2RlUGF0aCh3b3JrRGlyLCByb290RGlyLFxuICAgIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHN5bWxpbmtEaXJOYW1lKSkgPyBQYXRoLnJlc29sdmUoc3ltbGlua0Rpck5hbWUpIDogbnVsbCxcbiAgICBwbGlua0Rpcik7XG4gIGNvbnN0IGRpc3REaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgIHdvcmtEaXIsIGRpc3REaXIsIGlzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXJOYW1lLCBub2RlUGF0aCwgcGxpbmtEaXJ9IGFzIFBsaW5rRW52KTtcblxuICAvLyBkZWxldGUgcmVnaXN0ZXIgZnJvbSBjb21tYW5kIGxpbmUgb3B0aW9uLCB0byBhdm9pZCBjaGlsZCBwcm9jZXNzIGdldCB0aGlzIG9wdGlvbiwgc2luY2Ugd2UgaGF2ZSBOT0RFX1BBVEggc2V0XG4gIC8vIGZvciBjaGlsZCBwcm9jZXNzXG4gIGNvbnN0IGRlbGV0ZUV4ZWNBcmdJZHg6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcHJvY2Vzcy5leGVjQXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaSA8IGwgLSAxICYmIC9eKD86LXJ8LS1yZXF1aXJlKSQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpXSkgJiZcbiAgICAgIC9eQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaSArIDFdKSkge1xuICAgICAgZGVsZXRlRXhlY0FyZ0lkeC5wdXNoKGkpO1xuICAgIH1cbiAgfVxuICBkZWxldGVFeGVjQXJnSWR4LnJlZHVjZSgob2Zmc2V0LCBkZWxldGVJZHgpID0+IHtcbiAgICBwcm9jZXNzLmV4ZWNBcmd2LnNwbGljZShkZWxldGVJZHggKyBvZmZzZXQsIDIpO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9LCAwKTtcblxuICBjb25zdCBlbnZPcHRpb25zID0gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID8gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPVxuICAgIGVudk9wdGlvbnMuZmlsdGVyKGl0ZW0gPT4gIS8oLXJ8LS1yZXF1aXJlKVxccytAd2ZoXFwvcGxpbmtcXC9yZWdpc3Rlci8udGVzdChpdGVtKSkuam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKGRpc3REaXI6IHN0cmluZywgY3VyckRpcjogc3RyaW5nKSB7XG4gIGxldCBkaXIgPSBQYXRoLnJlc29sdmUoY3VyckRpcik7XG4gIGNvbnN0IHtyb290fSA9IFBhdGgucGFyc2UoZGlyKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsIGRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gcm9vdCkge1xuICAgICAgZGlyID0gY3VyckRpcjtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLyoqXG4gKiBpZiBjd2QgaXMgbm90IHJvb3QgZGlyZWN0b3J5LCB0aGVuIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8Y3dkPi9ub2RlX21vZHVsZXM6PHJvb3REaXI+L3N5bWxpbmtzLFxuICogb3RoZXJ3aXNlIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8cm9vdERpcj4vbm9kZV9tb2R1bGVzXG4gKiBAcGFyYW0gcm9vdERpciBcbiAqIEBwYXJhbSBpc0RyY3BTeW1saW5rIFxuICovXG5mdW5jdGlvbiBzZXR1cE5vZGVQYXRoKGN1cnJEaXI6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBzeW1saW5rc0Rpcjogc3RyaW5nIHwgbnVsbCwgcGxpbmtEaXI6IHN0cmluZykge1xuICBjb25zdCBwYXRoQXJyYXkgPSBjYWxjTm9kZVBhdGhzKHJvb3REaXIsIHN5bWxpbmtzRGlyLCBjdXJyRGlyLCBwbGlua0Rpcik7XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IHBhdGhBcnJheS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSk7XG4gIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjTm9kZVBhdGhzKHJvb3REaXI6IHN0cmluZywgc3ltbGlua3NEaXI6IHN0cmluZyB8IG51bGwsIGN3ZDogc3RyaW5nLCBwbGlua0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IG5vZGVQYXRoczogc3RyaW5nW10gPSBbUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKV07XG4gIGlmIChzeW1saW5rc0Rpcikge1xuICAgIG5vZGVQYXRocy51bnNoaWZ0KHN5bWxpbmtzRGlyKTtcbiAgfVxuICBpZiAocm9vdERpciAhPT0gY3dkKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoUGF0aC5yZXNvbHZlKGN3ZCwgJ25vZGVfbW9kdWxlcycpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTb21laG93IHdoZW4gSSBpbnN0YWxsIEB3ZmgvcGxpbmsgaW4gYW4gbmV3IGRpcmVjdG9yeSwgbnBtIGRvZXMgbm90IGRlZHVwZSBkZXBlbmRlbmNpZXMgZnJvbSBcbiAgICogQHdmaC9wbGluay9ub2RlX21vZHVsZXMgZGlyZWN0b3J5IHVwIHRvIGN1cnJlbnQgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSwgcmVzdWx0cyBpbiBNT0RVTEVfTk9UX0ZPVU5EXG4gICAqIGZyb20gQHdmaC9wbGluay9yZWR1eC10b29sa2l0LWFic2VydmFibGUgZm9yIHJ4anNcbiAgICovXG4gIG5vZGVQYXRocy5wdXNoKHBsaW5rRGlyICsgUGF0aC5zZXAgKyAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX1BBVEgpIHtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgcHJvY2Vzcy5lbnYuTk9ERV9QQVRILnNwbGl0KFBhdGguZGVsaW1pdGVyKSkge1xuICAgICAgbm9kZVBhdGhzLnB1c2gocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIF8udW5pcShub2RlUGF0aHMpO1xufVxuXG4vKipcbiAqIEdldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJlZGVmaW5lZCBieVxuYGBgXG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxpbmtFbnYge1xuICBkaXN0RGlyOiBzdHJpbmc7XG4gIC8qKiB3aGV0aGVyIFBsaW5rIGlzIGEgc3ltbGluaywgRHJjcCBpcyBvbGQgbmFtZSBvZiBQbGluayAqL1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICByb290RGlyOiBzdHJpbmc7XG4gIC8qKiBjdXJyZW50IHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yeSAqL1xuICB3b3JrRGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXJOYW1lOiBzdHJpbmcgfCAnbm9kZV9tb2R1bGVzJztcbiAgbm9kZVBhdGg6IHN0cmluZ1tdO1xuICBwbGlua0Rpcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIFdlYnBhY2sgYW5kIFRTIGNvbXBpbGVyIGJ5IGRlZmF1bHQgd2lsbCBsb29rIHVwIG5vZGVfbW9kdWxlcyBmcm9tIHVwIGxldmVsIGRpcmVjdHJpZXMsXG4gKiB0aGlzIGJyZWFrcyBQbGluaydzIHdheSBvZiBhZGRpbmcgZXh0cmEgbm9kZSBwYXRoIGZvciBOb2RlLmpzLCBUUyBvciBXZWJwYWNrLCBpdCBsZWFkc1xuICogdG8gcHJvYmxlbWF0aWMgbW9kdWxlIGxvYWRpbmcgaXNzdWUuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrVXBMZXZlbE5vZGVNb2R1bGVzKHJvb3REaXI6IHN0cmluZykge1xuICBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG5cbiAgbGV0IGN1cnJEaXIgPSByb290RGlyO1xuICBjb25zdCB7cm9vdH0gPSBQYXRoLnBhcnNlKHJvb3REaXIpO1xuICBsZXQgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGN1cnJEaXIpO1xuICB3aGlsZSAocGFyZW50RGlyICE9PSByb290KSB7XG4gICAgZGlycy5wdXNoKFBhdGgucmVzb2x2ZShwYXJlbnREaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgY3VyckRpciA9IHBhcmVudERpcjtcbiAgICBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoY3VyckRpcik7XG4gIH1cbiAgY29uc3Qgbm9kZU1vZHVsZSA9IGRpcnMuZmluZChkaXIgPT4gZnMuZXhpc3RzU3luYyhkaXIpKTtcbiAgaWYgKG5vZGVNb2R1bGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBQbGVhc2UgY2hhbmdlIGFub3RoZXIgZGlyZWN0b3J5IHRvIGluc3RhbGwsIG9yIHJlbW92ZSAke2NoYWxrLnJlZChub2RlTW9kdWxlKX0sYCArXG4gICAgICAnd2hpY2ggaXMgZ2V0dGluZyB0aGUgaGlnaGVyIHByaW9yaXR5IHRoYW4gbG9hZGluZyBQbGluayBkZXBlbmRlbmN5IGZvciBtb25vcmVwbyBlbnZpcm9ubWVudCcgKTtcblxuICAgIHRocm93IG5ldyBFcnJvcihjaGFsay5yZWQoYEZvdW5kIFwiJHtub2RlTW9kdWxlfVwiIGluIFBsaW5rIENMSSdzIHVwcGVyIGxldmVsIGRpcmVjdG9yeSwgYCArXG4gICAgICAndGhpcyBjb3VsZCBiZSBwcm9ibGVtYXRpYyBmb3IgUGxpbmsgb3IgV2VicGFjayB0byBsb2FkIHByb3BlciBtb2R1bGUuJykpO1xuICB9XG59XG5cblxuaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZSwgdGFyZ2V0LCByZXEsIHJlc29sdmUpID0+IHtcbiAgaWYgKHRhcmdldCA9PT0gJ2xvZzRqcycpIHtcbiAgICByZXR1cm4gbG9nNGpzO1xuICB9XG59KTtcbiJdfQ==