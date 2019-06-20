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
