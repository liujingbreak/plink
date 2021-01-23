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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnQ0FBOEI7QUFDOUIsaUVBQW9FO0FBSXBFLCtCQUEwQjtBQUMxQiw4Q0FBeUM7QUFDekMseURBRW1DO0FBQ25DLDREQUE4QztBQUM5QyxvRUFBNEU7QUFHNUUsa0JBQWUseUJBQWEsQ0FDMUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkIsT0FBTyxXQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFjLENBQUMsQ0FBQztTQUM5QyxJQUFJLENBQ0gscUJBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNqQixPQUFPLFdBQUksQ0FBQyxvREFBK0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDekUsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUN6QixNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQzNDLGNBQWM7WUFDZCxHQUFHLEVBQUUsS0FBSztTQUNYLENBQUMsQ0FBQztRQUNILE9BQU8scUNBQXFCLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRTtZQUNwRCxvQkFBb0IsRUFBRSxDQUFPLE1BQU0sRUFBRSxFQUFFO2dCQUNyQyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7Z0JBQzVELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQTtZQUNELFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztTQUNuRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL25nL25vZGUtaW5qZWN0JztcbmltcG9ydCB7ZXhlY3V0ZUJyb3dzZXJCdWlsZGVyfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5cbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQge2pzb259IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7ZnJvbX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtcbiAgY3JlYXRlQnVpbGRlclxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCAqIGFzIGRyY3BDb21tb24gZnJvbSAnLi4vLi4vbmcvY29tbW9uJztcbmltcG9ydCB7Y2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZH0gZnJvbSAnLi4vLi4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPGpzb24uSnNvbk9iamVjdCAmIEJyb3dzZXJCdWlsZGVyU2NoZW1hPihcbiAgKG9wdGlvbnMsIGNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gZnJvbShkcmNwQ29tbW9uLmluaXRDbGkob3B0aW9ucyBhcyBhbnkpKVxuICAgIC5waXBlKFxuICAgICAgY29uY2F0TWFwKGNvbmZpZyA9PiB7XG4gICAgICAgIHJldHVybiBmcm9tKGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnLCBvcHRpb25zLCBjb250ZXh0KSk7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcChicm93c2VyT3B0aW9ucyA9PiB7XG4gICAgICAgIGNvbnN0IGRyY3BCdWlsZGVyQ3R4ID0gZHJjcENvbW1vbi5uZXdDb250ZXh0KHtcbiAgICAgICAgICBicm93c2VyT3B0aW9ucyxcbiAgICAgICAgICBzc3I6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZXhlY3V0ZUJyb3dzZXJCdWlsZGVyKGJyb3dzZXJPcHRpb25zLCBjb250ZXh0LCB7XG4gICAgICAgICAgd2VicGFja0NvbmZpZ3VyYXRpb246IGFzeW5jIChjb25maWcpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IGRyY3BCdWlsZGVyQ3R4LmNvbmZpZ1dlYnBhY2soY29uZmlnLCB7ZGV2TW9kZTogdHJ1ZX0pO1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgICAgICB9LFxuICAgICAgICAgIGluZGV4SHRtbDogKGNvbnRlbnQpID0+IGRyY3BCdWlsZGVyQ3R4LnRyYW5zZm9ybUluZGV4SHRtbChjb250ZW50KVxuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuKTtcbiJdfQ==