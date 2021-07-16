// eslint-disable  no-console
import fs from 'fs-extra';
import Path from 'path';
import {DrcpSettings} from './config-handler';
// import config from './config';
import log4js from 'log4js';
const log = log4js.getLogger('plink.log-config');

export default function(configObj: DrcpSettings) {
  const {rootPath} = configObj;
  log.info('[log-config] log4js at', require.resolve('log4js'));
  const log4jsConfig = Path.join(rootPath, 'log4js.js');
  if (!fs.existsSync(log4jsConfig)) {
    log.info('Logging configuration is not found %s', log4jsConfig);
    return;
  }
  fs.mkdirpSync(Path.resolve(rootPath, 'logs'));

  // const opt = {
  //   cwd: rootPath,
  //   reloadSecs: 9999
  // };

  // if (reloadSec !== undefined)
  //   opt.reloadSecs = reloadSec;
  try {
    let localSetting = require(log4jsConfig);
    if (localSetting.setup instanceof Function) {
      localSetting = localSetting.setup(configObj);
    }

    log4js.configure(localSetting);
    log4js.getLogger('logConfig').info(`\n\n-------------- Log ${new Date().toLocaleString()} ----------------\n`);
    void import('./store').then(store => store.startLogging());
  } catch (e) {
    log.error(e);
    // log.info('\nIt seems current log4js configure file is outdated, please delete\n\t' + log4jsConfig +
    // 	'\n  and run "drcp init" to get a new one.\n');
    // // log4js.configure({
    // // 	appenders: {out: {type: 'stdout'}},
    // // 	categories: {default: {appenders: ['out'], level: 'info'}}
    // // });
  }
}
