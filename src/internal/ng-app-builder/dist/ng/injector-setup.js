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
// export default function walkPackagesAndSetupInjector(browserOptions: AngularBuilderOptions, ssr = false) {
//   // const packageInfo = walkPackages();
//   injectorSetup(browserOptions.deployUrl, browserOptions.baseHref, ssr);
//   // return packageInfo;
// }
function injectorSetup(deployUrl, baseHref, ssr = false) {
    const apiProto = package_runner_1.initInjectorForNodePackages()[1];
    // initWebInjector(pks, apiProto);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3Itc2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmplY3Rvci1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsb0RBQXdEO0FBQ3hELHVFQUErRTtBQUcvRSw2R0FBNkc7QUFDN0csMkNBQTJDO0FBQzNDLDJFQUEyRTtBQUMzRSwyQkFBMkI7QUFDM0IsSUFBSTtBQUVKLFNBQWdCLGFBQWEsQ0FDM0IsU0FBNkMsRUFDN0MsUUFBMkMsRUFBRSxHQUFHLEdBQUcsS0FBSztJQUN4RCxNQUFNLFFBQVEsR0FBRyw0Q0FBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xELGtDQUFrQztJQUVsQyxNQUFNLFlBQVksR0FBRyxXQUFLLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBRXJFLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1FBQ3RCLFNBQVM7UUFDVCxHQUFHO1FBQ0gsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNqRixZQUFZLEVBQUUsOEJBQWtCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN6RSxVQUFVLENBQUMsV0FBbUI7WUFDNUIsSUFBSSxHQUFHO2dCQUNMLE9BQU8sT0FBTyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDO0FBbkJELHNDQW1CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Y3JlYXRlTmdSb3V0ZXJQYXRofSBmcm9tICcuLi8uLi9pc29tL2FwaS1zaGFyZSc7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge0FuZ3VsYXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnLi9jb21tb24nO1xuXG4vLyBleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIHNzciA9IGZhbHNlKSB7XG4vLyAgIC8vIGNvbnN0IHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4vLyAgIGluamVjdG9yU2V0dXAoYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsLCBicm93c2VyT3B0aW9ucy5iYXNlSHJlZiwgc3NyKTtcbi8vICAgLy8gcmV0dXJuIHBhY2thZ2VJbmZvO1xuLy8gfVxuXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0b3JTZXR1cChcbiAgZGVwbG95VXJsOiBBbmd1bGFyQnVpbGRlck9wdGlvbnNbJ2RlcGxveVVybCddLFxuICBiYXNlSHJlZjogQW5ndWxhckJ1aWxkZXJPcHRpb25zWydiYXNlSHJlZiddLCBzc3IgPSBmYWxzZSkge1xuICBjb25zdCBhcGlQcm90byA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpWzFdO1xuICAvLyBpbml0V2ViSW5qZWN0b3IocGtzLCBhcGlQcm90byk7XG5cbiAgY29uc3QgcHVibGljVXJsT2JqID0gcGFyc2UoZGVwbG95VXJsIHx8ICcnKTtcbiAgY29uc3QgYmFzZUhyZWZQYXRoID0gYmFzZUhyZWYgPyBwYXJzZShiYXNlSHJlZikucGF0aG5hbWUgOiB1bmRlZmluZWQ7XG5cbiAgT2JqZWN0LmFzc2lnbihhcGlQcm90bywge1xuICAgIGRlcGxveVVybCxcbiAgICBzc3IsXG4gICAgbmdCYXNlUm91dGVyUGF0aDogcHVibGljVXJsT2JqLnBhdGhuYW1lID8gXy50cmltKHB1YmxpY1VybE9iai5wYXRobmFtZSwgJy8nKSA6ICcnLFxuICAgIG5nUm91dGVyUGF0aDogY3JlYXRlTmdSb3V0ZXJQYXRoKGJhc2VIcmVmUGF0aCA/IGJhc2VIcmVmUGF0aCA6IHVuZGVmaW5lZCksXG4gICAgc3NyUmVxdWlyZShyZXF1aXJlUGF0aDogc3RyaW5nKSB7XG4gICAgICBpZiAoc3NyKVxuICAgICAgICByZXR1cm4gcmVxdWlyZShQYXRoLmpvaW4odGhpcy5fX2Rpcm5hbWUsIHJlcXVpcmVQYXRoKSk7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==