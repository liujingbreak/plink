import { sendAppZip as _sendAppZip } from '@wfh/assets-processer/dist/content-deployer/cd-client';
import log4js from 'log4js';
import api from '__api';

const log = log4js.getLogger(api.packageName + '.send-patch');
const installUrlMap = api.config.get(api.packageName + '.installEndpoint') as {[env: string]: string};

export async function send(env: string, configName: string, zipFile: string, secret?: string) {
  const url = installUrlMap[env];

  const sendAppZip: typeof _sendAppZip = require('@wfh/assets-processer/dist/content-deployer/cd-client').sendAppZip;

  // tslint:disable-next-line:no-console
  log.info('Pushing App "%s" to remote %s', configName, url);
  try {
    await sendAppZip({
      file: `install-${env}/${configName}.zip`,
      url,
      numOfConc: env === 'prod' ? 2 : 1,
      numOfNode: env === 'prod' ? 2 : 1,
      secret
    }, zipFile);
  } catch (ex) {
    // tslint:disable:no-console
    log.error(ex);
    throw ex;
  }
}

