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
const log4js_1 = __importDefault(require("log4js"));
const loaderHooks_1 = require("./loaderHooks");
const node_path_calc_1 = require("./node-path-calc");
const worker_threads_1 = require("worker_threads");
let logPrefix = '';
if (process.send || !worker_threads_1.isMainThread)
    logPrefix += `[P${process.pid}.T${worker_threads_1.threadId}]`;
let envSetDone = false;
if (!envSetDone) {
    envSetDone = true;
    require('source-map-support/register');
    (0, loaderHooks_1.hookCommonJsRequire)((file, target, req, resolve) => {
        if (target === 'log4js') {
            return log4js_1.default;
        }
    });
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
        console.log(chalk_1.default.gray(logPrefix + `Environment variable PLINK_WORK_DIR is set, default workspace is: ${PLINK_WORK_DIR}`));
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
    const pathArray = (0, node_path_calc_1.calcNodePaths)(rootDir, symlinksDir, currDir, plinkDir);
    // process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // process.env.NODE_PRESERVE_SYMLINKS = '1';
    // require('module').Module._initPaths();
    return pathArray;
}
/**
 * Webpack and TS compiler by default will look up node_modules from up level directries,
 * this breaks Plink's way of adding extra node path for Node.js, TS or Webpack, it leads
 * to problematic module loading issue.
 */
