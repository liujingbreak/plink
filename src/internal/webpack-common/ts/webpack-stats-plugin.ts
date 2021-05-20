/**
 * Create-react-app hijacked Webpack stats format, I need this plugin to prints more information
 * for library compilation
 */
import {Compiler} from 'webpack';
import {log4File} from '@wfh/plink';

const log = log4File(__filename);

export default class StatsPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.done.tap('PlinkWebpackStatsPlugin', (stats) => {
      log.info(stats.toString('normal'));
    });
  }
}

