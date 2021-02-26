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
exports.logger = exports.setTsCompilerOptForNodePath = exports.getSymlinkForPackage = exports.getRootDir = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.cliPackageArgDesc = exports.lookupPackageJson = exports.findPackagesByNames = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = exports.config = void 0;
__exportStar(require("./config-handler"), exports);
var index_1 = require("./config/index");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return __importDefault(index_1).default; } });
__exportStar(require("./require-injectors"), exports);
var injector_factory_1 = require("./injector-factory");
Object.defineProperty(exports, "DrPackageInjector", { enumerable: true, get: function () { return injector_factory_1.DrPackageInjector; } });
Object.defineProperty(exports, "nodeInjector", { enumerable: true, get: function () { return injector_factory_1.nodeInjector; } });
Object.defineProperty(exports, "webInjector", { enumerable: true, get: function () { return injector_factory_1.webInjector; } });
__exportStar(require("./cmd/types"), exports);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBQ2pDLHdDQUFpRDtBQUF6QyxnSEFBQSxPQUFPLE9BQVU7QUFDekIsc0RBQW9DO0FBQ3BDLHVEQUF1RztBQUF4RSxxSEFBQSxpQkFBaUIsT0FBQTtBQUFFLGdIQUFBLFlBQVksT0FBQTtBQUFFLCtHQUFBLFdBQVcsT0FBQTtBQUMzRSw4Q0FBNEI7QUFDNUIscUNBQW1FO0FBQTNELDRHQUFBLG1CQUFtQixPQUFBO0FBQUUsMEdBQUEsaUJBQWlCLE9BQUE7QUFDOUMsaUNBQTRDO0FBQXBDLHdHQUFBLGlCQUFpQixPQUFBO0FBQ3pCLDBDQUF3QjtBQUN4Qiw0REFBMEM7QUFDMUMsbURBQXNGO0FBQTlFLDZIQUFBLDJCQUEyQixPQUFBO0FBQUUseUhBQUEsdUJBQXVCLE9BQUE7QUFDNUQscUNBQThEO0FBQXRELGtHQUFBLFVBQVUsT0FBQTtBQUFFLDRHQUFBLG9CQUFvQixPQUFBO0FBRXhDLHlFQUE4RTtBQUF0RSxrSUFBQSwyQkFBMkIsT0FBQTtBQUNuQyxpREFBaUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBjb25maWd9IGZyb20gJy4vY29uZmlnL2luZGV4JztcbmV4cG9ydCAqIGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuZXhwb3J0IHtJbmplY3RvckNvbmZpZ0hhbmRsZXIsIERyUGFja2FnZUluamVjdG9yLCBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuZXhwb3J0ICogZnJvbSAnLi9jbWQvdHlwZXMnO1xuZXhwb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzLCBsb29rdXBQYWNrYWdlSnNvbn0gZnJvbSAnLi9jbWQvdXRpbHMnO1xuZXhwb3J0IHtjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnLi9jbWQvY2xpJztcbmV4cG9ydCAqIGZyb20gJy4vc3RvcmUnO1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5leHBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcywgcHJlcGFyZUxhenlOb2RlSW5qZWN0b3J9IGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuZXhwb3J0IHtnZXRSb290RGlyLCBnZXRTeW1saW5rRm9yUGFja2FnZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmV4cG9ydCB7UGFja2FnZXNTdGF0ZSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuZXhwb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5leHBvcnQgKiBhcyBsb2dnZXIgZnJvbSAnbG9nNGpzJztcbiJdfQ==