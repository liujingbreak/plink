import { CoreOptions, SingleActionFactory, SimplexReactor, SimplexReactorOptions } from '@wfh/reactivizer';
import { BaseWidget, ScrollableOptions, TerminalCanvasOptions, ElevatorOptions, FlexContainer, FlexContainerOpts, KeyEventOptions } from '../index';
import { FocusableOptions } from '../focusable';
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
    focusable?: FocusableOptions;
}
export declare function createApp(mainComponent: BaseWidget, opts?: AppOptions): {
    canvas: SimplexReactor<import("../canvas").TerminalCanvasEvents, readonly ["setBounding", "setRootComponent", "onDirtyLineChange"]>;
    main: import("@wfh/reactivizer").DerivedSimplexReactor<import("../base").BaseWidgetEvents<import("../base").BaseWidgetRenderData> & import("../container").TermainlContainerEvents & import("../flex-container").FlexContainerInput & import("../flex-container").FlexContainerEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>;
    app: SimplexReactor<AppSignals, readonly []>;
};
