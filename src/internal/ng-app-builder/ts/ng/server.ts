/* tslint:disable max-line-length */
import './node-inject';

import {
  BuildEvent,
  BuilderConfiguration
} from '@angular-devkit/architect';
import { WebpackBuilder } from '@angular-devkit/build-webpack';
import { normalize, resolve, virtualFs } from '@angular-devkit/core';
import { Stats } from 'fs';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import { getBrowserLoggingCb } from '@angular-devkit/build-angular/src/browser';
import { normalizeFileReplacements } from '@angular-devkit/build-angular/src/utils';
import { BuildWebpackServerSchema } from '@angular-devkit/build-angular/src/server/schema';

import {ServerBuilder as GoogleServerBuilder} from '@angular-devkit/build-angular';
import * as drcpCommon from './common';

export default class ServerBuilder extends GoogleServerBuilder {
	run(builderConfig: BuilderConfiguration<BuildWebpackServerSchema>): Observable<BuildEvent> {
		const options = builderConfig.options;
		const root = this.context.workspace.root;
		const projectRoot = resolve(root, builderConfig.root);
		const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<Stats>);
		const webpackBuilder = new WebpackBuilder({ ...this.context, host });

		// TODO: verify using of(null) to kickstart things is a pattern.
		return of(null).pipe(
		  concatMap(() => options.deleteOutputPath
			? (this as any)._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
			: of(null)),
			concatMap(() => normalizeFileReplacements(options.fileReplacements, host, root)),
			tap(fileReplacements => options.fileReplacements = fileReplacements),
			concatMap(() => {
				return drcpCommon.compile(builderConfig.root, builderConfig, () => {
					return this.buildWebpackConfig(root, projectRoot, host, options);
				}, true);
			}),
		  concatMap( webpackConfig => {
			// const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);

			return webpackBuilder.runWebpack(webpackConfig, getBrowserLoggingCb(options.verbose));
		  })
		);
	}
}
