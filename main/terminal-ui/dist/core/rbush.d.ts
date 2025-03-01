import * as rx from 'rxjs';
import type RBushType from 'rbush' with { 'resolution-mode': 'import' };
import { Rectangle } from './canvas';
export { RBushType };
/** If the calling module is CJS, the import will have to be async */
export declare const waitForImport$: rx.Observable<new () => RBushType<[Rectangle, unknown]>>;
/** For CJS file to load and create an "rbush"'s r-tree instance*/
export declare function createRtreeInstance<T>(): rx.ReplaySubject<RBushType<[Rectangle, T]>>;
