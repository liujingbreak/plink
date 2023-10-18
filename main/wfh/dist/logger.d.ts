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
export declare function log4File(file: string, subName?: string): import("log4js").Logger;
