import { CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { BaseWidget } from '../core/base';
import { Rectangle } from '../core/canvas';
export interface PosPopupInput {
    setAbsPos(x: number, y: number): SingleActionFactory;
    dockTo(c: BaseWidget): SingleActionFactory;
}
export interface PosPopupEvents extends PosPopupInput {
    isDocked(dockTarget: Rectangle | false): SingleActionFactory;
    onDockType(type: `${'up' | 'down'}${'Left' | 'Right'}`): SingleActionFactory;
}
export declare const positionalFac: import("@wfh/reactivizer").DerivedReactorFactory<PosPopupEvents, readonly ["setAbsPos", "isDocked"], [content: BaseWidget, opts?: CoreOptions<PosPopupInput> | undefined], import("../core/container").TermainlContainerEvents & import("../core/base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
