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
Object.defineProperty(exports, "__esModule", { value: true });
require("../../ng/node-inject");
const build_angular_1 = require("@angular-devkit/build-angular");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const architect_1 = require("@angular-devkit/architect");
const drcpCommon = __importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(config => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptionsForBuild(config, options, context));
    }), operators_1.concatMap(browserOptions => {
        const drcpBuilderCtx = drcpCommon.newContext({
            browserOptions,
            ssr: false
        });
        return build_angular_1.executeBrowserBuilder(browserOptions, context, {
            webpackConfiguration: (config) => __awaiter(void 0, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUFvRTtBQUlwRSwrQkFBMEI7QUFDMUIsOENBQXlDO0FBQ3pDLHlEQUVtQztBQUNuQyw0REFBOEM7QUFDOUMsb0VBQTRFO0FBRzVFLGtCQUFlLHlCQUFhLENBQzFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25CLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBYyxDQUFDLENBQUM7U0FDOUMsSUFBSSxDQUNILHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDakIsT0FBTyxXQUFJLENBQUMsb0RBQStCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDekIsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUMzQyxjQUFjO1lBQ2QsR0FBRyxFQUFFLEtBQUs7U0FDWCxDQUFDLENBQUM7UUFDSCxPQUFPLHFDQUFxQixDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUU7WUFDcEQsb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUM1RCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUE7WUFDRCxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7U0FDbkUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMsQ0FDRixDQUFDIiwiZmlsZSI6ImRpc3QvYnVpbGQtYW5ndWxhci9icm93c2VyL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
