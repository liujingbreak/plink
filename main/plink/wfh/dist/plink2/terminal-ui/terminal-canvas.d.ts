import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
export interface TerminalCanvasInput {
    setTop(y: number): SingleActionFactory;
    setHeight(h: number): SingleActionFactory;
    addString(x: number, y: number, text: string): SingleActionFactory;
    clearLines(yBegin: number, yEndInclude: number): SingleActionFactory;
    render(): SingleActionFactory;
}
export interface TerminalCanvasOutput {
    boundingSize(x: number, y: number): SingleActionFactory;
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    printText(x: number, y: number, text: string): SingleActionFactory;
}
declare const tableFor: readonly ["boundingSize", "setHeight", "setTop"];
export declare function createTerminalCanvas(): SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, readonly ["boundingSize", "setHeight", "setTop"]>;
export type TerminalCanvas = SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, typeof tableFor>;
export {};
