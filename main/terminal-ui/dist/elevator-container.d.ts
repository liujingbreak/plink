import * as rx from 'rxjs';
import { CoreOptions, SingleActionFactory, SimplexReactorOfFac, CreateOptsOfFac } from '@wfh/reactivizer';
import { RootFocusServiceOpts } from './focusable';
import { KeyEventServcie } from './keyEvent';
import { BaseWidget, Rectangle, TerminalCanvasOptions } from './index';
interface ElevatorActions {
    /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
    toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
interface ElevatorEvents extends ElevatorActions {
    onFocusServieReady(chd: BaseWidget): SingleActionFactory;
}
export declare const elevatorFac: import("@wfh/reactivizer").DerivedReactorFactory<ElevatorEvents, readonly [], [keyEventSvc: KeyEventServcie, opts?: ElevatorOptions | undefined], import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
export interface ElevatorOptions {
    default?: CoreOptions;
    core?: CreateOptsOfFac<typeof elevatorFac>;
    /** Internal canvas */
    canvas?: TerminalCanvasOptions;
    focusable?: RootFocusServiceOpts;
}
export type ElevatorContainer = SimplexReactorOfFac<typeof elevatorFac>;
export declare function createElevator(keyEventSvc: KeyEventServcie, opts?: ElevatorOptions): import("@wfh/reactivizer").DerivedSimplexReactor<ElevatorEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[]>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export {};
