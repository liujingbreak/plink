import { CoreOptions, SingleActionFactory, SimplexReactor } from '@wfh/reactivizer';
import { FlexContainerOpts } from './flex-container';
import { MultiLineTextWidgetOpts } from './text';
/** The implementation container should interect with messages defined by this interface */
export interface LazyLoadActions {
    /** The implementation container should handle this event */
    onLoadPage(pageIdx: number, type: 'prepend' | 'append'): SingleActionFactory;
    /** The container should dispatch this action in context of onLoadPage events */
    didLoad<T>(loadedItems: T[]): SingleActionFactory;
    /** The container should handle this event, and remove child components from its layout */
    onUnload<T>(pageIdx: number, components: T[] | undefined): SingleActionFactory;
    /** The container should dispatch this message base on calculation of its own size whenever it reflows */
    setAveragePageSize(widthOrHeight: number): SingleActionFactory;
    setViewportSize(width: number, height: number): SingleActionFactory;
    onLoadedPageChanges(startIndex: number, endIndex: number): SingleActionFactory;
}
export interface PlaceHolderInput extends LazyLoadActions {
    setTotalPageNum(numOfPages: number | 'unknown'): SingleActionFactory;
    setLabel(text: string): SingleActionFactory;
    setExpandDir(dir: 'col' | 'row'): SingleActionFactory;
}
export interface PlaceHolderEvents extends PlaceHolderInput {
    onBeforePages(num: number): SingleActionFactory;
    onAfterPages(num: number): SingleActionFactory;
    onLoadPages(isBefore: boolean, pageStartIdx: number, numOfPage: number): SingleActionFactory;
    beforePageRange(start: number, end: number): SingleActionFactory;
    afterPageRange(start: number, end: number): SingleActionFactory;
    maxLoadedPages(num: number): SingleActionFactory;
}
declare const tableFor: readonly ["setExpandDir", "setLabel", "setAveragePageSize", "onLoadedPageChanges", "onBeforePages", "onAfterPages", "beforePageRange", "afterPageRange", "setTotalPageNum", "maxLoadedPages"];
export type LazyLoadPlaceHolderOpts = {
    default?: CoreOptions<any>;
    core?: Partial<LazyLoadPlaceHolder['opts']>;
    headPlaceHolder?: Partial<FlexContainerOpts>;
    tailPlaceHolder?: Partial<FlexContainerOpts>;
    headPlaceHolderLabel?: Partial<MultiLineTextWidgetOpts>;
    tailPlaceHolderLabel?: Partial<MultiLineTextWidgetOpts>;
};
export type LazyLoadPlaceHolder = SimplexReactor<PlaceHolderEvents, typeof tableFor>;
export declare function createPlaceHolder(opts?: LazyLoadPlaceHolderOpts): {
    before: SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents & import("./flex-container").FlexContainerInput & import("./flex-container").FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent"], unknown>>>;
    after: SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents & import("./flex-container").FlexContainerInput & import("./flex-container").FlexContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "setDirection" | "alignItems" | "justifyContent" | "setBorderSpacing" | "setBorderSeparator" | "setBorderSeparatorStyle")[], SimplexReactor<import("./base").BaseWidgetEvents & import("./base").TermainlContainerEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque")[], SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink", "setBackground", "onBgChangeWithParent"], unknown>>>;
    service: SimplexReactor<PlaceHolderEvents, readonly ["setExpandDir", "setLabel", "setAveragePageSize", "onLoadedPageChanges", "onBeforePages", "onAfterPages", "beforePageRange", "afterPageRange", "setTotalPageNum", "maxLoadedPages"], unknown>;
};
export {};
