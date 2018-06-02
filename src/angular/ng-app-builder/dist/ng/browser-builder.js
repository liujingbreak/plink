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
// import * as log4js from 'log4js';
// const log = log4js.getLogger('@dr/ng-app-builder.browser-builder');
// TODO: figure out a better way to normalize assets, extra entry points, file replacements,
// and whatever else needs to be normalized, while keeping type safety.
// Right now this normalization has to be done in all other builders that make use of the
// BrowserBuildSchema and BrowserBuilder.buildWebpackConfig.
// It would really help if it happens during architect.validateBuilderOptions, or similar.
// export interface NormalizedBrowserBuilderSchema extends BrowserBuilderSchema {
// 	assets: AssetPatternObject[];
// 	fileReplacements: CurrentFileReplacement[];
// }
class BrowserBuilder extends build_angular_1.BrowserBuilder {
    // constructor(public context: BuilderContext) { }
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const host = new core_1.virtualFs.AliasHost(this.context.host);
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
            });
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
    // buildWebpackConfig(
    // 	root: Path,
    // 	projectRoot: Path,
    // 	host: virtualFs.Host<fs.Stats>,
    // 	options: NormalizedBrowserBuilderSchema
    // ) {
    // 	let wco: WebpackConfigOptions<NormalizedBrowserBuilderSchema>;
    // 	const tsConfigPath = getSystemPath(normalize(resolve(root, normalize(options.tsConfig))));
    // 	const tsConfig = readTsconfig(tsConfigPath);
    // 	const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;
    // 	const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
    // 		&& tsConfig.options.target !== projectTs.ScriptTarget.ES5;
    // 	wco = {
    // 		root: getSystemPath(root),
    // 		projectRoot: getSystemPath(projectRoot),
    // 		buildOptions: options,
    // 		tsConfig,
    // 		tsConfigPath,
    // 		supportES2015
    // 	};
    // 	const webpackConfigs: Array<{}> = [
    // 		getCommonConfig(wco),
    // 		getBrowserConfig(wco),
    // 		getStylesConfig(wco)
    // 	];
    // 	if (wco.buildOptions.main || wco.buildOptions.polyfills) {
    // 		const typescriptConfigPartial = wco.buildOptions.aot
    // 			? getAotConfig(wco, host)
    // 			: getNonAotConfig(wco, host);
    // 		webpackConfigs.push(typescriptConfigPartial);
    // 	}
    // 	return webpackMerge(webpackConfigs);
    // }
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
