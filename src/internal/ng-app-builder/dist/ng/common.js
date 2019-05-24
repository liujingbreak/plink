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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBV0EseUdBQXFHO0FBRXJHLGlEQUEyQjtBQUMzQixrREFBNEI7QUFDNUIsc0ZBQTJEO0FBTTNELFNBQWUsUUFBUSxDQUFDLFFBQWEsRUFBRSxlQUF5Qjs7UUFDL0QsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFFdkQsSUFBSSxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUk7WUFDckIsUUFBUSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakIsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUNwQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN2RCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FBQTtBQXlCRDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsZUFBZSxDQUFDLFdBQW1CLEVBQUUsYUFBNEQsRUFDaEgsY0FBcUMsRUFDckMsa0JBQTBDO0lBQzFDLHNCQUFzQjtJQUN0QixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBeUQsQ0FBQztJQUN4RixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzFGLElBQUksTUFBa0IsQ0FBQztJQUV2QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBNEIsRUFBRSxFQUFFO1FBQzVELE1BQU0sV0FBVyxHQUFHLEdBQThCLEVBQUU7WUFDbkQsTUFBTSxHQUFHLE1BQU0sUUFBUSxD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QyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMxRixNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sNEJBQXVCLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFvQjtZQUM5QixHQUFHO1lBQ0gsY0FBYyxFQUFFLE9BQU87WUFDdkIsYUFBYSxFQUFFLGtCQUFrQixDQUFDLGNBQWMsQ0FBQztZQUNqRCxXQUFXO1lBQ1gsSUFBSSxvQkFDQSxPQUFPLENBQUMsUUFBUSxDQUNuQjtTQUNELENBQUM7UUFDRixNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLE9BQU8sQ0FBQyxrREFBa0QsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekYsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDO0lBQzVCLENBQUM7Q0FBQSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9jb21tb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQge1xuXHRCdWlsZEV2ZW50LFxuXHQvLyBCdWlsZGVyLFxuXHRCdWlsZGVyQ29uZmlndXJhdGlvblxuXHQvLyBCdWlsZGVyQ29udGV4dCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG4vLyBpbXBvcnQge05vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyJztcbmltcG9ydCB7IE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQge05vcm1hbGl6ZWRTZXJ2ZXJCdWlsZGVyU2VydmVyU2NoZW1hfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvc2VydmVyL3NjaGVtYSc7XG5pbXBvcnQge05vcm1hbGl6ZWRLYXJtYUJ1aWxkZXJTY2hlbWF9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9rYXJtYS9zY2hlbWEnO1xuaW1wb3J0IHsgY2hlY2tQb3J0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9jaGVjay1wb3J0JztcbmltcG9ydCB7RGV2U2VydmVyQnVpbGRlck9wdGlvbnN9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCAqIGFzIFJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zIGZyb20gJy4vY2hhbmdlLWNsaS1vcHRpb25zJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFBhY2thZ2VNZ3IgZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1ncic7XG5cbmV4cG9ydCB0eXBlIERyY3BDb25maWcgPSB0eXBlb2YgYXBpLmNvbmZpZztcblxuYXN5bmMgZnVuY3Rpb24gaW5pdERyY3AoZHJjcEFyZ3M6IGFueSwgZHJjcENvbmZpZ0ZpbGVzOiBzdHJpbmdbXSk6IFByb21pc2U8RHJjcENvbmZpZz4ge1xuXHR2YXIgY29uZmlnID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvY29uZmlnJyk7XG5cblx0aWYgKGRyY3BBcmdzLmMgPT0gbnVsbClcblx0XHRkcmNwQXJncy5jID0gW107XG5cdGRyY3BBcmdzLmMucHVzaCguLi5kcmNwQ29uZmlnRmlsZXMpO1xuXHRhd2FpdCBjb25maWcuaW5pdChkcmNwQXJncyk7XG5cdHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2xvZ0NvbmZpZycpKGNvbmZpZygpKTtcblx0cmV0dXJuIGNvbmZpZztcbn1cblxuZXhwb3J0IHR5cGUgYnVpbGRXZWJwYWNrQ29uZmlnRnVuYyA9IChicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zKSA9PiBhbnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNsaVBhcmFtIHtcblx0YnVpbGRlckNvbmZpZz86IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPjtcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcblx0c3NyOiBib29sZWFuOyAvLyBJcyBzZXJ2ZXIgc2lkZSAvIHByZXJlbmRlclxuXHR3ZWJwYWNrQ29uZmlnOiBhbnk7XG5cdHByb2plY3RSb290OiBzdHJpbmc7XG5cdGFyZ3Y6IGFueTtcbn1cblxuZXhwb3J0IHR5cGUgTm9ybWFsaXplZEFuZ3VsYXJCdWlsZFNjaGVtYSA9IE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSB8IE5vcm1hbGl6ZWRTZXJ2ZXJCdWlsZGVyU2VydmVyU2NoZW1hIHxcbk5vcm1hbGl6ZWRLYXJtYUJ1aWxkZXJTY2hlbWE7XG5cbmV4cG9ydCB0eXBlIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyA9XG5cdE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSAmIE5vcm1hbGl6ZWRTZXJ2ZXJCdWlsZGVyU2VydmVyU2NoZW1hICYgTm9ybWFsaXplZEthcm1hQnVpbGRlclNjaGVtYSAmXG5cdERyY3BCdWlsZGVyT3B0aW9ucztcblxuZXhwb3J0IGludGVyZmFjZSBEcmNwQnVpbGRlck9wdGlvbnMge1xuXHRkcmNwQXJnczogYW55O1xuXHRkcmNwQ29uZmlnOiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW52b2tlIHRoaXMgZnVuY3Rpb24gZnJvbSBkZXYgc2VydmVyIGJ1aWxkZXJcbiAqIEBwYXJhbSBwcm9qZWN0Um9vdCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICogQHBhcmFtIGJ1aWxkV2VicGFja0NvbmZpZyBcbiAqIEBwYXJhbSB2ZnNIb3N0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhcnREcmNwU2VydmVyKHByb2plY3RSb290OiBzdHJpbmcsIGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPixcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcblx0YnVpbGRXZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWdGdW5jKTogUnguT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG5cdC8vIGxldCBhcmd2OiBhbnkgPSB7fTtcblx0Y29uc3Qgb3B0aW9ucyA9IGJ1aWxkZXJDb25maWcub3B0aW9ucyBhcyAoRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgJiBEcmNwQnVpbGRlck9wdGlvbnMpO1xuXHRjb25zdCBkcmNwQ29uZmlnRmlsZXMgPSBvcHRpb25zLmRyY3BDb25maWcgPyBvcHRpb25zLmRyY3BDb25maWcuc3BsaXQoL1xccypbLDs6XVxccyovKSA6IFtdO1xuXHRsZXQgY29uZmlnOiBEcmNwQ29uZmlnO1xuXG5cdHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZSgob2JzOiBSeC5PYnNlcnZlcjxCdWlsZEV2ZW50PikgPT4ge1xuXHRcdGNvbnN0IHN0YXJ0U2VydmVyID0gYXN5bmMgKCk6IFByb21pc2U8KCkgPT4gdm9pZD4gPT4ge1xuXHRcdFx0Y29uZmlnID0gYXdhaXQgaW5pdERyY3Aob3B0aW9ucy5kcmNwQXJncywgZHJjcENvbmZpZ0ZpbGVzKTtcblx0XHRcdGF3YWl0IGNoZWNrUG9ydChjb25maWcoKS5wb3J0LCBidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG9zdCkudG9Qcm9taXNlKCk7XG5cdFx0XHRhd2FpdCBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zLFxuXHRcdFx0XHRcdGJ1aWxkZXJDb25maWcpO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgcGFyYW06IEFuZ3VsYXJDbGlQYXJhbSA9IHtcblx0XHRcdFx0XHRzc3I6IGZhbHNlLFxuXHRcdFx0XHRcdGJ1aWxkZXJDb25maWcsXG5cdFx0XHRcdFx0YnJvd3Nlck9wdGlvbnMsXG5cdFx0XHRcdFx0d2VicGFja0NvbmZpZzogYnVpbGRXZWJwYWNrQ29uZmlnKGJyb3dzZXJPcHRpb25zKSxcblx0XHRcdFx0XHRwcm9qZWN0Um9vdCxcblx0XHRcdFx0XHRhcmd2OiB7XG5cdFx0XHRcdFx0XHRwb2xsOiBvcHRpb25zLnBvbGwsXG5cdFx0XHRcdFx0XHRobXI6IG9wdGlvbnMuaG1yLFxuXHRcdFx0XHRcdFx0Li4ub3B0aW9ucy5kcmNwQXJnc1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdFx0aWYgKCFfLmdldChvcHRpb25zLCAnZHJjcEFyZ3Mubm9XZWJwYWNrJykpXG5cdFx0XHRcdFx0Y29uZmlnLnNldCgnX2FuZ3VsYXJDbGknLCBwYXJhbSk7XG5cdFx0XHRcdC8vIGNvbmZpZy5zZXQoJ3BvcnQnLCBvcHRpb25zLnBvcnQpO1xuXHRcdFx0XHRjb25zdCBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcblx0XHRcdFx0Y29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignbmctYXBwLWJ1aWxkZXIubmcuZGV2LXNlcnZlcicpO1xuXHRcdFx0XHRjb25zdCBwa01ncjogdHlwZW9mIFBhY2thZ2VNZ3IgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyJyk7XG5cdFx0XHRcdC8vIGxldCBzaHV0ZG93bmFibGU6IFByb21pc2U8KCkgPT4gdm9pZD47XG5cblx0XHRcdFx0Ly8gcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0Ly8gXHRsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyLCBlcnIuc3RhY2spO1xuXHRcdFx0XHQvLyBcdC8vIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG5cdFx0XHRcdC8vIFx0b2JzLmVycm9yKGVycik7XG5cdFx0XHRcdC8vIH0pO1xuXHRcdFx0XHRwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRsb2cuaW5mbygnUmVjaWV2ZSBTSUdJTlQuJyk7XG5cdFx0XHRcdFx0c3RhcnREb25lLnRoZW4oc2h1dCA9PiBzaHV0KCkpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0bG9nNGpzLnNodXRkb3duKCk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7Y29uc29sZS5sb2coZSk7fVxuXHRcdFx0XHRcdFx0bG9nLmluZm8oJ0J5ZS4nKTtcblx0XHRcdFx0XHRcdHByb2Nlc3MuZXhpdCgwKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcblx0XHRcdFx0XHRpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG5cdFx0XHRcdFx0XHRsb2cuaW5mbygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yJyk7XG5cdFx0XHRcdFx0XHRzdGFydERvbmUudGhlbihzaHV0ID0+IHNodXQoKSlcblx0XHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRsb2c0anMuc2h1dGRvd24oKTtcblx0XHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge2NvbnNvbGUubG9nKGUpO31cblx0XHRcdFx0XHRcdFx0bG9nLmluZm8oJ0J5ZS4nKTtcblx0XHRcdFx0XHRcdFx0cHJvY2Vzcy5leGl0KDApO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cGtNZ3IuZXZlbnRCdXMub24oJ3dlYnBhY2tEb25lJywgKGJ1aWxkRXZlbnQ6IEJ1aWxkRXZlbnQpID0+IHtcblx0XHRcdFx0XHRvYnMubmV4dChidWlsZEV2ZW50KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Y29uc3Qgc2h1dGRvd24gPSBhd2FpdCBwa01nci5ydW5TZXJ2ZXIocGFyYW0uYXJndik7XG5cdFx0XHRcdGlmIChfLmdldChvcHRpb25zLCAnZHJjcEFyZ3Mubm9XZWJwYWNrJykpIHtcblx0XHRcdFx0XHRvYnMubmV4dCh7c3VjY2VzczogdHJ1ZX0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBzaHV0ZG93bjtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKCduZy5jb21tYW5kIC0gIEZhaWxlZCB0byBzdGFydCBzZXJ2ZXI6JywgZXJyKTtcblx0XHRcdFx0b2JzLmVycm9yKGVycik7XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRjb25zdCBzdGFydERvbmUgPSBzdGFydFNlcnZlcigpO1xuXG5cdFx0cmV0dXJuIGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc3Qgc2h1dGRvd24gPSBhd2FpdCBzdGFydERvbmU7XG5cdFx0XHRzaHV0ZG93bigpO1xuXHRcdH07XG5cdH0pO1xufVxuXG5cbi8qKlxuICogSW52b2tlIHRoaXMgZnVuY3Rpb24gZnJvbSBicm93c2VyIGJ1aWxkZXJcbiAqIEBwYXJhbSBwcm9qZWN0Um9vdCBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqIEBwYXJhbSBidWlsZFdlYnBhY2tDb25maWcgXG4gKiBAcGFyYW0gdmZzSG9zdCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUocHJvamVjdFJvb3Q6IHN0cmluZyxcblx0YnVpbGRlckNvbmZpZzogTm9ybWFsaXplZEFuZ3VsYXJCdWlsZFNjaGVtYSxcblx0YnVpbGRXZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWdGdW5jLCBpc1NTUiA9IGZhbHNlKSB7XG5cdHJldHVybiBSeC5mcm9tKGNvbXBpbGVBc3luYyhwcm9qZWN0Um9vdCwgYnVpbGRlckNvbmZpZywgYnVpbGRXZWJwYWNrQ29uZmlnLCBpc1NTUikpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb21waWxlQXN5bmMocHJvamVjdFJvb3Q6IHN0cmluZyxcblx0YnVpbGRlckNvbmZpZzogTm9ybWFsaXplZEFuZ3VsYXJCdWlsZFNjaGVtYSxcblx0YnVpbGRXZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWdGdW5jLCBzc3I6IGJvb2xlYW4pIHtcblx0Y29uc3QgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyA9IGJ1aWxkZXJDb25maWcgYXMgQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuXHRjb25zdCBvcHRpb25zID0gYnJvd3Nlck9wdGlvbnM7XG5cdGNvbnN0IGRyY3BDb25maWdGaWxlcyA9IG9wdGlvbnMuZHJjcENvbmZpZyA/IG9wdGlvbnMuZHJjcENvbmZpZy5zcGxpdCgvXFxzKlssOzpdXFxzKi8pIDogW107XG5cdGNvbnN0IGNvbmZpZyA9IGF3YWl0IGluaXREcmNwKG9wdGlvbnMuZHJjcEFyZ3MsIGRyY3BDb25maWdGaWxlcyk7XG5cdGF3YWl0IGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMpO1xuXHRjb25zdCBwYXJhbTogQW5ndWxhckNsaVBhcmFtID0ge1xuXHRcdHNzcixcblx0XHRicm93c2VyT3B0aW9uczogb3B0aW9ucyxcblx0XHR3ZWJwYWNrQ29uZmlnOiBidWlsZFdlYnBhY2tDb25maWcoYnJvd3Nlck9wdGlvbnMpLFxuXHRcdHByb2plY3RSb290LFxuXHRcdGFyZ3Y6IHtcblx0XHRcdC4uLm9wdGlvbnMuZHJjcEFyZ3Ncblx0XHR9XG5cdH07XG5cdGNvbmZpZy5zZXQoJ19hbmd1bGFyQ2xpJywgcGFyYW0pO1xuXHRhd2FpdCByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VSdW5uZXInKS5ydW5CdWlsZGVyKHBhcmFtLmFyZ3YpO1xuXHRyZXR1cm4gcGFyYW0ud2VicGFja0NvbmZpZztcbn1cbiJdfQ==
