"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTsCompilerOptForNodePath = exports.getSymlinkForPackage = exports.getRootDir = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.cliPackageArgDesc = exports.lookupPackageJson = exports.findPackagesByNames = exports.DrPackageInjector = exports.config = void 0;
__exportStar(require("./config-handler"), exports);
var index_1 = require("./config/index");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return __importDefault(index_1).default; } });
__exportStar(require("./require-injectors"), exports);
var injector_factory_1 = require("./injector-factory");
Object.defineProperty(exports, "DrPackageInjector", { enumerable: true, get: function () { return injector_factory_1.DrPackageInjector; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBQ2pDLHdDQUFpRDtBQUF6QyxnSEFBQSxPQUFPLE9BQVU7QUFDekIsc0RBQW9DO0FBQ3BDLHVEQUE0RTtBQUE3QyxxSEFBQSxpQkFBaUIsT0FBQTtBQUNoRCw4Q0FBNEI7QUFDNUIscUNBQW1FO0FBQTNELDRHQUFBLG1CQUFtQixPQUFBO0FBQUUsMEdBQUEsaUJBQWlCLE9BQUE7QUFDOUMsaUNBQTRDO0FBQXBDLHdHQUFBLGlCQUFpQixPQUFBO0FBQ3pCLDBDQUF3QjtBQUN4Qiw0REFBMEM7QUFDMUMsbURBQXNGO0FBQTlFLDZIQUFBLDJCQUEyQixPQUFBO0FBQUUseUhBQUEsdUJBQXVCLE9BQUE7QUFDNUQscUNBQThEO0FBQXRELGtHQUFBLFVBQVUsT0FBQTtBQUFFLDRHQUFBLG9CQUFvQixPQUFBO0FBRXhDLHlFQUE4RTtBQUF0RSxrSUFBQSwyQkFBMkIsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCAqIGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGNvbmZpZ30gZnJvbSAnLi9jb25maWcvaW5kZXgnO1xuZXhwb3J0ICogZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5leHBvcnQge0luamVjdG9yQ29uZmlnSGFuZGxlciwgRHJQYWNrYWdlSW5qZWN0b3J9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5leHBvcnQgKiBmcm9tICcuL2NtZC90eXBlcyc7XG5leHBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXMsIGxvb2t1cFBhY2thZ2VKc29ufSBmcm9tICcuL2NtZC91dGlscyc7XG5leHBvcnQge2NsaVBhY2thZ2VBcmdEZXNjfSBmcm9tICcuL2NtZC9jbGknO1xuZXhwb3J0ICogZnJvbSAnLi9zdG9yZSc7XG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmV4cG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzLCBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcn0gZnJvbSAnLi9wYWNrYWdlLXJ1bm5lcic7XG5leHBvcnQge2dldFJvb3REaXIsIGdldFN5bWxpbmtGb3JQYWNrYWdlfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuZXhwb3J0IHtQYWNrYWdlc1N0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5leHBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbiJdfQ==