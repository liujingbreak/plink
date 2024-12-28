import { SimplexReactorOfFac, CreateOptsOfFac, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { BaseWidget } from './base';
import { TerminalCanvasOptions, TextStyle } from './canvas';
import { FocusServiceOpts } from './focusable';
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
export declare const scrollableFac: import("@wfh/reactivizer").DerivedReactorFactory<ScrollSignals, readonly ["onValidScroll", "setScrollable", "onOverflow", "onContent", "isScrollNeeded", "setScrollbarStyle", "onViewPortSize"], [comp: BaseWidget, opts?: ScrollableOptions | undefined], import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
export type Scrollable = SimplexReactorOfFac<typeof scrollableFac>;
export interface ScrollableOptions {
    default?: CoreOptions;
    core?: CreateOptsOfFac<typeof scrollableFac>;
    canvas?: TerminalCanvasOptions;
    focus?: FocusServiceOpts;
}
export declare function createScrollable(comp: BaseWidget, opts?: ScrollableOptions): import("@wfh/reactivizer").DerivedSimplexReactor<ScrollSignals & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "onValidScroll" | "setScrollable" | "onOverflow" | "onContent" | "isScrollNeeded" | "setScrollbarStyle" | "onViewPortSize")[]>;
export {};
