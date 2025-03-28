import { CoreOptions } from '@wfh/reactivizer';
import { BorderContainerOpts } from '../core/border.js';
import { MultiLineTextInput, MultiLineTextWidgetOpts } from '../core/text.js';
export interface TextOptions {
    name?: string;
    debug?: boolean;
    log?: CoreOptions['log'];
    border?: BorderContainerOpts;
    text?: MultiLineTextWidgetOpts;
}
export interface TextInput {
    setContent: MultiLineTextInput['setContent'];
    setStyle: MultiLineTextInput['setStyle'];
}
export declare const tableFor: readonly ["setContent", "setStyle"];
export declare const textFac: import("@wfh/reactivizer").DerivedReactorFactory<TextInput, readonly ["setContent", "setStyle"], [initialText: string, opts?: TextOptions | undefined], import("../core/border.js").BorderContainerActions & import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding")[], [child: import("../index.js").BaseWidget, opts?: CoreOptions<import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents & import("../core/border.js").BorderContainerActions> | undefined]>;
