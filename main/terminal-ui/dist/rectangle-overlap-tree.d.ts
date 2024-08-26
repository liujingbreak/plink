import type { Rectangle } from './canvas';
export declare class RectangleOverlapTree<C> {
    private xIntervalTree;
    private yIntervalTree;
    toString(): string;
    addContent([x, y, w, h]: Rectangle, content: C): void;
    searchOverlaps([x, y, w, h]: Rectangle): C[];
    /** search for any rectangle from the tree that is being fully
     * covered by paramerter rectangle */
    searchForCovered([x, y, w, h]: Rectangle): C[];
    updateContent([x, y, w, h]: Rectangle, content: C): void;
    clear(): void;
}
