import { CoreOptions, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { BaseWidget, FlexContainer } from '../index';
export interface AppActions {
    showPopup(component: BaseWidget): SingleActionFactory;
}
export interface AppSignals extends AppActions {
    /** In context of "showPopup" action */
    onPopup(component: BaseWidget): SingleActionFactory;
    onHelp(helper: FlexContainer): SingleActionFactory;
}
export declare function createApp(mainComponent: BaseWidget, opts: CoreOptions): {
    canvas: SimplexReactor<import("../canvas").TerminalCanvasInput & import("../canvas").TerminalCanvasOutput, readonly ["setBounding", "setRootComponent", "onDirtyLineChange"], unknown>;
    root: SimplexReactor<import("../base").BaseWidgetEvents & import("../base").ContainerWidgetInput & import("../base").ContainerWidgetEvents & import("../flex-container").FlexContainerInput & import("../flex-container").FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], SimplexReactor<import("../base").BaseWidgetEvents & import("../base").ContainerWidgetInput & import("../base").ContainerWidgetEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions")[], SimplexReactor<import("../base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"], unknown>>>;
    app: SimplexReactor<AppSignals, [], unknown>;
};
