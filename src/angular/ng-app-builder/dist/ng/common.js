"use strict";
/* tslint:disable no-console */
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
exports.initDrcp = initDrcp;
function startDrcpServer(builderConfig, browserOptions, buildWebpackConfig) {
    let argv = {};
    let options = builderConfig.options;
    let config = initDrcp(options.drcpArgs);
    return Rx.Observable.create((obs) => {
        let param = {
            builderConfig,
            browserOptions,
            buildWebpackConfig,
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
            pkMgr.runServer(argv)
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
const chunk_info_1 = require("../plugins/chunk-info");
function changeWebpackConfig(options, webpackConfig) {
    const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
    if (options.drcpArgs.report || (options.drcpArgs.openReport)) {
        webpackConfig.plugins.unshift(new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-report.html',
            openAnalyzer: options.drcpArgs.openReport
        }));
        webpackConfig.plugins.push(new chunk_info_1.default());
    }
    return webpackConfig;
}
exports.changeWebpackConfig = changeWebpackConfig;

//# sourceMappingURL=common.js.map
