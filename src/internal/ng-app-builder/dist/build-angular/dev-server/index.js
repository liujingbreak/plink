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
        const drcpBuilderCtx = drcpCommon.newContext({
            builderConfig: options,
            browserOptions,
            ssr: false
        });
        return build_angular_1.executeDevServerBuilder(options, context, {
            webpackConfiguration: (config) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield drcpBuilderCtx.configWebpack(config, { devMode: true });
                return config;
            }),
            indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQThCO0FBQzlCLGlFQUF1SDtBQUN2SCx5REFFbUM7QUFDbkMsK0JBQTBCO0FBQzFCLDhDQUF5QztBQUN6QyxvRUFBOEM7QUFDOUMsb0VBQW9FO0FBRXBFLGtCQUFlLHlCQUFhLENBQzFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO0lBQ25CLE9BQU8sV0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDdkMsSUFBSSxDQUNILHFCQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDckIsT0FBTyxXQUFJLENBQUMsNENBQXVCLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxFQUNGLHFCQUFTLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtRQUMzQixNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQzNDLGFBQWEsRUFBRSxPQUFPO1lBQ3RCLGNBQWM7WUFDZCxHQUFHLEVBQUUsS0FBSztTQUNYLENBQUMsQ0FBQztRQUNILE9BQU8sdUNBQXVCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRTtZQUMvQyxvQkFBb0IsRUFBRSxDQUFPLE1BQU0sRUFBRSxFQUFFO2dCQUNyQyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUUsTUFBTSxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQTtZQUNELFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztTQUNuRSxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUNGLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvYnVpbGQtYW5ndWxhci9kZXYtc2VydmVyL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi8uLi9uZy9ub2RlLWluamVjdCc7XG5pbXBvcnQge2V4ZWN1dGVEZXZTZXJ2ZXJCdWlsZGVyLCBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgRGV2U2VydmVyQnVpbGRlck91dHB1dH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHtcbiAgY3JlYXRlQnVpbGRlclxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7ZnJvbX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgZHJjcENvbW1vbiBmcm9tICcuLi8uLi9uZy9jb21tb24nO1xuaW1wb3J0IHtjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc30gZnJvbSAnLi4vLi4vbmcvY2hhbmdlLWNsaS1vcHRpb25zJztcblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgRGV2U2VydmVyQnVpbGRlck91dHB1dD4oXG4gIChvcHRpb25zLCBjb250ZXh0KSA9PiB7XG4gICAgcmV0dXJuIGZyb20oZHJjcENvbW1vbi5pbml0Q2xpKG9wdGlvbnMpKVxuICAgIC5waXBlKFxuICAgICAgY29uY2F0TWFwKGRyY3BDb25maWcgPT4ge1xuICAgICAgICByZXR1cm4gZnJvbShjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhkcmNwQ29uZmlnLCBjb250ZXh0LCBvcHRpb25zKSk7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcCgoYnJvd3Nlck9wdGlvbnMpID0+IHtcbiAgICAgICAgY29uc3QgZHJjcEJ1aWxkZXJDdHggPSBkcmNwQ29tbW9uLm5ld0NvbnRleHQoe1xuICAgICAgICAgIGJ1aWxkZXJDb25maWc6IG9wdGlvbnMsXG4gICAgICAgICAgYnJvd3Nlck9wdGlvbnMsXG4gICAgICAgICAgc3NyOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGV4ZWN1dGVEZXZTZXJ2ZXJCdWlsZGVyKG9wdGlvbnMsIGNvbnRleHQsIHtcbiAgICAgICAgICB3ZWJwYWNrQ29uZmlndXJhdGlvbjogYXN5bmMgKGNvbmZpZykgPT4ge1xuICAgICAgICAgICAgYXdhaXQgZHJjcEJ1aWxkZXJDdHguY29uZmlnV2VicGFjayggY29uZmlnLCB7ZGV2TW9kZTogdHJ1ZX0pO1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgICAgICB9LFxuICAgICAgICAgIGluZGV4SHRtbDogKGNvbnRlbnQpID0+IGRyY3BCdWlsZGVyQ3R4LnRyYW5zZm9ybUluZGV4SHRtbChjb250ZW50KVxuICAgICAgICB9KTtcbiAgICB9KSk7XG4gIH1cbik7XG4iXX0=
