/**
 * TODO: So far Angular TS compiler reads file not in async mode, even return type is an Observable,
 * we probably can pre-read files and cache them to make hooks work in async-like mode.
 */
import { virtualFs, Path } from '@angular-devkit/core';
import { Observable } from 'rxjs';
export declare type FBuffer = virtualFs.FileBuffer;
export interface TsFile {
    path: Path;
    buffer: FBuffer;
}
export declare type HookReadFunc = (path: string, buffer: FBuffer) => Observable<FBuffer>;
export default class ReadHookHost<StatsT extends object = {}> extends virtualFs.AliasHost<StatsT> {
    /** set this property to add a file read hook */
    _readFunc: HookReadFunc;
    hookRead: HookReadFunc;
    read(path: Path): Observable<FBuffer>;
    protected _hookRead(path: string, buffer: FBuffer): Observable<FBuffer>;
}
