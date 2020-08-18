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
                pkgs.push(...package_mgr_1.getState().project2Packages[proj]);
                return pkgs;
            }, []);
            yield bumpPackages(pkgNames, options.increVersion);
        }
    });
}
exports.default = default_1;
function bumpPackages(pkgNames, increVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(utils_1.completePackageName(package_mgr_1.getState(), pkgNames).filter(pkgName => {
            const rs = pkgName != null;
            if (!rs) {
                log.error(`Can not find package for name like: ${pkgName}`);
            }
            return rs;
        }).map((pkgName) => {
            log.info(`bump ${pkgName} version`);
            const pkDir = package_mgr_1.getState().srcPackages[pkgName].realPath;
            return process_utils_1.exe('npm', 'version', increVersion, { cwd: pkDir }).promise;
        }));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1REFBK0I7QUFDL0IsK0RBQXNDO0FBQ3RDLGdEQUF1RDtBQUN2RCxnQ0FBZ0M7QUFDaEMsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFckMsbUJBQThCLE9BQTJDOztRQUN2RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFFcEIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDNUQ7YUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNyQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLDJCQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQ3RFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxzQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDaEQsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLEVBQ0QsRUFBYyxDQUFDLENBQUM7WUFFbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUM7Q0FBQTtBQWhCRCw0QkFnQkM7QUFFRCxTQUFlLFlBQVksQ0FBQyxRQUFrQixFQUFFLFlBQW9COztRQUNsRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMzRSxNQUFNLEVBQUUsR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDO1lBQzNCLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ1AsR0FBRyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUM3RDtZQUNELE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLE9BQU8sVUFBVSxDQUFDLENBQUM7WUFDcEMsTUFBTSxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFRLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDeEQsT0FBTyxtQkFBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0J1bXBPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge2NvbXBsZXRlUGFja2FnZU5hbWV9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdidW1wJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdGlvbnM6IEJ1bXBPcHRpb25zICYge3BhY2thZ2VzOiBzdHJpbmdbXX0pIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbiAgaWYgKG9wdGlvbnMucGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgIGF3YWl0IGJ1bXBQYWNrYWdlcyhvcHRpb25zLnBhY2thZ2VzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IG9wdGlvbnMucHJvamVjdC5tYXAocHJvaiA9PiBwYXRoVG9Qcm9qS2V5KHByb2opKS5yZWR1Y2UoXG4gICAgICAocGtncywgcHJvaikgPT4ge1xuICAgICAgICBwa2dzLnB1c2goLi4uZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzW3Byb2pdKTtcbiAgICAgICAgcmV0dXJuIHBrZ3M7XG4gICAgICB9LFxuICAgICAgW10gYXMgc3RyaW5nW10pO1xuXG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKHBrZ05hbWVzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gYnVtcFBhY2thZ2VzKHBrZ05hbWVzOiBzdHJpbmdbXSwgaW5jcmVWZXJzaW9uOiBzdHJpbmcpIHtcbiAgYXdhaXQgUHJvbWlzZS5hbGwoY29tcGxldGVQYWNrYWdlTmFtZShnZXRTdGF0ZSgpLCBwa2dOYW1lcykuZmlsdGVyKHBrZ05hbWUgPT4ge1xuICAgIGNvbnN0IHJzID0gcGtnTmFtZSAhPSBudWxsO1xuICAgIGlmICghcnMpIHtcbiAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgbGlrZTogJHtwa2dOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gcnM7XG4gIH0pLm1hcCgocGtnTmFtZSkgPT4ge1xuICAgIGxvZy5pbmZvKGBidW1wICR7cGtnTmFtZX0gdmVyc2lvbmApO1xuICAgIGNvbnN0IHBrRGlyID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlc1twa2dOYW1lIV0ucmVhbFBhdGg7XG4gICAgcmV0dXJuIGV4ZSgnbnBtJywgJ3ZlcnNpb24nLCBpbmNyZVZlcnNpb24sIHtjd2Q6IHBrRGlyfSkucHJvbWlzZTtcbiAgfSkpO1xufVxuIl19