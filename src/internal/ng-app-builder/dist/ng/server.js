"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
require("./node-inject");
const build_angular_1 = require("@angular-devkit/build-angular");
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const webpack = require("webpack");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const utils_2 = require("@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/utils");
const stats_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/stats");
const drcpCommon = require("./common");
const read_hook_vfshost_1 = require("../utils/read-hook-vfshost");
class ServerBuilder extends build_angular_1.ServerBuilder {
    // constructor(public context: BuilderContext) { }
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const host = new read_hook_vfshost_1.default(this.context.host);
        // TODO: verify using of(null) to kickstart things is a pattern.
        return rxjs_1.of(null).pipe(operators_1.concatMap(() => options.deleteOutputPath
            ? this._deleteOutputDir0(root, core_1.normalize(options.outputPath), this.context.host)
            : rxjs_1.of(null)), operators_1.concatMap(() => utils_1.addFileReplacements(root, host, options.fileReplacements)), 
        // TODO:
        operators_1.concatMap(() => {
            return drcpCommon.compile(builderConfig.root, options, () => {
                return this.buildWebpackConfig(root, projectRoot, host, options);
            }, host, true);
        }), operators_1.concatMap((webpackConfig) => new rxjs_1.Observable(obs => {
            // Ensure Build Optimizer is only used with AOT.
            // const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);
            const webpackCompiler = webpack(webpackConfig);
            const statsConfig = utils_2.getWebpackStatsConfig(options.verbose);
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
                obs.next({ success: !stats.hasErrors() });
                obs.complete();
            };
            try {
                webpackCompiler.run(callback);
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
exports.ServerBuilder = ServerBuilder;
exports.default = ServerBuilder;

//# sourceMappingURL=server.js.map
