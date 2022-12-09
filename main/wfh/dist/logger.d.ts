import * as log4js from 'log4js';
/**
 * Get log4js Logger for specific node.js file, the output log will have
 * category in form of "<pkg name>.<file base name>"
 *
 * Usage:
 * - Common JS module (cjs): loggerForFile(__filename);
 * - EJS module (mjs): loggerForFile(new URL(import.meta.url).pathname)
 * @param file
 */
export declare function log4File(file: string, subName?: string): log4js.Logger;
