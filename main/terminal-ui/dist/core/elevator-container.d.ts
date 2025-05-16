import * as rx from 'rxjs';
import { CoreOptions, SingleActionFactory, SimplexReactorOfFac, CreateOptsOfExtendedFac } from '@wfh/reactivizer';
import { BaseWidget, Rectangle, CanvasOptions } from '../index.js';
import { RootFocusServiceOpts } from './focusable.js';
import { baseContainerFac } from './container.js';
import { KeyEventServcie } from './keyEvent.js';
interface ElevatorActions {
    /** @param userEvents default `true` */
    addLayer(content: BaseWidget, userEvents?: boolean): SingleActionFactory;
}
interface ElevatorEvents extends ElevatorActions {
    onFocusServieReady(chd: BaseWidget): SingleActionFactory;
}
export interface ElevatorOptions {
    default?: CoreOptions;
    core?: CreateOptsOfExtendedFac<typeof baseContainerFac, ElevatorEvents>;
    /** Internal canvas */
    canvas?: CanvasOptions;
    focusable?: RootFocusServiceOpts;
}
export declare const elevatorFac: import("@wfh/reactivizer").DerivedReactorFactory<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & ElevatorEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], [], ElevatorOptions, [keyEventSvc: KeyEventServcie]>;
export type ElevatorContainer = SimplexReactorOfFac<typeof elevatorFac>;
export declare function createElevator(keyEventSvc: KeyEventServcie, opts?: ElevatorOptions): import("@wfh/reactivizer").SimplexReactor<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & ElevatorEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], object>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export declare function queryElevatorContainer(src: BaseWidget): rx.Observable<import("@wfh/reactivizer").SimplexReactor<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & ElevatorEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], object>>;
export {};
