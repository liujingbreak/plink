import { ActionMeta, SingleActionFactory, SimplexReactorOfFac, CreateOptsInDef, CoreOptions } from '@wfh/reactivizer';
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
export type PositionalPopupOpts = CreateOptsInDef<PosPopupInput, typeof baseContainerFac>;
export declare const positionalFac: import("@wfh/reactivizer").DerivedReactorFactory<PosPopupEvents, readonly ["setRelativePos", "isDocked"], [content: BaseWidget, opts?: CoreOptions<import("../core/container.js").TermainlContainerEvents & import("../core/base.js").BaseWidgetEvents & PosPopupInput> | undefined], import("../core/container.js").TermainlContainerEvents & import("../core/base.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
export type PositionalPopup = SimplexReactorOfFac<typeof positionalFac>;
export declare function showPopupFor(dockTo: BaseWidget, content: BaseWidget, attrs?: {
    relativePos?: [number, number] | null;
    actionMeta?: ActionMeta | null;
    allowUserEvents?: boolean;
}, opts?: PositionalPopupOpts): import("@wfh/reactivizer").DerivedSimplexReactor<PosPopupEvents & import("../core/container.js").TermainlContainerEvents & import("../core/base.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setRelativePos" | "isDocked")[]>;
export interface TooltipsOptions {
    name?: string;
    debug?: boolean;
    log?: CoreOptions['log'];
    positionalOpts?: PositionalPopupOpts;
    textOpts?: TextOptions;
}
export declare function bindToolTipsTo(c: BaseWidget, tooltips: string | BaseWidget, delayShowMs?: number, opts?: TooltipsOptions): void;
