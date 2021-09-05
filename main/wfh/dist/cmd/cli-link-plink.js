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
exports.reinstallWithLinkedPlink = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const path_1 = __importDefault(require("path"));
const misc_1 = require("../utils/misc");
const fs_1 = __importDefault(require("fs"));
const package_mgr_1 = require("../package-mgr");
/**
 *
 * @return a function to write the original package.json file back
 */
function reinstallWithLinkedPlink(opt) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = (0, misc_1.getRootDir)();
        const pkjsonFile = path_1.default.resolve(rootDir, 'package.json');
        const origPkJsonStr = fs_1.default.readFileSync(pkjsonFile, 'utf8');
        const pkJson = JSON.parse(origPkJsonStr);
        const isPlinkLinked = (0, package_mgr_1.getState)().linkedDrcp != null;
        const linkedPkgs = (0, package_mgr_1.getState)().srcPackages;
        if (pkJson.dependencies) {
            for (const dep of Object.keys(pkJson.dependencies)) {
                if (linkedPkgs.has(dep)) {
                    delete pkJson.dependencies[dep];
                }
            }
            if (isPlinkLinked)
                delete pkJson.dependencies['@wfh/plink'];
        }
        if (pkJson.devDependencies) {
            for (const dep of Object.keys(pkJson.devDependencies)) {
                if (linkedPkgs.has(dep)) {
                    delete pkJson.devDependencies[dep];
                }
            }
            if (isPlinkLinked)
                delete pkJson.devDependencies['@wfh/plink'];
        }
        const str = JSON.stringify(pkJson, null, '  ');
        // eslint-disable-next-line no-console
        console.log('Install with package.json:', str);
        yield (0, package_mgr_1.installInDir)(rootDir, { isForce: false, cache: opt.cache, useNpmCi: opt.useCi, offline: opt.offline }, origPkJsonStr, str);
    });
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0RBQStEO0FBQy9ELGdEQUF3QjtBQUN4Qix3Q0FBeUM7QUFDekMsNENBQW9CO0FBQ3BCLGdEQUFzRDtBQUV0RDs7O0dBR0c7QUFDSCxTQUFzQix3QkFBd0IsQ0FBQyxHQUFpQjs7UUFDOUQsTUFBTSxPQUFPLEdBQUcsSUFBQSxpQkFBVSxHQUFFLENBQUM7UUFFN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekQsTUFBTSxhQUFhLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQThDLENBQUM7UUFDdEYsTUFBTSxhQUFhLEdBQUcsSUFBQSxzQkFBUSxHQUFFLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQztRQUVwRCxNQUFNLFVBQVUsR0FBRyxJQUFBLHNCQUFRLEdBQUUsQ0FBQyxXQUFXLENBQUM7UUFFMUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ2xELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDdkIsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNqQzthQUNGO1lBQ0QsSUFBSSxhQUFhO2dCQUNmLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM1QztRQUNELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRTtZQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNyRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3ZCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEM7YUFDRjtZQUNELElBQUksYUFBYTtnQkFDZixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDL0M7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0Msc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0MsTUFBTSxJQUFBLDBCQUFZLEVBQUMsT0FBTyxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBQyxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqSSxDQUFDO0NBQUE7QUFoQ0QsNERBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzICovXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgaW5zdGFsbEluRGlyfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge05wbUNsaU9wdGlvbn0gZnJvbSAnLi90eXBlcyc7XG4vKipcbiAqIFxuICogQHJldHVybiBhIGZ1bmN0aW9uIHRvIHdyaXRlIHRoZSBvcmlnaW5hbCBwYWNrYWdlLmpzb24gZmlsZSBiYWNrXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWluc3RhbGxXaXRoTGlua2VkUGxpbmsob3B0OiBOcG1DbGlPcHRpb24pIHtcbiAgY29uc3Qgcm9vdERpciA9IGdldFJvb3REaXIoKTtcblxuICBjb25zdCBwa2pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3Qgb3JpZ1BrSnNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhwa2pzb25GaWxlLCAndXRmOCcpO1xuICBjb25zdCBwa0pzb24gPSBKU09OLnBhcnNlKG9yaWdQa0pzb25TdHIpIGFzIHtkZXBlbmRlbmNpZXM6IGFueTsgZGV2RGVwZW5kZW5jaWVzOiBhbnl9O1xuICBjb25zdCBpc1BsaW5rTGlua2VkID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwICE9IG51bGw7XG5cbiAgY29uc3QgbGlua2VkUGtncyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG5cbiAgaWYgKHBrSnNvbi5kZXBlbmRlbmNpZXMpIHtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBPYmplY3Qua2V5cyhwa0pzb24uZGVwZW5kZW5jaWVzKSkge1xuICAgICAgaWYgKGxpbmtlZFBrZ3MuaGFzKGRlcCkpIHtcbiAgICAgICAgZGVsZXRlIHBrSnNvbi5kZXBlbmRlbmNpZXNbZGVwXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzUGxpbmtMaW5rZWQpXG4gICAgICBkZWxldGUgcGtKc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICB9XG4gIGlmIChwa0pzb24uZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMocGtKc29uLmRldkRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChsaW5rZWRQa2dzLmhhcyhkZXApKSB7XG4gICAgICAgIGRlbGV0ZSBwa0pzb24uZGV2RGVwZW5kZW5jaWVzW2RlcF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc1BsaW5rTGlua2VkKVxuICAgICAgZGVsZXRlIHBrSnNvbi5kZXZEZXBlbmRlbmNpZXNbJ0B3ZmgvcGxpbmsnXTtcbiAgfVxuICBjb25zdCBzdHIgPSBKU09OLnN0cmluZ2lmeShwa0pzb24sIG51bGwsICcgICcpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnSW5zdGFsbCB3aXRoIHBhY2thZ2UuanNvbjonLCBzdHIpO1xuICBhd2FpdCBpbnN0YWxsSW5EaXIocm9vdERpciwge2lzRm9yY2U6IGZhbHNlLCBjYWNoZTogb3B0LmNhY2hlLCB1c2VOcG1DaTogb3B0LnVzZUNpLCBvZmZsaW5lOiBvcHQub2ZmbGluZX0sIG9yaWdQa0pzb25TdHIsIHN0cik7XG59XG4iXX0=