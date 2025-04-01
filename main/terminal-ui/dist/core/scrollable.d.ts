import { SimplexReactorOfFac, CreateOptsOfFac, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { BaseWidget } from './base.js';
import { CanvasOptions, TextStyle } from './canvas.js';
import { FocusServiceOpts } from './focusable.js';
export interface ScrollActions {
    scrollTo(left: number, top: number): SingleActionFactory;
    scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
    setScrollbarStyle(width: number, height: number, buttonColor: TextStyle, trackColor: TextStyle): SingleActionFactory;
    /** Set which axis direction is allowed to be scrollabe */
    setScrollable(x: boolean, y: boolean): SingleActionFactory;
}
interface ScrollSignals extends ScrollActions {
    onContent(component: BaseWidget): SingleActionFactory;
    onValidScroll(left: number, top: number): SingleActionFactory;
    onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
    /** true if content size is bigger than scrollable container size */
    isScrollNeeded(needed: boolean): SingleActionFactory;
    onViewPortSize(w: number, h: number): SingleActionFactory;
}
/** Scrollable is a TerminalContainer which has an offline canvas, child components will only be "render"ed
 * when they are scrolled to become visible, and they are firstly rendered to the offline canvas then will be copied
 * to outsider canvas afterward
 */
export declare const scrollableFac: import("@wfh/reactivizer").DerivedReactorFactory<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & ScrollSignals, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "onValidScroll" | "setScrollable" | "onOverflow" | "onContent" | "isScrollNeeded" | "setScrollbarStyle" | "onViewPortSize")[], [], ScrollableOptions, [comp: BaseWidget]>;
export type Scrollable = SimplexReactorOfFac<typeof scrollableFac>;
export interface ScrollableOptions {
    debug?: boolean;
    log?: CoreOptions['log'];
    name?: string;
    container?: CreateOptsOfFac<typeof scrollableFac>;
    canvas?: CanvasOptions;
    focus?: FocusServiceOpts;
}
export declare function createScrollable(comp: BaseWidget, opts?: ScrollableOptions): import("@wfh/reactivizer").SimplexReactor<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & ScrollSignals, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "onValidScroll" | "setScrollable" | "onOverflow" | "onContent" | "isScrollNeeded" | "setScrollbarStyle" | "onViewPortSize")[]>;
export {};
