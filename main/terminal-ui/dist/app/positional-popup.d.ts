import { ActionMeta, CoreOptions, SingleActionFactory, SimplexReactorOfFac, CreateOptsOfExtendedFac } from '@wfh/reactivizer';
import { BaseWidget } from '../core/base.js';
import { TextOptions } from '../hoc/text.js';
import { Rectangle } from '../core/canvas.js';
import { baseContainerFac } from '../core/container.js';
export interface PosPopupInput {
    setRelativePos(x: number, y: number): SingleActionFactory;
    dockTo(c: BaseWidget): SingleActionFactory;
    show(): SingleActionFactory;
    hide(): SingleActionFactory;
}
export interface PosPopupEvents extends PosPopupInput {
    isDocked(dockTarget: Rectangle | false): SingleActionFactory;
    onDockType(type: `${'up' | 'down'}${'Left' | 'Right'}`): SingleActionFactory;
}
export type PositionalPopupOpts = CreateOptsOfExtendedFac<typeof baseContainerFac, PosPopupEvents>;
export declare const positionalFac: import("@wfh/reactivizer").DerivedReactorFactory<import("../core/base.js").BaseWidgetEvents & import("../core/container.js").TermainlContainerEvents & PosPopupEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setRelativePos" | "isDocked")[], [], CoreOptions<import("../core/base.js").BaseWidgetEvents & import("../core/container.js").TermainlContainerEvents & PosPopupEvents>, [content: BaseWidget]>;
export type PositionalPopup = SimplexReactorOfFac<typeof positionalFac>;
export declare function showPopupFor(dockTo: BaseWidget, content: BaseWidget, attrs?: {
    relativePos?: [number, number] | null;
    actionMeta?: ActionMeta | null;
    allowUserEvents?: boolean;
}, opts?: PositionalPopupOpts): import("@wfh/reactivizer").SimplexReactor<import("../core/base.js").BaseWidgetEvents & import("../core/container.js").TermainlContainerEvents & PosPopupEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setRelativePos" | "isDocked")[], object>;
export interface TooltipsOptions {
    name?: string;
    log?: CoreOptions['log'];
    enableLog?: CoreOptions['enableLog'];
    positionalOpts?: PositionalPopupOpts;
    textOpts?: TextOptions;
}
export declare function bindToolTipsTo(c: BaseWidget, tooltips: string | BaseWidget, delayShowMs?: number, opts?: TooltipsOptions): void;
