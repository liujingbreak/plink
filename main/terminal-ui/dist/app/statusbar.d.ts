import { SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac } from '@wfh/reactivizer';
import { borderFac, Scrollable, KeyEventServcie, TextStyle } from '../index.js';
export interface StatusbarInput {
    setMessage(text: string, style?: TextStyle): SingleActionFactory;
}
export interface StatusbarTheme {
    /** default is MaterialScheme['surfaceContainer'] */
    setBgSurfaceColor(color: string): SingleActionFactory;
    /** defautlt is MaterialScheme['onSurface'] */
    setBgOnSurfaceColor(color: string): SingleActionFactory;
}
export interface StatusbarMessages extends StatusbarInput, StatusbarTheme {
    trackScrollable(scrollable: Scrollable): SingleActionFactory;
    trackKeypressService(service: KeyEventServcie): SingleActionFactory;
    onScrollStatus(vertical: number | null, horizontal: number | null): SingleActionFactory;
    onKeypressStatus(text: string, isValid: boolean): SingleActionFactory;
}
export type StatusbarOptions = CreateOptsInDef<StatusbarMessages, typeof borderFac>;
export declare const statusbarFac: import("@wfh/reactivizer").DerivedReactorFactory<StatusbarMessages, readonly ["trackKeypressService", "trackScrollable", "setMessage", "setBgOnSurfaceColor", "setBgSurfaceColor"], [opts?: import("@wfh/reactivizer").CoreOptions<import("../index.js").BorderContainerActions & import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents & StatusbarMessages> | undefined], import("../index.js").BorderContainerActions & import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding")[], [child: import("../index.js").BaseWidget, opts?: import("@wfh/reactivizer").CoreOptions<import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents & import("../index.js").BorderContainerActions> | undefined]>;
export type Statusbar = SimplexReactorOfFac<typeof statusbarFac>;
export declare function createStatusbar(opts?: StatusbarOptions): import("@wfh/reactivizer").DerivedSimplexReactor<StatusbarMessages & import("../index.js").BorderContainerActions & import("../index.js").TermainlContainerEvents & import("../index.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding" | "trackKeypressService" | "trackScrollable" | "setMessage" | "setBgOnSurfaceColor" | "setBgSurfaceColor")[]>;
