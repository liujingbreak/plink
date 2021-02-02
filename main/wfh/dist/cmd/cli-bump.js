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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWJ1bXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWJ1bXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBdUQ7QUFDdkQsb0RBQXVDO0FBQ3ZDLG1DQUE0QztBQUM1QyxvREFBNEI7QUFFNUIsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFOUMsbUJBQThCLE9BQTJDOztRQUN2RSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMvQixNQUFNLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM1RDthQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsMkJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FDdEUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQ2IsTUFBTSxVQUFVLEdBQUcsc0JBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekQsSUFBSSxVQUFVO29CQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztnQkFDM0IsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLEVBQ0QsRUFBYyxDQUFDLENBQUM7WUFFbEIsTUFBTSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUM7Q0FBQTtBQWZELDRCQWVDO0FBRUQsU0FBZSxZQUFZLENBQUMsUUFBa0IsRUFBRSxZQUFvQjs7UUFDbEUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzFGLE1BQU0sRUFBRSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUM7WUFDdkIsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ25FO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQztZQUN0QyxNQUFNLEtBQUssR0FBRyxHQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLE9BQU8sbUJBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtCdW1wT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW4uY2xpLWJ1bXAnKTtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0aW9uczogQnVtcE9wdGlvbnMgJiB7cGFja2FnZXM6IHN0cmluZ1tdfSkge1xuICBpZiAob3B0aW9ucy5wYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgYXdhaXQgYnVtcFBhY2thZ2VzKG9wdGlvbnMucGFja2FnZXMsIG9wdGlvbnMuaW5jcmVWZXJzaW9uKTtcbiAgfSBlbHNlIGlmIChvcHRpb25zLnByb2plY3QubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBrZ05hbWVzID0gb3B0aW9ucy5wcm9qZWN0Lm1hcChwcm9qID0+IHBhdGhUb1Byb2pLZXkocHJvaikpLnJlZHVjZShcbiAgICAgIChwa2dzLCBwcm9qKSA9PiB7XG4gICAgICAgIGNvbnN0IHBrZ3NPZlByb2ogPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2opO1xuICAgICAgICBpZiAocGtnc09mUHJvailcbiAgICAgICAgICBwa2dzLnB1c2goLi4ucGtnc09mUHJvaik7XG4gICAgICAgIHJldHVybiBwa2dzO1xuICAgICAgfSxcbiAgICAgIFtdIGFzIHN0cmluZ1tdKTtcblxuICAgIGF3YWl0IGJ1bXBQYWNrYWdlcyhwa2dOYW1lcywgb3B0aW9ucy5pbmNyZVZlcnNpb24pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGJ1bXBQYWNrYWdlcyhwa2dOYW1lczogc3RyaW5nW10sIGluY3JlVmVyc2lvbjogc3RyaW5nKSB7XG4gIGF3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBwa2dOYW1lcykpLmZpbHRlcigocGtnLCBpZHgpID0+IHtcbiAgICBjb25zdCBycyA9IHBrZyAhPSBudWxsO1xuICAgIGlmICghcnMpIHtcbiAgICAgIGxvZy5lcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgZm9yIG5hbWUgbGlrZTogJHtwa2dOYW1lc1tpZHhdfWApO1xuICAgIH1cbiAgICByZXR1cm4gcnM7XG4gIH0pLm1hcCgocGtnKSA9PiB7XG4gICAgbG9nLmluZm8oYGJ1bXAgJHtwa2chLm5hbWV9IHZlcnNpb25gKTtcbiAgICBjb25zdCBwa0RpciA9IHBrZyEucmVhbFBhdGg7XG4gICAgcmV0dXJuIGV4ZSgnbnBtJywgJ3ZlcnNpb24nLCBpbmNyZVZlcnNpb24sIHtjd2Q6IHBrRGlyfSkucHJvbWlzZTtcbiAgfSkpO1xufVxuIl19