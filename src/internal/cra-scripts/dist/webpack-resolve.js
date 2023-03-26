"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addResolveAlias = void 0;
const package_list_helper_1 = require("@wfh/plink/wfh/dist/package-mgr/package-list-helper");
function addResolveAlias(config) {
    var _a;
    if (config.resolve == null)
        config.resolve = {};
    if (((_a = config.resolve) === null || _a === void 0 ? void 0 : _a.alias) == null)
        config.resolve.alias = {};
    return [...(0, package_list_helper_1.packages4Workspace)(undefined, false)]
        .map(pkg => config.resolve.alias[pkg.name] = pkg.realPath);
}
exports.addResolveAlias = addResolveAlias;
//# sourceMappingURL=webpack-resolve.js.map