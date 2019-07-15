"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const check_port_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port");
const Rx = tslib_1.__importStar(require("rxjs"));
const _ = tslib_1.__importStar(require("lodash"));
const change_cli_options_1 = tslib_1.__importDefault(require("./change-cli-options"));
function initDrcp(drcpArgs, drcpConfigFiles) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        var config = require('dr-comp-package/wfh/lib/config');
        if (drcpArgs.c == null)
            drcpArgs.c = [];
        drcpArgs.c.push(...drcpConfigFiles);
        yield config.init(drcpArgs);
        require('dr-comp-package/wfh/lib/logConfig')(config());
        return config;
    });
}
/**
 * Invoke this function from dev server builder
 * @param projectRoot
 * @param builderConfig
 * @param browserOptions
 * @param buildWebpackConfig
 * @param vfsHost
 */
function startDrcpServer(projectRoot, builderConfig, browserOptions, buildWebpackConfig) {
    // let argv: any = {};
    const options = builderConfig.options;
    const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
    let config;
    return Rx.Observable.create((obs) => {
        const startServer = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            config = yield initDrcp(options.drcpArgs, drcpConfigFiles);
            yield check_port_1.checkPort(config().port, builderConfig.options.host).toPromise();
            yield change_cli_options_1.default(config, browserOptions, builderConfig);
            try {
                const param = {
                    ssr: false,
                    builderConfig,
                    browserOptions,
                    webpackConfig: buildWebpackConfig(browserOptions),
                    projectRoot,
                    argv: Object.assign({ poll: options.poll, hmr: options.hmr }, options.drcpArgs)
                };
                if (!_.get(options, 'drcpArgs.noWebpack'))
                    config.set('_angularCli', param);
                // config.set('port', options.port);
                const log4js = require('log4js');
                const log = log4js.getLogger('ng-app-builder.ng.dev-server');
                const pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
                // let shutdownable: Promise<() => void>;
                // process.on('uncaughtException', function(err) {
                // 	log.error('Uncaught exception: ', err, err.stack);
                // 	// throw err; // let PM2 handle exception
                // 	obs.error(err);
                // });
                process.on('SIGINT', function () {
                    log.info('Recieve SIGINT.');
                    startDone.then(shut => shut())
                        .then(() => {
                        try {
                            log4js.shutdown();
                        }
                        catch (e) {
                            console.log(e);
                        }
                        log.info('Bye.');
                        process.exit(0);
                    });
                });
                process.on('message', function (msg) {
                    if (msg === 'shutdown') {
                        log.info('Recieve shutdown message from PM2');
                        startDone.then(shut => shut())
                            .then(() => {
                            try {
                                log4js.shutdown();
                            }
                            catch (e) {
                                console.log(e);
                            }
                            log.info('Bye.');
                            process.exit(0);
                        });
                    }
                });
                pkMgr.eventBus.on('webpackDone', (buildEvent) => {
                    obs.next(buildEvent);
                });
                const shutdown = yield pkMgr.runServer(param.argv);
                if (_.get(options, 'drcpArgs.noWebpack')) {
                    obs.next({ success: true });
                }
                return shutdown;
            }
            catch (err) {
                console.error('ng.command -  Failed to start server:', err);
                obs.error(err);
            }
        });
        const startDone = startServer();
        return function () {
            return tslib_1.__awaiter(this, void 0, void 0, function* () {
                const shutdown = yield startDone;
                shutdown();
            });
        };
    });
}
exports.startDrcpServer = startDrcpServer;
/**
 * Invoke this function from browser builder
 * @param projectRoot
 * @param browserOptions
 * @param buildWebpackConfig
 * @param vfsHost
 */
