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
exports.getRootDir = exports.prepareLazyNodeInjector = exports.lookupPackageJson = exports.findPackagesByNames = exports.withGlobalOptions = void 0;
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
Object.defineProperty(exports, "prepareLazyNodeInjector", { enumerable: true, get: function () { return package_runner_1.prepareLazyNodeInjector; } });
var misc_1 = require("./utils/misc");
Object.defineProperty(exports, "getRootDir", { enumerable: true, get: function () { return misc_1.getRootDir; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsbURBQWlDO0FBQ2pDLHNEQUFvQztBQUNwQyxpQ0FBNEM7QUFBcEMsd0dBQUEsaUJBQWlCLE9BQUE7QUFDekIsOENBQTRCO0FBQzVCLHFDQUFtRTtBQUEzRCw0R0FBQSxtQkFBbUIsT0FBQTtBQUFFLDBHQUFBLGlCQUFpQixPQUFBO0FBQzlDLDBDQUF3QjtBQUN4Qiw0REFBMEM7QUFDMUMsbURBQXlEO0FBQWpELHlIQUFBLHVCQUF1QixPQUFBO0FBQy9CLHFDQUF3QztBQUFoQyxrR0FBQSxVQUFVLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmV4cG9ydCAqIGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuZXhwb3J0IHt3aXRoR2xvYmFsT3B0aW9uc30gZnJvbSAnLi9jbWQvY2xpJztcbmV4cG9ydCAqIGZyb20gJy4vY21kL3R5cGVzJztcbmV4cG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lcywgbG9va3VwUGFja2FnZUpzb259IGZyb20gJy4vY21kL3V0aWxzJztcbmV4cG9ydCAqIGZyb20gJy4vc3RvcmUnO1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5leHBvcnQge3ByZXBhcmVMYXp5Tm9kZUluamVjdG9yfSBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmV4cG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbiJdfQ==