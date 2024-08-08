import { SimplexReactorExtendType, SingleActionFactory, CoreOptsOfExtSmplxRctr } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer } from './base';
export interface ScrollActions {
    scrollTo(left: number, top: number): SingleActionFactory;
    scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
    /** Set which axis direction is allowed to be scrollabe */
    setScrollable(x: boolean, y: boolean): SingleActionFactory;
    onContent(component: BaseWidget): SingleActionFactory;
    onValidScroll(left: number, top: number): SingleActionFactory;
    onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
    /** true if content size is bigger than scrollable container size */
    isScrollNeeded(needed: boolean): SingleActionFactory;
}
declare const tableFor: readonly ["onValidScroll", "setScrollable", "onOverflow", "onContent", "isScrollNeeded"];
export type Scrollable = SimplexReactorExtendType<TerminalContainer, ScrollActions, typeof tableFor>;
export declare function createScrollable(comp: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, ScrollActions>): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetMessages & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetOutput & ScrollActions, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "onValidScroll" | "setScrollable" | "onOverflow" | "onContent" | "isScrollNeeded")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetMessages & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetOutput, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached"], unknown>>>;
export {};
