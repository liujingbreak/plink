import * as rx from 'rxjs';
import { CreateOptsOfExtendedFac, CoreOptions, SingleActionFactory } from '@wfh/reactivizer';
import { LazyLoadPlaceHolderOpts } from './lazy-load-placeholder.js';
import { flexContainerFac } from './flex-container.js';
import { MultiLineTextWidgetOpts } from './text.js';
import { BaseWidget } from './base.js';
export type PageLoader = (pageIndex: number) => rx.Observable<[key: unknown, comp: (BaseWidget | string)]>;
export interface InfiniteFlexEvents {
    onItemLoaded(index: number, key: unknown, comp: BaseWidget): SingleActionFactory;
}
export interface InfiniteFlexOpts {
    default?: CoreOptions<any>;
    core?: CreateOptsOfExtendedFac<typeof flexContainerFac, InfiniteFlexEvents>;
    lazyLoad?: LazyLoadPlaceHolderOpts;
    textWidget?: MultiLineTextWidgetOpts;
}
export declare const infiniteFlexContainerFac: import("@wfh/reactivizer").DerivedReactorFactory<import("./base.js").BaseWidgetEvents & import("./container.js").TermainlContainerEvents & import("./flex-container.js").FlexContainerEvents & InfiniteFlexEvents, ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], [], InfiniteFlexOpts, [handler: PageLoader]>;
