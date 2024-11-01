import * as rx from 'rxjs';
import { CoreOptsOfExtSmplxRctr, CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { TerminalContainer } from './container';
import { FocusableOptions, FocusService } from './focusable';
import { BaseWidget, Rectangle, TerminalCanvasOptions } from './index';
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
    focusable?: FocusableOptions;
}
export declare function createElevator(opts?: ElevatorOptions): import("@wfh/reactivizer").DerivedSimplexReactor<import("./base").BaseWidgetEvents<import("./base").BaseWidgetRenderData> & import("./container").TermainlContainerEvents & ElevatorEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "latestRenderData" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData")[]>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export {};
