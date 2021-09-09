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
exports.generateSetting = void 0;
const plink_1 = require("@wfh/plink");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const ts_cmd_1 = require("@wfh/plink/wfh/dist/ts-cmd");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const __plink_1 = __importDefault(require("__plink"));
const lodash_1 = __importDefault(require("lodash"));
function generateSetting(pkgs, opt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (opt.dryRun) {
            __plink_1.default.logger.info('Dryrun mode');
        }
        const pkgsInfo = Array.from((0, plink_1.findPackagesByNames)(pkgs));
        let i = 0;
        const pkgInfoWithJsonFiles = yield Promise.all(pkgsInfo.map((pkgInfo) => __awaiter(this, void 0, void 0, function* () {
            if (pkgInfo == null) {
                __plink_1.default.logger.error(`Package not found: ${pkgs[i]}`);
                return null;
            }
            let camelCased = pkgInfo.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
            const upperCaseFirstName = camelCased.charAt(0).toUpperCase() + camelCased.slice(1) + 'Setting';
            const json = lodash_1.default.cloneDeep(pkgInfo.json);
            const pkgjsonProp = json.dr || json.plink;
            if (pkgjsonProp.setting) {
                __plink_1.default.logger.warn(`There has been an existing "${pkgInfo.json.dr ? 'dr' : 'plink'}.setting" in ${pkgInfo.realPath}/package.json file`);
                return null;
            }
            pkgjsonProp.setting = {
                value: `isom/${pkgInfo.shortName}-setting.js#defaultSetting`,
                type: `isom/${pkgInfo.shortName}-setting#` + upperCaseFirstName
            };
            const pkgjsonStr = JSON.stringify(json, null, '  ');
            const pkgjsonFile = path_1.default.resolve(pkgInfo.realPath, 'package.json');
            let jsonDone;
            if (opt.dryRun) {
                __plink_1.default.logger.info(`Will write file ${pkgjsonFile}:\n` + pkgjsonStr);
                jsonDone = Promise.resolve();
            }
            else {
                jsonDone = fs_1.default.promises.writeFile(pkgjsonFile, pkgjsonStr);
                __plink_1.default.logger.info(`Write file ${pkgjsonFile}`);
            }
            const filesDone = (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-gsetting'), path_1.default.resolve(pkgInfo.realPath, 'isom'), {
                fileMapping: [
                    [/foobar/g, pkgInfo.shortName]
                ],
                textMapping: {
                    foobarPackage: pkgInfo.name,
                    foobar: camelCased,
                    Foobar: camelCased.charAt(0).toUpperCase() + camelCased.slice(1)
                }
            }, { dryrun: opt.dryRun });
            yield Promise.all([jsonDone, filesDone]);
            return [pkgInfo, pkgjsonFile];
        })));
        if (!opt.dryRun) {
            const meta = pkgInfoWithJsonFiles.filter(item => item != null);
            if (meta.length === 0)
                return;
            yield (0, ts_cmd_1.tsc)({
                package: meta.map(item => item[0].name)
            });
            yield new Promise(resolve => setImmediate(resolve));
            yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/editor-helper')));
            package_mgr_1.actionDispatcher.scanAndSyncPackages({ packageJsonFiles: meta.map(item => item[1])
            });
        }
    });
}
exports.generateSetting = generateSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdzZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLWdzZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBaUQ7QUFDakQsb0ZBQWlFO0FBQ2pFLGlFQUE4RTtBQUM5RSx1REFBK0M7QUFDL0MsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzREFBNEI7QUFDNUIsb0RBQXVCO0FBRXZCLFNBQXNCLGVBQWUsQ0FBQyxJQUFjLEVBQUUsR0FBc0I7O1FBQzFFLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNkLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQztRQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLE1BQU0sb0JBQW9CLEdBQ3hCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQU0sT0FBTyxFQUFDLEVBQUU7WUFDN0MsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO2dCQUNuQixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3BELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUN2RixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdB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QyxFQUFFLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUN6QyxDQUFDLENBQUM7WUFDSCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDcEQsd0RBQWEsbUNBQW1DLEdBQUMsQ0FBQztZQUNsRCw4QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLGdCQUFnQixFQUNwRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzNCLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUFBO0FBcEVELDBDQW9FQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZpbmRQYWNrYWdlc0J5TmFtZXMgfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQge2FjdGlvbkRpc3BhdGNoZXIsIFBhY2thZ2VJbmZvfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCB7dHNjfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTZXR0aW5nKHBrZ3M6IHN0cmluZ1tdLCBvcHQ6IHtkcnlSdW46IGJvb2xlYW59KSB7XG4gIGlmIChvcHQuZHJ5UnVuKSB7XG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ0RyeXJ1biBtb2RlJyk7XG4gIH1cbiAgY29uc3QgcGtnc0luZm8gPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMocGtncykpO1xuICBsZXQgaSA9IDA7XG4gIGNvbnN0IHBrZ0luZm9XaXRoSnNvbkZpbGVzOiBBcnJheTxbcGtnOiBQYWNrYWdlSW5mbywganNvbkZpbGU6IHN0cmluZ10gfCBudWxsPiA9XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocGtnc0luZm8ubWFwKGFzeW5jIHBrZ0luZm8gPT4ge1xuICAgICAgaWYgKHBrZ0luZm8gPT0gbnVsbCkge1xuICAgICAgICBwbGluay5sb2dnZXIuZXJyb3IoYFBhY2thZ2Ugbm90IGZvdW5kOiAke3BrZ3NbaV19YCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FtZWxDYXNlZCA9IHBrZ0luZm8uc2hvcnROYW1lLnJlcGxhY2UoLy0oW15dKS9nLCAobWF0Y2gsIGcxKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHVwcGVyQ2FzZUZpcnN0TmFtZSA9IGNhbWVsQ2FzZWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYW1lbENhc2VkLnNsaWNlKDEpICsgJ1NldHRpbmcnO1xuXG4gICAgICBjb25zdCBqc29uID0gXy5jbG9uZURlZXAocGtnSW5mby5qc29uKTtcbiAgICAgIGNvbnN0IHBrZ2pzb25Qcm9wID0ganNvbi5kciB8fCBqc29uLnBsaW5rITtcbiAgICAgIGlmIChwa2dqc29uUHJvcC5zZXR0aW5nKSB7XG4gICAgICAgIHBsaW5rLmxvZ2dlci53YXJuKGBUaGVyZSBoYXMgYmVlbiBhbiBleGlzdGluZyBcIiR7cGtnSW5mby5qc29uLmRyID8gJ2RyJyA6ICdwbGluayd9LnNldHRpbmdcIiBpbiAke3BrZ0luZm8ucmVhbFBhdGh9L3BhY2thZ2UuanNvbiBmaWxlYCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBwa2dqc29uUHJvcC5zZXR0aW5nID0ge1xuICAgICAgICB2YWx1ZTogYGlzb20vJHtwa2dJbmZvLnNob3J0TmFtZX0tc2V0dGluZy5qcyNkZWZhdWx0U2V0dGluZ2AsXG4gICAgICAgIHR5cGU6IGBpc29tLyR7cGtnSW5mby5zaG9ydE5hbWV9LXNldHRpbmcjYCArIHVwcGVyQ2FzZUZpcnN0TmFtZVxuICAgICAgfTtcblxuICAgICAgY29uc3QgcGtnanNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICcgICcpO1xuICAgICAgY29uc3QgcGtnanNvbkZpbGUgPSBQYXRoLnJlc29sdmUocGtnSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuXG4gICAgICBsZXQganNvbkRvbmU6IFByb21pc2U8YW55PjtcbiAgICAgIGlmIChvcHQuZHJ5UnVuKSB7XG4gICAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKGBXaWxsIHdyaXRlIGZpbGUgJHtwa2dqc29uRmlsZX06XFxuYCArIHBrZ2pzb25TdHIpO1xuICAgICAgICBqc29uRG9uZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAganNvbkRvbmUgPSBmcy5wcm9taXNlcy53cml0ZUZpbGUocGtnanNvbkZpbGUsIHBrZ2pzb25TdHIpO1xuICAgICAgICBwbGluay5sb2dnZXIuaW5mbyhgV3JpdGUgZmlsZSAke3BrZ2pzb25GaWxlfWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlc0RvbmUgPSBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtZ3NldHRpbmcnKSxcbiAgICAgICAgUGF0aC5yZXNvbHZlKHBrZ0luZm8ucmVhbFBhdGgsICdpc29tJyksIHtcbiAgICAgICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICAgICAgWy9mb29iYXIvZywgcGtnSW5mby5zaG9ydE5hbWVdXG4gICAgICAgICAgXSxcbiAgICAgICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICAgICAgZm9vYmFyUGFja2FnZTogcGtnSW5mby5uYW1lLFxuICAgICAgICAgICAgZm9vYmFyOiBjYW1lbENhc2VkLFxuICAgICAgICAgICAgRm9vYmFyOiBjYW1lbENhc2VkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY2FtZWxDYXNlZC5zbGljZSgxKVxuICAgICAgICAgIH1cbiAgICAgICAgfSwge2RyeXJ1bjogb3B0LmRyeVJ1bn0pO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW2pzb25Eb25lLCBmaWxlc0RvbmVdKTtcbiAgICAgIHJldHVybiBbcGtnSW5mbywgcGtnanNvbkZpbGVdIGFzIFtwa2c6IFBhY2thZ2VJbmZvLCBqc29uRmlsZTogc3RyaW5nXTtcbiAgICB9KSk7XG5cbiAgaWYgKCFvcHQuZHJ5UnVuKSB7XG4gICAgY29uc3QgbWV0YSA9IHBrZ0luZm9XaXRoSnNvbkZpbGVzLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gICAgaWYgKG1ldGEubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIGF3YWl0IHRzYyh7XG4gICAgICBwYWNrYWdlOiBtZXRhLm1hcChpdGVtID0+IGl0ZW0hWzBdLm5hbWUpXG4gICAgfSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGF3YWl0IGltcG9ydCgnQHdmaC9wbGluay93ZmgvZGlzdC9lZGl0b3ItaGVscGVyJyk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5zY2FuQW5kU3luY1BhY2thZ2VzKHtwYWNrYWdlSnNvbkZpbGVzOlxuICAgICAgbWV0YS5tYXAoaXRlbSA9PiBpdGVtIVsxXSlcbiAgICB9KTtcbiAgfVxufVxuIl19