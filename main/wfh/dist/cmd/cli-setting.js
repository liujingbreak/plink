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
// tslint:disable max-line-length no-console
const index_1 = __importDefault(require("../config/index"));
const config_view_slice_1 = require("../config/config-view-slice");
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("../utils/misc");
const chalk_1 = __importDefault(require("chalk"));
const util = __importStar(require("util"));
const path_1 = __importDefault(require("path"));
const log4js_1 = require("log4js");
const log = log4js_1.getLogger('plink.cli-setting');
function default_1(pkgName) {
    return __awaiter(this, void 0, void 0, function* () {
        const wskey = package_mgr_1.workspaceKey(process.cwd());
        if (pkgName) {
            const foundPkgName = Array.from(utils_2.completePackageName([pkgName]))[0];
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
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.cyan('Complete setting values:'));
            // tslint:disable-next-line: no-console
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
//     // tslint:disable-next-line: no-console
//     console.log('No setting found for package ' + pkgName);
//     return;
//   }
//   const table = createCliTable({horizontalLines: false, colWidths: [null, null], colAligns: ['right', 'left']});
//   table.push(
//     // tslint:disable-next-line: max-line-length
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
//   // tslint:disable: no-console
//   console.log(table.toString());
// }
function printPackage({ name: pkgName, realPath }) {
    const state = config_view_slice_1.getState();
    const meta = state.packageMetaByName.get(pkgName);
    if (meta == null) {
        // tslint:disable-next-line: no-console
        console.log('No setting found for package ' + pkgName);
        return;
    }
    const tbl = misc_1.createCliTable({ horizontalLines: false });
    tbl.push([`Package ${chalk_1.default.green(pkgName)} setting ${'| ' + chalk_1.default.gray(path_1.default.relative(process.cwd(), realPath))}`], [`  ${chalk_1.default.gray(meta.typeFile)}`]);
    // console.log(`Package ${chalk.green(pkgName)} setting ${chalk.gray('| ' + meta.typeFile)}`);
    console.log(tbl.toString());
    for (const prop of meta.properties) {
        const propMeta = state.propertyByName.get(pkgName + ',' + prop);
        console.log('   ' + chalk_1.default.cyan(propMeta.property) + ': ' +
            (propMeta.optional ? chalk_1.default.gray('(optional) ') : '') + chalk_1.default.magenta(propMeta.type));
        // console.log('    ' + (propMeta.optional ? chalk.gray('  (optional) ') : '  ') + chalk.magenta(propMeta.type));
        if (propMeta.desc)
            console.log('      - ' + propMeta.desc.trim().replace(/\n/g, '\n      '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQTRDO0FBQzVDLDREQUFxQztBQUNyQyxtRUFBMkU7QUFDM0UsZ0RBQXlEO0FBQ3pELG1DQUE0QztBQUM1QyxtQ0FBNEM7QUFDNUMsbURBQXFDO0FBQ3JDLHdDQUE2QztBQUM3QyxrREFBMEI7QUFDMUIsMkNBQTZCO0FBQzdCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFFakMsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLG1CQUE4QixPQUFnQjs7UUFDNUMsTUFBTSxLQUFLLEdBQUcsMEJBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMxQyxJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixPQUFPLGtCQUFrQixDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLEdBQUcsWUFBWSxDQUFDO1NBQ3hCO1FBQ0QsNEJBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN4RCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLHlDQUF5QztRQUN6QyxnQ0FBZ0M7UUFDaEMs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QUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFDL0csQ0FBQyxLQUFLLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLDhGQUE4RjtJQUM5RixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBRTVCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNsQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBRSxDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUk7WUFDdEQsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxlQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLGlIQUFpSDtRQUNqSCxJQUFJLFFBQVEsQ0FBQyxJQUFJO1lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7S0FDN0U7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoIG5vLWNvbnNvbGVcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnL2luZGV4JztcbmltcG9ydCB7ZGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGdldFN0YXRlfSBmcm9tICcuLi9jb25maWcvY29uZmlnLXZpZXctc2xpY2UnO1xuaW1wb3J0IHt3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtjb21wbGV0ZVBhY2thZ2VOYW1lfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaS1zZXR0aW5nJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBrZ05hbWU/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NrZXkgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIGlmIChwa2dOYW1lKSB7XG4gICAgY29uc3QgZm91bmRQa2dOYW1lID0gQXJyYXkuZnJvbShjb21wbGV0ZVBhY2thZ2VOYW1lKFtwa2dOYW1lXSkpWzBdO1xuICAgIGlmIChmb3VuZFBrZ05hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlIG9mIG5hbWUgXCIke3BrZ05hbWV9XCIgZG9lcyBub3QgZXhpc3RgKTtcbiAgICB9XG4gICAgcGtnTmFtZSA9IGZvdW5kUGtnTmFtZTtcbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgb3AubWFwKHMgPT4gcy51cGRhdGVDaGVja3N1bSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3Auc2tpcCgxKSwgb3AudGFrZSgxKSxcbiAgICAvLyBvcC5jb25jYXRNYXAoKCkgPT4gZ2V0UGtnU3RvcmUoKS5waXBlKFxuICAgIC8vICAgb3AubWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgLy8gICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgb3AuZmlsdGVyKHBrZ3MgPT4gcGtncyAhPSBudWxsICYmIHBrZ3Muc2l6ZSA+IDApLFxuICAgIC8vICAgb3AudGFrZSgxKVxuICAgIC8vICkpLFxuICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4gICAgICBjb25zdCBzZXR0aW5nID0gY29uZmlnKCk7XG5cbiAgICAgIGlmIChwa2dOYW1lKSB7XG4gICAgICAgIGNvbnN0IFtwa2ddID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKFtwa2dOYW1lXSkpO1xuICAgICAgICBwcmludFBhY2thZ2UocGtnISk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKHN0YXRlLnBhY2thZ2VOYW1lcyEpKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHBrZ3MubGVuZ3RoIDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IHBrZ3NbaV07XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHN0YXRlLnBhY2thZ2VOYW1lcyFbaV07XG4gICAgICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoYENhbiBub3QgZm91bmQgcGFja2FnZSBpbnN0YWxsZWQgb3IgbGlua2VkIGZvciBuYW1lOiAke25hbWV9YCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJpbnRQYWNrYWdlKHBrZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsuY3lhbignQ29tcGxldGUgc2V0dGluZyB2YWx1ZXM6JykpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyh1dGlsLmluc3BlY3Qoc2V0dGluZywgZmFsc2UsIDUpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBkaXNwYXRjaGVyLmxvYWRQYWNrYWdlU2V0dGluZ01ldGEoe3dvcmtzcGFjZUtleTogd3NrZXksIHBhY2thZ2VOYW1lOiBwa2dOYW1lfSk7XG59XG5cbi8vIGZ1bmN0aW9uIHByaW50UGFja2FnZUluRm9ybU9mVGFibGUocGtnTmFtZTogc3RyaW5nKSB7XG4vLyAgIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbi8vICAgY29uc3QgbWV0YSA9IHN0YXRlLnBhY2thZ2VNZXRhQnlOYW1lLmdldChwa2dOYW1lKTtcbi8vICAgaWYgKG1ldGEgPT0gbnVsbCkge1xuLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICAgIGNvbnNvbGUubG9nKCdObyBzZXR0aW5nIGZvdW5kIGZvciBwYWNrYWdlICcgKyBwa2dOYW1lKTtcbi8vICAgICByZXR1cm47XG4vLyAgIH1cbi8vICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZSwgY29sV2lkdGhzOiBbbnVsbCwgbnVsbF0sIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0J119KTtcbi8vICAgdGFibGUucHVzaChcbi8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuLy8gICAgIFt7Y29sU3BhbjogMiwgY29udGVudDogYFBhY2thZ2UgJHtjaGFsay5ncmVlbihwa2dOYW1lKX0gc2V0dGluZyAke2NoYWxrLmdyYXkoJ3wgJyArIG1ldGEudHlwZUZpbGUpfWAsIGhBbGlnbjogJ2NlbnRlcid9XSxcbi8vICAgICBbJ1BST1BFUlRZJywgJ1RZUEUgQU5EIERFU0NJUFRJT04nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbi8vICAgICBbJy0tLS0tLScsICctLS0tLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSlcbi8vICAgKTtcbi8vICAgLy8gY29uc3QgdmFsdWVzRm9yUGtnID0gcGtnTmFtZSA9PT0gJ0B3ZmgvcGxpbmsnID8gc2V0dGluZyA6IHNldHRpbmdbcGtnTmFtZV07XG4vLyAgIGZvciAoY29uc3QgcHJvcCBvZiBtZXRhLnByb3BlcnRpZXMpIHtcbi8vICAgICBjb25zdCBwcm9wTWV0YSA9IHN0YXRlLnByb3BlcnR5QnlOYW1lLmdldChwa2dOYW1lICsgJywnICsgcHJvcCkhO1xuLy8gICAgIHRhYmxlLnB1c2goW1xuLy8gICAgICAgY2hhbGsuY3lhbihwcm9wTWV0YS5wcm9wZXJ0eSksXG4vLyAgICAgICAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcob3B0aW9uYWwpICcpIDogJycpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlKSArXG4vLyAgICAgICAgIChwcm9wTWV0YS5kZXNjID8gJyAtICcgKyBwcm9wTWV0YS5kZXNjIDogJycpXG4vLyAgICAgICAvLyBKU09OLnN0cmluZ2lmeSh2YWx1ZXNGb3JQa2dbcHJvcE1ldGEucHJvcGVydHldLCBudWxsLCAnICAnKVxuLy8gICAgIF0pO1xuLy8gICB9XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG4vLyAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuLy8gfVxuXG5mdW5jdGlvbiBwcmludFBhY2thZ2Uoe25hbWU6IHBrZ05hbWUsIHJlYWxQYXRofTogUGFja2FnZUluZm8pIHtcbiAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuICBjb25zdCBtZXRhID0gc3RhdGUucGFja2FnZU1ldGFCeU5hbWUuZ2V0KHBrZ05hbWUpO1xuICBpZiAobWV0YSA9PSBudWxsKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ05vIHNldHRpbmcgZm91bmQgZm9yIHBhY2thZ2UgJyArIHBrZ05hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHRibCA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG5cbiAgdGJsLnB1c2goW2BQYWNrYWdlICR7Y2hhbGsuZ3JlZW4ocGtnTmFtZSl9IHNldHRpbmcgJHsnfCAnICsgY2hhbGsuZ3JheShQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHJlYWxQYXRoKSl9YF0sXG4gICAgW2AgICR7Y2hhbGsuZ3JheShtZXRhLnR5cGVGaWxlKX1gXSk7XG4gIC8vIGNvbnNvbGUubG9nKGBQYWNrYWdlICR7Y2hhbGsuZ3JlZW4ocGtnTmFtZSl9IHNldHRpbmcgJHtjaGFsay5ncmF5KCd8ICcgKyBtZXRhLnR5cGVGaWxlKX1gKTtcbiAgY29uc29sZS5sb2codGJsLnRvU3RyaW5nKCkpO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBtZXRhLnByb3BlcnRpZXMpIHtcbiAgICBjb25zdCBwcm9wTWV0YSA9IHN0YXRlLnByb3BlcnR5QnlOYW1lLmdldChwa2dOYW1lICsgJywnICsgcHJvcCkhO1xuICAgIGNvbnNvbGUubG9nKCcgICAnICsgY2hhbGsuY3lhbihwcm9wTWV0YS5wcm9wZXJ0eSkgKyAnOiAnICtcbiAgICAgIChwcm9wTWV0YS5vcHRpb25hbCA/IGNoYWxrLmdyYXkoJyhvcHRpb25hbCkgJykgOiAnJykgKyBjaGFsay5tYWdlbnRhKHByb3BNZXRhLnR5cGUpKTtcbiAgICAvLyBjb25zb2xlLmxvZygnICAgICcgKyAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcgIChvcHRpb25hbCkgJykgOiAnICAnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZSkpO1xuICAgIGlmIChwcm9wTWV0YS5kZXNjKVxuICAgICAgY29uc29sZS5sb2coJyAgICAgIC0gJyArIHByb3BNZXRhLmRlc2MudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCAnXFxuICAgICAgJykpO1xuICB9XG59XG4iXX0=