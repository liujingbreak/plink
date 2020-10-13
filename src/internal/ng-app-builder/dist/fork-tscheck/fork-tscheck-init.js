"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@wfh/plink/wfh/dist/node-path");
const dist_1 = require("@wfh/plink/wfh/dist");
const package_info_gathering_1 = require("@wfh/plink/wfh/dist/package-mgr/package-info-gathering");
const package_runner_1 = require("@wfh/plink/wfh/dist/package-runner");
// import {nodeInjector} from '@wfh/plink/wfh/dist/injector-factory';
// import Path from 'path';
// import * as ngDevkitNode from '@angular-devkit/core/node';
// import TSReadHooker from '../ng-ts-replace';
// import ReadHookHost from '../utils/read-hook-vfshost';
// import * as fs from 'fs';
dist_1.initProcess();
dist_1.initConfig(JSON.parse(process.env._ngcli_plink_arg));
const packageInfo = package_info_gathering_1.walkPackages();
const [pks, apiProto] = package_runner_1.initInjectorForNodePackages({}, packageInfo);
package_runner_1.initWebInjector(pks, apiProto);
require('./hack-type-checker').init();
// const hooker = new TSReadHooker(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), false);
// const host = new ReadHookHost(fs, hooker.hookFunc);
// nodeInjector.fromDir(Path.resolve('node_modules/@ngtools/webpack'))
// .factory('@angular-devkit/core/node', (file) => {
//   return {
//     ...ngDevkitNode,
//     NodeJsSyncHost: host
//   };
// });

//# sourceMappingURL=fork-tscheck-init.js.map
