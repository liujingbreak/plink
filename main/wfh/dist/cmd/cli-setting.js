"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQXNDO0FBQ3RDLDJDQUE2QjtBQUM3QixnREFBd0I7QUFDeEIsbURBQXFDO0FBQ3JDLGtEQUEwQjtBQUMxQixtQ0FBaUM7QUFDakMsNERBQXFDO0FBQ3JDLG1FQUEyRTtBQUMzRSxnREFBeUQ7QUFDekQsd0NBQXVEO0FBQ3ZELG1DQUFpRTtBQUVqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUUzQyxtQkFBd0IsT0FBZ0I7SUFDdEMsTUFBTSxLQUFLLEdBQUcsSUFBQSwwQkFBWSxFQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QyxJQUFJLE9BQU8sRUFBRTtRQUNYLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRSxJQUFJLFlBQVksSUFBSSxJQUFJLEVBQUU7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsT0FBTyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2hFO1FBQ0QsT0FBTyxHQUFHLFlBQVksQ0FBQztLQUN4QjtJQUNELElBQUEsNEJBQVEsR0FBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN4RCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLHlDQUF5QztJQUN6QyxnQ0FBZ0M7SUFDaEMsK0JBQStCO0lB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Q0FBQyxDQUFDLENBQUM7S0FDN0U7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZXNsaW50LWRpc2FibGUgIG1heC1sZW4sIG5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnL2luZGV4JztcbmltcG9ydCB7ZGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGdldFN0YXRlfSBmcm9tICcuLi9jb25maWcvY29uZmlnLXZpZXctc2xpY2UnO1xuaW1wb3J0IHt3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXMsIGNvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaS1zZXR0aW5nJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHBrZ05hbWU/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NrZXkgPSB3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0Rpcik7XG4gIGlmIChwa2dOYW1lKSB7XG4gICAgY29uc3QgZm91bmRQa2dOYW1lID0gQXJyYXkuZnJvbShjb21wbGV0ZVBhY2thZ2VOYW1lKFtwa2dOYW1lXSkpWzBdO1xuICAgIGlmIChmb3VuZFBrZ05hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlIG9mIG5hbWUgXCIke3BrZ05hbWV9XCIgZG9lcyBub3QgZXhpc3RgKTtcbiAgICB9XG4gICAgcGtnTmFtZSA9IGZvdW5kUGtnTmFtZTtcbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgb3AubWFwKHMgPT4gcy51cGRhdGVDaGVja3N1bSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3Auc2tpcCgxKSwgb3AudGFrZSgxKSxcbiAgICAvLyBvcC5jb25jYXRNYXAoKCkgPT4gZ2V0UGtnU3RvcmUoKS5waXBlKFxuICAgIC8vICAgb3AubWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgLy8gICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgb3AuZmlsdGVyKHBrZ3MgPT4gcGtncyAhPSBudWxsICYmIHBrZ3Muc2l6ZSA+IDApLFxuICAgIC8vICAgb3AudGFrZSgxKVxuICAgIC8vICkpLFxuICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4gICAgICBjb25zdCBzZXR0aW5nID0gY29uZmlnKCk7XG5cbiAgICAgIGlmIChwa2dOYW1lKSB7XG4gICAgICAgIGNvbnN0IFtwa2ddID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKFtwa2dOYW1lXSkpO1xuICAgICAgICBwcmludFBhY2thZ2UocGtnISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlLnBhY2thZ2VOYW1lcyEpKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHBrZ3MubGVuZ3RoIDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IHBrZ3NbaV07XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHN0YXRlLnBhY2thZ2VOYW1lcyFbaV07XG4gICAgICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoYENhbiBub3QgZm91bmQgcGFja2FnZSBpbnN0YWxsZWQgb3IgbGlua2VkIGZvciBuYW1lOiAke25hbWV9YCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJpbnRQYWNrYWdlKHBrZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHRibCA9IGNyZWF0ZUNsaVRhYmxlKCk7XG4gICAgICB0YmwucHVzaChbJ0NvbXBsZXRlIHNldHRpbmcgdmFsdWVzOiddKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyh0YmwudG9TdHJpbmcoKSk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2codXRpbC5pbnNwZWN0KHNldHRpbmcsIGZhbHNlLCA1KSk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgZGlzcGF0Y2hlci5sb2FkUGFja2FnZVNldHRpbmdNZXRhKHt3b3Jrc3BhY2VLZXk6IHdza2V5LCBwYWNrYWdlTmFtZTogcGtnTmFtZX0pO1xufVxuXG4vLyBmdW5jdGlvbiBwcmludFBhY2thZ2VJbkZvcm1PZlRhYmxlKHBrZ05hbWU6IHN0cmluZykge1xuLy8gICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4vLyAgIGNvbnN0IG1ldGEgPSBzdGF0ZS5wYWNrYWdlTWV0YUJ5TmFtZS5nZXQocGtnTmFtZSk7XG4vLyAgIGlmIChtZXRhID09IG51bGwpIHtcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAsIG5vLWNvbnNvbGVcbi8vICAgICBjb25zb2xlLmxvZygnTm8gc2V0dGluZyBmb3VuZCBmb3IgcGFja2FnZSAnICsgcGtnTmFtZSk7XG4vLyAgICAgcmV0dXJuO1xuLy8gICB9XG4vLyAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2UsIGNvbFdpZHRoczogW251bGwsIG51bGxdLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddfSk7XG4vLyAgIHRhYmxlLnB1c2goXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuLy8gICAgIFt7Y29sU3BhbjogMiwgY29udGVudDogYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAke2NoYWxrLmdyYXkoJ3wgJyArIG1ldGEudHlwZUZpbGUpfWAsIGhBbGlnbjogJ2NlbnRlcid9XSxcbi8vICAgICBbJ1BST1BFUlRZJywgJ1RZUEUgQU5EIERFU0NJUFRJT04nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbi8vICAgICBbJy0tLS0tLScsICctLS0tLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSlcbi8vICAgKTtcbi8vICAgLy8gY29uc3QgdmFsdWVzRm9yUGtnID0gcGtnTmFtZSA9PT0gJ0B3ZmgvcGxpbmsnID8gc2V0dGluZyA6IHNldHRpbmdbcGtnTmFtZV07XG4vLyAgIGZvciAoY29uc3QgcHJvcCBvZiBtZXRhLnByb3BlcnRpZXMpIHtcbi8vICAgICBjb25zdCBwcm9wTWV0YSA9IHN0YXRlLnByb3BlcnR5QnlOYW1lLmdldChwa2dOYW1lICsgJywnICsgcHJvcCkhO1xuLy8gICAgIHRhYmxlLnB1c2goW1xuLy8gICAgICAgY2hhbGsuY3lhbihwcm9wTWV0YS5wcm9wZXJ0eSksXG4vLyAgICAgICAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcob3B0aW9uYWwpICcpIDogJycpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlKSArXG4vLyAgICAgICAgIChwcm9wTWV0YS5kZXNjID8gJyAtICcgKyBwcm9wTWV0YS5kZXNjIDogJycpXG4vLyAgICAgICAvLyBKU09OLnN0cmluZ2lmeSh2YWx1ZXNGb3JQa2dbcHJvcE1ldGEucHJvcGVydHldLCBudWxsLCAnICAnKVxuLy8gICAgIF0pO1xuLy8gICB9XG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vLyAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuLy8gfVxuXG5mdW5jdGlvbiBwcmludFBhY2thZ2Uoe25hbWU6IHBrZ05hbWUsIHJlYWxQYXRofTogUGFja2FnZUluZm8pIHtcbiAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuICBjb25zdCBtZXRhID0gc3RhdGUucGFja2FnZU1ldGFCeU5hbWUuZ2V0KHBrZ05hbWUpO1xuICBpZiAobWV0YSA9PSBudWxsKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnTm8gc2V0dGluZyBmb3VuZCBmb3IgcGFja2FnZSAnICsgcGtnTmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdGJsID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcblxuICB0YmwucHVzaChbYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAkeyd8ICcgKyBjaGFsay5ncmF5KFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgcmVhbFBhdGgpKX1gXSxcbiAgICBbYCAgJHtjaGFsay5ncmF5KG1ldGEudHlwZUZpbGUpfWBdKTtcbiAgLy8gY29uc29sZS5sb2coYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAke2NoYWxrLmdyYXkoJ3wgJyArIG1ldGEudHlwZUZpbGUpfWApO1xuICBjb25zb2xlLmxvZyh0YmwudG9TdHJpbmcoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wIG9mIG1ldGEucHJvcGVydGllcykge1xuICAgIGNvbnN0IHByb3BNZXRhID0gc3RhdGUucHJvcGVydHlCeU5hbWUuZ2V0KHBrZ05hbWUgKyAnLCcgKyBwcm9wKSE7XG4gICAgY29uc29sZS5sb2coJyAgICcgKyBjaGFsay5jeWFuKHByb3BNZXRhLnByb3BlcnR5KSArICc6ICcgK1xuICAgICAgKHByb3BNZXRhLm9wdGlvbmFsID8gY2hhbGsuZ3JheSgnKG9wdGlvbmFsKSAnKSA6ICcnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZS5yZXBsYWNlKC9cXG4vZywgJ1xcbiAgJykpKTtcbiAgICAvLyBjb25zb2xlLmxvZygnICAgICcgKyAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcgIChvcHRpb25hbCkgJykgOiAnICAnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZSkpO1xuICAgIGlmIChwcm9wTWV0YS5kZXNjKVxuICAgICAgY29uc29sZS5sb2coJyAgICAgIC0gJyArIHByb3BNZXRhLmRlc2MudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCAnXFxuICAgICAgJykpO1xuICB9XG59XG4iXX0=