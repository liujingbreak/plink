import * as rx from 'rxjs';
import { CreateOptsInDef, CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { LazyLoadPlaceHolderOpts } from './lazy-load-placeholder.js';
import { flexContainerFac } from './flex-container.js';
import { MultiLineTextWidgetOpts } from './text.js';
import { BaseWidget } from './base.js';
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
export declare const infiniteFlexContainerFac: import("@wfh/reactivizer").DerivedReactorFactory<InfiniteFlexEvents, readonly [], [handler: PageLoader, opts?: InfiniteFlexOpts | undefined], import("./flex-container.js").FlexContainerEvents & import("./container.js").TermainlContainerEvents & import("./base.js").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], [opts?: CoreOptions<import("./container.js").TermainlContainerEvents & import("./base.js").BaseWidgetEvents & import("./flex-container.js").FlexContainerEvents> | undefined]>;
