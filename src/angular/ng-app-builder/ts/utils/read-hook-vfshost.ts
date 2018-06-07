/* tslint:disable no-console */
import {virtualFs, Path} from '@angular-devkit/core';
import {Observable} from 'rxjs';
import {concatMap, tap} from 'rxjs/operators';

export type FBuffer = virtualFs.FileBuffer;

export interface TsFile {
	path: Path;
	buffer: FBuffer;
}
export default class ReadHookHost<StatsT extends object = {}> extends virtualFs.AliasHost<StatsT> {
	/** set this property to add a file read hook */
	hookRead: (path: string, buffer: FBuffer) => Observable<FBuffer>;

	read(path: Path): Observable<FBuffer> {

		return super.read(path).pipe(
			this.hookRead ?
			concatMap((buffer: FBuffer) => {
				return this.hookRead(path, buffer);
			}) :
			tap(() => {
				console.log('ReadHookHost reading ', path);
			})
		);
	}
}
