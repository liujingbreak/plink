/* eslint-disable  no-console */
/**
 * TODO: So far Angular TS compiler reads file not in async mode, even return type is an Observable,
 * we probably can pre-read files and cache them to make hooks work in async-like mode.
 */
import {virtualFs, Path ,getSystemPath} from '@angular-devkit/core';
import {Observable} from 'rxjs';
import {concatMap} from 'rxjs/operators';
import {WebpackInputHost} from '@ngtools/webpack/src/webpack-input-host';
import { InputFileSystem } from 'webpack';
// import {sep} from 'path';

// const isWindows = sep === '\\';
export type FBuffer = virtualFs.FileBuffer;

export interface TsFile {
  path: Path;
  buffer: FBuffer;
}

export type HookReadFunc =(path: string, buffer: FBuffer) => Observable<FBuffer>;

export default class ReadHookHost extends WebpackInputHost {
  /** set this property to add a file read hook */
  _readFunc: HookReadFunc;

  constructor(inputFileSystem: InputFileSystem, func: HookReadFunc) {
    super(inputFileSystem);
    this._readFunc = func;
  }

  read(path: Path): Observable<FBuffer> {
    return super.read(path).pipe(
      concatMap((buffer: FBuffer) => {
        const sPath: string = getSystemPath(path);
        return this._hookRead(sPath, buffer);
      })
    );
  }

  protected _hookRead(path: string, buffer: FBuffer): Observable<FBuffer> {
    return this._readFunc(path, buffer);
  }
}
