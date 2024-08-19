import { SimplexReactorExtendType, SingleActionFactory, CoreOptsOfExtSmplxRctr } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer } from './base';
export interface ScrollActions {
    scrollTo(left: number, top: number): SingleActionFactory;
    scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
    /** Set which axis direction is allowed to be scrollabe */
    setScrollable(x: boolean, y: boolean): SingleActionFactory;
}
interface ScrollSignals extends ScrollActions {
    onContent(component: BaseWidget): SingleActionFactory;
    onValidScroll(left: number, top: number): SingleActionFactory;
    onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
    /** true if content size is bigger than scrollable container size */
    isScrollNeeded(needed: boolean): SingleActionFactory;
}
declare const tableFor: readonly ["onValidScroll", "setScrollable", "onOverflow", "onContent", "isScrollNeeded"];
/** Scrollable is a TerminalContainer which has an offline canvas, child components will only be "render"ed
 * when they are scrolled to become visible, and they are firstly rendered to the offline canvas then will be copied
 * to outsider canvas afterward
 */
export type Scrollable = SimplexReactorExtendType<TerminalContainer, ScrollSignals, typeof tableFor>;
export declare function createScrollable(comp: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, ScrollSignals>): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetEvents & ScrollSignals, readonly ("onValidScroll" | "setScrollable" | "onOverflow" | "onContent" | "isScrollNeeded" | "onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"], unknown>>>;
export {};
