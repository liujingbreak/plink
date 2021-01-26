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
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
// import api from '__api';
const lodash_1 = __importDefault(require("lodash"));
// import {createNgRouterPath} from '../../isom/api-share';
const package_info_gathering_1 = require("@wfh/plink/wfh/dist/package-mgr/package-info-gathering");
const package_runner_1 = require("@wfh/plink/wfh/dist/package-runner");
function walkPackagesAndSetupInjector(deployUrl, ssr = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageInfo = package_info_gathering_1.walkPackages();
        const [pks, apiProto] = package_runner_1.initInjectorForNodePackages(packageInfo);
        yield package_runner_1.initWebInjector(pks, apiProto);
        const publicUrlObj = url_1.parse(deployUrl || '');
        // const baseHrefPath = baseHref ? parse(baseHref).pathname : undefined;
        Object.assign(apiProto, {
            deployUrl,
            ssr,
            ngBaseRouterPath: publicUrlObj.pathname ? lodash_1.default.trim(publicUrlObj.pathname, '/') : '',
            // ngRouterPath: createNgRouterPath(baseHrefPath ? baseHrefPath : undefined),
            ssrRequire(requirePath) {
                if (ssr)
                    return require(path_1.default.join(this.__dirname, requirePath));
            }
        });
        return packageInfo;
    });
}
exports.default = walkPackagesAndSetupInjector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdEluamVjdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRJbmplY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsMkRBQTJEO0FBQzNELG1HQUFxRjtBQUNyRix1RUFBZ0c7QUFFaEcsU0FBOEIsNEJBQTRCLENBQUMsU0FBaUIsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFHdkYsTUFBTSxXQUFXLEdBQUcscUNBQVksRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsNENBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDakUsTUFBTSxnQ0FBZSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyQyxNQUFNLFlBQVksR0FBRyxXQUFLLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLHdFQUF3RTtRQUV4RSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUN0QixTQUFTO1lBQ1QsR0FBRztZQUNILGdCQUFnQixFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakYsNkVBQTZFO1lBQzdFLFVBQVUsQ0FBQyxXQUFtQjtnQkFDNUIsSUFBSSxHQUFHO29CQUNMLE9BQU8sT0FBTyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUM7U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFyQkQsK0NBcUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwYXJzZX0gZnJvbSAndXJsJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHtjcmVhdGVOZ1JvdXRlclBhdGh9IGZyb20gJy4uLy4uL2lzb20vYXBpLXNoYXJlJztcbmltcG9ydCB7d2Fsa1BhY2thZ2VzIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzLCBpbml0V2ViSW5qZWN0b3J9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yKGRlcGxveVVybDogc3RyaW5nLCBzc3IgPSBmYWxzZSk6XG4gIFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2Ygd2Fsa1BhY2thZ2VzPj4ge1xuXG4gIGNvbnN0IHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gIGNvbnN0IFtwa3MsIGFwaVByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhwYWNrYWdlSW5mbyk7XG4gIGF3YWl0IGluaXRXZWJJbmplY3Rvcihwa3MsIGFwaVByb3RvKTtcblxuICBjb25zdCBwdWJsaWNVcmxPYmogPSBwYXJzZShkZXBsb3lVcmwgfHwgJycpO1xuICAvLyBjb25zdCBiYXNlSHJlZlBhdGggPSBiYXNlSHJlZiA/IHBhcnNlKGJhc2VIcmVmKS5wYXRobmFtZSA6IHVuZGVmaW5lZDtcblxuICBPYmplY3QuYXNzaWduKGFwaVByb3RvLCB7XG4gICAgZGVwbG95VXJsLFxuICAgIHNzcixcbiAgICBuZ0Jhc2VSb3V0ZXJQYXRoOiBwdWJsaWNVcmxPYmoucGF0aG5hbWUgPyBfLnRyaW0ocHVibGljVXJsT2JqLnBhdGhuYW1lLCAnLycpIDogJycsXG4gICAgLy8gbmdSb3V0ZXJQYXRoOiBjcmVhdGVOZ1JvdXRlclBhdGgoYmFzZUhyZWZQYXRoID8gYmFzZUhyZWZQYXRoIDogdW5kZWZpbmVkKSxcbiAgICBzc3JSZXF1aXJlKHJlcXVpcmVQYXRoOiBzdHJpbmcpIHtcbiAgICAgIGlmIChzc3IpXG4gICAgICAgIHJldHVybiByZXF1aXJlKFBhdGguam9pbih0aGlzLl9fZGlybmFtZSwgcmVxdWlyZVBhdGgpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cbiJdfQ==