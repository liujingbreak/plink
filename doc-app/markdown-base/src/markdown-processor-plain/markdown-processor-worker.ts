import {initProcess, initConfig, logConfig} from '@wfh/plink';
initProcess('none');
logConfig(initConfig({})());

require('./markdown-processor');
export {};

