import { SimplexReactor, SingleActionFactory, ActionMeta, BaseReactorFactory, CoreOptions } from '@wfh/reactivizer';
import { RedBlackTree } from '@wfh/algorithms';
import { BaseWidget } from './base';
import { Rectangle, TerminalCanvas } from './canvas';
import { CanvasFilterOutput, CanvasFilterInput } from './canvas-filter';
import { KeyEventServcie, KeyEventEnum } from './keyEvent';
import { CanvasCacheOptions } from './canvas-cache';
export declare enum SearchDirection {
    down = 0,
    up = 1,
    right = 2,
    left = 3,
    tabNext = 4
}
export interface FocusMessages {
    forRootComp(rootComp: BaseWidget): SingleActionFactory;
    onFocus(compName: string, comp: BaseWidget | null, srcService: FocusService | null): SingleActionFactory;
    /** Should only be dispatched on top level FocusService */
    switchFocus(srcFocusSvc: FocusService | null, compName: string | null, comp: BaseWidget | null, srcService: FocusService | null): SingleActionFactory;
    /** Pointing to the only top level findFocusable service, which stores global states */
    removeFocusable(comp: BaseWidget): SingleActionFactory;
    onRectChange(rect: Rectangle, c: BaseWidget): SingleActionFactory;
    onRectRemoved(rect: Rectangle, c: BaseWidget): SingleActionFactory;
    findFocusable(direction: SearchDirection, handleKeyEventsAction: ActionMeta['i']): SingleActionFactory;
    /** In context of "findFocusable", when next focusable is found */
    didFound(resultRect?: Rectangle, component?: BaseWidget, tabIndex?: number): SingleActionFactory;
    /** In context of "findFocusable" and handleKeyEvents, dispatched when
     * there is no next focusable on current direction */
    didNotFound(dir: SearchDirection): SingleActionFactory;
    handleKeyEvents(keyService: KeyEventServcie, currDir?: SearchDirection, currKey?: KeyEventEnum | null): SingleActionFactory;
    stopHandleKeyEvents(): SingleActionFactory;
    pauseHandleEvents(): SingleActionFactory;
    resumeHandleEvents(): SingleActionFactory;
    /** default is false, */
    isPaused(paused: boolean): SingleActionFactory;
    searchTree(xTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>, yTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>): SingleActionFactory;
    renderFor(comp: BaseWidget): SingleActionFactory;
    clearFor(comp: BaseWidget): SingleActionFactory;
}
declare const tableFor: readonly ["didFound", "handleKeyEvents", "searchTree", "isPaused", "forRootComp"];
export type FocusService = SimplexReactor<FocusMessages & CanvasFilterOutput & CanvasFilterInput, typeof tableFor>;
export type FocusServiceOpts = CoreOptions<FocusMessages & CanvasFilterOutput & CanvasFilterInput> & {
    cache?: CanvasCacheOptions;
};
export declare const focusServiceFac: BaseReactorFactory<FocusMessages & CanvasFilterOutput & CanvasFilterInput, readonly ["didFound", "handleKeyEvents", "searchTree", "isPaused", "forRootComp"], [canvas: TerminalCanvas, opts?: FocusServiceOpts | undefined]>;
export type RootFocusServiceOpts = FocusServiceOpts;
export declare const rootFocusSvcFac: import("@wfh/reactivizer").DerivedReactorFactory<Record<string, never>, readonly ["switchFocus"], [canvas: TerminalCanvas, opts?: FocusServiceOpts | undefined], FocusMessages & CanvasFilterOutput & CanvasFilterInput, readonly ["didFound", "handleKeyEvents", "searchTree", "isPaused", "forRootComp"], [canvas: TerminalCanvas, opts?: FocusServiceOpts | undefined]>;
export type RootFocusService = FocusService;
export {};
