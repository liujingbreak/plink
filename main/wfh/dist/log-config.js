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
// eslint-disable  no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// import config from './config';
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger('plink.log-config');
function default_1(configObj) {
    const { rootPath } = configObj;
    log.info('[log-config] log4js at', require.resolve('log4js'));
    const log4jsConfig = path_1.default.join(rootPath, 'log4js.js');
    if (!fs_extra_1.default.existsSync(log4jsConfig)) {
        log.info('Logging configuration is not found %s', log4jsConfig);
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
        let localSetting = require(log4jsConfig);
        if (localSetting.setup instanceof Function) {
            localSetting = localSetting.setup(configObj);
        }
        log4js_1.default.configure(localSetting);
        log4js_1.default.getLogger('logConfig').info(`\n\n-------------- Log ${new Date().toLocaleString()} ----------------\n`);
        void Promise.resolve().then(() => __importStar(require('./store'))).then(store => store.startLogging());
    }
    catch (e) {
        log.error(e);
        // log.info('\nIt seems current log4js configure file is outdated, please delete\n\t' + log4jsConfig +
        // 	'\n  and run "drcp init" to get a new one.\n');
        // // log4js.configure({
        // // 	appenders: {out: {type: 'stdout'}},
        // // 	categories: {default: {appenders: ['out'], level: 'info'}}
        // // });
    }
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xvZy1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHdEQUEwQjtBQUMxQixnREFBd0I7QUFFeEIsaUNBQWlDO0FBQ2pDLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBRWpELG1CQUF3QixTQUF3QjtJQUM5QyxNQUFNLEVBQUMsUUFBUSxFQUFDLEdBQUcsU0FBUyxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlELE1BQU0sWUFBWSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUNoQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hFLE9BQU87S0FDUjtJQUNELGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFOUMsZ0JBQWdCO0lBQ2hCLG1CQUFtQjtJQUNuQixxQkFBcUI7SUFDckIsS0FBSztJQUVMLCtCQUErQjtJQUMvQixnQ0FBZ0M7SUFDaEMsSUFBSTtRQUNGLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN6QyxJQUFJLFlBQVksQ0FBQyxLQUFLLFlBQVksUUFBUSxFQUFFO1lBQzFDLFlBQVksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzlDO1FBRUQsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0IsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLDBCQUEwQixJQUFJLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQy9HLEtBQUssa0RBQU8sU0FBUyxJQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0tBQzVEO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2Isc0dBQXNHO1FBQ3RHLG1EQUFtRDtRQUNuRCx3QkFBd0I7UUFDeEIsMENBQTBDO1FBQzFDLGlFQUFpRTtRQUNqRSxTQUFTO0tBQ1Y7QUFDSCxDQUFDO0FBbkNELDRCQW1DQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlXG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1BsaW5rU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5sb2ctY29uZmlnJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbmZpZ09iajogUGxpbmtTZXR0aW5ncykge1xuICBjb25zdCB7cm9vdFBhdGh9ID0gY29uZmlnT2JqO1xuICBsb2cuaW5mbygnW2xvZy1jb25maWddIGxvZzRqcyBhdCcsIHJlcXVpcmUucmVzb2x2ZSgnbG9nNGpzJykpO1xuICBjb25zdCBsb2c0anNDb25maWcgPSBQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2c0anMuanMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvZzRqc0NvbmZpZykpIHtcbiAgICBsb2cuaW5mbygnTG9nZ2luZyBjb25maWd1cmF0aW9uIGlzIG5vdCBmb3VuZCAlcycsIGxvZzRqc0NvbmZpZyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICAvLyBjb25zdCBvcHQgPSB7XG4gIC8vICAgY3dkOiByb290UGF0aCxcbiAgLy8gICByZWxvYWRTZWNzOiA5OTk5XG4gIC8vIH07XG5cbiAgLy8gaWYgKHJlbG9hZFNlYyAhPT0gdW5kZWZpbmVkKVxuICAvLyAgIG9wdC5yZWxvYWRTZWNzID0gcmVsb2FkU2VjO1xuICB0cnkge1xuICAgIGxldCBsb2NhbFNldHRpbmcgPSByZXF1aXJlKGxvZzRqc0NvbmZpZyk7XG4gICAgaWYgKGxvY2FsU2V0dGluZy5zZXR1cCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICBsb2NhbFNldHRpbmcgPSBsb2NhbFNldHRpbmcuc2V0dXAoY29uZmlnT2JqKTtcbiAgICB9XG5cbiAgICBsb2c0anMuY29uZmlndXJlKGxvY2FsU2V0dGluZyk7XG4gICAgbG9nNGpzLmdldExvZ2dlcignbG9nQ29uZmlnJykuaW5mbyhgXFxuXFxuLS0tLS0tLS0tLS0tLS0gTG9nICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfSAtLS0tLS0tLS0tLS0tLS0tXFxuYCk7XG4gICAgdm9pZCBpbXBvcnQoJy4vc3RvcmUnKS50aGVuKHN0b3JlID0+IHN0b3JlLnN0YXJ0TG9nZ2luZygpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihlKTtcbiAgICAvLyBsb2cuaW5mbygnXFxuSXQgc2VlbXMgY3VycmVudCBsb2c0anMgY29uZmlndXJlIGZpbGUgaXMgb3V0ZGF0ZWQsIHBsZWFzZSBkZWxldGVcXG5cXHQnICsgbG9nNGpzQ29uZmlnICtcbiAgICAvLyBcdCdcXG4gIGFuZCBydW4gXCJkcmNwIGluaXRcIiB0byBnZXQgYSBuZXcgb25lLlxcbicpO1xuICAgIC8vIC8vIGxvZzRqcy5jb25maWd1cmUoe1xuICAgIC8vIC8vIFx0YXBwZW5kZXJzOiB7b3V0OiB7dHlwZTogJ3N0ZG91dCd9fSxcbiAgICAvLyAvLyBcdGNhdGVnb3JpZXM6IHtkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2luZm8nfX1cbiAgICAvLyAvLyB9KTtcbiAgfVxufVxuIl19