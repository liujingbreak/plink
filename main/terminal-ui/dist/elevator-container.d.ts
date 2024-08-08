import * as rx from 'rxjs';
import { CoreOptsOfExtSmplxRctr, SingleActionFactory } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer, Rectangle } from './index';
interface ElevatorActions {
    /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
    toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
export declare function createElevator(opts: CoreOptsOfExtSmplxRctr<TerminalContainer, ElevatorActions>): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetMessages & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetOutput & Record<string, never>, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetMessages & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetOutput, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetMessages, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached"], unknown>>>;
export declare function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]>;
export {};
