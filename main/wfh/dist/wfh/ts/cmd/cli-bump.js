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
        yield Promise.all(Array.from(utils_1.completePackageName(package_mgr_1.getState(), pkgNames)).filter(pkgName => {
            const rs = pkgName != null;
            if (!rs) {
                log.error(`Can not find package for name like: ${pkgName}`);
            }
            return rs;
        }).map((pkgName) => {
            log.info(`bump ${pkgName} version`);
            const pkDir = package_mgr_1.getState().srcPackages.get(pkgName).realPath;
            return process_utils_1.exe('npm', 'version', increVersion, { cwd: pkDir }).promise;
        }));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1REFBK0I7QUFDL0IsK0RBQXNDO0FBQ3RDLGdEQUF1RDtBQUN2RCxnQ0FBZ0M7QUFDaEMsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFckMsbUJBQThCLE9BQTJDOztRQUN2RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFFcEIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDNUQ7YUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNyQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLDJCQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQ3RFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNiLE1BQU0sVUFBVSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQUksVUFBVTtvQkFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUM7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxFQUNELEVBQWMsQ0FBQyxDQUFDO1lBRWxCLE1BQU0sWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0NBQUE7QUFsQkQsNEJBa0JDO0FBRUQsU0FBZSxZQUFZLENBQUMsUUFBa0IsRUFBRSxZQUFvQjs7UUFDbEUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZGLE1BQU0sRUFBRSxHQUFHLE9BQU8sSUFBSSxJQUFJLENBQUM7WUFDM0IsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2FBQzdEO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNqQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsT0FBTyxVQUFVLENBQUMsQ0FBQztZQUNwQyxNQUFNLEtBQUssR0FBRyxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQUUsQ0FBQyxRQUFRLENBQUM7WUFDN0QsT0FBTyxtQkFBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0J1bXBPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge2NvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdidW1wJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdGlvbnM6IEJ1bXBPcHRpb25zICYge3BhY2thZ2VzOiBzdHJpbmdbXX0pIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbiAgaWYgKG9wdGlvbnMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IGJ1bXBQYWNrYWdlcyhvcHRpb25zLnBhY2thZ2VzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IG9wdGlvbnMucHJvamVjdC5tYXAocHJvaiA9PiBwYXRoVG9Qcm9qS2V5KHByb2opKS5yZWR1Y2UoXG4gICAgICAocGtncywgcHJvaikgPT4ge1xuICAgICAgICBjb25zdCBwa2dzT2ZQcm9qID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcm9qKTtcbiAgICAgICAgaWYgKHBrZ3NPZlByb2opXG4gICAgICAgICAgcGtncy5wdXNoKC4uLnBrZ3NPZlByb2opO1xuICAgICAgICByZXR1cm4gcGtncztcbiAgICAgIH0sXG4gICAgICBbXSBhcyBzdHJpbmdbXSk7XG5cbiAgICBhd2FpdCBidW1wUGFja2FnZXMocGtnTmFtZXMsIG9wdGlvbnMuaW5jcmVWZXJzaW9uKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBidW1wUGFja2FnZXMocGtnTmFtZXM6IHN0cmluZ1tdLCBpbmNyZVZlcnNpb246IHN0cmluZykge1xuICBhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGNvbXBsZXRlUGFja2FnZU5hbWUoZ2V0U3RhdGUoKSwgcGtnTmFtZXMpKS5maWx0ZXIocGtnTmFtZSA9PiB7XG4gICAgY29uc3QgcnMgPSBwa2dOYW1lICE9IG51bGw7XG4gICAgaWYgKCFycykge1xuICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlOiAke3BrZ05hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiBycztcbiAgfSkubWFwKChwa2dOYW1lKSA9PiB7XG4gICAgbG9nLmluZm8oYGJ1bXAgJHtwa2dOYW1lfSB2ZXJzaW9uYCk7XG4gICAgY29uc3QgcGtEaXIgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lISkhLnJlYWxQYXRoO1xuICAgIHJldHVybiBleGUoJ25wbScsICd2ZXJzaW9uJywgaW5jcmVWZXJzaW9uLCB7Y3dkOiBwa0Rpcn0pLnByb21pc2U7XG4gIH0pKTtcbn1cbiJdfQ==