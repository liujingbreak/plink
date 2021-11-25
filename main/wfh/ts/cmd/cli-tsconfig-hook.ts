import Path from 'path';
import * as op from 'rxjs/operators';
import {getStore, dispatcher} from '../editor-helper';
// import {getLogger} from 'log4js';
import {getRootDir} from '../utils/misc';
import {dispatcher as storeSettingDispatcher} from '../store';

export interface CliOptions {
  hook: string[];
  unhook: string[];
  unhookAll: boolean;
}

export function doTsconfig(opts: CliOptions) {
  if (opts.hook && opts.hook.length > 0) {
    storeSettingDispatcher.changeActionOnExit('save');
    dispatcher.hookTsconfig(opts.hook);
  }
  if (opts.unhook && opts.unhook.length > 0) {
    storeSettingDispatcher.changeActionOnExit('save');
    dispatcher.unHookTsconfig(opts.unhook);
  }
  if (opts.unhookAll) {
    storeSettingDispatcher.changeActionOnExit('save');
    dispatcher.unHookAll();
  }
  getStore().pipe(
    op.map(s => s.tsconfigByRelPath),
    op.distinctUntilChanged(),
    op.filter(datas => {
      if (datas.size > 0) {
        return true;
      }
      // eslint-disable-next-line no-console
      console.log('No hooked files found, hook file by command options "--hook <file>"');
      return false;
    }),
    op.debounceTime(0), // There will be two change events happening, let's get the last change result only
    op.tap((datas) => {
      // eslint-disable-next-line no-console
      console.log('Hooked tsconfig files:');
      for (const data of datas.values()) {
        // eslint-disable-next-line no-console
        console.log('  ' + Path.resolve(getRootDir(), data.relPath));
      }
    })
  ).subscribe();
}
