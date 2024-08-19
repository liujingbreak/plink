import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, CoreOptsOfExtSmplxRctr, SimplexReactor, SimplexReactorMergeType, Action, InferMapParam, SimplexReactorOptions } from '@wfh/reactivizer';
import { TerminalCanvas, Rectangle, BackgroundStyle } from './canvas';
export declare enum DisplayMode {
    visible = 0,
    none = 1,// like CSS display:none, does not take any space in layout
    hidden = 2
}
export interface BaseWidgetInput {
    /** The size set by this message will only affect "preference" size which is by default calculated by its content size,
     * but this size is only a suggestion provided to its container component,
     * the final size is decided by its container according to its layout feature,
     * e.g. In case its parent container is a FlexContainer, this value is acting like "flex-basis" as in Web CSS property,
     * the final size will be calculated also based on "setFlexGrow" or "setFlexShrink".
     **/
    setSize(width: number | `${number}%` | null, height: number | `${number}%` | null): SingleActionFactory;
    setFlexGrow(value: number): SingleActionFactory;
    setFlexShrink(value: number): SingleActionFactory;
    setDisplay(mode: DisplayMode): SingleActionFactory;
}
export interface BaseWidgetEvents extends BaseWidgetInput {
    /** to override automatical "preferredSize" in layout calculation */
    setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
    onSize(width: number, height: number): SingleActionFactory;
    /** Implementation needs to handle this event */
    querySizeOf(width: number | null, height: number | null): SingleActionFactory;
    /** Extended container implementation need to handle this event.
     * Be aware that an interceptor is filtering "preferredSize" action for distinctUntilChanged(),
     * which affects action table, some action will be skipped due to duplicate value */
    preferredSize(width: number, height: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
    overflow(yes: boolean): SingleActionFactory;
    setParent(p: TerminalContainer | null): SingleActionFactory;
    ofCanvas(canvas: TerminalCanvas | null): SingleActionFactory;
    /** this message will be intercepted and skipped if there is no "Rerender" action dispatched after last "render" message is handled,
     * @param clips - Rectangle to be rerendered, the coordinate is relative to target (this), clip could be smaller than the size of current component,
     *    e.g. When the container is a scrollable component, clip is the viewport area intersects with complete space taken by current component.
     * @param masks - Rectangle indicates the space being masked by any elevator component, may not render masks area to improve performance
     */
    render(canvas: TerminalCanvas, absTransform: mat4, clips?: Rectangle[], masks?: Rectangle[]): SingleActionFactory;
    /** Implementation needed to handle this event */
    onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, clipArea: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
    needRerender(need: boolean): SingleActionFactory;
    /** If following action is dispatched, the next render message must not be skipped on current widget */
    addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    /** Get bouding rectangle that is calculated when the lastest "render" message is handled,
     * the coordinate of rectangle is relative to canvas, in case of child component of "scrollable" container,
     * the effect canvas is an offline canvas whose coordinate is different from containing canvas.
     * Also see `ContainerWidgetEvents["hasOfflineCanvas"]`
     */
    onBoundingBox(rect: Rectangle): SingleActionFactory;
    onDettached(isDettached: boolean): SingleActionFactory;
}
export declare const tableForBase: readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"];
export type BaseWidget = SimplexReactor<BaseWidgetEvents, typeof tableForBase>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export declare function createBase(opts?: Partial<SimplexReactorOptions<BaseWidgetEvents, typeof tableForBase>>): SimplexReactor<BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"], unknown>;
export interface ContainerWidgetInput {
    addChild(...children: BaseWidget[]): SingleActionFactory;
    removeChild(...children: BaseWidget[]): SingleActionFactory;
    /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
    addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    setBackground(color: BackgroundStyle | null): SingleActionFactory;
}
export interface ContainerWidgetEvents {
    /** implement should dispatch this event in "onRender" hanlder,
     * Default implementation is about: reflow, clear background, set flags
     **/
    renderSelf(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4, clipArea: Rectangle[], maskArea: Rectangle[]): SingleActionFactory;
    allChildren(children: Array<BaseWidget>): SingleActionFactory;
    /** all children whose "setDisplay" is not `none` */
    allDisplayChildren(children: Array<BaseWidget>): SingleActionFactory;
    /** Under context of "relow" action
     * @param positions the length of this parameter must equals to "allDisplayChildren"'s length
     **/
    onChildPositions(positions: Map<BaseWidget, [number, number]>): SingleActionFactory;
    onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
    /** size of component which is "setDisplay" `none` is excluded */
    onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
    onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
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
}
declare const tableFor: readonly ["allChildren", "allDisplayChildren", "setLayoutValid", "setBackground", "onBgChangeWithParent", "onChildPreferredSizeChange", "hasOfflineCanvas", "onChildPositions"];
export type TerminalContainer = SimplexReactorMergeType<BaseWidget, SimplexReactor<ContainerWidgetInput & ContainerWidgetEvents, typeof tableFor>>;
export declare function createContainerBase(opts?: CoreOptsOfExtSmplxRctr<BaseWidget, ContainerWidgetInput & ContainerWidgetEvents>): SimplexReactor<BaseWidgetEvents & ContainerWidgetInput & ContainerWidgetEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions")[], SimplexReactor<BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"], unknown>>;
export {};
