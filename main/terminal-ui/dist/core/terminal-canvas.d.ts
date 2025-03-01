import { SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac } from '@wfh/reactivizer';
import { canvasFac } from './canvas';
import { KeyEventServcie } from './keyEvent';
export interface TerminalCanvasInput {
    setFullScreenMode(): SingleActionFactory;
    /** If width or height is larger than the number of available columens and rows,
    * it is same effect as "setFullScreenMode" */
    setSize(width: number, height: number, keyEventService: KeyEventServcie): SingleActionFactory;
    scrollUp(lines: number): SingleActionFactory;
    scrollDown(lines: number): SingleActionFactory;
    autoHideCursor(): SingleActionFactory;
    /** Replied by "doneReportCursor", Terminal-keyEvent service must be enabled before dispatching this action */
    reportCursor(keyEventService: KeyEventServcie): SingleActionFactory;
}
interface TerminalCanvasEvents extends TerminalCanvasInput {
    /** In context of action "reportCursor", 0 based number */
    doneReportCursor(col: number, row: number): SingleActionFactory;
}
export type TerminalCanvasOpts = CreateOptsInDef<TerminalCanvasEvents, typeof canvasFac>;
export declare const terminalCanvasFac: import("@wfh/reactivizer").DerivedReactorFactory<TerminalCanvasEvents, readonly [], [opts?: import("@wfh/reactivizer").CoreOptions<import("./canvas").CanvasEvents & TerminalCanvasEvents> | undefined], import("./canvas").CanvasEvents, readonly ["setBounding", "setRootComponent", "internalCache"], [opts?: import("@wfh/reactivizer").CoreOptions<import("./canvas").CanvasEvents> | undefined]>;
export type TerminalCanvas = SimplexReactorOfFac<typeof terminalCanvasFac>;
export declare function createTerminalCanvas(opts?: TerminalCanvasOpts): import("@wfh/reactivizer").DerivedSimplexReactor<TerminalCanvasEvents & import("./canvas").CanvasEvents, readonly ("setBounding" | "setRootComponent" | "internalCache")[]>;
export {};
