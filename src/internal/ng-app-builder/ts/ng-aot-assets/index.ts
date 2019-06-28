import api from '__api';
import { replaceForHtml } from './html-assets-resolver';
import {of} from 'rxjs';
import * as fs from 'fs';
import * as Path from 'path';
import * as _ from 'lodash';
// const chalk = require('chalk');
// const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
export const randomNumStr = (Math.random() + '').slice(2, 6);

export function replaceHtml(filename: string, source: string): string {
  let result: string;
  replaceForHtml(source, filename, (text) => {
    if (text.startsWith('.')) {
      filename = fs.realpathSync(filename);
      const pk = api.findPackageByFile(filename);
      if (pk == null)
        return of('resource not found: ' + text);
      const absPath = Path.resolve(Path.dirname(filename), text);
      text = pk.longName + '/' + Path.relative(pk.realPackagePath, absPath).replace(/\\/g, '/');
    }
    // console.log(filename + `[drcp_${randomNumStr}${text}_]`);
    return of(`[drcp_${randomNumStr};${text}]`);
  })
  .subscribe((text) => {result = text;});
  return result!;
}
