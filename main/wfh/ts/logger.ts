import path from 'node:path';
import {getLogger} from 'log4js';
import {packageOfFileFactory} from './package-mgr/package-info-gathering';
/**
 * Get log4js Logger for specific node.js file, the output log will have
 * category in form of "<pkg name>.<file base name>"
 *
 * How to configure Plink log inside a self controlled process in simplest way:
   ```
   initProcess('none');
   logConfig(initConfig({})());
   const log = log4File(__filename);
   ```
   If your script is not started with Plink's command line extension or app server plugin package, you have to configure Logger like above code snippet

 * Usage:
 * - Common JS module (cjs): loggerForFile(__filename);
 * - EJS module (mjs): loggerForFile(new URL(import.meta.url).pathname)
 * @param file 
 */
export function log4File(file: string, subName?: string) {
  const pkg = packageOfFileFactory().getPkgOfFile(file);
  if (pkg) {
    return getLogger(pkg.name + '.' + /^(.*?)\.[^.]*$/.exec(path.basename(file))![1] + (subName ? '.' + subName : ''));
  } else {
    return getLogger(/^(.*?)\.[^.]*$/.exec(path.basename(file))![1] + (subName ? '.' + subName : ''));
  }
}
