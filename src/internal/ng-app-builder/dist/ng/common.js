"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Rx = require("rxjs");
const _ = require("lodash");
const Path = require("path");
const fs = require("fs");
const vm = require("vm");
const ts_compiler_1 = require("../utils/ts-compiler");
const change_cli_options_1 = require("./change-cli-options");
function initDrcp(drcpArgs, drcpConfigFiles) {
    var config = require('dr-comp-package/wfh/lib/config');
    if (drcpArgs.c == null)
        drcpArgs.c = [];
    drcpArgs.c.push(...drcpConfigFiles.filter(file => !file.endsWith('.js') && !file.endsWith('.ts')));
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
    const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
    const configHandlers = initConfigHandlers(drcpConfigFiles);
    const config = initDrcp(options.drcpArgs, drcpConfigFiles);
    return Rx.Observable.create((obs) => {
        change_cli_options_1.default(config, browserOptions, configHandlers, builderConfig)
            .then(() => {
            const param = {
                ssr: false,
                builderConfig,
                browserOptions,
                webpackConfig: buildWebpackConfig(browserOptions),
                projectRoot,
                argv: Object.assign({ poll: options.poll, hmr: options.hmr }, options.drcpArgs),
                configHandlers
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
                console.error('Failed to start server:', err);
                // process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
                obs.error(err);
            });
        })
            .catch((err) => {
            console.error('Failed to start server:', err);
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
        try {
            compileAsync(projectRoot, builderConfig, buildWebpackConfig, isSSR).then((webpackConfig) => {
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
function compileAsync(projectRoot, builderConfig, buildWebpackConfig, ssr) {
    return __awaiter(this, void 0, void 0, function* () {
        const browserOptions = builderConfig.options;
        const options = browserOptions;
        const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
        const configHandlers = initConfigHandlers(drcpConfigFiles);
        const config = initDrcp(options.drcpArgs, drcpConfigFiles);
        yield change_cli_options_1.default(config, browserOptions, configHandlers, builderConfig);
        const param = {
            ssr,
            browserOptions: options,
            webpackConfig: buildWebpackConfig(browserOptions),
            projectRoot,
            argv: Object.assign({}, options.drcpArgs),
            configHandlers
        };
        config.set('_angularCli', param);
        yield require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv);
        return param.webpackConfig;
    });
}
function initConfigHandlers(files) {
    // const files = browserOptions.drcpConfig ? browserOptions.drcpConfig.split(/\s*[,;:]\s*/) : [];
    const exporteds = [];
    const compilerOpt = ts_compiler_1.readTsConfig(require.resolve('dr-comp-package/wfh/tsconfig.json'));
    files.forEach(file => {
        if (file.endsWith('.ts')) {
            console.log('Compile', file);
            const jscode = ts_compiler_1.transpileSingleTs(fs.readFileSync(Path.resolve(file), 'utf8'), compilerOpt);
            console.log(jscode);
            const mod = { exports: {} };
            const context = vm.createContext({ module: mod, exports: mod.exports, console, process, require });
            try {
                vm.runInContext(jscode, context, { filename: file });
            }
            catch (ex) {
                console.error(ex);
                throw ex;
            }
            exporteds.push({ file, handler: mod.exports.default });
        }
        else if (file.endsWith('.js')) {
            const exp = require(Path.resolve(file));
            exporteds.push({ file, handler: exp.default ? exp.default : exp });
        }
    });
    return exporteds;
}

//# sourceMappingURL=common.js.map
