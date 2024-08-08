import { SimplexReactor, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { Scrollable } from './scrollable';
import { TerminalCanvas } from './canvas';
export interface keypressInput {
    setPageSize(w: number, h: number): SingleActionFactory;
    bindToScrollable(scrollable: Scrollable): SingleActionFactory;
    /** default is process.stdin
     * @param isTTY set to `true` to enable "readline" module's "emitKeypressEvents()",
     * and enable "setRawMode(true)" on that TTY readable stream
     */
    setInputStream(stream: NodeJS.ReadableStream, isTTY: boolean): SingleActionFactory;
    onRight(amount: number): SingleActionFactory;
    onLeft(amount: number): SingleActionFactory;
    onUp(amount: number): SingleActionFactory;
    onDown(amount: number): SingleActionFactory;
    onBottom(): SingleActionFactory;
    onTop(): SingleActionFactory;
    onHome(): SingleActionFactory;
    onEnd(): SingleActionFactory;
    onExit(): SingleActionFactory;
}
interface keypressSignals extends keypressInput {
    onRawKeyInput(event: KeyEvent): SingleActionFactory;
    onKeypress(event: KeyEvent, fallback: boolean): SingleActionFactory;
    onDisplayKeys(text: string, isCompleted: boolean, isValid: boolean): SingleActionFactory;
    onInputCompleted(completed: boolean, valid: boolean): SingleActionFactory;
    onBreak(): SingleActionFactory;
    onDigital(chr: string): SingleActionFactory;
    consumeMultiKeyAction(evt: KeyEvent): SingleActionFactory;
    doneConsumeMultiKeyAction(action: 'left' | 'right' | 'up' | 'down' | 'top' | 'bottom' | 'home' | 'end' | null, amount: number): SingleActionFactory;
    consumeDigital(c: string): SingleActionFactory;
    consumePageAction(event: KeyEvent): SingleActionFactory;
    doneConsumePageAction(action: 'left' | 'right' | 'up' | 'down', amount?: number): SingleActionFactory;
    consumeDirKey(c: string): SingleActionFactory;
    doneConsumeDigital(value: number): SingleActionFactory;
    onReportCursor(x: number, y: number): SingleActionFactory;
}
declare const tableFor: readonly ["setPageSize", "onDisplayKeys", "onInputCompleted", "setInputStream"];
interface KeyEvent {
    name: string | undefined;
    sequence: string;
    ctrl: boolean;
    shift: boolean;
    code?: string;
}
export type KeyEventServcie = SimplexReactor<keypressSignals, typeof tableFor>;
export declare function createKeyEventService(canvas: TerminalCanvas, opts?: CoreOptions<keypressInput>): SimplexReactor<keypressSignals, readonly ["setPageSize", "onDisplayKeys", "onInputCompleted", "setInputStream"], unknown>;
export {};
