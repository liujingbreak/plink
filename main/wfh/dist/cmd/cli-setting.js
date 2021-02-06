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
const index_1 = __importDefault(require("../config/index"));
const config_view_slice_1 = require("../config/config-view-slice");
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("./utils");
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("../utils/misc");
const chalk_1 = __importDefault(require("chalk"));
const util = __importStar(require("util"));
// import Path from 'path';
function default_1(pkgName) {
    return __awaiter(this, void 0, void 0, function* () {
        const wskey = package_mgr_1.workspaceKey(process.cwd());
        if (pkgName) {
            const foundPkgName = Array.from(utils_1.completePackageName([pkgName]))[0];
            if (foundPkgName == null) {
                throw new Error(`Package of name "${pkgName}" does not exist`);
            }
            pkgName = foundPkgName;
        }
        config_view_slice_1.getStore().pipe(op.map(s => s.updateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1), op.tap(() => {
            const state = config_view_slice_1.getState();
            const setting = index_1.default();
            if (pkgName) {
                printPackage(pkgName);
            }
            else {
                for (const name of state.packageNames) {
                    printPackage(name);
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
function printPackage(pkgName) {
    const state = config_view_slice_1.getState();
    const meta = state.packageMetaByName.get(pkgName);
    if (meta == null) {
        // tslint:disable-next-line: no-console
        console.log('No setting found for package ' + pkgName);
        return;
    }
    const table = misc_1.createCliTable({ horizontalLines: false, colWidths: [null, 50], colAligns: ['right', 'left'] });
    table.push(
    // tslint:disable-next-line: max-line-length
    [{ colSpan: 2, content: `Package ${chalk_1.default.green(pkgName)} setting ${chalk_1.default.gray('| ' + meta.typeFile)}`, hAlign: 'center' }], ['PROPERTY', 'TYPE AND DESCIPTION'].map(item => chalk_1.default.gray(item)), ['------', '-------'].map(item => chalk_1.default.gray(item)));
    // const valuesForPkg = pkgName === '@wfh/plink' ? setting : setting[pkgName];
    for (const prop of meta.properties) {
        const propMeta = state.propertyByName.get(pkgName + ',' + prop);
        table.push([
            chalk_1.default.cyan(propMeta.property),
            (propMeta.optional ? chalk_1.default.gray('(optional) ') : '') + chalk_1.default.magenta(propMeta.type) + ' - ' + propMeta.desc
            // JSON.stringify(valuesForPkg[propMeta.property], null, '  ')
        ]);
    }
    // tslint:disable: no-console
    console.log(table.toString());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNldHRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNERBQXFDO0FBQ3JDLG1FQUEyRTtBQUMzRSxnREFBNEM7QUFDNUMsbUNBQTRDO0FBQzVDLG1EQUFxQztBQUNyQyx3Q0FBNkM7QUFDN0Msa0RBQTBCO0FBQzFCLDJDQUE2QjtBQUM3QiwyQkFBMkI7QUFFM0IsbUJBQThCLE9BQWdCOztRQUM1QyxNQUFNLEtBQUssR0FBRywwQkFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLElBQUksT0FBTyxFQUFFO1lBQ1gsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBbUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRSxJQUFJLFlBQVksSUFBSSxJQUFJLEVBQUU7Z0JBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLE9BQU8sa0JBQWtCLENBQUMsQ0FBQzthQUNoRTtZQUNELE9BQU8sR0FBRyxZQUFZLENBQUM7U0FDeEI7UUFDRCw0QkFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3hELEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDdEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDVixNQUFNLEtBQUssR0FBRyw0QkFBUSxFQUFFLENBQUM7WUFFekIsTUFBTSxPQUFPLEdBQUcsZUFBTSxFQUFFLENBQUM7WUFDekIsSUFBSSxP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ImltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnL2luZGV4JztcbmltcG9ydCB7ZGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGdldFN0YXRlfSBmcm9tICcuLi9jb25maWcvY29uZmlnLXZpZXctc2xpY2UnO1xuaW1wb3J0IHt3b3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7Y29tcGxldGVQYWNrYWdlTmFtZX0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xuLy8gaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKHBrZ05hbWU/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NrZXkgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIGlmIChwa2dOYW1lKSB7XG4gICAgY29uc3QgZm91bmRQa2dOYW1lID0gQXJyYXkuZnJvbShjb21wbGV0ZVBhY2thZ2VOYW1lKFtwa2dOYW1lXSkpWzBdO1xuICAgIGlmIChmb3VuZFBrZ05hbWUgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYWNrYWdlIG9mIG5hbWUgXCIke3BrZ05hbWV9XCIgZG9lcyBub3QgZXhpc3RgKTtcbiAgICB9XG4gICAgcGtnTmFtZSA9IGZvdW5kUGtnTmFtZTtcbiAgfVxuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgb3AubWFwKHMgPT4gcy51cGRhdGVDaGVja3N1bSksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3Auc2tpcCgxKSwgb3AudGFrZSgxKSxcbiAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xuXG4gICAgICBjb25zdCBzZXR0aW5nID0gY29uZmlnKCk7XG4gICAgICBpZiAocGtnTmFtZSkge1xuICAgICAgICBwcmludFBhY2thZ2UocGtnTmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygc3RhdGUucGFja2FnZU5hbWVzISkge1xuICAgICAgICAgIHByaW50UGFja2FnZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5jeWFuKCdDb21wbGV0ZSBzZXR0aW5nIHZhbHVlczonKSk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChzZXR0aW5nLCBmYWxzZSwgNSkpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIGRpc3BhdGNoZXIubG9hZFBhY2thZ2VTZXR0aW5nTWV0YSh7d29ya3NwYWNlS2V5OiB3c2tleSwgcGFja2FnZU5hbWU6IHBrZ05hbWV9KTtcbn1cblxuZnVuY3Rpb24gcHJpbnRQYWNrYWdlKHBrZ05hbWU6IHN0cmluZykge1xuICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XG4gIGNvbnN0IG1ldGEgPSBzdGF0ZS5wYWNrYWdlTWV0YUJ5TmFtZS5nZXQocGtnTmFtZSk7XG4gIGlmIChtZXRhID09IG51bGwpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnTm8gc2V0dGluZyBmb3VuZCBmb3IgcGFja2FnZSAnICsgcGtnTmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2UsIGNvbFdpZHRoczogW251bGwsIDUwXSwgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnXX0pO1xuICB0YWJsZS5wdXNoKFxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgW3tjb2xTcGFuOiAyLCBjb250ZW50OiBgUGFja2FnZSAke2NoYWxrLmdyZWVuKHBrZ05hbWUpfSBzZXR0aW5nICR7Y2hhbGsuZ3JheSgnfCAnICsgbWV0YS50eXBlRmlsZSl9YCwgaEFsaWduOiAnY2VudGVyJ31dLFxuICAgIFsnUFJPUEVSVFknLCAnVFlQRSBBTkQgREVTQ0lQVElPTiddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgIFsnLS0tLS0tJywgJy0tLS0tLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKVxuICApO1xuICAvLyBjb25zdCB2YWx1ZXNGb3JQa2cgPSBwa2dOYW1lID09PSAnQHdmaC9wbGluaycgPyBzZXR0aW5nIDogc2V0dGluZ1twa2dOYW1lXTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIG1ldGEucHJvcGVydGllcykge1xuICAgIGNvbnN0IHByb3BNZXRhID0gc3RhdGUucHJvcGVydHlCeU5hbWUuZ2V0KHBrZ05hbWUgKyAnLCcgKyBwcm9wKSE7XG4gICAgdGFibGUucHVzaChbXG4gICAgICBjaGFsay5jeWFuKHByb3BNZXRhLnByb3BlcnR5KSxcbiAgICAgIChwcm9wTWV0YS5vcHRpb25hbCA/IGNoYWxrLmdyYXkoJyhvcHRpb25hbCkgJykgOiAnJykgKyBjaGFsay5tYWdlbnRhKHByb3BNZXRhLnR5cGUpICsgJyAtICcgKyBwcm9wTWV0YS5kZXNjXG4gICAgICAvLyBKU09OLnN0cmluZ2lmeSh2YWx1ZXNGb3JQa2dbcHJvcE1ldGEucHJvcGVydHldLCBudWxsLCAnICAnKVxuICAgIF0pO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xufVxuIl19