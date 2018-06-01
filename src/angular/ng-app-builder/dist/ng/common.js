"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx = require("rxjs");
function initDrcp(drcpArgs) {
    var config = require('dr-comp-package/wfh/lib/config');
    if (Array.isArray(drcpArgs.c)) {
        config.load(drcpArgs.c);
    }
    require('dr-comp-package/wfh/lib/logConfig')(config().rootPath, config().log4jsReloadSeconds);
    return config;
}
function startDrcpServer(projectRoot, builderConfig, browserOptions, buildWebpackConfig) {
    // let argv: any = {};
    let options = builderConfig.options;
    let config = initDrcp(options.drcpArgs);
    return Rx.Observable.create((obs) => {
        let param = {
            builderConfig,
            browserOptions: browserOptions,
            webpackConfig: buildWebpackConfig(browserOptions),
            projectRoot,
            argv: Object.assign({ poll: options.poll, hmr: options.hmr }, options.drcpArgs)
        };
        config.set('_angularCli', param);
        config.set('port', options.port);
        var log = require('log4js').getLogger('ng-app-builder.ng.dev-server');
        var pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
        try {
            process.on('uncaughtException', function (err) {
                log.error('Uncaught exception: ', err, err.stack);
                // throw err; // let PM2 handle exception
                obs.error(err);
            });
            process.on('SIGINT', function () {
                log.info('Recieve SIGINT, bye.');
                obs.next({ success: true });
                obs.complete();
                setTimeout(() => process.exit(0), 500);
            });
            process.on('message', function (msg) {
                if (msg === 'shutdown') {
                    log.info('Recieve shutdown message from PM2, bye.');
                    process.exit(0);
                    obs.next({ success: true });
                    obs.complete();
                }
            });
            process._config = config;
            pkMgr.runServer(param.argv)
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
function compile(projectRoot, browserOptions, buildWebpackConfig) {
    return new Rx.Observable((obs) => {
        compileAsync(projectRoot, browserOptions, buildWebpackConfig).then((webpackConfig) => {
            obs.next(webpackConfig);
            obs.complete();
        });
    });
}
exports.compile = compile;
function compileAsync(projectRoot, browserOptions, buildWebpackConfig) {
    let options = browserOptions;
    let config = initDrcp(options.drcpArgs);
    let param = {
        browserOptions: options,
        webpackConfig: buildWebpackConfig(browserOptions),
        projectRoot,
        argv: Object.assign({ poll: options.poll }, options.drcpArgs)
    };
    config.set('_angularCli', param);
    return require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv)
        .then(() => param.webpackConfig);
}

//# sourceMappingURL=common.js.map
