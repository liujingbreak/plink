import { CreateOptsOfFac, SimplexReactorOfFac, SingleActionFactory } from '@wfh/reactivizer';
import { TextStyle } from './canvas';
export interface MultiLineTextInput {
    setContent(text: string): SingleActionFactory;
    setStyle(style: TextStyle): SingleActionFactory;
}
export interface MultiLineTextActions extends MultiLineTextInput {
    onDisplayLines(lines: number[][]): SingleActionFactory;
    /** display cache for specific width */
    onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
    onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
    onStyleWithParentBg(style: TextStyle): SingleActionFactory;
}
export declare const tableForMultiLineText: readonly ["setContent", "setStyle", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize", "onStyleWithParentBg"];
export declare const textWidgetFac: import("@wfh/reactivizer").DerivedReactorFactory<MultiLineTextActions, readonly ["setContent", "setStyle", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize", "onStyleWithParentBg"], [initialText: string, opts?: import("@wfh/reactivizer").CoreOptions<import("./base").BaseWidgetEvents & MultiLineTextActions> | undefined], import("./base").BaseWidgetEvents, readonly ["onSize", "onTransform", "onPosition", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDetached", "setFlexShrink", "render", "setFocusStyle", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "setRenderChanges", "isContainer", "depth", "focusService"], []>;
export type MultiLineTextWidget = SimplexReactorOfFac<typeof textWidgetFac>;
export type MultiLineTextWidgetOpts = CreateOptsOfFac<typeof textWidgetFac>;
export declare function createTextWidget(initialText?: string, opts?: MultiLineTextWidgetOpts): import("@wfh/reactivizer").DerivedSimplexReactor<MultiLineTextActions & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "setContent" | "setStyle" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize" | "onStyleWithParentBg")[]>;
