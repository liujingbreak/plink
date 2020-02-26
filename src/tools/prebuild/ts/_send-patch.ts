import { sendAppZip as _sendAppZip } from '@dr-core/assets-processer/dist/content-deployer/cd-client';

export async function send(env: string, configName: string, zipFile: string, secret?: string) {
  let url: string;
  switch (env) {
    case 'prod':
      url = 'https://credit-service.bkjk.com/_install';
      break;
    case 'local':
      url = 'http://localhost:14333/_install';
      break;
    case 'dev':
    case 'test':
    default:
      url = `https://credit-service.${env}.bkjk.com/_install`;
      break;
  }

  const sendAppZip: typeof _sendAppZip = require('@dr-core/assets-processer/dist/content-deployer/cd-client').sendAppZip;

  // tslint:disable-next-line:no-console
  console.log('Push App %s version: %s', configName);
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
    console.error(ex);
    console.log(`You may retry:\n node -r ts-node/register scripts/prebuild/_send-patch.ts ${process.argv.slice(2).join(' ')}`);
    throw ex;
  }
}
