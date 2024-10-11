import * as rx from 'rxjs';
import { CoreOptsOfExtSmplxRctr, CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { FocusableOptions, FocusService } from './focusable';
import { BaseWidget, TerminalContainer, Rectangle, TerminalCanvasOptions } from './index';
interface ElevatorActions {
    /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
    toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
interface ElevatorEvents extends ElevatorActions {
    onFocusServieReady(chd: BaseWidget, focusable: FocusService): SingleActionFactory;
}
export interface ElevatorOptions {
    default?: CoreOptions;
    core?: CoreOptsOfExtSmplxRctr<TerminalContainer, ElevatorActions>;
    /** Internal canvas */
    canvas?: TerminalCanvasOptions;
    focus?: FocusableOptions;
}
export declare function createElevator(opts?: ElevatorOptions): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents & ElevatorEvents, readonly ("onSize" | "onTransform" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData")[]>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export {};
