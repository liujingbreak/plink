import { CoreOptsOfExtSmplxRctr, SimplexReactorMergeType, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TerminalContainer } from './terminal-widget';
export interface FlexContainerInput {
    setDirection(dir: 'col' | 'row'): SingleActionFactory;
    justifyContent(value: 'stretch' | 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
    alignItems(value: 'start' | 'center' | 'end'): SingleActionFactory;
    setBorderSpacing(value: number): SingleActionFactory;
}
export interface FlexContainerEvents {
    onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}
declare const tableForFlexContainer: readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing"];
export type FlexContainer = SimplexReactorMergeType<TerminalContainer, SimplexReactor<FlexContainerInput & FlexContainerEvents, typeof tableForFlexContainer>>;
export declare function createFlexContainer(opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, FlexContainerInput & FlexContainerEvents>): SimplexReactor<import("./terminal-widget").BaseWidgetMessages & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & FlexContainerInput & FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "allChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing")[], SimplexReactor<import("./terminal-widget").BaseWidgetMessages & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "allChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], SimplexReactor<import("./terminal-widget").BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas"], unknown>>>;
export {};
