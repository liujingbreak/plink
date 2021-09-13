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
exports.packageOfFileFactory = exports.log4File = exports.logConfig = exports.logger = exports.setTsCompilerOptForNodePath = exports.plinkEnv = exports.getSymlinkForPackage = exports.getRootDir = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.cliPackageArgDesc = exports.lookupPackageJson = exports.findPackagesByNames = exports.commander = exports.PlinkCommand = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = exports.ExtensionContext = exports.config = void 0;
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
Object.defineProperty(exports, "plinkEnv", { enumerable: true, get: function () { return misc_1.plinkEnv; } });
var package_list_helper_1 = require("./package-mgr/package-list-helper");
Object.defineProperty(exports, "setTsCompilerOptForNodePath", { enumerable: true, get: function () { return package_list_helper_1.setTsCompilerOptForNodePath; } });
exports.logger = __importStar(require("log4js"));
var log_config_1 = require("./log-config");
Object.defineProperty(exports, "logConfig", { enumerable: true, get: function () { return __importDefault(log_config_1).default; } });
var logger_1 = require("./logger");
Object.defineProperty(exports, "log4File", { enumerable: true, get: function () { return logger_1.log4File; } });
var package_info_gathering_1 = require("./package-mgr/package-info-gathering");
Object.defineProperty(exports, "packageOfFileFactory", { enumerable: true, get: function () { return package_info_gathering_1.packageOfFileFactory; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBR2pDLHdDQUFpRDtBQUF6QyxnSEFBQSxPQUFPLE9BQVU7QUFDekIsc0RBQW9DO0FBQ3BDLG1FQUEyRTtBQUFuRSxxSUFBQSxPQUFPLE9BQW9CO0FBQ25DLHVEQUF1RztBQUF4RSxxSEFBQSxpQkFBaUIsT0FBQTtBQUFFLGdIQUFBLFlBQVksT0FBQTtBQUFFLCtHQUFBLFdBQVcsT0FBQTtBQUMzRSw4Q0FBNEI7QUFDNUIsK0RBQW9FO0FBQTVELGtIQUFBLFlBQVksT0FBQTtBQUNwQix1Q0FBK0M7QUFBdkMsdUhBQUEsT0FBTyxPQUFhO0FBQzVCLHFDQUFtRTtBQUEzRCw0R0FBQSxtQkFBbUIsT0FBQTtBQUFFLDBHQUFBLGlCQUFpQixPQUFBO0FBQzlDLGlDQUE0QztBQUFwQyx3R0FBQSxpQkFBaUIsT0FBQTtBQUN6QiwwQ0FBd0I7QUFDeEIsNERBQTBDO0FBQzFDLG1EQUFzRjtBQUE5RSw2SEFBQSwyQkFBMkIsT0FBQTtBQUFFLHlIQUFBLHVCQUF1QixPQUFBO0FBQzVELHFDQUF3RTtBQUFoRSxrR0FBQSxVQUFVLE9BQUE7QUFBRSw0R0FBQSxvQkFBb0IsT0FBQTtBQUFFLGdHQUFBLFFBQVEsT0FBQTtBQUVsRCx5RUFBOEU7QUFBdEUsa0lBQUEsMkJBQTJCLE9BQUE7QUFDbkMsaURBQWlDO0FBQ2pDLDJDQUFrRDtBQUExQyx3SEFBQSxPQUFPLE9BQWE7QUFDNUIsbUNBQWtDO0FBQTFCLGtHQUFBLFFBQVEsT0FBQTtBQUNoQiwrRUFBMEU7QUFBbEUsOEhBQUEsb0JBQW9CLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmV4cG9ydCB7UGxpbmtTZXR0aW5nc30gZnJvbSAnLi9jb25maWcvY29uZmlnLXNsaWNlJztcbmV4cG9ydCB7UGFja2FnZVNldHRpbmdJbnRlcmZ9IGZyb20gJy4vY29uZmlnL2NvbmZpZy50eXBlcyc7XG5leHBvcnQge2RlZmF1bHQgYXMgY29uZmlnfSBmcm9tICcuL2NvbmZpZy9pbmRleCc7XG5leHBvcnQgKiBmcm9tICcuL3JlcXVpcmUtaW5qZWN0b3JzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBFeHRlbnNpb25Db250ZXh0fSBmcm9tICcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknO1xuZXhwb3J0IHtJbmplY3RvckNvbmZpZ0hhbmRsZXIsIERyUGFja2FnZUluamVjdG9yLCBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuZXhwb3J0ICogZnJvbSAnLi9jbWQvdHlwZXMnO1xuZXhwb3J0IHtQbGlua0NvbW1hbmQsIENsaUV4dGVuc2lvbn0gZnJvbSAnLi9jbWQvb3ZlcnJpZGUtY29tbWFuZGVyJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb21tYW5kZXJ9IGZyb20gJ2NvbW1hbmRlcic7XG5leHBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXMsIGxvb2t1cFBhY2thZ2VKc29ufSBmcm9tICcuL2NtZC91dGlscyc7XG5leHBvcnQge2NsaVBhY2thZ2VBcmdEZXNjfSBmcm9tICcuL2NtZC9jbGknO1xuZXhwb3J0ICogZnJvbSAnLi9zdG9yZSc7XG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmV4cG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzLCBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcn0gZnJvbSAnLi9wYWNrYWdlLXJ1bm5lcic7XG5leHBvcnQge2dldFJvb3REaXIsIGdldFN5bWxpbmtGb3JQYWNrYWdlLCBwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmV4cG9ydCB7UGFja2FnZXNTdGF0ZSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuZXhwb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5leHBvcnQgKiBhcyBsb2dnZXIgZnJvbSAnbG9nNGpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBsb2dDb25maWd9IGZyb20gJy4vbG9nLWNvbmZpZyc7XG5leHBvcnQge2xvZzRGaWxlfSBmcm9tICcuL2xvZ2dlcic7XG5leHBvcnQge3BhY2thZ2VPZkZpbGVGYWN0b3J5fSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuIl19