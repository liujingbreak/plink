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
    main?: FlexContainerOpts;
    focusable?: FocusableOptions;
}
export declare function createApp(mainComponent: BaseWidget, opts?: AppOptions): {
    canvas: SimplexReactor<import("../canvas").TerminalCanvasEvents, readonly ["setBounding", "setRootComponent", "onDirtyLineChange", "internalCache"]>;
    main: import("@wfh/reactivizer").DerivedSimplexReactor<import("../flex-container").FlexContainerInput & import("../flex-container").FlexContainerEvents & import("../container").TermainlContainerEvents & import("../base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>;
    app: SimplexReactor<AppSignals, readonly []>;
};
