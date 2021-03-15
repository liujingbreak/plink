import '@wfh/plink/wfh/dist/node-path';
import {initAsChildProcess, initConfig, GlobalOptions} from '@wfh/plink/wfh/dist';

import * as _checker from './hack-type-checker';
import {injectorSetup} from '../ng/injector-setup';


initAsChildProcess();
const drcpCliOpt = JSON.parse(process.env._ngcli_plink_arg!) as GlobalOptions;
initConfig(drcpCliOpt);
const otherCfg = JSON.parse(process.env._ngcli_plink_cfg!);


injectorSetup(otherCfg.deployUrl, otherCfg.baseHref);

(require('./hack-type-checker') as typeof _checker).init();
