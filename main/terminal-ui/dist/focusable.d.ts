import { SimplexReactor, SingleActionFactory, SimplexReactorExtendType, ActionMeta, SimplexReactorOptions } from '@wfh/reactivizer';
import { BaseWidget, OffsetParent } from './base';
import { Rectangle, TerminalCanvas, TextStyle } from './canvas';
import { KeyEventServcie, KeyEventEnum } from './keyEvent';
export declare enum SearchDirection {
    down = 0,
    up = 1,
    right = 2,
    left = 3
}
export interface FocusableMessages {
    forRootComp(rootComp: BaseWidget): SingleActionFactory;
    /** Pointing to the only top level focus service, which stores global states */
    rootService(root: RootFocusService): SingleActionFactory;
    removeFocusable(comp: BaseWidget): SingleActionFactory;
    addChild(svc: OffsetParent): SingleActionFactory;
    removeChild(svc: OffsetParent): SingleActionFactory;
    onRectChange(rect: Rectangle, c: BaseWidget): SingleActionFactory;
    onRectRemoved(rect: Rectangle, c: BaseWidget): SingleActionFactory;
    focus(direction: SearchDirection, origKey: KeyEventEnum, handleKeyEventsAction: ActionMeta['i']): SingleActionFactory;
    /** In context of "focus" */
    didFocus(resultRect?: Rectangle, component?: BaseWidget): SingleActionFactory;
    /** In context of "focus" and handleKeyEvents */
    didFocusEnd(dir: SearchDirection, origKey: KeyEventEnum): SingleActionFactory;
    render(canvas: TerminalCanvas): SingleActionFactory;
    handleKeyEvents(keyService: KeyEventServcie, currKey: KeyEventEnum | null): SingleActionFactory;
    controlHandleEvents(stop: boolean): SingleActionFactory;
    onFocusOutside(dir: SearchDirection): SingleActionFactory;
    requestRerenderFor(rect: Rectangle): SingleActionFactory;
}
export interface RootFocusableEvents {
    onFocus(comp: BaseWidget | null, srcService: FocusService | null): SingleActionFactory;
    latestRenderedRect(rect: Rectangle): SingleActionFactory;
    setBorderStyle(...styles: TextStyle): SingleActionFactory;
}
declare const tableFor: readonly ["didFocus", "handleKeyEvents", "rootService", "controlHandleEvents"];
export type FocusService = SimplexReactor<FocusableMessages, typeof tableFor>;
export type FocusableOptions = Partial<SimplexReactorOptions<FocusableMessages, typeof tableFor>>;
export declare function createFocusService(opts?: FocusableOptions): SimplexReactor<FocusableMessages, readonly ["didFocus", "handleKeyEvents", "rootService", "controlHandleEvents"]>;
declare const tableForRoot: readonly ["setBorderStyle", "onFocus", "latestRenderedRect"];
export declare function createRootService(keyEventService: KeyEventServcie, opts?: FocusableOptions): SimplexReactor<FocusableMessages & RootFocusableEvents, readonly ("didFocus" | "handleKeyEvents" | "rootService" | "controlHandleEvents" | "setBorderStyle" | "onFocus" | "latestRenderedRect")[]>;
export type RootFocusService = SimplexReactorExtendType<FocusService, RootFocusableEvents, typeof tableForRoot>;
export {};
