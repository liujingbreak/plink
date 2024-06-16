import { SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
export interface TerminalCanvasInput {
    setTopPosition(y: number): SingleActionFactory;
    setHeight(h: number): SingleActionFactory;
    addString(x: number, y: number, text: string): SingleActionFactory;
    render(): SingleActionFactory;
}
export interface TerminalCanvasOutput {
    boundingSize(x: number, y: number): SingleActionFactory;
    /** In context of "render", x, y are both absolute 0 based coordinates value */
    printText(x: number, y: number, text: string): SingleActionFactory;
}
export declare function createTerminalCanvas(): SimplexReactor<TerminalCanvasInput & TerminalCanvasOutput, readonly ["boundingSize", "setHeight"]>;
