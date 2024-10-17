import { SingleActionFactory, CoreOptsOfExtSmplxRctr, ActionMeta } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer } from './base';
import { TextStyle, TerminalCanvas } from './canvas';
export interface BorderContainerActions {
    setBorderStyle(style: TextStyle): SingleActionFactory;
    setPadding(top: number, right: number, bottom: number, left: number): SingleActionFactory;
    setBorder(type: 'padding' | 'line'): SingleActionFactory;
}
export declare function createBorderContainer(child: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, BorderContainerActions>): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents<import("./base").BaseWidgetRenderData> & import("./base").TermainlContainerEvents & BorderContainerActions, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "setBorder" | "setBorderStyle" | "setPadding")[]>;
export declare function renderLineBorder(m: ActionMeta, canvas: TerminalCanvas, x: number, y: number, w: number, h: number, style: TextStyle): void;
