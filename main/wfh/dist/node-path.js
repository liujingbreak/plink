"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const worker_threads_1 = require("worker_threads");
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = __importDefault(require("log4js"));
const loaderHooks_1 = require("./loaderHooks");
const node_path_calc_1 = require("./node-path-calc");
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
        console.log(chalk_1.default.gray(logPrefix + `Environment variable PLINK_WORK_DIR is set: ${PLINK_WORK_DIR}`));
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
    // TODO: remove nodePath, it no longer useful
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLG1EQUFzRDtBQUN0RCxrREFBMEI7QUFDMUIsb0RBQTRCO0FBRTVCLCtDQUFrRDtBQUNsRCxxREFBK0M7QUFFL0MsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQ25CLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUFZO0lBQy9CLFNBQVMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLEtBQUsseUJBQVEsR0FBRyxDQUFDO0FBRWhELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztBQUV2QixJQUFJLENBQUMsVUFBVSxFQUFFO0lBQ2YsVUFBVSxHQUFHLElBQUksQ0FBQztJQUNsQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUN2QyxJQUFBLGlDQUFtQixFQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDakQsSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFO1lBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztTQUNmO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSDs7O09BR0c7SUFDSCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFL0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztRQUNwQyxJQUFJLDZCQUFZLElBQUksT0FBTyxDQUFDLElBQUksSUFB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TSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsR0FBRyxHQUFHLE9BQU8sQ0FBQztZQUNkLE1BQU07U0FDUDtRQUNELEdBQUcsR0FBRyxTQUFTLENBQUM7S0FDakI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsYUFBYSxDQUFDLE9BQWUsRUFBRSxPQUFlLEVBQUUsV0FBMEIsRUFBRSxRQUFnQjtJQUNuRyxNQUFNLFNBQVMsR0FBRyxJQUFBLDhCQUFhLEVBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekUsMERBQTBEO0lBQzFELDRDQUE0QztJQUM1Qyx5Q0FBeUM7SUFDekMsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQW9CRDs7OztHQUlHO0FBQ0gsU0FBUyx1QkFBdUIsQ0FBQyxPQUFlO0lBQzlDLG1CQUFtQjtJQUNuQiwrQkFBK0I7SUFFL0IseUJBQXlCO0lBQ3pCLHNDQUFzQztJQUN0QyxPQUFPO0lBQ1AscUNBQXFDO0lBQ3JDLHNEQUFzRDtJQUN0RCw4QkFBOEI7SUFFOUIsMkRBQTJEO0lBQzNELG9CQUFvQjtJQUNwQiwyQ0FBMkM7SUFDM0MsK0ZBQStGO0lBQy9GLCtJQUErSTtJQUMvSSxrSUFBa0k7SUFDbEksdUNBQXVDO0lBRXZDLG9GQUFvRjtJQUNwRixnRUFBZ0U7SUFDaEUsSUFBSTtBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aG9va0NvbW1vbkpzUmVxdWlyZX0gZnJvbSAnLi9sb2FkZXJIb29rcyc7XG5pbXBvcnQge2NhbGNOb2RlUGF0aHN9IGZyb20gJy4vbm9kZS1wYXRoLWNhbGMnO1xuXG5sZXQgbG9nUHJlZml4ID0gJyc7XG5pZiAocHJvY2Vzcy5zZW5kIHx8ICFpc01haW5UaHJlYWQpXG4gIGxvZ1ByZWZpeCArPSBgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dYDtcblxubGV0IGVudlNldERvbmUgPSBmYWxzZTtcblxuaWYgKCFlbnZTZXREb25lKSB7XG4gIGVudlNldERvbmUgPSB0cnVlO1xuICByZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInKTtcbiAgaG9va0NvbW1vbkpzUmVxdWlyZSgoZmlsZSwgdGFyZ2V0LCByZXEsIHJlc29sdmUpID0+IHtcbiAgICBpZiAodGFyZ2V0ID09PSAnbG9nNGpzJykge1xuICAgICAgcmV0dXJuIGxvZzRqcztcbiAgICB9XG4gIH0pO1xuICAvKiogZW52aXJvbm1lbnQgdmFyYWlibGUgX19wbGluayBpcyB1c2VkIGZvciBzaGFyZSBiYXNpYyBQbGluayBpbmZvcm1hdGlvbiBiZXR3ZWVuOlxuICAgKiAtIE5vZGUuanMgXCItclwiIHByZWxvYWQgbW9kdWxlIGFuZCBub3JtYWwgbW9kdWxlcywgZXNwZWNpYWxseSBzZXR0aW5nIE5PREVfUEFUSCBpbiBcIi1yXCIgbW9kdWxlXG4gICAqIC0gTWFpbiBwcm9jZXNzIGFuZCBmb3JrZWQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyXG4gICAqL1xuICBjb25zdCBleGl0aW5nRW52VmFyID0gcHJvY2Vzcy5lbnYuX19wbGluayA/IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluaykgYXMgUGxpbmtFbnYgOiBudWxsO1xuXG4gIGlmICghcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpIHtcbiAgICBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUiA9ICdkaXN0JztcbiAgICBpZiAoaXNNYWluVGhyZWFkIHx8IHByb2Nlc3Muc2VuZCA9PSBudWxsKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnQnkgZGVmYXVsdCwgUGxpbmsgcmVhZHMgYW5kIHdyaXRlcyBzdGF0ZSBmaWxlcyBpbiBkaXJlY3RvcnkgXCI8cm9vdC1kaXI+L2Rpc3RcIixcXG4nICtcbiAgICAgICd5b3UgbWF5IGNoYW5nZSBpdCBieScgK1xuICAgICAgJyBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlIFBMSU5LX0RBVEFfRElSIHRvIGFub3RoZXIgcmVsYXRpdmUgZGlyZWN0b3J5JykpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgJ1BMSU5LX0RBVEFfRElSOiAnICsgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpKTtcbiAgfVxuICBjb25zdCBQTElOS19XT1JLX0RJUiA9IHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSO1xuICBpZiAoUExJTktfV09SS19ESVIpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkobG9nUHJlZml4ICsgYEVudmlyb25tZW50IHZhcmlhYmxlIFBMSU5LX1dPUktfRElSIGlzIHNldDogJHtQTElOS19XT1JLX0RJUn1gKSk7XG4gIH1cbiAgY29uc3Qgd29ya0RpciA9IFBMSU5LX1dPUktfRElSID8gUGF0aC5yZXNvbHZlKFBMSU5LX1dPUktfRElSKSA6IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IHJvb3REaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5yb290RGlyIDogZmluZFJvb3REaXIocHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIsIHdvcmtEaXIpO1xuICBjaGVja1VwTGV2ZWxOb2RlTW9kdWxlcyhyb290RGlyKTtcbiAgLy8gV2UgY2FuIGNoYW5nZSB0aGlzIHBhdGggdG8gYW5vdGhlciBkaXJlY3RvcnkgbGlrZSAnLmxpbmtzJyxcbiAgLy8gaWYgd2UgZG9uJ3Qgd2FudCBub2RlX21vZHVsZXMgdG8gYmUgcG9sbHV0ZWQgYnkgc3ltbGlua3M7XG4gIGNvbnN0IHN5bWxpbmtEaXJOYW1lID0gZXhpdGluZ0VudlZhciAmJiBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXJOYW1lID9cbiAgICBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXJOYW1lIDogJ25vZGVfbW9kdWxlcyc7XG5cblxuICBsZXQgcGxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJyk7XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5pc0RyY3BTeW1saW5rIDogZnMubHN0YXRTeW5jKHBsaW5rRGlyKS5pc1N5bWJvbGljTGluaygpO1xuICBpZiAoaXNEcmNwU3ltbGluaylcbiAgICBwbGlua0RpciA9IGZzLnJlYWxwYXRoU3luYyhwbGlua0Rpcik7XG5cbiAgLy8gVE9ETzogcmVtb3ZlIG5vZGVQYXRoLCBpdCBubyBsb25nZXIgdXNlZnVsXG4gIGNvbnN0IG5vZGVQYXRoID0gc2V0dXBOb2RlUGF0aCh3b3JrRGlyLCByb290RGlyLFxuICAgIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHN5bWxpbmtEaXJOYW1lKSkgPyBQYXRoLnJlc29sdmUoc3ltbGlua0Rpck5hbWUpIDogbnVsbCxcbiAgICBwbGlua0Rpcik7XG4gIGNvbnN0IGRpc3REaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgIHdvcmtEaXIsIGRpc3REaXIsIGlzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXJOYW1lLCBub2RlUGF0aCwgcGxpbmtEaXJ9IGFzIFBsaW5rRW52KTtcblxuICAvLyBkZWxldGUgcmVnaXN0ZXIgZnJvbSBjb21tYW5kIGxpbmUgb3B0aW9uLCB0byBhdm9pZCBjaGlsZCBwcm9jZXNzIGdldCB0aGlzIG9wdGlvbiwgc2luY2Ugd2UgaGF2ZSBOT0RFX1BBVEggc2V0XG4gIC8vIGZvciBjaGlsZCBwcm9jZXNzXG4gIGNvbnN0IGRlbGV0ZUV4ZWNBcmdJZHg6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcHJvY2Vzcy5leGVjQXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaSA8IGwgLSAxICYmIC9eKD86LXJ8LS1yZXF1aXJlKSQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpXSkgJiZcbiAgICAgIC9eQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaSArIDFdKSkge1xuICAgICAgZGVsZXRlRXhlY0FyZ0lkeC5wdXNoKGkpO1xuICAgIH1cbiAgfVxuICBkZWxldGVFeGVjQXJnSWR4LnJlZHVjZSgob2Zmc2V0LCBkZWxldGVJZHgpID0+IHtcbiAgICBwcm9jZXNzLmV4ZWNBcmd2LnNwbGljZShkZWxldGVJZHggKyBvZmZzZXQsIDIpO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9LCAwKTtcblxuICBjb25zdCBlbnZPcHRpb25zID0gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID8gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPVxuICAgIGVudk9wdGlvbnMuZmlsdGVyKGl0ZW0gPT4gIS8oLXJ8LS1yZXF1aXJlKVxccytAd2ZoXFwvcGxpbmtcXC9yZWdpc3Rlci8udGVzdChpdGVtKSkuam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKGRpc3REaXI6IHN0cmluZywgY3VyckRpcjogc3RyaW5nKSB7XG4gIGxldCBkaXIgPSBQYXRoLnJlc29sdmUoY3VyckRpcik7XG4gIGNvbnN0IHtyb290fSA9IFBhdGgucGFyc2UoZGlyKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsIGRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gcm9vdCkge1xuICAgICAgZGlyID0gY3VyckRpcjtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLyoqXG4gKiBpZiBjd2QgaXMgbm90IHJvb3QgZGlyZWN0b3J5LCB0aGVuIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8Y3dkPi9ub2RlX21vZHVsZXM6PHJvb3REaXI+L3N5bWxpbmtzLFxuICogb3RoZXJ3aXNlIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8cm9vdERpcj4vbm9kZV9tb2R1bGVzXG4gKiBAcGFyYW0gcm9vdERpciBcbiAqIEBwYXJhbSBpc0RyY3BTeW1saW5rIFxuICovXG5mdW5jdGlvbiBzZXR1cE5vZGVQYXRoKGN1cnJEaXI6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBzeW1saW5rc0Rpcjogc3RyaW5nIHwgbnVsbCwgcGxpbmtEaXI6IHN0cmluZykge1xuICBjb25zdCBwYXRoQXJyYXkgPSBjYWxjTm9kZVBhdGhzKHJvb3REaXIsIHN5bWxpbmtzRGlyLCBjdXJyRGlyLCBwbGlua0Rpcik7XG4gIC8vIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IHBhdGhBcnJheS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgLy8gcHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyA9ICcxJztcbiAgLy8gcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbiAgcmV0dXJuIHBhdGhBcnJheTtcbn1cblxuLyoqXG4gKiBHZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHByZWRlZmluZWQgYnlcbmBgYFxuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgZGlzdERpcjogc3RyaW5nO1xuICAvKiogd2hldGhlciBQbGluayBpcyBhIHN5bWxpbmssIERyY3AgaXMgb2xkIG5hbWUgb2YgUGxpbmsgKi9cbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgcm9vdERpcjogc3RyaW5nO1xuICAvKiogY3VycmVudCB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnkgKi9cbiAgd29ya0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyTmFtZTogc3RyaW5nIHwgJ25vZGVfbW9kdWxlcyc7XG4gIG5vZGVQYXRoOiBzdHJpbmdbXTtcbiAgcGxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBXZWJwYWNrIGFuZCBUUyBjb21waWxlciBieSBkZWZhdWx0IHdpbGwgbG9vayB1cCBub2RlX21vZHVsZXMgZnJvbSB1cCBsZXZlbCBkaXJlY3RyaWVzLFxuICogdGhpcyBicmVha3MgUGxpbmsncyB3YXkgb2YgYWRkaW5nIGV4dHJhIG5vZGUgcGF0aCBmb3IgTm9kZS5qcywgVFMgb3IgV2VicGFjaywgaXQgbGVhZHNcbiAqIHRvIHByb2JsZW1hdGljIG1vZHVsZSBsb2FkaW5nIGlzc3VlLlxuICovXG5mdW5jdGlvbiBjaGVja1VwTGV2ZWxOb2RlTW9kdWxlcyhyb290RGlyOiBzdHJpbmcpIHtcbiAgLy8gR28gd2l0aCBwcmVzZXJ2ZVxuICAvLyBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG5cbiAgLy8gbGV0IGN1cnJEaXIgPSByb290RGlyO1xuICAvLyBjb25zdCB7cm9vdH0gPSBQYXRoLnBhcnNlKHJvb3REaXIpO1xuICAvLyBkbyB7XG4gIC8vICAgY3VyckRpciA9IFBhdGguZGlybmFtZShjdXJyRGlyKTtcbiAgLy8gICBkaXJzLnB1c2goUGF0aC5yZXNvbHZlKGN1cnJEaXIsICdub2RlX21vZHVsZXMnKSk7XG4gIC8vIH0gd2hpbGUgKGN1cnJEaXIgIT09IHJvb3QpO1xuXG4gIC8vIGNvbnN0IG5vZGVNb2R1bGUgPSBkaXJzLmZpbmQoZGlyID0+IGZzLmV4aXN0c1N5bmMoZGlyKSk7XG4gIC8vIGlmIChub2RlTW9kdWxlKSB7XG4gIC8vICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyhgUGxlYXNlIGluc3RhbGwgaW4gYW5vdGhlciBkaXJlY3RvcnksIG9yIHJlbW92ZSAke2NoYWxrLnJlZChub2RlTW9kdWxlKX0uXFxuYCArXG4gIC8vICAgICBjaGFsay55ZWxsb3coJ0l0IGNvdWxkIGJlIHByb2JsZW1hdGljIGZvciBQbGluayB0byBtYW5hZ2UgbW9ub3JlcG8gZGVwZW5kZW5jeSAodGhyb3VnaCBlbnZpcm9ubWV0IHZhcmlhYmxlIFwiTk9ERV9QQVRIXCIgaW4gcnVudGltZSkuXFxuJyArXG4gIC8vICAgICAnKEFsdGVybmF0aXZlbHksIHlvdSBtYXkgY29uc2lkZXIgaW5zdGFsbCB3aGF0ZXZlciBcImdsb2JhbFwiIGRlcGVuZGVuY3kgd2l0aCBgbnBtIGkgLWdgIGluc3RlYWQgb2YgaGF2aW5nIGRpcmVjdG9yeSBsaWtlICcgK1xuICAvLyAgICAgY2hhbGsucmVkKG5vZGVNb2R1bGUpICsgJyknICkgKTtcblxuICAvLyAgIHRocm93IG5ldyBFcnJvcihjaGFsay5yZWQoJ0ZvdW5kIFwibm9kZV9tb2R1bGVzXCIgaW4gdXBwZXIgbGV2ZWwgZGlyZWN0b3JpZXMsICcgK1xuICAvLyAgICAgJ0luc3RhbGxhdGlvbiBpcyBjYW5jZWxsZWQsIHNvcnJ5IGZvciBpbmNvbnZpZW5pZW5jZS4nKSk7XG4gIC8vIH1cbn1cblxuXG5cbiJdfQ==