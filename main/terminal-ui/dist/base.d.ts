import * as rx from 'rxjs';
import { mat4 } from 'gl-matrix';
import { SingleActionFactory, SimplexReactor, Action, InferMapParam, BaseReactorFactory, CoreOptions } from '@wfh/reactivizer';
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
    /** observe the changes of absoulte bounding of component.
     * the change is kept reported by didQueryAbsBounding */
    queryAbsBounding(untilParent?: TerminalContainer): SingleActionFactory;
}
export interface BaseWidgetEvents extends BaseWidgetInput {
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
    /** Implementation should dispatch this message after calculating size based on child components or content,
     * unlike "onSize" which is set by user/caller or layout calculation logic.
     * Along with "setPreferredSize" are used to calculate "preferredSize"*/
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
    beforeRender(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
    clear(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
    /** Implementation needed to handle this event */
    onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, clipArea: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
    needRerender(need: boolean): SingleActionFactory;
    /** Set rendering state data.
     * When this observable state data changes, a "needRerender" message will be triggered and followed by "render", "onRender" messages,
     * the observable value should be derived from table properties or any other observable in form of BehaviorSubject, which provides "current state" without any
     * asynchrouse waiting.
     */
    setRenderChanges(renderDataList: readonly rx.Observable<InferMapParam<any>>[]): SingleActionFactory;
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
    onDetached(isDettached: boolean): SingleActionFactory;
    onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
    /** track whether current component has its background being cleared or rerendered by its parents */
    bgCleared(hasCleared: boolean): SingleActionFactory;
    onFocus(direction: SearchDirection): SingleActionFactory;
    didQueryAbsBounding(rect: Rectangle | null): SingleActionFactory;
}
export declare const tableForBase: readonly ["onSize", "onTransform", "onPosition", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDetached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "setRenderChanges", "isContainer"];
export type BaseWidgetRenderData = readonly [
    InferMapParam<BaseWidgetInput['setDisplay']>,
    InferMapParam<BaseWidgetEvents['onSize']>,
    InferMapParam<BaseWidgetEvents['setBackground']>
];
export type BaseWidget = SimplexReactor<BaseWidgetEvents, typeof tableForBase>;
export type BaseWidgetOptions = CoreOptions<BaseWidgetEvents>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export declare const baseComponentFac: BaseReactorFactory<BaseWidgetEvents, readonly ["onSize", "onTransform", "onPosition", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDetached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "setRenderChanges", "isContainer"], []>;
export interface OffsetParent {
    focusService: FocusService;
}
