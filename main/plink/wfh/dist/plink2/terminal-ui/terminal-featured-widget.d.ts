import { SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TerminalContainer, BaseWidget } from './terminal-widget';
import { TextStyle } from './terminal-canvas';
export interface ListContainerInput {
    setDirection(dir: 'col' | 'row'): SingleActionFactory;
    justifyContent(value: 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
    alignItems(value: 'start' | 'center' | 'end'): SingleActionFactory;
    setBorderSpacing(value: number): SingleActionFactory;
}
export interface ListContainerEvents {
    onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}
declare const tableForListContainer: readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing"];
type ListContainer = SimplexReactorMergeType<TerminalContainer, SimplexReactor<ListContainerInput & ListContainerEvents, typeof tableForListContainer>>;
export declare function createListContainer(opts?: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>): SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & ListContainerInput & ListContainerEvents, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing")[], SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange")[], SimplexReactor<import("./terminal-widget").BaseWidgetActions, readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"], unknown>>>;
export interface BorderContainerActions {
    setBorderStyle(style: TextStyle): SingleActionFactory;
    setPadding(top: number, right: number, bottom: number, left: number): SingleActionFactory;
    setBorder(type: 'padding' | 'line'): SingleActionFactory;
}
export declare function createBorderContainer(child: BaseWidget): SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & BorderContainerActions, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange" | "setBorder" | "setBorderStyle" | "setPadding")[], SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange")[], SimplexReactor<import("./terminal-widget").BaseWidgetActions, readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"], unknown>>>;
export {};
