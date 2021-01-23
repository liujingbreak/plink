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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsZ0NBQThCO0FBQzlCLG9EQUF1QjtBQUN2QixpRUFBdUg7QUFDdkgseURBRW1DO0FBQ25DLCtCQUEwQjtBQUMxQiw4Q0FBOEM7QUFDOUMsNERBQThDO0FBQzlDLG9FQUFvRTtBQUVwRSxrQkFBZSx5QkFBYSxDQUMxQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQixPQUFPLFdBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQWMsQ0FBQyxDQUFDO1NBQzlDLElBQUksQ0FDSCxxQkFBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQ3JCLE9BQU8sV0FBSSxDQUFDLDRDQUF1QixDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsRUFDRixxQkFBUyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7UUFDM0IsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUMzQyxhQUFhLEVBQUUsT0FBTztZQUN0QixjQUFjO1lBQ2QsR0FBRyxFQUFFLEtBQUs7U0FDWCxDQUFDLENBQUM7UUFDSCxPQUFPLHVDQUF1QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUU7WUFDL0Msb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFFLE1BQU0sRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUM3RCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUE7WUFDRCxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7U0FDbkUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLEVBQ0YsZUFBRyxDQUFDLEdBQUcsRUFBRTtRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9FQUFvRSxDQUFDLENBQUMsQ0FBQztJQUMvRixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUNGLENBQUM7QUFFRixTQUFTLFNBQVMsQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLE9BQU8sR0FBRyxFQUFFO0lBRW5ELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLGdCQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSTtRQUN2RCxNQUFNLE1BQU0sTUFBTTtRQUNsQixLQUFLLEdBQUcsZ0JBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJO1FBQzNDLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPO1FBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0ICcuLi8uLi9uZy9ub2RlLWluamVjdCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtleGVjdXRlRGV2U2VydmVyQnVpbGRlciwgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIERldlNlcnZlckJ1aWxkZXJPdXRwdXR9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7XG4gIGNyZWF0ZUJ1aWxkZXJcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQge2Zyb219IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjb25jYXRNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgZHJjcENvbW1vbiBmcm9tICcuLi8uLi9uZy9jb21tb24nO1xuaW1wb3J0IHtjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc30gZnJvbSAnLi4vLi4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgRGV2U2VydmVyQnVpbGRlck91dHB1dD4oXG4gIChvcHRpb25zLCBjb250ZXh0KSA9PiB7XG4gICAgcmV0dXJuIGZyb20oZHJjcENvbW1vbi5pbml0Q2xpKG9wdGlvbnMgYXMgYW55KSlcbiAgICAucGlwZShcbiAgICAgIGNvbmNhdE1hcChkcmNwQ29uZmlnID0+IHtcbiAgICAgICAgcmV0dXJuIGZyb20oY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoZHJjcENvbmZpZywgY29udGV4dCwgb3B0aW9ucykpO1xuICAgICAgfSksXG4gICAgICBjb25jYXRNYXAoKGJyb3dzZXJPcHRpb25zKSA9PiB7XG4gICAgICAgIGNvbnN0IGRyY3BCdWlsZGVyQ3R4ID0gZHJjcENvbW1vbi5uZXdDb250ZXh0KHtcbiAgICAgICAgICBidWlsZGVyQ29uZmlnOiBvcHRpb25zLFxuICAgICAgICAgIGJyb3dzZXJPcHRpb25zLFxuICAgICAgICAgIHNzcjogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBleGVjdXRlRGV2U2VydmVyQnVpbGRlcihvcHRpb25zLCBjb250ZXh0LCB7XG4gICAgICAgICAgd2VicGFja0NvbmZpZ3VyYXRpb246IGFzeW5jIChjb25maWcpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IGRyY3BCdWlsZGVyQ3R4LmNvbmZpZ1dlYnBhY2soIGNvbmZpZywge2Rldk1vZGU6IHRydWV9KTtcbiAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpbmRleEh0bWw6IChjb250ZW50KSA9PiBkcmNwQnVpbGRlckN0eC50cmFuc2Zvcm1JbmRleEh0bWwoY29udGVudClcbiAgICAgICAgfSk7XG4gICAgICB9KSxcbiAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGRyYXdQdXBweSgnWW91IG1heSBhbHNvIHJ1biBcIm5vZGUgYXBwXCIgYW5kIGFjY2VzcyBmcm9tIGh0dHA6Ly9sb2NhbGhvc3Q6MTQzMzMnKSk7XG4gICAgICB9KVxuICAgICk7XG4gIH1cbik7XG5cbmZ1bmN0aW9uIGRyYXdQdXBweShzbG9nb24gPSAnQ29uZ3JhZHMhJywgbWVzc2FnZSA9ICcnKSB7XG5cbiAgY29uc29sZS5sb2coJ1xcbiAgICcgKyBfLnJlcGVhdCgnLScsIHNsb2dvbi5sZW5ndGgpICsgJ1xcbicgK1xuICAgIGAgPCAke3Nsb2dvbn0gPlxcbmAgK1xuICAgICcgICAnICsgXy5yZXBlYXQoJy0nLCBzbG9nb24ubGVuZ3RoKSArICdcXG4nICtcbiAgICAnXFx0XFxcXCAgIF5fX15cXG5cXHQgXFxcXCAgKG9vKVxcXFxfX19fX19fXFxuXFx0ICAgIChfXylcXFxcICAgICAgIClcXFxcL1xcXFxcXG5cXHQgICAgICAgIHx8LS0tLXcgfFxcblxcdCAgICAgICAgfHwgICAgIHx8Jyk7XG4gIGlmIChtZXNzYWdlKVxuICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xufVxuIl19