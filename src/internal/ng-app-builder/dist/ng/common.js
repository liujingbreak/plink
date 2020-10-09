"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.newContext = exports.initCli = void 0;
// import type api from '__api';
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_version_check_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/node-version-check"));
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const dist_1 = require("@wfh/plink/wfh/dist");
// export type DrcpConfig = typeof api.config;
function initCli(options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield node_version_check_1.default();
        const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const config = yield initDrcp(options.drcpArgs, drcpConfigFiles);
        fs_extra_1.default.mkdirpSync(config.resolve('destDir', 'ng-app-builder.report'));
        return config;
    });
}
exports.initCli = initCli;
function initDrcp(drcpArgs, drcpConfigFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        if (drcpArgs.c == null)
            drcpArgs.c = [];
        drcpArgs.c.push(...drcpConfigFiles);
        // console.log('~~~~~~~~~~~~~~~~~~~~~');
        dist_1.initProcess();
        yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/package-mgr/index')));
        yield dist_1.initConfigAsync({ config: drcpArgs.c, prop: drcpArgs.p || drcpArgs.prop || [] });
        return config_1.default;
    });
}
function newContext(ngBuildOption, options) {
    const constructor = require('./builder-context').BuilderContext;
    return new constructor(ngBuildOption, options);
}
exports.newContext = newContext;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU1BLGdDQUFnQztBQUNoQyx3REFBMEI7QUFDMUIsc0dBQXFFO0FBQ3JFLHdFQUFnRDtBQUVoRCw4Q0FBaUU7QUFFakUsOENBQThDO0FBRTlDLFNBQXNCLE9BQU8sQ0FBQyxPQUEyQjs7UUFDdkQsTUFBTSw0QkFBUyxFQUFFLENBQUM7UUFDbEIsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUUsT0FBTyxDQUFDLFVBQXFCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEcsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNqRSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDbEUsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBTkQsMEJBTUM7QUFDRCxTQUFlLFFBQVEsQ0FBQyxRQUFhLEVBQUUsZUFBeUI7O1FBQzlELElBQUksUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJO1lBQ3BCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFDcEMsd0NBQXdDO1FBQ3hDLGtCQUFXLEVBQUUsQ0FBQztRQUNkLHdEQUFjLHVDQUF1QyxHQUFDLENBQUM7UUFDdkQsTUFBTSxzQkFBZSxDQUFDLEVBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBRXJGLE9BQU8sZ0JBQU0sQ0FBQztJQUNoQixDQUFDO0NBQUE7QUE0QkQsU0FBZ0IsVUFBVSxDQUFDLGFBQThCLEVBQUUsT0FBK0I7SUFDeEYsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsY0FBdUMsQ0FBQztJQUN6RixPQUFPLElBQUksV0FBVyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBSEQsZ0NBR0MiLCJmaWxlIjoiZGlzdC9uZy9jb21tb24uanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
