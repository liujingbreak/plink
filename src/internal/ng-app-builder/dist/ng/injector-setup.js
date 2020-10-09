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
exports.injectorSetup = void 0;
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
// import api from '__api';
const lodash_1 = __importDefault(require("lodash"));
const api_share_1 = require("../../isom/api-share");
const package_info_gathering_1 = require("@wfh/plink/wfh/dist/package-mgr/package-info-gathering");
const package_runner_1 = require("@wfh/plink/wfh/dist/package-runner");
function walkPackagesAndSetupInjector(browserOptions, ssr = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageInfo = package_info_gathering_1.walkPackages();
        yield injectorSetup(packageInfo, browserOptions.drcpArgs, browserOptions.deployUrl, browserOptions.baseHref, ssr);
        return packageInfo;
    });
}
exports.default = walkPackagesAndSetupInjector;
function injectorSetup(packageInfo, drcpArgs, deployUrl, baseHref, ssr = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pks, apiProto] = package_runner_1.initInjectorForNodePackages(drcpArgs, packageInfo);
        yield package_runner_1.initWebInjector(pks, apiProto);
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
    });
}
exports.injectorSetup = injectorSetup;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9pbmplY3Rvci1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsb0RBQXdEO0FBQ3hELG1HQUFxRjtBQUNyRix1RUFBZ0c7QUFHaEcsU0FBOEIsNEJBQTRCLENBQUMsY0FBcUMsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFDM0csTUFBTSxXQUFXLEdBQUcscUNBQVksRUFBRSxDQUFDO1FBQ25DLE1BQU0sYUFBYSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsSCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFKRCwrQ0FJQztBQUVELFNBQXNCLGFBQWEsQ0FBQyxXQUE0QyxFQUM5RSxRQUEyQyxFQUMzQyxTQUE2QyxFQUM3QyxRQUEyQyxFQUFFLEdBQUcsR0FBRyxLQUFLOztRQUN4RCxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxHQUFHLDRDQUEyQixDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMzRSxNQUFNLGdDQUFlLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXJDLE1BQU0sWUFBWSxHQUFHLFdBQUssQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFFckUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdEIsU0FBUztZQUNULEdBQUc7WUFDSCxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pGLFlBQVksRUFBRSw4QkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ3pFLFVBQVUsQ0FBQyxXQUFtQjtnQkFDNUIsSUFBSSxHQUFHO29CQUNMLE9BQU8sT0FBTyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUM7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUE7QUFwQkQsc0NBb0JDIiwiZmlsZSI6ImRpc3QvbmcvaW5qZWN0b3Itc2V0dXAuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
