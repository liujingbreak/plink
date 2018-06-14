import { virtualFs, Path } from '@angular-devkit/core';
import { Observable } from 'rxjs';
export default class ReadHookHost extends virtualFs.AliasHost {
    read(path: Path): Observable<virtualFs.FileBuffer>;
}
