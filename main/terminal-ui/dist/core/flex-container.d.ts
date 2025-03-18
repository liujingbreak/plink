import * as rx from 'rxjs';
import { SingleActionFactory, CreateOptsInDef, SimplexReactorOfFac } from '@wfh/reactivizer';
import { BaseWidget } from './base';
import { baseContainerFac } from './container';
import { TextStyle } from './canvas';
export declare enum FlexBorderSeparator {
    none = 0,
    line = 1
}
export interface FlexContainerInput {
    setDirection(dir: 'col' | 'row'): SingleActionFactory;
    justifyContent(value: 'stretch' | 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
    alignItems(value: 'stretch' | 'start' | 'center' | 'end'): SingleActionFactory;
    /** Effective only when "setDirection" is `"row"`, default is 1 */
    setBorderSpacing(value: number): SingleActionFactory;
    /** Effective only when "setDirection" is `"row"` */
    setBorderSeparator(separator: FlexBorderSeparator): SingleActionFactory;
    setBorderSeparatorStyle(style: TextStyle): SingleActionFactory;
    setLazyLoad(enableLazy: boolean, handler?: (pageIndex: number) => rx.Observable<[key: unknown, comp: (BaseWidget | string)]>): SingleActionFactory;
}
export interface FlexContainerEvents extends FlexContainerInput {
    onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}
export declare const flexContainerFac: import("@wfh/reactivizer").DerivedReactorFactory<FlexContainerEvents, readonly ["setDirection", "alignItems", "justifyContent", "setBorderSpacing", "setBorderSeparator", "setBorderSeparatorStyle"], [opts?: import("@wfh/reactivizer").CoreOptions<import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents & FlexContainerEvents> | undefined], import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
export type FlexContainer = SimplexReactorOfFac<typeof flexContainerFac>;
export type FlexContainerOpts = CreateOptsInDef<FlexContainerEvents, typeof baseContainerFac>;
export declare function createFlexContainer(opts?: FlexContainerOpts): import("@wfh/reactivizer").DerivedSimplexReactor<FlexContainerEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>;
export declare function shrinkEachSize(chdPrefSizes: number[], shrinkOfEach: number[], availableSpace: number): number[];
