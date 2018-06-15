"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
require("./node-inject");
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
// import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
// import * as webpack from 'webpack';
const webpack = require('webpack');
// import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
// import {
// 	getAotConfig,
// 	getBrowserConfig,
// 	getCommonConfig,
// 	getNonAotConfig,
// 	getStylesConfig
// } from '../angular-cli-files/models/webpack-configs';
const utils_1 = require("@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/utils");
// import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
// import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
const service_worker_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/service-worker");
const stats_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/stats");
const utils_2 = require("@angular-devkit/build-angular/src/utils");
// const webpackMerge = require('webpack-merge');
const build_angular_1 = require("@angular-devkit/build-angular");
const drcpCommon = require("./common");
const read_hook_vfshost_1 = require("../utils/read-hook-vfshost");
class BrowserBuilder extends build_angular_1.BrowserBuilder {
    // constructor(public context: BuilderContext) { }
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const host = new read_hook_vfshost_1.default(this.context.host);
        // let drcpConfig = drcpCommon.initDrcp(options.drcpArgs);
        return rxjs_1.of(null).pipe(operators_1.concatMap(() => options.deleteOutputPath
            ? this._deleteOutputDir0(root, core_1.normalize(options.outputPath), this.context.host)
            : rxjs_1.of(null)), operators_1.concatMap(() => utils_2.addFileReplacements(root, host, options.fileReplacements)), operators_1.concatMap(() => utils_2.normalizeAssetPatterns(options.assets, host, root, projectRoot, builderConfig.sourceRoot)), 
        // Replace the assets in options with the normalized version.
        operators_1.tap((assetPatternObjects => options.assets = assetPatternObjects)), operators_1.concatMap(() => {
            // Ensure Build Optimizer is only used with AOT.
            if (options.buildOptimizer && !options.aot) {
                throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
            }
            return drcpCommon.compile(builderConfig.root, options, () => {
                return this.buildWebpackConfig(root, projectRoot, host, options);
            }, host);
        }), operators_1.concatMap((webpackConfig) => new rxjs_1.Observable(obs => {
            const webpackCompiler = webpack(webpackConfig);
            const statsConfig = utils_1.getWebpackStatsConfig(options.verbose);
            const callback = (err, stats) => {
                if (err) {
                    return obs.error(err);
                }
                const json = stats.toJson(statsConfig);
                if (options.verbose) {
                    this.context.logger.info(stats.toString(statsConfig));
                }
                else {
                    this.context.logger.info(stats_1.statsToString(json, statsConfig));
                }
                if (stats.hasWarnings()) {
                    this.context.logger.warn(stats_1.statsWarningsToString(json, statsConfig));
                }
                if (stats.hasErrors()) {
                    this.context.logger.error(stats_1.statsErrorsToString(json, statsConfig));
                }
                if (options.watch) {
                    obs.next({ success: !stats.hasErrors() });
                    // Never complete on watch mode.
                    return;
                }
                else {
                    if (builderConfig.options.serviceWorker) {
                        service_worker_1.augmentAppWithServiceWorker(this.context.host, root, projectRoot, core_1.resolve(root, core_1.normalize(options.outputPath)), options.baseHref || '/', options.ngswConfigPath).then(() => {
                            obs.next({ success: !stats.hasErrors() });
                            obs.complete();
                        }, (err) => {
                            // We error out here because we're not in watch mode anyway (see above).
                            obs.error(err);
                        });
                    }
                    else {
                        obs.next({ success: !stats.hasErrors() });
                        obs.complete();
                    }
                }
            };
            try {
                if (options.watch) {
                    const watching = webpackCompiler.watch({ poll: options.poll }, callback);
                    // Teardown logic. Close the watcher when unsubscribed from.
                    return () => watching.close(() => { });
                }
                else {
                    webpackCompiler.run(callback);
                }
            }
            catch (err) {
                if (err) {
                    this.context.logger.error('\nAn error occured during the build:\n' + ((err && err.stack) || err));
                }
                throw err;
            }
        })));
    }
    _deleteOutputDir0(root, outputPath, host) {
        const resolvedOutputPath = core_1.resolve(root, outputPath);
        if (resolvedOutputPath === root) {
            throw new Error('Output path MUST not be project root directory!');
        }
        return host.exists(resolvedOutputPath).pipe(operators_1.concatMap(exists => exists
            // TODO: remove this concat once host ops emit an event.
            ? rxjs_1.concat(host.delete(resolvedOutputPath), rxjs_1.of(null)).pipe(operators_1.last())
            // ? of(null)
            : rxjs_1.of(null)));
    }
}
exports.BrowserBuilder = BrowserBuilder;
exports.default = BrowserBuilder;

//# sourceMappingURL=browser-builder.js.map
