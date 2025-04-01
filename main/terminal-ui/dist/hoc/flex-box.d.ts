import { CreateOptsOfExtendedFac } from '@wfh/reactivizer';
import { borderFac, BorderContainerOpts } from '../core/border.js';
import { FlexContainerInput, FlexContainerOpts as FlexOpts } from '../core/flex-container.js';
export interface FlexBoxOpts extends CreateOptsOfExtendedFac<typeof borderFac> {
    border?: BorderContainerOpts;
    flexContainer?: FlexOpts;
}
export declare const flexBoxFac: import("@wfh/reactivizer").DerivedReactorFactory<import("../index.js").BaseWidgetEvents & import("../index.js").TermainlContainerEvents & import("../core/border.js").BorderContainerActions & FlexContainerInput, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle" | "setBorder" | "setBorderStyle" | "setPadding")[], [child: import("../index.js").BaseWidget], FlexBoxOpts, []>;
