// tslint:disable no-console
import '../../ng/node-inject';
import webpack from 'webpack';
import _ from 'lodash';
import {executeDevServerBuilder, DevServerBuilderOptions, DevServerBuilderOutput} from '@angular-devkit/build-angular';
import {
  createBuilder
} from '@angular-devkit/architect';
import {from} from 'rxjs';
import {concatMap, tap} from 'rxjs/operators';
import * as drcpCommon from '../../ng/common';
import {changeAngularCliOptions} from '../../ng/change-cli-options';

export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(
  (options, context) => {
    return from(drcpCommon.initCli(options as any))
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
            await drcpBuilderCtx.configWebpack( config as webpack.Configuration, {devMode: true});
            return config;
          },
          indexHtml: (content) => drcpBuilderCtx.transformIndexHtml(content)
        });
      }),
      tap(() => {
        console.log(drawPuppy('You may also run "node app" and access from http://localhost:14333'));
      })
    );
  }
);

function drawPuppy(slogon = 'Congrads!', message = '') {

  console.log('\n   ' + _.repeat('-', slogon.length) + '\n' +
    ` < ${slogon} >\n` +
    '   ' + _.repeat('-', slogon.length) + '\n' +
    '\t\\   ^__^\n\t \\  (oo)\\_______\n\t    (__)\\       )\\/\\\n\t        ||----w |\n\t        ||     ||');
  if (message)
    console.log(message);
}
