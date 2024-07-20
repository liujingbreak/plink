import { SimplexReactorMergeType, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { TextStyle } from './terminal-canvas';
import { BaseWidget } from './terminal-widget';
export interface MultiLineTextActions {
    setContent(text: string): SingleActionFactory;
    setStyle(style: TextStyle): SingleActionFactory;
    onDisplayLines(lines: number[][]): SingleActionFactory;
    /** display cache for specific width */
    onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
    onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
}
declare const tableForMultiLineText: readonly ["setContent", "setStyle", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize"];
export type MultiLineTextWidget = SimplexReactorMergeType<SimplexReactor<MultiLineTextActions, typeof tableForMultiLineText>, BaseWidget>;
export declare function createTextWidget(initialText?: string): SimplexReactor<import("./terminal-widget").BaseWidgetActions & MultiLineTextActions, readonly ("setSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setContent" | "setStyle" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize")[], SimplexReactor<import("./terminal-widget").BaseWidgetActions, readonly ["setSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender"], unknown>>;
export {};
