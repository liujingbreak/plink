
import api from '__api';
import log4js from 'log4js';
import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
import chalk from 'chalk';
import {main as prebuildPost} from './prebuild-post';
import * as _ma from './merge-artifacts';

const log = log4js.getLogger(api.packageName + '.cli-deploy');

export default async function(isStatic: boolean, env: string, app: string, scriptsFile: string) {

  log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile}`);
  await (require('./merge-artifacts') as typeof _ma).prepare();

  if (scriptsFile.endsWith('.sh')) {
    await spawn(scriptsFile, env, app, isStatic ? 'true' : 'false').promise;
  } else if (scriptsFile.indexOf('#') < 0) {
    // tslint:disable-next-line: no-console
    console.log(chalk.redBright(`Wrong format of ${scriptsFile}, in which no "#" is found`));
    return;
  } else {
    const scriptAndFunc = scriptsFile.split('#');
    const file = scriptAndFunc[0];
    const func = scriptAndFunc[1];
    // tslint:disable-next-line: no-console
    console.log(`executing file: ${file}, function name: ${func}`);
    await Promise.resolve(require(file)[func](env, app, isStatic));
  }
  await prebuildPost(env, app, isStatic);
}
