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
        const drcpBuilderCtx = drcpCommon.newContext();
        return build_angular_1.executeDevServerBuilder(options, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack({
                    builderConfig: options,
                    browserOptions,
                    ssr: false
                }, config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUF1SDtBQUN2SCx5REFFbUM7QUFDbkMsK0JBQTBCO0FBQzFCLDhDQUF5QztBQUN6QyxvRUFBOEM7QUFDOUMsb0VBQW9FO0FBRXBFLGtCQUFlLHlCQUFhLENBQzFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25CLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDdkMsSUFBSSxDQUNILHFCQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDckIsT0FBTyxXQUFJLENBQUMsNENBQXVCLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtRQUMzQixNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDL0MsT0FBTyx1Q0FBdUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFO1lBQy9DLG9CQUFvQixFQUFFLENBQU8sTUFBTSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sY0FBYyxDQUFDLGFBQWEsQ0FBQztvQkFDakMsYUFBYSxFQUFFLE9BQU87b0JBQ3RCLGNBQWM7b0JBQ2QsR0FBRyxFQUFFLEtBQUs7aUJBQ1gsRUFBRSxNQUFNLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDNUIsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFBO1lBQ0QsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO1NBQ25FLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQ0YsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL25nL25vZGUtaW5qZWN0JztcbmltcG9ydCB7ZXhlY3V0ZURldlNlcnZlckJ1aWxkZXIsIERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0fSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQge1xuICBjcmVhdGVCdWlsZGVyXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtmcm9tfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBkcmNwQ29tbW9uIGZyb20gJy4uLy4uL25nL2NvbW1vbic7XG5pbXBvcnQge2NoYW5nZUFuZ3VsYXJDbGlPcHRpb25zfSBmcm9tICcuLi8uLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0PihcbiAgKG9wdGlvbnMsIGNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gZnJvbShkcmNwQ29tbW9uLmluaXRDbGkob3B0aW9ucykpXG4gICAgLnBpcGUoXG4gICAgICBjb25jYXRNYXAoZHJjcENvbmZpZyA9PiB7XG4gICAgICAgIHJldHVybiBmcm9tKGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGRyY3BDb25maWcsIGNvbnRleHQsIG9wdGlvbnMpKTtcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKChicm93c2VyT3B0aW9ucykgPT4ge1xuICAgICAgICBjb25zdCBkcmNwQnVpbGRlckN0eCA9IGRyY3BDb21tb24ubmV3Q29udGV4dCgpO1xuICAgICAgICByZXR1cm4gZXhlY3V0ZURldlNlcnZlckJ1aWxkZXIob3B0aW9ucywgY29udGV4dCwge1xuICAgICAgICAgIHdlYnBhY2tDb25maWd1cmF0aW9uOiBhc3luYyAoY29uZmlnKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBkcmNwQnVpbGRlckN0eC5jb25maWdXZWJwYWNrKHtcbiAgICAgICAgICAgICAgYnVpbGRlckNvbmZpZzogb3B0aW9ucyxcbiAgICAgICAgICAgICAgYnJvd3Nlck9wdGlvbnMsXG4gICAgICAgICAgICAgIHNzcjogZmFsc2VcbiAgICAgICAgICAgIH0sIGNvbmZpZywge2Rldk1vZGU6IHRydWV9KTtcbiAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpbmRleEh0bWw6IChjb250ZW50KSA9PiBkcmNwQnVpbGRlckN0eC50cmFuc2Zvcm1JbmRleEh0bWwoY29udGVudClcbiAgICAgICAgfSk7XG4gICAgfSkpO1xuICB9XG4pO1xuIl19
