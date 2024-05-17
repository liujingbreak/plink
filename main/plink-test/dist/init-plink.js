"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupTool = exports.packagePathMap = exports.tsconfigJson = exports.tsconfigFile = exports.plinkRootDir = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const package_mgr2_utils_1 = require("@wfh/plink/wfh/dist/package-mgr/package-mgr2-utils");
const process_common_1 = require("@wfh/plink/wfh/dist/plink2/process-common");
exports.plinkRootDir = (0, process_common_1.lookupPlinkRoot)(process.cwd());
exports.tsconfigFile = path_1.default.resolve(exports.plinkRootDir, 'tsconfig.json');
exports.tsconfigJson = JSON.parse(fs_1.default.readFileSync(exports.tsconfigFile, 'utf8'));
const lookupTool = new package_mgr2_utils_1.PlinkPackageLookup();
exports.lookupTool = lookupTool;
exports.packagePathMap = lookupTool.fromTsconfig(exports.plinkRootDir, exports.tsconfigJson);
//# sourceMappingURL=init-plink.js.map