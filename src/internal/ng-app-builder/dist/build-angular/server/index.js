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
    return rxjs_1.from(drcpCommon.initCli(options)).pipe(operators_1.concatMap((config) => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptionsForBuild(config, options, context));
    }), operators_1.concatMap((serverOptions) => {
        const drcpBuilderCtx = drcpCommon.newContext({
            browserOptions: serverOptions,
            ssr: true
        });
        return build_angular_1.executeServerBuilder(serverOptions, context, {
            webpackConfiguration: (config) => __awaiter(void 0, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            })
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL3NlcnZlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnQ0FBOEI7QUFDOUIsaUVBQXFFO0FBS3JFLCtCQUE0QjtBQUM1Qiw4Q0FBMkM7QUFDM0MseURBQTBEO0FBQzFELDREQUE4QztBQUM5QyxvRUFBOEU7QUFFOUUsa0JBQWUseUJBQWEsQ0FBOEQsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDN0csT0FBTyxXQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDbEQscUJBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ25CLE9BQU8sV0FBSSxDQUFDLG9EQUErQixDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDLENBQUMsRUFDRixxQkFBUyxDQUFDLENBQUMsYUFBK0MsRUFBRSxFQUFFO1FBQzVELE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDM0MsY0FBYyxFQUFDLGFBQWE7WUFDNUIsR0FBRyxFQUFFLElBQUk7U0FDVixDQUFDLENBQUM7UUFDSCxPQUFPLG9DQUFvQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUU7WUFDbEQsb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUE7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC9idWlsZC1hbmd1bGFyL3NlcnZlci9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
