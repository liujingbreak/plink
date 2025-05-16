// eslint-disable  no-console
import Path from 'path';
import cluster from 'node:cluster';
import fs from 'fs-extra';
import log4js from 'log4js';
import {childProcessAppender, doNothingAppender} from './utils/log4js-appenders';
import {PlinkSettings} from './config-handler';
// import config from './config';
const log = log4js.getLogger('plink.log-config');

export default function(configObj: PlinkSettings) {
  const {rootPath} = configObj;
  log.info('[log-config] log4js at', require.resolve('log4js'));
  const log4jsConfig = Path.join(rootPath, 'log4js.js');
  if (!fs.existsSync(log4jsConfig)) {
    log.info('Logging configuration is not found %s', log4jsConfig);
    return;
  }
  fs.mkdirpSync(Path.resolve(rootPath, 'logs'));

  try {
    let localSetting = require(log4jsConfig) as (log4js.Configuration & {setup?: (config: any) => log4js.Configuration});
    if (localSetting.setup instanceof Function) {
      localSetting = localSetting.setup(configObj);
    }
    // Same logic as bootstrap-process#configDefaultLog()
    if (cluster.isWorker) {
      for (const key of Object.keys(localSetting.appenders)) {
        if (localSetting.appenders[key].type === 'logLevelFilter')
          continue;
        localSetting.appenders[key] = {type: doNothingAppender, name: 'ignore cluster'};
      }
    } else if (process.env.__plinkLogMainPid !== process.pid + '' && process.send) {

      for (const key of Object.keys(localSetting.appenders)) {
        if (localSetting.appenders[key].type === 'logLevelFilter')
          continue;
        localSetting.appenders[key] = {type: childProcessAppender, name: 'send to parent'};
      }
    }
    log4js.configure(localSetting);
    log.info(`\n\nPID:${process.pid} -------------- ${new Date().toLocaleString()} ----------------\n`);
  } catch (e) {
    log.error(e);
  }
}
