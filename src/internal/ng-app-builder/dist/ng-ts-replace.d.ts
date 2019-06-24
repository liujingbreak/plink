import { AngularCliParam } from './ng/common';
import { HookReadFunc } from './utils/read-hook-vfshost';
export default class TSReadHooker {
    hookFunc: HookReadFunc;
    private realFileCache;
    private tsCache;
    constructor(ngParam: AngularCliParam);
    clear(): void;
    private realFile;
    private createTsReadHook;
}
export declare function string2buffer(input: string): ArrayBuffer;
/**
 *
 * @param appModulePkName package name of the one contains app.module.ts
 * @param appModuleDir app.module.ts's directory, used to calculate relative path
 */
