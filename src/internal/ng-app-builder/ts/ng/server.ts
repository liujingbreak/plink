/* tslint:disable max-line-length */
import './node-inject';

import {ServerBuilder as GoogleServerBuilder} from '@angular-devkit/build-angular';
import {BuildWebpackServerSchema} from '@angular-devkit/build-angular/src/server/schema';
import {
	BuildEvent,
	BuilderConfiguration
} from '@angular-devkit/architect';
import { Path, normalize, resolve, virtualFs } from '@angular-devkit/core';
import { Stats } from 'fs';
import { Observable, concat, of } from 'rxjs';
import { concatMap, last } from 'rxjs/operators';
import * as webpack from 'webpack';
import { addFileReplacements } from '@angular-devkit/build-angular/src/utils';
import { getWebpackStatsConfig } from '@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/utils';
import {
statsErrorsToString,
statsToString,
statsWarningsToString
} from '@angular-devkit/build-angular/src/angular-cli-files/utilities/stats';

import * as drcpCommon from './common';
import ReadHookHost from '../utils/read-hook-vfshost';

export class ServerBuilder extends GoogleServerBuilder {

	// constructor(public context: BuilderContext) { }

	run(builderConfig: BuilderConfiguration<BuildWebpackServerSchema>): Observable<BuildEvent> {
		const options = builderConfig.options as drcpCommon.AngularBuilderOptions;
		const root = this.context.workspace.root;
		const projectRoot = resolve(root, builderConfig.root);
		const host = new ReadHookHost(this.context.host as virtualFs.Host<Stats>);

		// TODO: verify using of(null) to kickstart things is a pattern.
		return of(null).pipe(
		  concatMap(() => options.deleteOutputPath
			? this._deleteOutputDir0(root, normalize(options.outputPath), this.context.host)
			: of(null)),
		  concatMap(() => addFileReplacements(root, host, options.fileReplacements)),
		// TODO:
		  concatMap(() => {
			return drcpCommon.compile(builderConfig.root, options, () => {
				return this.buildWebpackConfig(root, projectRoot, host,
					options);
			}, host, true);
		  }),
		  concatMap((webpackConfig) => new Observable(obs => {
			// Ensure Build Optimizer is only used with AOT.
			// const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);
			const webpackCompiler = webpack(webpackConfig);
			const statsConfig = getWebpackStatsConfig(options.verbose);

			const callback: webpack.compiler.CompilerCallback = (err, stats) => {
				if (err) {
				  return obs.error(err);
				}

				const json = stats.toJson(statsConfig);
				if (options.verbose) {
				  this.context.logger.info(stats.toString(statsConfig));
				} else {
				  this.context.logger.info(statsToString(json, statsConfig));
				}

				if (stats.hasWarnings()) {
				  this.context.logger.warn(statsWarningsToString(json, statsConfig));
				}
				if (stats.hasErrors()) {
				  this.context.logger.error(statsErrorsToString(json, statsConfig));
				}

				obs.next({ success: !stats.hasErrors() });
				obs.complete();
			  };

			  try {
				webpackCompiler.run(callback);
			  } catch (err) {
				if (err) {
				  this.context.logger.error(
					'\nAn error occured during the build:\n' + ((err && err.stack) || err));
				}
				throw err;
			  }

		  }))
		);
	  }

	private _deleteOutputDir0(root: Path, outputPath: Path, host: virtualFs.Host) {
		const resolvedOutputPath = resolve(root, outputPath);
		if (resolvedOutputPath === root) {
		  throw new Error('Output path MUST not be project root directory!');
		}

		return host.exists(resolvedOutputPath).pipe(
		  concatMap(exists => exists
			// TODO: remove this concat once host ops emit an event.
			? concat(host.delete(resolvedOutputPath), of(null)).pipe(last())
			// ? of(null)
			: of(null))
		);
	  }
  }

  export default ServerBuilder;
