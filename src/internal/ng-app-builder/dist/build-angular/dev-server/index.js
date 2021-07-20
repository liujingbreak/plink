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
// eslint-disable  no-console
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
        console.log(drawPuppy('You may also run "node app --dev" and access from http://localhost:14333'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0IsZ0NBQThCO0FBQzlCLG9EQUF1QjtBQUN2QixpRUFBdUg7QUFDdkgseURBRW1DO0FBQ25DLCtCQUEwQjtBQUMxQiw4Q0FBOEM7QUFDOUMsNERBQThDO0FBQzlDLG9FQUFvRTtBQUVwRSxrQkFBZSx5QkFBYSxDQUMxQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNuQixPQUFPLFdBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQWMsQ0FBQyxDQUFDO1NBQzlDLElBQUksQ0FDSCxxQkFBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQ3JCLE9BQU8sV0FBSSxDQUFDLDRDQUF1QixDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsRUFDRixxQkFBUyxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7UUFDM0IsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUMzQyxhQUFhLEVBQUUsT0FBTztZQUN0QixjQUFjO1lBQ2QsR0FBRyxFQUFFLEtBQUs7U0FDWCxDQUFDLENBQUM7UUFDSCxPQUFPLHVDQUF1QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUU7WUFDL0Msb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFFLE1BQU0sRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUM3RCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUE7WUFDRCxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7U0FDbkUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLEVBQ0YsZUFBRyxDQUFDLEdBQUcsRUFBRTtRQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDBFQUEwRSxDQUFDLENBQUMsQ0FBQztJQUNyRyxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUNGLENBQUM7QUFFRixTQUFTLFNBQVMsQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLE9BQU8sR0FBRyxFQUFFO0lBRW5ELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLGdCQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSTtRQUN2RCxNQUFNLE1BQU0sTUFBTTtRQUNsQixLQUFLLEdBQUcsZ0JBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJO1FBQzNDLHdHQUF3RyxDQUFDLENBQUM7SUFDNUcsSUFBSSxPQUFPO1FBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gZXNsaW50LWRpc2FibGUgIG5vLWNvbnNvbGVcbmltcG9ydCAnLi4vLi4vbmcvbm9kZS1pbmplY3QnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7ZXhlY3V0ZURldlNlcnZlckJ1aWxkZXIsIERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0fSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQge1xuICBjcmVhdGVCdWlsZGVyXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtmcm9tfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIGRyY3BDb21tb24gZnJvbSAnLi4vLi4vbmcvY29tbW9uJztcbmltcG9ydCB7Y2hhbmdlQW5ndWxhckNsaU9wdGlvbnN9IGZyb20gJy4uLy4uL25nL2NoYW5nZS1jbGktb3B0aW9ucyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUJ1aWxkZXI8RGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIERldlNlcnZlckJ1aWxkZXJPdXRwdXQ+KFxuICAob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICAgIHJldHVybiBmcm9tKGRyY3BDb21tb24uaW5pdENsaShvcHRpb25zIGFzIGFueSkpXG4gICAgLnBpcGUoXG4gICAgICBjb25jYXRNYXAoZHJjcENvbmZpZyA9PiB7XG4gICAgICAgIHJldHVybiBmcm9tKGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGRyY3BDb25maWcsIGNvbnRleHQsIG9wdGlvbnMpKTtcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKChicm93c2VyT3B0aW9ucykgPT4ge1xuICAgICAgICBjb25zdCBkcmNwQnVpbGRlckN0eCA9IGRyY3BDb21tb24ubmV3Q29udGV4dCh7XG4gICAgICAgICAgYnVpbGRlckNvbmZpZzogb3B0aW9ucyxcbiAgICAgICAgICBicm93c2VyT3B0aW9ucyxcbiAgICAgICAgICBzc3I6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZXhlY3V0ZURldlNlcnZlckJ1aWxkZXIob3B0aW9ucywgY29udGV4dCwge1xuICAgICAgICAgIHdlYnBhY2tDb25maWd1cmF0aW9uOiBhc3luYyAoY29uZmlnKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBkcmNwQnVpbGRlckN0eC5jb25maWdXZWJwYWNrKCBjb25maWcsIHtkZXZNb2RlOiB0cnVlfSk7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaW5kZXhIdG1sOiAoY29udGVudCkgPT4gZHJjcEJ1aWxkZXJDdHgudHJhbnNmb3JtSW5kZXhIdG1sKGNvbnRlbnQpXG4gICAgICAgIH0pO1xuICAgICAgfSksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhkcmF3UHVwcHkoJ1lvdSBtYXkgYWxzbyBydW4gXCJub2RlIGFwcCAtLWRldlwiIGFuZCBhY2Nlc3MgZnJvbSBodHRwOi8vbG9jYWxob3N0OjE0MzMzJykpO1xuICAgICAgfSlcbiAgICApO1xuICB9XG4pO1xuXG5mdW5jdGlvbiBkcmF3UHVwcHkoc2xvZ29uID0gJ0NvbmdyYWRzIScsIG1lc3NhZ2UgPSAnJykge1xuXG4gIGNvbnNvbGUubG9nKCdcXG4gICAnICsgXy5yZXBlYXQoJy0nLCBzbG9nb24ubGVuZ3RoKSArICdcXG4nICtcbiAgICBgIDwgJHtzbG9nb259ID5cXG5gICtcbiAgICAnICAgJyArIF8ucmVwZWF0KCctJywgc2xvZ29uLmxlbmd0aCkgKyAnXFxuJyArXG4gICAgJ1xcdFxcXFwgICBeX19eXFxuXFx0IFxcXFwgIChvbylcXFxcX19fX19fX1xcblxcdCAgICAoX18pXFxcXCAgICAgICApXFxcXC9cXFxcXFxuXFx0ICAgICAgICB8fC0tLS13IHxcXG5cXHQgICAgICAgIHx8ICAgICB8fCcpO1xuICBpZiAobWVzc2FnZSlcbiAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbn1cbiJdfQ==