import type { Rectangle } from './terminal-canvas';
export declare class RectangleOverlapTree<C> {
    private xIntervalTree;
    private yIntervalTree;
    addContent([x, y, w, h]: Rectangle, content: C): void;
    searchOverlaps([x, y, w, h]: Rectangle): C[];
    updateContent([x, y, w, h]: Rectangle, content: C): void;
    clear(): void;
}
