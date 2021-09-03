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
    // process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // process.env.NODE_PRESERVE_SYMLINKS = '1';
    // eslint-disable-next-line no-console
    // console.log(chalk.gray(logPrefix + 'NODE_PATH', process.env.NODE_PATH));
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
loaderHooks_1.hookCommonJsRequire((file, target, req, resolve) => {
    if (target === 'log4js') {
        return log4js_1.default;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsK0NBQWtEO0FBQ2xELG9EQUF1QjtBQUN2QixtREFBNEM7QUFFNUMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLElBQUksT0FBTyxDQUFDLElBQUk7SUFDZCxTQUFTLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQzdDLElBQUksQ0FBQyw2QkFBWTtJQUNwQixTQUFTLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUVyQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFFdkIsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDbEIsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFdkM7OztPQUdHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDcEMsSUFBSSw2QkFBWSxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ3hDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLGtGQUFrRjtnQkFDckgsc0JBQXNCO2dCQUN0Qiw0RUFB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LE9BQU8sZ0JBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQXRCRCxzQ0FzQkM7QUFvQkQ7Ozs7R0FJRztBQUNILFNBQVMsdUJBQXVCLENBQUMsT0FBZTtJQUM5QyxtQkFBbUI7SUFDbkIsK0JBQStCO0lBRS9CLHlCQUF5QjtJQUN6QixzQ0FBc0M7SUFDdEMsT0FBTztJQUNQLHFDQUFxQztJQUNyQyxzREFBc0Q7SUFDdEQsOEJBQThCO0lBRTlCLDJEQUEyRDtJQUMzRCxvQkFBb0I7SUFDcEIsMkNBQTJDO0lBQzNDLCtGQUErRjtJQUMvRiwrSUFBK0k7SUFDL0ksa0lBQWtJO0lBQ2xJLHVDQUF1QztJQUV2QyxvRkFBb0Y7SUFDcEYsZ0VBQWdFO0lBQ2hFLElBQUk7QUFDTixDQUFDO0FBR0QsaUNBQW1CLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNqRCxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7UUFDdkIsT0FBTyxnQkFBTSxDQUFDO0tBQ2Y7QUFDSCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtob29rQ29tbW9uSnNSZXF1aXJlfSBmcm9tICcuL2xvYWRlckhvb2tzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2lzTWFpblRocmVhZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5sZXQgbG9nUHJlZml4ID0gJz4gJztcbmlmIChwcm9jZXNzLnNlbmQpXG4gIGxvZ1ByZWZpeCA9IGBbcGlkOiAke3Byb2Nlc3MucGlkfV1gICsgbG9nUHJlZml4O1xuZWxzZSBpZiAoIWlzTWFpblRocmVhZClcbiAgbG9nUHJlZml4ID0gJ1t0aHJlYWRdJyArIGxvZ1ByZWZpeDtcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcblxuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmICghcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpIHtcbiAgICBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9ICdkaXN0JztcbiAgICBpZiAoaXNNYWluVGhyZWFkIHx8IHByb2Nlc3Muc2VuZCA9PSBudWxsKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnQnkgZGVmYXVsdCwgUGxpbmsgcmVhZHMgYW5kIHdyaXRlcyBzdGF0ZSBmaWxlcyBpbiBkaXJlY3RvcnkgXCI8cm9vdC1kaXI+L2Rpc3RcIixcXG4nICtcbiAgICAgICd5b3UgbWF5IGNoYW5nZSBpdCBieScgK1xuICAgICAgJyBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlIFBMSU5LX0RBVEFfRElSIHRvIGFub3RoZXIgcmVsYXRpdmUgZGlyZWN0b3J5JykpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgJ1BMSU5LX0RBVEFfRElSOiAnICsgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpKTtcbiAgfVxuICBjb25zdCBQTElOS19XT1JLX0RJUiA9IHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSO1xuICBpZiAoUExJTktfV09SS19ESVIpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGxvZ1ByZWZpeCArIGBFbnZpcm9ubWVudCB2YXJpYWJsZSBQTElOS19XT1JLX0RJUiBpcyBzZXQsIGRlZmF1bHQgd29ya3NwYWNlIGlzOiAke1BMSU5LX1dPUktfRElSfWApO1xuICB9XG4gIGNvbnN0IHdvcmtEaXIgPSBQTElOS19XT1JLX0RJUiA/IFBhdGgucmVzb2x2ZShQTElOS19XT1JLX0RJUikgOiBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCByb290RGlyID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIucm9vdERpciA6IGZpbmRSb290RGlyKHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSLCB3b3JrRGlyKTtcbiAgY2hlY2tVcExldmVsTm9kZU1vZHVsZXMocm9vdERpcik7XG4gIC8vIFdlIGNhbiBjaGFuZ2UgdGhpcyBwYXRoIHRvIGFub3RoZXIgZGlyZWN0b3J5IGxpa2UgJy5saW5rcycsXG4gIC8vIGlmIHdlIGRvbid0IHdhbnQgbm9kZV9tb2R1bGVzIHRvIGJlIHBvbGx1dGVkIGJ5IHN5bWxpbmtzO1xuICBjb25zdCBzeW1saW5rRGlyTmFtZSA9IGV4aXRpbmdFbnZWYXIgJiYgZXhpdGluZ0VudlZhci5zeW1saW5rRGlyTmFtZSA/XG4gICAgZXhpdGluZ0VudlZhci5zeW1saW5rRGlyTmFtZSA6ICdub2RlX21vZHVsZXMnO1xuXG5cbiAgbGV0IHBsaW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpO1xuICBjb25zdCBpc0RyY3BTeW1saW5rID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIuaXNEcmNwU3ltbGluayA6IGZzLmxzdGF0U3luYyhwbGlua0RpcikuaXNTeW1ib2xpY0xpbmsoKTtcbiAgaWYgKGlzRHJjcFN5bWxpbmspXG4gICAgcGxpbmtEaXIgPSBmcy5yZWFscGF0aFN5bmMocGxpbmtEaXIpO1xuICBjb25zdCBub2RlUGF0aCA9IHNldHVwTm9kZVBhdGgod29ya0Rpciwgcm9vdERpcixcbiAgICBmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShzeW1saW5rRGlyTmFtZSkpID8gUGF0aC5yZXNvbHZlKHN5bWxpbmtEaXJOYW1lKSA6IG51bGwsXG4gICAgcGxpbmtEaXIpO1xuICBjb25zdCBkaXN0RGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKTtcbiAgcHJvY2Vzcy5lbnYuX19wbGluayA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICB3b3JrRGlyLCBkaXN0RGlyLCBpc0RyY3BTeW1saW5rLCByb290RGlyLCBzeW1saW5rRGlyTmFtZSwgbm9kZVBhdGgsIHBsaW5rRGlyfSBhcyBQbGlua0Vudik7XG5cbiAgLy8gZGVsZXRlIHJlZ2lzdGVyIGZyb20gY29tbWFuZCBsaW5lIG9wdGlvbiwgdG8gYXZvaWQgY2hpbGQgcHJvY2VzcyBnZXQgdGhpcyBvcHRpb24sIHNpbmNlIHdlIGhhdmUgTk9ERV9QQVRIIHNldFxuICAvLyBmb3IgY2hpbGQgcHJvY2Vzc1xuICBjb25zdCBkZWxldGVFeGVjQXJnSWR4OiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHByb2Nlc3MuZXhlY0FyZ3YubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGkgPCBsIC0gMSAmJiAvXig/Oi1yfC0tcmVxdWlyZSkkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaV0pICYmXG4gICAgICAvXkB3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2kgKyAxXSkpIHtcbiAgICAgIGRlbGV0ZUV4ZWNBcmdJZHgucHVzaChpKTtcbiAgICB9XG4gIH1cbiAgZGVsZXRlRXhlY0FyZ0lkeC5yZWR1Y2UoKG9mZnNldCwgZGVsZXRlSWR4KSA9PiB7XG4gICAgcHJvY2Vzcy5leGVjQXJndi5zcGxpY2UoZGVsZXRlSWR4ICsgb2Zmc2V0LCAyKTtcbiAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgfSwgMCk7XG5cbiAgY29uc3QgZW52T3B0aW9ucyA9IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA/IHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUy5zcGxpdChQYXRoLmRlbGltaXRlcikgOiBbXTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID1cbiAgICBlbnZPcHRpb25zLmZpbHRlcihpdGVtID0+ICEvKC1yfC0tcmVxdWlyZSlcXHMrQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIvLnRlc3QoaXRlbSkpLmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xufVxuXG5mdW5jdGlvbiBmaW5kUm9vdERpcihkaXN0RGlyOiBzdHJpbmcsIGN1cnJEaXI6IHN0cmluZykge1xuICBsZXQgZGlyID0gUGF0aC5yZXNvbHZlKGN1cnJEaXIpO1xuICBjb25zdCB7cm9vdH0gPSBQYXRoLnBhcnNlKGRpcik7XG4gIHdoaWxlICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZGlyLCBkaXN0RGlyLCAncGxpbmstc3RhdGUuanNvbicpKSkge1xuICAgIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICAgIGlmIChwYXJlbnREaXIgPT09IHJvb3QpIHtcbiAgICAgIGRpciA9IGN1cnJEaXI7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8qKlxuICogaWYgY3dkIGlzIG5vdCByb290IGRpcmVjdG9yeSwgdGhlbiBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPGN3ZD4vbm9kZV9tb2R1bGVzOjxyb290RGlyPi9zeW1saW5rcyxcbiAqIG90aGVyd2lzZSBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPHJvb3REaXI+L25vZGVfbW9kdWxlc1xuICogQHBhcmFtIHJvb3REaXIgXG4gKiBAcGFyYW0gaXNEcmNwU3ltbGluayBcbiAqL1xuZnVuY3Rpb24gc2V0dXBOb2RlUGF0aChjdXJyRGlyOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgc3ltbGlua3NEaXI6IHN0cmluZyB8IG51bGwsIHBsaW5rRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgcGF0aEFycmF5ID0gY2FsY05vZGVQYXRocyhyb290RGlyLCBzeW1saW5rc0RpciwgY3VyckRpciwgcGxpbmtEaXIpO1xuICAvLyBwcm9jZXNzLmVudi5OT0RFX1BBVEggPSBwYXRoQXJyYXkuam9pbihQYXRoLmRlbGltaXRlcik7XG4gIC8vIHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgPSAnMSc7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgJ05PREVfUEFUSCcsIHByb2Nlc3MuZW52Lk5PREVfUEFUSCkpO1xuICByZXF1aXJlKCdtb2R1bGUnKS5Nb2R1bGUuX2luaXRQYXRocygpO1xuICByZXR1cm4gcGF0aEFycmF5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY05vZGVQYXRocyhyb290RGlyOiBzdHJpbmcsIHN5bWxpbmtzRGlyOiBzdHJpbmcgfCBudWxsLCBjd2Q6IHN0cmluZywgcGxpbmtEaXI6IHN0cmluZykge1xuICBjb25zdCBub2RlUGF0aHM6IHN0cmluZ1tdID0gW1BhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJyldO1xuICBpZiAoc3ltbGlua3NEaXIpIHtcbiAgICBub2RlUGF0aHMudW5zaGlmdChzeW1saW5rc0Rpcik7XG4gIH1cbiAgaWYgKHJvb3REaXIgIT09IGN3ZCkge1xuICAgIG5vZGVQYXRocy51bnNoaWZ0KFBhdGgucmVzb2x2ZShjd2QsICdub2RlX21vZHVsZXMnKSk7XG4gIH1cblxuICAvKipcbiAgICogU29tZWhvdyB3aGVuIEkgaW5zdGFsbCBAd2ZoL3BsaW5rIGluIGFuIG5ldyBkaXJlY3RvcnksIG5wbSBkb2VzIG5vdCBkZWR1cGUgZGVwZW5kZW5jaWVzIGZyb20gXG4gICAqIEB3ZmgvcGxpbmsvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB1cCB0byBjdXJyZW50IG5vZGVfbW9kdWxlcyBkaXJlY3RvcnksIHJlc3VsdHMgaW4gTU9EVUxFX05PVF9GT1VORFxuICAgKiBmcm9tIEB3ZmgvcGxpbmsvcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlIGZvciByeGpzXG4gICAqL1xuICBub2RlUGF0aHMucHVzaChwbGlua0RpciArIFBhdGguc2VwICsgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSB7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIHByb2Nlc3MuZW52Lk5PREVfUEFUSC5zcGxpdChQYXRoLmRlbGltaXRlcikpIHtcbiAgICAgIG5vZGVQYXRocy5wdXNoKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBfLnVuaXEobm9kZVBhdGhzKTtcbn1cblxuLyoqXG4gKiBHZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHByZWRlZmluZWQgYnlcbmBgYFxuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgZGlzdERpcjogc3RyaW5nO1xuICAvKiogd2hldGhlciBQbGluayBpcyBhIHN5bWxpbmssIERyY3AgaXMgb2xkIG5hbWUgb2YgUGxpbmsgKi9cbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgcm9vdERpcjogc3RyaW5nO1xuICAvKiogY3VycmVudCB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnkgKi9cbiAgd29ya0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyTmFtZTogc3RyaW5nIHwgJ25vZGVfbW9kdWxlcyc7XG4gIG5vZGVQYXRoOiBzdHJpbmdbXTtcbiAgcGxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBXZWJwYWNrIGFuZCBUUyBjb21waWxlciBieSBkZWZhdWx0IHdpbGwgbG9vayB1cCBub2RlX21vZHVsZXMgZnJvbSB1cCBsZXZlbCBkaXJlY3RyaWVzLFxuICogdGhpcyBicmVha3MgUGxpbmsncyB3YXkgb2YgYWRkaW5nIGV4dHJhIG5vZGUgcGF0aCBmb3IgTm9kZS5qcywgVFMgb3IgV2VicGFjaywgaXQgbGVhZHNcbiAqIHRvIHByb2JsZW1hdGljIG1vZHVsZSBsb2FkaW5nIGlzc3VlLlxuICovXG5mdW5jdGlvbiBjaGVja1VwTGV2ZWxOb2RlTW9kdWxlcyhyb290RGlyOiBzdHJpbmcpIHtcbiAgLy8gR28gd2l0aCBwcmVzZXJ2ZVxuICAvLyBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG5cbiAgLy8gbGV0IGN1cnJEaXIgPSByb290RGlyO1xuICAvLyBjb25zdCB7cm9vdH0gPSBQYXRoLnBhcnNlKHJvb3REaXIpO1xuICAvLyBkbyB7XG4gIC8vICAgY3VyckRpciA9IFBhdGguZGlybmFtZShjdXJyRGlyKTtcbiAgLy8gICBkaXJzLnB1c2goUGF0aC5yZXNvbHZlKGN1cnJEaXIsICdub2RlX21vZHVsZXMnKSk7XG4gIC8vIH0gd2hpbGUgKGN1cnJEaXIgIT09IHJvb3QpO1xuXG4gIC8vIGNvbnN0IG5vZGVNb2R1bGUgPSBkaXJzLmZpbmQoZGlyID0+IGZzLmV4aXN0c1N5bmMoZGlyKSk7XG4gIC8vIGlmIChub2RlTW9kdWxlKSB7XG4gIC8vICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyhgUGxlYXNlIGluc3RhbGwgaW4gYW5vdGhlciBkaXJlY3RvcnksIG9yIHJlbW92ZSAke2NoYWxrLnJlZChub2RlTW9kdWxlKX0uXFxuYCArXG4gIC8vICAgICBjaGFsay55ZWxsb3coJ0l0IGNvdWxkIGJlIHByb2JsZW1hdGljIGZvciBQbGluayB0byBtYW5hZ2UgbW9ub3JlcG8gZGVwZW5kZW5jeSAodGhyb3VnaCBlbnZpcm9ubWV0IHZhcmlhYmxlIFwiTk9ERV9QQVRIXCIgaW4gcnVudGltZSkuXFxuJyArXG4gIC8vICAgICAnKEFsdGVybmF0aXZlbHksIHlvdSBtYXkgY29uc2lkZXIgaW5zdGFsbCB3aGF0ZXZlciBcImdsb2JhbFwiIGRlcGVuZGVuY3kgd2l0aCBgbnBtIGkgLWdgIGluc3RlYWQgb2YgaGF2aW5nIGRpcmVjdG9yeSBsaWtlICcgK1xuICAvLyAgICAgY2hhbGsucmVkKG5vZGVNb2R1bGUpICsgJyknICkgKTtcblxuICAvLyAgIHRocm93IG5ldyBFcnJvcihjaGFsay5yZWQoJ0ZvdW5kIFwibm9kZV9tb2R1bGVzXCIgaW4gdXBwZXIgbGV2ZWwgZGlyZWN0b3JpZXMsICcgK1xuICAvLyAgICAgJ0luc3RhbGxhdGlvbiBpcyBjYW5jZWxsZWQsIHNvcnJ5IGZvciBpbmNvbnZpZW5pZW5jZS4nKSk7XG4gIC8vIH1cbn1cblxuXG5ob29rQ29tbW9uSnNSZXF1aXJlKChmaWxlLCB0YXJnZXQsIHJlcSwgcmVzb2x2ZSkgPT4ge1xuICBpZiAodGFyZ2V0ID09PSAnbG9nNGpzJykge1xuICAgIHJldHVybiBsb2c0anM7XG4gIH1cbn0pO1xuIl19