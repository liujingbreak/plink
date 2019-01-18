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
                        log4js.shutdown();
                        log.info('Bye.');
                        process.exit(0);
                    });
                });
                process.on('message', function (msg) {
                    if (msg === 'shutdown') {
                        log.info('Recieve shutdown message from PM2');
                        startDone.then(shut => shut())
                            .then(() => {
                            log4js.shutdown();
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
    return new Rx.Observable((obs) => {
        compileAsync(projectRoot, builderConfig, buildWebpackConfig, isSSR)
            .then((webpackConfig) => {
            obs.next(webpackConfig);
            obs.complete();
        })
            .catch((err) => {
            console.error('ng.command - Angular cli error', err);
            obs.error(err);
        });
    });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBV0EseUdBQXFHO0FBRXJHLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsc0ZBQTJEO0FBTTNELFNBQWUsUUFBUSxDQUFDLFFBQWEsRUFBRSxlQUF5Qjs7UUFDL0QsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFFdkQsSUFBSSxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUk7WUFDckIsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakIsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUNwQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN2RCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FBQTtBQXlCRDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsZUFBZSxDQUFDLFdBQW1CLEVBQUUsYUFBNEQsRUFDaEgsY0FBcUMsRUFDckMsa0JBQTBDO0lBQzFDLHNCQUFzQjtJQUN0QixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBeUQsQ0FBQztJQUN4RixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzFGLElBQUksTUFBa0IsQ0FBQztJQUV2QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBNEIsRUFBRSxFQUFFO1FBQzVELE1BQU0sV0FBVyxHQUFHLEdBQThCLEVBQUU7WUFDbkQsTUFBTSxHQUFHLE1BQU0sUUFBUSxD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QW1CLEVBQzlDLGFBQTJDLEVBQzNDLGtCQUEwQyxFQUFFLEdBQVk7O1FBQ3hELE1BQU0sY0FBYyxHQUEwQixhQUFzQyxDQUFDO1FBQ3JGLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzFGLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakUsTUFBTSw0QkFBdUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdEQsTUFBTSxLQUFLLEdBQW9CO1lBQzlCLEdBQUc7WUFDSCxjQUFjLEVBQUUsT0FBTztZQUN2QixhQUFhLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDO1lBQ2pELFdBQVc7WUFDWCxJQUFJLG9CQUNBLE9BQU8sQ0FBQyxRQUFRLENBQ25CO1NBQ0QsQ0FBQztRQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sT0FBTyxDQUFDLGtEQUFrRCxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RixPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFDNUIsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NvbW1vbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7XG5cdEJ1aWxkRXZlbnQsXG5cdC8vIEJ1aWxkZXIsXG5cdEJ1aWxkZXJDb25maWd1cmF0aW9uXG5cdC8vIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0Jztcbi8vIGltcG9ydCB7Tm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXInO1xuaW1wb3J0IHsgTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7Tm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWF9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7Tm9ybWFsaXplZEthcm1hQnVpbGRlclNjaGVtYX0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2thcm1hL3NjaGVtYSc7XG5pbXBvcnQgeyBjaGVja1BvcnQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL2NoZWNrLXBvcnQnO1xuaW1wb3J0IHtEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0ICogYXMgUnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMgZnJvbSAnLi9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgUGFja2FnZU1nciBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyJztcblxuZXhwb3J0IHR5cGUgRHJjcENvbmZpZyA9IHR5cGVvZiBhcGkuY29uZmlnO1xuXG5hc3luYyBmdW5jdGlvbiBpbml0RHJjcChkcmNwQXJnczogYW55LCBkcmNwQ29uZmlnRmlsZXM6IHN0cmluZ1tdKTogUHJvbWlzZTxEcmNwQ29uZmlnPiB7XG5cdHZhciBjb25maWcgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9jb25maWcnKTtcblxuXHRpZiAoZHJjcEFyZ3MuYyA9PSBudWxsKVxuXHRcdGRyY3BBcmdzLmMgPSBbXTtcblx0ZHJjcEFyZ3MuYy5wdXNoKC4uLmRyY3BDb25maWdGaWxlcyk7XG5cdGF3YWl0IGNvbmZpZy5pbml0KGRyY3BBcmdzKTtcblx0cmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvbG9nQ29uZmlnJykoY29uZmlnKCkpO1xuXHRyZXR1cm4gY29uZmlnO1xufVxuXG5leHBvcnQgdHlwZSBidWlsZFdlYnBhY2tDb25maWdGdW5jID0gKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMpID0+IGFueTtcblxuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ2xpUGFyYW0ge1xuXHRidWlsZGVyQ29uZmlnPzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+O1xuXHRicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuXHRzc3I6IGJvb2xlYW47IC8vIElzIHNlcnZlciBzaWRlIC8gcHJlcmVuZGVyXG5cdHdlYnBhY2tDb25maWc6IGFueTtcblx0cHJvamVjdFJvb3Q6IHN0cmluZztcblx0YXJndjogYW55O1xufVxuXG5leHBvcnQgdHlwZSBOb3JtYWxpemVkQW5ndWxhckJ1aWxkU2NoZW1hID0gTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIHwgTm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWEgfFxuTm9ybWFsaXplZEthcm1hQnVpbGRlclNjaGVtYTtcblxuZXhwb3J0IHR5cGUgQW5ndWxhckJ1aWxkZXJPcHRpb25zID1cblx0Tm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hICYgTm9ybWFsaXplZFNlcnZlckJ1aWxkZXJTZXJ2ZXJTY2hlbWEgJiBOb3JtYWxpemVkS2FybWFCdWlsZGVyU2NoZW1hICZcblx0RHJjcEJ1aWxkZXJPcHRpb25zO1xuXG5leHBvcnQgaW50ZXJmYWNlIERyY3BCdWlsZGVyT3B0aW9ucyB7XG5cdGRyY3BBcmdzOiBhbnk7XG5cdGRyY3BDb25maWc6IHN0cmluZztcbn1cblxuLyoqXG4gKiBJbnZva2UgdGhpcyBmdW5jdGlvbiBmcm9tIGRldiBzZXJ2ZXIgYnVpbGRlclxuICogQHBhcmFtIHByb2plY3RSb290IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKiBAcGFyYW0gYnVpbGRXZWJwYWNrQ29uZmlnIFxuICogQHBhcmFtIHZmc0hvc3QgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFydERyY3BTZXJ2ZXIocHJvamVjdFJvb3Q6IHN0cmluZywgYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+LFxuXHRicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuXHRidWlsZFdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMpOiBSeC5PYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcblx0Ly8gbGV0IGFyZ3Y6IGFueSA9IHt9O1xuXHRjb25zdCBvcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zIGFzIChEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyAmIERyY3BCdWlsZGVyT3B0aW9ucyk7XG5cdGNvbnN0IGRyY3BDb25maWdGaWxlcyA9IG9wdGlvbnMuZHJjcENvbmZpZyA/IG9wdGlvbnMuZHJjcENvbmZpZy5zcGxpdCgvXFxzKlssOzpdXFxzKi8pIDogW107XG5cdGxldCBjb25maWc6IERyY3BDb25maWc7XG5cblx0cmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlKChvYnM6IFJ4Lk9ic2VydmVyPEJ1aWxkRXZlbnQ+KSA9PiB7XG5cdFx0Y29uc3Qgc3RhcnRTZXJ2ZXIgPSBhc3luYyAoKTogUHJvbWlzZTwoKSA9PiB2b2lkPiA9PiB7XG5cdFx0XHRjb25maWcgPSBhd2FpdCBpbml0RHJjcChvcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnRmlsZXMpO1xuXHRcdFx0YXdhaXQgY2hlY2tQb3J0KGNvbmZpZygpLnBvcnQsIGJ1aWxkZXJDb25maWcub3B0aW9ucy5ob3N0KS50b1Byb21pc2UoKTtcblx0XHRcdGF3YWl0IGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMsXG5cdFx0XHRcdFx0YnVpbGRlckNvbmZpZyk7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBwYXJhbTogQW5ndWxhckNsaVBhcmFtID0ge1xuXHRcdFx0XHRcdHNzcjogZmFsc2UsXG5cdFx0XHRcdFx0YnVpbGRlckNvbmZpZyxcblx0XHRcdFx0XHRicm93c2VyT3B0aW9ucyxcblx0XHRcdFx0XHR3ZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWcoYnJvd3Nlck9wdGlvbnMpLFxuXHRcdFx0XHRcdHByb2plY3RSb290LFxuXHRcdFx0XHRcdGFyZ3Y6IHtcblx0XHRcdFx0XHRcdHBvbGw6IG9wdGlvbnMucG9sbCxcblx0XHRcdFx0XHRcdGhtcjogb3B0aW9ucy5obXIsXG5cdFx0XHRcdFx0XHQuLi5vcHRpb25zLmRyY3BBcmdzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRpZiAoIV8uZ2V0KG9wdGlvbnMsICdkcmNwQXJncy5ub1dlYnBhY2snKSlcblx0XHRcdFx0XHRjb25maWcuc2V0KCdfYW5ndWxhckNsaScsIHBhcmFtKTtcblx0XHRcdFx0Ly8gY29uZmlnLnNldCgncG9ydCcsIG9wdGlvbnMucG9ydCk7XG5cdFx0XHRcdGNvbnN0IGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xuXHRcdFx0XHRjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5uZy5kZXYtc2VydmVyJyk7XG5cdFx0XHRcdGNvbnN0IHBrTWdyOiB0eXBlb2YgUGFja2FnZU1nciA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3InKTtcblx0XHRcdFx0Ly8gbGV0IHNodXRkb3duYWJsZTogUHJvbWlzZTwoKSA9PiB2b2lkPjtcblxuXHRcdFx0XHQvLyBwcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHQvLyBcdGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uOiAnLCBlcnIsIGVyci5zdGFjayk7XG5cdFx0XHRcdC8vIFx0Ly8gdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cblx0XHRcdFx0Ly8gXHRvYnMuZXJyb3IoZXJyKTtcblx0XHRcdFx0Ly8gfSk7XG5cdFx0XHRcdHByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGxvZy5pbmZvKCdSZWNpZXZlIFNJR0lOVC4nKTtcblx0XHRcdFx0XHRzdGFydERvbmUudGhlbihzaHV0ID0+IHNodXQoKSlcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRsb2c0anMuc2h1dGRvd24oKTtcblx0XHRcdFx0XHRcdGxvZy5pbmZvKCdCeWUuJyk7XG5cdFx0XHRcdFx0XHRwcm9jZXNzLmV4aXQoMCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG5cdFx0XHRcdFx0aWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuXHRcdFx0XHRcdFx0bG9nLmluZm8oJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMicpO1xuXHRcdFx0XHRcdFx0c3RhcnREb25lLnRoZW4oc2h1dCA9PiBzaHV0KCkpXG5cdFx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGxvZzRqcy5zaHV0ZG93bigpO1xuXHRcdFx0XHRcdFx0XHRsb2cuaW5mbygnQnllLicpO1xuXHRcdFx0XHRcdFx0XHRwcm9jZXNzLmV4aXQoMCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRwa01nci5ldmVudEJ1cy5vbignd2VicGFja0RvbmUnLCAoYnVpbGRFdmVudDogQnVpbGRFdmVudCkgPT4ge1xuXHRcdFx0XHRcdG9icy5uZXh0KGJ1aWxkRXZlbnQpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRjb25zdCBzaHV0ZG93biA9IGF3YWl0IHBrTWdyLnJ1blNlcnZlcihwYXJhbS5hcmd2KTtcblx0XHRcdFx0aWYgKF8uZ2V0KG9wdGlvbnMsICdkcmNwQXJncy5ub1dlYnBhY2snKSkge1xuXHRcdFx0XHRcdG9icy5uZXh0KHtzdWNjZXNzOiB0cnVlfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHNodXRkb3duO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ25nLmNvbW1hbmQgLSAgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlcnIpO1xuXHRcdFx0XHRvYnMuZXJyb3IoZXJyKTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdGNvbnN0IHN0YXJ0RG9uZSA9IHN0YXJ0U2VydmVyKCk7XG5cblx0XHRyZXR1cm4gYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25zdCBzaHV0ZG93biA9IGF3YWl0IHN0YXJ0RG9uZTtcblx0XHRcdHNodXRkb3duKCk7XG5cdFx0fTtcblx0fSk7XG59XG5cblxuLyoqXG4gKiBJbnZva2UgdGhpcyBmdW5jdGlvbiBmcm9tIGJyb3dzZXIgYnVpbGRlclxuICogQHBhcmFtIHByb2plY3RSb290IFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICogQHBhcmFtIGJ1aWxkV2VicGFja0NvbmZpZyBcbiAqIEBwYXJhbSB2ZnNIb3N0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZShwcm9qZWN0Um9vdDogc3RyaW5nLFxuXHRidWlsZGVyQ29uZmlnOiBOb3JtYWxpemVkQW5ndWxhckJ1aWxkU2NoZW1hLFxuXHRidWlsZFdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMsIGlzU1NSID0gZmFsc2UpIHtcblx0cmV0dXJuIG5ldyBSeC5PYnNlcnZhYmxlKChvYnMpID0+IHtcblx0XHRjb21waWxlQXN5bmMocHJvamVjdFJvb3QsIGJ1aWxkZXJDb25maWcsIGJ1aWxkV2VicGFja0NvbmZpZywgaXNTU1IpXG5cdFx0LnRoZW4oKHdlYnBhY2tDb25maWc6IGFueSkgPT4ge1xuXHRcdFx0b2JzLm5leHQod2VicGFja0NvbmZpZyk7XG5cdFx0XHRvYnMuY29tcGxldGUoKTtcblx0XHR9KVxuXHRcdC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuXHRcdFx0Y29uc29sZS5lcnJvcignbmcuY29tbWFuZCAtIEFuZ3VsYXIgY2xpIGVycm9yJywgZXJyKTtcblx0XHRcdG9icy5lcnJvcihlcnIpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29tcGlsZUFzeW5jKHByb2plY3RSb290OiBzdHJpbmcsXG5cdGJ1aWxkZXJDb25maWc6IE5vcm1hbGl6ZWRBbmd1bGFyQnVpbGRTY2hlbWEsXG5cdGJ1aWxkV2VicGFja0NvbmZpZzogYnVpbGRXZWJwYWNrQ29uZmlnRnVuYywgc3NyOiBib29sZWFuKSB7XG5cdGNvbnN0IGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMgPSBidWlsZGVyQ29uZmlnIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcblx0Y29uc3Qgb3B0aW9ucyA9IGJyb3dzZXJPcHRpb25zO1xuXHRjb25zdCBkcmNwQ29uZmlnRmlsZXMgPSBvcHRpb25zLmRyY3BDb25maWcgPyBvcHRpb25zLmRyY3BDb25maWcuc3BsaXQoL1xccypbLDs6XVxccyovKSA6IFtdO1xuXHRjb25zdCBjb25maWcgPSBhd2FpdCBpbml0RHJjcChvcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnRmlsZXMpO1xuXHRhd2FpdCBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zKTtcblx0Y29uc3QgcGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IHtcblx0XHRzc3IsXG5cdFx0YnJvd3Nlck9wdGlvbnM6IG9wdGlvbnMsXG5cdFx0d2VicGFja0NvbmZpZzogYnVpbGRXZWJwYWNrQ29uZmlnKGJyb3dzZXJPcHRpb25zKSxcblx0XHRwcm9qZWN0Um9vdCxcblx0XHRhcmd2OiB7XG5cdFx0XHQuLi5vcHRpb25zLmRyY3BBcmdzXG5cdFx0fVxuXHR9O1xuXHRjb25maWcuc2V0KCdfYW5ndWxhckNsaScsIHBhcmFtKTtcblx0YXdhaXQgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlUnVubmVyJykucnVuQnVpbGRlcihwYXJhbS5hcmd2KTtcblx0cmV0dXJuIHBhcmFtLndlYnBhY2tDb25maWc7XG59XG4iXX0=
