import type { Rectangle } from './canvas';
export declare class RectangleOverlapTree<C> {
    private xIntervalTree;
    private yIntervalTree;
    toString(): string;
    addContent([x, y, w, h]: Rectangle, content: C): void;
    searchOverlaps([x, y, w, h]: Rectangle): C[];
    searchForCovered([x, y, w, h]: Rectangle): C[];
    updateContent([x, y, w, h]: Rectangle, content: C): void;
    clear(): void;
}
