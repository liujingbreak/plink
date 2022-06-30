/// <reference path="eslint-cli.d.ts" />
/**
 * Run eslint only for .ts file, exclude .d.ts files
 * @param dir
 */
export declare function eslint(dir: string): Promise<void>;
