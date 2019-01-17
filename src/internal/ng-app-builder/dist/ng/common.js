"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
        initDrcp(options.drcpArgs, drcpConfigFiles)
            .then((cfg) => {
            config = cfg;
            return change_cli_options_1.default(config, browserOptions, builderConfig);
        })
            .then(() => {
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
            config.set('port', options.port);
            var log4js = require('log4js');
            var log = log4js.getLogger('ng-app-builder.ng.dev-server');
            var pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
            let shutdownable;
            // process.on('uncaughtException', function(err) {
            // 	log.error('Uncaught exception: ', err, err.stack);
            // 	// throw err; // let PM2 handle exception
            // 	obs.error(err);
            // });
            process.on('SIGINT', function () {
                log.info('Recieve SIGINT.');
                shutdownable.then(shut => shut())
                    .then(() => {
                    log4js.shutdown();
                    log.info('Bye.');
                    process.exit(0);
                });
            });
            process.on('message', function (msg) {
                if (msg === 'shutdown') {
                    log.info('Recieve shutdown message from PM2');
                    shutdownable.then(shut => shut())
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
            shutdownable = pkMgr.runServer(param.argv)
                .then((shutdownable) => {
                if (_.get(options, 'drcpArgs.noWebpack')) {
                    obs.next({ success: true });
                }
                return shutdownable;
            })
                .catch((err) => {
                console.error('ng.command -  Failed to start server:', err);
                // process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
                obs.error(err);
            });
        })
            .catch((err) => {
            console.error('ng.command -  Failed to start server:', err);
            obs.error(err);
        });
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
        const browserOptions = builderConfig.options;
        const options = browserOptions;
        const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const config = yield initDrcp(options.drcpArgs, drcpConfigFiles);
        yield change_cli_options_1.default(config, browserOptions, builderConfig);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBWUEsaURBQTJCO0FBQzNCLGtEQUE0QjtBQUM1QixzRkFBMkQ7QUFVM0QsU0FBZSxRQUFRLENBQUMsUUFBYSxFQUFFLGVBQXlCOztRQUMvRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUV2RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSTtZQUNyQixRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNqQixRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QixPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUFBO0FBcUJEOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixlQUFlLENBQUMsV0FBbUIsRUFBRSxhQUE0RCxFQUNoSCxjQUFxQyxFQUNyQyxrQkFBMEM7SUFDMUMsc0JBQXNCO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUF5RCxDQUFDO0lBQ3hGLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDMUYsSUFBSSxNQUFrQixDQUFDO0lBRXZCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUE0QixFQUFFLEVBQUU7UUFDNUQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDO2FBQzFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2IsTUFBTSxHQUFHLEdBQUcsQ0FBQztZQUNiLE9BQU8sNEJBQXVCLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFDcEQsYUFBNEQsQ0FBQyxDQUFDO1FBQ2hFLENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDVixNQUFNLEtBQUssR0FBb0I7Z0JBQzlCLEdBQUcsRUFBRSxLQUFLO2dCQUNWLGFBQWE7Z0JBQ2IsY0FBYztnQkFDZCxhQUFhLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDO2dCQUNqRCxXQUFXO2dCQUNYLElBQUksa0JBQ0gsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQ2xCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxJQUNiLE9BQU8sQ0FBQyxRQUFRLENBQ25CO2FBQ0QsQ0FBQztZQUNGLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDM0QsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDMUQsSUFBSSxZQUFpQyxDQUFDO1lBRXRDLGtEQUFrRDtZQUNsRCxzREFBc0Q7WUFDdEQsNkNBQTZDO1lBQzdDLG1CQUFtQjtZQUNuQixNQUFNO1lBQ04sT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDNUIsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO3FCQUNoQyxJQUFJLENBQUMsR0FBRyxFQUFFO29CQUNWLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakIsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztnQkFDakMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO29CQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7b0JBQzlDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt5QkFDaEMsSUFBSSxDQUFDLEdBQUcsRUFBRTt3QkFDVixNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLENBQUMsQ0FBQyxDQUFDO2lCQUNIO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxVQUFzQixFQUFFLEVBQUU7Z0JBQzNELEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEIsQ0FBQyxDQUFDLENBQUM7WUFDSCxZQUFZLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2lCQUN6QyxJQUFJLENBQUMsQ0FBQyxZQUFpQixFQUFFLEVBQUU7Z0JBQzNCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtvQkFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2lCQUMxQjtnQkFDRCxPQUFPLFlBQVksQ0FBQztZQUNyQixDQUFDLENBQUM7aUJBQ0QsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3JCLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzVELGdIQUFnSDtnQkFDaEgsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDNUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWxGRCwwQ0FrRkM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixPQUFPLENBQUMsV0FBbUIsRUFDMUMsYUFBb0YsRUFDcEYsa0JBQTBDLEVBQUUsS0FBSyxHQUFHLEtBQUs7SUFDekQsT0FBTyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUNoQyxZQUFZLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLENBQUM7YUFDbEUsSUFBSSxDQUFDLENBQUMsYUFBa0IsRUFBRSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckQsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWRELDBCQWNDO0FBRUQsU0FBZSxZQUFZLENBQUMsV0FBbUIsRUFDOUMsYUFBb0YsRUFDcEYsa0JBQTBDLEVBQUUsR0FBWTs7UUFDeEQsTUFBTSxjQUFjLEdBQTBCLGFBQWEsQ0FBQyxPQUFnQyxDQUFDO1FBQzdGLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztRQUMvQixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzFGLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakUsTUFBTSw0QkFBdUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUNuRCxhQUE0RCxDQUFDLENBQUM7UUFDL0QsTUFBTSxLQUFLLEdBQW9CO1lBQzlCLEdBQUc7WUFDSCxjQUFjLEVBQUUsT0FBTztZQUN2QixhQUFhLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDO1lBQ2pELFdBQVc7WUFDWCxJQUFJLG9CQUNBLE9BQU8sQ0FBQyxRQUFRLENBQ25CO1NBQ0QsQ0FBQztRQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sT0FBTyxDQUFDLGtEQUFrRCxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RixPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFDNUIsQ0FBQztDQUFBIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NvbW1vbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7XG5cdEJ1aWxkRXZlbnQsXG5cdC8vIEJ1aWxkZXIsXG5cdEJ1aWxkZXJDb25maWd1cmF0aW9uXG5cdC8vIEJ1aWxkZXJDb250ZXh0LFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcblxuLy8gaW1wb3J0IHtOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlcic7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQge0RldlNlcnZlckJ1aWxkZXJPcHRpb25zfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQge0J1aWxkV2VicGFja1NlcnZlclNjaGVtYX0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3NlcnZlci9zY2hlbWEnO1xuaW1wb3J0ICogYXMgUnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMgZnJvbSAnLi9jaGFuZ2UtY2xpLW9wdGlvbnMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5cbmV4cG9ydCB0eXBlIERyY3BDb25maWcgPSB0eXBlb2YgYXBpLmNvbmZpZztcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIge1xuXHRhbmd1bGFySnNvbihvcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG5cdFx0YnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248QW5ndWxhckJ1aWxkZXJPcHRpb25zPilcblx0OiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdERyY3AoZHJjcEFyZ3M6IGFueSwgZHJjcENvbmZpZ0ZpbGVzOiBzdHJpbmdbXSk6IFByb21pc2U8RHJjcENvbmZpZz4ge1xuXHR2YXIgY29uZmlnID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvY29uZmlnJyk7XG5cblx0aWYgKGRyY3BBcmdzLmMgPT0gbnVsbClcblx0XHRkcmNwQXJncy5jID0gW107XG5cdGRyY3BBcmdzLmMucHVzaCguLi5kcmNwQ29uZmlnRmlsZXMpO1xuXHRhd2FpdCBjb25maWcuaW5pdChkcmNwQXJncyk7XG5cdHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcblx0cmV0dXJuIGNvbmZpZztcbn1cblxuZXhwb3J0IHR5cGUgYnVpbGRXZWJwYWNrQ29uZmlnRnVuYyA9IChicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zKSA9PiBhbnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNsaVBhcmFtIHtcblx0YnVpbGRlckNvbmZpZz86IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPjtcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcblx0c3NyOiBib29sZWFuOyAvLyBJcyBzZXJ2ZXIgc2lkZSAvIHByZXJlbmRlclxuXHR3ZWJwYWNrQ29uZmlnOiBhbnk7XG5cdHByb2plY3RSb290OiBzdHJpbmc7XG5cdGFyZ3Y6IGFueTtcbn1cblxuZXhwb3J0IHR5cGUgQW5ndWxhckJ1aWxkZXJPcHRpb25zID1cblx0QnJvd3NlckJ1aWxkZXJTY2hlbWEgJiBCdWlsZFdlYnBhY2tTZXJ2ZXJTY2hlbWEgJiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyAmIERyY3BCdWlsZGVyT3B0aW9ucztcblxuZXhwb3J0IGludGVyZmFjZSBEcmNwQnVpbGRlck9wdGlvbnMge1xuXHRkcmNwQXJnczogYW55O1xuXHRkcmNwQ29uZmlnOiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW52b2tlIHRoaXMgZnVuY3Rpb24gZnJvbSBkZXYgc2VydmVyIGJ1aWxkZXJcbiAqIEBwYXJhbSBwcm9qZWN0Um9vdCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICogQHBhcmFtIGJ1aWxkV2VicGFja0NvbmZpZyBcbiAqIEBwYXJhbSB2ZnNIb3N0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhcnREcmNwU2VydmVyKHByb2plY3RSb290OiBzdHJpbmcsIGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPixcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcblx0YnVpbGRXZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWdGdW5jKTogUnguT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG5cdC8vIGxldCBhcmd2OiBhbnkgPSB7fTtcblx0Y29uc3Qgb3B0aW9ucyA9IGJ1aWxkZXJDb25maWcub3B0aW9ucyBhcyAoRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgJiBEcmNwQnVpbGRlck9wdGlvbnMpO1xuXHRjb25zdCBkcmNwQ29uZmlnRmlsZXMgPSBvcHRpb25zLmRyY3BDb25maWcgPyBvcHRpb25zLmRyY3BDb25maWcuc3BsaXQoL1xccypbLDs6XVxccyovKSA6IFtdO1xuXHRsZXQgY29uZmlnOiBEcmNwQ29uZmlnO1xuXG5cdHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZSgob2JzOiBSeC5PYnNlcnZlcjxCdWlsZEV2ZW50PikgPT4ge1xuXHRcdGluaXREcmNwKG9wdGlvbnMuZHJjcEFyZ3MsIGRyY3BDb25maWdGaWxlcylcblx0XHQudGhlbigoY2ZnKSA9PiB7XG5cdFx0XHRjb25maWcgPSBjZmc7XG5cdFx0XHRyZXR1cm4gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucyxcblx0XHRcdFx0YnVpbGRlckNvbmZpZyBhcyBCdWlsZGVyQ29uZmlndXJhdGlvbjxBbmd1bGFyQnVpbGRlck9wdGlvbnM+KTtcblx0XHR9KVxuXHRcdC50aGVuKCgpID0+IHtcblx0XHRcdGNvbnN0IHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSB7XG5cdFx0XHRcdHNzcjogZmFsc2UsXG5cdFx0XHRcdGJ1aWxkZXJDb25maWcsXG5cdFx0XHRcdGJyb3dzZXJPcHRpb25zLFxuXHRcdFx0XHR3ZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWcoYnJvd3Nlck9wdGlvbnMpLFxuXHRcdFx0XHRwcm9qZWN0Um9vdCxcblx0XHRcdFx0YXJndjoge1xuXHRcdFx0XHRcdHBvbGw6IG9wdGlvbnMucG9sbCxcblx0XHRcdFx0XHRobXI6IG9wdGlvbnMuaG1yLFxuXHRcdFx0XHRcdC4uLm9wdGlvbnMuZHJjcEFyZ3Ncblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdGlmICghXy5nZXQob3B0aW9ucywgJ2RyY3BBcmdzLm5vV2VicGFjaycpKVxuXHRcdFx0XHRjb25maWcuc2V0KCdfYW5ndWxhckNsaScsIHBhcmFtKTtcblx0XHRcdGNvbmZpZy5zZXQoJ3BvcnQnLCBvcHRpb25zLnBvcnQpO1xuXHRcdFx0dmFyIGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xuXHRcdFx0dmFyIGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ25nLWFwcC1idWlsZGVyLm5nLmRldi1zZXJ2ZXInKTtcblx0XHRcdHZhciBwa01nciA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3InKTtcblx0XHRcdGxldCBzaHV0ZG93bmFibGU6IFByb21pc2U8KCkgPT4gdm9pZD47XG5cblx0XHRcdC8vIHByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHQvLyBcdGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uOiAnLCBlcnIsIGVyci5zdGFjayk7XG5cdFx0XHQvLyBcdC8vIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG5cdFx0XHQvLyBcdG9icy5lcnJvcihlcnIpO1xuXHRcdFx0Ly8gfSk7XG5cdFx0XHRwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0bG9nLmluZm8oJ1JlY2lldmUgU0lHSU5ULicpO1xuXHRcdFx0XHRzaHV0ZG93bmFibGUudGhlbihzaHV0ID0+IHNodXQoKSlcblx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdGxvZzRqcy5zaHV0ZG93bigpO1xuXHRcdFx0XHRcdGxvZy5pbmZvKCdCeWUuJyk7XG5cdFx0XHRcdFx0cHJvY2Vzcy5leGl0KDApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0cHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuXHRcdFx0XHRpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG5cdFx0XHRcdFx0bG9nLmluZm8oJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMicpO1xuXHRcdFx0XHRcdHNodXRkb3duYWJsZS50aGVuKHNodXQgPT4gc2h1dCgpKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGxvZzRqcy5zaHV0ZG93bigpO1xuXHRcdFx0XHRcdFx0bG9nLmluZm8oJ0J5ZS4nKTtcblx0XHRcdFx0XHRcdHByb2Nlc3MuZXhpdCgwKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRwa01nci5ldmVudEJ1cy5vbignd2VicGFja0RvbmUnLCAoYnVpbGRFdmVudDogQnVpbGRFdmVudCkgPT4ge1xuXHRcdFx0XHRvYnMubmV4dChidWlsZEV2ZW50KTtcblx0XHRcdH0pO1xuXHRcdFx0c2h1dGRvd25hYmxlID0gcGtNZ3IucnVuU2VydmVyKHBhcmFtLmFyZ3YpXG5cdFx0XHQudGhlbigoc2h1dGRvd25hYmxlOiBhbnkpID0+IHtcblx0XHRcdFx0aWYgKF8uZ2V0KG9wdGlvbnMsICdkcmNwQXJncy5ub1dlYnBhY2snKSkge1xuXHRcdFx0XHRcdG9icy5uZXh0KHtzdWNjZXNzOiB0cnVlfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHNodXRkb3duYWJsZTtcblx0XHRcdH0pXG5cdFx0XHQuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcignbmcuY29tbWFuZCAtICBGYWlsZWQgdG8gc3RhcnQgc2VydmVyOicsIGVycik7XG5cdFx0XHRcdC8vIHByb2Nlc3MuZXhpdCgxKTsgLy8gTG9nNGpzIFwibG9nNGpzUmVsb2FkU2Vjb25kc1wiIHdpbGwgaGFuZyBwcm9jZXNzIGV2ZW50IGxvb3AsIHNvIHdlIGhhdmUgdG8gZXhwbGljaXRseSBxdWl0LlxuXHRcdFx0XHRvYnMuZXJyb3IoZXJyKTtcblx0XHRcdH0pO1xuXHRcdH0pXG5cdFx0LmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCduZy5jb21tYW5kIC0gIEZhaWxlZCB0byBzdGFydCBzZXJ2ZXI6JywgZXJyKTtcblx0XHRcdG9icy5lcnJvcihlcnIpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBJbnZva2UgdGhpcyBmdW5jdGlvbiBmcm9tIGJyb3dzZXIgYnVpbGRlclxuICogQHBhcmFtIHByb2plY3RSb290IFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICogQHBhcmFtIGJ1aWxkV2VicGFja0NvbmZpZyBcbiAqIEBwYXJhbSB2ZnNIb3N0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZShwcm9qZWN0Um9vdDogc3RyaW5nLFxuXHRidWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxCcm93c2VyQnVpbGRlclNjaGVtYSB8IEJ1aWxkV2VicGFja1NlcnZlclNjaGVtYT4sXG5cdGJ1aWxkV2VicGFja0NvbmZpZzogYnVpbGRXZWJwYWNrQ29uZmlnRnVuYywgaXNTU1IgPSBmYWxzZSkge1xuXHRyZXR1cm4gbmV3IFJ4Lk9ic2VydmFibGUoKG9icykgPT4ge1xuXHRcdGNvbXBpbGVBc3luYyhwcm9qZWN0Um9vdCwgYnVpbGRlckNvbmZpZywgYnVpbGRXZWJwYWNrQ29uZmlnLCBpc1NTUilcblx0XHQudGhlbigod2VicGFja0NvbmZpZzogYW55KSA9PiB7XG5cdFx0XHRvYnMubmV4dCh3ZWJwYWNrQ29uZmlnKTtcblx0XHRcdG9icy5jb21wbGV0ZSgpO1xuXHRcdH0pXG5cdFx0LmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCduZy5jb21tYW5kIC0gQW5ndWxhciBjbGkgZXJyb3InLCBlcnIpO1xuXHRcdFx0b2JzLmVycm9yKGVycik7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb21waWxlQXN5bmMocHJvamVjdFJvb3Q6IHN0cmluZyxcblx0YnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248QnJvd3NlckJ1aWxkZXJTY2hlbWEgfCBCdWlsZFdlYnBhY2tTZXJ2ZXJTY2hlbWE+LFxuXHRidWlsZFdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMsIHNzcjogYm9vbGVhbikge1xuXHRjb25zdCBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcblx0Y29uc3Qgb3B0aW9ucyA9IGJyb3dzZXJPcHRpb25zO1xuXHRjb25zdCBkcmNwQ29uZmlnRmlsZXMgPSBvcHRpb25zLmRyY3BDb25maWcgPyBvcHRpb25zLmRyY3BDb25maWcuc3BsaXQoL1xccypbLDs6XVxccyovKSA6IFtdO1xuXHRjb25zdCBjb25maWcgPSBhd2FpdCBpbml0RHJjcChvcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnRmlsZXMpO1xuXHRhd2FpdCBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zLFxuXHRcdGJ1aWxkZXJDb25maWcgYXMgQnVpbGRlckNvbmZpZ3VyYXRpb248QW5ndWxhckJ1aWxkZXJPcHRpb25zPik7XG5cdGNvbnN0IHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0gPSB7XG5cdFx0c3NyLFxuXHRcdGJyb3dzZXJPcHRpb25zOiBvcHRpb25zLFxuXHRcdHdlYnBhY2tDb25maWc6IGJ1aWxkV2VicGFja0NvbmZpZyhicm93c2VyT3B0aW9ucyksXG5cdFx0cHJvamVjdFJvb3QsXG5cdFx0YXJndjoge1xuXHRcdFx0Li4ub3B0aW9ucy5kcmNwQXJnc1xuXHRcdH1cblx0fTtcblx0Y29uZmlnLnNldCgnX2FuZ3VsYXJDbGknLCBwYXJhbSk7XG5cdGF3YWl0IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVJ1bm5lcicpLnJ1bkJ1aWxkZXIocGFyYW0uYXJndik7XG5cdHJldHVybiBwYXJhbS53ZWJwYWNrQ29uZmlnO1xufVxuIl19
