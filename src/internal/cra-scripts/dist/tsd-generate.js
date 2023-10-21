"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTsd = void 0;
const tslib_1 = require("tslib");
const plink_1 = require("@wfh/plink");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const utils_1 = require("./utils");
const types_1 = require("./types");
const utils_2 = require("./utils");
async function buildTsd(packages, overridePackgeDirs = {}) {
    if (packages == null) {
        const opts = (0, utils_2.getCmdOptions)();
        packages = opts.buildTargets.map(entry => { var _a; return (_a = entry.pkg) === null || _a === void 0 ? void 0 : _a.name; }).filter(n => n != null);
    }
    const pkgs = [...(0, plink_1.findPackagesByNames)(packages)].map((pkg, i) => {
        if (pkg == null) {
            throw new Error(`Can not find package ${packages[i]}`);
        }
        return pkg;
    });
    const _overridePackgeDirs = Object.assign({}, overridePackgeDirs);
    for (const pkg of pkgs) {
        if (_overridePackgeDirs[pkg.name] == null) {
            _overridePackgeDirs[pkg.name] = {
                destDir: 'build',
                srcDir: '',
                files: [lodash_1.default.get(pkg.json.plink ? pkg.json.plink : pkg.json.dr, types_1.PKG_LIB_ENTRY_PROP, types_1.PKG_LIB_ENTRY_DEFAULT)]
            };
        }
    }
    // const targetPackage = pkg.name;
    const workerData = {
        package: pkgs.map(pkg => pkg.name), ed: true, jsx: true, watch: (0, utils_2.getCmdOptions)().watch,
        pathsJsons: [],
        overridePackgeDirs: _overridePackgeDirs
    };
    const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
    workerData.compilerOptions = (0, utils_1.runTsConfigHandlers4LibTsd)();
    await tsc(workerData, typescript_1.default);
}
exports.buildTsd = buildTsd;
//# sourceMappingURL=tsd-generate.js.map