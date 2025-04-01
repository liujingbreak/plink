import { SingleActionFactory, CreateOptsOfFac, SimplexReactorOfFac } from '@wfh/reactivizer';
import { Scrollable, KeyEventServcie, TextStyle } from '../index.js';
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
export declare const statusbarFac: import("@wfh/reactivizer").DerivedReactorFactory<import("../index.js").BaseWidgetEvents & import("../index.js").TermainlContainerEvents & import("../index.js").BorderContainerActions & StatusbarMessages, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding" | "trackKeypressService" | "trackScrollable" | "setMessage" | "setBgOnSurfaceColor" | "setBgSurfaceColor")[], [child: import("../index.js").BaseWidget], import("@wfh/reactivizer").CoreOptions<import("../index.js").BaseWidgetEvents & import("../index.js").TermainlContainerEvents & import("../index.js").BorderContainerActions & StatusbarMessages>, []>;
export type Statusbar = SimplexReactorOfFac<typeof statusbarFac>;
export type StatusbarOptions = CreateOptsOfFac<typeof statusbarFac>;
export declare function createStatusbar(opts?: StatusbarOptions): import("@wfh/reactivizer").SimplexReactor<import("../index.js").BaseWidgetEvents & import("../index.js").TermainlContainerEvents & import("../index.js").BorderContainerActions & StatusbarMessages, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorder" | "setBorderStyle" | "setPadding" | "trackKeypressService" | "trackScrollable" | "setMessage" | "setBgOnSurfaceColor" | "setBgSurfaceColor")[]>;
