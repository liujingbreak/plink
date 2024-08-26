import { CoreOptions, SingleActionFactory, SimplexReactor, SimplexReactorOptions } from '@wfh/reactivizer';
import { BaseWidget, ScrollableOptions, TerminalCanvasOptions, ElevatorOptions, FlexContainer, FlexContainerOpts, KeyEventOptions } from '../index';
import { StatusbarOptions } from './statusbar';
export interface AppActions {
    showPopup(component: BaseWidget): SingleActionFactory;
}
export interface AppSignals extends AppActions {
    /** In context of "showPopup" action */
    onPopup(component: BaseWidget): SingleActionFactory;
    onHelp(helper: FlexContainer): SingleActionFactory;
}
export interface AppOptions {
    default?: CoreOptions<any>;
    core?: SimplexReactorOptions<AppSignals>;
    statusbar?: StatusbarOptions;
    keyService?: KeyEventOptions;
    scrollable?: ScrollableOptions;
    elevator?: ElevatorOptions;
    canvas?: TerminalCanvasOptions;
    cover?: FlexContainerOpts;
    root?: FlexContainerOpts;
}
export declare function createApp(mainComponent: BaseWidget, opts?: AppOptions): {
    canvas: SimplexReactor<import("../canvas").TerminalCanvasEvents, readonly ["setBounding", "setRootComponent", "onDirtyLineChange"], unknown>;
    root: SimplexReactor<import("../base").BaseWidgetEvents & import("../base").TermainlContainerEvents & import("../flex-container").FlexContainerInput & import("../flex-container").FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], SimplexReactor<import("../base").BaseWidgetEvents & import("../base").TermainlContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], SimplexReactor<import("../base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent"], unknown>>>;
    app: SimplexReactor<AppSignals, readonly [], unknown>;
};
