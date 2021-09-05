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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1wbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOztHQUVHO0FBQ0gsdUNBQXlCO0FBQ3pCLGdEQUFrQztBQUNsQyxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ1AsUUFBQSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFMUQ7OztHQUdHO0FBQ0osU0FBZ0IsUUFBUTtJQUN0QixNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtJQUV0RSxpRUFBaUU7SUFDbEUsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDdEQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO1FBQ3hCLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztZQUNoQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ3JDLEVBQUUsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUVwQyxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDbEIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztZQUMxRCwwREFBMEQ7U0FDM0Q7UUFDRCxFQUFFLENBQUMsV0FBVyxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQzFFLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRSxlQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDakY7SUFDRCxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQztJQUV2RSxrRkFBa0Y7SUFDbEYsbUVBQW1FO0lBQ25FLHFDQUFxQztJQUNyQywwRUFBMEU7SUFDMUUsbUNBQW1DO0lBQ25DLDhGQUE4RjtJQUM5RixtREFBbUQ7SUFDbkQsd0NBQXdDO0lBQ3hDLGlEQUFpRDtJQUNqRCxNQUFNO0lBQ04sV0FBVztJQUNYLDRGQUE0RjtJQUM1RixtREFBbUQ7SUFDbkQsd0NBQXdDO0lBQ3hDLCtDQUErQztJQUMvQyxJQUFJO0FBQ1AsQ0FBQztBQXJDRCw0QkFxQ0M7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFZO0lBQy9CLElBQUk7UUFDRixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDdkMsT0FBTyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO2FBQU07WUFDTCxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7S0FDRjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxJQUFJLENBQUM7S0FDYjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRvIGRldmVsb3AgUGxpbmssIHdlIG5lZWQgdG8gc3ltbGluayBQbGluayByZXBvIHRvIGEgd29ya3NwYWNlIGRpcmVjdG9yeVxuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBmc0V4dCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG4gLyoqXG4gICogMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICAqIDIuIGNyZWF0ZSBzeW1saW5rIHBhcmVudCBkaXJlY3Rvcnkgb2YgXCJtYWluXCI+L25vZGVfbW9kdWxlcyAtLT4gbm9kZV9tb2R1bGVzXG4gICovXG5leHBvcnQgZnVuY3Rpb24gbGlua0RyY3AoKSB7XG4gIGNvbnN0IHNvdXJjZURpciA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpOyAvLyBkaXJlY3RvcnkgXCJtYWluXCJcblxuICAgLy8gMS4gY3JlYXRlIHN5bWxpbmsgbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsgLS0+IGRpcmVjdG9yeSBcIm1haW5cIlxuICBjb25zdCB0YXJnZXQgPSBnZXRSZWFsUGF0aCgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKTtcbiAgaWYgKHRhcmdldCAhPT0gc291cmNlRGlyKSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMnKSlcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzJyk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKCdub2RlX21vZHVsZXMvQHdmaCcpKVxuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMvQHdmaCcpO1xuXG4gICAgaWYgKHRhcmdldCAhPSBudWxsKSB7XG4gICAgICBmc0V4dC5yZW1vdmVTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSk7XG4gICAgICAvLyBmcy51bmxpbmtTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSk7XG4gICAgfVxuICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaCcpLCBzb3VyY2VEaXIpLFxuICAgICAgIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ0B3ZmgnLCAncGxpbmsnKSwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaC9wbGluaycpICsgJyBpcyBjcmVhdGVkJyk7XG5cbiAgIC8vIC8vIDIuIGNyZWF0ZSBzeW1saW5rIDxwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICAgLy8gY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHNvdXJjZURpciwgJy4uL25vZGVfbW9kdWxlcycpO1xuICAgLy8gaWYgKGZzLmV4aXN0c1N5bmModG9wTW9kdWxlRGlyKSkge1xuICAgLy8gICBpZiAoZnMucmVhbHBhdGhTeW5jKHRvcE1vZHVsZURpcikgIT09IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpIHtcbiAgIC8vICAgICBmcy51bmxpbmtTeW5jKHRvcE1vZHVsZURpcik7XG4gICAvLyAgICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodG9wTW9kdWxlRGlyKSwgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSksXG4gICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAsIG5vLWNvbnNvbGVcbiAgIC8vICAgICBjb25zb2xlLmxvZyh0b3BNb2R1bGVEaXIgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgIC8vICAgfVxuICAgLy8gfSBlbHNlIHtcbiAgIC8vICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodG9wTW9kdWxlRGlyKSwgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSksXG4gICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAsIG5vLWNvbnNvbGVcbiAgIC8vICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gICAvLyB9XG59XG5cbmZ1bmN0aW9uIGdldFJlYWxQYXRoKGZpbGU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGZzLnJlYWRsaW5rU3luYyhmaWxlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoZmlsZSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==