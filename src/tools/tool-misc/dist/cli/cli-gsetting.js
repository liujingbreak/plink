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
        const pkgsInfo = Array.from(plink_1.findPackagesByNames(pkgs));
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
            const filesDone = template_gen_1.default(path_1.default.resolve(__dirname, '../../template-gsetting'), path_1.default.resolve(pkgInfo.realPath, 'isom'), {
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
            yield ts_cmd_1.tsc({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdzZXR0aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLWdzZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBaUQ7QUFDakQsb0ZBQWlFO0FBQ2pFLGlFQUE4RTtBQUM5RSx1REFBK0M7QUFDL0MsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzREFBNEI7QUFDNUIsb0RBQXVCO0FBRXZCLFNBQXNCLGVBQWUsQ0FBQyxJQUFjLEVBQUUsR0FBc0I7O1FBQzFFLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNkLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQztRQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixNQUFNLG9CQUFvQixHQUN4QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1lBQzdDLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtnQkFDbkIsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDdkYsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLFVB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SyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUN6QyxDQUFDLENBQUM7WUFDSCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDcEQsd0RBQWEsbUNBQW1DLEdBQUMsQ0FBQztZQUNsRCw4QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLGdCQUFnQixFQUNwRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzNCLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztDQUFBO0FBcEVELDBDQW9FQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZpbmRQYWNrYWdlc0J5TmFtZXMgfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQge2FjdGlvbkRpc3BhdGNoZXIsIFBhY2thZ2VJbmZvfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCB7dHNjfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTZXR0aW5nKHBrZ3M6IHN0cmluZ1tdLCBvcHQ6IHtkcnlSdW46IGJvb2xlYW59KSB7XG4gIGlmIChvcHQuZHJ5UnVuKSB7XG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ0RyeXJ1biBtb2RlJyk7XG4gIH1cbiAgY29uc3QgcGtnc0luZm8gPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMocGtncykpO1xuICBsZXQgaSA9IDA7XG4gIGNvbnN0IHBrZ0luZm9XaXRoSnNvbkZpbGVzOiBBcnJheTxbcGtnOiBQYWNrYWdlSW5mbywganNvbkZpbGU6IHN0cmluZ10gfCBudWxsPiA9XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocGtnc0luZm8ubWFwKGFzeW5jIHBrZ0luZm8gPT4ge1xuICAgICAgaWYgKHBrZ0luZm8gPT0gbnVsbCkge1xuICAgICAgICBwbGluay5sb2dnZXIuZXJyb3IoYFBhY2thZ2Ugbm90IGZvdW5kOiAke3BrZ3NbaV19YCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FtZWxDYXNlZCA9IHBrZ0luZm8uc2hvcnROYW1lLnJlcGxhY2UoLy0oW15dKS9nLCAobWF0Y2gsIGcxKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHVwcGVyQ2FzZUZpcnN0TmFtZSA9IGNhbWVsQ2FzZWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYW1lbENhc2VkLnNsaWNlKDEpICsgJ1NldHRpbmcnO1xuXG4gICAgICBjb25zdCBqc29uID0gXy5jbG9uZURlZXAocGtnSW5mby5qc29uKTtcbiAgICAgIGNvbnN0IHBrZ2pzb25Qcm9wID0ganNvbi5kciB8fCBqc29uLnBsaW5rITtcbiAgICAgIGlmIChwa2dqc29uUHJvcC5zZXR0aW5nKSB7XG4gICAgICAgIHBsaW5rLmxvZ2dlci53YXJuKGBUaGVyZSBoYXMgYmVlbiBhbiBleGlzdGluZyBcIiR7cGtnSW5mby5qc29uLmRyID8gJ2RyJyA6ICdwbGluayd9LnNldHRpbmdcIiBpbiAke3BrZ0luZm8ucmVhbFBhdGh9L3BhY2thZ2UuanNvbiBmaWxlYCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBwa2dqc29uUHJvcC5zZXR0aW5nID0ge1xuICAgICAgICB2YWx1ZTogYGlzb20vJHtwa2dJbmZvLnNob3J0TmFtZX0tc2V0dGluZy5qcyNkZWZhdWx0U2V0dGluZ2AsXG4gICAgICAgIHR5cGU6IGBpc29tLyR7cGtnSW5mby5zaG9ydE5hbWV9LXNldHRpbmcjYCArIHVwcGVyQ2FzZUZpcnN0TmFtZVxuICAgICAgfTtcblxuICAgICAgY29uc3QgcGtnanNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICcgICcpO1xuICAgICAgY29uc3QgcGtnanNvbkZpbGUgPSBQYXRoLnJlc29sdmUocGtnSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuXG4gICAgICBsZXQganNvbkRvbmU6IFByb21pc2U8YW55PjtcbiAgICAgIGlmIChvcHQuZHJ5UnVuKSB7XG4gICAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKGBXaWxsIHdyaXRlIGZpbGUgJHtwa2dqc29uRmlsZX06XFxuYCArIHBrZ2pzb25TdHIpO1xuICAgICAgICBqc29uRG9uZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAganNvbkRvbmUgPSBmcy5wcm9taXNlcy53cml0ZUZpbGUocGtnanNvbkZpbGUsIHBrZ2pzb25TdHIpO1xuICAgICAgICBwbGluay5sb2dnZXIuaW5mbyhgV3JpdGUgZmlsZSAke3BrZ2pzb25GaWxlfWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlc0RvbmUgPSBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtZ3NldHRpbmcnKSxcbiAgICAgICAgUGF0aC5yZXNvbHZlKHBrZ0luZm8ucmVhbFBhdGgsICdpc29tJyksIHtcbiAgICAgICAgICBmaWxlTWFwcGluZzogW1xuICAgICAgICAgICAgWy9mb29iYXIvZywgcGtnSW5mby5zaG9ydE5hbWVdXG4gICAgICAgICAgXSxcbiAgICAgICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICAgICAgZm9vYmFyUGFja2FnZTogcGtnSW5mby5uYW1lLFxuICAgICAgICAgICAgZm9vYmFyOiBjYW1lbENhc2VkLFxuICAgICAgICAgICAgRm9vYmFyOiBjYW1lbENhc2VkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgY2FtZWxDYXNlZC5zbGljZSgxKVxuICAgICAgICAgIH1cbiAgICAgICAgfSwge2RyeXJ1bjogb3B0LmRyeVJ1bn0pO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW2pzb25Eb25lLCBmaWxlc0RvbmVdKTtcbiAgICAgIHJldHVybiBbcGtnSW5mbywgcGtnanNvbkZpbGVdIGFzIFtwa2c6IFBhY2thZ2VJbmZvLCBqc29uRmlsZTogc3RyaW5nXTtcbiAgICB9KSk7XG5cbiAgaWYgKCFvcHQuZHJ5UnVuKSB7XG4gICAgY29uc3QgbWV0YSA9IHBrZ0luZm9XaXRoSnNvbkZpbGVzLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCk7XG4gICAgaWYgKG1ldGEubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIGF3YWl0IHRzYyh7XG4gICAgICBwYWNrYWdlOiBtZXRhLm1hcChpdGVtID0+IGl0ZW0hWzBdLm5hbWUpXG4gICAgfSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGF3YWl0IGltcG9ydCgnQHdmaC9wbGluay93ZmgvZGlzdC9lZGl0b3ItaGVscGVyJyk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5zY2FuQW5kU3luY1BhY2thZ2VzKHtwYWNrYWdlSnNvbkZpbGVzOlxuICAgICAgbWV0YS5tYXAoaXRlbSA9PiBpdGVtIVsxXSlcbiAgICB9KTtcbiAgfVxufVxuIl19