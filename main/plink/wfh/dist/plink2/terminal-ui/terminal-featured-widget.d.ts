import { SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TerminalContainer, BaseWidgetActions, tableForBase } from './terminal-widget';
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
export declare function createListContainer(opts?: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>): SimplexReactor<BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & ListContainerInput & ListContainerEvents, ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing")[]>;
export interface BorderContainerActions {
    setBorderStyle(style: TextStyle): SingleActionFactory;
    setPadding(top: number, right: number, bottom: number, left: number): SingleActionFactory;
    setBorder(type: 'padding' | 'line'): SingleActionFactory;
}
export declare function createBorderContainer<I extends BaseWidgetActions, L extends typeof tableForBase>(child: SimplexReactor<I, L>): SimplexReactor<BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & BorderContainerActions, ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "allChildren" | "setLayoutValid" | "setBackground" | "onChildPreferredSizeChange" | "setBorder" | "setBorderStyle" | "setPadding")[]>;
export {};
