import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, Action, InferMapParam, CreateOptsOfFac, SimplexReactorOfFac } from '@wfh/reactivizer';
import { Canvas, Rectangle } from './canvas';
import { BaseWidget } from './base';
export interface TerminalContainerInput {
    addChild(...children: BaseWidget[]): SingleActionFactory;
    insertChild(beforeIndex: number, children: BaseWidget[]): SingleActionFactory;
    removeChild(...children: BaseWidget[]): SingleActionFactory;
    /** set those messages which should be considered as "isLayoutDirty" once changed,
     * a "isLayoutDirty" message will be dispatched and follows "clear" and "needRerender" */
    setLayoutCheck(watchTaget: rx.Observable<InferMapParam<any>>): SingleActionFactory;
    /** define which message observables are able to trigger "reflow", be aware that "requestReflowOn" will clean up previous setup */
    addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    /** @deprecated use requestReflowOn, requestReflow instead */
    latestReflowData(data$: rx.Observable<InferMapParam<any>>): SingleActionFactory;
    requestReflow(reason?: string): SingleActionFactory;
    requestReflowOn<P extends [...(rx.Observable<Action<any>> | rx.Observable<InferMapParam<any>>)[]]>(...actionOrPayloads: P): SingleActionFactory;
    /** Respond by didFindOverlaps, coordinate value should be relative to current component's offsetParent (i.e value of onBoundingBox ).
     * Use DFS to lookup all components including all ancestor containers */
    findOverlaps(...rect: Rectangle): SingleActionFactory;
}
export interface TermainlContainerEvents extends TerminalContainerInput {
    renderSelf(canvas: Canvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: Canvas, absTransform: mat4, clipArea: Rectangle[], maskArea: Rectangle[]): SingleActionFactory;
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
    /** set to true if expecting "reflow" during next rendering phase */
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
     *    1) For every "allDisplayChildren" dispatch "onSize" of corresponding child component
     *    2) Dispatch "onChildPositions" for corresponding latest "allDisplayChildren"
     **/
    reflow(clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
    /** isLayoutDirty represents the actual layout change after "reflow" is handled,
     *
     * Value is changed against the observable of "setLayoutCheck", which
     * can be used to configure what should considered as "layout changed", default is
     * merged observable of values change of children position, size and current component's
     * size
     */
    isLayoutDirty(yes: boolean): SingleActionFactory;
    /** Being relied by ElevatorContainer */
    isOpaque(yes: boolean): SingleActionFactory;
    /** In context of findOverlaps */
    didFindOverlaps(children: BaseWidget[]): SingleActionFactory;
}
export declare const baseContainerFac: import("@wfh/reactivizer").DerivedReactorFactory<TermainlContainerEvents, readonly ["allChildren", "allDisplayChildren", "setLayoutValid", "onChildPreferredSizeChange", "hasOfflineCanvas", "onChildPositions", "isOpaque", "latestReflowData", "isLayoutDirty", "setLayoutCheck"], [], import("./base").BaseWidgetEvents, readonly ["onSize", "onTransform", "onPosition", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDetached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "setRenderChanges", "isContainer", "depth", "focusService"], []>;
export type TerminalContainerOpts = CreateOptsOfFac<typeof baseContainerFac>;
export type TerminalContainer = SimplexReactorOfFac<typeof baseContainerFac>;
