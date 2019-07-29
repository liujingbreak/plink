import '../../ng/node-inject';
import {executeDevServerBuilder, DevServerBuilderOptions, DevServerBuilderOutput} from '@angular-devkit/build-angular';
import {
  createBuilder
} from '@angular-devkit/architect';
import {from} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import * as drcpCommon from '../../ng/common';
import {changeAngularCliOptions} from '../../ng/change-cli-options';

export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(
  (options, context) => {
    return from(drcpCommon.initCli(options))
    .pipe(
      concatMap(drcpConfig => {
        return from(changeAngularCliOptions(drcpConfig, context, options));
      }),
      concatMap((browserOptions) => {
        const drcpBuilderCtx = drcpCommon.newContext({
          builderConfig: options,
          browserOptions,
          ssr: false
        });
        return executeDevServerBuilder(options, context, {
          webpackConfiguration: async (config) => {
            await drcpBuilderCtx.configWebpack( config, {devMode: true});
            return config;
          },
          indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
    }));
  }
);
