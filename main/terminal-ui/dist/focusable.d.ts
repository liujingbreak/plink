import { SimplexReactor, SingleActionFactory, SimplexReactorExtendType, ActionMeta, CreateOptsInDef, BaseReactorFactory, CoreOptions } from '@wfh/reactivizer';
import { BaseWidget, OffsetParent } from './base';
import { Rectangle, TerminalCanvas } from './canvas';
import { KeyEventServcie, KeyEventEnum } from './keyEvent';
export declare enum SearchDirection {
    down = 0,
    up = 1,
    right = 2,
    left = 3
}
export interface FocusableMessages {
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
    render(canvas: TerminalCanvas, highlightComp: BaseWidget): SingleActionFactory;
    handleKeyEvents(keyService: KeyEventServcie, currKey: KeyEventEnum | null): SingleActionFactory;
    controlHandleEvents(stop: boolean): SingleActionFactory;
    onFocusOutside(dir: SearchDirection): SingleActionFactory;
}
declare const tableFor: readonly ["didFocus", "handleKeyEvents", "rootService", "controlHandleEvents"];
export type FocusService = SimplexReactor<FocusableMessages, typeof tableFor>;
export type FocusableOptions = CoreOptions<FocusableMessages>;
export declare const focusServiceFac: BaseReactorFactory<FocusableMessages, readonly ["didFocus", "handleKeyEvents", "rootService", "controlHandleEvents"], [opts?: FocusableOptions | undefined]>;
export declare function createFocusService(opts?: FocusableOptions): SimplexReactor<FocusableMessages, readonly ["didFocus", "handleKeyEvents", "rootService", "controlHandleEvents"]>;
export interface RootFocusableEvents {
    forRootComp(rootComp: BaseWidget): SingleActionFactory;
    onFocus(name: string, comp: BaseWidget | null, srcService: FocusService | null): SingleActionFactory;
    _canvas(c: TerminalCanvas): SingleActionFactory;
}
declare const tableForRoot: readonly ["forRootComp", "onFocus", "_canvas"];
export declare const rootFocusSvc: import("@wfh/reactivizer").DerivedReactorFactory<RootFocusableEvents, readonly ["forRootComp", "onFocus", "_canvas"], [keyEventService: KeyEventServcie, opts?: CoreOptions<FocusableMessages & RootFocusableEvents> | undefined], FocusableMessages, readonly ["didFocus", "handleKeyEvents", "rootService", "controlHandleEvents"], [opts?: FocusableOptions | undefined]>;
export declare function createRootService(keyEventService: KeyEventServcie, opts?: CreateOptsInDef<RootFocusableEvents, typeof focusServiceFac>): import("@wfh/reactivizer").DerivedSimplexReactor<RootFocusableEvents & FocusableMessages, readonly ("didFocus" | "handleKeyEvents" | "rootService" | "controlHandleEvents" | "forRootComp" | "onFocus" | "_canvas")[]>;
export type RootFocusService = SimplexReactorExtendType<FocusService, RootFocusableEvents, typeof tableForRoot>;
export {};
