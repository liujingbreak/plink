import { virtualFs, Path } from '@angular-devkit/core';
import { Observable } from 'rxjs';
export declare type FBuffer = virtualFs.FileBuffer;
export interface TsFile {
    path: Path;
    buffer: FBuffer;
}
export default class ReadHookHost<StatsT extends object = {}> extends virtualFs.AliasHost<StatsT> {
    /** set this property to add a file read hook */
    hookRead: (path: string, buffer: FBuffer) => Observable<FBuffer>;
    read(path: Path): Observable<FBuffer>;
}
