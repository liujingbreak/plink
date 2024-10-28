import { SingleActionFactory, SimplexReactorExtendType, OptionsOfSmplxRctr } from '@wfh/reactivizer';
import { FlexContainer, Scrollable, KeyEventServcie } from '../index';
export interface StatusbarMessages {
    trackScrollable(scrollable: Scrollable): SingleActionFactory;
    trackKeypressService(service: KeyEventServcie): SingleActionFactory;
    onScrollStatus(vertical: number | null, horizontal: number | null): SingleActionFactory;
    onKeypressStatus(text: string, isValid: boolean): SingleActionFactory;
}
declare const tableFor: readonly ["trackKeypressService", "trackScrollable"];
export type Statusbar = SimplexReactorExtendType<FlexContainer, StatusbarMessages, typeof tableFor>;
export type StatusbarOptions = Partial<OptionsOfSmplxRctr<Statusbar>>;
export declare function createStatusbar(opts?: StatusbarOptions): import("@wfh/reactivizer").SimplexReactor<import("../base").BaseWidgetEvents<import("../base").BaseWidgetRenderData> & import("../base").TermainlContainerEvents & import("../border").BorderContainerActions & StatusbarMessages, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "setBorderStyle" | "trackKeypressService" | "trackScrollable" | "setBorder" | "setPadding")[]>;
export {};
