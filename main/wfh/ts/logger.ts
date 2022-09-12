import path from 'node:path';
import * as log4js from 'log4js';
import {packageOfFileFactory} from './package-mgr/package-info-gathering';
/**
 * Get log4js Logger for specific node.js file, the output log will have
 * category in form of "<pkg name>.<file base name>"
 * 
 * Usage:
 * - Common JS module (cjs): loggerForFile(__filename);
 * - EJS module (mjs): loggerForFile(new URL(import.meta.url).pathname)
 * @param file 
 */
export function log4File(file: string) {
  const pkg = packageOfFileFactory().getPkgOfFile(file);
  if (pkg) {
    return log4js.getLogger(pkg.name + '.' + /^(.*?)\.[^.]*$/.exec(path.basename(file))![1]);
  } else {
    return log4js.getLogger(/^(.*?)\.[^.]*$/.exec(path.basename(file))![1]);
  }
}
