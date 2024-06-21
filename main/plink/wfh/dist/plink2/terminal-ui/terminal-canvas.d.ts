import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { BaseWidgetActions } from './terminal-widget';
export interface TerminalRootActions {
    render(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    setSize: BaseWidgetActions['setSize'];
}
export interface TerminalCanvasInput {
    /** Set to `true` for rerender all lines even those lines are not changed, this way it clears terminal screen for every frame, default is `false` */
    setAlwaysRerenderAll(alwaysRerender: boolean): SingleActionFactory;
    setClientWindowSize(w: number, h: number): SingleActionFactory;
    setTop(y: number): SingleActionFactory;
    setHeight(h: number | 'full'): SingleActionFactory;
    setRootWidget(rootActions: TerminalRootActions): SingleActionFactory;
    addString(x: number, y: number, text: string): SingleActionFactory;
    addDisplayUnits(x: number, y: number, units: number[]): SingleActionFactory;
    clearLines(yBegin: number, yEndInclude: number): SingleActionFactory;
    render(): SingleActionFactory;
}
export interface TerminalCanvasOutput {
    onSize(x: number, y: number): SingleActionFactory;
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    onPrintText(x: number, y: number, text: string): SingleActionFactory;
    onClearLine(y: number): SingleActionFactory;
}
declare const tableFor: readonly ["setAlwaysRerenderAll", "onSize", "setHeight", "setTop", "setRootWidget"];
export declare function createTerminalCanvas(): SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, readonly ["setAlwaysRerenderAll", "onSize", "setHeight", "setTop", "setRootWidget"]>;
export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;
export declare function getTextDisplayUnits(text: string): Generator<number, number[], unknown>;
export {};
