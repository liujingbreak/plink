import {nodeInjector} from '@wfh/plink/wfh/dist/injector-factory';
import Path from 'path';
import * as ngDevkitNode from '@angular-devkit/core/node';
import TSReadHooker from '../ng-ts-replace';
import ReadHookHost from '../utils/read-hook-vfshost';
import * as fs from 'fs';

export function init() {
  const hooker = new TSReadHooker(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), false);

  class HackedHost extends ReadHookHost {
    constructor() {
      super(fs, hooker.hookFunc);
    }
  }

  nodeInjector.fromDir(Path.resolve('node_modules/@ngtools/webpack'))
  .factory('@angular-devkit/core/node', (file) => {
    return {
      ...ngDevkitNode,
      NodeJsSyncHost: HackedHost
    };
  });
}
