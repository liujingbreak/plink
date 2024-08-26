import { SimplexReactorExtendType, SingleActionFactory, CoreOptions } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer } from './base';
import { TerminalCanvasOptions } from './canvas';
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
export interface ScrollableOptions {
    default?: CoreOptions;
    core?: Partial<NonNullable<Scrollable['opts']>>;
    canvas?: TerminalCanvasOptions;
}
export declare function createScrollable(comp: BaseWidget, opts?: ScrollableOptions): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents & ScrollSignals, readonly ("onValidScroll" | "setScrollable" | "onOverflow" | "onContent" | "isScrollNeeded" | "onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent"], unknown>>>;
export {};
