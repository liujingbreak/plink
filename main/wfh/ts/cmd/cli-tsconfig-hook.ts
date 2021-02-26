import {getStore, dispatcher} from '../editor-helper';
import * as op from 'rxjs/operators';
// import {getLogger} from 'log4js';
import Path from 'path';
import {getRootDir} from '../utils/misc';

export interface CliOptions {
  hook: string[];
  unhook: string[];
  unhookAll: boolean;
}

export function doTsconfig(opts: CliOptions) {
  if (opts.hook) {
    dispatcher.hookTsconfig(opts.hook);
  }
  if (opts.unhook) {
    dispatcher.unHookTsconfig(opts.unhook);
  }
  if (opts.unhookAll) {
    dispatcher.unHookAll();
  }
  getStore().pipe(
    op.map(s => s.tsconfigByRelPath),
    op.distinctUntilChanged(),
    op.filter(datas => {
      if (datas.size > 0) {
        return true;
      }
      // tslint:disable-next-line: no-console
      console.log('No hooked files found, hook file by command options "--hook <file>"');
      return false;
    }),
    op.tap((datas) => {
      // tslint:disable-next-line: no-console
      console.log('Hooked tsconfig files:');
      for (const data of datas.values()) {
        // tslint:disable-next-line: no-console
        console.log('  ' + Path.resolve(getRootDir(), data.relPath));
      }
    })
  ).subscribe();
}
