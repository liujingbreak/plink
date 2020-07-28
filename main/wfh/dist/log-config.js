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
const config_1 = __importDefault(require("./config"));
function default_1(configObj) {
    const { rootPath, log4jsReloadSeconds: reloadSec } = configObj;
    const log4js = require(path_1.default.resolve(config_1.default().rootPath, 'node_modules/log4js'));
    const log4jsConfig = path_1.default.join(rootPath, 'log4js.js');
    if (!fs_extra_1.default.existsSync(log4jsConfig)) {
        console.log('Logging configuration is not found %s', log4jsConfig);
        return;
    }
    fs_extra_1.default.mkdirpSync(path_1.default.resolve(rootPath, 'logs'));
    const opt = {
        cwd: rootPath,
        reloadSecs: 9999
    };
    if (reloadSec !== undefined)
        opt.reloadSecs = reloadSec;
    try {
        var localSetting = require(log4jsConfig);
        if (localSetting.setup instanceof Function) {
            localSetting = localSetting.setup(configObj);
        }
        log4js.configure(localSetting, opt);
        log4js.getLogger('logConfig').info(`\n\n-------------- Log ${new Date().toLocaleString()} ----------------\n`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xvZy1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsc0RBQThCO0FBRTlCLG1CQUF3QixTQUF1QjtJQUM3QyxNQUFNLEVBQUMsUUFBUSxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBQyxHQUFHLFNBQVMsQ0FBQztJQUM3RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUUvRSxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN0RCxJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNuRSxPQUFPO0tBQ1I7SUFDRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTlDLE1BQU0sR0FBRyxHQUFHO1FBQ1YsR0FBRyxFQUFFLFFBQVE7UUFDYixVQUFVLEVBQUUsSUFBSTtLQUNqQixDQUFDO0lBRUYsSUFBSSxTQUFTLEtBQUssU0FBUztRQUN6QixHQUFHLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztJQUM3QixJQUFJO1FBQ0YsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pDLElBQUksWUFBWSxDQUFDLEtBQUssWUFBWSxRQUFRLEVBQUU7WUFDMUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDOUM7UUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUVwQyxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsSUFBSSxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMvRyxrREFBTyxTQUFTLElBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDdkQ7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZix5R0FBeUc7UUFDekcsbURBQW1EO1FBQ25ELHdCQUF3QjtRQUN4QiwwQ0FBMEM7UUFDMUMsaUVBQWlFO1FBQ2pFLFNBQVM7S0FDVjtBQUNILENBQUM7QUFwQ0QsNEJBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtEcmNwU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbmZpZ09iajogRHJjcFNldHRpbmdzKSB7XG4gIGNvbnN0IHtyb290UGF0aCwgbG9nNGpzUmVsb2FkU2Vjb25kczogcmVsb2FkU2VjfSA9IGNvbmZpZ09iajtcbiAgY29uc3QgbG9nNGpzID0gcmVxdWlyZShQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMvbG9nNGpzJykpO1xuXG4gIGNvbnN0IGxvZzRqc0NvbmZpZyA9IFBhdGguam9pbihyb290UGF0aCwgJ2xvZzRqcy5qcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nNGpzQ29uZmlnKSkge1xuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIGNvbmZpZ3VyYXRpb24gaXMgbm90IGZvdW5kICVzJywgbG9nNGpzQ29uZmlnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZnMubWtkaXJwU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsICdsb2dzJykpO1xuXG4gIGNvbnN0IG9wdCA9IHtcbiAgICBjd2Q6IHJvb3RQYXRoLFxuICAgIHJlbG9hZFNlY3M6IDk5OTlcbiAgfTtcblxuICBpZiAocmVsb2FkU2VjICE9PSB1bmRlZmluZWQpXG4gICAgb3B0LnJlbG9hZFNlY3MgPSByZWxvYWRTZWM7XG4gIHRyeSB7XG4gICAgdmFyIGxvY2FsU2V0dGluZyA9IHJlcXVpcmUobG9nNGpzQ29uZmlnKTtcbiAgICBpZiAobG9jYWxTZXR0aW5nLnNldHVwIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIGxvY2FsU2V0dGluZyA9IGxvY2FsU2V0dGluZy5zZXR1cChjb25maWdPYmopO1xuICAgIH1cbiAgICBsb2c0anMuY29uZmlndXJlKGxvY2FsU2V0dGluZywgb3B0KTtcblxuICAgIGxvZzRqcy5nZXRMb2dnZXIoJ2xvZ0NvbmZpZycpLmluZm8oYFxcblxcbi0tLS0tLS0tLS0tLS0tIExvZyAke25ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKX0gLS0tLS0tLS0tLS0tLS0tLVxcbmApO1xuICAgIGltcG9ydCgnLi9zdG9yZScpLnRoZW4oc3RvcmUgPT4gc3RvcmUuc3RhcnRMb2dnaW5nKCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5sb2coZSk7XG4gICAgLy8gY29uc29sZS5sb2coJ1xcbkl0IHNlZW1zIGN1cnJlbnQgbG9nNGpzIGNvbmZpZ3VyZSBmaWxlIGlzIG91dGRhdGVkLCBwbGVhc2UgZGVsZXRlXFxuXFx0JyArIGxvZzRqc0NvbmZpZyArXG4gICAgLy8gXHQnXFxuICBhbmQgcnVuIFwiZHJjcCBpbml0XCIgdG8gZ2V0IGEgbmV3IG9uZS5cXG4nKTtcbiAgICAvLyAvLyBsb2c0anMuY29uZmlndXJlKHtcbiAgICAvLyAvLyBcdGFwcGVuZGVyczoge291dDoge3R5cGU6ICdzdGRvdXQnfX0sXG4gICAgLy8gLy8gXHRjYXRlZ29yaWVzOiB7ZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdpbmZvJ319XG4gICAgLy8gLy8gfSk7XG4gIH1cbn1cbiJdfQ==