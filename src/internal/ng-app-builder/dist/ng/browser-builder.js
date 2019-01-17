"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
require("./node-inject");
const build_webpack_1 = require("@angular-devkit/build-webpack");
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const service_worker_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/service-worker");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const build_angular_1 = require("@angular-devkit/build-angular");
const drcpCommon = tslib_1.__importStar(require("./common"));
class BrowserBuilder extends build_angular_1.BrowserBuilder {
    run(builderConfig) {
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const host = new core_1.virtualFs.AliasHost(this.context.host);
        const webpackBuilder = new build_webpack_1.WebpackBuilder(Object.assign({}, this.context, { host }));
        const options = utils_1.normalizeBuilderSchema(host, root, builderConfig);
        return rxjs_1.of(null).pipe(operators_1.concatMap(() => options.deleteOutputPath
            ? this._deleteOutputDir(root, core_1.normalize(options.outputPath), this.context.host)
            : rxjs_1.of(null)), operators_1.concatMap(() => {
            return drcpCommon.compile(builderConfig.root, builderConfig, () => this.buildWebpackConfig(root, projectRoot, host, options));
        }), operators_1.concatMap((webpackConfig) => {
            return webpackBuilder.runWebpack(webpackConfig, build_angular_1.getBrowserLoggingCb(options.verbose));
        }), operators_1.concatMap((buildEvent) => {
            if (buildEvent.success && !options.watch && options.serviceWorker) {
                return new rxjs_1.Observable(obs => {
                    service_worker_1.augmentAppWithServiceWorker(this.context.host, root, projectRoot, core_1.resolve(root, core_1.normalize(options.outputPath)), options.baseHref || '/', options.ngswConfigPath).then(() => {
                        obs.next({ success: true });
                        obs.complete();
                    }, (err) => {
                        obs.error(err);
                    });
                });
            }
            else {
                return rxjs_1.of(buildEvent);
            }
        }));
    }
}
exports.default = BrowserBuilder;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9icm93c2VyLWJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLHlCQUF1QjtBQU1yQixpRUFBK0Q7QUFDL0QsK0NBQXFFO0FBRXJFLCtCQUFzQztBQUN0Qyw4Q0FBMkM7QUFDM0MsaUhBQTJIO0FBQzNILG1FQUFpRjtBQUduRixpRUFBMEc7QUFDMUcsNkRBQXVDO0FBRXZDLE1BQXFCLGNBQWUsU0FBUSw4QkFBb0I7SUFDL0QsR0FBRyxDQUFDLGFBQXlEO1FBQzdELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUN6QyxNQUFNLFdBQVcsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLElBQUksR0FBRyxJQUFJLGdCQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBZ0MsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sY0FBYyxHQUFHLElBQUksOEJBQWMsbUJBQU0sSUFBSSxDQUFDLE9BQU8sSUFBRSxJQUFJLElBQUcsQ0FBQztRQUVyRSxNQUFNLE9BQU8sR0FBRyw4QkFBc0IsQ0FDckMsSUFBSSxFQUNKLElBQUksRUFDSixhQUFhLENBQ2IsQ0FBQztRQUVGLE9BQU8sU0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDbkIscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCO1lBQ3hDLENBQUMsQ0FBRSxJQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ3hGLENBQUMsQ0FBQyxTQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDWCxxQkFBUyxDQUFDLEdBQUcsRUFBRTtZQUNkLE9BQU8sVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFDMUQsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbkUsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQzNCLE9BQU8sY0FBYyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsbUNBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3pCLElBQUksVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRTtnQkFDbEUsT0FBTyxJQUFJLGlCQUFVLENBQWEsR0FBRyxDQUFDLEVBQUU7b0JBQ3ZDLDRDQUEyQixDQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFDakIsSUFBSSxFQUNKLFdBQVcsRUFDWCxjQUFPLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQzVDLE9BQU8sQ0FBQyxRQUFRLElBQUksR0FBRyxFQUN2QixPQUFPLENBQUMsY0FBYyxDQUN0QixDQUFDLElBQUksQ0FDTCxHQUFHLEVBQUU7d0JBQ0osR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUM1QixHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2hCLENBQUMsRUFDRCxDQUFDLEdBQVUsRUFBRSxFQUFFO3dCQUNkLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hCLENBQUMsQ0FDRCxDQUFDO2dCQUNILENBQUMsQ0FBQyxDQUFDO2FBQ0g7aUJBQU07Z0JBQ04sT0FBTyxTQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDdEI7UUFDRCxDQUFDLENBQUMsQ0FDRixDQUFDO0lBQ0QsQ0FBQztDQUVGO0FBbkRELGlDQW1EQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9icm93c2VyLWJ1aWxkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAnLi9ub2RlLWluamVjdCc7XG5cbmltcG9ydCB7XG5cdEJ1aWxkRXZlbnQsXG5cdEJ1aWxkZXJDb25maWd1cmF0aW9uXG4gIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG4gIGltcG9ydCB7IFdlYnBhY2tCdWlsZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2snO1xuICBpbXBvcnQgeyBub3JtYWxpemUsIHJlc29sdmUsIHZpcnR1YWxGcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbiAgaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuICBpbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiB9IGZyb20gJ3J4anMnO1xuICBpbXBvcnQgeyBjb25jYXRNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4gIGltcG9ydCB7IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvc2VydmljZS13b3JrZXInO1xuICBpbXBvcnQgeyBub3JtYWxpemVCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3V0aWxzJztcblx0aW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuXG5pbXBvcnQge0Jyb3dzZXJCdWlsZGVyIGFzIEdvb2dsZUJyb3dzZXJCdWlsZGVyLCBnZXRCcm93c2VyTG9nZ2luZ0NifSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgKiBhcyBkcmNwQ29tbW9uIGZyb20gJy4vY29tbW9uJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnJvd3NlckJ1aWxkZXIgZXh0ZW5kcyBHb29nbGVCcm93c2VyQnVpbGRlciB7XG5cdHJ1bihidWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxCcm93c2VyQnVpbGRlclNjaGVtYT4pOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcblx0Y29uc3Qgcm9vdCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdDtcblx0Y29uc3QgcHJvamVjdFJvb3QgPSByZXNvbHZlKHJvb3QsIGJ1aWxkZXJDb25maWcucm9vdCk7XG5cdGNvbnN0IGhvc3QgPSBuZXcgdmlydHVhbEZzLkFsaWFzSG9zdCh0aGlzLmNvbnRleHQuaG9zdCBhcyB2aXJ0dWFsRnMuSG9zdDxmcy5TdGF0cz4pO1xuXHRjb25zdCB3ZWJwYWNrQnVpbGRlciA9IG5ldyBXZWJwYWNrQnVpbGRlcih7IC4uLnRoaXMuY29udGV4dCwgaG9zdCB9KTtcblxuXHRjb25zdCBvcHRpb25zID0gbm9ybWFsaXplQnVpbGRlclNjaGVtYShcblx0XHRob3N0LFxuXHRcdHJvb3QsXG5cdFx0YnVpbGRlckNvbmZpZ1xuXHQpO1xuXG5cdHJldHVybiBvZihudWxsKS5waXBlKFxuXHRcdGNvbmNhdE1hcCgoKSA9PiBvcHRpb25zLmRlbGV0ZU91dHB1dFBhdGhcblx0XHQ/ICh0aGlzIGFzIGFueSkuX2RlbGV0ZU91dHB1dERpcihyb290LCBub3JtYWxpemUob3B0aW9ucy5vdXRwdXRQYXRoKSwgdGhpcy5jb250ZXh0Lmhvc3QpXG5cdFx0OiBvZihudWxsKSksXG5cdFx0Y29uY2F0TWFwKCgpID0+IHtcblx0XHRcdHJldHVybiBkcmNwQ29tbW9uLmNvbXBpbGUoYnVpbGRlckNvbmZpZy5yb290LCBidWlsZGVyQ29uZmlnLFxuXHRcdFx0XHQoKSA9PiB0aGlzLmJ1aWxkV2VicGFja0NvbmZpZyhyb290LCBwcm9qZWN0Um9vdCwgaG9zdCwgb3B0aW9ucykpO1xuXHRcdH0pLFxuXHRcdGNvbmNhdE1hcCgod2VicGFja0NvbmZpZykgPT4ge1xuXHRcdFx0cmV0dXJuIHdlYnBhY2tCdWlsZGVyLnJ1bldlYnBhY2sod2VicGFja0NvbmZpZywgZ2V0QnJvd3NlckxvZ2dpbmdDYihvcHRpb25zLnZlcmJvc2UpKTtcblx0XHR9KSxcblx0XHRjb25jYXRNYXAoKGJ1aWxkRXZlbnQpID0+IHtcblx0XHRpZiAoYnVpbGRFdmVudC5zdWNjZXNzICYmICFvcHRpb25zLndhdGNoICYmIG9wdGlvbnMuc2VydmljZVdvcmtlcikge1xuXHRcdFx0cmV0dXJuIG5ldyBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+KG9icyA9PiB7XG5cdFx0XHRcdGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlcihcblx0XHRcdFx0XHR0aGlzLmNvbnRleHQuaG9zdCxcblx0XHRcdFx0XHRyb290LFxuXHRcdFx0XHRcdHByb2plY3RSb290LFxuXHRcdFx0XHRcdHJlc29sdmUocm9vdCwgbm9ybWFsaXplKG9wdGlvbnMub3V0cHV0UGF0aCkpLFxuXHRcdFx0XHRcdG9wdGlvbnMuYmFzZUhyZWYgfHwgJy8nLFxuXHRcdFx0XHRcdG9wdGlvbnMubmdzd0NvbmZpZ1BhdGhcblx0XHRcdFx0KS50aGVuKFxuXHRcdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRcdG9icy5uZXh0KHsgc3VjY2VzczogdHJ1ZSB9KTtcblx0XHRcdFx0XHRcdG9icy5jb21wbGV0ZSgpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0KGVycjogRXJyb3IpID0+IHtcblx0XHRcdFx0XHRcdG9icy5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gb2YoYnVpbGRFdmVudCk7XG5cdFx0fVxuXHRcdH0pXG5cdCk7XG4gIH1cblxufVxuIl19
