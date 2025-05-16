import { CoreOptions, CreateOptsOfExtendedFac } from '@wfh/reactivizer';
import { borderFac, BorderContainerOpts } from '../core/border.js';
import { MultiLineTextInput, MultiLineTextWidgetOpts } from '../core/text.js';
export interface TextInput {
    setContent: MultiLineTextInput['setContent'];
    setStyle: MultiLineTextInput['setStyle'];
}
export interface TextOptions extends CreateOptsOfExtendedFac<typeof borderFac, TextInput> {
    name?: string;
    debug?: boolean;
    log?: CoreOptions['log'];
    border?: BorderContainerOpts;
    text?: MultiLineTextWidgetOpts;
}
export declare const tableFor: readonly ["setContent", "setStyle"];
export declare const textFac: import("@wfh/reactivizer").DerivedReactorFactory<import("../index.js").BaseWidgetEvents & import("../index.js").TermainlContainerEvents & import("../core/border.js").BorderContainerActions & TextInput, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding" | "setContent" | "setStyle")[], [child: import("../index.js").BaseWidget], TextOptions, [initialText: string]>;
