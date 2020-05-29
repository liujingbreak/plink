import '../../ng/node-inject';
import webpack from 'webpack';
import { executeServerBuilder } from '@angular-devkit/build-angular';
import { ServerBuilderOutput } from '@angular-devkit/build-angular/src/server';

import { Schema as ServerBuilderOptions } from '@angular-devkit/build-angular/src/server/schema';
import { json } from '@angular-devkit/core';
import { from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { createBuilder } from '@angular-devkit/architect';
import * as drcpCommon from '../../ng/common';
import { changeAngularCliOptionsForBuild } from '../../ng/change-cli-options';

export default createBuilder<json.JsonObject & ServerBuilderOptions, ServerBuilderOutput>((options, context) => {
  return from(drcpCommon.initCli(options as any)).pipe(
    concatMap((config) => {
      return from(changeAngularCliOptionsForBuild(config, options, context));
    }),
    concatMap((serverOptions: drcpCommon.AngularBuilderOptions) => {
      const drcpBuilderCtx = drcpCommon.newContext({
        browserOptions:serverOptions,
        ssr: true
      });
      return executeServerBuilder(serverOptions, context, {
        webpackConfiguration: async (config) => {
          await drcpBuilderCtx.configWebpack(config as unknown as webpack.Configuration, { devMode: true });
          return config;
        }
      });
    })
  );
});
