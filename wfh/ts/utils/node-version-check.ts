import {promisifySpawn as spawn} from '../process-utils';

export default async function ensureNodeVersion(): Promise<void> {
  const output = await spawn('node', '-v', {cwd: process.cwd(), silent: true});
  const match = /^v?([^]+)$/.exec(output.trim());
  if (match) {
    if (parseInt(match[1].split('.')[0], 10) < 12) {
      // tslint:disable-next-line: no-console
      console.log('Please upgrade Node.js version to v12, current version: ' + match[1]);
      // try {
      //   await require('open')('https://nodejs.org/');
      // } catch (ex) {
      //   // It is OK for errors, probably dependency 'open' is not installed yet
      // }
      // throw new Error('Please upgrade Node.js version to v12');
    }
  } else {
    // tslint:disable-next-line: no-console
    console.log('Can not recognize "node -v" output:', output);
    throw new Error('Can not recognize "node -v" output:' + output);
  }
}
