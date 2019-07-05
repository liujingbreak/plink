"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require("../../ng/node-inject");
const build_angular_1 = require("@angular-devkit/build-angular");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const architect_1 = require("@angular-devkit/architect");
const drcpCommon = tslib_1.__importStar(require("../../ng/common"));
const change_cli_options_1 = require("../../ng/change-cli-options");
exports.default = architect_1.createBuilder((options, context) => {
    return rxjs_1.from(drcpCommon.initCli(options))
        .pipe(operators_1.concatMap(config => {
        return rxjs_1.from(change_cli_options_1.changeAngularCliOptionsForBuild(config, options, context));
    }), operators_1.concatMap(browserOptions => {
        const drcpBuilderCtx = drcpCommon.newContext();
        return build_angular_1.executeBrowserBuilder(browserOptions, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack({
                    browserOptions,
                    ssr: false
                }, config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUFvRTtBQUlwRSwrQkFBMEI7QUFDMUIsOENBQXlDO0FBQ3pDLHlEQUVtQztBQUNuQyxvRUFBOEM7QUFDOUMsb0VBQTRFO0FBRzVFLGtCQUFlLHlCQUFhLENBQzFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25CLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDdkMsSUFBSSxDQUNILHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDakIsT0FBTyxXQUFJLENBQUMsb0RBQStCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDekIsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQy9DLE9BQU8scUNBQXFCLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRTtZQUNwRCxvQkFBb0IsRUFBRSxDQUFPLE1BQU0sRUFBRSxFQUFFO2dCQUNyQyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUM7b0JBQ2pDLGNBQWM7b0JBQ2QsR0FBRyxFQUFFLEtBQUs7aUJBQ1gsRUFBRSxNQUFNLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDNUIsT0FBTyxNQUFNLENBQUM7WUFDaEIsQ0FBQyxDQUFBO1lBQ0QsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO1NBQ25FLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQ0YsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9idWlsZC1hbmd1bGFyL2Jyb3dzZXIvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL25nL25vZGUtaW5qZWN0JztcbmltcG9ydCB7ZXhlY3V0ZUJyb3dzZXJCdWlsZGVyfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5cbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQge2pzb259IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7ZnJvbX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtcbiAgY3JlYXRlQnVpbGRlclxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCAqIGFzIGRyY3BDb21tb24gZnJvbSAnLi4vLi4vbmcvY29tbW9uJztcbmltcG9ydCB7Y2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZH0gZnJvbSAnLi4vLi4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPGpzb24uSnNvbk9iamVjdCAmIEJyb3dzZXJCdWlsZGVyU2NoZW1hPihcbiAgKG9wdGlvbnMsIGNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gZnJvbShkcmNwQ29tbW9uLmluaXRDbGkob3B0aW9ucykpXG4gICAgLnBpcGUoXG4gICAgICBjb25jYXRNYXAoY29uZmlnID0+IHtcbiAgICAgICAgcmV0dXJuIGZyb20oY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWcsIG9wdGlvbnMsIGNvbnRleHQpKTtcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKGJyb3dzZXJPcHRpb25zID0+IHtcbiAgICAgICAgY29uc3QgZHJjcEJ1aWxkZXJDdHggPSBkcmNwQ29tbW9uLm5ld0NvbnRleHQoKTtcbiAgICAgICAgcmV0dXJuIGV4ZWN1dGVCcm93c2VyQnVpbGRlcihicm93c2VyT3B0aW9ucywgY29udGV4dCwge1xuICAgICAgICAgIHdlYnBhY2tDb25maWd1cmF0aW9uOiBhc3luYyAoY29uZmlnKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBkcmNwQnVpbGRlckN0eC5jb25maWdXZWJwYWNrKHtcbiAgICAgICAgICAgICAgYnJvd3Nlck9wdGlvbnMsXG4gICAgICAgICAgICAgIHNzcjogZmFsc2VcbiAgICAgICAgICAgIH0sIGNvbmZpZywge2Rldk1vZGU6IHRydWV9KTtcbiAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpbmRleEh0bWw6IChjb250ZW50KSA9PiBkcmNwQnVpbGRlckN0eC50cmFuc2Zvcm1JbmRleEh0bWwoY29udGVudClcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICk7XG4gIH1cbik7XG4iXX0=
