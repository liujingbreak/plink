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
exports.linkDrcp = exports.isWin32 = void 0;
/**
 * To develop Plink, we need to symlink Plink repo to a workspace directory
 */
const fs = __importStar(require("fs"));
const fsExt = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
/**
 * 1. create symlink node_modules/@wfh/plink --> directory "main"
 * 2. create symlink parent directory of "main">/node_modules --> node_modules
 */
function linkDrcp() {
    const sourceDir = path_1.default.resolve(__dirname, '../..'); // directory "main"
    // 1. create symlink node_modules/@wfh/plink --> directory "main"
    const target = getRealPath('node_modules/@wfh/plink');
    if (target !== sourceDir) {
        if (!fs.existsSync('node_modules'))
            fs.mkdirSync('node_modules');
        if (!fs.existsSync('node_modules/@wfh'))
            fs.mkdirSync('node_modules/@wfh');
        if (target != null) {
            fsExt.removeSync(path_1.default.resolve('node_modules/@wfh/plink'));
            // fs.unlinkSync(Path.resolve('node_modules/@wfh/plink'));
        }
        fs.symlinkSync(path_1.default.relative(path_1.default.resolve('node_modules', '@wfh'), sourceDir), path_1.default.resolve('node_modules', '@wfh', 'plink'), exports.isWin32 ? 'junction' : 'dir');
    }
    // eslint-disable-next-line no-console
    console.log(path_1.default.resolve('node_modules', '@wfh/plink') + ' is created');
    // // 2. create symlink <parent directory of "main">/node_modules --> node_modules
    // const topModuleDir = Path.resolve(sourceDir, '../node_modules');
    // if (fs.existsSync(topModuleDir)) {
    //   if (fs.realpathSync(topModuleDir) !== Path.resolve('node_modules')) {
    //     fs.unlinkSync(topModuleDir);
    //     fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
    //     topModuleDir, isWin32 ? 'junction' : 'dir');
    // eslint-disable-next-line , no-console
    //     console.log(topModuleDir + ' is created');
    //   }
    // } else {
    //   fs.symlinkSync(Path.relative(Path.dirname(topModuleDir), Path.resolve('node_modules')),
    //     topModuleDir, isWin32 ? 'junction' : 'dir');
    // eslint-disable-next-line , no-console
    //   console.log(topModuleDir + ' is created');
    // }
}
exports.linkDrcp = linkDrcp;
function getRealPath(file) {
    try {
        if (fs.lstatSync(file).isSymbolicLink()) {
            return path_1.default.resolve(path_1.default.dirname(file), fs.readlinkSync(file));
        }
        else {
            return path_1.default.resolve(file);
        }
    }
    catch (e) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1wbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7R0FFRztBQUNILHVDQUF5QjtBQUN6QixnREFBa0M7QUFDbEMsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNQLFFBQUEsT0FBTyxHQUFHLFlBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRTFEOzs7R0FHRztBQUNKLFNBQWdCLFFBQVE7SUFDdEIsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUI7SUFFdEUsaUVBQWlFO0lBQ2xFLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3RELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtRQUN4QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7WUFDaEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztZQUNyQyxFQUFFLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFcEMsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLEtBQUssQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7WUFDMUQsMERBQTBEO1NBQzNEO1FBQ0QsRUFBRSxDQUFDLFdBQVcsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUMxRSxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUUsZUFBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ2pGO0lBQ0Qsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUM7SUFFdkUsa0ZBQWtGO0lBQ2xGLG1FQUFtRTtJQUNuRSxxQ0FBcUM7SUFDckMsMEVBQTBFO0lBQzFFLG1DQUFtQztJQUNuQyw4RkFBOEY7SUFDOUYsbURBQW1EO0lBQ25ELHdDQUF3QztJQUN4QyxpREFBaUQ7SUFDakQsTUFBTTtJQUNOLFdBQVc7SUFDWCw0RkFBNEY7SUFDNUYsbURBQW1EO0lBQ25ELHdDQUF3QztJQUN4QywrQ0FBK0M7SUFDL0MsSUFBSTtBQUNQLENBQUM7QUFyQ0QsNEJBcUNDO0FBRUQsU0FBUyxXQUFXLENBQUMsSUFBWTtJQUMvQixJQUFJO1FBQ0YsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lBQ3ZDLE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRTthQUFNO1lBQ0wsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNCO0tBQ0Y7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sSUFBSSxDQUFDO0tBQ2I7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUbyBkZXZlbG9wIFBsaW5rLCB3ZSBuZWVkIHRvIHN5bWxpbmsgUGxpbmsgcmVwbyB0byBhIHdvcmtzcGFjZSBkaXJlY3RvcnlcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgZnNFeHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuIC8qKlxuICAqIDEuIGNyZWF0ZSBzeW1saW5rIG5vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rIC0tPiBkaXJlY3RvcnkgXCJtYWluXCJcbiAgKiAyLiBjcmVhdGUgc3ltbGluayBwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmtEcmNwKCkge1xuICBjb25zdCBzb3VyY2VEaXIgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4nKTsgLy8gZGlyZWN0b3J5IFwibWFpblwiXG5cbiAgIC8vIDEuIGNyZWF0ZSBzeW1saW5rIG5vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rIC0tPiBkaXJlY3RvcnkgXCJtYWluXCJcbiAgY29uc3QgdGFyZ2V0ID0gZ2V0UmVhbFBhdGgoJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJyk7XG4gIGlmICh0YXJnZXQgIT09IHNvdXJjZURpcikge1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzJykpXG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcycpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYygnbm9kZV9tb2R1bGVzL0B3ZmgnKSlcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzL0B3ZmgnKTtcblxuICAgIGlmICh0YXJnZXQgIT0gbnVsbCkge1xuICAgICAgZnNFeHQucmVtb3ZlU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpO1xuICAgICAgLy8gZnMudW5saW5rU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rJykpO1xuICAgIH1cbiAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ0B3ZmgnKSwgc291cmNlRGlyKSxcbiAgICAgICBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdAd2ZoJywgJ3BsaW5rJyksIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ0B3ZmgvcGxpbmsnKSArICcgaXMgY3JlYXRlZCcpO1xuXG4gICAvLyAvLyAyLiBjcmVhdGUgc3ltbGluayA8cGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAgIC8vIGNvbnN0IHRvcE1vZHVsZURpciA9IFBhdGgucmVzb2x2ZShzb3VyY2VEaXIsICcuLi9ub2RlX21vZHVsZXMnKTtcbiAgIC8vIGlmIChmcy5leGlzdHNTeW5jKHRvcE1vZHVsZURpcikpIHtcbiAgIC8vICAgaWYgKGZzLnJlYWxwYXRoU3luYyh0b3BNb2R1bGVEaXIpICE9PSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAvLyAgICAgZnMudW5saW5rU3luYyh0b3BNb2R1bGVEaXIpO1xuICAgLy8gICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAgLy8gICAgIHRvcE1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgLCBuby1jb25zb2xlXG4gICAvLyAgICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gICAvLyAgIH1cbiAgIC8vIH0gZWxzZSB7XG4gICAvLyAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRvcE1vZHVsZURpciksIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpLFxuICAgLy8gICAgIHRvcE1vZHVsZURpciwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgLCBuby1jb25zb2xlXG4gICAvLyAgIGNvbnNvbGUubG9nKHRvcE1vZHVsZURpciArICcgaXMgY3JlYXRlZCcpO1xuICAgLy8gfVxufVxuXG5mdW5jdGlvbiBnZXRSZWFsUGF0aChmaWxlOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBmcy5yZWFkbGlua1N5bmMoZmlsZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKGZpbGUpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=