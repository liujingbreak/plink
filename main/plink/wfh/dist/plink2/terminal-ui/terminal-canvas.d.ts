import { mat4 } from 'gl-matrix';
import chalk from 'chalk';
import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { BaseWidgetActions } from './terminal-widget';
export type TextStyle = (typeof chalk.Modifiers | typeof chalk.Color | `rgb(${number},${number},${number})` | `bgRgb(${number},${number},${number})` | `hex${string}` | `bgHex${string}`)[];
export interface TerminalRootActions {
    render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    setSize: BaseWidgetActions['setSize'];
}
export interface TerminalCanvasInput {
    /** Set to `true` for rerender all lines even those lines are not changed, this way it clears terminal screen for every frame, default is `false` */
    setAlwaysRerenderAll(alwaysRerender: boolean): SingleActionFactory;
    /** render will not work until this message is dispatched */
    setClientWindowSize(w: number, h: number): SingleActionFactory;
    setHeight(h: number | 'full'): SingleActionFactory;
    setRootWidget<I extends TerminalRootActions>(rootWidget: SimplexReactor<I, any>): SingleActionFactory;
    addString(x: number, y: number, text: string, style?: TextStyle): SingleActionFactory;
    addDisplayUnits(x: number, y: number, units: number[], style?: TextStyle): SingleActionFactory;
    clearRect(x: number, y: number, width: number, height: number): SingleActionFactory;
    render(): SingleActionFactory;
}
export interface TerminalCanvasOutput {
    onSize(x: number, y: number): SingleActionFactory;
    setTop(y: number): SingleActionFactory;
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    onPrintText(x: number, y: number, text: string): SingleActionFactory;
    onClearLine(y: number, x?: number, dir?: 0 | 1 | -1): SingleActionFactory;
}
declare const tableFor: readonly ["setAlwaysRerenderAll", "onSize", "setHeight", "setTop", "setRootWidget"];
export declare function createTerminalCanvas(): SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, readonly ["setAlwaysRerenderAll", "onSize", "setHeight", "setTop", "setRootWidget"]>;
export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;
export declare function getTextDisplayUnits(text: string): Generator<number, number[], unknown>;
export {};
