"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reinstallWithLinkedPlink = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const misc_1 = require("../utils/misc");
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
    await (0, package_mgr_1.installInDir)(rootDir, { isForce: false, cache: opt.cache,
        useYarn: opt.useYarn, useNpmCi: opt.useCi, offline: opt.offline }, origPkJsonStr, str);
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsK0RBQStEO0FBQy9ELGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsd0NBQXlDO0FBQ3pDLGdEQUFzRDtBQUV0RDs7O0dBR0c7QUFDSSxLQUFLLFVBQVUsd0JBQXdCLENBQUMsR0FBaUI7SUFDOUQsTUFBTSxPQUFPLEdBQUcsSUFBQSxpQkFBVSxHQUFFLENBQUM7SUFFN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDekQsTUFBTSxhQUFhLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQThDLENBQUM7SUFDdEYsTUFBTSxhQUFhLEdBQUcsSUFBQSxzQkFBUSxHQUFFLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQztJQUVwRCxNQUFNLFVBQVUsR0FBRyxJQUFBLHNCQUFRLEdBQUUsQ0FBQyxXQUFXLENBQUM7SUFFMUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDbEQsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN2QixPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDakM7U0FDRjtRQUNELElBQUksYUFBYTtZQUNmLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUM1QztJQUNELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRTtRQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3JELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdkIsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3BDO1NBQ0Y7UUFDRCxJQUFJLGFBQWE7WUFDZixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7S0FDL0M7SUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0Msc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDL0MsTUFBTSxJQUFBLDBCQUFZLEVBQUMsT0FBTyxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7UUFDM0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUMsRUFBRSxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDMUYsQ0FBQztBQWpDRCw0REFpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3MgKi9cbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldFN0YXRlLCBpbnN0YWxsSW5EaXJ9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7TnBtQ2xpT3B0aW9ufSBmcm9tICcuL3R5cGVzJztcbi8qKlxuICogXG4gKiBAcmV0dXJuIGEgZnVuY3Rpb24gdG8gd3JpdGUgdGhlIG9yaWdpbmFsIHBhY2thZ2UuanNvbiBmaWxlIGJhY2tcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlaW5zdGFsbFdpdGhMaW5rZWRQbGluayhvcHQ6IE5wbUNsaU9wdGlvbikge1xuICBjb25zdCByb290RGlyID0gZ2V0Um9vdERpcigpO1xuXG4gIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBvcmlnUGtKc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHBranNvbkZpbGUsICd1dGY4Jyk7XG4gIGNvbnN0IHBrSnNvbiA9IEpTT04ucGFyc2Uob3JpZ1BrSnNvblN0cikgYXMge2RlcGVuZGVuY2llczogYW55OyBkZXZEZXBlbmRlbmNpZXM6IGFueX07XG4gIGNvbnN0IGlzUGxpbmtMaW5rZWQgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgIT0gbnVsbDtcblxuICBjb25zdCBsaW5rZWRQa2dzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcblxuICBpZiAocGtKc29uLmRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSkge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNQbGlua0xpbmtlZClcbiAgICAgIGRlbGV0ZSBwa0pzb24uZGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gIH1cbiAgaWYgKHBrSnNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBPYmplY3Qua2V5cyhwa0pzb24uZGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgaWYgKGxpbmtlZFBrZ3MuaGFzKGRlcCkpIHtcbiAgICAgICAgZGVsZXRlIHBrSnNvbi5kZXZEZXBlbmRlbmNpZXNbZGVwXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzUGxpbmtMaW5rZWQpXG4gICAgICBkZWxldGUgcGtKc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICB9XG4gIGNvbnN0IHN0ciA9IEpTT04uc3RyaW5naWZ5KHBrSnNvbiwgbnVsbCwgJyAgJyk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdJbnN0YWxsIHdpdGggcGFja2FnZS5qc29uOicsIHN0cik7XG4gIGF3YWl0IGluc3RhbGxJbkRpcihyb290RGlyLCB7aXNGb3JjZTogZmFsc2UsIGNhY2hlOiBvcHQuY2FjaGUsIFxuICAgIHVzZVlhcm46IG9wdC51c2VZYXJuLCB1c2VOcG1DaTogb3B0LnVzZUNpLCBvZmZsaW5lOiBvcHQub2ZmbGluZX0sIG9yaWdQa0pzb25TdHIsIHN0cik7XG59XG4iXX0=