"use strict";
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
async function reinstallWithLinkedPlink(opt) {
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
    await (0, package_mgr_1.installInDir)(rootDir, { isForce: false, cache: opt.cache, useNpmCi: opt.useCi, offline: opt.offline }, origPkJsonStr, str);
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsK0RBQStEO0FBQy9ELGdEQUF3QjtBQUN4Qix3Q0FBeUM7QUFDekMsNENBQW9CO0FBQ3BCLGdEQUFzRDtBQUV0RDs7O0dBR0c7QUFDSSxLQUFLLFVBQVUsd0JBQXdCLENBQUMsR0FBaUI7SUFDOUQsTUFBTSxPQUFPLEdBQUcsSUFBQSxpQkFBVSxHQUFFLENBQUM7SUFFN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQThDLENBQUM7SUFDdEYsTUFBTSxhQUFhLEdBQUcsSUFBQSxzQkFBUSxHQUFFLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQztJQUVwRCxNQUFNLFVBQVUsR0FBRyxJQUFBLHNCQUFRLEdBQUUsQ0FBQyxXQUFXLENBQUM7SUFFMUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDbEQsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN2QixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDakM7U0FDRjtRQUNELElBQUksYUFBYTtZQUNmLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUM1QztJQUNELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRTtRQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3JELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkIsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3BDO1NBQ0Y7UUFDRCxJQUFJLGFBQWE7WUFDZixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7S0FDL0M7SUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0Msc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDL0MsTUFBTSxJQUFBLDBCQUFZLEVBQUMsT0FBTyxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBQyxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNqSSxDQUFDO0FBaENELDREQWdDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2VzcyAqL1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Z2V0U3RhdGUsIGluc3RhbGxJbkRpcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtOcG1DbGlPcHRpb259IGZyb20gJy4vdHlwZXMnO1xuLyoqXG4gKiBcbiAqIEByZXR1cm4gYSBmdW5jdGlvbiB0byB3cml0ZSB0aGUgb3JpZ2luYWwgcGFja2FnZS5qc29uIGZpbGUgYmFja1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVpbnN0YWxsV2l0aExpbmtlZFBsaW5rKG9wdDogTnBtQ2xpT3B0aW9uKSB7XG4gIGNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG5cbiAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IG9yaWdQa0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgY29uc3QgcGtKc29uID0gSlNPTi5wYXJzZShvcmlnUGtKc29uU3RyKSBhcyB7ZGVwZW5kZW5jaWVzOiBhbnk7IGRldkRlcGVuZGVuY2llczogYW55fTtcbiAgY29uc3QgaXNQbGlua0xpbmtlZCA9IGdldFN0YXRlKCkubGlua2VkRHJjcCAhPSBudWxsO1xuXG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuXG4gIGlmIChwa0pzb24uZGVwZW5kZW5jaWVzKSB7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMocGtKc29uLmRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChsaW5rZWRQa2dzLmhhcyhkZXApKSB7XG4gICAgICAgIGRlbGV0ZSBwa0pzb24uZGVwZW5kZW5jaWVzW2RlcF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc1BsaW5rTGlua2VkKVxuICAgICAgZGVsZXRlIHBrSnNvbi5kZXBlbmRlbmNpZXNbJ0B3ZmgvcGxpbmsnXTtcbiAgfVxuICBpZiAocGtKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSkge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRldkRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNQbGlua0xpbmtlZClcbiAgICAgIGRlbGV0ZSBwa0pzb24uZGV2RGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gIH1cbiAgY29uc3Qgc3RyID0gSlNPTi5zdHJpbmdpZnkocGtKc29uLCBudWxsLCAnICAnKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgd2l0aCBwYWNrYWdlLmpzb246Jywgc3RyKTtcbiAgYXdhaXQgaW5zdGFsbEluRGlyKHJvb3REaXIsIHtpc0ZvcmNlOiBmYWxzZSwgY2FjaGU6IG9wdC5jYWNoZSwgdXNlTnBtQ2k6IG9wdC51c2VDaSwgb2ZmbGluZTogb3B0Lm9mZmxpbmV9LCBvcmlnUGtKc29uU3RyLCBzdHIpO1xufVxuIl19