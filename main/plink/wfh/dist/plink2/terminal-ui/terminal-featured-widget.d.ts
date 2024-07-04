import { SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TerminalWidget } from './terminal-widget';
export interface ListContainerInput {
    setDirection(dir: 'col' | 'row'): SingleActionFactory;
    justifyContent(value: 'start' | 'center' | 'end'): SingleActionFactory;
    alignItems(value: 'start' | 'center' | 'end'): SingleActionFactory;
    setMarginWidth(value: number): SingleActionFactory;
}
export interface ListContainerEvents {
    onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
    setLayoutValid(isValid: boolean): SingleActionFactory;
    reflow(): SingleActionFactory;
}
declare const tableForListContainer: readonly ["setDirection", "alignItems", "justifyContent", "setMarginWidth", "setLayoutValid", "onChildPreferredSizeChange"];
type ListContainer = SimplexReactorMergeType<TerminalWidget, SimplexReactor<ListContainerInput & ListContainerEvents, typeof tableForListContainer>>;
export declare function createListContainer(opts: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>): SimplexReactor<import("./terminal-widget").BaseWidgetActions & import("./terminal-widget").ContainerWidgetInput & import("./terminal-widget").ContainerWidgetOutput & ListContainerInput & ListContainerEvents, ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "allChildren" | "setDirection" | "alignItems" | "justifyContent" | "setMarginWidth" | "setLayoutValid" | "onChildPreferredSizeChange")[]>;
export {};
