import {Configuration} from 'webpack';
import {printConfig} from './utils';
import changeDevServer from '@wfh/webpack-common/dist/devServer';
import {logger} from '@wfh/plink';
const log = logger.getLogger('@wfh/cra-scripts.webpack.devserver.config');

const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');

export = function(proxy: string, allowedHost: string) {
  const devServerCfg: NonNullable<Configuration['devServer']> = origDevServerConfig.apply(this, arguments);
  devServerCfg.stats = 'normal';
  devServerCfg.quiet = false;
  changeDevServer({devServer: devServerCfg});
  if (devServerCfg.watchOptions && devServerCfg.watchOptions.ignored) {
    delete devServerCfg.watchOptions.ignored;
  }

  log.info('Dev server configure:', printConfig(devServerCfg));
  return devServerCfg!;
};
