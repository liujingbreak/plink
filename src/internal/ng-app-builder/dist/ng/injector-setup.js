"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectorSetup = void 0;
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
// import api from '__api';
const lodash_1 = __importDefault(require("lodash"));
const api_share_1 = require("../../isom/api-share");
const package_runner_1 = require("@wfh/plink/wfh/dist/package-runner");
function injectorSetup(deployUrl, baseHref, ssr = false) {
    const apiProto = package_runner_1.initInjectorForNodePackages()[1];
    const publicUrlObj = url_1.parse(deployUrl || '');
    const baseHrefPath = baseHref ? url_1.parse(baseHref).pathname : undefined;
    Object.assign(apiProto, {
        deployUrl,
        ssr,
        ngBaseRouterPath: publicUrlObj.pathname ? lodash_1.default.trim(publicUrlObj.pathname, '/') : '',
        ngRouterPath: api_share_1.createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
        ssrRequire(requirePath) {
            if (ssr)
                return require(path_1.default.join(this.__dirname, requirePath));
        }
    });
}
exports.injectorSetup = injectorSetup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3Itc2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmplY3Rvci1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsb0RBQXdEO0FBQ3hELHVFQUErRTtBQUcvRSxTQUFnQixhQUFhLENBQzNCLFNBQTZDLEVBQzdDLFFBQTJDLEVBQUUsR0FBRyxHQUFHLEtBQUs7SUFDeEQsTUFBTSxRQUFRLEdBQUcsNENBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRCxNQUFNLFlBQVksR0FBRyxXQUFLLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBRXJFLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1FBQ3RCLFNBQVM7UUFDVCxHQUFHO1FBQ0gsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNqRixZQUFZLEVBQUUsOEJBQWtCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN6RSxVQUFVLENBQUMsV0FBbUI7WUFDNUIsSUFBSSxHQUFHO2dCQUNMLE9BQU8sT0FBTyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDO0FBbEJELHNDQWtCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Y3JlYXRlTmdSb3V0ZXJQYXRofSBmcm9tICcuLi8uLi9pc29tL2FwaS1zaGFyZSc7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge0FuZ3VsYXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnLi9jb21tb24nO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0b3JTZXR1cChcbiAgZGVwbG95VXJsOiBBbmd1bGFyQnVpbGRlck9wdGlvbnNbJ2RlcGxveVVybCddLFxuICBiYXNlSHJlZjogQW5ndWxhckJ1aWxkZXJPcHRpb25zWydiYXNlSHJlZiddLCBzc3IgPSBmYWxzZSkge1xuICBjb25zdCBhcGlQcm90byA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpWzFdO1xuXG4gIGNvbnN0IHB1YmxpY1VybE9iaiA9IHBhcnNlKGRlcGxveVVybCB8fCAnJyk7XG4gIGNvbnN0IGJhc2VIcmVmUGF0aCA9IGJhc2VIcmVmID8gcGFyc2UoYmFzZUhyZWYpLnBhdGhuYW1lIDogdW5kZWZpbmVkO1xuXG4gIE9iamVjdC5hc3NpZ24oYXBpUHJvdG8sIHtcbiAgICBkZXBsb3lVcmwsXG4gICAgc3NyLFxuICAgIG5nQmFzZVJvdXRlclBhdGg6IHB1YmxpY1VybE9iai5wYXRobmFtZSA/IF8udHJpbShwdWJsaWNVcmxPYmoucGF0aG5hbWUsICcvJykgOiAnJyxcbiAgICBuZ1JvdXRlclBhdGg6IGNyZWF0ZU5nUm91dGVyUGF0aChiYXNlSHJlZlBhdGggPyBiYXNlSHJlZlBhdGggOiB1bmRlZmluZWQpLFxuICAgIHNzclJlcXVpcmUocmVxdWlyZVBhdGg6IHN0cmluZykge1xuICAgICAgaWYgKHNzcilcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=