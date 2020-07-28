"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function default_1(configObj) {
    const { rootPath, log4jsReloadSeconds: reloadSec } = configObj;
    const log4js = require(path_1.default.resolve('node_modules/log4js'));
    // var log4jsConfig = Path.resolve(__dirname, 'gulp/templates/log4js.json');
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
        // var consoleLogger = log4js.getLogger('>');
        // console.log = consoleLogger.info.bind(consoleLogger);
        log4js.getLogger('logConfig').info(`\n\n-------------- ${new Date().toLocaleString()} ----------------\n`);
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
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2xvZy1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUd4QixtQkFBd0IsU0FBdUI7SUFDN0MsTUFBTSxFQUFDLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUMsR0FBRyxTQUFTLENBQUM7SUFDN0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO0lBQzVELDRFQUE0RTtJQUM1RSxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN0RCxJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNuRSxPQUFPO0tBQ1I7SUFDRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTlDLE1BQU0sR0FBRyxHQUFHO1FBQ1YsR0FBRyxFQUFFLFFBQVE7UUFDYixVQUFVLEVBQUUsSUFBSTtLQUNqQixDQUFDO0lBRUYsSUFBSSxTQUFTLEtBQUssU0FBUztRQUN6QixHQUFHLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztJQUM3QixJQUFJO1FBQ0YsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pDLElBQUksWUFBWSxDQUFDLEtBQUssWUFBWSxRQUFRLEVBQUU7WUFDMUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDOUM7UUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwQyw2Q0FBNkM7UUFDN0Msd0RBQXdEO1FBQ3hELE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0tBQzVHO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2YseUdBQXlHO1FBQ3pHLG1EQUFtRDtRQUNuRCx3QkFBd0I7UUFDeEIsMENBQTBDO1FBQzFDLGlFQUFpRTtRQUNqRSxTQUFTO0tBQ1Y7QUFDSCxDQUFDO0FBcENELDRCQW9DQztBQUFBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge0RyY3BTZXR0aW5nc30gZnJvbSAnLi4vY29uZmlnLWhhbmRsZXInO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb25maWdPYmo6IERyY3BTZXR0aW5ncykge1xuICBjb25zdCB7cm9vdFBhdGgsIGxvZzRqc1JlbG9hZFNlY29uZHM6IHJlbG9hZFNlY30gPSBjb25maWdPYmo7XG4gIGNvbnN0IGxvZzRqcyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvbG9nNGpzJykpO1xuICAvLyB2YXIgbG9nNGpzQ29uZmlnID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2d1bHAvdGVtcGxhdGVzL2xvZzRqcy5qc29uJyk7XG4gIGNvbnN0IGxvZzRqc0NvbmZpZyA9IFBhdGguam9pbihyb290UGF0aCwgJ2xvZzRqcy5qcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9nNGpzQ29uZmlnKSkge1xuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIGNvbmZpZ3VyYXRpb24gaXMgbm90IGZvdW5kICVzJywgbG9nNGpzQ29uZmlnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgZnMubWtkaXJwU3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsICdsb2dzJykpO1xuXG4gIGNvbnN0IG9wdCA9IHtcbiAgICBjd2Q6IHJvb3RQYXRoLFxuICAgIHJlbG9hZFNlY3M6IDk5OTlcbiAgfTtcblxuICBpZiAocmVsb2FkU2VjICE9PSB1bmRlZmluZWQpXG4gICAgb3B0LnJlbG9hZFNlY3MgPSByZWxvYWRTZWM7XG4gIHRyeSB7XG4gICAgdmFyIGxvY2FsU2V0dGluZyA9IHJlcXVpcmUobG9nNGpzQ29uZmlnKTtcbiAgICBpZiAobG9jYWxTZXR0aW5nLnNldHVwIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIGxvY2FsU2V0dGluZyA9IGxvY2FsU2V0dGluZy5zZXR1cChjb25maWdPYmopO1xuICAgIH1cbiAgICBsb2c0anMuY29uZmlndXJlKGxvY2FsU2V0dGluZywgb3B0KTtcbiAgICAvLyB2YXIgY29uc29sZUxvZ2dlciA9IGxvZzRqcy5nZXRMb2dnZXIoJz4nKTtcbiAgICAvLyBjb25zb2xlLmxvZyA9IGNvbnNvbGVMb2dnZXIuaW5mby5iaW5kKGNvbnNvbGVMb2dnZXIpO1xuICAgIGxvZzRqcy5nZXRMb2dnZXIoJ2xvZ0NvbmZpZycpLmluZm8oYFxcblxcbi0tLS0tLS0tLS0tLS0tICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfSAtLS0tLS0tLS0tLS0tLS0tXFxuYCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAvLyBjb25zb2xlLmxvZygnXFxuSXQgc2VlbXMgY3VycmVudCBsb2c0anMgY29uZmlndXJlIGZpbGUgaXMgb3V0ZGF0ZWQsIHBsZWFzZSBkZWxldGVcXG5cXHQnICsgbG9nNGpzQ29uZmlnICtcbiAgICAvLyBcdCdcXG4gIGFuZCBydW4gXCJkcmNwIGluaXRcIiB0byBnZXQgYSBuZXcgb25lLlxcbicpO1xuICAgIC8vIC8vIGxvZzRqcy5jb25maWd1cmUoe1xuICAgIC8vIC8vIFx0YXBwZW5kZXJzOiB7b3V0OiB7dHlwZTogJ3N0ZG91dCd9fSxcbiAgICAvLyAvLyBcdGNhdGVnb3JpZXM6IHtkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2luZm8nfX1cbiAgICAvLyAvLyB9KTtcbiAgfVxufTtcbiJdfQ==