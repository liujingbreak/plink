import * as rx from 'rxjs';
import type RBushType from 'rbush' with { 'resolution-mode': 'import' };
import { Rectangle } from './canvas.js';
export { RBushType };
export interface RTree<T> extends RBushType<[Rectangle, T]> {
    searchOverlaps([x, y, w, h]: Rectangle): [Rectangle, T][];
    addOrUnionRectOnOverlap(rect: Rectangle, content: T, merge: (c1: T, c2: T) => T): [Rectangle, T][];
    updateContent(r: Rectangle, content: T): void;
    searchForCovered(r: Rectangle): [Rectangle, T][];
}
/** If the calling module is CJS, the import will have to be async */
export declare const waitForImport$: rx.Observable<new () => RBushType<[Rectangle, unknown]>>;
/** For CJS file to load and create an "rbush"'s r-tree instance */
export declare function createRtreeInstance<T>(): rx.ReplaySubject<RTree<T>>;
export declare function rectUnion([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle): Rectangle;
