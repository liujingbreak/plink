
import api from '__api';
import {spawn} from '@wfh/plink/wfh/dist/process-utils';
import chalk from 'chalk';
import {main as prebuildPost} from './prebuild-post';
import Path from 'path';
import * as _ma from './merge-artifacts';

const log = api.logger;

export default async function(isStatic: boolean, env: string, app: string, pushBranch = true,
  isForce: boolean,
  secret: string | undefined | null, scriptsFile?: string, commitComment?: string) {

  log.info(`post build, env: ${env}, App: ${app}, is static: ${isStatic}, build script: ${scriptsFile}`);
  await (require('./merge-artifacts') as typeof _ma).prepare();

  if (scriptsFile) {
    if (scriptsFile.endsWith('.sh')) {
      const ev = {...process.env};
      delete ev.__plink;
      delete ev.PLINK_CLI_OPTS;
      await spawn('bash', scriptsFile, env, app, isStatic ? 'true' : 'false', {
        env: ev
      }).promise;
    } else if (scriptsFile.indexOf('#') < 0) {
      // eslint-disable-next-line no-console
      log.error(chalk.redBright(`Wrong format of ${scriptsFile}, in which no "#" is found`));
      return;
    } else {
      const scriptAndFunc = scriptsFile.split('#');
      const file = scriptAndFunc[0];
      const func = scriptAndFunc[1];
      // eslint-disable-next-line no-console
      log.info(`executing file: ${file}, function name: ${func}`);
      await Promise.resolve(require(Path.resolve(file))[func](env, app, isStatic));
    }
  }
  await prebuildPost(env, app, isStatic, pushBranch, isForce, secret ? secret : undefined, commitComment);
}
