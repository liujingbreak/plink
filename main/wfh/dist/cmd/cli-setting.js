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
            const tbl = misc_1.createCliTable();
            tbl.push(['Complete setting values:']);
            // tslint:disable-next-line: no-console
            console.log(tbl.toString());
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
            (propMeta.optional ? chalk_1.default.gray('(optional) ') : '') + chalk_1.default.magenta(propMeta.type.replace(/\n/g, '\n  ')));
        // console.log('    ' + (propMeta.optional ? chalk.gray('  (optional) ') : '  ') + chalk.magenta(propMeta.type));
        if (propMeta.desc)
            console.log('      - ' + propMeta.desc.trim().replace(/\n/g, '\n      '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNENBQTRDO0FBQzVDLDREQUFxQztBQUNyQyxtRUFBMkU7QUFDM0UsZ0RBQXlEO0FBQ3pELG1DQUE0QztBQUM1QyxtQ0FBNEM7QUFDNUMsbURBQXFDO0FBQ3JDLHdDQUE2QztBQUM3QyxrREFBMEI7QUFDMUIsMkNBQTZCO0FBQzdCLGdEQUF3QjtBQUN4QixtQ0FBaUM7QUFFakMsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLG1CQUE4QixPQUFnQjs7UUFDNUMsTUFBTSxLQUFLLEdBQUcsMEJBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMxQyxJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsSUFBSSxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixPQUFPLGtCQUFrQixDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLEdBQUcsWUFBWSxDQUFDO1NBQ3hCO1FBQ0QsNEJBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN4RCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLHlDQUF5QztRQUN6QyxnQ0FBZ0M7UUFDaEMs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Q0FBQztLQUM3RTtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggbm8tY29uc29sZVxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcvaW5kZXgnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdG9yZSwgZ2V0U3RhdGV9IGZyb20gJy4uL2NvbmZpZy9jb25maWctdmlldy1zbGljZSc7XG5pbXBvcnQge3dvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpLXNldHRpbmcnKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ocGtnTmFtZT86IHN0cmluZykge1xuICBjb25zdCB3c2tleSA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgaWYgKHBrZ05hbWUpIHtcbiAgICBjb25zdCBmb3VuZFBrZ05hbWUgPSBBcnJheS5mcm9tKGNvbXBsZXRlUGFja2FnZU5hbWUoW3BrZ05hbWVdKSlbMF07XG4gICAgaWYgKGZvdW5kUGtnTmFtZSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhY2thZ2Ugb2YgbmFtZSBcIiR7cGtnTmFtZX1cIiBkb2VzIG5vdCBleGlzdGApO1xuICAgIH1cbiAgICBwa2dOYW1lID0gZm91bmRQa2dOYW1lO1xuICB9XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBvcC5tYXAocyA9PiBzLnVwZGF0ZUNoZWNrc3VtKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5za2lwKDEpLCBvcC50YWtlKDEpLFxuICAgIC8vIG9wLmNvbmNhdE1hcCgoKSA9PiBnZXRQa2dTdG9yZSgpLnBpcGUoXG4gICAgLy8gICBvcC5tYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAvLyAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICBvcC5maWx0ZXIocGtncyA9PiBwa2dzICE9IG51bGwgJiYgcGtncy5zaXplID4gMCksXG4gICAgLy8gICBvcC50YWtlKDEpXG4gICAgLy8gKSksXG4gICAgb3AudGFwKCgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgICAgIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKTtcblxuICAgICAgaWYgKHBrZ05hbWUpIHtcbiAgICAgICAgY29uc3QgW3BrZ10gPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoW3BrZ05hbWVdKSk7XG4gICAgICAgIHByaW50UGFja2FnZShwa2chKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHBrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoc3RhdGUucGFja2FnZU5hbWVzISkpO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gcGtncy5sZW5ndGggOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gcGtnc1tpXTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gc3RhdGUucGFja2FnZU5hbWVzIVtpXTtcbiAgICAgICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmb3VuZCBwYWNrYWdlIGluc3RhbGxlZCBvciBsaW5rZWQgZm9yIG5hbWU6ICR7bmFtZX1gKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcmludFBhY2thZ2UocGtnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgdGJsID0gY3JlYXRlQ2xpVGFibGUoKTtcbiAgICAgIHRibC5wdXNoKFsnQ29tcGxldGUgc2V0dGluZyB2YWx1ZXM6J10pXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHRibC50b1N0cmluZygpKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2codXRpbC5pbnNwZWN0KHNldHRpbmcsIGZhbHNlLCA1KSk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgZGlzcGF0Y2hlci5sb2FkUGFja2FnZVNldHRpbmdNZXRhKHt3b3Jrc3BhY2VLZXk6IHdza2V5LCBwYWNrYWdlTmFtZTogcGtnTmFtZX0pO1xufVxuXG4vLyBmdW5jdGlvbiBwcmludFBhY2thZ2VJbkZvcm1PZlRhYmxlKHBrZ05hbWU6IHN0cmluZykge1xuLy8gICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4vLyAgIGNvbnN0IG1ldGEgPSBzdGF0ZS5wYWNrYWdlTWV0YUJ5TmFtZS5nZXQocGtnTmFtZSk7XG4vLyAgIGlmIChtZXRhID09IG51bGwpIHtcbi8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgICBjb25zb2xlLmxvZygnTm8gc2V0dGluZyBmb3VuZCBmb3IgcGFja2FnZSAnICsgcGtnTmFtZSk7XG4vLyAgICAgcmV0dXJuO1xuLy8gICB9XG4vLyAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2UsIGNvbFdpZHRoczogW251bGwsIG51bGxdLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddfSk7XG4vLyAgIHRhYmxlLnB1c2goXG4vLyAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbi8vICAgICBbe2NvbFNwYW46IDIsIGNvbnRlbnQ6IGBQYWNrYWdlICR7Y2hhbGsuZ3JlZW4ocGtnTmFtZSl9IHNldHRpbmcgJHtjaGFsay5ncmF5KCd8ICcgKyBtZXRhLnR5cGVGaWxlKX1gLCBoQWxpZ246ICdjZW50ZXInfV0sXG4vLyAgICAgWydQUk9QRVJUWScsICdUWVBFIEFORCBERVNDSVBUSU9OJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4vLyAgICAgWyctLS0tLS0nLCAnLS0tLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4vLyAgICk7XG4vLyAgIC8vIGNvbnN0IHZhbHVlc0ZvclBrZyA9IHBrZ05hbWUgPT09ICdAd2ZoL3BsaW5rJyA/IHNldHRpbmcgOiBzZXR0aW5nW3BrZ05hbWVdO1xuLy8gICBmb3IgKGNvbnN0IHByb3Agb2YgbWV0YS5wcm9wZXJ0aWVzKSB7XG4vLyAgICAgY29uc3QgcHJvcE1ldGEgPSBzdGF0ZS5wcm9wZXJ0eUJ5TmFtZS5nZXQocGtnTmFtZSArICcsJyArIHByb3ApITtcbi8vICAgICB0YWJsZS5wdXNoKFtcbi8vICAgICAgIGNoYWxrLmN5YW4ocHJvcE1ldGEucHJvcGVydHkpLFxuLy8gICAgICAgKHByb3BNZXRhLm9wdGlvbmFsID8gY2hhbGsuZ3JheSgnKG9wdGlvbmFsKSAnKSA6ICcnKSArIGNoYWxrLm1hZ2VudGEocHJvcE1ldGEudHlwZSkgK1xuLy8gICAgICAgICAocHJvcE1ldGEuZGVzYyA/ICcgLSAnICsgcHJvcE1ldGEuZGVzYyA6ICcnKVxuLy8gICAgICAgLy8gSlNPTi5zdHJpbmdpZnkodmFsdWVzRm9yUGtnW3Byb3BNZXRhLnByb3BlcnR5XSwgbnVsbCwgJyAgJylcbi8vICAgICBdKTtcbi8vICAgfVxuLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuLy8gICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbi8vIH1cblxuZnVuY3Rpb24gcHJpbnRQYWNrYWdlKHtuYW1lOiBwa2dOYW1lLCByZWFsUGF0aH06IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgY29uc3QgbWV0YSA9IHN0YXRlLnBhY2thZ2VNZXRhQnlOYW1lLmdldChwa2dOYW1lKTtcbiAgaWYgKG1ldGEgPT0gbnVsbCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdObyBzZXR0aW5nIGZvdW5kIGZvciBwYWNrYWdlICcgKyBwa2dOYW1lKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0YmwgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuXG4gIHRibC5wdXNoKFtgUGFja2FnZSAke2NoYWxrLmdyZWVuKHBrZ05hbWUpfSBzZXR0aW5nICR7J3wgJyArIGNoYWxrLmdyYXkoUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCByZWFsUGF0aCkpfWBdLFxuICAgIFtgICAke2NoYWxrLmdyYXkobWV0YS50eXBlRmlsZSl9YF0pO1xuICAvLyBjb25zb2xlLmxvZyhgUGFja2FnZSAke2NoYWxrLmdyZWVuKHBrZ05hbWUpfSBzZXR0aW5nICR7Y2hhbGsuZ3JheSgnfCAnICsgbWV0YS50eXBlRmlsZSl9YCk7XG4gIGNvbnNvbGUubG9nKHRibC50b1N0cmluZygpKTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgbWV0YS5wcm9wZXJ0aWVzKSB7XG4gICAgY29uc3QgcHJvcE1ldGEgPSBzdGF0ZS5wcm9wZXJ0eUJ5TmFtZS5nZXQocGtnTmFtZSArICcsJyArIHByb3ApITtcbiAgICBjb25zb2xlLmxvZygnICAgJyArIGNoYWxrLmN5YW4ocHJvcE1ldGEucHJvcGVydHkpICsgJzogJyArXG4gICAgICAocHJvcE1ldGEub3B0aW9uYWwgPyBjaGFsay5ncmF5KCcob3B0aW9uYWwpICcpIDogJycpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlLnJlcGxhY2UoL1xcbi9nLCAnXFxuICAnKSkpO1xuICAgIC8vIGNvbnNvbGUubG9nKCcgICAgJyArIChwcm9wTWV0YS5vcHRpb25hbCA/IGNoYWxrLmdyYXkoJyAgKG9wdGlvbmFsKSAnKSA6ICcgICcpICsgY2hhbGsubWFnZW50YShwcm9wTWV0YS50eXBlKSk7XG4gICAgaWYgKHByb3BNZXRhLmRlc2MpXG4gICAgICBjb25zb2xlLmxvZygnICAgICAgLSAnICsgcHJvcE1ldGEuZGVzYy50cmltKCkucmVwbGFjZSgvXFxuL2csICdcXG4gICAgICAnKSk7XG4gIH1cbn1cbiJdfQ==