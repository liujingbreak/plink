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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQXNDO0FBQ3RDLDREQUFxQztBQUNyQyxtRUFBMkU7QUFDM0UsZ0RBQXlEO0FBQ3pELG1DQUFpRTtBQUNqRSxtREFBcUM7QUFDckMsd0NBQXVEO0FBQ3ZELGtEQUEwQjtBQUMxQiwyQ0FBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLG1DQUFpQztBQUVqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsbUJBQXdCLE9BQWdCO0lBQ3RDLE1BQU0sS0FBSyxHQUFHLDBCQUFZLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLElBQUksT0FBTyxFQUFFO1FBQ1gsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBbUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRSxJQUFJLFlBQVksSUFBSSxJQUFJLEVBQUU7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsT0FBTyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2hFO1FBQ0QsT0FBTyxHQUFHLFlBQVksQ0FBQztLQUN4QjtJQUNELDRCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDeEQsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0Qix5Q0FBeUM7SUFDekMsZ0NBQWdDO0lBQ2hDLCtCQUErQjtJQUMvQixzREFBc0Q7SUFDdEQsZUFB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c2xpbnQtZGlzYWJsZSAgbWF4LWxlbiwgbm8tY29uc29sZVxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcvaW5kZXgnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdG9yZSwgZ2V0U3RhdGV9IGZyb20gJy4uL2NvbmZpZy9jb25maWctdmlldy1zbGljZSc7XG5pbXBvcnQge3dvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lcywgY29tcGxldGVQYWNrYWdlTmFtZX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpLXNldHRpbmcnKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ocGtnTmFtZT86IHN0cmluZykge1xuICBjb25zdCB3c2tleSA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgaWYgKHBrZ05hbWUpIHtcbiAgICBjb25zdCBmb3VuZFBrZ05hbWUgPSBBcnJheS5mcm9tKGNvbXBsZXRlUGFja2FnZU5hbWUoW3BrZ05hbWVdKSlbMF07XG4gICAgaWYgKGZvdW5kUGtnTmFtZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhY2thZ2Ugb2YgbmFtZSBcIiR7cGtnTmFtZX1cIiBkb2VzIG5vdCBleGlzdGApO1xuICAgIH1cbiAgICBwa2dOYW1lID0gZm91bmRQa2dOYW1lO1xuICB9XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBvcC5tYXAocyA9PiBzLnVwZGF0ZUNoZWNrc3VtKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5za2lwKDEpLCBvcC50YWtlKDEpLFxuICAgIC8vIG9wLmNvbmNhdE1hcCgoKSA9PiBnZXRQa2dTdG9yZSgpLnBpcGUoXG4gICAgLy8gICBvcC5tYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAvLyAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICBvcC5maWx0ZXIocGtncyA9PiBwa2dzICE9IG51bGwgJiYgcGtncy5zaXplID4gMCksXG4gICAgLy8gICBvcC50YWtlKDEpXG4gICAgLy8gKSksXG4gICAgb3AudGFwKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgICAgIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKTtcblxuICAgICAgaWYgKHBrZ05hbWUpIHtcbiAgICAgICAgY29uc3QgW3BrZ10gPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoW3BrZ05hbWVdKSk7XG4gICAgICAgIHByaW50UGFja2FnZShwa2chKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGUucGFja2FnZU5hbWVzISkpO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gcGtncy5sZW5ndGggOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gcGtnc1tpXTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gc3RhdGUucGFja2FnZU5hbWVzIVtpXTtcbiAgICAgICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmb3VuZCBwYWNrYWdlIGluc3RhbGxlZCBvciBsaW5rZWQgZm9yIG5hbWU6ICR7bmFtZX1gKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcmludFBhY2thZ2UocGtnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgdGJsID0gY3JlYXRlQ2xpVGFibGUoKTtcbiAgICAgIHRibC5wdXNoKFsnQ29tcGxldGUgc2V0dGluZyB2YWx1ZXM6J10pO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHRibC50b1N0cmluZygpKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyh1dGlsLmluc3BlY3Qoc2V0dGluZywgZmFsc2UsIDUpKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBkaXNwYXRjaGVyLmxvYWRQYWNrYWdlU2V0dGluZ01ldGEoe3dvcmtzcGFjZUtleTogd3NrZXksIHBhY2thZ2VOYW1lOiBwa2dOYW1lfSk7XG59XG5cbi8vIGZ1bmN0aW9uIHByaW50UGFja2FnZUluRm9ybU9mVGFibGUocGtnTmFtZTogc3RyaW5nKSB7XG4vLyAgIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbi8vICAgY29uc3QgbWV0YSA9IHN0YXRlLnBhY2thZ2VNZXRhQnlOYW1lLmdldChwa2dOYW1lKTtcbi8vICAgaWYgKG1ldGEgPT0gbnVsbCkge1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICwgbm8tY29uc29sZVxuLy8gICAgIGNvbnNvbGUubG9nKCdObyBzZXR0aW5nIGZvdW5kIGZvciBwYWNrYWdlICcgKyBwa2dOYW1lKTtcbi8vICAgICByZXR1cm47XG4vLyAgIH1cbi8vICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZSwgY29sV2lkdGhzOiBbbnVsbCwgbnVsbF0sIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0J119KTtcbi8vICAgdGFibGUucHVzaChcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4vLyAgICAgW3tjb2xTcGFuOiAyLCBjb250ZW50OiBgUGFja2FnZSAke2NoYWxrLmdyZWVuKHBrZ05hbWUpfSBzZXR0aW5nICR7Y2hhbGsuZ3JheSgnfCAnICsgbWV0YS50eXBlRmlsZSl9YCwgaEFsaWduOiAnY2VudGVyJ31dLFxuLy8gICAgIFsnUFJPUEVSVFknLCAnVFlQRSBBTkQgREVTQ0lQVElPTiddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuLy8gICAgIFsnLS0tLS0tJywgJy0tLS0tLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKVxuLy8gICApO1xuLy8gICAvLyBjb25zdCB2YWx1ZXNGb3JQa2cgPSBwa2dOYW1lID09PSAnQHdmaC9wbGluaycgPyBzZXR0aW5nIDogc2V0dGluZ1twa2dOYW1lXTtcbi8vICAgZm9yIChjb25zdCBwcm9wIG9mIG1ldGEucHJvcGVydGllcykge1xuLy8gICAgIGNvbnN0IHByb3BNZXRhID0gc3RhdGUucHJvcGVydHlCeU5hbWUuZ2V0KHBrZ05hbWUgKyAnLCcgKyBwcm9wKSE7XG4vLyAgICAgdGFibGUucHVzaChbXG4vLyAgICAgICBjaGFsay5jeWFuKHByb3BNZXRhLnByb3BlcnR5KSxcbi8vICAgICAgIChwcm9wTWV0YS5vcHRpb25hbCA/IGNoYWxrLmdyYXkoJyhvcHRpb25hbCkgJykgOiAnJykgKyBjaGFsay5tYWdlbnRhKHByb3BNZXRhLnR5cGUpICtcbi8vICAgICAgICAgKHByb3BNZXRhLmRlc2MgPyAnIC0gJyArIHByb3BNZXRhLmRlc2MgOiAnJylcbi8vICAgICAgIC8vIEpTT04uc3RyaW5naWZ5KHZhbHVlc0ZvclBrZ1twcm9wTWV0YS5wcm9wZXJ0eV0sIG51bGwsICcgICcpXG4vLyAgICAgXSk7XG4vLyAgIH1cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbi8vICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4vLyB9XG5cbmZ1bmN0aW9uIHByaW50UGFja2FnZSh7bmFtZTogcGtnTmFtZSwgcmVhbFBhdGh9OiBQYWNrYWdlSW5mbykge1xuICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4gIGNvbnN0IG1ldGEgPSBzdGF0ZS5wYWNrYWdlTWV0YUJ5TmFtZS5nZXQocGtnTmFtZSk7XG4gIGlmIChtZXRhID09IG51bGwpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdObyBzZXR0aW5nIGZvdW5kIGZvciBwYWNrYWdlICcgKyBwa2dOYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0YmwgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuXG4gIHRibC5wdXNoKFtgUGFja2FnZSAke2NoYWxrLmdyZWVuKHBrZ05hbWUpfSBzZXR0aW5nICR7J3wgJyArIGNoYWxrLmdyYXkoUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCByZWFsUGF0aCkpfWBdLFxuICAgIFtgICAke2NoYWxrLmdyYXkobWV0YS50eXBlRmlsZSl9YF0pO1xuICAvLyBjb25zb2xlLmxvZyhgUGFja2FnZSAke2NoYWxrLmdyZWVuKHBrZ05hbWUpfSBzZXR0aW5nICR7Y2hhbGsuZ3JheSgnfCAnICsgbWV0YS50eXBlRmlsZSl9YCk7XG4gIGNvbnNvbGUubG9nKHRibC50b1N0cmluZygpKTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgbWV0YS5wcm9wZXJ0aWVzKSB7XG4gICAgY29uc3QgcHJvcE1ldGEgPSBzdGF0ZS5wcm9wZXJ0eUJ5TmFtZS5nZXQocGtnTmFtZSArICcsJyArIHByb3ApITtcbiAgICBjb25zb2xlLmxvZygnICAgJyArIGNoYWxrLmN5YW4ocHJvcE1ldGEucHJvcGVydHkpICsgJzogJyArXG4gICAgICAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcob3B0aW9uYWwpICcpIDogJycpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlLnJlcGxhY2UoL1xcbi9nLCAnXFxuICAnKSkpO1xuICAgIC8vIGNvbnNvbGUubG9nKCcgICAgJyArIChwcm9wTWV0YS5vcHRpb25hbCA/IGNoYWxrLmdyYXkoJyAgKG9wdGlvbmFsKSAnKSA6ICcgICcpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlKSk7XG4gICAgaWYgKHByb3BNZXRhLmRlc2MpXG4gICAgICBjb25zb2xlLmxvZygnICAgICAgLSAnICsgcHJvcE1ldGEuZGVzYy50cmltKCkucmVwbGFjZSgvXFxuL2csICdcXG4gICAgICAnKSk7XG4gIH1cbn1cbiJdfQ==