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
            const pkgNames = options.project.map(proj => (0, package_mgr_1.pathToProjKey)(proj)).reduce((pkgs, proj) => {
                const pkgsOfProj = (0, package_mgr_1.getState)().project2Packages.get(proj);
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
        yield Promise.all(Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), pkgNames)).filter((pkg, idx) => {
            const rs = pkg != null;
            if (!rs) {
                log.error(`Can not find package for name like: ${pkgNames[idx]}`);
            }
            return rs;
        }).map((pkg) => {
            log.info(`bump ${pkg.name} version`);
            const pkDir = pkg.realPath;
            return (0, process_utils_1.exe)('npm', 'version', increVersion, { cwd: pkDir }).promise;
        }));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBeUU7QUFDekUsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFDNUIsMkJBQTJCO0FBQzNCLDRCQUEwQjtBQUUxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUU5QyxtQkFBOEIsT0FBMkM7O1FBQ3ZFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQy9CLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzVEO2FBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDckMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFBLDJCQUFhLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQ3RFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNiLE1BQU0sVUFBVSxHQUFHLElBQUEsc0JBQVEsR0FBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekQsSUFBSSxVQUFVO29CQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztnQkFDM0IsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLEVBQ0QsRUFBYyxDQUFDLENBQUM7WUFFbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNuRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFDRCw4QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQUE7QUFqQkQsNEJBaUJDO0FBRUQsU0FBZSxZQUFZLENBQUMsUUFBa0IsRUFBRSxZQUFvQjs7UUFDbEUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxJQUFBLHNCQUFRLEdBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUMxRixNQUFNLEVBQUUsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ1AsR0FBRyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNuRTtZQUNELE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDYixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBSSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUM7WUFDdEMsTUFBTSxLQUFLLEdBQUcsR0FBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixPQUFPLElBQUEsbUJBQUcsRUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCdW1wT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5LCBhY3Rpb25EaXNwYXRjaGVyfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAnLi4vZWRpdG9yLWhlbHBlcic7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW4uY2xpLWJ1bXAnKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0aW9uczogQnVtcE9wdGlvbnMgJiB7cGFja2FnZXM6IHN0cmluZ1tdfSkge1xuICBpZiAob3B0aW9ucy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKG9wdGlvbnMucGFja2FnZXMsIG9wdGlvbnMuaW5jcmVWZXJzaW9uKTtcbiAgfSBlbHNlIGlmIChvcHRpb25zLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBrZ05hbWVzID0gb3B0aW9ucy5wcm9qZWN0Lm1hcChwcm9qID0+IHBhdGhUb1Byb2pLZXkocHJvaikpLnJlZHVjZShcbiAgICAgIChwa2dzLCBwcm9qKSA9PiB7XG4gICAgICAgIGNvbnN0IHBrZ3NPZlByb2ogPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2opO1xuICAgICAgICBpZiAocGtnc09mUHJvailcbiAgICAgICAgICBwa2dzLnB1c2goLi4ucGtnc09mUHJvaik7XG4gICAgICAgIHJldHVybiBwa2dzO1xuICAgICAgfSxcbiAgICAgIFtdIGFzIHN0cmluZ1tdKTtcblxuICAgIGF3YWl0IGJ1bXBQYWNrYWdlcyhwa2dOYW1lcywgb3B0aW9ucy5pbmNyZVZlcnNpb24pO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgfVxuICBhY3Rpb25EaXNwYXRjaGVyLnNjYW5BbmRTeW5jUGFja2FnZXMoe30pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBidW1wUGFja2FnZXMocGtnTmFtZXM6IHN0cmluZ1tdLCBpbmNyZVZlcnNpb246IHN0cmluZykge1xuICBhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgcGtnTmFtZXMpKS5maWx0ZXIoKHBrZywgaWR4KSA9PiB7XG4gICAgY29uc3QgcnMgPSBwa2cgIT0gbnVsbDtcbiAgICBpZiAoIXJzKSB7XG4gICAgICBsb2cuZXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIGxpa2U6ICR7cGtnTmFtZXNbaWR4XX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJzO1xuICB9KS5tYXAoKHBrZykgPT4ge1xuICAgIGxvZy5pbmZvKGBidW1wICR7cGtnIS5uYW1lfSB2ZXJzaW9uYCk7XG4gICAgY29uc3QgcGtEaXIgPSBwa2chLnJlYWxQYXRoO1xuICAgIHJldHVybiBleGUoJ25wbScsICd2ZXJzaW9uJywgaW5jcmVWZXJzaW9uLCB7Y3dkOiBwa0Rpcn0pLnByb21pc2U7XG4gIH0pKTtcbn1cbiJdfQ==