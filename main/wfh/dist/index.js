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
exports.packageOfFileFactory = exports.log4File = exports.logConfig = exports.logger = exports.setTsCompilerOptForNodePath = exports.plinkEnv = exports.getSymlinkForPackage = exports.getRootDir = exports.runServer = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.forceForkAsPreserveSymlink = exports.forkAsPreserveSymlink = exports.cliPackageArgDesc = exports.lookupPackageJson = exports.findPackagesByNames = exports.commander = exports.PlinkCommand = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = exports.ExtensionContext = exports.config = void 0;
__exportStar(require("./config-handler"), exports);
var index_1 = require("./config/index");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return __importDefault(index_1).default; } });
__exportStar(require("../../packages/require-injector/dist"), exports);
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
/** Plink's child process management: start/stop, log message handling ... */
__exportStar(require("./utils/bootstrap-process"), exports);
var fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
Object.defineProperty(exports, "forkAsPreserveSymlink", { enumerable: true, get: function () { return __importDefault(fork_for_preserve_symlink_1).default; } });
Object.defineProperty(exports, "forceForkAsPreserveSymlink", { enumerable: true, get: function () { return fork_for_preserve_symlink_1.forkFile; } });
/** Express HTTP server */
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
/** Given a file path, find out which package it belongs to */
var package_info_gathering_1 = require("./package-mgr/package-info-gathering");
Object.defineProperty(exports, "packageOfFileFactory", { enumerable: true, get: function () { return package_info_gathering_1.packageOfFileFactory; } });
//# sourceMappingURL=index.js.map