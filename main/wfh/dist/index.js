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
exports.packageOfFileFactory = exports.log4File = exports.logConfig = exports.logger = exports.setTsCompilerOptForNodePath = exports.plinkEnv = exports.getSymlinkForPackage = exports.getRootDir = exports.runServer = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.cliPackageArgDesc = exports.lookupPackageJson = exports.findPackagesByNames = exports.commander = exports.PlinkCommand = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = exports.ExtensionContext = exports.config = void 0;
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
Object.defineProperty(exports, "runServer", { enumerable: true, get: function () { return package_runner_1.runServer; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFpQztBQUdqQyx3Q0FBaUQ7QUFBekMsZ0hBQUEsT0FBTyxPQUFVO0FBQ3pCLHNEQUFvQztBQUNwQyxtRUFBMkU7QUFBbkUscUlBQUEsT0FBTyxPQUFvQjtBQUNuQyx1REFBdUc7QUFBeEUscUhBQUEsaUJBQWlCLE9BQUE7QUFBRSxnSEFBQSxZQUFZLE9BQUE7QUFBRSwrR0FBQSxXQUFXLE9BQUE7QUFDM0UsOENBQTRCO0FBQzVCLCtEQUFvRTtBQUE1RCxrSEFBQSxZQUFZLE9BQUE7QUFDcEIsdUNBQStDO0FBQXZDLHVIQUFBLE9BQU8sT0FBYTtBQUM1QixxQ0FBbUU7QUFBM0QsNEdBQUEsbUJBQW1CLE9BQUE7QUFBRSwwR0FBQSxpQkFBaUIsT0FBQTtBQUM5QyxpQ0FBNEM7QUFBcEMsd0dBQUEsaUJBQWlCLE9BQUE7QUFDekIsMENBQXdCO0FBQ3hCLDREQUEwQztBQUMxQyxtREFBaUc7QUFBekYsNkhBQUEsMkJBQTJCLE9BQUE7QUFBRSx5SEFBQSx1QkFBdUIsT0FBQTtBQUFFLDJHQUFBLFNBQVMsT0FBQTtBQUN2RSxxQ0FBd0U7QUFBaEUsa0dBQUEsVUFBVSxPQUFBO0FBQUUsNEdBQUEsb0JBQW9CLE9BQUE7QUFBRSxnR0FBQSxRQUFRLE9BQUE7QUFFbEQseUVBQThFO0FBQXRFLGtJQUFBLDJCQUEyQixPQUFBO0FBQ25DLGlEQUFpQztBQUNqQywyQ0FBa0Q7QUFBMUMsd0hBQUEsT0FBTyxPQUFhO0FBQzVCLG1DQUFrQztBQUExQixrR0FBQSxRQUFRLE9BQUE7QUFDaEIsK0VBQTBFO0FBQWxFLDhIQUFBLG9CQUFvQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5leHBvcnQge1BsaW5rU2V0dGluZ3MsIFBsaW5rU2V0dGluZ3MgYXMgRHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy9jb25maWctc2xpY2UnO1xuZXhwb3J0IHtQYWNrYWdlU2V0dGluZ0ludGVyZn0gZnJvbSAnLi9jb25maWcvY29uZmlnLnR5cGVzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb25maWd9IGZyb20gJy4vY29uZmlnL2luZGV4JztcbmV4cG9ydCAqIGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuZXhwb3J0IHtkZWZhdWx0IGFzIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5leHBvcnQge0luamVjdG9yQ29uZmlnSGFuZGxlciwgRHJQYWNrYWdlSW5qZWN0b3IsIG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3J9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5leHBvcnQgKiBmcm9tICcuL2NtZC90eXBlcyc7XG5leHBvcnQge1BsaW5rQ29tbWFuZCwgQ2xpRXh0ZW5zaW9ufSBmcm9tICcuL2NtZC9vdmVycmlkZS1jb21tYW5kZXInO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGNvbW1hbmRlcn0gZnJvbSAnY29tbWFuZGVyJztcbmV4cG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lcywgbG9va3VwUGFja2FnZUpzb259IGZyb20gJy4vY21kL3V0aWxzJztcbmV4cG9ydCB7Y2xpUGFja2FnZUFyZ0Rlc2N9IGZyb20gJy4vY21kL2NsaSc7XG5leHBvcnQgKiBmcm9tICcuL3N0b3JlJztcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuZXhwb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMsIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yLCBydW5TZXJ2ZXJ9IGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuZXhwb3J0IHtnZXRSb290RGlyLCBnZXRTeW1saW5rRm9yUGFja2FnZSwgcGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5leHBvcnQge1BhY2thZ2VzU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmV4cG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuZXhwb3J0ICogYXMgbG9nZ2VyIGZyb20gJ2xvZzRqcyc7XG5leHBvcnQge2RlZmF1bHQgYXMgbG9nQ29uZmlnfSBmcm9tICcuL2xvZy1jb25maWcnO1xuZXhwb3J0IHtsb2c0RmlsZX0gZnJvbSAnLi9sb2dnZXInO1xuZXhwb3J0IHtwYWNrYWdlT2ZGaWxlRmFjdG9yeX0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbiJdfQ==