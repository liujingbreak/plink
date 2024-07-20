import { SingleActionFactory } from '@wfh/reactivizer';
import { BaseWidget } from './terminal-widget';
export interface ScrollActions {
    scrollTo(left: number, top: number): SingleActionFactory;
    scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
    /** Set which axis direction is allowed to be scrollabe */
    setScrollable(x: boolean, y: boolean): SingleActionFactory;
    onValidScroll(left: number, top: number): SingleActionFactory;
    onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
}
export declare function createScrollable(comp: BaseWidget): import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & ScrollActions, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange" | "onValidScroll" | "setScrollable" | "onOverflow")[], import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange")[], import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetActions, readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"], unknown>>>;
