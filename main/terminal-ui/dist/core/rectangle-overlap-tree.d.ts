import { IntervalTree } from '@wfh/algorithms';
import type { Rectangle } from './canvas';
export declare class RectangleOverlapTree<C> {
    xIntervalTree: IntervalTree<IntervalTree<C[]>>;
    toString(): string;
    addContent([x, y, w, h]: Rectangle, ...contents: C[]): void;
    private _searchOverlaps;
    searchOverlaps(r: Rectangle): Generator<readonly [Rectangle, C], void, unknown>;
    deleteRectangle([x, y, w, h]: Rectangle): boolean;
    addOrUnionRectOnOverlap(rect: Rectangle, content: C): void;
    /** search for any rectangle from the tree that is being fully
     * covered by paramerter rectangle */
    searchForCovered(r: Rectangle): C[];
    updateContent([x, y, w, h]: Rectangle, content: C): void;
    allRectangles(): Generator<readonly [Rectangle, C[]], void, unknown>;
    clear(): void;
}
export declare function rectUnion([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle): Rectangle;
