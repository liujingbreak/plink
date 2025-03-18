import { CoreOptions } from '@wfh/reactivizer';
import { BorderContainerOpts } from '../core/border';
import { FlexContainerInput, FlexContainerOpts as FlexOpts } from '../core/flex-container';
export interface FlexBoxOpts {
    name?: string;
    debug?: boolean;
    log?: CoreOptions['log'];
    border?: BorderContainerOpts;
    flexContainer?: FlexOpts;
}
export declare const flexBoxFac: import("@wfh/reactivizer").DerivedReactorFactory<FlexContainerInput, readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing", "setBorderSeparator", "setBorderSeparatorStyle", "setBorderSpacing"], [opts?: FlexBoxOpts | undefined], import("../core/border").BorderContainerActions & import("..").TermainlContainerEvents & import("..").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding")[], [child: import("..").BaseWidget, opts?: CoreOptions<import("..").TermainlContainerEvents & import("..").BaseWidgetEvents & import("../core/border").BorderContainerActions> | undefined]>;
