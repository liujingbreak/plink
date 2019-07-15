/* tslint:disable max-line-length */
import './node-inject';

import {
  BuildEvent,
  BuilderConfiguration
  } from '@angular-devkit/architect';
  import { WebpackBuilder } from '@angular-devkit/build-webpack';
  import { normalize, resolve, virtualFs } from '@angular-devkit/core';
  import * as fs from 'fs';
  import { Observable, of } from 'rxjs';
  import { concatMap } from 'rxjs/operators';
  import { augmentAppWithServiceWorker } from '@angular-devkit/build-angular/src/angular-cli-files/utilities/service-worker';
  import { normalizeBuilderSchema } from '@angular-devkit/build-angular/src/utils';
import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';

import {BrowserBuilder as GoogleBrowserBuilder, getBrowserLoggingCb} from '@angular-devkit/build-angular';
import * as drcpCommon from './common';

export default class BrowserBuilder extends GoogleBrowserBuilder {
  run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent> {
  const root = this.context.workspace.root;
  const projectRoot = resolve(root, builderConfig.root);
  const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
  const webpackBuilder = new WebpackBuilder({ ...this.context, host });

  const options = normalizeBuilderSchema(
    host,
    root,
    builderConfig
  );

  return of(null).pipe(
    concatMap(() => options.deleteOutputPath
    ? (this as any)._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
    : of(null)),
    concatMap(() => {
      return drcpCommon.compile(builderConfig.root, options,
        () => this.buildWebpackConfig(root, projectRoot, host, options));
    }),
    concatMap((webpackConfig) => {
      return webpackBuilder.runWebpack(webpackConfig, getBrowserLoggingCb(options.verbose));
    }),
    concatMap((buildEvent) => {
    if (buildEvent.success && !options.watch && options.serviceWorker) {
      return new Observable<BuildEvent>(obs => {
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

}
