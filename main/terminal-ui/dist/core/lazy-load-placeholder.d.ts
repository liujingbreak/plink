import { CoreOptions, SingleActionFactory, SimplexReactor, BaseReactorFactory } from '@wfh/reactivizer';
import { FlexContainerOpts } from './flex-container';
import { MultiLineTextWidgetOpts } from './text';
import { FocusService } from './focusable';
/** The consumer container should interect with messages defined by this interface.
 * In this file the term "page" is meant to the bunch of data which is filled by a single time
 * API response, it does nothing to do with visual screen "page" that we used to refer to in UI,
 * so that to fill up entire visible screen size of "page", it may involve multiple times API replied
 * "page".
 **/
export interface LazyLoadDataProviderActions {
    /** The data provider should handle this event */
    dp_onLoadPage(pageIdx: number, type: 'prepend' | 'append'): SingleActionFactory;
    /** The data provider should dispatch this action in context of "dp_onLoadPage" events */
    dp_didLoad<T>(loadedItems: T[]): SingleActionFactory;
    /** The data provider may respond to this event, the event message is in context of "dp_onLoadPage" */
    dp_onCancelLoad(pageIdx: number): SingleActionFactory;
    /** The container should handle this event, and remove child components from its layout */
    dp_onUnload<T>(pageIdx: number, components: T[] | undefined): SingleActionFactory;
    /** There are 2 ways for LazyLoadPlaceHolder to detect the total number of pages, so that
     * "loading" placeholder will become invisible once the last page data has been loaded.
     * 1) Consumer container explicitly dispatch dp_setTotalPageNum message
     * 2) or consumer container dispatch "setViewportSize" message
     **/
    dp_setTotalPageNum(numOfPages: number | 'unknown'): SingleActionFactory;
    dp_onLoadError(err: unknown, pageIdx: number): SingleActionFactory;
    /** during loading, focusService's event handling will be paused until loading succeeded */
    dp_mgrFocusService(focus: FocusService): SingleActionFactory;
}
/** The consumer container should also interect with messages defined by this interface */
export interface PlaceHolderInput extends LazyLoadDataProviderActions {
    /** The container should dispatch this message base on calculation of its own size whenever it reflows,
     * the size should exclude loading placeholders */
    setAveragePageSize(widthOrHeight: number): SingleActionFactory;
    /** Consumer container must set either "setViewportSize" or "setMaxLoadedPages",
     * if "setViewportSize" is provided, a value of "setMaxLoadedPages" will be automatically inferenced,
     * service will delete loaded pages which are not within viewport from internal cache to maintain its
     * size to be under the value of "setMaxLoadedPages"
     **/
    setViewportSize(width: number, height: number): SingleActionFactory;
    /** Consumer container must set either "setViewportSize" or "setMaxLoadedPages",
     * if "setViewportSize" is provided, a value of "setMaxLoadedPages" will be automatically inferenced.
     * Be aware that this value must be bigger than the number of pages that are visible within current viewport.
     **/
    setMaxLoadedPages(num: number): SingleActionFactory;
    setLabel(text: string): SingleActionFactory;
    setExpandDir(dir: 'col' | 'row'): SingleActionFactory;
    /** Responding with didQueryLoadedPages */
    queryLoadedPages(): SingleActionFactory;
    didQueryLoadedPages(pages: number[]): SingleActionFactory;
}
export interface PlaceHolderEvents extends PlaceHolderInput {
    onPagesLoaded(isHead: boolean, startIdx: number, endIdx: number, components: unknown[]): SingleActionFactory;
    onBeforePages(num: number): SingleActionFactory;
    onAfterPages(num: number): SingleActionFactory;
    requestPages(isHeadPlaceHolder: boolean, pageStartIdx: number, numOfPage: number): SingleActionFactory;
    requestPage(isHeadPlaceHolder: boolean, pageIdx: number): SingleActionFactory;
    cancelRequestPage(pageIdx: number): SingleActionFactory;
    beforePageRange(start: number, end: number): SingleActionFactory;
    afterPageRange(start: number, end: number): SingleActionFactory;
}
declare const tableFor: readonly ["setExpandDir", "setLabel", "setAveragePageSize", "onBeforePages", "onAfterPages", "beforePageRange", "afterPageRange", "dp_setTotalPageNum", "setMaxLoadedPages"];
export type LazyLoadPlaceHolderOpts = {
    default?: CoreOptions<any>;
    core?: CoreOptions<PlaceHolderEvents>;
    headPlaceHolder?: Partial<FlexContainerOpts>;
    tailPlaceHolder?: Partial<FlexContainerOpts>;
    headPlaceHolderLabel?: Partial<MultiLineTextWidgetOpts>;
    tailPlaceHolderLabel?: Partial<MultiLineTextWidgetOpts>;
};
export type LazyLoadPlaceHolder = SimplexReactor<PlaceHolderEvents, typeof tableFor>;
export declare const placeHolderFac: BaseReactorFactory<PlaceHolderEvents, readonly ["setExpandDir", "setLabel", "setAveragePageSize", "onBeforePages", "onAfterPages", "beforePageRange", "afterPageRange", "dp_setTotalPageNum", "setMaxLoadedPages"], [before: import("@wfh/reactivizer").DerivedSimplexReactor<import("./flex-container").FlexContainerEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>, after: import("@wfh/reactivizer").DerivedSimplexReactor<import("./flex-container").FlexContainerEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>, opts?: LazyLoadPlaceHolderOpts | undefined]>;
export declare function createPlaceHolder(opts?: LazyLoadPlaceHolderOpts): {
    before: import("@wfh/reactivizer").DerivedSimplexReactor<import("./flex-container").FlexContainerEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>;
    after: import("@wfh/reactivizer").DerivedSimplexReactor<import("./flex-container").FlexContainerEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "render" | "setFocusStyle" | "setBackground" | "setForeground" | "onFgChangeWithParent" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[]>;
    service: SimplexReactor<PlaceHolderEvents, readonly ["setExpandDir", "setLabel", "setAveragePageSize", "onBeforePages", "onAfterPages", "beforePageRange", "afterPageRange", "dp_setTotalPageNum", "setMaxLoadedPages"]>;
};
export {};
