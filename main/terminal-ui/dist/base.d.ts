import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor, Action, InferMapParam, SimplexReactorOptions } from '@wfh/reactivizer';
import { TerminalCanvas, Rectangle, BackgroundStyle } from './canvas';
import { SearchDirection, FocusService } from './focusable';
import { TerminalContainer } from './container';
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
    setBackground(color: BackgroundStyle | null): SingleActionFactory;
    /** to override automatical "preferredSize" in layout calculation */
    setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
    setFocusable(focusable: boolean | Rectangle): SingleActionFactory;
    queryAbsBounding(untilParent?: TerminalContainer): SingleActionFactory;
}
export interface BaseWidgetEvents<S = BaseWidgetRenderData> extends BaseWidgetInput {
    isContainer(yes: boolean): SingleActionFactory;
    onSize(width: number, height: number): SingleActionFactory;
    /** The coordinate value is relative to parent container,
     * avaible after parent container's "reflow"
     **/
    onPosition(x: number | null, y: number | null): SingleActionFactory;
    /** available after "render" */
    onTransform(trans: mat4): SingleActionFactory;
    _saveTransform(trans: mat4): SingleActionFactory;
    offsetParent(p: OffsetParent | null): SingleActionFactory;
    isOffsetParent(me: OffsetParent | false): SingleActionFactory;
    /** Implementation needs to handle this event */
    querySizeOf(width: number | null, height: number | null): SingleActionFactory;
    /** Extended container implementation need to handle this event. */
    preferredSize(width: number, height: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
    /** As response to "querySizeOf" */
    prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
    /** Implementation should dispatch this message after calculating size based on child components or content */
    onContentSizeChange(width: number, height: number): SingleActionFactory;
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
    /** Set rendering state data.
     * When this observable state data changes, a "needRerender" message will be triggered and followed by "render", "onRender" messages,
     * the observable should be derived from table properties or any other observable in form BehaviorSubject, which provides "current state" without any
     * asynchrouse waiting.
     */
    latestRenderData(renderData$: rx.Observable<S>): SingleActionFactory;
    /** @deprecated use addRenderData or latestRenderData instead
     * If following action is dispatched, the next render message must not be skipped on current widget */
    addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
    /** Get bouding rectangle that is calculated when the lastest "render" message is handled,
     * the coordinate of rectangle is relative to canvas which is attached with closest offset parent,
     * in case of child component of "scrollable" container,
     * the effect canvas is an offline canvas whose coordinate is different from containing canvas.
     * Also see `TermainlContainerEvents["hasOfflineCanvas"]`
     */
    onBoundingBox(rect: Rectangle): SingleActionFactory;
    onDettached(isDettached: boolean): SingleActionFactory;
    onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
    bgCleared(hasCleared: boolean): SingleActionFactory;
    onFocus(direction: SearchDirection): SingleActionFactory;
    didQueryAbsBounding(rect: Rectangle | null): SingleActionFactory;
}
export declare const tableForBase: readonly ["onSize", "onTransform", "onPosition", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "latestRenderData", "isContainer"];
export type BaseWidgetRenderData = readonly [
    InferMapParam<BaseWidgetInput['setDisplay']>,
    InferMapParam<BaseWidgetEvents['onSize']>,
    InferMapParam<BaseWidgetEvents['setBackground']>
];
export type BaseWidget<S = any> = SimplexReactor<BaseWidgetEvents<S>, typeof tableForBase>;
export type BaseWidgetOptions = SimplexReactorOptions<BaseWidgetEvents, typeof tableForBase>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export declare function createBase<S = BaseWidgetRenderData>(opts?: Partial<BaseWidgetOptions>): SimplexReactor<BaseWidgetEvents<S>, readonly ["onSize", "onTransform", "onPosition", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "latestRenderData", "isContainer"]>;
export interface OffsetParent {
    focusService: FocusService;
}
