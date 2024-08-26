import * as rx from 'rxjs';
import { CoreOptsOfExtSmplxRctr, CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer, Rectangle, TerminalCanvasOptions } from './index';
interface ElevatorActions {
    /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
    toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
export interface ElevatorOptions {
    default?: CoreOptions;
    core?: CoreOptsOfExtSmplxRctr<TerminalContainer, ElevatorActions>;
    /** Internal canvas */
    canvas?: TerminalCanvasOptions;
}
export declare function createElevator(opts?: ElevatorOptions): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents & ElevatorActions, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent"], unknown>>>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export {};
