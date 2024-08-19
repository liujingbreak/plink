import { SingleActionFactory, CoreOptsOfExtSmplxRctr } from '@wfh/reactivizer';
import { BaseWidget, TerminalContainer, TextStyle } from './index';
export declare enum TableBorderType {
    none = 0,
    cellSeparator = 1,
    rowSeparator = 2,
    columnSeparator = 3
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
    setHeaders(headers: BaseWidget[] | null): SingleActionFactory;
    addRow(cells: (string | BaseWidget)[]): SingleActionFactory;
    removeRow(zeroBasedIndex: number): SingleActionFactory;
    setColumnBorderSpacing(value: number): SingleActionFactory;
    setRowSpacing(value: number): SingleActionFactory;
    /** default is `columnSeparator` */
    setBorderType(style: TableBorderType): SingleActionFactory;
    setBorderStyle(style: TextStyle): SingleActionFactory;
    setColumnSpacing(value: number): SingleActionFactory;
    alignCell(horizontal: TableHoriAlig, vertical: TableVertAlig): SingleActionFactory;
}
interface TableEvents extends TableInput {
    /** In context of "addRow" */
    onRowAdded(id: number, cells: BaseWidget[]): SingleActionFactory;
    rowById(rows: Map<number, BaseWidget[]>): SingleActionFactory;
    calcSize(contrainWidth?: number): SingleActionFactory;
    didCalcSize(columnWidths: number[], rowHeights: number[], totalWidth: number, totalHeight: number): SingleActionFactory;
}
export declare function createTable(opts: CoreOptsOfExtSmplxRctr<TerminalContainer, TableEvents>): import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetEvents & TableEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions" | "setBorderStyle" | "setHeaders" | "rowById" | "setColumnSpacing" | "setBorderType" | "setRowSpacing" | "alignCell")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents & import("./base").ContainerWidgetInput & import("./base").ContainerWidgetEvents, readonly ("onSize" | "overflow" | "preferredSize" | "prefHeightFor" | "prefWidthFor" | "setParent" | "needRerender" | "setPreferredSize" | "setFlexGrow" | "ofCanvas" | "setDisplay" | "onBoundingBox" | "onDettached" | "setFlexShrink" | "allChildren" | "allDisplayChildren" | "setLayoutValid" | "setBackground" | "onBgChangeWithParent" | "onChildPreferredSizeChange" | "hasOfflineCanvas" | "onChildPositions")[], import("@wfh/reactivizer").SimplexReactor<import("./base").BaseWidgetEvents, readonly ["onSize", "overflow", "preferredSize", "prefHeightFor", "prefWidthFor", "setParent", "needRerender", "setPreferredSize", "setFlexGrow", "ofCanvas", "setDisplay", "onBoundingBox", "onDettached", "setFlexShrink"], unknown>>>;
export {};
