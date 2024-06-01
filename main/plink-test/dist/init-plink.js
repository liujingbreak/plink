"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupPackage = exports.packageToPathMap = exports.tsconfigJson = exports.tsconfigFile = exports.plinkRootDir = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const package_mgr2_lookup_1 = require("@wfh/plink/wfh/dist/package-mgr/package-mgr2-lookup");
const process_common_1 = require("@wfh/plink/wfh/dist/plink2/process-common");
exports.plinkRootDir = (0, process_common_1.lookupPlinkRoot)(process.cwd());
exports.tsconfigFile = path_1.default.resolve(exports.plinkRootDir, 'tsconfig.json');
exports.tsconfigJson = JSON.parse(fs_1.default.readFileSync(exports.tsconfigFile, 'utf8'));
const lookupTool = (0, package_mgr2_lookup_1.createPlinkPackageLookupService)();
console.log('here');
lookupTool.input.fromTsconfig(exports.plinkRootDir, exports.tsconfigJson).dp();
console.log('there');
exports.packageToPathMap = lookupTool.table.getData().packageToPathMap[0];
function lookupPackage(file) {
    let resolved;
    lookupTool.input.lookupPackage(file).od(lookupTool.output.lookupPackageResolved).pipe(rx.take(1)).subscribe(([, value]) => {
        resolved = value;
    });
    return resolved;
}
exports.lookupPackage = lookupPackage;
//# sourceMappingURL=init-plink.js.map