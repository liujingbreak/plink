import { CoreOptions } from '@wfh/reactivizer';
import { BorderContainerOpts } from '../core/border.js';
import { FlexContainerInput, FlexContainerOpts as FlexOpts } from '../core/flex-container.js';
export interface FlexBoxOpts {
    name?: string;
    debug?: boolean;
    log?: CoreOptions['log'];
    border?: BorderContainerOpts;
    flexContainer?: FlexOpts;
}
export declare const flexBoxFac: import("@wfh/reactivizer").DerivedReactorFactory<FlexContainerInput, readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing", "setBorderSeparator", "setBorderSeparatorStyle", "setBorderSpacing"], [opts?: FlexBoxOpts | undefined], import("../core/border.js").BorderContainerActions & import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding")[], [child: import("../index.js").BaseWidget, opts?: CoreOptions<import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents & import("../core/border.js").BorderContainerActions> | undefined]>;
