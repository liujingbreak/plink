"use strict";
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
const package_mgr_1 = require("../package-mgr");
const process_utils_1 = require("../process-utils");
const utils_1 = require("./utils");
const log4js_1 = __importDefault(require("log4js"));
// import Path from 'path';
require("../editor-helper");
const log = log4js_1.default.getLogger('plin.cli-bump');
function default_1(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.packages.length > 0) {
            yield bumpPackages(options.packages, options.increVersion);
        }
        else if (options.project.length > 0) {
            const pkgNames = options.project.map(proj => package_mgr_1.pathToProjKey(proj)).reduce((pkgs, proj) => {
                const pkgsOfProj = package_mgr_1.getState().project2Packages.get(proj);
                if (pkgsOfProj)
                    pkgs.push(...pkgsOfProj);
                return pkgs;
            }, []);
            yield bumpPackages(pkgNames, options.increVersion);
            yield new Promise(resolve => setImmediate(resolve));
        }
        package_mgr_1.actionDispatcher.scanAndSyncPackages({});
    });
}
exports.default = default_1;
function bumpPackages(pkgNames, increVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), pkgNames)).filter((pkg, idx) => {
            const rs = pkg != null;
            if (!rs) {
                log.error(`Can not find package for name like: ${pkgNames[idx]}`);
            }
            return rs;
        }).map((pkg) => {
            log.info(`bump ${pkg.name} version`);
            const pkDir = pkg.realPath;
            return process_utils_1.exe('npm', 'version', increVersion, { cwd: pkDir }).promise;
        }));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBeUU7QUFDekUsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFDNUIsMkJBQTJCO0FBQzNCLDRCQUEwQjtBQUUxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUU5QyxtQkFBOEIsT0FBMkM7O1FBQ3ZFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9CLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzVEO2FBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDckMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQywyQkFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUN0RSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDYixNQUFNLFVBQVUsR0FBRyxzQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLFVBQVU7b0JBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO2dCQUMzQixPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsRUFDRCxFQUFjLENBQUMsQ0FBQztZQUVsQixNQUFNLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ25ELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNyRDtRQUNELDhCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FBQTtBQWpCRCw0QkFpQkM7QUFFRCxTQUFlLFlBQVksQ0FBQyxRQUFrQixFQUFFLFlBQW9COztRQUNsRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDMUYsTUFBTSxFQUFFLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQztZQUN2QixJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUNQLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDbkU7WUFDRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2IsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLEdBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsT0FBTyxtQkFBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0J1bXBPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXksIGFjdGlvbkRpc3BhdGNoZXJ9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICcuLi9lZGl0b3ItaGVscGVyJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbi5jbGktYnVtcCcpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiBCdW1wT3B0aW9ucyAmIHtwYWNrYWdlczogc3RyaW5nW119KSB7XG4gIGlmIChvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBidW1wUGFja2FnZXMob3B0aW9ucy5wYWNrYWdlcywgb3B0aW9ucy5pbmNyZVZlcnNpb24pO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBvcHRpb25zLnByb2plY3QubWFwKHByb2ogPT4gcGF0aFRvUHJvaktleShwcm9qKSkucmVkdWNlKFxuICAgICAgKHBrZ3MsIHByb2opID0+IHtcbiAgICAgICAgY29uc3QgcGtnc09mUHJvaiA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaik7XG4gICAgICAgIGlmIChwa2dzT2ZQcm9qKVxuICAgICAgICAgIHBrZ3MucHVzaCguLi5wa2dzT2ZQcm9qKTtcbiAgICAgICAgcmV0dXJuIHBrZ3M7XG4gICAgICB9LFxuICAgICAgW10gYXMgc3RyaW5nW10pO1xuXG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKHBrZ05hbWVzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICB9XG4gIGFjdGlvbkRpc3BhdGNoZXIuc2NhbkFuZFN5bmNQYWNrYWdlcyh7fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGJ1bXBQYWNrYWdlcyhwa2dOYW1lczogc3RyaW5nW10sIGluY3JlVmVyc2lvbjogc3RyaW5nKSB7XG4gIGF3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBwa2dOYW1lcykpLmZpbHRlcigocGtnLCBpZHgpID0+IHtcbiAgICBjb25zdCBycyA9IHBrZyAhPSBudWxsO1xuICAgIGlmICghcnMpIHtcbiAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgbGlrZTogJHtwa2dOYW1lc1tpZHhdfWApO1xuICAgIH1cbiAgICByZXR1cm4gcnM7XG4gIH0pLm1hcCgocGtnKSA9PiB7XG4gICAgbG9nLmluZm8oYGJ1bXAgJHtwa2chLm5hbWV9IHZlcnNpb25gKTtcbiAgICBjb25zdCBwa0RpciA9IHBrZyEucmVhbFBhdGg7XG4gICAgcmV0dXJuIGV4ZSgnbnBtJywgJ3ZlcnNpb24nLCBpbmNyZVZlcnNpb24sIHtjd2Q6IHBrRGlyfSkucHJvbWlzZTtcbiAgfSkpO1xufVxuIl19