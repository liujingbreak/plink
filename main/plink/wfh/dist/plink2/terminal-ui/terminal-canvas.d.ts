import { mat4 } from 'gl-matrix';
import chalk from 'chalk';
import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { IntervalTree } from '@wfh/algorithms';
import { BaseWidgetActions } from './terminal-widget';
export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `hsl(${string})` | `bgHsl(${string})` | `bgRgb(${number},${number},${number})` | `hex(${string})` | `bgHex(${string})`)[];
export type BackgroundStyle = typeof chalk.BackgroundColor | `bgRgb(${number},${number},${number})` | `bgHex(${string})` | `bgHsl(${string})`;
export interface TerminalRootActions {
    render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    setSize: BaseWidgetActions['setSize'];
}
declare enum RenderMode {
    dirty = 0,
    clearLine = 1,
    clearScreen = 2
}
export interface TerminalCanvasInput {
    /** Set to `true` for rerender all lines even those lines are not changed, this way it clears terminal screen for every frame, default is `false` */
    setRenderMode(mode: RenderMode): SingleActionFactory;
    /** render will not work until this message is dispatched */
    setBounding(left: number, top: number, width: number, height: number): SingleActionFactory;
    setRootWidget<I extends TerminalRootActions>(rootWidget: SimplexReactor<I, any> | null): SingleActionFactory;
    addString(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
    addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle): SingleActionFactory;
    /** Unlike print ' ' (space), this action only remove existing "code point" from buffer for rendering */
    clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
    render(): SingleActionFactory;
    copyRect(x: number, y: number, width: number, height: number): SingleActionFactory;
    doneCopyRect(lines: (IntervalTree<readonly [units: number[], style: string]> | undefined)[]): SingleActionFactory;
    setCursorVisible(visible: boolean): SingleActionFactory;
}
export interface TerminalCanvasOutput {
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    onPrintText(x: number, y: number, text: string): SingleActionFactory;
    onClearLine(y: number, x?: number, dir?: 0 | 1 | -1): SingleActionFactory;
}
declare const tableFor: readonly ["setRenderMode", "setBounding", "setRootWidget"];
export declare function createTerminalCanvas(): SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, readonly ["setRenderMode", "setBounding", "setRootWidget"]>;
export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;
export declare function getTextDisplayUnits(text: string): Generator<number, number[], unknown>;
export {};
