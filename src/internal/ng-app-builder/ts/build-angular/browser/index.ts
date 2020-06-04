import '../../ng/node-inject';
import webpack from 'webpack';
import {executeBrowserBuilder} from '@angular-devkit/build-angular';

import { Schema as BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import {json} from '@angular-devkit/core';
import {from} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {
  createBuilder
} from '@angular-devkit/architect';
import * as drcpCommon from '../../ng/common';
import {changeAngularCliOptionsForBuild} from '../../ng/change-cli-options';


export default createBuilder<json.JsonObject & BrowserBuilderSchema>(
  (options, context) => {
    return from(drcpCommon.initCli(options as any))
    .pipe(
      concatMap(config => {
        return from(changeAngularCliOptionsForBuild(config, options, context));
      }),
      concatMap(browserOptions => {
        const drcpBuilderCtx = drcpCommon.newContext({
          browserOptions,
          ssr: false
        });
        return executeBrowserBuilder(browserOptions, context, {
          webpackConfiguration: async (config) => {
            await drcpBuilderCtx.configWebpack(config as webpack.Configuration, {devMode: true});
            return config;
          },
          indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
      })
    );
  }
);
