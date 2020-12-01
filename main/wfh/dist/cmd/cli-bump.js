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
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
const package_mgr_1 = require("../package-mgr");
// import * as Path from 'path';
const process_utils_1 = require("../process-utils");
const utils_1 = require("./utils");
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger('bump');
function default_1(options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
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
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1REFBK0I7QUFDL0IsK0RBQXNDO0FBQ3RDLGdEQUF1RDtBQUN2RCxnQ0FBZ0M7QUFDaEMsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFckMsbUJBQThCLE9BQTJDOztRQUN2RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFFcEIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDNUQ7YUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNyQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLDJCQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQ3RFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNiLE1BQU0sVUFBVSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQUksVUFBVTtvQkFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUM7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxFQUNELEVBQWMsQ0FBQyxDQUFDO1lBRWxCLE1BQU0sWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0NBQUE7QUFsQkQsNEJBa0JDO0FBRUQsU0FBZSxZQUFZLENBQUMsUUFBa0IsRUFBRSxZQUFvQjs7UUFDbEUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzFGLE1BQU0sRUFBRSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUM7WUFDdkIsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ25FO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQztZQUN0QyxNQUFNLEtBQUssR0FBRyxHQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLE9BQU8sbUJBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCdW1wT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYnVtcCcpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiBCdW1wT3B0aW9ucyAmIHtwYWNrYWdlczogc3RyaW5nW119KSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdGlvbnMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGlmIChvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBidW1wUGFja2FnZXMob3B0aW9ucy5wYWNrYWdlcywgb3B0aW9ucy5pbmNyZVZlcnNpb24pO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBvcHRpb25zLnByb2plY3QubWFwKHByb2ogPT4gcGF0aFRvUHJvaktleShwcm9qKSkucmVkdWNlKFxuICAgICAgKHBrZ3MsIHByb2opID0+IHtcbiAgICAgICAgY29uc3QgcGtnc09mUHJvaiA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaik7XG4gICAgICAgIGlmIChwa2dzT2ZQcm9qKVxuICAgICAgICAgIHBrZ3MucHVzaCguLi5wa2dzT2ZQcm9qKTtcbiAgICAgICAgcmV0dXJuIHBrZ3M7XG4gICAgICB9LFxuICAgICAgW10gYXMgc3RyaW5nW10pO1xuXG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKHBrZ05hbWVzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gYnVtcFBhY2thZ2VzKHBrZ05hbWVzOiBzdHJpbmdbXSwgaW5jcmVWZXJzaW9uOiBzdHJpbmcpIHtcbiAgYXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIHBrZ05hbWVzKSkuZmlsdGVyKChwa2csIGlkeCkgPT4ge1xuICAgIGNvbnN0IHJzID0gcGtnICE9IG51bGw7XG4gICAgaWYgKCFycykge1xuICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlOiAke3BrZ05hbWVzW2lkeF19YCk7XG4gICAgfVxuICAgIHJldHVybiBycztcbiAgfSkubWFwKChwa2cpID0+IHtcbiAgICBsb2cuaW5mbyhgYnVtcCAke3BrZyEubmFtZX0gdmVyc2lvbmApO1xuICAgIGNvbnN0IHBrRGlyID0gcGtnIS5yZWFsUGF0aDtcbiAgICByZXR1cm4gZXhlKCducG0nLCAndmVyc2lvbicsIGluY3JlVmVyc2lvbiwge2N3ZDogcGtEaXJ9KS5wcm9taXNlO1xuICB9KSk7XG59XG4iXX0=