import * as rx from 'rxjs';
import { SingleActionFactory, SimplexReactorOfFac, CoreOptions, CreateOptsInDef } from '@wfh/reactivizer';
import { LazyLoadPlaceHolderOpts } from './lazy-load-placeholder';
import { MultiLineTextWidgetOpts } from './text';
import { baseContainerFac } from './container';
import { FlexContainerOpts } from './flex-container';
import { BaseWidget, TextStyle, BackgroundStyle } from './index';
export declare enum TableBorderType {
    border = 0,
    rowSeparator = 1,
    columnSeparator = 2
}
export declare enum TableHoriAlig {
    left = 0,
    middle = 1,
    right = 2
}
export declare enum TableVertAlig {
    top = 0,
    middle = 1,
    bottom = 2
}
export interface TableInput {
    setLazyLoad(enableLazy: boolean, handler?: (pageIndex: number) => rx.Observable<[key: unknown, comp: (BaseWidget | string)[]]>): SingleActionFactory;
    addRow(cells: (string | BaseWidget)[]): SingleActionFactory;
    insertRow(index: number, cells: (string | BaseWidget)[]): SingleActionFactory;
    /** response: "didGetRowByIndex" */
    getRowByIndex(index: number): SingleActionFactory;
    /** Remove all child components of entire row
     * @param autoDispose default `true`, dispose removed child components
     */
    removeRow(zeroBasedIndices: number[], autoDispose: boolean): SingleActionFactory;
    /** accept zero based index number of column and row */
    updateCell(column: number, row: number, data: string): SingleActionFactory;
    setColumnBorderSpacing(value: number): SingleActionFactory;
    setRowSpacing(value: number): SingleActionFactory;
    /** default is `columnSeparator` */
    setBorderType(types: TableBorderType, enabled: boolean): SingleActionFactory;
    setBorderStyle(style: TextStyle): SingleActionFactory;
    setBorderPadding(paddingX: number, paddingY: number): SingleActionFactory;
    setColumnSpacing(value: number): SingleActionFactory;
    setCellBackground(renderer: (columnIdx: number, rowIdx: number) => BackgroundStyle | void | null | undefined): SingleActionFactory;
    alignCell(horizontal: TableHoriAlig, vertical: TableVertAlig): SingleActionFactory;
}
interface TableEvents extends TableInput {
    /** In context of "addRow" or "insertRow" */
    onRowAdded(index: number, rowKey: unknown, cells: BaseWidget[]): SingleActionFactory;
    /** In context of "removeRow" */
    onRowRemoved(rowKey: unknown, cells: BaseWidget[]): SingleActionFactory;
    onBorderTypeSet(typeSet: Set<TableBorderType>): SingleActionFactory;
    onCellBgRender(col: number, row: number): SingleActionFactory;
    rowById<K>(rows: Map<K, BaseWidget[]>): SingleActionFactory;
    calcSize(contrainWidth?: number): SingleActionFactory;
    didCalcSize(columnWidths: number[], rowHeights: number[], totalWidth: number, totalHeight: number, beforePhHeight?: number, afterPh?: number): SingleActionFactory;
    rowIds(idList: unknown[]): SingleActionFactory;
    didGetRowByIndex(cells: BaseWidget[]): SingleActionFactory;
}
export type TableCoreOptions = CreateOptsInDef<TableEvents, typeof baseContainerFac>;
export type TableOptions = {
    default?: CoreOptions;
    core?: TableCoreOptions;
    moreIndicator?: Partial<FlexContainerOpts>;
    lazy?: LazyLoadPlaceHolderOpts;
    optsForCellComponent?: MultiLineTextWidgetOpts;
};
export declare const tableFac: import("@wfh/reactivizer").DerivedReactorFactory<TableEvents, readonly ["rowById", "setColumnSpacing", "onBorderTypeSet", "setRowSpacing", "setLazyLoad", "setBorderStyle", "setBorderPadding", "alignCell", "didCalcSize", "setCellBackground", "rowIds"], [opts?: TableOptions | undefined], import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck")[], []>;
export type Table = SimplexReactorOfFac<typeof tableFac>;
export declare function createTable(opts?: TableOptions): import("@wfh/reactivizer").DerivedSimplexReactor<TableEvents & import("./container").TermainlContainerEvents & import("./base").BaseWidgetEvents, readonly ("onSize" | "onTransform" | "onPosition" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDetached" | "setFlexShrink" | "setBackground" | "onBgChangeWithParent" | "bgCleared" | "setFocusable" | "setRenderChanges" | "isContainer" | "depth" | "focusService" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "isOpaque" | "latestReflowData" | "isLayoutDirty" | "setLayoutCheck" | "setBorderStyle" | "setLazyLoad" | "rowById" | "setColumnSpacing" | "onBorderTypeSet" | "setRowSpacing" | "setBorderPadding" | "alignCell" | "didCalcSize" | "setCellBackground" | "rowIds")[]>;
export {};
