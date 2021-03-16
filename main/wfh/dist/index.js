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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.logger = exports.setTsCompilerOptForNodePath = exports.getSymlinkForPackage = exports.getRootDir = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.cliPackageArgDesc = exports.lookupPackageJson = exports.findPackagesByNames = exports.commander = exports.PlinkCommand = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = exports.ExtensionContext = exports.config = void 0;
__exportStar(require("./config-handler"), exports);
var index_1 = require("./config/index");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return __importDefault(index_1).default; } });
__exportStar(require("./require-injectors"), exports);
var node_package_api_1 = require("./package-mgr/node-package-api");
Object.defineProperty(exports, "ExtensionContext", { enumerable: true, get: function () { return __importDefault(node_package_api_1).default; } });
var injector_factory_1 = require("./injector-factory");
Object.defineProperty(exports, "DrPackageInjector", { enumerable: true, get: function () { return injector_factory_1.DrPackageInjector; } });
Object.defineProperty(exports, "nodeInjector", { enumerable: true, get: function () { return injector_factory_1.nodeInjector; } });
Object.defineProperty(exports, "webInjector", { enumerable: true, get: function () { return injector_factory_1.webInjector; } });
__exportStar(require("./cmd/types"), exports);
var override_commander_1 = require("./cmd/override-commander");
Object.defineProperty(exports, "PlinkCommand", { enumerable: true, get: function () { return override_commander_1.PlinkCommand; } });
var commander_1 = require("commander");
Object.defineProperty(exports, "commander", { enumerable: true, get: function () { return __importDefault(commander_1).default; } });
var utils_1 = require("./cmd/utils");
Object.defineProperty(exports, "findPackagesByNames", { enumerable: true, get: function () { return utils_1.findPackagesByNames; } });
Object.defineProperty(exports, "lookupPackageJson", { enumerable: true, get: function () { return utils_1.lookupPackageJson; } });
var cli_1 = require("./cmd/cli");
Object.defineProperty(exports, "cliPackageArgDesc", { enumerable: true, get: function () { return cli_1.cliPackageArgDesc; } });
__exportStar(require("./store"), exports);
__exportStar(require("./utils/bootstrap-process"), exports);
var package_runner_1 = require("./package-runner");
Object.defineProperty(exports, "initInjectorForNodePackages", { enumerable: true, get: function () { return package_runner_1.initInjectorForNodePackages; } });
Object.defineProperty(exports, "prepareLazyNodeInjector", { enumerable: true, get: function () { return package_runner_1.prepareLazyNodeInjector; } });
var misc_1 = require("./utils/misc");
Object.defineProperty(exports, "getRootDir", { enumerable: true, get: function () { return misc_1.getRootDir; } });
Object.defineProperty(exports, "getSymlinkForPackage", { enumerable: true, get: function () { return misc_1.getSymlinkForPackage; } });
var package_list_helper_1 = require("./package-mgr/package-list-helper");
Object.defineProperty(exports, "setTsCompilerOptForNodePath", { enumerable: true, get: function () { return package_list_helper_1.setTsCompilerOptForNodePath; } });
exports.logger = __importStar(require("log4js"));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBRWpDLHdDQUFpRDtBQUF6QyxnSEFBQSxPQUFPLE9BQVU7QUFDekIsc0RBQW9DO0FBQ3BDLG1FQUEyRTtBQUFuRSxxSUFBQSxPQUFPLE9BQW9CO0FBQ25DLHVEQUF1RztBQUF4RSxxSEFBQSxpQkFBaUIsT0FBQTtBQUFFLGdIQUFBLFlBQVksT0FBQTtBQUFFLCtHQUFBLFdBQVcsT0FBQTtBQUMzRSw4Q0FBNEI7QUFDNUIsK0RBQW9FO0FBQTVELGtIQUFBLFlBQVksT0FBQTtBQUNwQix1Q0FBK0M7QUFBdkMsdUhBQUEsT0FBTyxPQUFhO0FBQzVCLHFDQUFtRTtBQUEzRCw0R0FBQSxtQkFBbUIsT0FBQTtBQUFFLDBHQUFBLGlCQUFpQixPQUFBO0FBQzlDLGlDQUE0QztBQUFwQyx3R0FBQSxpQkFBaUIsT0FBQTtBQUN6QiwwQ0FBd0I7QUFDeEIsNERBQTBDO0FBQzFDLG1EQUFzRjtBQUE5RSw2SEFBQSwyQkFBMkIsT0FBQTtBQUFFLHlIQUFBLHVCQUF1QixPQUFBO0FBQzVELHFDQUE4RDtBQUF0RCxrR0FBQSxVQUFVLE9BQUE7QUFBRSw0R0FBQSxvQkFBb0IsT0FBQTtBQUV4Qyx5RUFBOEU7QUFBdEUsa0lBQUEsMkJBQTJCLE9BQUE7QUFDbkMsaURBQWlDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5leHBvcnQge0RyY3BTZXR0aW5ncyBhcyBQbGlua1NldHRpbmdzfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb25maWd9IGZyb20gJy4vY29uZmlnL2luZGV4JztcbmV4cG9ydCAqIGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuZXhwb3J0IHtkZWZhdWx0IGFzIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5leHBvcnQge0luamVjdG9yQ29uZmlnSGFuZGxlciwgRHJQYWNrYWdlSW5qZWN0b3IsIG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3J9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5leHBvcnQgKiBmcm9tICcuL2NtZC90eXBlcyc7XG5leHBvcnQge1BsaW5rQ29tbWFuZCwgQ2xpRXh0ZW5zaW9ufSBmcm9tICcuL2NtZC9vdmVycmlkZS1jb21tYW5kZXInO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGNvbW1hbmRlcn0gZnJvbSAnY29tbWFuZGVyJztcbmV4cG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lcywgbG9va3VwUGFja2FnZUpzb259IGZyb20gJy4vY21kL3V0aWxzJztcbmV4cG9ydCB7Y2xpUGFja2FnZUFyZ0Rlc2N9IGZyb20gJy4vY21kL2NsaSc7XG5leHBvcnQgKiBmcm9tICcuL3N0b3JlJztcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuZXhwb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMsIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yfSBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmV4cG9ydCB7Z2V0Um9vdERpciwgZ2V0U3ltbGlua0ZvclBhY2thZ2V9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5leHBvcnQge1BhY2thZ2VzU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmV4cG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuZXhwb3J0ICogYXMgbG9nZ2VyIGZyb20gJ2xvZzRqcyc7XG4iXX0=