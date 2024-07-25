import { SimplexReactor, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { Scrollable } from './terminal-scrollable';
import { TerminalCanvas } from './terminal-canvas';
export interface keypressActions {
    setPageSize(w: number, h: number): SingleActionFactory;
    bindToScrollable(scrollable: Scrollable): SingleActionFactory;
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
interface keypressSignals extends keypressActions {
    onRawKeyInput(event: KeyEvent): SingleActionFactory;
    onKeypress(event: KeyEvent, fallback: boolean): SingleActionFactory;
    onDisplayKeys(text: string): SingleActionFactory;
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
declare const tableFor: readonly ["setPageSize", "onDisplayKeys", "onInputCompleted"];
interface KeyEvent {
    name: string | undefined;
    sequence: string;
    ctrl: boolean;
    shift: boolean;
    code?: string;
}
export type KeyEventServcie = SimplexReactor<keypressSignals, typeof tableFor>;
export declare function createKeyEventService(canvas: TerminalCanvas, opts?: CoreOptions<keypressActions>): SimplexReactor<keypressSignals, readonly ["setPageSize", "onDisplayKeys", "onInputCompleted"], unknown>;
export {};
