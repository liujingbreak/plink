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
        const [pks, apiProto] = package_runner_1.initInjectorForNodePackages({}, packageInfo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdEluamVjdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRJbmplY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsMkRBQTJEO0FBQzNELG1HQUFxRjtBQUNyRix1RUFBZ0c7QUFFaEcsU0FBOEIsNEJBQTRCLENBQUMsU0FBaUIsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFHdkYsTUFBTSxXQUFXLEdBQUcscUNBQVksRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsNENBQTJCLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sZ0NBQWUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFckMsTUFBTSxZQUFZLEdBQUcsV0FBSyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1Qyx3RUFBd0U7UUFFeEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdEIsU0FBUztZQUNULEdBQUc7WUFDSCxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pGLDZFQUE2RTtZQUM3RSxVQUFVLENBQUMsV0FBbUI7Z0JBQzVCLElBQUksR0FBRztvQkFDTCxPQUFPLE9BQU8sQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUFBO0FBckJELCtDQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2V9IGZyb20gJ3VybCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCB7Y3JlYXRlTmdSb3V0ZXJQYXRofSBmcm9tICcuLi8uLi9pc29tL2FwaS1zaGFyZSc7XG5pbXBvcnQge3dhbGtQYWNrYWdlcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3IvcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcywgaW5pdFdlYkluamVjdG9yfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtcnVubmVyJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvcihkZXBsb3lVcmw6IHN0cmluZywgc3NyID0gZmFsc2UpOlxuICBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHdhbGtQYWNrYWdlcz4+IHtcblxuICBjb25zdCBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICBjb25zdCBbcGtzLCBhcGlQcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoe30sIHBhY2thZ2VJbmZvKTtcbiAgYXdhaXQgaW5pdFdlYkluamVjdG9yKHBrcywgYXBpUHJvdG8pO1xuXG4gIGNvbnN0IHB1YmxpY1VybE9iaiA9IHBhcnNlKGRlcGxveVVybCB8fCAnJyk7XG4gIC8vIGNvbnN0IGJhc2VIcmVmUGF0aCA9IGJhc2VIcmVmID8gcGFyc2UoYmFzZUhyZWYpLnBhdGhuYW1lIDogdW5kZWZpbmVkO1xuXG4gIE9iamVjdC5hc3NpZ24oYXBpUHJvdG8sIHtcbiAgICBkZXBsb3lVcmwsXG4gICAgc3NyLFxuICAgIG5nQmFzZVJvdXRlclBhdGg6IHB1YmxpY1VybE9iai5wYXRobmFtZSA/IF8udHJpbShwdWJsaWNVcmxPYmoucGF0aG5hbWUsICcvJykgOiAnJyxcbiAgICAvLyBuZ1JvdXRlclBhdGg6IGNyZWF0ZU5nUm91dGVyUGF0aChiYXNlSHJlZlBhdGggPyBiYXNlSHJlZlBhdGggOiB1bmRlZmluZWQpLFxuICAgIHNzclJlcXVpcmUocmVxdWlyZVBhdGg6IHN0cmluZykge1xuICAgICAgaWYgKHNzcilcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoUGF0aC5qb2luKHRoaXMuX19kaXJuYW1lLCByZXF1aXJlUGF0aCkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuIl19