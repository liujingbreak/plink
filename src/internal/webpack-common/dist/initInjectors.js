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
/**
 * @deprecated
 * @param deployUrl
 * @param ssr
 */
function walkPackagesAndSetupInjector(deployUrl, ssr = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageInfo = package_info_gathering_1.walkPackages();
        const apiProto = package_runner_1.initInjectorForNodePackages()[1];
        // await initWebInjector(pks, apiProto);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdEluamVjdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRJbmplY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsMkRBQTJEO0FBQzNELG1HQUFxRjtBQUNyRix1RUFBK0U7QUFFL0U7Ozs7R0FJRztBQUNILFNBQThCLDRCQUE0QixDQUFDLFNBQWlCLEVBQUUsR0FBRyxHQUFHLEtBQUs7O1FBR3ZGLE1BQU0sV0FBVyxHQUFHLHFDQUFZLEVBQUUsQ0FBQztRQUNuQyxNQUFNLFFBQVEsR0FBRyw0Q0FBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELHdDQUF3QztRQUV4QyxNQUFNLFlBQVksR0FBRyxXQUFLLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLHdFQUF3RTtRQUV4RSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUN0QixTQUFTO1lBQ1QsR0FBRztZQUNILGdCQUFnQixFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakYsNkVBQTZFO1lBQzdFLFVBQVUsQ0FBQyxXQUFtQjtnQkFDNUIsSUFBSSxHQUFHO29CQUNMLE9BQU8sT0FBTyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUM7U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFyQkQsK0NBcUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwYXJzZX0gZnJvbSAndXJsJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHtjcmVhdGVOZ1JvdXRlclBhdGh9IGZyb20gJy4uLy4uL2lzb20vYXBpLXNoYXJlJztcbmltcG9ydCB7d2Fsa1BhY2thZ2VzIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtcnVubmVyJztcblxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogQHBhcmFtIGRlcGxveVVybFxuICogQHBhcmFtIHNzciBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvcihkZXBsb3lVcmw6IHN0cmluZywgc3NyID0gZmFsc2UpOlxuICBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHdhbGtQYWNrYWdlcz4+IHtcblxuICBjb25zdCBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICBjb25zdCBhcGlQcm90byA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpWzFdO1xuICAvLyBhd2FpdCBpbml0V2ViSW5qZWN0b3IocGtzLCBhcGlQcm90byk7XG5cbiAgY29uc3QgcHVibGljVXJsT2JqID0gcGFyc2UoZGVwbG95VXJsIHx8ICcnKTtcbiAgLy8gY29uc3QgYmFzZUhyZWZQYXRoID0gYmFzZUhyZWYgPyBwYXJzZShiYXNlSHJlZikucGF0aG5hbWUgOiB1bmRlZmluZWQ7XG5cbiAgT2JqZWN0LmFzc2lnbihhcGlQcm90bywge1xuICAgIGRlcGxveVVybCxcbiAgICBzc3IsXG4gICAgbmdCYXNlUm91dGVyUGF0aDogcHVibGljVXJsT2JqLnBhdGhuYW1lID8gXy50cmltKHB1YmxpY1VybE9iai5wYXRobmFtZSwgJy8nKSA6ICcnLFxuICAgIC8vIG5nUm91dGVyUGF0aDogY3JlYXRlTmdSb3V0ZXJQYXRoKGJhc2VIcmVmUGF0aCA/IGJhc2VIcmVmUGF0aCA6IHVuZGVmaW5lZCksXG4gICAgc3NyUmVxdWlyZShyZXF1aXJlUGF0aDogc3RyaW5nKSB7XG4gICAgICBpZiAoc3NyKVxuICAgICAgICByZXR1cm4gcmVxdWlyZShQYXRoLmpvaW4odGhpcy5fX2Rpcm5hbWUsIHJlcXVpcmVQYXRoKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG4iXX0=