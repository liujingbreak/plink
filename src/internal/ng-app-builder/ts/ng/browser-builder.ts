/* tslint:disable max-line-length */
import './node-inject';

import {
	BuildEvent,
	BuilderConfiguration
  } from '@angular-devkit/architect';
  import { WebpackBuilder } from '@angular-devkit/build-webpack';
  import { Path, normalize, resolve, virtualFs } from '@angular-devkit/core';
  import * as fs from 'fs';
  import { Observable, concat, of } from 'rxjs';
  import { concatMap, last, tap } from 'rxjs/operators';
  import { augmentAppWithServiceWorker } from '@angular-devkit/build-angular/src/angular-cli-files/utilities/service-worker';
  import { normalizeAssetPatterns, normalizeFileReplacements } from '@angular-devkit/build-angular/src/utils';
  import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';

import {BrowserBuilder as GoogleBrowserBuilder, NormalizedBrowserBuilderSchema, getBrowserLoggingCb} from '@angular-devkit/build-angular';
import * as drcpCommon from './common';

export default class BrowserBuilder extends GoogleBrowserBuilder {
	run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent> {
		const options = builderConfig.options;
		const root = this.context.workspace.root;
		const projectRoot = resolve(root, builderConfig.root);
		const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
		const webpackBuilder = new WebpackBuilder({ ...this.context, host });

		return of(null).pipe(
		  concatMap(() => options.deleteOutputPath
			? this._deleteOutputDir0(root, normalize(options.outputPath), this.context.host)
			: of(null)),
		  concatMap(() => normalizeFileReplacements(options.fileReplacements, host, root)),
		  tap(fileReplacements => options.fileReplacements = fileReplacements),
		  concatMap(() => normalizeAssetPatterns(
			options.assets, host, root, projectRoot, builderConfig.sourceRoot)),
		  // Replace the assets in options with the normalized version.
		  tap((assetPatternObjects => options.assets = assetPatternObjects)),
		  concatMap(() => {
			  return drcpCommon.compile(builderConfig.root, options as drcpCommon.AngularBuilderOptions,
				() => {
					return this.buildWebpackConfig(root, projectRoot, host,
					options as NormalizedBrowserBuilderSchema);
				});
		  }),
		  concatMap((webpackConfig) => {
				return webpackBuilder.runWebpack(webpackConfig, getBrowserLoggingCb(options.verbose));
		  }),
		  concatMap(buildEvent => {
			if (buildEvent.success && !options.watch && options.serviceWorker) {
			  return new Observable(obs => {
				augmentAppWithServiceWorker(
				  this.context.host,
				  root,
				  projectRoot,
				  resolve(root, normalize(options.outputPath)),
				  options.baseHref || '/',
				  options.ngswConfigPath
				).then(
				  () => {
					obs.next({ success: true });
					obs.complete();
				  },
				  (err: Error) => {
					obs.error(err);
				  }
				);
			  });
			} else {
			  return of(buildEvent);
			}
		  })
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
