import {Configuration} from 'webpack';
import changeDevServer from '@wfh/webpack-common/dist/devServer';
import {logger} from '@wfh/plink';
import {printConfig} from './utils';
const log = logger.getLogger('@wfh/cra-scripts.webpack.devserver.config');

const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');

export = function(proxy: string, allowedHost: string) {
  const devServerCfg = origDevServerConfig.apply(this, arguments);
  devServerCfg.stats = 'normal';
  devServerCfg.quiet = false;
  changeDevServer({devServer: devServerCfg});
  if (devServerCfg.watchOptions?.ignored) {
    delete devServerCfg.watchOptions.ignored;
  }

  log.info('Dev server configure:', printConfig(devServerCfg));
  return devServerCfg;
};
