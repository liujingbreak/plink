import '../../ng/node-inject';
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
    return from(drcpCommon.initCli(options))
    .pipe(
      concatMap(config => {
        return from(changeAngularCliOptionsForBuild(config, options, context));
      }),
      concatMap(browserOptions => {
        return executeBrowserBuilder(browserOptions, context, {
          webpackConfiguration: async (config) => {
            await drcpCommon.configWebpack({
              browserOptions,
              ssr: false
            }, config, {devMode: true});
            return config;
          },
          indexHtml: drcpCommon.transformIndexHtml
        });
      })
    );
  }
);
