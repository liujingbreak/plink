import { CoreOptsOfExtSmplxRctr, SimplexReactorMergeType, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TerminalContainer } from './base';
export interface FlexContainerInput {
    setDirection(dir: 'col' | 'row'): SingleActionFactory;
    justifyContent(value: 'stretch' | 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
    alignItems(value: 'stretch' | 'start' | 'center' | 'end'): SingleActionFactory;
    setBorderSpacing(value: number): SingleActionFactory;
}
export interface FlexContainerEvents {
    onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}
declare const tableForFlexContainer: readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing"];
export type FlexContainer = SimplexReactorMergeType<TerminalContainer, SimplexReactor<FlexContainerInput & FlexContainerEvents, typeof tableForFlexContainer>>;
export declare function createFlexContainer(opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, FlexContainerInput & FlexContainerEvents>): SimplexReactor<import("./base").BaseWidgetMessages & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetOutput & FlexContainerInput & FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing")[], SimplexReactor<import("./base").BaseWidgetMessages & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetOutput, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], SimplexReactor<import("./base").BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached"], unknown>>>;
export {};
