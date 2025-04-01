import { IntervalTree, RedBlackTree } from '@wfh/algorithms';
import { BaseReactorFactory, SingleActionFactory, CoreOptions, SimplexReactor } from '@wfh/reactivizer';
import { TextStyle } from './canvas.js';
type AddElement = [units: number[], style: TextStyle];
type ClearElement = 'clear';
type CacheLine = IntervalTree<AddElement | ClearElement>;
export interface CanvasCacheInput {
    /** x, y value should be absolute coordinates */
    add(x: number, y: number, units: number[], style: TextStyle): SingleActionFactory;
    addStr(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
    /** x, y value should be absolute coordinates */
    clear(x: number, y: number, width: number, height: number): SingleActionFactory;
    /** response didFetchLines */
    fetchLines(noColor?: boolean, showClearAsChar?: string): SingleActionFactory;
    /** response message: "onRenderItem, onClearItem, didFetchItems" */
    fetchItems(relativeCoord?: [x: number, y: number]): SingleActionFactory;
    cleanup(): SingleActionFactory;
}
export interface CanvasCacheEvents extends CanvasCacheInput {
    didFetchLines(lines: Iterable<string>): SingleActionFactory;
    onRenderItem(x: number, y: number, units: number[], style: TextStyle): SingleActionFactory;
    onClearItem(x: number, y: number, width: number): SingleActionFactory;
    didFetchItems(): SingleActionFactory;
    cache(lines: RedBlackTree<number, CacheLine>): SingleActionFactory;
}
export type CanvasCacheOptions = CoreOptions<CanvasCacheInput>;
export declare const canvasCacheFac: BaseReactorFactory<CanvasCacheEvents, readonly ["cache"], CoreOptions<CanvasCacheEvents>, []>;
export type CanvasCache = SimplexReactor<CanvasCacheEvents>;
export {};
