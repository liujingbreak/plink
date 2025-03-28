import chalk from 'chalk';
import { BaseReactorFactory, SingleActionFactory, ActionMeta, SimplexReactor, CoreOptions } from '@wfh/reactivizer';
import { IntervalTree } from '@wfh/algorithms';
import { BaseWidget } from './base.js';
import { CanvasFilter } from './canvas-filter.js';
export type BackgroundStyle = typeof chalk.BackgroundColor | `bgRgb(${number},${number},${number})` | `bgHex(${string})` | `bgHsl(${string})` | `bgAnsi(${string})` | `bgAnsi256(${string})`;
export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `hsl(${string})` | `bgHsl(${string})` | `bgRgb(${number},${number},${number})` | `hex(${string})` | `bgHex(${string})` | `ansi(${string})` | `ansi256(${string})` | `bgAnsi(${string})` | `bgAnsi256(${string})` | BackgroundStyle)[];
export type LineElement = IntervalTree<[units: number[], style: string]>;
export interface CanvasInput {
    /** render will not work until this message is dispatched */
    setBounding(left: number, top: number, width: number, height: number): SingleActionFactory;
    setRootComponent(rootWidget: BaseWidget | null): SingleActionFactory;
    addString(x: number, y: number, text: string, style?: TextStyle, byPassFilter?: boolean): SingleActionFactory;
    addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle | null, byPassFilter?: boolean): SingleActionFactory;
    /** Unlike print ' ' (space), this action only remove existing "code point" from buffer for rendering */
    clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
    /** Set to `true`, canvas will automatically execute render() in setImmediate phase as response to previous message "requestRender",
     * otherwise consumer must manually call render() to actually render buffered content to output stream,
     * default is `false`
     **/
    setRenderOnRequest(enabled: boolean): SingleActionFactory;
    /** For any "addString" and "addDisplayUnits" messages, if it intersects specified rectangle,
     * then dispatch "onRenderForFilter", until "removeRenderFilter" is dispatched,
     * to replace with new display units, one should dispatch "addDisplayUnits(..., byPassFilter: true)",
     * must use "byPassFilter" as `true` to avoid being endless recursively caught by filters */
    addRenderFilter(rect: Rectangle, filter: CanvasFilter): SingleActionFactory;
    updateRenderFilter(addId: ActionMeta, rect: Rectangle): SingleActionFactory;
    removeRenderFilter(addId: ActionMeta): SingleActionFactory;
    /** request bundling rendering */
    requestRender(rect?: Rectangle): SingleActionFactory;
    /** render immediately */
    render(rect?: Rectangle[]): SingleActionFactory;
    fillRect(x: number, y: number, width: number, height: number, bg: BackgroundStyle): SingleActionFactory;
    /** Response: didCopyRect */
    copyRect(x: number, y: number, width: number, height: number, fill?: string): SingleActionFactory;
    /** @param noColor default value is `false`, response message "didTakeSnapshot" */
    takeSnapshot(opts?: {
        noColor?: boolean;
        /** By default the response message "didTakeSnapshot" contains "pro" as for prospective screen lines, not "commited"
         * lines or uncommited lines, this property indicates which type of caches lines should be take as source
         **/
        type?: 'commited' | 'uncommited' | 'pro';
    }): SingleActionFactory;
}
export interface CanvasEvents extends CanvasInput {
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    onPrintText(x: number, y: number, text: string): SingleActionFactory;
    /** In context of "render", this message is dispatched after a single frame is `rendered` */
    onRendered(): SingleActionFactory;
    /** Invoke TTY API to actually clear line from the screen immediately */
    onClearLine(y: number, x?: number, dir?: 0 | 1 | -1): SingleActionFactory;
    didCopyRect(paintables: Array<[xLow: number, xHigh: number, y: number, units: number[], style: string]>): SingleActionFactory;
    internalCache(lines: (LineElement | undefined)[], proLines: (LineElement | undefined)[], uncommited: (LineElement | undefined)[]): SingleActionFactory;
    didTakeSnapshot(lines: Iterable<string>): SingleActionFactory;
}
declare const tableFor: readonly ["setBounding", "setRootComponent", "internalCache"];
export type Canvas = SimplexReactor<CanvasEvents, typeof tableFor>;
export type CanvasOptions = CoreOptions<CanvasEvents>;
export declare const canvasFac: BaseReactorFactory<CanvasEvents, readonly ["setBounding", "setRootComponent", "internalCache"], [opts?: CoreOptions<CanvasEvents> | undefined]>;
export declare function getTextDisplayUnits(text: string): Generator<number, number[], unknown>;
export declare const SPACE_CODE_POINT: number;
/** Inputed and returned "high" value is considered as an "included" value of range interval */
export declare function uniteDisplayUnits<T extends [low: number, high: number, units: number[], style: string]>(line: LineElement, target: T): void;
export type Range = [low: number, high: number];
export type Rectangle = [x: number, y: number, w: number, h: number];
export declare function rectIntersection([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle): Rectangle | null;
export declare function treeNodeToStyleText([codePoints, style]: [units: number[], style?: string]): string;
export declare function debugLineTrees(lines: (LineElement | undefined)[], colorful?: boolean): string;
export declare function debugLineTree(tree: LineElement, colorful?: boolean): string;
export {};
