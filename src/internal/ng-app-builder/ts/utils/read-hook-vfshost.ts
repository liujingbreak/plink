/* tslint:disable no-console */
import {virtualFs, Path, getSystemPath} from '@angular-devkit/core';
import {Observable} from 'rxjs';
import {concatMap, tap} from 'rxjs/operators';
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
	hookRead: HookReadFunc;

	read(path: Path): Observable<FBuffer> {
		return super.read(path).pipe(
			this.hookRead ?
			concatMap((buffer: FBuffer) => {
				let sPath: string = getSystemPath(path);
				// if (isWindows) {
				// 	let match = /^\/([^/]+)(.*)/.exec(path);
				// 	if (match)
				// 		sPath = match[1] + ':' + match[2].replace(/\//g, sep);
				// }
				return this.hookRead(sPath, buffer);
			}) :
			tap(() => {
				console.log('ReadHookHost reading ', path);
			})
		);
	}

	protected _resolve(path: Path) {
		let r = super._resolve(path);
		return r;
	}
}
