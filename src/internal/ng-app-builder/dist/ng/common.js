"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx = require("rxjs");
const _ = require("lodash");
const change_cli_options_1 = require("./change-cli-options");
function initDrcp(drcpArgs, drcpConfig) {
    var config = require('dr-comp-package/wfh/lib/config');
    const files = drcpConfig ? drcpConfig.split(/\s*[,;]\s*/) : [];
    if (drcpArgs.c == null)
        drcpArgs.c = [];
    drcpArgs.c.push(...files);
    config.init(drcpArgs);
    require('dr-comp-package/wfh/lib/logConfig')(config());
    return config;
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
    const config = initDrcp(options.drcpArgs, options.drcpConfig);
    change_cli_options_1.default(config, browserOptions, builderConfig);
    return Rx.Observable.create((obs) => {
        const param = {
            ssr: false,
            builderConfig,
            browserOptions: browserOptions,
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
        try {
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
                console.error('Failed to start server:', err);
                // process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
                obs.error(err);
            });
        }
        catch (err) {
            console.error('Failed to start server:', err);
            obs.error(err);
        }
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
function compile(projectRoot, browserOptions, buildWebpackConfig, isSSR = false) {
    return new Rx.Observable((obs) => {
        try {
            compileAsync(projectRoot, browserOptions, buildWebpackConfig, isSSR).then((webpackConfig) => {
                obs.next(webpackConfig);
                obs.complete();
            })
                .catch((err) => obs.error(err));
        }
        catch (err) {
            obs.error(err);
        }
    });
}
exports.compile = compile;
function compileAsync(projectRoot, browserOptions, buildWebpackConfig, ssr) {
    const options = browserOptions;
    const config = initDrcp(options.drcpArgs, options.drcpConfig);
    change_cli_options_1.default(config, browserOptions);
    const param = {
        ssr,
        browserOptions: options,
        webpackConfig: buildWebpackConfig(browserOptions),
        projectRoot,
        argv: Object.assign({}, options.drcpArgs)
    };
    config.set('_angularCli', param);
    return require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv)
        .then(() => param.webpackConfig);
}

//# sourceMappingURL=common.js.map