function checkUpLevelNodeModules(rootDir) {
    // Go with preserve
    // const dirs = [] as string[];
    // let currDir = rootDir;
    // const {root} = Path.parse(rootDir);
    // do {
    //   currDir = Path.dirname(currDir);
    //   dirs.push(Path.resolve(currDir, 'node_modules'));
    // } while (currDir !== root);
    // const nodeModule = dirs.find(dir => fs.existsSync(dir));
    // if (nodeModule) {
    //   // eslint-disable-next-line no-console
    //   console.log(`Please install in another directory, or remove ${chalk.red(nodeModule)}.\n` +
    //     chalk.yellow('It could be problematic for Plink to manage monorepo dependency (through environmet variable "NODE_PATH" in runtime).\n' +
    //     '(Alternatively, you may consider install whatever "global" dependency with `npm i -g` instead of having directory like ' +
    //     chalk.red(nodeModule) + ')' ) );
    //   throw new Error(chalk.red('Found "node_modules" in upper level directories, ' +
    //     'Installation is cancelled, sorry for inconvienience.'));
    // }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QiwrQ0FBa0Q7QUFDbEQscURBQStDO0FBRS9DLG1EQUFzRDtBQUV0RCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDbkIsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNkJBQVk7SUFDL0IsU0FBUyxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsS0FBSyx5QkFBUSxHQUFHLENBQUM7QUFFaEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBRXZCLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDZixVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3ZDLElBQUEsaUNBQW1CLEVBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7WUFDdkIsT0FBTyxnQkFBTSxDQUFDO1NBQ2Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNIOzs7T0FHRztJQUNILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUUvRixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQ3BDLElBQUksNkJBQVksSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLElB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Q0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO1lBQ3RCLEdBQUcsR0FBRyxPQUFPLENBQUM7WUFDZCxNQUFNO1NBQ1A7UUFDRCxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQ2pCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGFBQWEsQ0FBQyxPQUFlLEVBQUUsT0FBZSxFQUFFLFdBQTBCLEVBQUUsUUFBZ0I7SUFDbkcsTUFBTSxTQUFTLEdBQUcsSUFBQSw4QkFBYSxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3pFLDBEQUEwRDtJQUMxRCw0Q0FBNEM7SUFDNUMseUNBQXlDO0lBQ3pDLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFvQkQ7Ozs7R0FJRztBQUNILFNBQVMsdUJBQXVCLENBQUMsT0FBZTtJQUM5QyxtQkFBbUI7SUFDbkIsK0JBQStCO0lBRS9CLHlCQUF5QjtJQUN6QixzQ0FBc0M7SUFDdEMsT0FBTztJQUNQLHFDQUFxQztJQUNyQyxzREFBc0Q7SUFDdEQsOEJBQThCO0lBRTlCLDJEQUEyRDtJQUMzRCxvQkFBb0I7SUFDcEIsMkNBQTJDO0lBQzNDLCtGQUErRjtJQUMvRiwrSUFBK0k7SUFDL0ksa0lBQWtJO0lBQ2xJLHVDQUF1QztJQUV2QyxvRkFBb0Y7SUFDcEYsZ0VBQWdFO0lBQ2hFLElBQUk7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2hvb2tDb21tb25Kc1JlcXVpcmV9IGZyb20gJy4vbG9hZGVySG9va3MnO1xuaW1wb3J0IHtjYWxjTm9kZVBhdGhzfSBmcm9tICcuL25vZGUtcGF0aC1jYWxjJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcblxubGV0IGxvZ1ByZWZpeCA9ICcnO1xuaWYgKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkKVxuICBsb2dQcmVmaXggKz0gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XWA7XG5cbmxldCBlbnZTZXREb25lID0gZmFsc2U7XG5cbmlmICghZW52U2V0RG9uZSkge1xuICBlbnZTZXREb25lID0gdHJ1ZTtcbiAgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG4gIGhvb2tDb21tb25Kc1JlcXVpcmUoKGZpbGUsIHRhcmdldCwgcmVxLCByZXNvbHZlKSA9PiB7XG4gICAgaWYgKHRhcmdldCA9PT0gJ2xvZzRqcycpIHtcbiAgICAgIHJldHVybiBsb2c0anM7XG4gICAgfVxuICB9KTtcbiAgLyoqIGVudmlyb25tZW50IHZhcmFpYmxlIF9fcGxpbmsgaXMgdXNlZCBmb3Igc2hhcmUgYmFzaWMgUGxpbmsgaW5mb3JtYXRpb24gYmV0d2VlbjpcbiAgICogLSBOb2RlLmpzIFwiLXJcIiBwcmVsb2FkIG1vZHVsZSBhbmQgbm9ybWFsIG1vZHVsZXMsIGVzcGVjaWFsbHkgc2V0dGluZyBOT0RFX1BBVEggaW4gXCItclwiIG1vZHVsZVxuICAgKiAtIE1haW4gcHJvY2VzcyBhbmQgZm9ya2VkIHByb2Nlc3Mgb3IgdGhyZWFkIHdvcmtlclxuICAgKi9cbiAgY29uc3QgZXhpdGluZ0VudlZhciA9IHByb2Nlc3MuZW52Ll9fcGxpbmsgPyBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmspIGFzIFBsaW5rRW52IDogbnVsbDtcblxuICBpZiAoIXByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSB7XG4gICAgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIgPSAnZGlzdCc7XG4gICAgaWYgKGlzTWFpblRocmVhZCB8fCBwcm9jZXNzLnNlbmQgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgJ0J5IGRlZmF1bHQsIFBsaW5rIHJlYWRzIGFuZCB3cml0ZXMgc3RhdGUgZmlsZXMgaW4gZGlyZWN0b3J5IFwiPHJvb3QtZGlyPi9kaXN0XCIsXFxuJyArXG4gICAgICAneW91IG1heSBjaGFuZ2UgaXQgYnknICtcbiAgICAgICcgc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19EQVRBX0RJUiB0byBhbm90aGVyIHJlbGF0aXZlIGRpcmVjdG9yeScpKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdQTElOS19EQVRBX0RJUjogJyArIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKSk7XG4gIH1cbiAgY29uc3QgUExJTktfV09SS19ESVIgPSBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUjtcbiAgaWYgKFBMSU5LX1dPUktfRElSKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArIGBFbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19XT1JLX0RJUiBpcyBzZXQsIGRlZmF1bHQgd29ya3NwYWNlIGlzOiAke1BMSU5LX1dPUktfRElSfWApKTtcbiAgfVxuICBjb25zdCB3b3JrRGlyID0gUExJTktfV09SS19ESVIgPyBQYXRoLnJlc29sdmUoUExJTktfV09SS19ESVIpIDogcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3Qgcm9vdERpciA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLnJvb3REaXIgOiBmaW5kUm9vdERpcihwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiwgd29ya0Rpcik7XG4gIGNoZWNrVXBMZXZlbE5vZGVNb2R1bGVzKHJvb3REaXIpO1xuICAvLyBXZSBjYW4gY2hhbmdlIHRoaXMgcGF0aCB0byBhbm90aGVyIGRpcmVjdG9yeSBsaWtlICcubGlua3MnLFxuICAvLyBpZiB3ZSBkb24ndCB3YW50IG5vZGVfbW9kdWxlcyB0byBiZSBwb2xsdXRlZCBieSBzeW1saW5rcztcbiAgY29uc3Qgc3ltbGlua0Rpck5hbWUgPSBleGl0aW5nRW52VmFyICYmIGV4aXRpbmdFbnZWYXIuc3ltbGlua0Rpck5hbWUgP1xuICAgIGV4aXRpbmdFbnZWYXIuc3ltbGlua0Rpck5hbWUgOiAnbm9kZV9tb2R1bGVzJztcblxuXG4gIGxldCBwbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKTtcbiAgY29uc3QgaXNEcmNwU3ltbGluayA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLmlzRHJjcFN5bWxpbmsgOiBmcy5sc3RhdFN5bmMocGxpbmtEaXIpLmlzU3ltYm9saWNMaW5rKCk7XG4gIGlmIChpc0RyY3BTeW1saW5rKVxuICAgIHBsaW5rRGlyID0gZnMucmVhbHBhdGhTeW5jKHBsaW5rRGlyKTtcbiAgY29uc3Qgbm9kZVBhdGggPSBzZXR1cE5vZGVQYXRoKHdvcmtEaXIsIHJvb3REaXIsXG4gICAgZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoc3ltbGlua0Rpck5hbWUpKSA/IFBhdGgucmVzb2x2ZShzeW1saW5rRGlyTmFtZSkgOiBudWxsLFxuICAgIHBsaW5rRGlyKTtcbiAgY29uc3QgZGlzdERpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUik7XG4gIHByb2Nlc3MuZW52Ll9fcGxpbmsgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgd29ya0RpciwgZGlzdERpciwgaXNEcmNwU3ltbGluaywgcm9vdERpciwgc3ltbGlua0Rpck5hbWUsIG5vZGVQYXRoLCBwbGlua0Rpcn0gYXMgUGxpbmtFbnYpO1xuXG4gIC8vIGRlbGV0ZSByZWdpc3RlciBmcm9tIGNvbW1hbmQgbGluZSBvcHRpb24sIHRvIGF2b2lkIGNoaWxkIHByb2Nlc3MgZ2V0IHRoaXMgb3B0aW9uLCBzaW5jZSB3ZSBoYXZlIE5PREVfUEFUSCBzZXRcbiAgLy8gZm9yIGNoaWxkIHByb2Nlc3NcbiAgY29uc3QgZGVsZXRlRXhlY0FyZ0lkeDogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwcm9jZXNzLmV4ZWNBcmd2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpIDwgbCAtIDEgJiYgL14oPzotcnwtLXJlcXVpcmUpJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2ldKSAmJlxuICAgICAgL15Ad2ZoXFwvcGxpbmtcXC9yZWdpc3RlciQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpICsgMV0pKSB7XG4gICAgICBkZWxldGVFeGVjQXJnSWR4LnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGRlbGV0ZUV4ZWNBcmdJZHgucmVkdWNlKChvZmZzZXQsIGRlbGV0ZUlkeCkgPT4ge1xuICAgIHByb2Nlc3MuZXhlY0FyZ3Yuc3BsaWNlKGRlbGV0ZUlkeCArIG9mZnNldCwgMik7XG4gICAgcmV0dXJuIG9mZnNldCArIDI7XG4gIH0sIDApO1xuXG4gIGNvbnN0IGVudk9wdGlvbnMgPSBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPyBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4gIHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA9XG4gICAgZW52T3B0aW9ucy5maWx0ZXIoaXRlbSA9PiAhLygtcnwtLXJlcXVpcmUpXFxzK0B3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyLy50ZXN0KGl0ZW0pKS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuZnVuY3Rpb24gZmluZFJvb3REaXIoZGlzdERpcjogc3RyaW5nLCBjdXJyRGlyOiBzdHJpbmcpIHtcbiAgbGV0IGRpciA9IFBhdGgucmVzb2x2ZShjdXJyRGlyKTtcbiAgY29uc3Qge3Jvb3R9ID0gUGF0aC5wYXJzZShkaXIpO1xuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGRpciwgZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSByb290KSB7XG4gICAgICBkaXIgPSBjdXJyRGlyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRpciA9IHBhcmVudERpcjtcbiAgfVxuICByZXR1cm4gZGlyO1xufVxuXG4vKipcbiAqIGlmIGN3ZCBpcyBub3Qgcm9vdCBkaXJlY3RvcnksIHRoZW4gYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxjd2Q+L25vZGVfbW9kdWxlczo8cm9vdERpcj4vc3ltbGlua3MsXG4gKiBvdGhlcndpc2UgYXBwZW5kIE5PREVfUEFUSCB3aXRoIDxyb290RGlyPi9ub2RlX21vZHVsZXNcbiAqIEBwYXJhbSByb290RGlyIFxuICogQHBhcmFtIGlzRHJjcFN5bWxpbmsgXG4gKi9cbmZ1bmN0aW9uIHNldHVwTm9kZVBhdGgoY3VyckRpcjogc3RyaW5nLCByb290RGlyOiBzdHJpbmcsIHN5bWxpbmtzRGlyOiBzdHJpbmcgfCBudWxsLCBwbGlua0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHBhdGhBcnJheSA9IGNhbGNOb2RlUGF0aHMocm9vdERpciwgc3ltbGlua3NEaXIsIGN1cnJEaXIsIHBsaW5rRGlyKTtcbiAgLy8gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyBwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTID0gJzEnO1xuICAvLyByZXF1aXJlKCdtb2R1bGUnKS5Nb2R1bGUuX2luaXRQYXRocygpO1xuICByZXR1cm4gcGF0aEFycmF5O1xufVxuXG4vKipcbiAqIEdldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJlZGVmaW5lZCBieVxuYGBgXG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxpbmtFbnYge1xuICBkaXN0RGlyOiBzdHJpbmc7XG4gIC8qKiB3aGV0aGVyIFBsaW5rIGlzIGEgc3ltbGluaywgRHJjcCBpcyBvbGQgbmFtZSBvZiBQbGluayAqL1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICByb290RGlyOiBzdHJpbmc7XG4gIC8qKiBjdXJyZW50IHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yeSAqL1xuICB3b3JrRGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXJOYW1lOiBzdHJpbmcgfCAnbm9kZV9tb2R1bGVzJztcbiAgbm9kZVBhdGg6IHN0cmluZ1tdO1xuICBwbGlua0Rpcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIFdlYnBhY2sgYW5kIFRTIGNvbXBpbGVyIGJ5IGRlZmF1bHQgd2lsbCBsb29rIHVwIG5vZGVfbW9kdWxlcyBmcm9tIHVwIGxldmVsIGRpcmVjdHJpZXMsXG4gKiB0aGlzIGJyZWFrcyBQbGluaydzIHdheSBvZiBhZGRpbmcgZXh0cmEgbm9kZSBwYXRoIGZvciBOb2RlLmpzLCBUUyBvciBXZWJwYWNrLCBpdCBsZWFkc1xuICogdG8gcHJvYmxlbWF0aWMgbW9kdWxlIGxvYWRpbmcgaXNzdWUuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrVXBMZXZlbE5vZGVNb2R1bGVzKHJvb3REaXI6IHN0cmluZykge1xuICAvLyBHbyB3aXRoIHByZXNlcnZlXG4gIC8vIGNvbnN0IGRpcnMgPSBbXSBhcyBzdHJpbmdbXTtcblxuICAvLyBsZXQgY3VyckRpciA9IHJvb3REaXI7XG4gIC8vIGNvbnN0IHtyb290fSA9IFBhdGgucGFyc2Uocm9vdERpcik7XG4gIC8vIGRvIHtcbiAgLy8gICBjdXJyRGlyID0gUGF0aC5kaXJuYW1lKGN1cnJEaXIpO1xuICAvLyAgIGRpcnMucHVzaChQYXRoLnJlc29sdmUoY3VyckRpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgLy8gfSB3aGlsZSAoY3VyckRpciAhPT0gcm9vdCk7XG5cbiAgLy8gY29uc3Qgbm9kZU1vZHVsZSA9IGRpcnMuZmluZChkaXIgPT4gZnMuZXhpc3RzU3luYyhkaXIpKTtcbiAgLy8gaWYgKG5vZGVNb2R1bGUpIHtcbiAgLy8gICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAvLyAgIGNvbnNvbGUubG9nKGBQbGVhc2UgaW5zdGFsbCBpbiBhbm90aGVyIGRpcmVjdG9yeSwgb3IgcmVtb3ZlICR7Y2hhbGsucmVkKG5vZGVNb2R1bGUpfS5cXG5gICtcbiAgLy8gICAgIGNoYWxrLnllbGxvdygnSXQgY291bGQgYmUgcHJvYmxlbWF0aWMgZm9yIFBsaW5rIHRvIG1hbmFnZSBtb25vcmVwbyBkZXBlbmRlbmN5ICh0aHJvdWdoIGVudmlyb25tZXQgdmFyaWFibGUgXCJOT0RFX1BBVEhcIiBpbiBydW50aW1lKS5cXG4nICtcbiAgLy8gICAgICcoQWx0ZXJuYXRpdmVseSwgeW91IG1heSBjb25zaWRlciBpbnN0YWxsIHdoYXRldmVyIFwiZ2xvYmFsXCIgZGVwZW5kZW5jeSB3aXRoIGBucG0gaSAtZ2AgaW5zdGVhZCBvZiBoYXZpbmcgZGlyZWN0b3J5IGxpa2UgJyArXG4gIC8vICAgICBjaGFsay5yZWQobm9kZU1vZHVsZSkgKyAnKScgKSApO1xuXG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKGNoYWxrLnJlZCgnRm91bmQgXCJub2RlX21vZHVsZXNcIiBpbiB1cHBlciBsZXZlbCBkaXJlY3RvcmllcywgJyArXG4gIC8vICAgICAnSW5zdGFsbGF0aW9uIGlzIGNhbmNlbGxlZCwgc29ycnkgZm9yIGluY29udmllbmllbmNlLicpKTtcbiAgLy8gfVxufVxuXG5cblxuIl19