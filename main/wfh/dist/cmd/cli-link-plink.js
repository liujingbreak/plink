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
const path_1 = __importDefault(require("path"));
const misc_1 = require("../utils/misc");
const fs_1 = __importDefault(require("fs"));
const package_mgr_1 = require("../package-mgr");
/**
 *
 * @return a function to write the original package.json file back
 */
function reinstallWithLinkedPlink(plinkRepoPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = misc_1.getRootDir();
        const pkjsonFile = path_1.default.resolve(rootDir, 'package.json');
        const origPkJsonStr = fs_1.default.readFileSync(pkjsonFile, 'utf8');
        const pkJson = JSON.parse(origPkJsonStr);
        const linkedPkgs = package_mgr_1.getState().srcPackages;
        if (pkJson.dependencies) {
            for (const dep of Object.keys(pkJson.dependencies)) {
                if (linkedPkgs.has(dep) || dep === '@wfh/plink') {
                    delete pkJson.dependencies[dep];
                }
            }
        }
        if (pkJson.devDependencies) {
            for (const dep of Object.keys(pkJson.devDependencies)) {
                if (linkedPkgs.has(dep) || dep === '@wfh/plink') {
                    delete pkJson.devDependencies[dep];
                }
            }
        }
        const str = JSON.stringify(pkJson, null, '  ');
        console.log('Install with package.json:', str);
        yield package_mgr_1.installInDir(rootDir, origPkJsonStr, str);
    });
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLHdDQUF5QztBQUN6Qyw0Q0FBb0I7QUFDcEIsZ0RBQXNEO0FBRXREOzs7R0FHRztBQUNILFNBQXNCLHdCQUF3QixDQUFDLGFBQXFCOztRQUNsRSxNQUFNLE9BQU8sR0FBRyxpQkFBVSxFQUFFLENBQUM7UUFFN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekQsTUFBTSxhQUFhLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV6QyxNQUFNLFVBQVUsR0FBRyxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO1FBRTFDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRTtZQUN2QixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNsRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLFlBQVksRUFBRTtvQkFDL0MsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNqQzthQUNGO1NBQ0Y7UUFDRCxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUU7WUFDMUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDckQsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxZQUFZLEVBQUU7b0JBQy9DLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEM7YUFDRjtTQUNGO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDOUMsTUFBTSwwQkFBWSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUFBO0FBMUJELDREQTBCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2dldFN0YXRlLCBpbnN0YWxsSW5EaXJ9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcblxuLyoqXG4gKiBcbiAqIEByZXR1cm4gYSBmdW5jdGlvbiB0byB3cml0ZSB0aGUgb3JpZ2luYWwgcGFja2FnZS5qc29uIGZpbGUgYmFja1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVpbnN0YWxsV2l0aExpbmtlZFBsaW5rKHBsaW5rUmVwb1BhdGg6IHN0cmluZykge1xuICBjb25zdCByb290RGlyID0gZ2V0Um9vdERpcigpO1xuICBcbiAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IG9yaWdQa0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgY29uc3QgcGtKc29uID0gSlNPTi5wYXJzZShvcmlnUGtKc29uU3RyKTtcblxuICBjb25zdCBsaW5rZWRQa2dzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcblxuICBpZiAocGtKc29uLmRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSB8fCBkZXAgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocGtKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSB8fCBkZXAgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRldkRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBzdHIgPSBKU09OLnN0cmluZ2lmeShwa0pzb24sIG51bGwsICcgICcpO1xuICBjb25zb2xlLmxvZygnSW5zdGFsbCB3aXRoIHBhY2thZ2UuanNvbjonLCBzdHIpXG4gIGF3YWl0IGluc3RhbGxJbkRpcihyb290RGlyLCBvcmlnUGtKc29uU3RyLCBzdHIpO1xufVxuIl19