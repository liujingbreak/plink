import '@wfh/plink/wfh/dist/node-path';
import {initProcess, initConfig, GlobalOptions} from '@wfh/plink/wfh/dist';
import {walkPackages } from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';

// import {initInjectorForNodePackages, initWebInjector} from '@wfh/plink/wfh/dist/package-runner';
import * as _checker from './hack-type-checker';
import {injectorSetup} from '../ng/injector-setup';
// import {nodeInjector} from '@wfh/plink/wfh/dist/injector-factory';
// import Path from 'path';
// import * as ngDevkitNode from '@angular-devkit/core/node';
// import TSReadHooker from '../ng-ts-replace';
// import ReadHookHost from '../utils/read-hook-vfshost';
// import * as fs from 'fs';

initProcess();
const drcpCliOpt = JSON.parse(process.env._ngcli_plink_arg!) as GlobalOptions;
initConfig(drcpCliOpt);
const otherCfg = JSON.parse(process.env._ngcli_plink_cfg!);


const packageInfo = walkPackages();
injectorSetup(packageInfo, drcpCliOpt, otherCfg.deployUrl, otherCfg.baseHref);

// const [pks, apiProto] = initInjectorForNodePackages({}, packageInfo);

// initWebInjector(pks, apiProto);

(require('./hack-type-checker') as typeof _checker).init();
// const hooker = new TSReadHooker(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), false);
// const host = new ReadHookHost(fs, hooker.hookFunc);

// nodeInjector.fromDir(Path.resolve('node_modules/@ngtools/webpack'))
// .factory('@angular-devkit/core/node', (file) => {
//   return {
//     ...ngDevkitNode,
//     NodeJsSyncHost: host
//   };
// });
