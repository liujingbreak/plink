import type { Rectangle } from './canvas';
export declare class RectangleOverlapTree<C> {
    private xIntervalTree;
    toString(): string;
    addContent([x, y, w, h]: Rectangle, content: C): void;
    private _searchOverlaps;
    searchOverlaps(r: Rectangle): C[];
    /** search for any rectangle from the tree that is being fully
     * covered by paramerter rectangle */
    searchForCovered(r: Rectangle): C[];
    updateContent([x, y, w, h]: Rectangle, content: C): void;
    clear(): void;
}
