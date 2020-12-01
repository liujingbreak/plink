import {Configuration} from 'webpack';
import {printConfig} from './utils';
import changeDevServer from '@wfh/webpack-common/dist/devServer';

const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');

export = function(proxy: string, allowedHost: string) {
  const devServerCfg: NonNullable<Configuration['devServer']> = origDevServerConfig.apply(this, arguments);
  devServerCfg.stats = 'normal';
  devServerCfg.quiet = false;
  changeDevServer({devServer: devServerCfg});
  // tslint:disable-next-line: no-console
  console.log('Dev server configure:', printConfig(devServerCfg));
  return devServerCfg!;
};
