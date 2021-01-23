"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPackage = void 0;
const lodash_1 = __importDefault(require("lodash"));
// import fs from 'fs-extra';
// import Path from 'path';
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
function _findPackage(shortName) {
    const pkg = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), [shortName]))[0];
    if (pkg == null)
        return null;
    return {
        name: pkg.name,
        packageJson: pkg.json,
        dir: pkg.realPath
    };
}
exports.findPackage = lodash_1.default.memoize(_findPackage);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQtdGFyZ2V0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1aWxkLXRhcmdldC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsb0RBQXVCO0FBQ3ZCLDZCQUE2QjtBQUM3QiwyQkFBMkI7QUFDM0IsaUVBQXlEO0FBQ3pELHlEQUFrRTtBQUVsRSxTQUFTLFlBQVksQ0FBQyxTQUFpQjtJQUNyQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RSxJQUFJLEdBQUcsSUFBSSxJQUFJO1FBQ2IsT0FBTyxJQUFJLENBQUM7SUFDZCxPQUFPO1FBQ0wsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1FBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJO1FBQ3JCLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUTtLQUNsQixDQUFDO0FBQ0osQ0FBQztBQUVZLFFBQUEsV0FBVyxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Z2V0U3RhdGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC91dGlscyc7XG5cbmZ1bmN0aW9uIF9maW5kUGFja2FnZShzaG9ydE5hbWU6IHN0cmluZyk6IHtuYW1lOiBzdHJpbmc7IHBhY2thZ2VKc29uOiBhbnksIGRpcjogc3RyaW5nfSB8IG51bGwge1xuICBjb25zdCBwa2cgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgW3Nob3J0TmFtZV0pKVswXTtcbiAgaWYgKHBrZyA9PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgIHBhY2thZ2VKc29uOiBwa2cuanNvbixcbiAgICBkaXI6IHBrZy5yZWFsUGF0aFxuICB9O1xufVxuXG5leHBvcnQgY29uc3QgZmluZFBhY2thZ2UgPSBfLm1lbW9pemUoX2ZpbmRQYWNrYWdlKTtcblxuIl19