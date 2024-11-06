import { CreateOptsOfFac, SimplexReactorOfFac, SingleActionFactory, CreateOptsInDef } from '@wfh/reactivizer';
import { TextStyle } from './canvas';
export interface MultiLineTextActions {
    setContent(text: string): SingleActionFactory;
    setStyle(style: TextStyle): SingleActionFactory;
    onDisplayLines(lines: number[][]): SingleActionFactory;
    /** display cache for specific width */
    onDisplayLinesForWidth(width?: number | null, lines?: number[][]): SingleActionFactory;
    onDisplayLinesForPrefSize(lines: number[][]): SingleActionFactory;
    onStyleWithParentBg(style: TextStyle): SingleActionFactory;
}
export declare const textWidgetFac: import("@wfh/reactivizer").DerivedReactorFactory<MultiLineTextActions, readonly ["setContent", "setStyle", "onDisplayLines", "onDisplayLinesForWidth", "onDisplayLinesForPrefSize", "onStyleWithParentBg"], [initialText: string, opts?: CreateOptsInDef<MultiLineTextActions, import("@wfh/reactivizer").BaseReactorFactory<import("./base").BaseWidgetEvents, readonly ["onSize", "onTransform", "onPosition", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDetached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "setRenderChanges", "isContainer"], []>> | undefined], import("./base").BaseWidgetEvents, readonly ["onSize", "onTransform", "onPosition", "offsetParent", "isOffsetParent", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDetached", "setFlexShrink", "setBackground", "onBgChangeWithParent", "bgCleared", "setFocusable", "setRenderChanges", "isContainer"], []>;
export type MultiLineTextWidget = SimplexReactorOfFac<typeof textWidgetFac>;
export type MultiLineTextWidgetOpts = CreateOptsOfFac<typeof textWidgetFac>;
export declare function createTextWidget(initialText?: string, opts?: MultiLineTextWidgetOpts): import("@wfh/reactivizer").DerivedSimplexReactor<MultiLineTextActions & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "setContent" | "setStyle" | "onDisplayLines" | "onDisplayLinesForWidth" | "onDisplayLinesForPrefSize" | "onStyleWithParentBg")[]>;
