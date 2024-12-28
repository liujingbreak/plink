import { SimplexReactor, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { Scrollable } from './scrollable';
export interface KeyScrollingMsg {
    setPageSize(w: number, h: number): SingleActionFactory;
    bindToScrollable(scrollable: Scrollable): SingleActionFactory;
    /** default is process.stdin
     * @param isTTY set to `true` to enable "readline" module's "emitKeypressEvents()",
     * and enable "setRawMode(true)" on that TTY readable stream
     */
    setInputStream(stream: NodeJS.ReadableStream, isTTY: boolean): SingleActionFactory;
}
interface KeyEvents {
    onMouseEvent(evt: MouseEventOpts, x: number, y: number, evtSequence: string): SingleActionFactory;
    onFocusChange(dir: KeyEventEnum.focusLeft | KeyEventEnum.focusRight | KeyEventEnum.focusUp | KeyEventEnum.focusDown | KeyEventEnum.focusNext, amount: number): SingleActionFactory;
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
export declare enum KeyEventEnum {
    scrollLeft = 0,
    scrollRight = 1,
    scrollUp = 2,
    scrollDown = 3,
    scrollTop = 4,
    scrollBottom = 5,
    home = 6,
    end = 7,
    focusLeft = 8,
    focusRight = 9,
    focusUp = 10,
    focusDown = 11,
    focusNext = 12
}
export interface keypressSignals extends KeyScrollingMsg, KeyEvents {
    onRawKeyInput(event: RawKeyEvent): SingleActionFactory;
    onKeypress(event: RawKeyEvent, fallback: boolean): SingleActionFactory;
    onDisplayKeys(text: string, isCompleted: boolean, isValid: boolean): SingleActionFactory;
    onInputCompleted(completed: boolean, valid: boolean): SingleActionFactory;
    onBreak(): SingleActionFactory;
    onDigital(chr: string): SingleActionFactory;
    consumeMultiKey(evt: RawKeyEvent): SingleActionFactory;
    didConsumeMultiKey(action: KeyEventEnum | null, amount: number): SingleActionFactory;
    consumeDigital(c: string): SingleActionFactory;
    consumePageAction(event: RawKeyEvent): SingleActionFactory;
    doneConsumePageAction(action: KeyEventEnum, amount?: number): SingleActionFactory;
    consumeDirKey(c: string): SingleActionFactory;
    doneConsumeDigital(value: number): SingleActionFactory;
    onReportCursor(x: number, y: number): SingleActionFactory;
}
declare const tableFor: readonly ["setPageSize", "onDisplayKeys", "onInputCompleted", "setInputStream"];
interface RawKeyEvent {
    name: string | undefined;
    sequence: string;
    ctrl: boolean;
    shift: boolean;
    code?: string;
}
export type KeyEventServcie = SimplexReactor<keypressSignals, typeof tableFor>;
export type KeyEventOptions = CoreOptions<keypressSignals>;
export declare function createKeyEventService(opts?: KeyEventOptions): SimplexReactor<keypressSignals, readonly ["setPageSize", "onDisplayKeys", "onInputCompleted", "setInputStream"]>;
interface MouseEventOpts {
    type: 'mousemove' | 'mouseup' | 'mousedown' | 'wheel';
    direction?: number;
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;
}
export {};
