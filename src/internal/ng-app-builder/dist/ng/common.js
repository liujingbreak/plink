"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx = require("rxjs");
const _ = require("lodash");
function initDrcp(drcpArgs) {
    var config = require('dr-comp-package/wfh/lib/config');
    if (Array.isArray(drcpArgs.c) || drcpArgs.prop) {
        config.load(drcpArgs.c, drcpArgs);
    }
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
function startDrcpServer(projectRoot, builderConfig, browserOptions, buildWebpackConfig, vfsHost) {
    // let argv: any = {};
    const options = builderConfig.options;
    const config = initDrcp(options.drcpArgs);
    return Rx.Observable.create((obs) => {
        const param = {
            builderConfig,
            browserOptions: browserOptions,
            webpackConfig: buildWebpackConfig(browserOptions),
            projectRoot,
            vfsHost,
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
            process.on('uncaughtException', function (err) {
                log.error('Uncaught exception: ', err, err.stack);
                // throw err; // let PM2 handle exception
                obs.error(err);
            });
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
            process._config = config;
            pkMgr.eventBus.on('webpackDone', (buildEvent) => {
                obs.next(buildEvent);
                // obs.complete();
            });
            shutdownable = pkMgr.runServer(param.argv)
                .then((shutdownable) => {
                if (_.get(options, 'drcpArgs.noWebpack')) {
                    obs.next({ success: true });
                    // obs.complete();
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
function compile(projectRoot, browserOptions, buildWebpackConfig, vfsHost) {
    return new Rx.Observable((obs) => {
        compileAsync(projectRoot, browserOptions, buildWebpackConfig, vfsHost).then((webpackConfig) => {
            obs.next(webpackConfig);
            obs.complete();
        });
    });
}
exports.compile = compile;
function compileAsync(projectRoot, browserOptions, buildWebpackConfig, vfsHost) {
    const options = browserOptions;
    const config = initDrcp(options.drcpArgs);
    const param = {
        browserOptions: options,
        webpackConfig: buildWebpackConfig(browserOptions),
        projectRoot,
        vfsHost,
        argv: Object.assign({}, options.drcpArgs)
    };
    config.set('_angularCli', param);
    return require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv)
        .then(() => param.webpackConfig);
}

//# sourceMappingURL=common.js.map
