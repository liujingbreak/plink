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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUFzQztBQUN0QywyQ0FBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLG1EQUFxQztBQUNyQyxrREFBMEI7QUFDMUIsbUNBQWlDO0FBQ2pDLDREQUFxQztBQUNyQyxtRUFBMkU7QUFDM0UsZ0RBQXlEO0FBQ3pELHdDQUF1RDtBQUN2RCxtQ0FBaUU7QUFFakUsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsbUJBQXdCLE9BQWdCO0lBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUEsMEJBQVksRUFBQyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsSUFBSSxPQUFPLEVBQUU7UUFDWCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsMkJBQW1CLEVBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLE9BQU8sa0JBQWtCLENBQUMsQ0FBQztTQUNoRTtRQUNELE9BQU8sR0FBRyxZQUFZLENBQUM7S0FDeEI7SUFDRCxJQUFBLDRCQUFRLEdBQUUsQ0FBQyxJQUFJLENBQ2IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDeEQsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0Qix5Q0FBeUM7SUFDekMsZ0NBQWdDO0lBQ2hDLCtCQUEr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QUFVLENBQUMsQ0FBQyxDQUFDO0tBQzdFO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGVzbGludC1kaXNhYmxlICBtYXgtbGVuLCBuby1jb25zb2xlXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZy9pbmRleCc7XG5pbXBvcnQge2Rpc3BhdGNoZXIsIGdldFN0b3JlLCBnZXRTdGF0ZX0gZnJvbSAnLi4vY29uZmlnL2NvbmZpZy12aWV3LXNsaWNlJztcbmltcG9ydCB7d29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZSwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzLCBjb21wbGV0ZVBhY2thZ2VOYW1lfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGktc2V0dGluZycpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihwa2dOYW1lPzogc3RyaW5nKSB7XG4gIGNvbnN0IHdza2V5ID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBpZiAocGtnTmFtZSkge1xuICAgIGNvbnN0IGZvdW5kUGtnTmFtZSA9IEFycmF5LmZyb20oY29tcGxldGVQYWNrYWdlTmFtZShbcGtnTmFtZV0pKVswXTtcbiAgICBpZiAoZm91bmRQa2dOYW1lID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUGFja2FnZSBvZiBuYW1lIFwiJHtwa2dOYW1lfVwiIGRvZXMgbm90IGV4aXN0YCk7XG4gICAgfVxuICAgIHBrZ05hbWUgPSBmb3VuZFBrZ05hbWU7XG4gIH1cbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG9wLm1hcChzID0+IHMudXBkYXRlQ2hlY2tzdW0pLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLnNraXAoMSksIG9wLnRha2UoMSksXG4gICAgLy8gb3AuY29uY2F0TWFwKCgpID0+IGdldFBrZ1N0b3JlKCkucGlwZShcbiAgICAvLyAgIG9wLm1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgIC8vICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAvLyAgIG9wLmZpbHRlcihwa2dzID0+IHBrZ3MgIT0gbnVsbCAmJiBwa2dzLnNpemUgPiAwKSxcbiAgICAvLyAgIG9wLnRha2UoMSlcbiAgICAvLyApKSxcbiAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuICAgICAgY29uc3Qgc2V0dGluZyA9IGNvbmZpZygpO1xuXG4gICAgICBpZiAocGtnTmFtZSkge1xuICAgICAgICBjb25zdCBbcGtnXSA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhbcGtnTmFtZV0pKTtcbiAgICAgICAgcHJpbnRQYWNrYWdlKHBrZyEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcGtncyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhzdGF0ZS5wYWNrYWdlTmFtZXMhKSk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBwa2dzLmxlbmd0aCA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBwa2cgPSBwa2dzW2ldO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBzdGF0ZS5wYWNrYWdlTmFtZXMhW2ldO1xuICAgICAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZvdW5kIHBhY2thZ2UgaW5zdGFsbGVkIG9yIGxpbmtlZCBmb3IgbmFtZTogJHtuYW1lfWApO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHByaW50UGFja2FnZShwa2cpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCB0YmwgPSBjcmVhdGVDbGlUYWJsZSgpO1xuICAgICAgdGJsLnB1c2goWydDb21wbGV0ZSBzZXR0aW5nIHZhbHVlczonXSk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2codGJsLnRvU3RyaW5nKCkpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChzZXR0aW5nLCBmYWxzZSwgNSkpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIGRpc3BhdGNoZXIubG9hZFBhY2thZ2VTZXR0aW5nTWV0YSh7d29ya3NwYWNlS2V5OiB3c2tleSwgcGFja2FnZU5hbWU6IHBrZ05hbWV9KTtcbn1cblxuLy8gZnVuY3Rpb24gcHJpbnRQYWNrYWdlSW5Gb3JtT2ZUYWJsZShwa2dOYW1lOiBzdHJpbmcpIHtcbi8vICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuLy8gICBjb25zdCBtZXRhID0gc3RhdGUucGFja2FnZU1ldGFCeU5hbWUuZ2V0KHBrZ05hbWUpO1xuLy8gICBpZiAobWV0YSA9PSBudWxsKSB7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgLCBuby1jb25zb2xlXG4vLyAgICAgY29uc29sZS5sb2coJ05vIHNldHRpbmcgZm91bmQgZm9yIHBhY2thZ2UgJyArIHBrZ05hbWUpO1xuLy8gICAgIHJldHVybjtcbi8vICAgfVxuLy8gICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlLCBjb2xXaWR0aHM6IFtudWxsLCBudWxsXSwgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnXX0pO1xuLy8gICB0YWJsZS5wdXNoKFxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbi8vICAgICBbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGBQYWNrYWdlICR7Y2hhbGsuZ3JlZW4ocGtnTmFtZSl9IHNldHRpbmcgJHtjaGFsay5ncmF5KCd8ICcgKyBtZXRhLnR5cGVGaWxlKX1gLCBoQWxpZ246ICdjZW50ZXInfV0sXG4vLyAgICAgWydQUk9QRVJUWScsICdUWVBFIEFORCBERVNDSVBUSU9OJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4vLyAgICAgWyctLS0tLS0nLCAnLS0tLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4vLyAgICk7XG4vLyAgIC8vIGNvbnN0IHZhbHVlc0ZvclBrZyA9IHBrZ05hbWUgPT09ICdAd2ZoL3BsaW5rJyA/IHNldHRpbmcgOiBzZXR0aW5nW3BrZ05hbWVdO1xuLy8gICBmb3IgKGNvbnN0IHByb3Agb2YgbWV0YS5wcm9wZXJ0aWVzKSB7XG4vLyAgICAgY29uc3QgcHJvcE1ldGEgPSBzdGF0ZS5wcm9wZXJ0eUJ5TmFtZS5nZXQocGtnTmFtZSArICcsJyArIHByb3ApITtcbi8vICAgICB0YWJsZS5wdXNoKFtcbi8vICAgICAgIGNoYWxrLmN5YW4ocHJvcE1ldGEucHJvcGVydHkpLFxuLy8gICAgICAgKHByb3BNZXRhLm9wdGlvbmFsID8gY2hhbGsuZ3JheSgnKG9wdGlvbmFsKSAnKSA6ICcnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZSkgK1xuLy8gICAgICAgICAocHJvcE1ldGEuZGVzYyA/ICcgLSAnICsgcHJvcE1ldGEuZGVzYyA6ICcnKVxuLy8gICAgICAgLy8gSlNPTi5zdHJpbmdpZnkodmFsdWVzRm9yUGtnW3Byb3BNZXRhLnByb3BlcnR5XSwgbnVsbCwgJyAgJylcbi8vICAgICBdKTtcbi8vICAgfVxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuLy8gICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbi8vIH1cblxuZnVuY3Rpb24gcHJpbnRQYWNrYWdlKHtuYW1lOiBwa2dOYW1lLCByZWFsUGF0aH06IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgY29uc3QgbWV0YSA9IHN0YXRlLnBhY2thZ2VNZXRhQnlOYW1lLmdldChwa2dOYW1lKTtcbiAgaWYgKG1ldGEgPT0gbnVsbCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ05vIHNldHRpbmcgZm91bmQgZm9yIHBhY2thZ2UgJyArIHBrZ05hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHRibCA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG5cbiAgdGJsLnB1c2goW2BQYWNrYWdlICR7Y2hhbGsuZ3JlZW4ocGtnTmFtZSl9IHNldHRpbmcgJHsnfCAnICsgY2hhbGsuZ3JheShQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIHJlYWxQYXRoKSl9YF0sXG4gICAgW2AgICR7Y2hhbGsuZ3JheShtZXRhLnR5cGVGaWxlKX1gXSk7XG4gIC8vIGNvbnNvbGUubG9nKGBQYWNrYWdlICR7Y2hhbGsuZ3JlZW4ocGtnTmFtZSl9IHNldHRpbmcgJHtjaGFsay5ncmF5KCd8ICcgKyBtZXRhLnR5cGVGaWxlKX1gKTtcbiAgY29uc29sZS5sb2codGJsLnRvU3RyaW5nKCkpO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBtZXRhLnByb3BlcnRpZXMpIHtcbiAgICBjb25zdCBwcm9wTWV0YSA9IHN0YXRlLnByb3BlcnR5QnlOYW1lLmdldChwa2dOYW1lICsgJywnICsgcHJvcCkhO1xuICAgIGNvbnNvbGUubG9nKCcgICAnICsgY2hhbGsuY3lhbihwcm9wTWV0YS5wcm9wZXJ0eSkgKyAnOiAnICtcbiAgICAgIChwcm9wTWV0YS5vcHRpb25hbCA/IGNoYWxrLmdyYXkoJyhvcHRpb25hbCkgJykgOiAnJykgKyBjaGFsay5tYWdlbnRhKHByb3BNZXRhLnR5cGUucmVwbGFjZSgvXFxuL2csICdcXG4gICcpKSk7XG4gICAgLy8gY29uc29sZS5sb2coJyAgICAnICsgKHByb3BNZXRhLm9wdGlvbmFsID8gY2hhbGsuZ3JheSgnICAob3B0aW9uYWwpICcpIDogJyAgJykgKyBjaGFsay5tYWdlbnRhKHByb3BNZXRhLnR5cGUpKTtcbiAgICBpZiAocHJvcE1ldGEuZGVzYylcbiAgICAgIGNvbnNvbGUubG9nKCcgICAgICAtICcgKyBwcm9wTWV0YS5kZXNjLnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgJ1xcbiAgICAgICcpKTtcbiAgfVxufVxuIl19