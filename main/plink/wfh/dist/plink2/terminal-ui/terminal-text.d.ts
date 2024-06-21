import { SimplexReactorMergeType, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { BaseWidget } from './terminal-widget';
export interface MultiLineTextActions {
    setContent(text: string): SingleActionFactory;
    onDisplayLines(lines: number[][]): SingleActionFactory;
    /** display cache for specific width */
    onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
    onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
}
declare const tableForMultiLineText: readonly ["setContent", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize"];
export type MultiLineTextWidget = SimplexReactorMergeType<SimplexReactor<MultiLineTextActions, typeof tableForMultiLineText>, BaseWidget>;
export declare function createTextWidget(): SimplexReactor<import("./terminal-widget").BaseWidgetActions & MultiLineTextActions, ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "setContent" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize")[]>;
export {};
