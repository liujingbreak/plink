import * as rx from 'rxjs';
import { CoreOptions, SingleActionFactory, SimplexReactorOfFac, CreateOptsOfFac } from '@wfh/reactivizer';
import { FocusableOptions, FocusService } from './focusable';
import { BaseWidget, Rectangle, TerminalCanvasOptions } from './index';
interface ElevatorActions {
    /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
    toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
interface ElevatorEvents extends ElevatorActions {
    onFocusServieReady(chd: BaseWidget, focusable: FocusService): SingleActionFactory;
}
export declare const elevatorFac: import("@wfh/reactivizer").DerivedReactorFactory<ElevatorEvents, readonly [], [opts?: ElevatorOptions | undefined], import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
export interface ElevatorOptions {
    default?: CoreOptions;
    core?: CreateOptsOfFac<typeof elevatorFac>;
    /** Internal canvas */
    canvas?: TerminalCanvasOptions;
    focusable?: FocusableOptions;
}
export type ElevatorContainer = SimplexReactorOfFac<typeof elevatorFac>;
export declare function createElevator(opts?: ElevatorOptions): import("@wfh/reactivizer").DerivedSimplexReactor<ElevatorEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[]>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export {};
