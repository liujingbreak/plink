"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackageInfo = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
function createPackageInfo(pkJsonFile, isInstalled = false) {
    const json = JSON.parse(node_fs_1.default.readFileSync(pkJsonFile, 'utf8'));
    return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}
exports.createPackageInfo = createPackageInfo;
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
function createPackageInfoWithJson(pkJsonFile, json, isInstalled = false) {
    const m = moduleNameReg.exec(json.name);
    const path = node_fs_1.default.realpathSync(node_path_1.default.dirname(pkJsonFile));
    const pkInfo = {
        shortName: m[2],
        name: json.name,
        scope: m[1],
        path,
        json,
        realPath: node_fs_1.default.realpathSync(node_path_1.default.dirname(pkJsonFile)),
        isInstalled
    };
    return pkInfo;
}
//# sourceMappingURL=package-mgr2-utils.js.map