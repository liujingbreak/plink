import {Configuration} from 'webpack';
// import {printConfig} from './utils';

const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');

export = function(proxy: string, allowedHost: string) {
  const devServerCfg: Configuration['devServer'] = origDevServerConfig.apply(this, arguments);
  devServerCfg!.stats = 'normal';
  // tslint:disable-next-line: no-console
  // console.log('Dev server configure:', printConfig(devServerCfg));
  return devServerCfg!;
};
