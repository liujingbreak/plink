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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// import config from './config';
const log4js_1 = __importDefault(require("log4js"));
function default_1(configObj) {
    const { rootPath } = configObj;
    console.log('[log-config] log4js at', require.resolve('log4js'));
    const log4jsConfig = path_1.default.join(rootPath, 'log4js.js');
    if (!fs_extra_1.default.existsSync(log4jsConfig)) {
        console.log('Logging configuration is not found %s', log4jsConfig);
        return;
    }
    fs_extra_1.default.mkdirpSync(path_1.default.resolve(rootPath, 'logs'));
    // const opt = {
    //   cwd: rootPath,
    //   reloadSecs: 9999
    // };
    // if (reloadSec !== undefined)
    //   opt.reloadSecs = reloadSec;
    try {
        var localSetting = require(log4jsConfig);
        if (localSetting.setup instanceof Function) {
            localSetting = localSetting.setup(configObj);
        }
        log4js_1.default.configure(localSetting);
        log4js_1.default.getLogger('logConfig').info(`\n\n-------------- Log ${new Date().toLocaleString()} ----------------\n`);
        Promise.resolve().then(() => __importStar(require('./store'))).then(store => store.startLogging());
    }
    catch (e) {
        console.log(e);
        // console.log('\nIt seems current log4js configure file is outdated, please delete\n\t' + log4jsConfig +
        // 	'\n  and run "drcp init" to get a new one.\n');
        // // log4js.configure({
        // // 	appenders: {out: {type: 'stdout'}},
        // // 	categories: {default: {appenders: ['out'], level: 'info'}}
        // // });
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2xvZy1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsaUNBQWlDO0FBQ2pDLG9EQUE0QjtBQUU1QixtQkFBd0IsU0FBdUI7SUFDN0MsTUFBTSxFQUFDLFFBQVEsRUFBQyxHQUFHLFNBQVMsQ0FBQztJQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNqRSxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN0RCxJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNuRSxPQUFPO0tBQ1I7SUFDRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTlDLGdCQUFnQjtJQUNoQixtQkFBbUI7SUFDbkIscUJBQXFCO0lBQ3JCLEtBQUs7SUFFTCwrQkFBK0I7SUFDL0IsZ0NBQWdDO0lBQ2hDLElBQUk7UUFDRixJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekMsSUFBSSxZQUFZLENBQUMsS0FBSyxZQUFZLFFBQVEsRUFBRTtZQUMxQyxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM5QztRQUVELGdCQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLGdCQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsSUFBSSxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMvRyxrREFBTyxTQUFTLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDdkQ7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZix5R0FBeUc7UUFDekcsbURBQW1EO1FBQ25ELHdCQUF3QjtRQUN4QiwwQ0FBMEM7UUFDMUMsaUVBQWlFO1FBQ2pFLFNBQVM7S0FDVjtBQUNILENBQUM7QUFuQ0QsNEJBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtEcmNwU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbmZpZ09iajogRHJjcFNldHRpbmdzKSB7XG4gIGNvbnN0IHtyb290UGF0aH0gPSBjb25maWdPYmo7XG4gIGNvbnNvbGUubG9nKCdbbG9nLWNvbmZpZ10gbG9nNGpzIGF0JywgcmVxdWlyZS5yZXNvbHZlKCdsb2c0anMnKSk7XG4gIGNvbnN0IGxvZzRqc0NvbmZpZyA9IFBhdGguam9pbihyb290UGF0aCwgJ2xvZzRqcy5qcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nNGpzQ29uZmlnKSkge1xuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIGNvbmZpZ3VyYXRpb24gaXMgbm90IGZvdW5kICVzJywgbG9nNGpzQ29uZmlnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZnMubWtkaXJwU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsICdsb2dzJykpO1xuXG4gIC8vIGNvbnN0IG9wdCA9IHtcbiAgLy8gICBjd2Q6IHJvb3RQYXRoLFxuICAvLyAgIHJlbG9hZFNlY3M6IDk5OTlcbiAgLy8gfTtcblxuICAvLyBpZiAocmVsb2FkU2VjICE9PSB1bmRlZmluZWQpXG4gIC8vICAgb3B0LnJlbG9hZFNlY3MgPSByZWxvYWRTZWM7XG4gIHRyeSB7XG4gICAgdmFyIGxvY2FsU2V0dGluZyA9IHJlcXVpcmUobG9nNGpzQ29uZmlnKTtcbiAgICBpZiAobG9jYWxTZXR0aW5nLnNldHVwIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIGxvY2FsU2V0dGluZyA9IGxvY2FsU2V0dGluZy5zZXR1cChjb25maWdPYmopO1xuICAgIH1cblxuICAgIGxvZzRqcy5jb25maWd1cmUobG9jYWxTZXR0aW5nKTtcbiAgICBsb2c0anMuZ2V0TG9nZ2VyKCdsb2dDb25maWcnKS5pbmZvKGBcXG5cXG4tLS0tLS0tLS0tLS0tLSBMb2cgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCl9IC0tLS0tLS0tLS0tLS0tLS1cXG5gKTtcbiAgICBpbXBvcnQoJy4vc3RvcmUnKS50aGVuKHN0b3JlID0+IHN0b3JlLnN0YXJ0TG9nZ2luZygpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIC8vIGNvbnNvbGUubG9nKCdcXG5JdCBzZWVtcyBjdXJyZW50IGxvZzRqcyBjb25maWd1cmUgZmlsZSBpcyBvdXRkYXRlZCwgcGxlYXNlIGRlbGV0ZVxcblxcdCcgKyBsb2c0anNDb25maWcgK1xuICAgIC8vIFx0J1xcbiAgYW5kIHJ1biBcImRyY3AgaW5pdFwiIHRvIGdldCBhIG5ldyBvbmUuXFxuJyk7XG4gICAgLy8gLy8gbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgLy8gLy8gXHRhcHBlbmRlcnM6IHtvdXQ6IHt0eXBlOiAnc3Rkb3V0J319LFxuICAgIC8vIC8vIFx0Y2F0ZWdvcmllczoge2RlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnaW5mbyd9fVxuICAgIC8vIC8vIH0pO1xuICB9XG59XG4iXX0=