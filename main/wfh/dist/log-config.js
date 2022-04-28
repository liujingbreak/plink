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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2xvZy1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qix3REFBMEI7QUFDMUIsZ0RBQXdCO0FBRXhCLGlDQUFpQztBQUNqQyxvREFBNEI7QUFDNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUVqRCxtQkFBd0IsU0FBd0I7SUFDOUMsTUFBTSxFQUFDLFFBQVEsRUFBQyxHQUFHLFNBQVMsQ0FBQztJQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN0RCxJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoRSxPQUFPO0tBQ1I7SUFDRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTlDLGdCQUFnQjtJQUNoQixtQkFBbUI7SUFDbkIscUJBQXFCO0lBQ3JCLEtBQUs7SUFFTCwrQkFBK0I7SUFDL0IsZ0NBQWdDO0lBQ2hDLElBQUk7UUFDRixJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekMsSUFBSSxZQUFZLENBQUMsS0FBSyxZQUFZLFFBQVEsRUFBRTtZQUMxQyxZQUFZLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM5QztRQUVELGdCQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLGdCQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsSUFBSSxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMvRyxLQUFLLGtEQUFPLFNBQVMsSUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztLQUM1RDtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNiLHNHQUFzRztRQUN0RyxtREFBbUQ7UUFDbkQsd0JBQXdCO1FBQ3hCLDBDQUEwQztRQUMxQyxpRUFBaUU7UUFDakUsU0FBUztLQUNWO0FBQ0gsQ0FBQztBQW5DRCw0QkFtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBlc2xpbnQtZGlzYWJsZSAgbm8tY29uc29sZVxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQbGlua1NldHRpbmdzfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbi8vIGltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsubG9nLWNvbmZpZycpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb25maWdPYmo6IFBsaW5rU2V0dGluZ3MpIHtcbiAgY29uc3Qge3Jvb3RQYXRofSA9IGNvbmZpZ09iajtcbiAgbG9nLmluZm8oJ1tsb2ctY29uZmlnXSBsb2c0anMgYXQnLCByZXF1aXJlLnJlc29sdmUoJ2xvZzRqcycpKTtcbiAgY29uc3QgbG9nNGpzQ29uZmlnID0gUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9nNGpzLmpzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhsb2c0anNDb25maWcpKSB7XG4gICAgbG9nLmluZm8oJ0xvZ2dpbmcgY29uZmlndXJhdGlvbiBpcyBub3QgZm91bmQgJXMnLCBsb2c0anNDb25maWcpO1xuICAgIHJldHVybjtcbiAgfVxuICBmcy5ta2RpcnBTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgJ2xvZ3MnKSk7XG5cbiAgLy8gY29uc3Qgb3B0ID0ge1xuICAvLyAgIGN3ZDogcm9vdFBhdGgsXG4gIC8vICAgcmVsb2FkU2VjczogOTk5OVxuICAvLyB9O1xuXG4gIC8vIGlmIChyZWxvYWRTZWMgIT09IHVuZGVmaW5lZClcbiAgLy8gICBvcHQucmVsb2FkU2VjcyA9IHJlbG9hZFNlYztcbiAgdHJ5IHtcbiAgICBsZXQgbG9jYWxTZXR0aW5nID0gcmVxdWlyZShsb2c0anNDb25maWcpO1xuICAgIGlmIChsb2NhbFNldHRpbmcuc2V0dXAgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgbG9jYWxTZXR0aW5nID0gbG9jYWxTZXR0aW5nLnNldHVwKGNvbmZpZ09iaik7XG4gICAgfVxuXG4gICAgbG9nNGpzLmNvbmZpZ3VyZShsb2NhbFNldHRpbmcpO1xuICAgIGxvZzRqcy5nZXRMb2dnZXIoJ2xvZ0NvbmZpZycpLmluZm8oYFxcblxcbi0tLS0tLS0tLS0tLS0tIExvZyAke25ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKX0gLS0tLS0tLS0tLS0tLS0tLVxcbmApO1xuICAgIHZvaWQgaW1wb3J0KCcuL3N0b3JlJykudGhlbihzdG9yZSA9PiBzdG9yZS5zdGFydExvZ2dpbmcoKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoZSk7XG4gICAgLy8gbG9nLmluZm8oJ1xcbkl0IHNlZW1zIGN1cnJlbnQgbG9nNGpzIGNvbmZpZ3VyZSBmaWxlIGlzIG91dGRhdGVkLCBwbGVhc2UgZGVsZXRlXFxuXFx0JyArIGxvZzRqc0NvbmZpZyArXG4gICAgLy8gXHQnXFxuICBhbmQgcnVuIFwiZHJjcCBpbml0XCIgdG8gZ2V0IGEgbmV3IG9uZS5cXG4nKTtcbiAgICAvLyAvLyBsb2c0anMuY29uZmlndXJlKHtcbiAgICAvLyAvLyBcdGFwcGVuZGVyczoge291dDoge3R5cGU6ICdzdGRvdXQnfX0sXG4gICAgLy8gLy8gXHRjYXRlZ29yaWVzOiB7ZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdpbmZvJ319XG4gICAgLy8gLy8gfSk7XG4gIH1cbn1cbiJdfQ==