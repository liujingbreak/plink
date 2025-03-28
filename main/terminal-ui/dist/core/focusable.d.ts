/**
 * User stories:
 * WHEN user press TAB or left, right,...key,
 *  and WHEN there is no existing "onFocus" component,
 *    THEN findFocusable on the most left top (corresponding to the pressed key)
 *    focusable component in viewport.
 *  otherwise findFocusable on "next" right focuable component.
 *
 * WHEN a focusable component is focused,
 *  onFocus event should be dispatched
 */
import * as rx from 'rxjs';
import { SimplexReactor, SingleActionFactory, ActionMeta, BaseReactorFactory, CoreOptions, SimplexReactorOfFac } from '@wfh/reactivizer';
import { RedBlackTree } from '@wfh/algorithms';
import { BaseWidget } from './base.js';
import { Rectangle, Canvas } from './canvas.js';
import { CanvasFilterOutput, CanvasFilterInput } from './canvas-filter.js';
import { KeyEventServcie, KeyEventEnum } from './keyEvent.js';
import { CanvasCacheOptions } from './canvas-cache.js';
export declare const ROOT_FOCUS_SERVICE_CONTEXT = "__rootFocus";
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
    switchFocus(srcFocusSvc: FocusService | null, compName: string | null, comp: BaseWidget | null): SingleActionFactory;
    /** Pointing to the only top level findFocusable service, which stores global states */
    removeFocusable(comp: BaseWidget): SingleActionFactory;
    onRectChange(rect: Rectangle, c: BaseWidget): SingleActionFactory;
    onRectRemoved(rect: Rectangle, c: BaseWidget): SingleActionFactory;
    findFocusable(direction: SearchDirection, handleKeyEventsAction: ActionMeta['i']): SingleActionFactory;
    locateFocusable(locateTrace: (readonly [FocusService, BaseWidget])[], index: number): SingleActionFactory;
    focusOnComponent(target: BaseWidget): SingleActionFactory;
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
export declare const focusServiceFac: BaseReactorFactory<FocusMessages & CanvasFilterOutput & CanvasFilterInput, readonly ["didFound", "handleKeyEvents", "searchTree", "isPaused", "forRootComp"], [canvas: Canvas, opts?: FocusServiceOpts | undefined]>;
export type RootFocusServiceOpts = FocusServiceOpts;
export declare const rootFocusSvcFac: import("@wfh/reactivizer").DerivedReactorFactory<Record<string, never>, readonly ["switchFocus"], [canvas: Canvas, opts?: FocusServiceOpts | undefined], FocusMessages & CanvasFilterOutput & CanvasFilterInput, readonly ["didFound", "handleKeyEvents", "searchTree", "isPaused", "forRootComp"], [canvas: Canvas, opts?: FocusServiceOpts | undefined]>;
export type RootFocusService = SimplexReactorOfFac<typeof rootFocusSvcFac>;
export declare function queryRootFocusService(currComp: BaseWidget, m?: ActionMeta): rx.Observable<import("@wfh/reactivizer").DerivedSimplexReactor<Record<string, never> & FocusMessages & CanvasFilterOutput & CanvasFilterInput, readonly ("didFound" | "handleKeyEvents" | "searchTree" | "isPaused" | "forRootComp" | "switchFocus")[]>>;
export {};
