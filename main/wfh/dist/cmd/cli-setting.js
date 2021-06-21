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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable  max-len, no-console
const index_1 = __importDefault(require("../config/index"));
const config_view_slice_1 = require("../config/config-view-slice");
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("../utils/misc");
const chalk_1 = __importDefault(require("chalk"));
const util = __importStar(require("util"));
const path_1 = __importDefault(require("path"));
const log4js_1 = require("log4js");
const log = log4js_1.getLogger('plink.cli-setting');
function default_1(pkgName) {
    return __awaiter(this, void 0, void 0, function* () {
        const wskey = package_mgr_1.workspaceKey(misc_1.plinkEnv.workDir);
        if (pkgName) {
            const foundPkgName = Array.from(utils_1.completePackageName([pkgName]))[0];
            if (foundPkgName == null) {
                throw new Error(`Package of name "${pkgName}" does not exist`);
            }
            pkgName = foundPkgName;
        }
        config_view_slice_1.getStore().pipe(op.map(s => s.updateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1), 
        // op.concatMap(() => getPkgStore().pipe(
        //   op.map(s => s.srcPackages),
        //   op.distinctUntilChanged(),
        //   op.filter(pkgs => pkgs != null && pkgs.size > 0),
        //   op.take(1)
        // )),
        op.tap(() => {
            const state = config_view_slice_1.getState();
            const setting = index_1.default();
            if (pkgName) {
                const [pkg] = Array.from(utils_1.findPackagesByNames([pkgName]));
                printPackage(pkg);
            }
            else {
                const pkgs = Array.from(utils_1.findPackagesByNames(state.packageNames));
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
            const tbl = misc_1.createCliTable();
            tbl.push(['Complete setting values:']);
            // eslint-disable-next-line no-console
            console.log(tbl.toString());
            // eslint-disable-next-line no-console
            console.log(util.inspect(setting, false, 5));
        })).subscribe();
        config_view_slice_1.dispatcher.loadPackageSettingMeta({ workspaceKey: wskey, packageName: pkgName });
    });
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
    const state = config_view_slice_1.getState();
    const meta = state.packageMetaByName.get(pkgName);
    if (meta == null) {
        // eslint-disable-next-line no-console
        console.log('No setting found for package ' + pkgName);
        return;
    }
    const tbl = misc_1.createCliTable({ horizontalLines: false });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQXNDO0FBQ3RDLDREQUFxQztBQUNyQyxtRUFBMkU7QUFDM0UsZ0RBQXlEO0FBQ3pELG1DQUFpRTtBQUNqRSxtREFBcUM7QUFDckMsd0NBQXVEO0FBQ3ZELGtEQUEwQjtBQUMxQiwyQ0FBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLG1DQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsbUJBQThCLE9BQWdCOztRQUM1QyxNQUFNLEtBQUssR0FBRywwQkFBWSxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QyxJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixPQUFPLGtCQUFrQixDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLEdBQUcsWUFBWSxDQUFDO1NBQ3hCO1FBQ0QsNEJBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN4RCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLHlDQUF5QztRQUN6QyxnQ0FBZ0M7UUFDaEMsK0JBQStCO1FBQy9CLHNEQUFz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c291cmNlc0NvbnRlbnQiOlsiLy8gZXNsaW50LWRpc2FibGUgIG1heC1sZW4sIG5vLWNvbnNvbGVcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnL2luZGV4JztcbmltcG9ydCB7ZGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGdldFN0YXRlfSBmcm9tICcuLi9jb25maWcvY29uZmlnLXZpZXctc2xpY2UnO1xuaW1wb3J0IHt3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXMsIGNvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZSwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaS1zZXR0aW5nJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBrZ05hbWU/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NrZXkgPSB3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0Rpcik7XG4gIGlmIChwa2dOYW1lKSB7XG4gICAgY29uc3QgZm91bmRQa2dOYW1lID0gQXJyYXkuZnJvbShjb21wbGV0ZVBhY2thZ2VOYW1lKFtwa2dOYW1lXSkpWzBdO1xuICAgIGlmIChmb3VuZFBrZ05hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlIG9mIG5hbWUgXCIke3BrZ05hbWV9XCIgZG9lcyBub3QgZXhpc3RgKTtcbiAgICB9XG4gICAgcGtnTmFtZSA9IGZvdW5kUGtnTmFtZTtcbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgb3AubWFwKHMgPT4gcy51cGRhdGVDaGVja3N1bSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3Auc2tpcCgxKSwgb3AudGFrZSgxKSxcbiAgICAvLyBvcC5jb25jYXRNYXAoKCkgPT4gZ2V0UGtnU3RvcmUoKS5waXBlKFxuICAgIC8vICAgb3AubWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgLy8gICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgb3AuZmlsdGVyKHBrZ3MgPT4gcGtncyAhPSBudWxsICYmIHBrZ3Muc2l6ZSA+IDApLFxuICAgIC8vICAgb3AudGFrZSgxKVxuICAgIC8vICkpLFxuICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4gICAgICBjb25zdCBzZXR0aW5nID0gY29uZmlnKCk7XG5cbiAgICAgIGlmIChwa2dOYW1lKSB7XG4gICAgICAgIGNvbnN0IFtwa2ddID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKFtwa2dOYW1lXSkpO1xuICAgICAgICBwcmludFBhY2thZ2UocGtnISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlLnBhY2thZ2VOYW1lcyEpKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHBrZ3MubGVuZ3RoIDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IHBrZ3NbaV07XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHN0YXRlLnBhY2thZ2VOYW1lcyFbaV07XG4gICAgICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoYENhbiBub3QgZm91bmQgcGFja2FnZSBpbnN0YWxsZWQgb3IgbGlua2VkIGZvciBuYW1lOiAke25hbWV9YCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJpbnRQYWNrYWdlKHBrZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHRibCA9IGNyZWF0ZUNsaVRhYmxlKCk7XG4gICAgICB0YmwucHVzaChbJ0NvbXBsZXRlIHNldHRpbmcgdmFsdWVzOiddKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyh0YmwudG9TdHJpbmcoKSk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2codXRpbC5pbnNwZWN0KHNldHRpbmcsIGZhbHNlLCA1KSk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgZGlzcGF0Y2hlci5sb2FkUGFja2FnZVNldHRpbmdNZXRhKHt3b3Jrc3BhY2VLZXk6IHdza2V5LCBwYWNrYWdlTmFtZTogcGtnTmFtZX0pO1xufVxuXG4vLyBmdW5jdGlvbiBwcmludFBhY2thZ2VJbkZvcm1PZlRhYmxlKHBrZ05hbWU6IHN0cmluZykge1xuLy8gICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4vLyAgIGNvbnN0IG1ldGEgPSBzdGF0ZS5wYWNrYWdlTWV0YUJ5TmFtZS5nZXQocGtnTmFtZSk7XG4vLyAgIGlmIChtZXRhID09IG51bGwpIHtcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAsIG5vLWNvbnNvbGVcbi8vICAgICBjb25zb2xlLmxvZygnTm8gc2V0dGluZyBmb3VuZCBmb3IgcGFja2FnZSAnICsgcGtnTmFtZSk7XG4vLyAgICAgcmV0dXJuO1xuLy8gICB9XG4vLyAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2UsIGNvbFdpZHRoczogW251bGwsIG51bGxdLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddfSk7XG4vLyAgIHRhYmxlLnB1c2goXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuLy8gICAgIFt7Y29sU3BhbjogMiwgY29udGVudDogYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAke2NoYWxrLmdyYXkoJ3wgJyArIG1ldGEudHlwZUZpbGUpfWAsIGhBbGlnbjogJ2NlbnRlcid9XSxcbi8vICAgICBbJ1BST1BFUlRZJywgJ1RZUEUgQU5EIERFU0NJUFRJT04nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbi8vICAgICBbJy0tLS0tLScsICctLS0tLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSlcbi8vICAgKTtcbi8vICAgLy8gY29uc3QgdmFsdWVzRm9yUGtnID0gcGtnTmFtZSA9PT0gJ0B3ZmgvcGxpbmsnID8gc2V0dGluZyA6IHNldHRpbmdbcGtnTmFtZV07XG4vLyAgIGZvciAoY29uc3QgcHJvcCBvZiBtZXRhLnByb3BlcnRpZXMpIHtcbi8vICAgICBjb25zdCBwcm9wTWV0YSA9IHN0YXRlLnByb3BlcnR5QnlOYW1lLmdldChwa2dOYW1lICsgJywnICsgcHJvcCkhO1xuLy8gICAgIHRhYmxlLnB1c2goW1xuLy8gICAgICAgY2hhbGsuY3lhbihwcm9wTWV0YS5wcm9wZXJ0eSksXG4vLyAgICAgICAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcob3B0aW9uYWwpICcpIDogJycpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlKSArXG4vLyAgICAgICAgIChwcm9wTWV0YS5kZXNjID8gJyAtICcgKyBwcm9wTWV0YS5kZXNjIDogJycpXG4vLyAgICAgICAvLyBKU09OLnN0cmluZ2lmeSh2YWx1ZXNGb3JQa2dbcHJvcE1ldGEucHJvcGVydHldLCBudWxsLCAnICAnKVxuLy8gICAgIF0pO1xuLy8gICB9XG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vLyAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuLy8gfVxuXG5mdW5jdGlvbiBwcmludFBhY2thZ2Uoe25hbWU6IHBrZ05hbWUsIHJlYWxQYXRofTogUGFja2FnZUluZm8pIHtcbiAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuICBjb25zdCBtZXRhID0gc3RhdGUucGFja2FnZU1ldGFCeU5hbWUuZ2V0KHBrZ05hbWUpO1xuICBpZiAobWV0YSA9PSBudWxsKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnTm8gc2V0dGluZyBmb3VuZCBmb3IgcGFja2FnZSAnICsgcGtnTmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdGJsID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcblxuICB0YmwucHVzaChbYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAkeyd8ICcgKyBjaGFsay5ncmF5KFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgcmVhbFBhdGgpKX1gXSxcbiAgICBbYCAgJHtjaGFsay5ncmF5KG1ldGEudHlwZUZpbGUpfWBdKTtcbiAgLy8gY29uc29sZS5sb2coYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAke2NoYWxrLmdyYXkoJ3wgJyArIG1ldGEudHlwZUZpbGUpfWApO1xuICBjb25zb2xlLmxvZyh0YmwudG9TdHJpbmcoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wIG9mIG1ldGEucHJvcGVydGllcykge1xuICAgIGNvbnN0IHByb3BNZXRhID0gc3RhdGUucHJvcGVydHlCeU5hbWUuZ2V0KHBrZ05hbWUgKyAnLCcgKyBwcm9wKSE7XG4gICAgY29uc29sZS5sb2coJyAgICcgKyBjaGFsay5jeWFuKHByb3BNZXRhLnByb3BlcnR5KSArICc6ICcgK1xuICAgICAgKHByb3BNZXRhLm9wdGlvbmFsID8gY2hhbGsuZ3JheSgnKG9wdGlvbmFsKSAnKSA6ICcnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZS5yZXBsYWNlKC9cXG4vZywgJ1xcbiAgJykpKTtcbiAgICAvLyBjb25zb2xlLmxvZygnICAgICcgKyAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcgIChvcHRpb25hbCkgJykgOiAnICAnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZSkpO1xuICAgIGlmIChwcm9wTWV0YS5kZXNjKVxuICAgICAgY29uc29sZS5sb2coJyAgICAgIC0gJyArIHByb3BNZXRhLmRlc2MudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCAnXFxuICAgICAgJykpO1xuICB9XG59XG4iXX0=