"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
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
// eslint-disable  max-len, no-console
const util = __importStar(require("util"));
const path_1 = __importDefault(require("path"));
const op = __importStar(require("rxjs/operators"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = require("log4js");
const index_1 = __importDefault(require("../config/index"));
const config_view_slice_1 = require("../config/config-view-slice");
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
const utils_1 = require("./utils");
const log = (0, log4js_1.getLogger)('plink.cli-setting');
function default_1(pkgName) {
    const wskey = (0, package_mgr_1.workspaceKey)(misc_1.plinkEnv.workDir);
    if (pkgName) {
        const foundPkgName = Array.from((0, utils_1.completePackageName)([pkgName]))[0];
        if (foundPkgName == null) {
            throw new Error(`Package of name "${pkgName}" does not exist`);
        }
        pkgName = foundPkgName;
    }
    (0, config_view_slice_1.getStore)().pipe(op.map(s => s.updateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1), 
    // op.concatMap(() => getPkgStore().pipe(
    //   op.map(s => s.srcPackages),
    //   op.distinctUntilChanged(),
    //   op.filter(pkgs => pkgs != null && pkgs.size > 0),
    //   op.take(1)
    // )),
    op.tap(() => {
        const state = (0, config_view_slice_1.getState)();
        const setting = (0, index_1.default)();
        if (pkgName) {
            const [pkg] = Array.from((0, utils_1.findPackagesByNames)([pkgName]));
            printPackage(pkg);
        }
        else {
            const pkgs = Array.from((0, utils_1.findPackagesByNames)(state.packageNames));
            for (let i = 0, l = pkgs.length; i < l; i++) {
                const pkg = pkgs[i];
                const name = state.packageNames[i];
                if (pkg == null) {
                    log.error(`Can not found package installed or linked for name: ${name}`);
                    continue;
                }
                printPackage(pkg);
            }
        }
        const tbl = (0, misc_1.createCliTable)();
        tbl.push(['Complete setting values:']);
        // eslint-disable-next-line no-console
        console.log(tbl.toString());
        // eslint-disable-next-line no-console
        console.log(util.inspect(setting, false, 5));
    })).subscribe();
    config_view_slice_1.dispatcher.loadPackageSettingMeta({ workspaceKey: wskey, packageName: pkgName });
}
exports.default = default_1;
// function printPackageInFormOfTable(pkgName: string) {
//   const state = getState();
//   const meta = state.packageMetaByName.get(pkgName);
//   if (meta == null) {
// eslint-disable-next-line , no-console
//     console.log('No setting found for package ' + pkgName);
//     return;
//   }
//   const table = createCliTable({horizontalLines: false, colWidths: [null, null], colAligns: ['right', 'left']});
//   table.push(
// eslint-disable-next-line max-len
//     [{colSpan: 2, content: `Package ${chalk.green(pkgName)} setting ${chalk.gray('| ' + meta.typeFile)}`, hAlign: 'center'}],
//     ['PROPERTY', 'TYPE AND DESCIPTION'].map(item => chalk.gray(item)),
//     ['------', '-------'].map(item => chalk.gray(item))
//   );
//   // const valuesForPkg = pkgName === '@wfh/plink' ? setting : setting[pkgName];
//   for (const prop of meta.properties) {
//     const propMeta = state.propertyByName.get(pkgName + ',' + prop)!;
//     table.push([
//       chalk.cyan(propMeta.property),
//       (propMeta.optional ? chalk.gray('(optional) ') : '') + chalk.magenta(propMeta.type) +
//         (propMeta.desc ? ' - ' + propMeta.desc : '')
//       // JSON.stringify(valuesForPkg[propMeta.property], null, '  ')
//     ]);
//   }
/* eslint-disable no-console */
//   console.log(table.toString());
// }
function printPackage({ name: pkgName, realPath }) {
    const state = (0, config_view_slice_1.getState)();
    const meta = state.packageMetaByName.get(pkgName);
    if (meta == null) {
        // eslint-disable-next-line no-console
        console.log('No setting found for package ' + pkgName);
        return;
    }
    const tbl = (0, misc_1.createCliTable)({ horizontalLines: false });
    tbl.push([`Package ${chalk_1.default.green(pkgName)} setting ${'| ' + chalk_1.default.gray(path_1.default.relative(misc_1.plinkEnv.workDir, realPath))}`], [`  ${chalk_1.default.gray(meta.typeFile)}`]);
    // console.log(`Package ${chalk.green(pkgName)} setting ${chalk.gray('| ' + meta.typeFile)}`);
    console.log(tbl.toString());
    for (const prop of meta.properties) {
        const propMeta = state.propertyByName.get(pkgName + ',' + prop);
        console.log('   ' + chalk_1.default.cyan(propMeta.property) + ': ' +
            (propMeta.optional ? chalk_1.default.gray('(optional) ') : '') + chalk_1.default.magenta(propMeta.type.replace(/\n/g, '\n  ')));
        // console.log('    ' + (propMeta.optional ? chalk.gray('  (optional) ') : '  ') + chalk.magenta(propMeta.type));
        if (propMeta.desc)
            console.log('      - ' + propMeta.desc.trim().replace(/\n/g, '\n      '));
    }
}
//# sourceMappingURL=cli-setting.js.map