import {Configuration as DevServerOpts} from 'webpack-dev-server';
import changeDevServer from '@wfh/webpack-common/dist/devServer';
import {logger} from '@wfh/plink';
import {printConfig} from './utils';
const log = logger.getLogger('@wfh/cra-scripts.webpack.devserver.config');

const origDevServerConfig = require('react-scripts/config/webpackDevServer.config') as (...args: unknown[]) => DevServerOpts;

export = function(this: unknown, ...args: any[]) {
  // eslint-disable-next-line prefer-rest-params
  const devServerCfg = origDevServerConfig.apply(this, args);
  // devServerCfg.stats = 'normal';
  // devServerCfg.quiet = false;
  changeDevServer({devServer: devServerCfg});
  // if (devServerCfg.watchOptions?.ignored) {
  //   delete devServerCfg.watchOptions.ignored;
  // }

  log.info('Dev server configure:', printConfig(devServerCfg));
  return devServerCfg;
};
