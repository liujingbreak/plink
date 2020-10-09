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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL2luaXRJbmplY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQixvREFBdUI7QUFDdkIsMkRBQTJEO0FBQzNELG1HQUFxRjtBQUNyRix1RUFBZ0c7QUFFaEcsU0FBOEIsNEJBQTRCLENBQUMsU0FBaUIsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFHdkYsTUFBTSxXQUFXLEdBQUcscUNBQVksRUFBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsNENBQTJCLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sZ0NBQWUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFckMsTUFBTSxZQUFZLEdBQUcsV0FBSyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1Qyx3RUFBd0U7UUFFeEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdEIsU0FBUztZQUNULEdBQUc7WUFDSCxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxnQkFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pGLDZFQUE2RTtZQUM3RSxVQUFVLENBQUMsV0FBbUI7Z0JBQzVCLElBQUksR0FBRztvQkFDTCxPQUFPLE9BQU8sQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUFBO0FBckJELCtDQXFCQyIsImZpbGUiOiJpbnRlcm5hbC93ZWJwYWNrLWNvbW1vbi9kaXN0L2luaXRJbmplY3RvcnMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
