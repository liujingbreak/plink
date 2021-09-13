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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBR2pDLHdDQUFpRDtBQUF6QyxnSEFBQSxPQUFPLE9BQVU7QUFDekIsc0RBQW9DO0FBQ3BDLG1FQUEyRTtBQUFuRSxxSUFBQSxPQUFPLE9BQW9CO0FBQ25DLHVEQUF1RztBQUF4RSxxSEFBQSxpQkFBaUIsT0FBQTtBQUFFLGdIQUFBLFlBQVksT0FBQTtBQUFFLCtHQUFBLFdBQVcsT0FBQTtBQUMzRSw4Q0FBNEI7QUFDNUIsK0RBQW9FO0FBQTVELGtIQUFBLFlBQVksT0FBQTtBQUNwQix1Q0FBK0M7QUFBdkMsdUhBQUEsT0FBTyxPQUFhO0FBQzVCLHFDQUFtRTtBQUEzRCw0R0FBQSxtQkFBbUIsT0FBQTtBQUFFLDBHQUFBLGlCQUFpQixPQUFBO0FBQzlDLGlDQUE0QztBQUFwQyx3R0FBQSxpQkFBaUIsT0FBQTtBQUN6QiwwQ0FBd0I7QUFDeEIsNERBQTBDO0FBQzFDLG1EQUFzRjtBQUE5RSw2SEFBQSwyQkFBMkIsT0FBQTtBQUFFLHlIQUFBLHVCQUF1QixPQUFBO0FBQzVELHFDQUF3RTtBQUFoRSxrR0FBQSxVQUFVLE9BQUE7QUFBRSw0R0FBQSxvQkFBb0IsT0FBQTtBQUFFLGdHQUFBLFFBQVEsT0FBQTtBQUVsRCx5RUFBOEU7QUFBdEUsa0lBQUEsMkJBQTJCLE9BQUE7QUFDbkMsaURBQWlDO0FBQ2pDLDJDQUFrRDtBQUExQyx3SEFBQSxPQUFPLE9BQWE7QUFDNUIsbUNBQWtDO0FBQTFCLGtHQUFBLFFBQVEsT0FBQTtBQUNoQiwrRUFBMEU7QUFBbEUsOEhBQUEsb0JBQW9CLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmV4cG9ydCB7UGxpbmtTZXR0aW5ncywgUGxpbmtTZXR0aW5ncyBhcyBEcmNwU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnL2NvbmZpZy1zbGljZSc7XG5leHBvcnQge1BhY2thZ2VTZXR0aW5nSW50ZXJmfSBmcm9tICcuL2NvbmZpZy9jb25maWcudHlwZXMnO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGNvbmZpZ30gZnJvbSAnLi9jb25maWcvaW5kZXgnO1xuZXhwb3J0ICogZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5leHBvcnQge2RlZmF1bHQgYXMgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbmV4cG9ydCB7SW5qZWN0b3JDb25maWdIYW5kbGVyLCBEclBhY2thZ2VJbmplY3Rvciwgbm9kZUluamVjdG9yLCB3ZWJJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmV4cG9ydCAqIGZyb20gJy4vY21kL3R5cGVzJztcbmV4cG9ydCB7UGxpbmtDb21tYW5kLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5leHBvcnQge2RlZmF1bHQgYXMgY29tbWFuZGVyfSBmcm9tICdjb21tYW5kZXInO1xuZXhwb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzLCBsb29rdXBQYWNrYWdlSnNvbn0gZnJvbSAnLi9jbWQvdXRpbHMnO1xuZXhwb3J0IHtjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnLi9jbWQvY2xpJztcbmV4cG9ydCAqIGZyb20gJy4vc3RvcmUnO1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5leHBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcywgcHJlcGFyZUxhenlOb2RlSW5qZWN0b3J9IGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuZXhwb3J0IHtnZXRSb290RGlyLCBnZXRTeW1saW5rRm9yUGFja2FnZSwgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5leHBvcnQge1BhY2thZ2VzU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmV4cG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuZXhwb3J0ICogYXMgbG9nZ2VyIGZyb20gJ2xvZzRqcyc7XG5leHBvcnQge2RlZmF1bHQgYXMgbG9nQ29uZmlnfSBmcm9tICcuL2xvZy1jb25maWcnO1xuZXhwb3J0IHtsb2c0RmlsZX0gZnJvbSAnLi9sb2dnZXInO1xuZXhwb3J0IHtwYWNrYWdlT2ZGaWxlRmFjdG9yeX0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbiJdfQ==