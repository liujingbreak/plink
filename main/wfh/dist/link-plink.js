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
            fs.unlinkSync(path_1.default.resolve('node_modules/@wfh/plink'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1wbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOztHQUVHO0FBQ0gsdUNBQXlCO0FBQ3pCLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDUCxRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUxRDs7O0dBR0c7QUFDSixTQUFnQixRQUFRO0lBQ3RCLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsbUJBQW1CO0lBRXRFLGlFQUFpRTtJQUNsRSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUN0RCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDeEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO1lBQ2hDLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUM7WUFDckMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXBDLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQixFQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELDBEQUEwRDtTQUM1RDtRQUNELEVBQUUsQ0FBQyxXQUFXLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsRUFDMUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFLGVBQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNqRjtJQUNELHNDQUFzQztJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0lBRXZFLGtGQUFrRjtJQUNsRixtRUFBbUU7SUFDbkUscUNBQXFDO0lBQ3JDLDBFQUEwRTtJQUMxRSxtQ0FBbUM7SUFDbkMsOEZBQThGO0lBQzlGLG1EQUFtRDtJQUNuRCx3Q0FBd0M7SUFDeEMsaURBQWlEO0lBQ2pELE1BQU07SUFDTixXQUFXO0lBQ1gsNEZBQTRGO0lBQzVGLG1EQUFtRDtJQUNuRCx3Q0FBd0M7SUFDeEMsK0NBQStDO0lBQy9DLElBQUk7QUFDUCxDQUFDO0FBckNELDRCQXFDQztBQUVELFNBQVMsV0FBVyxDQUFDLElBQVk7SUFDL0IsSUFBSTtRQUNGLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtZQUN2QyxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDaEU7YUFBTTtZQUNMLE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtLQUNGO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLElBQUksQ0FBQztLQUNiO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVG8gZGV2ZWxvcCBQbGluaywgd2UgbmVlZCB0byBzeW1saW5rIFBsaW5rIHJlcG8gdG8gYSB3b3Jrc3BhY2UgZGlyZWN0b3J5XG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmV4cG9ydCBjb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5cbiAvKipcbiAgKiAxLiBjcmVhdGUgc3ltbGluayBub2RlX21vZHVsZXMvQHdmaC9wbGluayAtLT4gZGlyZWN0b3J5IFwibWFpblwiXG4gICogMi4gY3JlYXRlIHN5bWxpbmsgcGFyZW50IGRpcmVjdG9yeSBvZiBcIm1haW5cIj4vbm9kZV9tb2R1bGVzIC0tPiBub2RlX21vZHVsZXNcbiAgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW5rRHJjcCgpIHtcbiAgY29uc3Qgc291cmNlRGlyID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uJyk7IC8vIGRpcmVjdG9yeSBcIm1haW5cIlxuXG4gICAvLyAxLiBjcmVhdGUgc3ltbGluayBub2RlX21vZHVsZXMvQHdmaC9wbGluayAtLT4gZGlyZWN0b3J5IFwibWFpblwiXG4gIGNvbnN0IHRhcmdldCA9IGdldFJlYWxQYXRoKCdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpO1xuICBpZiAodGFyZ2V0ICE9PSBzb3VyY2VEaXIpIHtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcycpKVxuICAgICAgZnMubWtkaXJTeW5jKCdub2RlX21vZHVsZXMnKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcy9Ad2ZoJykpXG4gICAgICBmcy5ta2RpclN5bmMoJ25vZGVfbW9kdWxlcy9Ad2ZoJyk7XG5cbiAgICBpZiAodGFyZ2V0ICE9IG51bGwpIHtcbiAgICAgIGZzLnVubGlua1N5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvQHdmaC9wbGluaycpKTtcbiAgICAgICAvLyBmcy51bmxpbmtTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsnKSk7XG4gICAgfVxuICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaCcpLCBzb3VyY2VEaXIpLFxuICAgICAgIFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ0B3ZmgnLCAncGxpbmsnKSwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaC9wbGluaycpICsgJyBpcyBjcmVhdGVkJyk7XG5cbiAgIC8vIC8vIDIuIGNyZWF0ZSBzeW1saW5rIDxwYXJlbnQgZGlyZWN0b3J5IG9mIFwibWFpblwiPi9ub2RlX21vZHVsZXMgLS0+IG5vZGVfbW9kdWxlc1xuICAgLy8gY29uc3QgdG9wTW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHNvdXJjZURpciwgJy4uL25vZGVfbW9kdWxlcycpO1xuICAgLy8gaWYgKGZzLmV4aXN0c1N5bmModG9wTW9kdWxlRGlyKSkge1xuICAgLy8gICBpZiAoZnMucmVhbHBhdGhTeW5jKHRvcE1vZHVsZURpcikgIT09IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJykpIHtcbiAgIC8vICAgICBmcy51bmxpbmtTeW5jKHRvcE1vZHVsZURpcik7XG4gICAvLyAgICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodG9wTW9kdWxlRGlyKSwgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSksXG4gICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAsIG5vLWNvbnNvbGVcbiAgIC8vICAgICBjb25zb2xlLmxvZyh0b3BNb2R1bGVEaXIgKyAnIGlzIGNyZWF0ZWQnKTtcbiAgIC8vICAgfVxuICAgLy8gfSBlbHNlIHtcbiAgIC8vICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodG9wTW9kdWxlRGlyKSwgUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnKSksXG4gICAvLyAgICAgdG9wTW9kdWxlRGlyLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAsIG5vLWNvbnNvbGVcbiAgIC8vICAgY29uc29sZS5sb2codG9wTW9kdWxlRGlyICsgJyBpcyBjcmVhdGVkJyk7XG4gICAvLyB9XG59XG5cbmZ1bmN0aW9uIGdldFJlYWxQYXRoKGZpbGU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGZzLnJlYWRsaW5rU3luYyhmaWxlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoZmlsZSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==