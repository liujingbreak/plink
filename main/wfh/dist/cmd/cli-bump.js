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
const package_mgr_1 = require("../package-mgr");
const process_utils_1 = require("../process-utils");
const utils_1 = require("./utils");
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger('plin.cli-bump');
function default_1(options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(options);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1REFBK0I7QUFDL0IsZ0RBQXVEO0FBQ3ZELG9EQUF1QztBQUN2QyxtQ0FBNEM7QUFDNUMsb0RBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRTlDLG1CQUE4QixPQUEyQzs7UUFDdkUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzQixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMvQixNQUFNLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM1RDthQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsMkJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FDdEUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQ2IsTUFBTSxVQUFVLEdBQUcsc0JBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekQsSUFBSSxVQUFVO29CQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztnQkFDM0IsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLEVBQ0QsRUFBYyxDQUFDLENBQUM7WUFFbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUM7Q0FBQTtBQWpCRCw0QkFpQkM7QUFFRCxTQUFlLFlBQVksQ0FBQyxRQUFrQixFQUFFLFlBQW9COztRQUNsRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDMUYsTUFBTSxFQUFFLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQztZQUN2QixJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUNQLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDbkU7WUFDRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2IsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLEdBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsT0FBTyxtQkFBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0J1bXBPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbi5jbGktYnVtcCcpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRpb25zOiBCdW1wT3B0aW9ucyAmIHtwYWNrYWdlczogc3RyaW5nW119KSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zLnBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBhd2FpdCBidW1wUGFja2FnZXMob3B0aW9ucy5wYWNrYWdlcywgb3B0aW9ucy5pbmNyZVZlcnNpb24pO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBvcHRpb25zLnByb2plY3QubWFwKHByb2ogPT4gcGF0aFRvUHJvaktleShwcm9qKSkucmVkdWNlKFxuICAgICAgKHBrZ3MsIHByb2opID0+IHtcbiAgICAgICAgY29uc3QgcGtnc09mUHJvaiA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaik7XG4gICAgICAgIGlmIChwa2dzT2ZQcm9qKVxuICAgICAgICAgIHBrZ3MucHVzaCguLi5wa2dzT2ZQcm9qKTtcbiAgICAgICAgcmV0dXJuIHBrZ3M7XG4gICAgICB9LFxuICAgICAgW10gYXMgc3RyaW5nW10pO1xuXG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKHBrZ05hbWVzLCBvcHRpb25zLmluY3JlVmVyc2lvbik7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gYnVtcFBhY2thZ2VzKHBrZ05hbWVzOiBzdHJpbmdbXSwgaW5jcmVWZXJzaW9uOiBzdHJpbmcpIHtcbiAgYXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIHBrZ05hbWVzKSkuZmlsdGVyKChwa2csIGlkeCkgPT4ge1xuICAgIGNvbnN0IHJzID0gcGtnICE9IG51bGw7XG4gICAgaWYgKCFycykge1xuICAgICAgbG9nLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlOiAke3BrZ05hbWVzW2lkeF19YCk7XG4gICAgfVxuICAgIHJldHVybiBycztcbiAgfSkubWFwKChwa2cpID0+IHtcbiAgICBsb2cuaW5mbyhgYnVtcCAke3BrZyEubmFtZX0gdmVyc2lvbmApO1xuICAgIGNvbnN0IHBrRGlyID0gcGtnIS5yZWFsUGF0aDtcbiAgICByZXR1cm4gZXhlKCducG0nLCAndmVyc2lvbicsIGluY3JlVmVyc2lvbiwge2N3ZDogcGtEaXJ9KS5wcm9taXNlO1xuICB9KSk7XG59XG4iXX0=