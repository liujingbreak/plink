import {log4File} from '@wfh/plink';
import {exe} from '@wfh/plink/wfh/dist/process-utils';
const log = log4File(__filename);
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export async function genSslKeys() {
  const args = 'req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem'.split(/\s+/);
  log.info('run openssl', args);
  await exe('openssl', ...args).promise;
  log.info('Start serve with arguments: "--prop @wfh/http-server.ssl.enabled=true"');
  // TODO: Your command job implementation here
}
