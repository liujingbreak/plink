import api from '__api';
import { replaceForHtml } from './html-assets-resolver';
import {of, Observable} from 'rxjs';
import * as fs from 'fs';
import * as Path from 'path';
import * as _ from 'lodash';
// const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
export const randomNumStr = (Math.random() + '').slice(2, 6);

export function replaceHtml(filename: string, source: string): Observable<string> {
  return replaceForHtml(source, filename, (uri) => {
    let text = uri;
    try {
      // log.warn('replaceHtml for ' + text + ', ' + filename);

      if (text.startsWith('~')) {
        try {
          text = require.resolve(text.slice(1));
        } catch (ex) {
          text = ex.message || 'Failed to resolve ' + text;
        }
      } else if (text.startsWith('npm://')) {
        try {
          text = require.resolve(text.slice('npm://'.length));
        } catch (ex) {
          text = ex.message || 'Failed to resolve ' + text;
        }
      } else {
        filename = fs.realpathSync(filename);
        const pk = api.findPackageByFile(filename);
        if (pk == null)
          return of('resource not found: ' + text);
        const absPath = Path.resolve(Path.dirname(filename), text);
        text = pk.longName + '/' + Path.relative(pk.realPath, absPath).replace(/\\/g, '/');
      }
      // We can't replace to Assets URL here, because at this moment in AOT mode,
      // Webpack is not ready to run file-loader yet, we have to replace this `[drcp_...]`
      // placeholder with actual URL in ng-aot-assets-loader.ts later
      return of(`[drcp_${randomNumStr};${text}]`);
    } catch (ex) {
      log.error(`Failed to transform HTML ${uri} in ${filename}`);
      return of(`Failed to transform HTML ${filename} (ex.message)`);
    }
  });
}
