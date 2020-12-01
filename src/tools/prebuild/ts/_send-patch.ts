import { sendAppZip as _sendAppZip } from '@wfh/assets-processer/dist/content-deployer/cd-client';
import { checkZipFile } from '@wfh/assets-processer/dist/remote-deploy';
import log4js from 'log4js';
import api from '__api';
import Url from 'url';
import fs from 'fs-extra';
import Path from 'path';
import {Configuration} from './types';

const log = log4js.getLogger(api.packageName + '.send-patch');
const installUrlMap = api.config.get(api.packageName) as Configuration;

export async function send(env: string, appName: string, zipFile: string,
  numOfConc?: number, numOfNode?: number, force = false, secret?: string) {
  let url = installUrlMap.byEnv[env].installEndpoint;
  const rootDir = api.config().rootPath;
  url = force ? Url.resolve(url, '/_install_force') : Url.resolve(url, '/_install');

  if (fs.statSync(zipFile).isDirectory()) {
    const installDir = Path.resolve(rootDir, 'install-' + env);
    if (!fs.existsSync(installDir)) {
      fs.mkdirpSync(installDir);
    }
    zipFile = await checkZipFile(zipFile, installDir, appName, /([\\/]stats[^]*\.json|\.map)$/);
  }

  const sendAppZip: typeof _sendAppZip = require('@wfh/assets-processer/dist/content-deployer/cd-client').sendAppZip;

  // tslint:disable-next-line:no-console
  log.info('Pushing App "%s" to remote %s', appName, url);
  try {
    await sendAppZip({
      remoteFile: `install-${env}/${appName}.zip`,
      url,
      numOfConc: numOfConc != null ? numOfConc : env === 'prod' ? 4 : 2,
      numOfNode: numOfNode != null ? numOfNode : env === 'prod' ? 2 : 1,
      secret
    }, zipFile);
  } catch (ex) {
    // tslint:disable:no-console
    log.error(ex);
    throw ex;
  }
}

