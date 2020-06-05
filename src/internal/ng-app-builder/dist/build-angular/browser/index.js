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
        const drcpBuilderCtx = drcpCommon.newContext({
            browserOptions,
            ssr: false
        });
        return build_angular_1.executeBrowserBuilder(browserOptions, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUFvRTtBQUlwRSwrQkFBMEI7QUFDMUIsOENBQXlDO0FBQ3pDLHlEQUVtQztBQUNuQyxvRUFBOEM7QUFDOUMsb0VBQTRFO0FBRzVFLGtCQUFlLHlCQUFhLENBQzFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25CLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBYyxDQUFDLENBQUM7U0FDOUMsSUFBSSxDQUNILHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDakIsT0FBTyxXQUFJLENBQUMsb0RBQStCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDekIsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUMzQyxjQUFjO1lBQ2QsR0FBRyxFQUFFLEtBQUs7U0FDWCxDQUFDLENBQUM7UUFDSCxPQUFPLHFDQUFxQixDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUU7WUFDcEQsb0JBQW9CLEVBQUUsQ0FBTyxNQUFNLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUM1RCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUE7WUFDRCxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7U0FDbkUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMsQ0FDRixDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2J1aWxkLWFuZ3VsYXIvYnJvd3Nlci9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vLi4vbmcvbm9kZS1pbmplY3QnO1xuaW1wb3J0IHtleGVjdXRlQnJvd3NlckJ1aWxkZXJ9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcblxuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7anNvbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtmcm9tfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1xuICBjcmVhdGVCdWlsZGVyXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0ICogYXMgZHJjcENvbW1vbiBmcm9tICcuLi8uLi9uZy9jb21tb24nO1xuaW1wb3J0IHtjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc0ZvckJ1aWxkfSBmcm9tICcuLi8uLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUJ1aWxkZXI8anNvbi5Kc29uT2JqZWN0ICYgQnJvd3NlckJ1aWxkZXJTY2hlbWE+KFxuICAob3B0aW9ucywgY29udGV4dCkgPT4ge1xuICAgIHJldHVybiBmcm9tKGRyY3BDb21tb24uaW5pdENsaShvcHRpb25zIGFzIGFueSkpXG4gICAgLnBpcGUoXG4gICAgICBjb25jYXRNYXAoY29uZmlnID0+IHtcbiAgICAgICAgcmV0dXJuIGZyb20oY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWcsIG9wdGlvbnMsIGNvbnRleHQpKTtcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKGJyb3dzZXJPcHRpb25zID0+IHtcbiAgICAgICAgY29uc3QgZHJjcEJ1aWxkZXJDdHggPSBkcmNwQ29tbW9uLm5ld0NvbnRleHQoe1xuICAgICAgICAgIGJyb3dzZXJPcHRpb25zLFxuICAgICAgICAgIHNzcjogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBleGVjdXRlQnJvd3NlckJ1aWxkZXIoYnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIHtcbiAgICAgICAgICB3ZWJwYWNrQ29uZmlndXJhdGlvbjogYXN5bmMgKGNvbmZpZykgPT4ge1xuICAgICAgICAgICAgYXdhaXQgZHJjcEJ1aWxkZXJDdHguY29uZmlnV2VicGFjayhjb25maWcsIHtkZXZNb2RlOiB0cnVlfSk7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaW5kZXhIdG1sOiAoY29udGVudCkgPT4gZHJjcEJ1aWxkZXJDdHgudHJhbnNmb3JtSW5kZXhIdG1sKGNvbnRlbnQpXG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICApO1xuICB9XG4pO1xuIl19
