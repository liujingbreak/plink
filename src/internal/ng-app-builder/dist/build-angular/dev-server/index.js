"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("../../ng/node-inject");
const build_angular_1 = require("@angular-devkit/build-angular");
const architect_1 = require("@angular-devkit/architect");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const drcpCommon = tslib_1.__importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(drcpConfig => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptions(drcpConfig, context, options));
    }), operators_1.concatMap((browserOptions) => {
        return build_angular_1.executeDevServerBuilder(options, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield drcpCommon.configWebpack({
                    builderConfig: options,
                    browserOptions,
                    ssr: false
                }, config, { devMode: true });
                return config;
            })
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUF1SDtBQUN2SCx5REFFbUM7QUFDbkMsK0JBQTBCO0FBQzFCLDhDQUF5QztBQUN6QyxvRUFBOEM7QUFDOUMsb0VBQW9FO0FBRXBFLGtCQUFlLHlCQUFhLENBQzNCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ3BCLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDdkMsSUFBSSxDQUNKLHFCQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDdEIsT0FBTyxXQUFJLENBQUMsNENBQXVCLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtRQUM1QixPQUFPLHVDQUF1QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUU7WUFDaEQsb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDdEMsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDO29CQUM5QixhQUFhLEVBQUUsT0FBTztvQkFDdEIsY0FBYztvQkFDZCxHQUFHLEVBQUUsS0FBSztpQkFDVixFQUFFLE1BQU0sRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUM1QixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUMsQ0FBQTtTQUNELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQ0QsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL25nL25vZGUtaW5qZWN0JztcbmltcG9ydCB7ZXhlY3V0ZURldlNlcnZlckJ1aWxkZXIsIERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0fSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQge1xuICBjcmVhdGVCdWlsZGVyXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtmcm9tfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBkcmNwQ29tbW9uIGZyb20gJy4uLy4uL25nL2NvbW1vbic7XG5pbXBvcnQge2NoYW5nZUFuZ3VsYXJDbGlPcHRpb25zfSBmcm9tICcuLi8uLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0Pihcblx0KG9wdGlvbnMsIGNvbnRleHQpID0+IHtcblx0XHRyZXR1cm4gZnJvbShkcmNwQ29tbW9uLmluaXRDbGkob3B0aW9ucykpXG5cdFx0LnBpcGUoXG5cdFx0XHRjb25jYXRNYXAoZHJjcENvbmZpZyA9PiB7XG5cdFx0XHRcdHJldHVybiBmcm9tKGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGRyY3BDb25maWcsIGNvbnRleHQsIG9wdGlvbnMpKTtcblx0XHRcdH0pLFxuXHRcdFx0Y29uY2F0TWFwKChicm93c2VyT3B0aW9ucykgPT4ge1xuXHRcdFx0XHRyZXR1cm4gZXhlY3V0ZURldlNlcnZlckJ1aWxkZXIob3B0aW9ucywgY29udGV4dCwge1xuXHRcdFx0XHRcdHdlYnBhY2tDb25maWd1cmF0aW9uOiBhc3luYyAoY29uZmlnKSA9PiB7XG5cdFx0XHRcdFx0XHRhd2FpdCBkcmNwQ29tbW9uLmNvbmZpZ1dlYnBhY2soe1xuXHRcdFx0XHRcdFx0XHRidWlsZGVyQ29uZmlnOiBvcHRpb25zLFxuXHRcdFx0XHRcdFx0XHRicm93c2VyT3B0aW9ucyxcblx0XHRcdFx0XHRcdFx0c3NyOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSwgY29uZmlnLCB7ZGV2TW9kZTogdHJ1ZX0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNvbmZpZztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdH0pKTtcblx0fVxuKTtcbiJdfQ==
