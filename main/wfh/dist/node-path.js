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
    const nodePath = setupNodePath(rootDir, symlinkDir, isDrcpSymlink);
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
function setupNodePath(rootDir, symlinkDir, isDrcpSymlink) {
    const nodePaths = [Path.resolve(rootDir, 'node_modules')];
    if (symlinkDir) {
        nodePaths.unshift(symlinkDir);
    }
    if (rootDir !== process.cwd()) {
        nodePaths.unshift(Path.resolve(process.cwd(), 'node_modules'));
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
    const pathArray = lodash_1.default.uniq(nodePaths);
    process.env.NODE_PATH = pathArray.join(Path.delimiter);
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.gray('[node-path] NODE_PATH', process.env.NODE_PATH));
    require('module').Module._initPaths();
    return pathArray;
}
loaderHooks_1.hookCommonJsRequire((file, target, req, resolve) => {
    if (target === 'log4js') {
        return log4js_1.default;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QiwrQ0FBa0Q7QUFDbEQsb0RBQXVCO0FBRXZCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztBQUV2QixJQUFJLENBQUMsVUFBVSxFQUFFO0lBQ2YsVUFBVSxHQUFHLElBQUksQ0FBQztJQUNsQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUV2Qzs7O09BR0c7SUFDSCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFL0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztRQUNwQyx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLDhGQUE4RjtZQUNySCxzQkFBc0I7WUFDdEIsNEVBQTRFLENBQUMsQ0FBQyxDQUFDO0tBQ2hGO1NBQU07UUFDTCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLDhCQUE4QixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztLQUN0RjtJQUNELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFaEcsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25GLElBQUksVUFBVSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUM1QyxVQUFVLEdBQUcsSUFBSSxDQUFDO0tBQ25CO0lBQ0QsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNwSixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNuRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2xFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFhLENBQUMsQ0FBQztJQUUxRyxnSEFBZ0g7SUFDaEgsb0JBQW9CO0lBQ3BCLE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO0lBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0QseUJBQXlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFCO0tBQ0Y7SUFDRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDNUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQyxPQUFPLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRU4sTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNsRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVk7UUFDdEIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsd0NBQXdDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztDQUN4RztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQWU7SUFDbEMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLEVBQUU7UUFDckUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUU7WUFDckIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNwQixNQUFNO1NBQ1A7UUFDRCxHQUFHLEdBQUcsU0FBUyxDQUFDO0tBQ2pCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGFBQWEsQ0FBQyxPQUFlLEVBQUUsVUFBeUIsRUFBRSxhQUFzQjtJQUN2RixNQUFNLFNBQVMsR0FBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDcEUsSUFBSSxVQUFVLEVBQUU7UUFDZCxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQy9CO0lBQ0QsSUFBSSxPQUFPLEtBQUssT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQzdCLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztLQUNoRTtJQUdEOzs7O09BSUc7SUFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFRLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLENBQUM7SUFDL0csSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRTtRQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDOUQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QjtLQUNGO0lBRUQsTUFBTSxTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkQsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDeEUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUN0QyxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDO0FBaUJELGlDQUFtQixDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDakQsSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFO1FBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztLQUNmO0FBQ0gsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7aG9va0NvbW1vbkpzUmVxdWlyZX0gZnJvbSAnLi9sb2FkZXJIb29rcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5sZXQgZW52U2V0RG9uZSA9IGZhbHNlO1xuXG5pZiAoIWVudlNldERvbmUpIHtcbiAgZW52U2V0RG9uZSA9IHRydWU7XG4gIHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuXG4gIC8qKiBlbnZpcm9ubWVudCB2YXJhaWJsZSBfX3BsaW5rIGlzIHVzZWQgZm9yIHNoYXJlIGJhc2ljIFBsaW5rIGluZm9ybWF0aW9uIGJldHdlZW46XG4gICAqIC0gTm9kZS5qcyBcIi1yXCIgcHJlbG9hZCBtb2R1bGUgYW5kIG5vcm1hbCBtb2R1bGVzLCBlc3BlY2lhbGx5IHNldHRpbmcgTk9ERV9QQVRIIGluIFwiLXJcIiBtb2R1bGVcbiAgICogLSBNYWluIHByb2Nlc3MgYW5kIGZvcmtlZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXJcbiAgICovXG4gIGNvbnN0IGV4aXRpbmdFbnZWYXIgPSBwcm9jZXNzLmVudi5fX3BsaW5rID8gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rKSBhcyBQbGlua0VudiA6IG51bGw7XG5cbiAgaWYgKCFwcm9jZXNzLmVudi5QTElOS19EQVRBX0RJUikge1xuICAgIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSID0gJ2Rpc3QnO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkoJ1tub2RlLXBhdGhdIEJ5IGRlZmF1bHQsIFBsaW5rIHJlYWRzIGFuZCB3cml0ZXMgc3RhdGUgZmlsZXMgaW4gZGlyZWN0b3J5IFwiPHJvb3QtZGlyPi9kaXN0XCIsXFxuJyArXG4gICAgJ3lvdSBtYXkgY2hhbmdlIGl0IGJ5JyArXG4gICAgJyBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlIFBMSU5LX0RBVEFfRElSIHRvIGFub3RoZXIgcmVsYXRpdmUgZGlyZWN0b3J5JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkoJ1tub2RlLXBhdGhdIFBMSU5LX0RBVEFfRElSOiAnICsgcHJvY2Vzcy5lbnYuUExJTktfREFUQV9ESVIpKTtcbiAgfVxuICBjb25zdCByb290RGlyID0gZXhpdGluZ0VudlZhciA/IGV4aXRpbmdFbnZWYXIucm9vdERpciA6IGZpbmRSb290RGlyKHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKTtcblxuICBsZXQgc3ltbGlua0RpciA9IGV4aXRpbmdFbnZWYXIgPyBleGl0aW5nRW52VmFyLnN5bWxpbmtEaXIgOiBQYXRoLnJlc29sdmUoJy5saW5rcycpO1xuICBpZiAoc3ltbGlua0RpciAmJiAhZnMuZXhpc3RzU3luYyhzeW1saW5rRGlyKSkge1xuICAgIHN5bWxpbmtEaXIgPSBudWxsO1xuICB9XG4gIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBleGl0aW5nRW52VmFyID8gZXhpdGluZ0VudlZhci5pc0RyY3BTeW1saW5rIDogZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgY29uc3Qgbm9kZVBhdGggPSBzZXR1cE5vZGVQYXRoKHJvb3REaXIsIHN5bWxpbmtEaXIsIGlzRHJjcFN5bWxpbmspO1xuICBjb25zdCBkaXN0RGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHByb2Nlc3MuZW52LlBMSU5LX0RBVEFfRElSKTtcbiAgcHJvY2Vzcy5lbnYuX19wbGluayA9IEpTT04uc3RyaW5naWZ5KHtkaXN0RGlyLCBpc0RyY3BTeW1saW5rLCByb290RGlyLCBzeW1saW5rRGlyLCBub2RlUGF0aH0gYXMgUGxpbmtFbnYpO1xuXG4gIC8vIGRlbGV0ZSByZWdpc3RlciBmcm9tIGNvbW1hbmQgbGluZSBvcHRpb24sIHRvIGF2b2lkIGNoaWxkIHByb2Nlc3MgZ2V0IHRoaXMgb3B0aW9uLCBzaW5jZSB3ZSBoYXZlIE5PREVfUEFUSCBzZXRcbiAgLy8gZm9yIGNoaWxkIHByb2Nlc3NcbiAgY29uc3QgZGVsZXRlRXhlY0FyZ0lkeDogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBwcm9jZXNzLmV4ZWNBcmd2Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpIDwgbCAtIDEgJiYgL14oPzotcnwtLXJlcXVpcmUpJC8udGVzdChwcm9jZXNzLmV4ZWNBcmd2W2ldKSAmJlxuICAgICAgL15Ad2ZoXFwvcGxpbmtcXC9yZWdpc3RlciQvLnRlc3QocHJvY2Vzcy5leGVjQXJndltpICsgMV0pKSB7XG4gICAgICBkZWxldGVFeGVjQXJnSWR4LnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGRlbGV0ZUV4ZWNBcmdJZHgucmVkdWNlKChvZmZzZXQsIGRlbGV0ZUlkeCkgPT4ge1xuICAgIHByb2Nlc3MuZXhlY0FyZ3Yuc3BsaWNlKGRlbGV0ZUlkeCArIG9mZnNldCwgMik7XG4gICAgcmV0dXJuIG9mZnNldCArIDI7XG4gIH0sIDApO1xuXG4gIGNvbnN0IGVudk9wdGlvbnMgPSBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPyBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpIDogW107XG4gIHByb2Nlc3MuZW52Lk5PREVfT1BUSU9OUyA9XG4gICAgZW52T3B0aW9ucy5maWx0ZXIoaXRlbSA9PiAhLygtcnwtLXJlcXVpcmUpXFxzK0B3ZmhcXC9wbGlua1xcL3JlZ2lzdGVyLy50ZXN0KGl0ZW0pKS5qb2luKFBhdGguZGVsaW1pdGVyKTtcbn1cblxuZnVuY3Rpb24gZmluZFJvb3REaXIoZGlzdERpcjogc3RyaW5nKSB7XG4gIGxldCBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGRpciwgZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKSkpIHtcbiAgICBjb25zdCBwYXJlbnREaXIgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50RGlyID09PSBkaXIpIHtcbiAgICAgIGRpciA9IHByb2Nlc3MuY3dkKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGlyID0gcGFyZW50RGlyO1xuICB9XG4gIHJldHVybiBkaXI7XG59XG5cbi8qKlxuICogaWYgY3dkIGlzIG5vdCByb290IGRpcmVjdG9yeSwgdGhlbiBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPGN3ZD4vbm9kZV9tb2R1bGVzOjxyb290RGlyPi9zeW1saW5rcyxcbiAqIG90aGVyd2lzZSBhcHBlbmQgTk9ERV9QQVRIIHdpdGggPHJvb3REaXI+L25vZGVfbW9kdWxlc1xuICogQHBhcmFtIHJvb3REaXIgXG4gKiBAcGFyYW0gaXNEcmNwU3ltbGluayBcbiAqL1xuZnVuY3Rpb24gc2V0dXBOb2RlUGF0aChyb290RGlyOiBzdHJpbmcsIHN5bWxpbmtEaXI6IHN0cmluZyB8IG51bGwsIGlzRHJjcFN5bWxpbms6IGJvb2xlYW4pIHtcbiAgY29uc3Qgbm9kZVBhdGhzOiBzdHJpbmdbXSA9IFtQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpXTtcbiAgaWYgKHN5bWxpbmtEaXIpIHtcbiAgICBub2RlUGF0aHMudW5zaGlmdChzeW1saW5rRGlyKTtcbiAgfVxuICBpZiAocm9vdERpciAhPT0gcHJvY2Vzcy5jd2QoKSkge1xuICAgIG5vZGVQYXRocy51bnNoaWZ0KFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnbm9kZV9tb2R1bGVzJykpO1xuICB9XG5cblxuICAvKipcbiAgICogU29tZWhvdyB3aGVuIEkgaW5zdGFsbCBAd2ZoL3BsaW5rIGluIGFuIG5ldyBkaXJlY3RvcnksIG5wbSBkb2VzIG5vdCBkZWR1cGUgZGVwZW5kZW5jaWVzIGZyb20gXG4gICAqIEB3ZmgvcGxpbmsvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB1cCB0byBjdXJyZW50IG5vZGVfbW9kdWxlcyBkaXJlY3RvcnksIHJlc3VsdHMgaW4gTU9EVUxFX05PVF9GT1VORFxuICAgKiBmcm9tIEB3ZmgvcGxpbmsvcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlIGZvciByeGpzXG4gICAqL1xuICBub2RlUGF0aHMucHVzaChmcy5yZWFscGF0aFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIhLCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSkgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwcm9jZXNzLmVudi5OT0RFX1BBVEguc3BsaXQoUGF0aC5kZWxpbWl0ZXIpKSB7XG4gICAgICBub2RlUGF0aHMucHVzaChwYXRoKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBwYXRoQXJyYXkgPSBfLnVuaXEobm9kZVBhdGhzKTtcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gcGF0aEFycmF5LmpvaW4oUGF0aC5kZWxpbWl0ZXIpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW25vZGUtcGF0aF0gTk9ERV9QQVRIJywgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIKSk7XG4gIHJlcXVpcmUoJ21vZHVsZScpLk1vZHVsZS5faW5pdFBhdGhzKCk7XG4gIHJldHVybiBwYXRoQXJyYXk7XG59XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBwcmVkZWZpbmVkIGJ5XG5gYGBcbmNvbnN0IHtpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyLCByb290RGlyLCBub2RlUGF0aCwgZGlzdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbmBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsaW5rRW52IHtcbiAgZGlzdERpcjogc3RyaW5nO1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICByb290RGlyOiBzdHJpbmc7XG4gIHN5bWxpbmtEaXI6IHN0cmluZyB8IG51bGw7XG4gIG5vZGVQYXRoOiBzdHJpbmdbXTtcbn1cblxuXG5ob29rQ29tbW9uSnNSZXF1aXJlKChmaWxlLCB0YXJnZXQsIHJlcSwgcmVzb2x2ZSkgPT4ge1xuICBpZiAodGFyZ2V0ID09PSAnbG9nNGpzJykge1xuICAgIHJldHVybiBsb2c0anM7XG4gIH1cbn0pO1xuIl19