"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url_1 = require("url");
const path_1 = tslib_1.__importDefault(require("path"));
// import api from '__api';
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const api_share_1 = require("../api-share");
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
function default_1(browserOptions, ssr = false) {
    const [, apiProto] = package_runner_1.initApiForAllPackages(browserOptions.drcpArgs);
    const deployUrl = browserOptions.deployUrl || '';
    const publicUrlObj = url_1.parse(deployUrl);
    Object.assign(apiProto, {
        deployUrl,
        ssr,
        ngBaseRouterPath: lodash_1.default.trim(publicUrlObj.pathname, '/'),
        ngRouterPath: api_share_1.ngRouterPath,
        ssrRequire(requirePath) {
            if (ssr)
                return require(path_1.default.join(this.__dirname, requirePath));
        }
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9hcGktc2V0dXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTBCO0FBQzFCLHdEQUF3QjtBQUN4QiwyQkFBMkI7QUFDM0IsNERBQXVCO0FBQ3ZCLDRDQUEwQztBQUMxQyw0RUFBOEU7QUFHOUUsbUJBQXdCLGNBQXFDLEVBQUUsR0FBRyxHQUFHLEtBQUs7SUFDekUsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsc0NBQXFCLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXBFLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO0lBRWpELE1BQU0sWUFBWSxHQUFHLFdBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN0QyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtRQUN2QixTQUFTO1FBQ1QsR0FBRztRQUNILGdCQUFnQixFQUFFLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO1FBQ3BELFlBQVksRUFBWix3QkFBWTtRQUNaLFVBQVUsQ0FBQyxXQUFtQjtZQUM3QixJQUFJLEdBQUc7Z0JBQ04sT0FBTyxPQUFPLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQztLQUNELENBQUMsQ0FBQztBQUNKLENBQUM7QUFoQkQsNEJBZ0JDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2FwaS1zZXR1cC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7bmdSb3V0ZXJQYXRofSBmcm9tICcuLi9hcGktc2hhcmUnO1xuaW1wb3J0IHtpbml0QXBpRm9yQWxsUGFja2FnZXN9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge0FuZ3VsYXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnLi9jb21tb24nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBzc3IgPSBmYWxzZSkge1xuXHRjb25zdCBbLCBhcGlQcm90b10gPSBpbml0QXBpRm9yQWxsUGFja2FnZXMoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MpO1xuXG5cdGNvbnN0IGRlcGxveVVybCA9IGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCB8fCAnJztcblxuXHRjb25zdCBwdWJsaWNVcmxPYmogPSBwYXJzZShkZXBsb3lVcmwpO1xuXHRPYmplY3QuYXNzaWduKGFwaVByb3RvLCB7XG5cdFx0ZGVwbG95VXJsLFxuXHRcdHNzcixcblx0XHRuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuXHRcdG5nUm91dGVyUGF0aCxcblx0XHRzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcblx0XHRcdGlmIChzc3IpXG5cdFx0XHRcdHJldHVybiByZXF1aXJlKFBhdGguam9pbih0aGlzLl9fZGlybmFtZSwgcmVxdWlyZVBhdGgpKTtcblx0XHR9XG5cdH0pO1xufVxuIl19
