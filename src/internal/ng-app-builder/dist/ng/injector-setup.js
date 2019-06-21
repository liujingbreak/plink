"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url_1 = require("url");
const path_1 = tslib_1.__importDefault(require("path"));
// import api from '__api';
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const api_share_1 = require("../../isom/api-share");
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
function default_1(browserOptions, ssr = false) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const [pks, apiProto] = package_runner_1.initInjectorForNodePackages(browserOptions.drcpArgs);
        yield package_runner_1.initWebInjector(pks, apiProto);
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
    });
}
exports.default = default_1;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9pbmplY3Rvci1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBMEI7QUFDMUIsd0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQiw0REFBdUI7QUFDdkIsb0RBQWtEO0FBQ2xELDRFQUFxRztBQUdyRyxtQkFBOEIsY0FBcUMsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFDL0UsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRyw0Q0FBMkIsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0UsTUFBTSxnQ0FBZSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyQyxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUVqRCxNQUFNLFlBQVksR0FBRyxXQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdkIsU0FBUztZQUNULEdBQUc7WUFDSCxnQkFBZ0IsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQztZQUNwRCxZQUFZLEVBQVosd0JBQVk7WUFDWixVQUFVLENBQUMsV0FBbUI7Z0JBQzdCLElBQUksR0FBRztvQkFDTixPQUFPLE9BQU8sQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBakJELDRCQWlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9pbmplY3Rvci1zZXR1cC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7bmdSb3V0ZXJQYXRofSBmcm9tICcuLi8uLi9pc29tL2FwaS1zaGFyZSc7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcywgaW5pdFdlYkluamVjdG9yfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtBbmd1bGFyQnVpbGRlck9wdGlvbnN9IGZyb20gJy4vY29tbW9uJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgc3NyID0gZmFsc2UpIHtcblx0Y29uc3QgW3BrcywgYXBpUHJvdG9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzKTtcblx0YXdhaXQgaW5pdFdlYkluamVjdG9yKHBrcywgYXBpUHJvdG8pO1xuXG5cdGNvbnN0IGRlcGxveVVybCA9IGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCB8fCAnJztcblxuXHRjb25zdCBwdWJsaWNVcmxPYmogPSBwYXJzZShkZXBsb3lVcmwpO1xuXHRPYmplY3QuYXNzaWduKGFwaVByb3RvLCB7XG5cdFx0ZGVwbG95VXJsLFxuXHRcdHNzcixcblx0XHRuZ0Jhc2VSb3V0ZXJQYXRoOiBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpLFxuXHRcdG5nUm91dGVyUGF0aCxcblx0XHRzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcblx0XHRcdGlmIChzc3IpXG5cdFx0XHRcdHJldHVybiByZXF1aXJlKFBhdGguam9pbih0aGlzLl9fZGlybmFtZSwgcmVxdWlyZVBhdGgpKTtcblx0XHR9XG5cdH0pO1xufVxuIl19
