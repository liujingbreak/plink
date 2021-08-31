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
    do {
        currDir = Path.dirname(currDir);
        dirs.push(Path.resolve(currDir, 'node_modules'));
    } while (currDir !== root);
    const nodeModule = dirs.find(dir => fs.existsSync(dir));
    if (nodeModule) {
        // eslint-disable-next-line no-console
        console.log(`Please install in another directory, or remove ${chalk_1.default.red(nodeModule)}.\n` +
            chalk_1.default.yellow('It could be problematic for Plink to manage monorepo dependency (through environmet variable "NODE_PATH" in runtime).\n' +
                '(Alternatively, you may consider install whatever "global" dependency with `npm i -g` instead of having directory like ' +
                chalk_1.default.red(nodeModule) + ')'));
        throw new Error(chalk_1.default.red('Found "node_modules" in upper level directories, ' +
            'Installation is cancelled, sorry for inconvienience.'));
    }
}
loaderHooks_1.hookCommonJsRequire((file, target, req, resolve) => {
    if (target === 'log4js') {
        return log4js_1.default;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsK0NBQWtEO0FBQ2xELG9EQUF1QjtBQUN2QixtREFBNEM7QUFFNUMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLElBQUksT0FBTyxDQUFDLElBQUk7SUFDZCxTQUFTLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQzdDLElBQUksQ0FBQyw2QkFBWTtJQUNwQixTQUFTLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUVyQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDbEIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFdkM7OztPQUdHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDcEMsSUFBSSw2QkFBWSxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ3hDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLGtGQUFrRjtnQkFDckgsc0JBQXNCO2dCQUN0Qiw0RUFB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QUcsQ0FBQyxtREFBbUQ7WUFDM0Usc0RBQXNELENBQUMsQ0FBQyxDQUFDO0tBQzVEO0FBQ0gsQ0FBQztBQUdELGlDQUFtQixDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDakQsSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFO1FBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztLQUNmO0FBQ0gsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7aG9va0NvbW1vbkpzUmVxdWlyZX0gZnJvbSAnLi9sb2FkZXJIb29rcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtpc01haW5UaHJlYWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcblxubGV0IGxvZ1ByZWZpeCA9ICc+ICc7XG5pZiAocHJvY2Vzcy5zZW5kKVxuICBsb2dQcmVmaXggPSBgW3BpZDogJHtwcm9jZXNzLnBpZH1dYCArIGxvZ1ByZWZpeDtcbmVsc2UgaWYgKCFpc01haW5UaHJlYWQpXG4gIGxvZ1ByZWZpeCA9ICdbdGhyZWFkXScgKyBsb2dQcmVmaXg7XG5cbmxldCBlbnZTZXREb25lID0gZmFsc2U7XG5cbmlmICghZW52U2V0RG9uZSkge1xuICBlbnZTZXREb25lID0gdHJ1ZTtcbiAgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG5cbiAgLyoqIGVudmlyb25tZW50IHZhcmFpYmxlIF9fcGxpbmsgaXMgdXNlZCBmb3Igc2hhcmUgYmFzaWMgUGxpbmsgaW5mb3JtYXRpb24gYmV0d2VlbjpcbiAgICogLSBOb2RlLmpzIFwiLXJcIiBwcmVsb2FkIG1vZHVsZSBhbmQgbm9ybWFsIG1vZHVsZXMsIGVzcGVjaWFsbHkgc2V0dGluZyBOT0RFX1BBVEggaW4gXCItclwiIG1vZHVsZVxuICAgKiAtIE1haW4gcHJvY2VzcyBhbmQgZm9ya2VkIHByb2Nlc3Mgb3IgdGhyZWFkIHdvcmtlclxuICAgKi9cbiAgY29uc3QgZXhpdGluZ0VudlZhciA9IHByb2Nlc3MuZW52Ll9fcGxpbmsgPyBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmspIGFzIFBsaW5rRW52IDogbnVsbDtcblxuICBpZiAoIXByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSB7XG4gICAgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIgPSAnZGlzdCc7XG4gICAgaWYgKGlzTWFpblRocmVhZCB8fCBwcm9jZXNzLnNlbmQgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgJ0J5IGRlZmF1bHQsIFBsaW5rIHJlYWRzIGFuZCB3cml0ZXMgc3RhdGUgZmlsZXMgaW4gZGlyZWN0b3J5IFwiPHJvb3QtZGlyPi9kaXN0XCIsXFxuJyArXG4gICAgICAneW91IG1heSBjaGFuZ2UgaXQgYnknICtcbiAgICAgICcgc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19EQVRBX0RJUiB0byBhbm90aGVyIHJlbGF0aXZlIGRpcmVjdG9yeScpKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdQTElOS19EQVRBX0RJUjogJyArIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSk7XG4gIH1cbiAgY29uc3QgUExJTktfV09SS19ESVIgPSBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUjtcbiAgaWYgKFBMSU5LX1dPUktfRElSKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhsb2dQcmVmaXggKyBgRW52aXJvbm1lbnQgdmFyaWFibGUgUExJTktfV09SS19ESVIgaXMgc2V0LCBkZWZhdWx0IHdvcmtzcGFjZSBpczogJHtQTElOS19XT1JLX0RJUn1gKTtcbiAgfVxuICBjb25zdCB3b3JrRGlyID0gUExJTktfV09SS19ESVIgPyBQYXRoLnJlc29sdmUoUExJTktfV09SS19ESVIpIDogcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3Qgcm9vdERpciA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLnJvb3REaXIgOiBmaW5kUm9vdERpcihwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiwgd29ya0Rpcik7XG4gIGNoZWNrVXBMZXZlbE5vZGVNb2R1bGVzKHJvb3REaXIpO1xuICAvLyBXZSBjYW4gY2hhbmdlIHRoaXMgcGF0aCB0byBhbm90aGVyIGRpcmVjdG9yeSBsaWtlICcubGlua3MnLFxuICAvLyBpZiB3ZSBkb24ndCB3YW50IG5vZGVfbW9kdWxlcyB0byBiZSBwb2xsdXRlZCBieSBzeW1saW5rcztcbiAgY29uc3Qgc3ltbGlua0Rpck5hbWUgPSBleGl0aW5nRW52VmFyICYmIGV4aXRpbmdFbnZWYXIuc3ltbGlua0Rpck5hbWUgP1xuICAgIGV4aXRpbmdFbnZWYXIuc3ltbGlua0Rpck5hbWUgOiAnbm9kZV9tb2R1bGVzJztcblxuXG4gIGxldCBwbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKTtcbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLmlzRHJjcFN5bWxpbmsgOiBmcy5sc3RhdFN5bmMocGxpbmtEaXIpLmlzU3ltYm9saWNMaW5rKCk7XG4gIGlmIChpc0RyY3BTeW1saW5rKVxuICAgIHBsaW5rRGlyID0gZnMucmVhbHBhdGhTeW5jKHBsaW5rRGlyKTtcbiAgY29uc3Qgbm9kZVBhdGggPSBzZXR1cE5vZGVQYXRoKHdvcmtEaXIsIHJvb3REaXIsXG4gICAgZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoc3ltbGlua0Rpck5hbWUpKSA/IFBhdGgucmVzb2x2ZShzeW1saW5rRGlyTmFtZSkgOiBudWxsLFxuICAgIHBsaW5rRGlyKTtcbiAgY29uc3QgZGlzdERpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUik7XG4gIHByb2Nlc3MuZW52Ll9fcGxpbmsgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgd29ya0RpciwgZGlzdERpciwgaXNEcmNwU3ltbGluaywgcm9vdERpciwgc3ltbGlua0Rpck5hbWUsIG5vZGVQYXRoLCBwbGlua0Rpcn0gYXMgUGxpbmtFbnYpO1xuXG4gIC8vIGRlbGV0ZSByZWdpc3RlciBmcm9tIGNvbW1hbmQgbGluZSBvcHRpb24sIHRvIGF2b2lkIGNoaWxkIHByb2Nlc3MgZ2V0IHRoaXMgb3B0aW9uLCBzaW5jZSB3ZSBoYXZlIE5PREVfUEFUSCBzZXRcbiAgLy8gZm9yIGNoaWxkIHByb2Nlc3NcbiAgY29uc3QgZGVsZXRlRXhlY0FyZ0lkeDogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwcm9jZXNzLmV4ZWNBcmd2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpIDwgbCAtIDEgJiYgL14oPzotcnwtLXJlcXVpcmUpJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2ldKSAmJlxuICAgICAgL15Ad2ZoXFwvcGxpbmtcXC9yZWdpc3RlciQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpICsgMV0pKSB7XG4gICAgICBkZWxldGVFeGVjQXJnSWR4LnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGRlbGV0ZUV4ZWNBcmdJZHgucmVkdWNlKChvZmZzZXQsIGRlbGV0ZUlkeCkgPT4ge1xuICAgIHByb2Nlc3MuZXhlY0FyZ3Yuc3BsaWNlKGRlbGV0ZUlkeCArIG9mZnNldCwgMik7XG4gICAgcmV0dXJuIG9mZnNldCArIDI7XG4gIH0sIDApO1xuXG4gIGNvbnN0IGVudk9wdGlvbnMgPSBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPyBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4gIHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA9XG4gICAgZW52T3B0aW9ucy5maWx0ZXIoaXRlbSA9PiAhLygtcnwtLXJlcXVpcmUpXFxzK0B3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyLy50ZXN0KGl0ZW0pKS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuZnVuY3Rpb24gZmluZFJvb3REaXIoZGlzdERpcjogc3RyaW5nLCBjdXJyRGlyOiBzdHJpbmcpIHtcbiAgbGV0IGRpciA9IFBhdGgucmVzb2x2ZShjdXJyRGlyKTtcbiAgY29uc3Qge3Jvb3R9ID0gUGF0aC5wYXJzZShkaXIpO1xuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGRpciwgZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSByb290KSB7XG4gICAgICBkaXIgPSBjdXJyRGlyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IHBhcmVudERpcjtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vKipcbiAqIGlmIGN3ZCBpcyBub3Qgcm9vdCBkaXJlY3RvcnksIHRoZW4gYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxjd2Q+L25vZGVfbW9kdWxlczo8cm9vdERpcj4vc3ltbGlua3MsXG4gKiBvdGhlcndpc2UgYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxyb290RGlyPi9ub2RlX21vZHVsZXNcbiAqIEBwYXJhbSByb290RGlyIFxuICogQHBhcmFtIGlzRHJjcFN5bWxpbmsgXG4gKi9cbmZ1bmN0aW9uIHNldHVwTm9kZVBhdGgoY3VyckRpcjogc3RyaW5nLCByb290RGlyOiBzdHJpbmcsIHN5bWxpbmtzRGlyOiBzdHJpbmcgfCBudWxsLCBwbGlua0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHBhdGhBcnJheSA9IGNhbGNOb2RlUGF0aHMocm9vdERpciwgc3ltbGlua3NEaXIsIGN1cnJEaXIsIHBsaW5rRGlyKTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdOT0RFX1BBVEgnLCBwcm9jZXNzLmVudi5OT0RFX1BBVEgpKTtcbiAgcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbiAgcmV0dXJuIHBhdGhBcnJheTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNOb2RlUGF0aHMocm9vdERpcjogc3RyaW5nLCBzeW1saW5rc0Rpcjogc3RyaW5nIHwgbnVsbCwgY3dkOiBzdHJpbmcsIHBsaW5rRGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IFtQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXTtcbiAgaWYgKHN5bWxpbmtzRGlyKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoc3ltbGlua3NEaXIpO1xuICB9XG4gIGlmIChyb290RGlyICE9PSBjd2QpIHtcbiAgICBub2RlUGF0aHMudW5zaGlmdChQYXRoLnJlc29sdmUoY3dkLCAnbm9kZV9tb2R1bGVzJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNvbWVob3cgd2hlbiBJIGluc3RhbGwgQHdmaC9wbGluayBpbiBhbiBuZXcgZGlyZWN0b3J5LCBucG0gZG9lcyBub3QgZGVkdXBlIGRlcGVuZGVuY2llcyBmcm9tIFxuICAgKiBAd2ZoL3BsaW5rL25vZGVfbW9kdWxlcyBkaXJlY3RvcnkgdXAgdG8gY3VycmVudCBub2RlX21vZHVsZXMgZGlyZWN0b3J5LCByZXN1bHRzIGluIE1PRFVMRV9OT1RfRk9VTkRcbiAgICogZnJvbSBAd2ZoL3BsaW5rL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZSBmb3Igcnhqc1xuICAgKi9cbiAgbm9kZVBhdGhzLnB1c2gocGxpbmtEaXIgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMucHVzaChwYXRoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gXy51bmlxKG5vZGVQYXRocyk7XG59XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBwcmVkZWZpbmVkIGJ5XG5gYGBcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5gYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGlua0VudiB7XG4gIGRpc3REaXI6IHN0cmluZztcbiAgLyoqIHdoZXRoZXIgUGxpbmsgaXMgYSBzeW1saW5rLCBEcmNwIGlzIG9sZCBuYW1lIG9mIFBsaW5rICovXG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIHJvb3REaXI6IHN0cmluZztcbiAgLyoqIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UgZGlyZWN0b3J5ICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpck5hbWU6IHN0cmluZyB8ICdub2RlX21vZHVsZXMnO1xuICBub2RlUGF0aDogc3RyaW5nW107XG4gIHBsaW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogV2VicGFjayBhbmQgVFMgY29tcGlsZXIgYnkgZGVmYXVsdCB3aWxsIGxvb2sgdXAgbm9kZV9tb2R1bGVzIGZyb20gdXAgbGV2ZWwgZGlyZWN0cmllcyxcbiAqIHRoaXMgYnJlYWtzIFBsaW5rJ3Mgd2F5IG9mIGFkZGluZyBleHRyYSBub2RlIHBhdGggZm9yIE5vZGUuanMsIFRTIG9yIFdlYnBhY2ssIGl0IGxlYWRzXG4gKiB0byBwcm9ibGVtYXRpYyBtb2R1bGUgbG9hZGluZyBpc3N1ZS5cbiAqL1xuZnVuY3Rpb24gY2hlY2tVcExldmVsTm9kZU1vZHVsZXMocm9vdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcblxuICBsZXQgY3VyckRpciA9IHJvb3REaXI7XG4gIGNvbnN0IHtyb290fSA9IFBhdGgucGFyc2Uocm9vdERpcik7XG4gIGRvIHtcbiAgICBjdXJyRGlyID0gUGF0aC5kaXJuYW1lKGN1cnJEaXIpO1xuICAgIGRpcnMucHVzaChQYXRoLnJlc29sdmUoY3VyckRpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgfSB3aGlsZSAoY3VyckRpciAhPT0gcm9vdCk7XG5cbiAgY29uc3Qgbm9kZU1vZHVsZSA9IGRpcnMuZmluZChkaXIgPT4gZnMuZXhpc3RzU3luYyhkaXIpKTtcbiAgaWYgKG5vZGVNb2R1bGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBQbGVhc2UgaW5zdGFsbCBpbiBhbm90aGVyIGRpcmVjdG9yeSwgb3IgcmVtb3ZlICR7Y2hhbGsucmVkKG5vZGVNb2R1bGUpfS5cXG5gICtcbiAgICAgIGNoYWxrLnllbGxvdygnSXQgY291bGQgYmUgcHJvYmxlbWF0aWMgZm9yIFBsaW5rIHRvIG1hbmFnZSBtb25vcmVwbyBkZXBlbmRlbmN5ICh0aHJvdWdoIGVudmlyb25tZXQgdmFyaWFibGUgXCJOT0RFX1BBVEhcIiBpbiBydW50aW1lKS5cXG4nICtcbiAgICAgICcoQWx0ZXJuYXRpdmVseSwgeW91IG1heSBjb25zaWRlciBpbnN0YWxsIHdoYXRldmVyIFwiZ2xvYmFsXCIgZGVwZW5kZW5jeSB3aXRoIGBucG0gaSAtZ2AgaW5zdGVhZCBvZiBoYXZpbmcgZGlyZWN0b3J5IGxpa2UgJyArXG4gICAgICBjaGFsay5yZWQobm9kZU1vZHVsZSkgKyAnKScgKSApO1xuXG4gICAgdGhyb3cgbmV3IEVycm9yKGNoYWxrLnJlZCgnRm91bmQgXCJub2RlX21vZHVsZXNcIiBpbiB1cHBlciBsZXZlbCBkaXJlY3RvcmllcywgJyArXG4gICAgICAnSW5zdGFsbGF0aW9uIGlzIGNhbmNlbGxlZCwgc29ycnkgZm9yIGluY29udmllbmllbmNlLicpKTtcbiAgfVxufVxuXG5cbmhvb2tDb21tb25Kc1JlcXVpcmUoKGZpbGUsIHRhcmdldCwgcmVxLCByZXNvbHZlKSA9PiB7XG4gIGlmICh0YXJnZXQgPT09ICdsb2c0anMnKSB7XG4gICAgcmV0dXJuIGxvZzRqcztcbiAgfVxufSk7XG4iXX0=