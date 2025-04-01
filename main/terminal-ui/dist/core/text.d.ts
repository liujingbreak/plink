import { CreateOptsOfFac, SimplexReactorOfFac, SingleActionFactory } from '@wfh/reactivizer';
import { TextStyle } from './canvas.js';
export interface MultiLineTextInput {
    setContent(text: string): SingleActionFactory;
    /** same as "setForegournd" message */
    setStyle(style: TextStyle | null): SingleActionFactory;
}
export interface MultiLineTextActions extends MultiLineTextInput {
    onDisplayLines(lines: number[][]): SingleActionFactory;
    /** display cache for specific width */
    onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
    onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
}
export declare const tableForMultiLineText: readonly ["setContent", "setStyle", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize"];
export declare const textWidgetFac: import("@wfh/reactivizer").DerivedReactorFactory<import("./base.js").BaseWidgetEvents & MultiLineTextActions, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "setContent" | "setStyle" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize")[], [], import("@wfh/reactivizer").CoreOptions<import("./base.js").BaseWidgetEvents & MultiLineTextActions>, [initialText: string]>;
export type MultiLineTextWidget = SimplexReactorOfFac<typeof textWidgetFac>;
export type MultiLineTextWidgetOpts = CreateOptsOfFac<typeof textWidgetFac>;
export declare function createTextWidget(initialText?: string, opts?: MultiLineTextWidgetOpts): import("@wfh/reactivizer").SimplexReactor<import("./base.js").BaseWidgetEvents & MultiLineTextActions, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "setContent" | "setStyle" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize")[]>;
