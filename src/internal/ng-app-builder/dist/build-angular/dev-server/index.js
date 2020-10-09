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
// tslint:disable no-console
require("../../ng/node-inject");
const lodash_1 = __importDefault(require("lodash"));
const build_angular_1 = require("@angular-devkit/build-angular");
const architect_1 = require("@angular-devkit/architect");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const drcpCommon = __importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(drcpConfig => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptions(drcpConfig, context, options));
    }), operators_1.concatMap((browserOptions) => {
        const drcpBuilderCtx = drcpCommon.newContext({
            builderConfig: options,
            browserOptions,
            ssr: false
        });
        return build_angular_1.executeDevServerBuilder(options, context, {
            webpackConfiguration: (config) => __awaiter(void 0, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }), operators_1.tap(() => {
        console.log(drawPuppy('You may also run "node app" and access from http://localhost:14333'));
    }));
});
function drawPuppy(slogon = 'Congrads!', message = '') {
    console.log('\n   ' + lodash_1.default.repeat('-', slogon.length) + '\n' +
        ` < ${slogon} >\n` +
        '   ' + lodash_1.default.repeat('-', slogon.length) + '\n' +
        '\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||');
    if (message)
        console.log(message);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLGdDQUE4QjtBQUM5QixvREFBdUI7QUFDdkIsaUVBQXVIO0FBQ3ZILHlEQUVtQztBQUNuQywrQkFBMEI7QUFDMUIsOENBQThDO0FBQzlDLDREQUE4QztBQUM5QyxvRUFBb0U7QUFFcEUsa0JBQWUseUJBQWEsQ0FDMUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkIsT0FBTyxXQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFjLENBQUMsQ0FBQztTQUM5QyxJQUFJLENBQ0gscUJBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNyQixPQUFPLFdBQUksQ0FBQyw0Q0FBdUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1FBQzNCLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDM0MsYUFBYSxFQUFFLE9BQU87WUFDdEIsY0FBYztZQUNkLEdBQUcsRUFBRSxLQUFLO1NBQ1gsQ0FBQyxDQUFDO1FBQ0gsT0FBTyx1Q0FBdUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFO1lBQy9DLG9CQUFvQixFQUFFLENBQU8sTUFBTSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sY0FBYyxDQUFDLGFBQWEsQ0FBRSxNQUFNLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDN0QsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFBO1lBQ0QsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO1NBQ25FLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxFQUNGLGVBQUcsQ0FBQyxHQUFHLEVBQUU7UUFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDLENBQUM7SUFDL0YsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMsQ0FDRixDQUFDO0FBRUYsU0FBUyxTQUFTLENBQUMsTUFBTSxHQUFHLFdBQVcsRUFBRSxPQUFPLEdBQUcsRUFBRTtJQUVuRCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxnQkFBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUk7UUFDdkQsTUFBTSxNQUFNLE1BQU07UUFDbEIsS0FBSyxHQUFHLGdCQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSTtRQUMzQyx3R0FBd0csQ0FBQyxDQUFDO0lBQzVHLElBQUksT0FBTztRQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDekIsQ0FBQyIsImZpbGUiOiJkaXN0L2J1aWxkLWFuZ3VsYXIvZGV2LXNlcnZlci9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
