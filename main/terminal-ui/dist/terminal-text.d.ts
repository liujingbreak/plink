import { SimplexReactorExtendType, SingleActionFactory, CoreOptsOfExtSmplxRctr } from '@wfh/reactivizer';
import { TextStyle } from './terminal-canvas';
import { BaseWidget } from './terminal-widget';
export interface MultiLineTextActions {
    setContent(text: string): SingleActionFactory;
    setStyle(style: TextStyle): SingleActionFactory;
    onDisplayLines(lines: number[][]): SingleActionFactory;
    /** display cache for specific width */
    onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
    onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
    onStyleWithParentBg(style: TextStyle): SingleActionFactory;
}
declare const tableForMultiLineText: readonly ["setContent", "setStyle", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize", "onStyleWithParentBg"];
export type MultiLineTextWidget = SimplexReactorExtendType<BaseWidget, MultiLineTextActions, typeof tableForMultiLineText>;
export declare function createTextWidget(initialText?: string, opts?: CoreOptsOfExtSmplxRctr<BaseWidget, MultiLineTextActions>): import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetMessages & MultiLineTextActions, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "setContent" | "setStyle" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize" | "onStyleWithParentBg")[], import("@wfh/reactivizer").SimplexReactor<import("./terminal-widget").BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow"], unknown>>;
export {};
