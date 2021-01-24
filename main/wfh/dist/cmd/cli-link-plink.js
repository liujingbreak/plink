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
function reinstallWithLinkedPlink() {
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
        // tslint:disable-next-line: no-console
        console.log('Install with package.json:', str);
        yield package_mgr_1.installInDir(rootDir, origPkJsonStr, str);
    });
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLHdDQUF5QztBQUN6Qyw0Q0FBb0I7QUFDcEIsZ0RBQXNEO0FBRXREOzs7R0FHRztBQUNILFNBQXNCLHdCQUF3Qjs7UUFDNUMsTUFBTSxPQUFPLEdBQUcsaUJBQVUsRUFBRSxDQUFDO1FBRTdCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sYUFBYSxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFekMsTUFBTSxVQUFVLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztRQUUxQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDdkIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDbEQsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxZQUFZLEVBQUU7b0JBQy9DLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDakM7YUFDRjtTQUNGO1FBQ0QsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFO1lBQzFCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ3JELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssWUFBWSxFQUFFO29CQUMvQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ3BDO2FBQ0Y7U0FDRjtRQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQyx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMvQyxNQUFNLDBCQUFZLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQUE7QUEzQkQsNERBMkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Z2V0U3RhdGUsIGluc3RhbGxJbkRpcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuXG4vKipcbiAqIFxuICogQHJldHVybiBhIGZ1bmN0aW9uIHRvIHdyaXRlIHRoZSBvcmlnaW5hbCBwYWNrYWdlLmpzb24gZmlsZSBiYWNrXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWluc3RhbGxXaXRoTGlua2VkUGxpbmsoKSB7XG4gIGNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG5cbiAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IG9yaWdQa0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgY29uc3QgcGtKc29uID0gSlNPTi5wYXJzZShvcmlnUGtKc29uU3RyKTtcblxuICBjb25zdCBsaW5rZWRQa2dzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcblxuICBpZiAocGtKc29uLmRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSB8fCBkZXAgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocGtKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSB8fCBkZXAgPT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRldkRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBzdHIgPSBKU09OLnN0cmluZ2lmeShwa0pzb24sIG51bGwsICcgICcpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgd2l0aCBwYWNrYWdlLmpzb246Jywgc3RyKTtcbiAgYXdhaXQgaW5zdGFsbEluRGlyKHJvb3REaXIsIG9yaWdQa0pzb25TdHIsIHN0cik7XG59XG4iXX0=