function compile(projectRoot, builderConfig, buildWebpackConfig, isSSR = false) {
    return Rx.from(compileAsync(projectRoot, builderConfig, buildWebpackConfig, isSSR));
}
exports.compile = compile;
function compileAsync(projectRoot, builderConfig, buildWebpackConfig, ssr) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const browserOptions = builderConfig;
        const options = browserOptions;
        const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const config = yield initDrcp(options.drcpArgs, drcpConfigFiles);
        yield change_cli_options_1.default(config, browserOptions);
        const param = {
            ssr,
            browserOptions: options,
            webpackConfig: buildWebpackConfig(browserOptions),
            projectRoot,
            argv: Object.assign({}, options.drcpArgs)
        };
        config.set('_angularCli', param);
        yield require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv);
        return param.webpackConfig;
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBV0EseUdBQXFHO0FBRXJHLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsc0ZBQTJEO0FBTTNELFNBQWUsUUFBUSxDQUFDLFFBQWEsRUFBRSxlQUF5Qjs7UUFDOUQsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFFdkQsSUFBSSxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUk7WUFDcEIsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUNwQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN2RCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQUE7QUF5QkQ7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxXQUFtQixFQUFFLGFBQTRELEVBQy9HLGNBQXFDLEVBQ3JDLGtCQUEwQztJQUMxQyxzQkFBc0I7SUFDdEIsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQXlELENBQUM7SUFDeEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUMxRixJQUFJLE1BQWtCLENBQUM7SUFFdkIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQTRCLEVBQUUsRUFBRTtRQUMzRCxNQUFNLFdBQVcsR0FBRyxHQUE4QixFQUFFO1lBQ2xELE1BQU0sR0FBRyxNQUFNLFFBQVEs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QUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzFGLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakUsTUFBTSw0QkFBdUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQW9CO1lBQzdCLEdBQUc7WUFDSCxjQUFjLEVBQUUsT0FBTztZQUN2QixhQUFhLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDO1lBQ2pELFdBQVc7WUFDWCxJQUFJLG9CQUNDLE9BQU8sQ0FBQyxRQUFRLENBQ3BCO1NBQ0YsQ0FBQztRQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sT0FBTyxDQUFDLGtEQUFrRCxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RixPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFDN0IsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NvbW1vbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7XG4gIEJ1aWxkRXZlbnQsXG4gIC8vIEJ1aWxkZXIsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uXG4gIC8vIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0Jztcbi8vIGltcG9ydCB7Tm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXInO1xuaW1wb3J0IHsgTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7Tm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWF9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7Tm9ybWFsaXplZEthcm1hQnVpbGRlclNjaGVtYX0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2thcm1hL3NjaGVtYSc7XG5pbXBvcnQgeyBjaGVja1BvcnQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL2NoZWNrLXBvcnQnO1xuaW1wb3J0IHtEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0ICogYXMgUnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMgZnJvbSAnLi9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgUGFja2FnZU1nciBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyJztcblxuZXhwb3J0IHR5cGUgRHJjcENvbmZpZyA9IHR5cGVvZiBhcGkuY29uZmlnO1xuXG5hc3luYyBmdW5jdGlvbiBpbml0RHJjcChkcmNwQXJnczogYW55LCBkcmNwQ29uZmlnRmlsZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxEcmNwQ29uZmlnPiB7XG4gIHZhciBjb25maWcgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9jb25maWcnKTtcblxuICBpZiAoZHJjcEFyZ3MuYyA9PSBudWxsKVxuICAgIGRyY3BBcmdzLmMgPSBbXTtcbiAgZHJjcEFyZ3MuYy5wdXNoKC4uLmRyY3BDb25maWdGaWxlcyk7XG4gIGF3YWl0IGNvbmZpZy5pbml0KGRyY3BBcmdzKTtcbiAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvbG9nQ29uZmlnJykoY29uZmlnKCkpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG5leHBvcnQgdHlwZSBidWlsZFdlYnBhY2tDb25maWdGdW5jID0gKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMpID0+IGFueTtcblxuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ2xpUGFyYW0ge1xuICBidWlsZGVyQ29uZmlnPzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+O1xuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuICBzc3I6IGJvb2xlYW47IC8vIElzIHNlcnZlciBzaWRlIC8gcHJlcmVuZGVyXG4gIHdlYnBhY2tDb25maWc6IGFueTtcbiAgcHJvamVjdFJvb3Q6IHN0cmluZztcbiAgYXJndjogYW55O1xufVxuXG5leHBvcnQgdHlwZSBOb3JtYWxpemVkQW5ndWxhckJ1aWxkU2NoZW1hID0gTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIHwgTm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWEgfFxuTm9ybWFsaXplZEthcm1hQnVpbGRlclNjaGVtYTtcblxuZXhwb3J0IHR5cGUgQW5ndWxhckJ1aWxkZXJPcHRpb25zID1cbiAgTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hICYgTm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWEgJiBOb3JtYWxpemVkS2FybWFCdWlsZGVyU2NoZW1hICZcbiAgRHJjcEJ1aWxkZXJPcHRpb25zO1xuXG5leHBvcnQgaW50ZXJmYWNlIERyY3BCdWlsZGVyT3B0aW9ucyB7XG4gIGRyY3BBcmdzOiBhbnk7XG4gIGRyY3BDb25maWc6IHN0cmluZztcbn1cblxuLyoqXG4gKiBJbnZva2UgdGhpcyBmdW5jdGlvbiBmcm9tIGRldiBzZXJ2ZXIgYnVpbGRlclxuICogQHBhcmFtIHByb2plY3RSb290IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKiBAcGFyYW0gYnVpbGRXZWJwYWNrQ29uZmlnIFxuICogQHBhcmFtIHZmc0hvc3QgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFydERyY3BTZXJ2ZXIocHJvamVjdFJvb3Q6IHN0cmluZywgYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+LFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBidWlsZFdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMpOiBSeC5PYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcbiAgLy8gbGV0IGFyZ3Y6IGFueSA9IHt9O1xuICBjb25zdCBvcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zIGFzIChEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyAmIERyY3BCdWlsZGVyT3B0aW9ucyk7XG4gIGNvbnN0IGRyY3BDb25maWdGaWxlcyA9IG9wdGlvbnMuZHJjcENvbmZpZyA/IG9wdGlvbnMuZHJjcENvbmZpZy5zcGxpdCgvXFxzKlssOzpdXFxzKi8pIDogW107XG4gIGxldCBjb25maWc6IERyY3BDb25maWc7XG5cbiAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlKChvYnM6IFJ4Lk9ic2VydmVyPEJ1aWxkRXZlbnQ+KSA9PiB7XG4gICAgY29uc3Qgc3RhcnRTZXJ2ZXIgPSBhc3luYyAoKTogUHJvbWlzZTwoKSA9PiB2b2lkPiA9PiB7XG4gICAgICBjb25maWcgPSBhd2FpdCBpbml0RHJjcChvcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnRmlsZXMpO1xuICAgICAgYXdhaXQgY2hlY2tQb3J0KGNvbmZpZygpLnBvcnQsIGJ1aWxkZXJDb25maWcub3B0aW9ucy5ob3N0KS50b1Byb21pc2UoKTtcbiAgICAgIGF3YWl0IGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMsXG4gICAgICAgICAgYnVpbGRlckNvbmZpZyk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJhbTogQW5ndWxhckNsaVBhcmFtID0ge1xuICAgICAgICAgIHNzcjogZmFsc2UsXG4gICAgICAgICAgYnVpbGRlckNvbmZpZyxcbiAgICAgICAgICBicm93c2VyT3B0aW9ucyxcbiAgICAgICAgICB3ZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWcoYnJvd3Nlck9wdGlvbnMpLFxuICAgICAgICAgIHByb2plY3RSb290LFxuICAgICAgICAgIGFyZ3Y6IHtcbiAgICAgICAgICAgIHBvbGw6IG9wdGlvbnMucG9sbCxcbiAgICAgICAgICAgIGhtcjogb3B0aW9ucy5obXIsXG4gICAgICAgICAgICAuLi5vcHRpb25zLmRyY3BBcmdzXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAoIV8uZ2V0KG9wdGlvbnMsICdkcmNwQXJncy5ub1dlYnBhY2snKSlcbiAgICAgICAgICBjb25maWcuc2V0KCdfYW5ndWxhckNsaScsIHBhcmFtKTtcbiAgICAgICAgLy8gY29uZmlnLnNldCgncG9ydCcsIG9wdGlvbnMucG9ydCk7XG4gICAgICAgIGNvbnN0IGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xuICAgICAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5uZy5kZXYtc2VydmVyJyk7XG4gICAgICAgIGNvbnN0IHBrTWdyOiB0eXBlb2YgUGFja2FnZU1nciA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3InKTtcbiAgICAgICAgLy8gbGV0IHNodXRkb3duYWJsZTogUHJvbWlzZTwoKSA9PiB2b2lkPjtcblxuICAgICAgICAvLyBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAvLyBcdGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uOiAnLCBlcnIsIGVyci5zdGFjayk7XG4gICAgICAgIC8vIFx0Ly8gdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbiAgICAgICAgLy8gXHRvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIHByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGxvZy5pbmZvKCdSZWNpZXZlIFNJR0lOVC4nKTtcbiAgICAgICAgICBzdGFydERvbmUudGhlbihzaHV0ID0+IHNodXQoKSlcbiAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBsb2c0anMuc2h1dGRvd24oKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtjb25zb2xlLmxvZyhlKTt9XG4gICAgICAgICAgICBsb2cuaW5mbygnQnllLicpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICAgICAgICAgIGlmIChtc2cgPT09ICdzaHV0ZG93bicpIHtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTInKTtcbiAgICAgICAgICAgIHN0YXJ0RG9uZS50aGVuKHNodXQgPT4gc2h1dCgpKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxvZzRqcy5zaHV0ZG93bigpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7Y29uc29sZS5sb2coZSk7fVxuICAgICAgICAgICAgICBsb2cuaW5mbygnQnllLicpO1xuICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBwa01nci5ldmVudEJ1cy5vbignd2VicGFja0RvbmUnLCAoYnVpbGRFdmVudDogQnVpbGRFdmVudCkgPT4ge1xuICAgICAgICAgIG9icy5uZXh0KGJ1aWxkRXZlbnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBzaHV0ZG93biA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihwYXJhbS5hcmd2KTtcbiAgICAgICAgaWYgKF8uZ2V0KG9wdGlvbnMsICdkcmNwQXJncy5ub1dlYnBhY2snKSkge1xuICAgICAgICAgIG9icy5uZXh0KHtzdWNjZXNzOiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNodXRkb3duO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ25nLmNvbW1hbmQgLSAgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlcnIpO1xuICAgICAgICBvYnMuZXJyb3IoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IHN0YXJ0RG9uZSA9IHN0YXJ0U2VydmVyKCk7XG5cbiAgICByZXR1cm4gYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBzaHV0ZG93biA9IGF3YWl0IHN0YXJ0RG9uZTtcbiAgICAgIHNodXRkb3duKCk7XG4gICAgfTtcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBJbnZva2UgdGhpcyBmdW5jdGlvbiBmcm9tIGJyb3dzZXIgYnVpbGRlclxuICogQHBhcmFtIHByb2plY3RSb290IFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICogQHBhcmFtIGJ1aWxkV2VicGFja0NvbmZpZyBcbiAqIEBwYXJhbSB2ZnNIb3N0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZShwcm9qZWN0Um9vdDogc3RyaW5nLFxuICBidWlsZGVyQ29uZmlnOiBOb3JtYWxpemVkQW5ndWxhckJ1aWxkU2NoZW1hLFxuICBidWlsZFdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMsIGlzU1NSID0gZmFsc2UpIHtcbiAgcmV0dXJuIFJ4LmZyb20oY29tcGlsZUFzeW5jKHByb2plY3RSb290LCBidWlsZGVyQ29uZmlnLCBidWlsZFdlYnBhY2tDb25maWcsIGlzU1NSKSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvbXBpbGVBc3luYyhwcm9qZWN0Um9vdDogc3RyaW5nLFxuICBidWlsZGVyQ29uZmlnOiBOb3JtYWxpemVkQW5ndWxhckJ1aWxkU2NoZW1hLFxuICBidWlsZFdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMsIHNzcjogYm9vbGVhbikge1xuICBjb25zdCBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zID0gYnVpbGRlckNvbmZpZyBhcyBBbmd1bGFyQnVpbGRlck9wdGlvbnM7XG4gIGNvbnN0IG9wdGlvbnMgPSBicm93c2VyT3B0aW9ucztcbiAgY29uc3QgZHJjcENvbmZpZ0ZpbGVzID0gb3B0aW9ucy5kcmNwQ29uZmlnID8gb3B0aW9ucy5kcmNwQ29uZmlnLnNwbGl0KC9cXHMqWyw7Ol1cXHMqLykgOiBbXTtcbiAgY29uc3QgY29uZmlnID0gYXdhaXQgaW5pdERyY3Aob3B0aW9ucy5kcmNwQXJncywgZHJjcENvbmZpZ0ZpbGVzKTtcbiAgYXdhaXQgY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucyk7XG4gIGNvbnN0IHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSB7XG4gICAgc3NyLFxuICAgIGJyb3dzZXJPcHRpb25zOiBvcHRpb25zLFxuICAgIHdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZyhicm93c2VyT3B0aW9ucyksXG4gICAgcHJvamVjdFJvb3QsXG4gICAgYXJndjoge1xuICAgICAgLi4ub3B0aW9ucy5kcmNwQXJnc1xuICAgIH1cbiAgfTtcbiAgY29uZmlnLnNldCgnX2FuZ3VsYXJDbGknLCBwYXJhbSk7XG4gIGF3YWl0IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVJ1bm5lcicpLnJ1bkJ1aWxkZXIocGFyYW0uYXJndik7XG4gIHJldHVybiBwYXJhbS53ZWJwYWNrQ29uZmlnO1xufVxuIl19
