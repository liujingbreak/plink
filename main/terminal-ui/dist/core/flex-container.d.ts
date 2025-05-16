import * as rx from 'rxjs';
import { SingleActionFactory, CreateOptsOfFac, SimplexReactorOfFac } from '@wfh/reactivizer';
import { BaseWidget } from './base.js';
import { TextStyle } from './canvas.js';
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
export declare const flexContainerFac: import("@wfh/reactivizer").DerivedReactorFactory<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & FlexContainerEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], [], import("@wfh/reactivizer").CoreOptions<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & FlexContainerEvents>, []>;
export type FlexContainer = SimplexReactorOfFac<typeof flexContainerFac>;
export type FlexContainerOpts = CreateOptsOfFac<typeof flexContainerFac>;
export declare function createFlexContainer(opts?: FlexContainerOpts): import("@wfh/reactivizer").SimplexReactor<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & FlexContainerEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], object>;
export declare function shrinkEachSize(chdPrefSizes: number[], shrinkOfEach: number[], availableSpace: number): number[];
