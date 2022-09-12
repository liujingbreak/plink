import {initProcess, initConfig, initInjectorForNodePackages} from '@wfh/plink';
import * as _cfp from './cli-forward-proxy';

const [port, mapJson, fallbackJson]  = process.argv.slice(2);
const fallbackObj = fallbackJson ? JSON.parse(fallbackJson) as undefined | string : undefined;
const fallbackArr = fallbackObj ? fallbackJson.split(':') : undefined;
initProcess();
initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));
initInjectorForNodePackages();

(require('./cli-forward-proxy') as typeof _cfp).start(Number(port), new Map<string, string>(JSON.parse(mapJson)), fallbackArr
  ? {
    fallbackProxyHost: fallbackArr[0],
    fallbackproxyPort: fallbackArr[1] != null ? Number(fallbackArr[1]) : 80
  }
  : undefined);
