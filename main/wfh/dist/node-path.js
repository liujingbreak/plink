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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QiwrQ0FBa0Q7QUFDbEQscURBQStDO0FBRS9DLG1EQUFzRDtBQUV0RCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDbkIsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNkJBQVk7SUFDL0IsU0FBUyxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsS0FBSyx5QkFBUSxHQUFHLENBQUM7QUFFaEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBRXZCLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDZixVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3ZDLElBQUEsaUNBQW1CLEVBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7WUFDdkIsT0FBTyxnQkFBTSxDQUFDO1NBQ2Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNIOzs7T0FHRztJQUNILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUUvRixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQ3BDLElBQUksNkJBQVksSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLElB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Q0FBQztRQUNwQyxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsR0FBRyxHQUFHLE9BQU8sQ0FBQztZQUNkLE1BQU07U0FDUDtRQUNELEdBQUcsR0FBRyxTQUFTLENBQUM7S0FDakI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsYUFBYSxDQUFDLE9BQWUsRUFBRSxPQUFlLEVBQUUsV0FBMEIsRUFBRSxRQUFnQjtJQUNuRyxNQUFNLFNBQVMsR0FBRyxJQUFBLDhCQUFhLEVBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekUsMERBQTBEO0lBQzFELDRDQUE0QztJQUM1Qyx5Q0FBeUM7SUFDekMsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQW9CRDs7OztHQUlHO0FBQ0gsU0FBUyx1QkFBdUIsQ0FBQyxPQUFlO0lBQzlDLG1CQUFtQjtJQUNuQiwrQkFBK0I7SUFFL0IseUJBQXlCO0lBQ3pCLHNDQUFzQztJQUN0QyxPQUFPO0lBQ1AscUNBQXFDO0lBQ3JDLHNEQUFzRDtJQUN0RCw4QkFBOEI7SUFFOUIsMkRBQTJEO0lBQzNELG9CQUFvQjtJQUNwQiwyQ0FBMkM7SUFDM0MsK0ZBQStGO0lBQy9GLCtJQUErSTtJQUMvSSxrSUFBa0k7SUFDbEksdUNBQXVDO0lBRXZDLG9GQUFvRjtJQUNwRixnRUFBZ0U7SUFDaEUsSUFBSTtBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7aG9va0NvbW1vbkpzUmVxdWlyZX0gZnJvbSAnLi9sb2FkZXJIb29rcyc7XG5pbXBvcnQge2NhbGNOb2RlUGF0aHN9IGZyb20gJy4vbm9kZS1wYXRoLWNhbGMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aXNNYWluVGhyZWFkLCB0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5sZXQgbG9nUHJlZml4ID0gJyc7XG5pZiAocHJvY2Vzcy5zZW5kIHx8ICFpc01haW5UaHJlYWQpXG4gIGxvZ1ByZWZpeCArPSBgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dYDtcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcbiAgaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZSwgdGFyZ2V0LCByZXEsIHJlc29sdmUpID0+IHtcbiAgICBpZiAodGFyZ2V0ID09PSAnbG9nNGpzJykge1xuICAgICAgcmV0dXJuIGxvZzRqcztcbiAgICB9XG4gIH0pO1xuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmICghcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpIHtcbiAgICBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9ICdkaXN0JztcbiAgICBpZiAoaXNNYWluVGhyZWFkIHx8IHByb2Nlc3Muc2VuZCA9PSBudWxsKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnQnkgZGVmYXVsdCwgUGxpbmsgcmVhZHMgYW5kIHdyaXRlcyBzdGF0ZSBmaWxlcyBpbiBkaXJlY3RvcnkgXCI8cm9vdC1kaXI+L2Rpc3RcIixcXG4nICtcbiAgICAgICd5b3UgbWF5IGNoYW5nZSBpdCBieScgK1xuICAgICAgJyBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlIFBMSU5LX0RBVEFfRElSIHRvIGFub3RoZXIgcmVsYXRpdmUgZGlyZWN0b3J5JykpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgJ1BMSU5LX0RBVEFfRElSOiAnICsgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpKTtcbiAgfVxuICBjb25zdCBQTElOS19XT1JLX0RJUiA9IHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSO1xuICBpZiAoUExJTktfV09SS19ESVIpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGxvZ1ByZWZpeCArIGBFbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19XT1JLX0RJUiBpcyBzZXQsIGRlZmF1bHQgd29ya3NwYWNlIGlzOiAke1BMSU5LX1dPUktfRElSfWApO1xuICB9XG4gIGNvbnN0IHdvcmtEaXIgPSBQTElOS19XT1JLX0RJUiA/IFBhdGgucmVzb2x2ZShQTElOS19XT1JLX0RJUikgOiBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCByb290RGlyID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIucm9vdERpciA6IGZpbmRSb290RGlyKHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSLCB3b3JrRGlyKTtcbiAgY2hlY2tVcExldmVsTm9kZU1vZHVsZXMocm9vdERpcik7XG4gIC8vIFdlIGNhbiBjaGFuZ2UgdGhpcyBwYXRoIHRvIGFub3RoZXIgZGlyZWN0b3J5IGxpa2UgJy5saW5rcycsXG4gIC8vIGlmIHdlIGRvbid0IHdhbnQgbm9kZV9tb2R1bGVzIHRvIGJlIHBvbGx1dGVkIGJ5IHN5bWxpbmtzO1xuICBjb25zdCBzeW1saW5rRGlyTmFtZSA9IGV4aXRpbmdFbnZWYXIgJiYgZXhpdGluZ0VudlZhci5zeW1saW5rRGlyTmFtZSA/XG4gICAgZXhpdGluZ0VudlZhci5zeW1saW5rRGlyTmFtZSA6ICdub2RlX21vZHVsZXMnO1xuXG5cbiAgbGV0IHBsaW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpO1xuICBjb25zdCBpc0RyY3BTeW1saW5rID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIuaXNEcmNwU3ltbGluayA6IGZzLmxzdGF0U3luYyhwbGlua0RpcikuaXNTeW1ib2xpY0xpbmsoKTtcbiAgaWYgKGlzRHJjcFN5bWxpbmspXG4gICAgcGxpbmtEaXIgPSBmcy5yZWFscGF0aFN5bmMocGxpbmtEaXIpO1xuICBjb25zdCBub2RlUGF0aCA9IHNldHVwTm9kZVBhdGgod29ya0Rpciwgcm9vdERpcixcbiAgICBmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShzeW1saW5rRGlyTmFtZSkpID8gUGF0aC5yZXNvbHZlKHN5bWxpbmtEaXJOYW1lKSA6IG51bGwsXG4gICAgcGxpbmtEaXIpO1xuICBjb25zdCBkaXN0RGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKTtcbiAgcHJvY2Vzcy5lbnYuX19wbGluayA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICB3b3JrRGlyLCBkaXN0RGlyLCBpc0RyY3BTeW1saW5rLCByb290RGlyLCBzeW1saW5rRGlyTmFtZSwgbm9kZVBhdGgsIHBsaW5rRGlyfSBhcyBQbGlua0Vudik7XG5cbiAgLy8gZGVsZXRlIHJlZ2lzdGVyIGZyb20gY29tbWFuZCBsaW5lIG9wdGlvbiwgdG8gYXZvaWQgY2hpbGQgcHJvY2VzcyBnZXQgdGhpcyBvcHRpb24sIHNpbmNlIHdlIGhhdmUgTk9ERV9QQVRIIHNldFxuICAvLyBmb3IgY2hpbGQgcHJvY2Vzc1xuICBjb25zdCBkZWxldGVFeGVjQXJnSWR4OiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGkgPCBsIC0gMSAmJiAvXig/Oi1yfC0tcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gICAgICAvXkB3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgICB9XG4gIH1cbiAgZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gICAgcHJvY2Vzcy5leGVjQXJndi5zcGxpY2UoZGVsZXRlSWR4ICsgb2Zmc2V0LCAyKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfSwgMCk7XG5cbiAgY29uc3QgZW52T3B0aW9ucyA9IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA/IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUy5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID1cbiAgICBlbnZPcHRpb25zLmZpbHRlcihpdGVtID0+ICEvKC1yfC0tcmVxdWlyZSlcXHMrQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIvLnRlc3QoaXRlbSkpLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcihkaXN0RGlyOiBzdHJpbmcsIGN1cnJEaXI6IHN0cmluZykge1xuICBsZXQgZGlyID0gUGF0aC5yZXNvbHZlKGN1cnJEaXIpO1xuICBjb25zdCB7cm9vdH0gPSBQYXRoLnBhcnNlKGRpcik7XG4gIHdoaWxlICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZGlyLCBkaXN0RGlyLCAncGxpbmstc3RhdGUuanNvbicpKSkge1xuICAgIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICAgIGlmIChwYXJlbnREaXIgPT09IHJvb3QpIHtcbiAgICAgIGRpciA9IGN1cnJEaXI7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8qKlxuICogaWYgY3dkIGlzIG5vdCByb290IGRpcmVjdG9yeSwgdGhlbiBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPGN3ZD4vbm9kZV9tb2R1bGVzOjxyb290RGlyPi9zeW1saW5rcyxcbiAqIG90aGVyd2lzZSBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPHJvb3REaXI+L25vZGVfbW9kdWxlc1xuICogQHBhcmFtIHJvb3REaXIgXG4gKiBAcGFyYW0gaXNEcmNwU3ltbGluayBcbiAqL1xuZnVuY3Rpb24gc2V0dXBOb2RlUGF0aChjdXJyRGlyOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgc3ltbGlua3NEaXI6IHN0cmluZyB8IG51bGwsIHBsaW5rRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgcGF0aEFycmF5ID0gY2FsY05vZGVQYXRocyhyb290RGlyLCBzeW1saW5rc0RpciwgY3VyckRpciwgcGxpbmtEaXIpO1xuICAvLyBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBwYXRoQXJyYXkuam9pbihQYXRoLmRlbGltaXRlcik7XG4gIC8vIHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgPSAnMSc7XG4gIC8vIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBwcmVkZWZpbmVkIGJ5XG5gYGBcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5gYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGlua0VudiB7XG4gIGRpc3REaXI6IHN0cmluZztcbiAgLyoqIHdoZXRoZXIgUGxpbmsgaXMgYSBzeW1saW5rLCBEcmNwIGlzIG9sZCBuYW1lIG9mIFBsaW5rICovXG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIHJvb3REaXI6IHN0cmluZztcbiAgLyoqIGN1cnJlbnQgd29ya3RyZWUgc3BhY2UgZGlyZWN0b3J5ICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgc3ltbGlua0Rpck5hbWU6IHN0cmluZyB8ICdub2RlX21vZHVsZXMnO1xuICBub2RlUGF0aDogc3RyaW5nW107XG4gIHBsaW5rRGlyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogV2VicGFjayBhbmQgVFMgY29tcGlsZXIgYnkgZGVmYXVsdCB3aWxsIGxvb2sgdXAgbm9kZV9tb2R1bGVzIGZyb20gdXAgbGV2ZWwgZGlyZWN0cmllcyxcbiAqIHRoaXMgYnJlYWtzIFBsaW5rJ3Mgd2F5IG9mIGFkZGluZyBleHRyYSBub2RlIHBhdGggZm9yIE5vZGUuanMsIFRTIG9yIFdlYnBhY2ssIGl0IGxlYWRzXG4gKiB0byBwcm9ibGVtYXRpYyBtb2R1bGUgbG9hZGluZyBpc3N1ZS5cbiAqL1xuZnVuY3Rpb24gY2hlY2tVcExldmVsTm9kZU1vZHVsZXMocm9vdERpcjogc3RyaW5nKSB7XG4gIC8vIEdvIHdpdGggcHJlc2VydmVcbiAgLy8gY29uc3QgZGlycyA9IFtdIGFzIHN0cmluZ1tdO1xuXG4gIC8vIGxldCBjdXJyRGlyID0gcm9vdERpcjtcbiAgLy8gY29uc3Qge3Jvb3R9ID0gUGF0aC5wYXJzZShyb290RGlyKTtcbiAgLy8gZG8ge1xuICAvLyAgIGN1cnJEaXIgPSBQYXRoLmRpcm5hbWUoY3VyckRpcik7XG4gIC8vICAgZGlycy5wdXNoKFBhdGgucmVzb2x2ZShjdXJyRGlyLCAnbm9kZV9tb2R1bGVzJykpO1xuICAvLyB9IHdoaWxlIChjdXJyRGlyICE9PSByb290KTtcblxuICAvLyBjb25zdCBub2RlTW9kdWxlID0gZGlycy5maW5kKGRpciA9PiBmcy5leGlzdHNTeW5jKGRpcikpO1xuICAvLyBpZiAobm9kZU1vZHVsZSkge1xuICAvLyAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2coYFBsZWFzZSBpbnN0YWxsIGluIGFub3RoZXIgZGlyZWN0b3J5LCBvciByZW1vdmUgJHtjaGFsay5yZWQobm9kZU1vZHVsZSl9LlxcbmAgK1xuICAvLyAgICAgY2hhbGsueWVsbG93KCdJdCBjb3VsZCBiZSBwcm9ibGVtYXRpYyBmb3IgUGxpbmsgdG8gbWFuYWdlIG1vbm9yZXBvIGRlcGVuZGVuY3kgKHRocm91Z2ggZW52aXJvbm1ldCB2YXJpYWJsZSBcIk5PREVfUEFUSFwiIGluIHJ1bnRpbWUpLlxcbicgK1xuICAvLyAgICAgJyhBbHRlcm5hdGl2ZWx5LCB5b3UgbWF5IGNvbnNpZGVyIGluc3RhbGwgd2hhdGV2ZXIgXCJnbG9iYWxcIiBkZXBlbmRlbmN5IHdpdGggYG5wbSBpIC1nYCBpbnN0ZWFkIG9mIGhhdmluZyBkaXJlY3RvcnkgbGlrZSAnICtcbiAgLy8gICAgIGNoYWxrLnJlZChub2RlTW9kdWxlKSArICcpJyApICk7XG5cbiAgLy8gICB0aHJvdyBuZXcgRXJyb3IoY2hhbGsucmVkKCdGb3VuZCBcIm5vZGVfbW9kdWxlc1wiIGluIHVwcGVyIGxldmVsIGRpcmVjdG9yaWVzLCAnICtcbiAgLy8gICAgICdJbnN0YWxsYXRpb24gaXMgY2FuY2VsbGVkLCBzb3JyeSBmb3IgaW5jb252aWVuaWVuY2UuJykpO1xuICAvLyB9XG59XG5cblxuXG4iXX0=