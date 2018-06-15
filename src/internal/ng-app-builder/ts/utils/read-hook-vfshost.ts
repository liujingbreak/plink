/* tslint:disable no-console */
import {virtualFs, Path ,getSystemPath} from '@angular-devkit/core';
import {Observable} from 'rxjs';
import {concatMap} from 'rxjs/operators';
// import {sep} from 'path';

// const isWindows = sep === '\\';
export type FBuffer = virtualFs.FileBuffer;

export interface TsFile {
	path: Path;
	buffer: FBuffer;
}

export type HookReadFunc =(path: string, buffer: FBuffer) => Observable<FBuffer>;

export default class ReadHookHost<StatsT extends object = {}> extends virtualFs.AliasHost<StatsT> {
	/** set this property to add a file read hook */
	_readFunc: HookReadFunc;

	set hookRead(func: HookReadFunc) {
		this._readFunc = func;
	}

	read(path: Path): Observable<FBuffer> {
		return super.read(path).pipe(
			concatMap((buffer: FBuffer) => {
				let sPath: string = getSystemPath(path);
				return this._hookRead(sPath, buffer);
			})
		);
	}

	protected _hookRead(path: string, buffer: FBuffer): Observable<FBuffer> {
		return this._readFunc(path, buffer);
	}


	// protected _resolve(path: Path) {
	// 	let r = super._resolve(path);
	// 	return r;
	// }
}