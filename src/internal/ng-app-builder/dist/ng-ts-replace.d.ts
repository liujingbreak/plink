import { AngularCliParam } from './ng/common';
import { HookReadFunc } from './utils/read-hook-vfshost';
export default class TSReadHooker {
    hookFunc: HookReadFunc;
    templateFileCount: number;
    tsFileCount: number;
    private realFileCache;
    private tsCache;
    constructor(ngParam: AngularCliParam);
    clear(): void;
    logFileCount(): void;
    private realFile;
    private createTsReadHook;
}
export declare function string2buffer(input: string): ArrayBuffer;
