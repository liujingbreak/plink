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
exports.getSymlinkForPackage = exports.getRootDir = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.lookupPackageJson = exports.findPackagesByNames = exports.config = void 0;
__exportStar(require("./config-handler"), exports);
var config_1 = require("./config");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return __importDefault(config_1).default; } });
__exportStar(require("./require-injectors"), exports);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBQ2pDLG1DQUEyQztBQUFuQyxpSEFBQSxPQUFPLE9BQVU7QUFDekIsc0RBQW9DO0FBQ3BDLDhDQUE0QjtBQUM1QixxQ0FBbUU7QUFBM0QsNEdBQUEsbUJBQW1CLE9BQUE7QUFBRSwwR0FBQSxpQkFBaUIsT0FBQTtBQUM5QywwQ0FBd0I7QUFDeEIsNERBQTBDO0FBQzFDLG1EQUFzRjtBQUE5RSw2SEFBQSwyQkFBMkIsT0FBQTtBQUFFLHlIQUFBLHVCQUF1QixPQUFBO0FBQzVELHFDQUE4RDtBQUF0RCxrR0FBQSxVQUFVLE9BQUE7QUFBRSw0R0FBQSxvQkFBb0IsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCAqIGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGNvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuZXhwb3J0ICogZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5leHBvcnQgKiBmcm9tICcuL2NtZC90eXBlcyc7XG5leHBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXMsIGxvb2t1cFBhY2thZ2VKc29ufSBmcm9tICcuL2NtZC91dGlscyc7XG5leHBvcnQgKiBmcm9tICcuL3N0b3JlJztcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuZXhwb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMsIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yfSBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmV4cG9ydCB7Z2V0Um9vdERpciwgZ2V0U3ltbGlua0ZvclBhY2thZ2V9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4iXX0=