import chalk from 'chalk';
import { SingleActionFactory, SimplexReactor, CoreOptions } from '@wfh/reactivizer';
import { IntervalTree } from '@wfh/algorithms';
import { BaseWidget } from './terminal-widget';
import { KeyEventServcie } from './terminal-keyEvent';
export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `hsl(${string})` | `bgHsl(${string})` | `bgRgb(${number},${number},${number})` | `hex(${string})` | `bgHex(${string})`)[];
export type BackgroundStyle = typeof chalk.BackgroundColor | `bgRgb(${number},${number},${number})` | `bgHex(${string})` | `bgHsl(${string})`;
export interface TerminalCanvasInput {
    /** render will not work until this message is dispatched */
    setBounding(left: number, top: number, width: number, height: number): SingleActionFactory;
    setRootComponent(rootWidget: BaseWidget | null): SingleActionFactory;
    addString(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
    addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle): SingleActionFactory;
    /** Unlike print ' ' (space), this action only remove existing "code point" from buffer for rendering */
    clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
    setRenderOnRequest(enabled: boolean): SingleActionFactory;
    /** request bundling rendering */
    requestRender(): SingleActionFactory;
    render(): SingleActionFactory;
    copyRect(x: number, y: number, width: number, height: number): SingleActionFactory;
    copyDirtyRectAndClear(x: number, y: number, width: number, height: number): SingleActionFactory;
    autoHideCursor(): SingleActionFactory;
    scrollUp(lines: number): SingleActionFactory;
    scrollDown(lines: number): SingleActionFactory;
    /** Replied by "doneReportCursor", Terminal-keyEvent service must be enabled before dispatching this action */
    reportCursor(keyEventService: KeyEventServcie): SingleActionFactory;
}
export interface TerminalCanvasOutput {
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    onPrintText(x: number, y: number, text: string): SingleActionFactory;
    onClearLine(y: number, x?: number, dir?: 0 | 1 | -1): SingleActionFactory;
    onCopyRect(paintables: Array<[xLow: number, xHigh: number, y: number, units: number[], style: string]>): SingleActionFactory;
    doneCopyRect(lines: (IntervalTree<readonly [units: number[], style: string]> | undefined)[]): SingleActionFactory;
    onDirtyLineChange(lines: Map<number, [lowColumn: number, highColumn: number]>): SingleActionFactory;
    /** In context of action "reportCursor" */
    doneReportCursor(row: number, col: number): SingleActionFactory;
}
declare const tableFor: readonly ["setBounding", "setRootComponent", "onDirtyLineChange"];
export declare function createTerminalCanvas(opts?: CoreOptions<TerminalCanvasInput & TerminalCanvasOutput>): SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, readonly ["setBounding", "setRootComponent", "onDirtyLineChange"], unknown>;
export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;
export declare function getTextDisplayUnits(text: string): Generator<number, number[], unknown>;
export type Range = [low: number, high: number];
export type Rectangle = [x: number, y: number, w: number, h: number];
export declare function rectIntersection([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle): Rectangle | null;
export {};
