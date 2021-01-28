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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSymlinkForPackage = exports.getRootDir = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.lookupPackageJson = exports.findPackagesByNames = exports.withGlobalOptions = void 0;
__exportStar(require("./config-handler"), exports);
__exportStar(require("./require-injectors"), exports);
var cli_1 = require("./cmd/cli");
Object.defineProperty(exports, "withGlobalOptions", { enumerable: true, get: function () { return cli_1.withGlobalOptions; } });
__exportStar(require("./cmd/types"), exports);
var utils_1 = require("./cmd/utils");
Object.defineProperty(exports, "findPackagesByNames", { enumerable: true, get: function () { return utils_1.findPackagesByNames; } });
Object.defineProperty(exports, "lookupPackageJson", { enumerable: true, get: function () { return utils_1.lookupPackageJson; } });
__exportStar(require("./store"), exports);
__exportStar(require("./utils/bootstrap-process"), exports);
var package_runner_1 = require("./package-runner");
Object.defineProperty(exports, "initInjectorForNodePackages", { enumerable: true, get: function () { return package_runner_1.initInjectorForNodePackages; } });
Object.defineProperty(exports, "prepareLazyNodeInjector", { enumerable: true, get: function () { return package_runner_1.prepareLazyNodeInjector; } });
var misc_1 = require("./utils/misc");
Object.defineProperty(exports, "getRootDir", { enumerable: true, get: function () { return misc_1.getRootDir; } });
Object.defineProperty(exports, "getSymlinkForPackage", { enumerable: true, get: function () { return misc_1.getSymlinkForPackage; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBQ2pDLHNEQUFvQztBQUNwQyxpQ0FBNEM7QUFBcEMsd0dBQUEsaUJBQWlCLE9BQUE7QUFDekIsOENBQTRCO0FBQzVCLHFDQUFtRTtBQUEzRCw0R0FBQSxtQkFBbUIsT0FBQTtBQUFFLDBHQUFBLGlCQUFpQixPQUFBO0FBQzlDLDBDQUF3QjtBQUN4Qiw0REFBMEM7QUFDMUMsbURBQXNGO0FBQTlFLDZIQUFBLDJCQUEyQixPQUFBO0FBQUUseUhBQUEsdUJBQXVCLE9BQUE7QUFDNUQscUNBQThEO0FBQXRELGtHQUFBLFVBQVUsT0FBQTtBQUFFLDRHQUFBLG9CQUFvQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0ICogZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5leHBvcnQgKiBmcm9tICcuL3JlcXVpcmUtaW5qZWN0b3JzJztcbmV4cG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4vY21kL2NsaSc7XG5leHBvcnQgKiBmcm9tICcuL2NtZC90eXBlcyc7XG5leHBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXMsIGxvb2t1cFBhY2thZ2VKc29ufSBmcm9tICcuL2NtZC91dGlscyc7XG5leHBvcnQgKiBmcm9tICcuL3N0b3JlJztcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuZXhwb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMsIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yfSBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmV4cG9ydCB7Z2V0Um9vdERpciwgZ2V0U3ltbGlua0ZvclBhY2thZ2V9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4iXX0=