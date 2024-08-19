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
export declare function createFlexContainer(opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, FlexContainerInput & FlexContainerEvents>): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetEvents & FlexContainerInput & FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"], unknown>>>;
export {};
