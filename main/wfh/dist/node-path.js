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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QiwrQ0FBa0Q7QUFDbEQscURBQStDO0FBRS9DLG1EQUFzRDtBQUV0RCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDbkIsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNkJBQVk7SUFDL0IsU0FBUyxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsS0FBSyx5QkFBUSxHQUFHLENBQUM7QUFFaEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0FBRXZCLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDZixVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3ZDLElBQUEsaUNBQW1CLEVBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNqRCxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7WUFDdkIsT0FBTyxnQkFBTSxDQUFDO1NBQ2Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNIOzs7T0FHRztJQUNILE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUUvRixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQ3BDLElBQUksNkJBQVksSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLElB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QVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixHQUFHLEdBQUcsT0FBTyxDQUFDO1lBQ2QsTUFBTTtTQUNQO1FBQ0QsR0FBRyxHQUFHLFNBQVMsQ0FBQztLQUNqQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBUyxhQUFhLENBQUMsT0FBZSxFQUFFLE9BQWUsRUFBRSxXQUEwQixFQUFFLFFBQWdCO0lBQ25HLE1BQU0sU0FBUyxHQUFHLElBQUEsOEJBQWEsRUFBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN6RSwwREFBMEQ7SUFDMUQsNENBQTRDO0lBQzVDLHlDQUF5QztJQUN6QyxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDO0FBb0JEOzs7O0dBSUc7QUFDSCxTQUFTLHVCQUF1QixDQUFDLE9BQWU7SUFDOUMsbUJBQW1CO0lBQ25CLCtCQUErQjtJQUUvQix5QkFBeUI7SUFDekIsc0NBQXNDO0lBQ3RDLE9BQU87SUFDUCxxQ0FBcUM7SUFDckMsc0RBQXNEO0lBQ3RELDhCQUE4QjtJQUU5QiwyREFBMkQ7SUFDM0Qsb0JBQW9CO0lBQ3BCLDJDQUEyQztJQUMzQywrRkFBK0Y7SUFDL0YsK0lBQStJO0lBQy9JLGtJQUFrSTtJQUNsSSx1Q0FBdUM7SUFFdkMsb0ZBQW9GO0lBQ3BGLGdFQUFnRTtJQUNoRSxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtob29rQ29tbW9uSnNSZXF1aXJlfSBmcm9tICcuL2xvYWRlckhvb2tzJztcbmltcG9ydCB7Y2FsY05vZGVQYXRoc30gZnJvbSAnLi9ub2RlLXBhdGgtY2FsYyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCBsb2dQcmVmaXggPSAnJztcbmlmIChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZClcbiAgbG9nUHJlZml4ICs9IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV1gO1xuXG5sZXQgZW52U2V0RG9uZSA9IGZhbHNlO1xuXG5pZiAoIWVudlNldERvbmUpIHtcbiAgZW52U2V0RG9uZSA9IHRydWU7XG4gIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuICBob29rQ29tbW9uSnNSZXF1aXJlKChmaWxlLCB0YXJnZXQsIHJlcSwgcmVzb2x2ZSkgPT4ge1xuICAgIGlmICh0YXJnZXQgPT09ICdsb2c0anMnKSB7XG4gICAgICByZXR1cm4gbG9nNGpzO1xuICAgIH1cbiAgfSk7XG4gIC8qKiBlbnZpcm9ubWVudCB2YXJhaWJsZSBfX3BsaW5rIGlzIHVzZWQgZm9yIHNoYXJlIGJhc2ljIFBsaW5rIGluZm9ybWF0aW9uIGJldHdlZW46XG4gICAqIC0gTm9kZS5qcyBcIi1yXCIgcHJlbG9hZCBtb2R1bGUgYW5kIG5vcm1hbCBtb2R1bGVzLCBlc3BlY2lhbGx5IHNldHRpbmcgTk9ERV9QQVRIIGluIFwiLXJcIiBtb2R1bGVcbiAgICogLSBNYWluIHByb2Nlc3MgYW5kIGZvcmtlZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXJcbiAgICovXG4gIGNvbnN0IGV4aXRpbmdFbnZWYXIgPSBwcm9jZXNzLmVudi5fX3BsaW5rID8gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rKSBhcyBQbGlua0VudiA6IG51bGw7XG5cbiAgaWYgKCFwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikge1xuICAgIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSID0gJ2Rpc3QnO1xuICAgIGlmIChpc01haW5UaHJlYWQgfHwgcHJvY2Vzcy5zZW5kID09IG51bGwpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5ncmF5KGxvZ1ByZWZpeCArICdCeSBkZWZhdWx0LCBQbGluayByZWFkcyBhbmQgd3JpdGVzIHN0YXRlIGZpbGVzIGluIGRpcmVjdG9yeSBcIjxyb290LWRpcj4vZGlzdFwiLFxcbicgK1xuICAgICAgJ3lvdSBtYXkgY2hhbmdlIGl0IGJ5JyArXG4gICAgICAnIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgUExJTktfREFUQV9ESVIgdG8gYW5vdGhlciByZWxhdGl2ZSBkaXJlY3RvcnknKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyAnUExJTktfREFUQV9ESVI6ICcgKyBwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikpO1xuICB9XG4gIGNvbnN0IFBMSU5LX1dPUktfRElSID0gcHJvY2Vzcy5lbnYuUExJTktfV09SS19ESVI7XG4gIGlmIChQTElOS19XT1JLX0RJUikge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShsb2dQcmVmaXggKyBgRW52aXJvbm1lbnQgdmFyaWFibGUgUExJTktfV09SS19ESVIgaXMgc2V0LCBkZWZhdWx0IHdvcmtzcGFjZSBpczogJHtQTElOS19XT1JLX0RJUn1gKSk7XG4gIH1cbiAgY29uc3Qgd29ya0RpciA9IFBMSU5LX1dPUktfRElSID8gUGF0aC5yZXNvbHZlKFBMSU5LX1dPUktfRElSKSA6IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IHJvb3REaXIgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5yb290RGlyIDogZmluZFJvb3REaXIocHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIsIHdvcmtEaXIpO1xuICBjaGVja1VwTGV2ZWxOb2RlTW9kdWxlcyhyb290RGlyKTtcbiAgLy8gV2UgY2FuIGNoYW5nZSB0aGlzIHBhdGggdG8gYW5vdGhlciBkaXJlY3RvcnkgbGlrZSAnLmxpbmtzJyxcbiAgLy8gaWYgd2UgZG9uJ3Qgd2FudCBub2RlX21vZHVsZXMgdG8gYmUgcG9sbHV0ZWQgYnkgc3ltbGlua3M7XG4gIGNvbnN0IHN5bWxpbmtEaXJOYW1lID0gZXhpdGluZ0VudlZhciAmJiBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXJOYW1lID9cbiAgICBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXJOYW1lIDogJ25vZGVfbW9kdWxlcyc7XG5cblxuICBsZXQgcGxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJyk7XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5pc0RyY3BTeW1saW5rIDogZnMubHN0YXRTeW5jKHBsaW5rRGlyKS5pc1N5bWJvbGljTGluaygpO1xuICBpZiAoaXNEcmNwU3ltbGluaylcbiAgICBwbGlua0RpciA9IGZzLnJlYWxwYXRoU3luYyhwbGlua0Rpcik7XG5cbiAgLy8gVE9ETzogcmVtb3ZlIG5vZGVQYXRoLCBpdCBubyBsb25nZXIgdXNlZnVsXG4gIGNvbnN0IG5vZGVQYXRoID0gc2V0dXBOb2RlUGF0aCh3b3JrRGlyLCByb290RGlyLFxuICAgIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHN5bWxpbmtEaXJOYW1lKSkgPyBQYXRoLnJlc29sdmUoc3ltbGlua0Rpck5hbWUpIDogbnVsbCxcbiAgICBwbGlua0Rpcik7XG4gIGNvbnN0IGRpc3REaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpO1xuICBwcm9jZXNzLmVudi5fX3BsaW5rID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgIHdvcmtEaXIsIGRpc3REaXIsIGlzRHJjcFN5bWxpbmssIHJvb3REaXIsIHN5bWxpbmtEaXJOYW1lLCBub2RlUGF0aCwgcGxpbmtEaXJ9IGFzIFBsaW5rRW52KTtcblxuICAvLyBkZWxldGUgcmVnaXN0ZXIgZnJvbSBjb21tYW5kIGxpbmUgb3B0aW9uLCB0byBhdm9pZCBjaGlsZCBwcm9jZXNzIGdldCB0aGlzIG9wdGlvbiwgc2luY2Ugd2UgaGF2ZSBOT0RFX1BBVEggc2V0XG4gIC8vIGZvciBjaGlsZCBwcm9jZXNzXG4gIGNvbnN0IGRlbGV0ZUV4ZWNBcmdJZHg6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwLCBsID0gcHJvY2Vzcy5leGVjQXJndi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoaSA8IGwgLSAxICYmIC9eKD86LXJ8LS1yZXF1aXJlKSQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpXSkgJiZcbiAgICAgIC9eQHdmaFxcL3BsaW5rXFwvcmVnaXN0ZXIkLy50ZXN0KHByb2Nlc3MuZXhlY0FyZ3ZbaSArIDFdKSkge1xuICAgICAgZGVsZXRlRXhlY0FyZ0lkeC5wdXNoKGkpO1xuICAgIH1cbiAgfVxuICBkZWxldGVFeGVjQXJnSWR4LnJlZHVjZSgob2Zmc2V0LCBkZWxldGVJZHgpID0+IHtcbiAgICBwcm9jZXNzLmV4ZWNBcmd2LnNwbGljZShkZWxldGVJZHggKyBvZmZzZXQsIDIpO1xuICAgIHJldHVybiBvZmZzZXQgKyAyO1xuICB9LCAwKTtcblxuICBjb25zdCBlbnZPcHRpb25zID0gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TID8gcHJvY2Vzcy5lbnYuTk9ERV9PUFRJT05TLnNwbGl0KFBhdGguZGVsaW1pdGVyKSA6IFtdO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPVxuICAgIGVudk9wdGlvbnMuZmlsdGVyKGl0ZW0gPT4gIS8oLXJ8LS1yZXF1aXJlKVxccytAd2ZoXFwvcGxpbmtcXC9yZWdpc3Rlci8udGVzdChpdGVtKSkuam9pbihQYXRoLmRlbGltaXRlcik7XG59XG5cbmZ1bmN0aW9uIGZpbmRSb290RGlyKGRpc3REaXI6IHN0cmluZywgY3VyckRpcjogc3RyaW5nKSB7XG4gIGxldCBkaXIgPSBQYXRoLnJlc29sdmUoY3VyckRpcik7XG4gIGNvbnN0IHtyb290fSA9IFBhdGgucGFyc2UoZGlyKTtcbiAgd2hpbGUgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShkaXIsIGRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJykpKSB7XG4gICAgY29uc3QgcGFyZW50RGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgaWYgKHBhcmVudERpciA9PT0gcm9vdCkge1xuICAgICAgZGlyID0gY3VyckRpcjtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcmV0dXJuIGRpcjtcbn1cblxuLyoqXG4gKiBpZiBjd2QgaXMgbm90IHJvb3QgZGlyZWN0b3J5LCB0aGVuIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8Y3dkPi9ub2RlX21vZHVsZXM6PHJvb3REaXI+L3N5bWxpbmtzLFxuICogb3RoZXJ3aXNlIGFwcGVuZCBOT0RFX1BBVEggd2l0aCA8cm9vdERpcj4vbm9kZV9tb2R1bGVzXG4gKiBAcGFyYW0gcm9vdERpciBcbiAqIEBwYXJhbSBpc0RyY3BTeW1saW5rIFxuICovXG5mdW5jdGlvbiBzZXR1cE5vZGVQYXRoKGN1cnJEaXI6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBzeW1saW5rc0Rpcjogc3RyaW5nIHwgbnVsbCwgcGxpbmtEaXI6IHN0cmluZykge1xuICBjb25zdCBwYXRoQXJyYXkgPSBjYWxjTm9kZVBhdGhzKHJvb3REaXIsIHN5bWxpbmtzRGlyLCBjdXJyRGlyLCBwbGlua0Rpcik7XG4gIC8vIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IHBhdGhBcnJheS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgLy8gcHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyA9ICcxJztcbiAgLy8gcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbiAgcmV0dXJuIHBhdGhBcnJheTtcbn1cblxuLyoqXG4gKiBHZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIHByZWRlZmluZWQgYnlcbmBgYFxuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgZGlzdERpcjogc3RyaW5nO1xuICAvKiogd2hldGhlciBQbGluayBpcyBhIHN5bWxpbmssIERyY3AgaXMgb2xkIG5hbWUgb2YgUGxpbmsgKi9cbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgcm9vdERpcjogc3RyaW5nO1xuICAvKiogY3VycmVudCB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnkgKi9cbiAgd29ya0Rpcjogc3RyaW5nO1xuICBzeW1saW5rRGlyTmFtZTogc3RyaW5nIHwgJ25vZGVfbW9kdWxlcyc7XG4gIG5vZGVQYXRoOiBzdHJpbmdbXTtcbiAgcGxpbmtEaXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBXZWJwYWNrIGFuZCBUUyBjb21waWxlciBieSBkZWZhdWx0IHdpbGwgbG9vayB1cCBub2RlX21vZHVsZXMgZnJvbSB1cCBsZXZlbCBkaXJlY3RyaWVzLFxuICogdGhpcyBicmVha3MgUGxpbmsncyB3YXkgb2YgYWRkaW5nIGV4dHJhIG5vZGUgcGF0aCBmb3IgTm9kZS5qcywgVFMgb3IgV2VicGFjaywgaXQgbGVhZHNcbiAqIHRvIHByb2JsZW1hdGljIG1vZHVsZSBsb2FkaW5nIGlzc3VlLlxuICovXG5mdW5jdGlvbiBjaGVja1VwTGV2ZWxOb2RlTW9kdWxlcyhyb290RGlyOiBzdHJpbmcpIHtcbiAgLy8gR28gd2l0aCBwcmVzZXJ2ZVxuICAvLyBjb25zdCBkaXJzID0gW10gYXMgc3RyaW5nW107XG5cbiAgLy8gbGV0IGN1cnJEaXIgPSByb290RGlyO1xuICAvLyBjb25zdCB7cm9vdH0gPSBQYXRoLnBhcnNlKHJvb3REaXIpO1xuICAvLyBkbyB7XG4gIC8vICAgY3VyckRpciA9IFBhdGguZGlybmFtZShjdXJyRGlyKTtcbiAgLy8gICBkaXJzLnB1c2goUGF0aC5yZXNvbHZlKGN1cnJEaXIsICdub2RlX21vZHVsZXMnKSk7XG4gIC8vIH0gd2hpbGUgKGN1cnJEaXIgIT09IHJvb3QpO1xuXG4gIC8vIGNvbnN0IG5vZGVNb2R1bGUgPSBkaXJzLmZpbmQoZGlyID0+IGZzLmV4aXN0c1N5bmMoZGlyKSk7XG4gIC8vIGlmIChub2RlTW9kdWxlKSB7XG4gIC8vICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyhgUGxlYXNlIGluc3RhbGwgaW4gYW5vdGhlciBkaXJlY3RvcnksIG9yIHJlbW92ZSAke2NoYWxrLnJlZChub2RlTW9kdWxlKX0uXFxuYCArXG4gIC8vICAgICBjaGFsay55ZWxsb3coJ0l0IGNvdWxkIGJlIHByb2JsZW1hdGljIGZvciBQbGluayB0byBtYW5hZ2UgbW9ub3JlcG8gZGVwZW5kZW5jeSAodGhyb3VnaCBlbnZpcm9ubWV0IHZhcmlhYmxlIFwiTk9ERV9QQVRIXCIgaW4gcnVudGltZSkuXFxuJyArXG4gIC8vICAgICAnKEFsdGVybmF0aXZlbHksIHlvdSBtYXkgY29uc2lkZXIgaW5zdGFsbCB3aGF0ZXZlciBcImdsb2JhbFwiIGRlcGVuZGVuY3kgd2l0aCBgbnBtIGkgLWdgIGluc3RlYWQgb2YgaGF2aW5nIGRpcmVjdG9yeSBsaWtlICcgK1xuICAvLyAgICAgY2hhbGsucmVkKG5vZGVNb2R1bGUpICsgJyknICkgKTtcblxuICAvLyAgIHRocm93IG5ldyBFcnJvcihjaGFsay5yZWQoJ0ZvdW5kIFwibm9kZV9tb2R1bGVzXCIgaW4gdXBwZXIgbGV2ZWwgZGlyZWN0b3JpZXMsICcgK1xuICAvLyAgICAgJ0luc3RhbGxhdGlvbiBpcyBjYW5jZWxsZWQsIHNvcnJ5IGZvciBpbmNvbnZpZW5pZW5jZS4nKSk7XG4gIC8vIH1cbn1cblxuXG5cbiJdfQ==