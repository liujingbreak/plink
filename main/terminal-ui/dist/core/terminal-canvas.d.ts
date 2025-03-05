import { SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac, ActionMeta } from '@wfh/reactivizer';
import { canvasFac } from './canvas';
import { KeyEventServcie } from './keyEvent';
export interface TerminalCanvasInput {
    setFullScreenMode(keyEventService?: KeyEventServcie): SingleActionFactory;
    /** If width or height is larger than the number of available columens and rows,
    * it is same effect as "setFullScreenMode" */
    setSize(width: number, height: number, keyEventService?: KeyEventServcie): SingleActionFactory;
    scrollUp(lines: number): SingleActionFactory;
    scrollDown(lines: number): SingleActionFactory;
    autoHideCursor(): SingleActionFactory;
    /** Replied by "doneReportCursor", Terminal-keyEvent service must be enabled before dispatching this action */
    reportCursor(keyEventService: KeyEventServcie): SingleActionFactory;
    /**
     * move cursor to right bottom corner of the canvas and print a line wrap character,
    * so that when process exits, terminal's cursor will be right beginning of next empty line,
    * this leaves a clear screen of previous printed content.
    *
    * There is a message "onPrintDescentEndFlushed" follows after `stdout.write()`'s callback is executed.
    **/
    printDescentEnd(): SingleActionFactory;
}
interface TerminalCanvasEvents extends TerminalCanvasInput {
    /** In context of action "reportCursor", 0 based number */
    doneReportCursor(col: number, row: number): SingleActionFactory;
    onKeyEventService(keyEventService: KeyEventServcie): SingleActionFactory;
    /** A event dispatched after all onPrintText messages for a single corresponding "render" event are
     * handled and relavant process.stdout.write callbacks are called.
    * This message is under context of "render" message */
    onWriteFlushed(renderActionMeta: ActionMeta): SingleActionFactory;
    /** In context of printDescentEnd */
    onPrintDescentEndFlushed(): SingleActionFactory;
}
export type TerminalCanvasOpts = CreateOptsInDef<TerminalCanvasEvents, typeof canvasFac>;
export declare const terminalCanvasFac: import("@wfh/reactivizer").DerivedReactorFactory<TerminalCanvasEvents, readonly ["onKeyEventService"], [opts?: import("@wfh/reactivizer").CoreOptions<import("./canvas").CanvasEvents & TerminalCanvasEvents> | undefined], import("./canvas").CanvasEvents, readonly ["setBounding", "setRootComponent", "internalCache"], [opts?: import("@wfh/reactivizer").CoreOptions<import("./canvas").CanvasEvents> | undefined]>;
export type TerminalCanvas = SimplexReactorOfFac<typeof terminalCanvasFac>;
export declare function createTerminalCanvas(opts?: TerminalCanvasOpts): import("@wfh/reactivizer").DerivedSimplexReactor<TerminalCanvasEvents & import("./canvas").CanvasEvents, readonly ("setBounding" | "setRootComponent" | "internalCache" | "onKeyEventService")[]>;
export {};
