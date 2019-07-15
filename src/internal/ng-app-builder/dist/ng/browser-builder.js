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
            return drcpCommon.compile(builderConfig.root, options, () => this.buildWebpackConfig(root, projectRoot, host, options));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9icm93c2VyLWJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0NBQW9DO0FBQ3BDLHlCQUF1QjtBQU1yQixpRUFBK0Q7QUFDL0QsK0NBQXFFO0FBRXJFLCtCQUFzQztBQUN0Qyw4Q0FBMkM7QUFDM0MsaUhBQTJIO0FBQzNILG1FQUFpRjtBQUduRixpRUFBMEc7QUFDMUcsNkRBQXVDO0FBRXZDLE1BQXFCLGNBQWUsU0FBUSw4QkFBb0I7SUFDOUQsR0FBRyxDQUFDLGFBQXlEO1FBQzdELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUN6QyxNQUFNLFdBQVcsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLElBQUksR0FBRyxJQUFJLGdCQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBZ0MsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sY0FBYyxHQUFHLElBQUksOEJBQWMsbUJBQU0sSUFBSSxDQUFDLE9BQU8sSUFBRSxJQUFJLElBQUcsQ0FBQztRQUVyRSxNQUFNLE9BQU8sR0FBRyw4QkFBc0IsQ0FDcEMsSUFBSSxFQUNKLElBQUksRUFDSixhQUFhLENBQ2QsQ0FBQztRQUVGLE9BQU8sU0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDbEIscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCO1lBQ3hDLENBQUMsQ0FBRSxJQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ3hGLENBQUMsQ0FBQyxTQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDWCxxQkFBUyxDQUFDLEdBQUcsRUFBRTtZQUNiLE9BQU8sVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFDbkQsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQzFCLE9BQU8sY0FBYyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsbUNBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDeEYsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3pCLElBQUksVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRTtnQkFDakUsT0FBTyxJQUFJLGlCQUFVLENBQWEsR0FBRyxDQUFDLEVBQUU7b0JBQ3RDLDRDQUEyQixDQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFDakIsSUFBSSxFQUNKLFdBQVcsRUFDWCxjQUFPLENBQUMsSUFBSSxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQzVDLE9BQU8sQ0FBQyxRQUFRLElBQUksR0FBRyxFQUN2QixPQUFPLENBQUMsY0FBYyxDQUN2QixDQUFDLElBQUksQ0FDSixHQUFHLEVBQUU7d0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUM1QixHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2pCLENBQUMsRUFDRCxDQUFDLEdBQVUsRUFBRSxFQUFFO3dCQUNiLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2pCLENBQUMsQ0FDRixDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO2FBQ0o7aUJBQU07Z0JBQ0wsT0FBTyxTQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDdkI7UUFDRCxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0YsQ0FBQztDQUVGO0FBbkRELGlDQW1EQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9icm93c2VyLWJ1aWxkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAnLi9ub2RlLWluamVjdCc7XG5cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uXG4gIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG4gIGltcG9ydCB7IFdlYnBhY2tCdWlsZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2snO1xuICBpbXBvcnQgeyBub3JtYWxpemUsIHJlc29sdmUsIHZpcnR1YWxGcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbiAgaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuICBpbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiB9IGZyb20gJ3J4anMnO1xuICBpbXBvcnQgeyBjb25jYXRNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4gIGltcG9ydCB7IGF1Z21lbnRBcHBXaXRoU2VydmljZVdvcmtlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvc2VydmljZS13b3JrZXInO1xuICBpbXBvcnQgeyBub3JtYWxpemVCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3V0aWxzJztcbmltcG9ydCB7IEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcblxuaW1wb3J0IHtCcm93c2VyQnVpbGRlciBhcyBHb29nbGVCcm93c2VyQnVpbGRlciwgZ2V0QnJvd3NlckxvZ2dpbmdDYn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0ICogYXMgZHJjcENvbW1vbiBmcm9tICcuL2NvbW1vbic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJyb3dzZXJCdWlsZGVyIGV4dGVuZHMgR29vZ2xlQnJvd3NlckJ1aWxkZXIge1xuICBydW4oYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248QnJvd3NlckJ1aWxkZXJTY2hlbWE+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG4gIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRleHQud29ya3NwYWNlLnJvb3Q7XG4gIGNvbnN0IHByb2plY3RSb290ID0gcmVzb2x2ZShyb290LCBidWlsZGVyQ29uZmlnLnJvb3QpO1xuICBjb25zdCBob3N0ID0gbmV3IHZpcnR1YWxGcy5BbGlhc0hvc3QodGhpcy5jb250ZXh0Lmhvc3QgYXMgdmlydHVhbEZzLkhvc3Q8ZnMuU3RhdHM+KTtcbiAgY29uc3Qgd2VicGFja0J1aWxkZXIgPSBuZXcgV2VicGFja0J1aWxkZXIoeyAuLi50aGlzLmNvbnRleHQsIGhvc3QgfSk7XG5cbiAgY29uc3Qgb3B0aW9ucyA9IG5vcm1hbGl6ZUJ1aWxkZXJTY2hlbWEoXG4gICAgaG9zdCxcbiAgICByb290LFxuICAgIGJ1aWxkZXJDb25maWdcbiAgKTtcblxuICByZXR1cm4gb2YobnVsbCkucGlwZShcbiAgICBjb25jYXRNYXAoKCkgPT4gb3B0aW9ucy5kZWxldGVPdXRwdXRQYXRoXG4gICAgPyAodGhpcyBhcyBhbnkpLl9kZWxldGVPdXRwdXREaXIocm9vdCwgbm9ybWFsaXplKG9wdGlvbnMub3V0cHV0UGF0aCksIHRoaXMuY29udGV4dC5ob3N0KVxuICAgIDogb2YobnVsbCkpLFxuICAgIGNvbmNhdE1hcCgoKSA9PiB7XG4gICAgICByZXR1cm4gZHJjcENvbW1vbi5jb21waWxlKGJ1aWxkZXJDb25maWcucm9vdCwgb3B0aW9ucyxcbiAgICAgICAgKCkgPT4gdGhpcy5idWlsZFdlYnBhY2tDb25maWcocm9vdCwgcHJvamVjdFJvb3QsIGhvc3QsIG9wdGlvbnMpKTtcbiAgICB9KSxcbiAgICBjb25jYXRNYXAoKHdlYnBhY2tDb25maWcpID0+IHtcbiAgICAgIHJldHVybiB3ZWJwYWNrQnVpbGRlci5ydW5XZWJwYWNrKHdlYnBhY2tDb25maWcsIGdldEJyb3dzZXJMb2dnaW5nQ2Iob3B0aW9ucy52ZXJib3NlKSk7XG4gICAgfSksXG4gICAgY29uY2F0TWFwKChidWlsZEV2ZW50KSA9PiB7XG4gICAgaWYgKGJ1aWxkRXZlbnQuc3VjY2VzcyAmJiAhb3B0aW9ucy53YXRjaCAmJiBvcHRpb25zLnNlcnZpY2VXb3JrZXIpIHtcbiAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PihvYnMgPT4ge1xuICAgICAgICBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIoXG4gICAgICAgICAgdGhpcy5jb250ZXh0Lmhvc3QsXG4gICAgICAgICAgcm9vdCxcbiAgICAgICAgICBwcm9qZWN0Um9vdCxcbiAgICAgICAgICByZXNvbHZlKHJvb3QsIG5vcm1hbGl6ZShvcHRpb25zLm91dHB1dFBhdGgpKSxcbiAgICAgICAgICBvcHRpb25zLmJhc2VIcmVmIHx8ICcvJyxcbiAgICAgICAgICBvcHRpb25zLm5nc3dDb25maWdQYXRoXG4gICAgICAgICkudGhlbihcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgICAgICBvYnMuY29tcGxldGUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9mKGJ1aWxkRXZlbnQpO1xuICAgIH1cbiAgICB9KVxuICApO1xuICB9XG5cbn1cbiJdfQ==
