import { SimplexReactorExtendType, SingleActionFactory, CoreOptsOfExtSmplxRctr } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer } from './terminal-widget';
export interface ScrollActions {
    scrollTo(left: number, top: number): SingleActionFactory;
    scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
    /** Set which axis direction is allowed to be scrollabe */
    setScrollable(x: boolean, y: boolean): SingleActionFactory;
    onContent(component: BaseWidget): SingleActionFactory;
    onValidScroll(left: number, top: number): SingleActionFactory;
    onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
}
declare const tableFor: readonly ["onValidScroll", "setScrollable", "onOverflow", "onContent"];
export type Scrollable = SimplexReactorExtendType<TerminalContainer, ScrollActions, typeof tableFor>;
export declare function createScrollable(comp: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, ScrollActions>): import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetMessages & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & ScrollActions, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "allChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "onValidScroll" | "setScrollable" | "onOverflow" | "onContent")[], import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetMessages & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "allChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow"], unknown>>>;
export {};
