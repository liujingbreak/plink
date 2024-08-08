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
     * the final size is decided by its container according to its layout feature
     **/
    setSize(width: number | `${number}%` | null, height: number | `${number}%` | null): SingleActionFactory;
    setFlexGrow(value: number): SingleActionFactory;
    setDisplay(mode: DisplayMode): SingleActionFactory;
}
export interface BaseWidgetMessages extends BaseWidgetInput {
    /** to override automatical "preferredSize" in layout calculation */
    setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
    onSize(width: number, height: number): SingleActionFactory;
    /** Implementation needs to handle this action */
    querySizeOf(width: number | null, height: number | null): SingleActionFactory;
    /** Be aware that an interceptor is filtering "preferredSize" action for distinctUntilChanged(), which affects action table, some action will be skipped due to duplicate value */
    preferredSize(width: number, height: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
    overflow(yes: boolean): SingleActionFactory;
    setParent(p: TerminalContainer | null): SingleActionFactory;
    ofCanvas(canvas: TerminalCanvas | null): SingleActionFactory;
    /** this message will be intercepted and skipped if there is no "Rerender" action dispatched after last "render" message is handled,
     * @param relRerenderArea - Rectangle to be rerendered, the coordinate is relative to target (this) component
     */
    render(canvas: TerminalCanvas, absTransform: mat4, clipArea?: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
    /** Implementation needed to handle this action */
    onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, clipArea: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
    needRerender(need: boolean): SingleActionFactory;
    /** If following action is dispatched, the next render message must not be skipped on current widget */
    addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    onBoundingBox(rect: Rectangle): SingleActionFactory;
    onDettached(isDettached: boolean): SingleActionFactory;
}
export declare const tableForBase: readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached"];
export type BaseWidget = SimplexReactor<BaseWidgetMessages, typeof tableForBase>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export declare function createBase(opts?: Partial<SimplexReactorOptions<BaseWidgetMessages, typeof tableForBase>>): SimplexReactor<BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached"], unknown>;
export interface ContainerWidgetInput {
    addChild(...children: BaseWidget[]): SingleActionFactory;
    removeChild(...children: BaseWidget[]): SingleActionFactory;
    /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
    addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    setBackground(color: BackgroundStyle | null): SingleActionFactory;
}
export interface ContainerWidgetOutput {
    renderSelf(canvas: TerminalCanvas, absTransform: mat4, clipArea: Rectangle[], maskArea: Rectangle[]): SingleActionFactory;
    renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4, clipArea: Rectangle[], maskArea: Rectangle[]): SingleActionFactory;
    allChildren(children: Array<BaseWidget>): SingleActionFactory;
    /** all children whose "setDisplay" is not `none` */
    allDisplayChildren(children: Array<BaseWidget>): SingleActionFactory;
    allReflowChildren(children: BaseWidget[]): SingleActionFactory;
    onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
    /** size of component which is "setDisplay" `none` is excluded */
    onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
    onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
    setLayoutValid(isValid: boolean): SingleActionFactory;
    /** This message is when to calculate layout information like postion and size of children component, for later rendering,
     * this message is only signaled when latest "setLayoutValid" is `false`
     **/
    reflow(): SingleActionFactory;
    /** No reaction yet , preserve for future */
    renderBackgroundFor(child: BaseWidget): SingleActionFactory;
}
declare const tableFor: readonly ["allChildren", "allDisplayChildren", "setLayoutValid", "setBackground", "onBgChangeWithParent", "onChildPreferredSizeChange"];
export type TerminalContainer = SimplexReactorMergeType<SimplexReactor<ContainerWidgetInput & ContainerWidgetOutput, typeof tableFor>, BaseWidget>;
export declare function createContainerBase(opts?: CoreOptsOfExtSmplxRctr<BaseWidget, ContainerWidgetInput & ContainerWidgetOutput>): SimplexReactor<BaseWidgetMessages & ContainerWidgetInput & ContainerWidgetOutput, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], SimplexReactor<BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached"], unknown>>;
export {};
