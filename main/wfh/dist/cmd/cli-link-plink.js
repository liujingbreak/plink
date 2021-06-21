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
        const rootDir = misc_1.getRootDir();
        const pkjsonFile = path_1.default.resolve(rootDir, 'package.json');
        const origPkJsonStr = fs_1.default.readFileSync(pkjsonFile, 'utf8');
        const pkJson = JSON.parse(origPkJsonStr);
        const isPlinkLinked = package_mgr_1.getState().linkedDrcp != null;
        const linkedPkgs = package_mgr_1.getState().srcPackages;
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
        yield package_mgr_1.installInDir(rootDir, { isForce: false, cache: opt.cache, useNpmCi: opt.useCi, offline: opt.offline }, origPkJsonStr, str);
    });
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0RBQStEO0FBQy9ELGdEQUF3QjtBQUN4Qix3Q0FBeUM7QUFDekMsNENBQW9CO0FBQ3BCLGdEQUFzRDtBQUV0RDs7O0dBR0c7QUFDSCxTQUFzQix3QkFBd0IsQ0FBQyxHQUFpQjs7UUFDOUQsTUFBTSxPQUFPLEdBQUcsaUJBQVUsRUFBRSxDQUFDO1FBRTdCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sYUFBYSxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUE4QyxDQUFDO1FBQ3RGLE1BQU0sYUFBYSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDO1FBRXBELE1BQU0sVUFBVSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFFMUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ2xELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDdkIsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNqQzthQUNGO1lBQ0QsSUFBSSxhQUFhO2dCQUNmLE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUM1QztRQUNELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRTtZQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNyRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3ZCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEM7YUFDRjtZQUNELElBQUksYUFBYTtnQkFDZixPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDL0M7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0Msc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0MsTUFBTSwwQkFBWSxDQUFDLE9BQU8sRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUMsRUFBRSxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakksQ0FBQztDQUFBO0FBaENELDREQWdDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2VzcyAqL1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Z2V0U3RhdGUsIGluc3RhbGxJbkRpcn0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtOcG1DbGlPcHRpb259IGZyb20gJy4vdHlwZXMnO1xuLyoqXG4gKiBcbiAqIEByZXR1cm4gYSBmdW5jdGlvbiB0byB3cml0ZSB0aGUgb3JpZ2luYWwgcGFja2FnZS5qc29uIGZpbGUgYmFja1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVpbnN0YWxsV2l0aExpbmtlZFBsaW5rKG9wdDogTnBtQ2xpT3B0aW9uKSB7XG4gIGNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG5cbiAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IG9yaWdQa0pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgY29uc3QgcGtKc29uID0gSlNPTi5wYXJzZShvcmlnUGtKc29uU3RyKSBhcyB7ZGVwZW5kZW5jaWVzOiBhbnk7IGRldkRlcGVuZGVuY2llczogYW55fTtcbiAgY29uc3QgaXNQbGlua0xpbmtlZCA9IGdldFN0YXRlKCkubGlua2VkRHJjcCAhPSBudWxsO1xuXG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuXG4gIGlmIChwa0pzb24uZGVwZW5kZW5jaWVzKSB7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMocGtKc29uLmRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChsaW5rZWRQa2dzLmhhcyhkZXApKSB7XG4gICAgICAgIGRlbGV0ZSBwa0pzb24uZGVwZW5kZW5jaWVzW2RlcF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc1BsaW5rTGlua2VkKVxuICAgICAgZGVsZXRlIHBrSnNvbi5kZXBlbmRlbmNpZXNbJ0B3ZmgvcGxpbmsnXTtcbiAgfVxuICBpZiAocGtKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKHBrSnNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAobGlua2VkUGtncy5oYXMoZGVwKSkge1xuICAgICAgICBkZWxldGUgcGtKc29uLmRldkRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNQbGlua0xpbmtlZClcbiAgICAgIGRlbGV0ZSBwa0pzb24uZGV2RGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gIH1cbiAgY29uc3Qgc3RyID0gSlNPTi5zdHJpbmdpZnkocGtKc29uLCBudWxsLCAnICAnKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgd2l0aCBwYWNrYWdlLmpzb246Jywgc3RyKTtcbiAgYXdhaXQgaW5zdGFsbEluRGlyKHJvb3REaXIsIHtpc0ZvcmNlOiBmYWxzZSwgY2FjaGU6IG9wdC5jYWNoZSwgdXNlTnBtQ2k6IG9wdC51c2VDaSwgb2ZmbGluZTogb3B0Lm9mZmxpbmV9LCBvcmlnUGtKc29uU3RyLCBzdHIpO1xufVxuIl19