import * as rx from 'rxjs';
import { CreateOptsInDef, CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { LazyLoadPlaceHolderOpts } from './lazy-load-placeholder';
import { flexContainerFac } from './flex-container';
import { MultiLineTextWidgetOpts } from './text';
import { BaseWidget } from './base';
export type PageLoader = (pageIndex: number) => rx.Observable<[key: unknown, comp: (BaseWidget | string)]>;
export interface InfiniteFlexEvents {
    onItemLoaded(index: number, key: unknown, comp: BaseWidget): SingleActionFactory;
}
export type InfiniteFlexOpts = {
    default?: CoreOptions<any>;
    core?: CreateOptsInDef<InfiniteFlexEvents, typeof flexContainerFac>;
    lazyLoad?: LazyLoadPlaceHolderOpts;
    textWidget?: MultiLineTextWidgetOpts;
};
export declare const infiniteFlexContainerFac: import("@wfh/reactivizer").DerivedReactorFactory<InfiniteFlexEvents, readonly [], [handler: PageLoader, opts?: InfiniteFlexOpts | undefined], import("./flex-container").FlexContainerInput & import("./flex-container").FlexContainerEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "offsetParent" | "isOffsetParent" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], [opts?: CoreOptions<import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents & import("./flex-container").FlexContainerInput & import("./flex-container").FlexContainerEvents> | undefined]>;
