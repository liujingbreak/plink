import { CoreOptsOfExtSmplxRctr, SimplexReactorExtendType, SingleActionFactory } from '@wfh/reactivizer';
import { TerminalContainer } from './base';
import { TextStyle } from './canvas';
export declare enum FlexBorderSeparator {
    none = 0,
    line = 1
}
export interface FlexContainerInput {
    setDirection(dir: 'col' | 'row'): SingleActionFactory;
    justifyContent(value: 'stretch' | 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
    alignItems(value: 'stretch' | 'start' | 'center' | 'end'): SingleActionFactory;
    /** Effective only when "setDirection" is `"row"` */
    setBorderSpacing(value: number): SingleActionFactory;
    /** Effective only when "setDirection" is `"row"` */
    setBorderSeparator(separator: FlexBorderSeparator): SingleActionFactory;
    setBorderSeparatorStyle(style: TextStyle): SingleActionFactory;
}
export interface FlexContainerEvents {
    onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}
declare const tableForFlexContainer: readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing", "setBorderSeparator", "setBorderSeparatorStyle"];
export type FlexContainer = SimplexReactorExtendType<TerminalContainer, FlexContainerInput & FlexContainerEvents, typeof tableForFlexContainer>;
export type FlexContainerOpts = CoreOptsOfExtSmplxRctr<TerminalContainer, FlexContainerInput & FlexContainerEvents>;
export declare function createFlexContainer(opts?: FlexContainerOpts): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents & FlexContainerInput & FlexContainerEvents, readonly ("onSize" | "onTransform" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents, readonly ("onSize" | "onTransform" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "onTransform", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "latestRenderData"], unknown>>>;
export {};
