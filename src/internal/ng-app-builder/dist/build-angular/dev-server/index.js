"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable no-console
require("../../ng/node-inject");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9idWlsZC1hbmd1bGFyL2Rldi1zZXJ2ZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLGdDQUE4QjtBQUU5Qiw0REFBdUI7QUFDdkIsaUVBQXVIO0FBQ3ZILHlEQUVtQztBQUNuQywrQkFBMEI7QUFDMUIsOENBQThDO0FBQzlDLG9FQUE4QztBQUM5QyxvRUFBb0U7QUFFcEUsa0JBQWUseUJBQWEsQ0FDMUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDbkIsT0FBTyxXQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFjLENBQUMsQ0FBQztTQUM5QyxJQUFJLENBQ0gscUJBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUNyQixPQUFPLFdBQUksQ0FBQyw0Q0FBdUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1FBQzNCLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDM0MsYUFBYSxFQUFFLE9BQU87WUFDdEIsY0FBYztZQUNkLEdBQUcsRUFBRSxLQUFLO1NBQ1gsQ0FBQyxDQUFDO1FBQ0gsT0FBTyx1Q0FBdUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFO1lBQy9DLG9CQUFvQixFQUFFLENBQU8sTUFBTSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sY0FBYyxDQUFDLGFBQWEsQ0FBRSxNQUEwQyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7Z0JBQ2pHLE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQUMsQ0FBQTtZQUNELFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztTQUNuRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsRUFDRixlQUFHLENBQUMsR0FBRyxFQUFFO1FBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0VBQW9FLENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQ0YsQ0FBQztBQUVGLFNBQVMsU0FBUyxDQUFDLE1BQU0sR0FBRyxXQUFXLEVBQUUsT0FBTyxHQUFHLEVBQUU7SUFFbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsZ0JBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJO1FBQ3ZELE1BQU0sTUFBTSxNQUFNO1FBQ2xCLEtBQUssR0FBRyxnQkFBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUk7UUFDM0Msd0dBQXdHLENBQUMsQ0FBQztJQUM1RyxJQUFJLE9BQU87UUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3pCLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvYnVpbGQtYW5ndWxhci9kZXYtc2VydmVyL2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0ICcuLi8uLi9uZy9ub2RlLWluamVjdCc7XG5pbXBvcnQgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2V4ZWN1dGVEZXZTZXJ2ZXJCdWlsZGVyLCBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgRGV2U2VydmVyQnVpbGRlck91dHB1dH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHtcbiAgY3JlYXRlQnVpbGRlclxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7ZnJvbX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBkcmNwQ29tbW9uIGZyb20gJy4uLy4uL25nL2NvbW1vbic7XG5pbXBvcnQge2NoYW5nZUFuZ3VsYXJDbGlPcHRpb25zfSBmcm9tICcuLi8uLi9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuXG5leHBvcnQgZGVmYXVsdCBjcmVhdGVCdWlsZGVyPERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBEZXZTZXJ2ZXJCdWlsZGVyT3V0cHV0PihcbiAgKG9wdGlvbnMsIGNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gZnJvbShkcmNwQ29tbW9uLmluaXRDbGkob3B0aW9ucyBhcyBhbnkpKVxuICAgIC5waXBlKFxuICAgICAgY29uY2F0TWFwKGRyY3BDb25maWcgPT4ge1xuICAgICAgICByZXR1cm4gZnJvbShjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhkcmNwQ29uZmlnLCBjb250ZXh0LCBvcHRpb25zKSk7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcCgoYnJvd3Nlck9wdGlvbnMpID0+IHtcbiAgICAgICAgY29uc3QgZHJjcEJ1aWxkZXJDdHggPSBkcmNwQ29tbW9uLm5ld0NvbnRleHQoe1xuICAgICAgICAgIGJ1aWxkZXJDb25maWc6IG9wdGlvbnMsXG4gICAgICAgICAgYnJvd3Nlck9wdGlvbnMsXG4gICAgICAgICAgc3NyOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGV4ZWN1dGVEZXZTZXJ2ZXJCdWlsZGVyKG9wdGlvbnMsIGNvbnRleHQsIHtcbiAgICAgICAgICB3ZWJwYWNrQ29uZmlndXJhdGlvbjogYXN5bmMgKGNvbmZpZykgPT4ge1xuICAgICAgICAgICAgYXdhaXQgZHJjcEJ1aWxkZXJDdHguY29uZmlnV2VicGFjayggY29uZmlnIGFzIHVua25vd24gYXMgd2VicGFjay5Db25maWd1cmF0aW9uLCB7ZGV2TW9kZTogdHJ1ZX0pO1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgICAgICB9LFxuICAgICAgICAgIGluZGV4SHRtbDogKGNvbnRlbnQpID0+IGRyY3BCdWlsZGVyQ3R4LnRyYW5zZm9ybUluZGV4SHRtbChjb250ZW50KVxuICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coZHJhd1B1cHB5KCdZb3UgbWF5IGFsc28gcnVuIFwibm9kZSBhcHBcIiBhbmQgYWNjZXNzIGZyb20gaHR0cDovL2xvY2FsaG9zdDoxNDMzMycpKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuKTtcblxuZnVuY3Rpb24gZHJhd1B1cHB5KHNsb2dvbiA9ICdDb25ncmFkcyEnLCBtZXNzYWdlID0gJycpIHtcblxuICBjb25zb2xlLmxvZygnXFxuICAgJyArIF8ucmVwZWF0KCctJywgc2xvZ29uLmxlbmd0aCkgKyAnXFxuJyArXG4gICAgYCA8ICR7c2xvZ29ufSA+XFxuYCArXG4gICAgJyAgICcgKyBfLnJlcGVhdCgnLScsIHNsb2dvbi5sZW5ndGgpICsgJ1xcbicgK1xuICAgICdcXHRcXFxcICAgXl9fXlxcblxcdCBcXFxcICAob28pXFxcXF9fX19fX19cXG5cXHQgICAgKF9fKVxcXFwgICAgICAgKVxcXFwvXFxcXFxcblxcdCAgICAgICAgfHwtLS0tdyB8XFxuXFx0ICAgICAgICB8fCAgICAgfHwnKTtcbiAgaWYgKG1lc3NhZ2UpXG4gICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG59XG4iXX0=
