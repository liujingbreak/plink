import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor, SimplexReactorMergeType, Action, InferMapParam, OptionsOfSmplxRctr } from '@wfh/reactivizer';
import { TerminalCanvas, Rectangle } from './canvas';
import { BaseWidget, BaseWidgetRenderData, BaseWidgetEvents } from './base';
export interface TerminalContainerInput {
    addChild(...children: BaseWidget[]): SingleActionFactory;
    insertChild(beforeIndex: number, children: BaseWidget[]): SingleActionFactory;
    removeChild(...children: BaseWidget[]): SingleActionFactory;
    /** @deprecated use latestReflowData instead.
     * If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
    addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    latestReflowData(data$: rx.Observable<unknown>): SingleActionFactory;
    /** Respond by didFindOverlaps, coordinate value should be relative to current component's offsetParent */
    findOverlaps(...rect: Rectangle): SingleActionFactory;
}
export interface TermainlContainerEvents extends TerminalContainerInput {
    /** implement should dispatch this event in "onRender" hanlder,
     * Default implementation is about: reflow, clear background, set flags
     **/
    renderSelf(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4, clipArea: Rectangle[], maskArea: Rectangle[]): SingleActionFactory;
    allChildren(children: Array<BaseWidget>): SingleActionFactory;
    /** all children whose "setDisplay" is not `none` */
    allDisplayChildren(children: Array<BaseWidget>): SingleActionFactory;
    /** Under context of "relow" action.
     * The coordinate value is relative to container component.
     * @param positions the length of this parameter must equals to "allDisplayChildren"'s length
     **/
    onChildPositions(positions: Map<BaseWidget, [number, number]>): SingleActionFactory;
    onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
    /** size of component which is "setDisplay" `none` is excluded */
    onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
    setLayoutValid(isValid: boolean): SingleActionFactory;
    /** Implementation container should set proper initial value, for container like "scrollable" whose child
     * component is actually rendered to another canvas other than the containing one, they must set this
     * value to `true`, so that consumer knowns whether child components of this type of container has a different
     * rendering coordinate. Also see `BaseWidgetEvents["onBoundingBox"]`
     */
    hasOfflineCanvas(yes: boolean): SingleActionFactory;
    /** This message is when to calculate layout information like postion and size of children component, for later rendering,
     * this message is only signaled when latest "setLayoutValid" is `false`.
     * Implementation must handle this event to finish 2 tasks:
     *    1) For every "allDisplayChildren" dispatch "onSize" of child component
     *    2) Dispatch corresponding "onChildPositions" for latest "allDisplayChildren"
     **/
    reflow(clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
    /** No reaction yet , preserve for the future */
    renderBackgroundFor(child: BaseWidget): SingleActionFactory;
    /** Being relied by ElevatorContainer */
    isOpaque(yes: boolean): SingleActionFactory;
    /** In context of findOverlaps */
    didFindOverlaps(children: BaseWidget[]): SingleActionFactory;
}
declare const tableFor: readonly ["allChildren", "allDisplayChildren", "setLayoutValid", "onChildPreferredSizeChange", "hasOfflineCanvas", "onChildPositions", "isOpaque", "latestReflowData"];
export type TerminalContainer = SimplexReactorMergeType<BaseWidget, SimplexReactor<TermainlContainerEvents, typeof tableFor>>;
export type TerminalContainerOpts = Partial<OptionsOfSmplxRctr<TerminalContainer>>;
export declare function createContainerBase<S = BaseWidgetRenderData>(opts?: TerminalContainerOpts): SimplexReactor<BaseWidgetEvents<S> & TermainlContainerEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData")[]>;
export {};
