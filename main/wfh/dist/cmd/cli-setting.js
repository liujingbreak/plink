"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// eslint-disable  max-len, no-console
const util = tslib_1.__importStar(require("util"));
const path_1 = tslib_1.__importDefault(require("path"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const log4js_1 = require("log4js");
const index_1 = tslib_1.__importDefault(require("../config/index"));
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