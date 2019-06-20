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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9pbmplY3Rvci1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBMEI7QUFDMUIsd0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQiw0REFBdUI7QUFDdkIsNENBQTBDO0FBQzFDLDRFQUFxRztBQUdyRyxtQkFBOEIsY0FBcUMsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFDL0UsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRyw0Q0FBMkIsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0UsTUFBTSxnQ0FBZSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyQyxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUVqRCxNQUFNLFlBQVksR0FBRyxXQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdkIsU0FBUztZQUNULEdBQUc7WUFDSCxnQkFBZ0IsRUFBRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQztZQUNwRCxZQUFZLEVBQVosd0JBQVk7WUFDWixVQUFVLENBQUMsV0FBbUI7Z0JBQzdCLElBQUksR0FBRztvQkFDTixPQUFPLE9BQU8sQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBakJELDRCQWlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9pbmplY3Rvci1zZXR1cC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7bmdSb3V0ZXJQYXRofSBmcm9tICcuLi9hcGktc2hhcmUnO1xuaW1wb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMsIGluaXRXZWJJbmplY3Rvcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7QW5ndWxhckJ1aWxkZXJPcHRpb25zfSBmcm9tICcuL2NvbW1vbic7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIHNzciA9IGZhbHNlKSB7XG5cdGNvbnN0IFtwa3MsIGFwaVByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhicm93c2VyT3B0aW9ucy5kcmNwQXJncyk7XG5cdGF3YWl0IGluaXRXZWJJbmplY3Rvcihwa3MsIGFwaVByb3RvKTtcblxuXHRjb25zdCBkZXBsb3lVcmwgPSBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgfHwgJyc7XG5cblx0Y29uc3QgcHVibGljVXJsT2JqID0gcGFyc2UoZGVwbG95VXJsKTtcblx0T2JqZWN0LmFzc2lnbihhcGlQcm90bywge1xuXHRcdGRlcGxveVVybCxcblx0XHRzc3IsXG5cdFx0bmdCYXNlUm91dGVyUGF0aDogXy50cmltKHB1YmxpY1VybE9iai5wYXRobmFtZSwgJy8nKSxcblx0XHRuZ1JvdXRlclBhdGgsXG5cdFx0c3NyUmVxdWlyZShyZXF1aXJlUGF0aDogc3RyaW5nKSB7XG5cdFx0XHRpZiAoc3NyKVxuXHRcdFx0XHRyZXR1cm4gcmVxdWlyZShQYXRoLmpvaW4odGhpcy5fX2Rpcm5hbWUsIHJlcXVpcmVQYXRoKSk7XG5cdFx0fVxuXHR9KTtcbn1cbiJdfQ==
