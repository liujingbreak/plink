
// tslint:disable:max-line-length
import './node-inject';

import {
  BuildEvent,
  BuilderConfiguration
} from '@angular-devkit/architect';
import { resolve, tags, virtualFs } from '@angular-devkit/core';
import { Stats} from 'fs';
import { Observable, of } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import * as url from 'url';
// import { checkPort } from '@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port';
// import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { normalizeBuilderSchema } from '@angular-devkit/build-angular/src/utils';
const opn = require('opn');

 // DRCP
import {DevServerBuilder, DevServerBuilderOptions} from '@angular-devkit/build-angular';
import * as drcpCommon from './common';

// export type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;

export default class DrcpDevServer extends DevServerBuilder {
  run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<Stats>);
    // const webpackDevServerBuilder = new WebpackDevServerBuilder({ ...this.context, host });
    let browserOptions: NormalizedBrowserBuilderSchema;
    let first = true;
    let opnAddress: string;

    // return checkPort(options.port, options.host).pipe(
    return of(options.port).pipe(
      tap((port) => options.port = port),
      concatMap(() => (this as any)._getBrowserOptions(options)),
      tap(opts => browserOptions = normalizeBuilderSchema(
        host,
        root,
        opts as any
      )),
      concatMap(() => {
        return drcpCommon.startDrcpServer(builderConfig.root, builderConfig,
          browserOptions as drcpCommon.AngularBuilderOptions, ()=> {
          const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, browserOptions);

          // let webpackDevServerConfig: WebpackDevServer.Configuration;
          // try {
          // 	webpackDevServerConfig = (this as any)_buildServerConfig(
          // 		root,
          // 		options,
          // 		browserOptions
          // 	);
          // } catch (err) {
          // 	return throwError(err);
          // }

          // Resolve public host and client address.
          // let clientAddress = `${options.ssl ? 'https' : 'http'}://0.0.0.0:0`;
          if (options.publicHost) {
            let publicHost = options.publicHost;
            if (!/^\w+:\/\//.test(publicHost)) {
              publicHost = `${options.ssl ? 'https' : 'http'}://${publicHost}`;
            }
            const clientUrl = url.parse(publicHost);
            options.publicHost = clientUrl.host;
            // clientAddress = url.format(clientUrl);
          }

          // Resolve serve address.
          const serverAddress = url.format({
            protocol: options.ssl ? 'https' : 'http',
            hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
            port: options.port.toString()
          });

          // Add live reload config.
          // if (options.liveReload) {
          // 	this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
          // } else if (options.hmr) {
          // 	this.context.logger.warn('Live reload is disabled. HMR option ignored.');
          // }

          if (!options.watch) {
            // There's no option to turn off file watching in webpack-dev-server, but
            // we can override the file watcher instead.
            webpackConfig.plugins.unshift({
              // tslint:disable-next-line:no-any
              apply: (compiler: any) => {
                compiler.hooks.afterEnvironment.tap('angular-cli', () => {
                  compiler.watchFileSystem = { watch: () => { } };
                });
              }
            });
          }

          if (browserOptions.optimization) {
            this.context.logger.error(tags.stripIndents`
							****************************************************************************************
							This is a simple server for use in testing or debugging Angular applications locally.
							It hasn't been reviewed for security issues.

							DON'T USE IT FOR PRODUCTION!
							****************************************************************************************
						`);
          }

          this.context.logger.info(tags.oneLine`
						**
						Angular Live Development Server is listening on ${options.host}:${options.port},
						open your browser on ${serverAddress}${browserOptions.deployUrl}
						**
					`);

          opnAddress = serverAddress + browserOptions.deployUrl;
          // webpackConfig.devServer = browserOptions.deployUrl;

          // return webpackDevServerBuilder.runWebpackDevServer(
          // 	webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose),
          // );
          return webpackConfig;
        });
      }),
      map(buildEvent => {
        if (first && options.open) {
          first = false;
          opn(opnAddress);
        }

        return buildEvent;
      })
      // using more than 10 operators will cause rxjs to loose the types
    ) as Observable<BuildEvent>;
  }
}
