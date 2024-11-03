"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableVertAlig = exports.TableHoriAlig = exports.TableBorderType = void 0;
exports.createTable = createTable;
/* eslint-disable array-bracket-newline */
const rx = __importStar(require("rxjs"));
const gl_matrix_1 = require("gl-matrix");
const reactivizer_1 = require("@wfh/reactivizer");
const rectangle_overlap_tree_1 = require("./rectangle-overlap-tree");
const lazy_load_placeholder_1 = require("./lazy-load-placeholder");
const text_1 = require("./text");
const canvas_1 = require("./canvas");
const index_1 = require("./index");
var TableBorderType;
(function (TableBorderType) {
    TableBorderType[TableBorderType["border"] = 0] = "border";
    TableBorderType[TableBorderType["rowSeparator"] = 1] = "rowSeparator";
    TableBorderType[TableBorderType["columnSeparator"] = 2] = "columnSeparator";
})(TableBorderType || (exports.TableBorderType = TableBorderType = {}));
var TableHoriAlig;
(function (TableHoriAlig) {
    TableHoriAlig[TableHoriAlig["left"] = 0] = "left";
    TableHoriAlig[TableHoriAlig["middle"] = 1] = "middle";
    TableHoriAlig[TableHoriAlig["right"] = 2] = "right";
})(TableHoriAlig || (exports.TableHoriAlig = TableHoriAlig = {}));
var TableVertAlig;
(function (TableVertAlig) {
    TableVertAlig[TableVertAlig["top"] = 0] = "top";
    TableVertAlig[TableVertAlig["middle"] = 1] = "middle";
    TableVertAlig[TableVertAlig["bottom"] = 2] = "bottom";
})(TableVertAlig || (exports.TableVertAlig = TableVertAlig = {}));
const tableFor = ['rowById', 'setColumnSpacing', 'onBorderTypeSet', 'setRowSpacing', 'setLazyLoad',
    'setBorderStyle', 'setBorderPadding', 'alignCell', 'didCalcSize', 'setCellBackground', 'rowIds'
];
function createTable(opts) {
    var _a;
    const base = (0, index_1.createContainerBase)(Object.assign(Object.assign({ name: 'table' }, opts === null || opts === void 0 ? void 0 : opts.default), opts === null || opts === void 0 ? void 0 : opts.core));
    const service = base.config({
        debugExcludeTypes: ['renderChild', 'onCellBgRender', ...((_a = base.opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : [])],
        tableFor
    }).forExtend();
    // eslint-disable-next-line prefer-const
    let { s, r, table } = service;
    // intercept onRender
    s.appendInterceptorToSrc(action$ => {
        const ad = reactivizer_1.ActionDispenser.ofAction$(action$);
        return rx.merge(rx.merge(ad.pt.onRender, ad.pt.findOverlaps).pipe(rx.ignoreElements()), ad.ofOtherTypes());
    });
    const rows = new Map();
    const rowIds = [];
    const childBoundingTree = new rectangle_overlap_tree_1.RectangleOverlapTree();
    const cellBoundingTree = new rectangle_overlap_tree_1.RectangleOverlapTree();
    let rowIdSeed = 0;
    const moreIndicator = (0, index_1.createFlexContainer)(Object.assign(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.default), { name: 'table.more' }), opts === null || opts === void 0 ? void 0 : opts.moreIndicator));
    moreIndicator.s.ft.justifyContent('center').dp();
    const moreText = (0, text_1.createTextWidget)('More...', Object.assign(Object.assign({}, opts), { name: 'table.more.text' }));
    moreIndicator.s.ft.addChild(moreText).dp();
    let lazyService;
    let beforePlaceHolder;
    let afterPlaceHolder;
    const pageLoaded = new Set();
    r('setLazyLoad, "lazyService".dp_onLoadPage -> "lazyService", addChild, insertChild...', s.pt.setLazyLoad.pipe(rx.switchMap(([m, enabled, handler]) => {
        var _a;
        if (enabled && lazyService == null) {
            const { service: lazyService0, before, after } = (0, lazy_load_placeholder_1.createPlaceHolder)(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.lazy), { default: Object.assign(Object.assign({ name: 'table.lazy' }, opts === null || opts === void 0 ? void 0 : opts.default), (_a = opts === null || opts === void 0 ? void 0 : opts.lazy) === null || _a === void 0 ? void 0 : _a.default) }));
            lazyService = lazyService0;
            beforePlaceHolder = before;
            afterPlaceHolder = after;
            // s.ft.insertChild(0, [beforePlaceHolder]).dp(m);
            s.ft.addChild(beforePlaceHolder, afterPlaceHolder).dp(m);
            if (handler) {
                return rx.merge(lazyService.s.pt.dp_onLoadPage.pipe(rx.mergeMap(([m, pageIdx, _type]) => handler(pageIdx).pipe(rx.takeUntil(lazyService0.s.pt.dp_onCancelLoad.pipe(rx.filter(([, page]) => page === pageIdx))), rx.reduce((all, row) => { all.push(row); return all; }, []), rx.map(rowWithKeys => {
                    for (const [k, row] of rowWithKeys) {
                        if (rows.has(k)) {
                            service.log('current rows', [...rows.keys()]);
                            throw new Error(`Duplicate key is used on different rows, key: "${rowWithKeys.map(([key]) => key).join()}"`);
                        }
                        rows.set(k, createRow(row));
                    }
                    if (rowWithKeys.length > 0) {
                        pageLoaded.add(pageIdx);
                    }
                    lazyService0.s.ft.dp_didLoad(rowWithKeys.map(([key]) => key)).dp(m);
                }), rx.catchError(err => {
                    lazyService0.s.ft.dp_onLoadError(err, pageIdx).dp(m, m.r);
                    return rx.EMPTY;
                })))), lazyService.s.pt.onPagesLoaded.pipe(rx.map(([m, isHead, _pStart, _pEnd, rowKeys]) => {
                    for (const key of rowKeys) {
                        s.ft.onRowAdded(isHead ? 0 : rowIds.length, key, rows.get(key)).dp(m);
                        s.ft.addChild(...rows.get(key)).dp(m);
                    }
                    if (isHead) {
                        rowIds.unshift(...rowKeys);
                    }
                    else
                        rowIds.push(...rowKeys);
                    // service.log('>>> after onPagesLoaded, rowIds', rowIds.length, 'rows.size', rows.size);
                })));
            }
        }
        else if (!enabled && lazyService != null && beforePlaceHolder && afterPlaceHolder) {
            s.ft.removeChild(beforePlaceHolder, afterPlaceHolder).dp(m);
            beforePlaceHolder.dispose();
            afterPlaceHolder.dispose();
            lazyService.dispose();
            lazyService = undefined;
            beforePlaceHolder = undefined;
            afterPlaceHolder = undefined;
            pageLoaded.clear();
        }
        return rx.EMPTY;
    })));
    r('setLazyLoad, lazyService.dp_onUnload... -> removeRow, lazyService.setAveragePageSize', s.pt.setLazyLoad.pipe(rx.distinctUntilChanged(([, enabledA], [, enabledB]) => enabledA === enabledB), rx.switchMap(([, enable]) => {
        if (enable && lazyService) {
            return rx.merge(lazyService.s.pt.dp_onUnload.pipe(rx.map(([m, pIdx, ids]) => {
                pageLoaded.delete(pIdx);
                if (ids == null)
                    return;
                const idSet = new Set(ids !== null && ids !== void 0 ? ids : []);
                let idx = 0;
                const toDel = [];
                for (const id of rowIds) {
                    if (idSet.has(id)) {
                        idSet.delete(id);
                        toDel.push(idx);
                    }
                    idx++;
                }
                s.ft.removeRow(toDel, true).dp(m);
            })), s.pt.onRender.pipe(rx.mergeMap(a => rx.combineLatest([
                table.l.onSize,
                table.l.setBorderPadding,
                table.l.onBorderTypeSet,
                beforePlaceHolder.table.l.onSize,
                afterPlaceHolder.table.l.onSize
            ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.map(([[m, , , , clips], [, , th], [, , paddingY], [, border], [, , bh], [, , ah]]) => {
                if (pageLoaded.size === 0)
                    return;
                let height = th - bh - ah;
                if (border.has(TableBorderType.border))
                    height -= (paddingY + 1) << 1;
                const pageHeight = Math.floor(height / pageLoaded.size);
                // service.log('>>> onRender height:', height, 'pageLoaded', pageLoaded.size, 'rowIds', rowIds.join());
                lazyService.s.ft.setAveragePageSize(pageHeight).dp(m);
                const minRect = clips.reduce((min, [x, y, w, h]) => {
                    if (x > min[0])
                        min[0] = x;
                    if (y > min[1])
                        min[1] = y;
                    if (x + w < min[0] + min[2])
                        min[2] = x + w - min[0];
                    if (y + h < min[1] + min[3])
                        min[3] = y + h - min[1];
                    return min;
                }, [0, 0, Number.MAX_VALUE, Number.MAX_VALUE]);
                lazyService.s.ft.setViewportSize(minRect[2], minRect[3]).dp(m);
            })));
        }
        else
            return rx.EMPTY;
    })));
    r('setBorderType', s.pt.setBorderType.pipe(rx.withLatestFrom(table.l.onBorderTypeSet), rx.map(([[m, type, enabled], [, typeSet]]) => {
        if (enabled)
            typeSet.add(type);
        else
            typeSet.delete(type);
        s.ft.onBorderTypeSet(typeSet).dp(m);
    })));
    r('calcSize -> didCalcSize', s.pt.calcSize.pipe(rx.mergeMap(([m, contrainWidth]) => {
        const rowArr = [...rows.values()];
        return rx.combineLatest([
            // eslint-disable-next-line multiline-ternary
            rowArr.length === 0 ? rx.of([]) :
                rx.combineLatest(rowArr.map(cells => rx.combineLatest(cells.map(c => c.table.l.preferredSize)).pipe(rx.take(1), rx.map(colSizes => colSizes.map(([, w, h]) => [w, h]))))),
            table.l.setRowSpacing,
            table.l.onBorderTypeSet,
            table.l.setColumnSpacing,
            table.l.setBorderPadding,
            beforePlaceHolder ? beforePlaceHolder.table.l.preferredSize.pipe(rx.map(([, w, h]) => [w, h])) : rx.of([0, 0]),
            afterPlaceHolder ? afterPlaceHolder.table.l.preferredSize.pipe(rx.map(([, w, h]) => [w, h])) : rx.of([0, 0])
        ]).pipe(rx.take(1), rx.mergeMap(([rowPrefSizes, [, rowSp], [, border], [, colSp], [, paddingX, paddingY], [beforeW, beforeH], [afterW, afterH]]) => {
            let placeholderWidth = Math.max(beforeW, afterW);
            if (contrainWidth)
                placeholderWidth = contrainWidth < placeholderWidth ? contrainWidth : placeholderWidth;
            if (rowPrefSizes.length === 0 || rowPrefSizes[0].length === 0) {
                s.ft.didCalcSize([], [], placeholderWidth + (border.has(TableBorderType.border) ? (1 + paddingX) * 2 : 0), beforeH + afterH + (border.has(TableBorderType.border) ? (1 + paddingY) * 2 : 0), beforeH, afterH).dp(m);
                return rx.EMPTY;
            }
            let spHeight = rowSp * (rowPrefSizes.length - 1);
            let spWidth = colSp * (rowPrefSizes[0].length - 1);
            if (border.has(TableBorderType.border)) {
                spHeight += (1 + paddingY) * 2;
                spWidth += (1 + paddingX) * 2;
            }
            if (border.has(TableBorderType.rowSeparator)) {
                spHeight += (rowSp + 1) * (rowPrefSizes.length - 1);
            }
            if (border.has(TableBorderType.columnSeparator)) {
                spWidth += (colSp + 1) * (rowPrefSizes[0].length - 1);
            }
            const maxColWidths = rowPrefSizes[0].map((_s, colIdx) => {
                return rowPrefSizes.map(row => row[colIdx][0]).reduce((max, w) => {
                    if (max < w)
                        max = w;
                    return max;
                }, 0);
            });
            if (contrainWidth != null && contrainWidth < spWidth) {
                s.ft.didCalcSize(maxColWidths.map(() => 0), rowPrefSizes.map(() => 0), contrainWidth, beforeH + afterH + (border.has(TableBorderType.border) ? (1 + paddingY) * 2 : 0), beforeH, afterH).dp(m);
                return rx.EMPTY;
            }
            const sumColWidths = maxColWidths.reduce((sum, it) => sum += it, 0);
            service.log('spWidth =', spWidth, 'sumColWidths =', sumColWidths, 'by column:', maxColWidths);
            if (contrainWidth != null && (contrainWidth - spWidth) < sumColWidths) {
                service.log('Shrink table width');
                const shrinkRatio = (contrainWidth - spWidth) / sumColWidths;
                let floatGap = 0;
                const shrinkedColW = maxColWidths.map(w => {
                    const wFloat = w * shrinkRatio;
                    let wInt = Math.floor(wFloat);
                    floatGap += wFloat - wInt;
                    if (floatGap >= 1) {
                        wInt++;
                        floatGap -= 1;
                    }
                    return wInt;
                });
                service.log('shrinked width of column:', shrinkedColW);
                return rx.combineLatest(rowArr.map(r => rx.combineLatest(r.map((cell, col) => cell.s.ft.querySizeOf(shrinkedColW[col], null)
                    .od(cell.s.pt.prefHeightFor).pipe(rx.take(1)))).pipe(rx.map(prefSizes => {
                    const maxHtOfRow = prefSizes.reduce((max, [, , h]) => {
                        if (max < h)
                            max = h;
                        return max;
                    }, 0);
                    return maxHtOfRow;
                })))).pipe(rx.take(1), rx.mergeMap(rowHeights => {
                    const sum = rowHeights.reduce((sum, h) => {
                        sum += h;
                        return sum;
                    }, 0);
                    if (beforePlaceHolder && afterPlaceHolder) {
                        return rx.combineLatest([
                            beforePlaceHolder.s.ft.querySizeOf(contrainWidth, null).re(m).od(beforePlaceHolder.s.pt.prefHeightFor),
                            afterPlaceHolder.s.ft.querySizeOf(contrainWidth, null).re(m).od(afterPlaceHolder.s.pt.prefHeightFor)
                        ]).pipe(rx.take(1), rx.map(([[, , beforeH], [, , afterH]]) => {
                            return [rowHeights, sum + beforeH + afterH, beforeH, afterH];
                        }));
                    }
                    else {
                        return rx.of([rowHeights, sum]);
                    }
                }), rx.map(([allHeights, totalH, beforeH, afterH]) => {
                    s.ft.didCalcSize(shrinkedColW, allHeights, contrainWidth, totalH + spHeight, beforeH, afterH).dp(m);
                }));
            }
            else {
                const rowHeights = rowPrefSizes.map(rowSizes => rowSizes.map(([, h]) => h).reduce((max, h) => {
                    if (max < h)
                        max = h;
                    return max;
                }, 0));
                const extraHeight$ = (beforePlaceHolder && afterPlaceHolder) ?
                    rx.combineLatest([
                        beforePlaceHolder.table.l.preferredSize,
                        afterPlaceHolder.table.l.preferredSize
                    ]).pipe(rx.map(([[, , h1], [, , h2]]) => {
                        return [h1 + h2, h1, h2];
                    })) :
                    rx.of([0, undefined, undefined]);
                return extraHeight$.pipe(rx.map(([h, beforeH, afterH]) => {
                    s.ft.didCalcSize(maxColWidths, rowHeights, sumColWidths + spWidth, rowHeights.reduce((sum, h) => {
                        sum += h;
                        return sum;
                    }, spHeight + h), beforeH, afterH).dp(m);
                }));
            }
        }));
    })));
    r('addRow, insertRow -> rowById, onRowAdded, addChild', rx.merge(s.pt.addRow.pipe(rx.map(([m, cells]) => [m, -1, cells])), s.pt.insertRow).pipe(rx.map(([m, idx, cells]) => {
        const cellComps = createRow(cells);
        rows.set(rowIdSeed, cellComps);
        s.ft.rowById(rows).dp(m);
        s.ft.onRowAdded(idx === -1 ? rowIds.length : idx, rowIdSeed, cellComps).dp(m);
        s.ft.addChild(...cellComps).dp(m);
        if (idx === -1)
            rowIds.push(rowIdSeed);
        else
            rowIds.splice(idx, 0, rowIdSeed);
        rowIdSeed++;
    })));
    r('removeRow -> removeChild, onRowRemoved', s.pt.removeRow.pipe(rx.map(([m, idxes, autoDispose]) => {
        const rowsToRemove = idxes.map(idx => {
            const id = rowIds[idx];
            const row = rows.get(id);
            if (row)
                rows.delete(id);
            else
                throw new Error(`Can't remove row for key ${id}`);
            s.ft.onRowRemoved(id, row !== null && row !== void 0 ? row : []).dp(m);
            return row;
        });
        for (const cells of rowsToRemove !== null && rowsToRemove !== void 0 ? rowsToRemove : []) {
            if (cells == null)
                continue;
            s.ft.removeChild(...cells).dp(m);
            if (autoDispose)
                cells.map(cell => cell.dispose());
        }
        for (const idx of [...idxes].sort().reverse())
            rowIds.splice(idx, 1);
        if (rowIds.length !== rows.size)
            service.log('>> after remove row, not matched rowIds: ', rowIds, 'with rows', [...rows.keys()]);
    })));
    r('getRowByIndex -> didGetRowByIndex', s.pt.getRowByIndex.pipe(rx.map(([m, idx]) => { var _a; return s.ft.didGetRowByIndex((_a = rows.get(rowIds[idx])) !== null && _a !== void 0 ? _a : []).dp(m); })));
    r('reflow,...->"cellBoundingTree"', s.pt.reflow.pipe(rx.switchMap(([m]) => s.pt.calcSize.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.mergeMap(([m2]) => s.pt.didCalcSize.pipe((0, reactivizer_1.actionRelatedToAction)(m2))), rx.withLatestFrom(table.l.setRowSpacing, table.l.setColumnSpacing, table.l.setBorderPadding, table.l.onBorderTypeSet), rx.map(([[, colWidths, rowHeights, , , beforePhHeight], [, rowSpc], [, colSpc], [, paddingX, paddingY], [, border]]) => {
        // service.log('>>>> table cell sizes:', colWidths, rowHeights);
        cellBoundingTree.clear();
        let rowIdx = 0;
        let y = beforePhHeight !== null && beforePhHeight !== void 0 ? beforePhHeight : 0;
        if (border.has(TableBorderType.border))
            y += 1;
        for (let rowH of rowHeights) {
            rowH += calcCellSpaceSize(border.has(TableBorderType.border), border.has(TableBorderType.rowSeparator), rowIdx, rowHeights.length, paddingY, rowSpc);
            let colIdx = 0;
            let x = border.has(TableBorderType.border) ? 1 : 0;
            for (let colW of colWidths) {
                colW += calcCellSpaceSize(border.has(TableBorderType.border), border.has(TableBorderType.columnSeparator), colIdx, colWidths.length, paddingX, colSpc);
                const r = [x, y, colW, rowH];
                cellBoundingTree.addContent(r, [colIdx, rowIdx, r]);
                colIdx++;
                x += colW;
                if (border.has(TableBorderType.columnSeparator))
                    x += 1;
            }
            y += rowH;
            if (border.has(TableBorderType.rowSeparator))
                y += 1;
            rowIdx++;
        }
    }), rx.take(1)))));
    r('reflow, onChildPositions, child.onSize -> "childBoundingTree"', s.pt.reflow.pipe(rx.switchMap(([m]) => {
        childBoundingTree.clear();
        return rx.combineLatest([
            s.pt.onChildPositions.pipe((0, reactivizer_1.actionRelatedToAction)(m)),
            table.l.allDisplayChildren
        ]).pipe(rx.take(1), 
        // rx.tap(([[, pos], [, children]]) => {
        //   service.log('>>> childBoundingTree positions', pos.size, 'vs children', children.length);
        // }),
        rx.mergeMap(([[, pos], [, children]]) => children.map(chd => [chd, pos.get(chd)])), rx.filter(([, pos]) => pos != null), rx.mergeMap(([chd, pos], idx) => chd.table.l.onSize.pipe(rx.take(1), rx.map(([, w, h]) => {
            const [x, y] = pos;
            childBoundingTree.addContent([x, y, w, h], [idx, chd]);
            // service.log('add child', idx, 'bounding box to tree', x, y, w, h);
        }))));
    })));
    const reflowData = rx.combineLatest([
        table.l.onSize, table.l.alignCell, table.l.setColumnSpacing, table.l.setRowSpacing, table.l.setBorderPadding, table.l.onBorderTypeSet
    ]);
    r('reflow -> overflow, onChildPositions, child.onSize', s.pt.reflow.pipe(rx.switchMap(([m, _clips, _masks]) => {
        return reflowData.pipe(rx.mergeMap(([[, w, h], [, alignCellHori, alignCellVert], [, colSpacing], [, rowSpacing], [, paddingX, paddingY], [, border]]) => {
            return s.ft.calcSize(w).re(m).od(s.pt.didCalcSize).pipe(rx.mergeMap(([, ...calcResults]) => {
                const [, , , totalHeight] = calcResults;
                s.ft.overflow(totalHeight > h).dp(m);
                if (totalHeight > h) {
                    return moreIndicator.s.ft.querySizeOf(border.has(TableBorderType.border) ? w - 2 : w, null).re(m).od(moreIndicator.s.pt.prefHeightFor).pipe(rx.map(([, moreIdcW, moreIdcH]) => [w, h, alignCellHori, alignCellVert, colSpacing, rowSpacing, paddingX, paddingY, border, moreIdcW, moreIdcH, ...calcResults]));
                }
                return rx.of([w, h, alignCellHori, alignCellVert, colSpacing, rowSpacing, paddingX, paddingY, border, 0, 0, ...calcResults]);
            }));
        }), rx.take(1), rx.mergeMap(([tableW, tableH, alignCellHori, alignCellVert, colSpacing, rowSpacing, paddingX, paddingY, border, moreW, moreH, colWidths, rowHeights, _totalWidth, _totalHeight, beforeH, afterH]) => {
            const childPos = new Map();
            let rowTop = border.has(TableBorderType.border) ?
                1 + paddingY :
                0;
            const hasBorder = border.has(TableBorderType.border);
            if (beforePlaceHolder) {
                childPos.set(beforePlaceHolder, [
                    hasBorder ? 1 + paddingX : 0,
                    rowTop
                ]);
                beforePlaceHolder.s.ft.onSize(hasBorder ? tableW - 2 - (paddingX << 1) : tableW, beforeH).dp(m);
                rowTop += beforeH;
            }
            if (afterPlaceHolder) {
                childPos.set(afterPlaceHolder, [
                    hasBorder ? 1 + paddingX : 0,
                    hasBorder ? tableH - afterH - 1 - paddingY : tableH - afterH
                ]);
                afterPlaceHolder.s.ft.onSize(hasBorder ? tableW - 2 - (paddingX << 1) : tableW, afterH).dp(m);
            }
            let heightCon = tableH;
            if (moreH > 0) {
                const moreTop = border.has(TableBorderType.border) ? tableH - moreH - 1 : tableH - moreH;
                childPos.set(moreIndicator, [border.has(TableBorderType.border) ? 1 : 0, moreTop]);
                moreIndicator.s.ft.onSize(moreW, moreH).dp(m);
                heightCon = moreTop;
            }
            // service.log('>>> reflow rowIds count:', rowIds.length, 'rowTop', rowTop, 'beforeH', beforeH, 'height', heightCon, 'row IDs:', rowIds.join());
            return rx.from(rowIds).pipe(rx.takeWhile(() => rowTop < heightCon), rx.concatMap((rowKey, rowIdx) => {
                const row = rows.get(rowKey);
                let cellLeft = border.has(TableBorderType.border) ?
                    1 + paddingX :
                    0;
                if (row == null)
                    throw new Error(`Unknown error of missing row of key: "${rowKey}", row index: "${rowIdx}"`);
                return rx.from(row).pipe(rx.concatMap((cell, cellIdx) => {
                    const width = colWidths[cellIdx];
                    const height = rowHeights[rowIdx];
                    const pos = [cellLeft, rowTop];
                    return cell.table.l.preferredSize.pipe(rx.take(1), 
                    // align cell horizontally
                    rx.mergeMap(([, cpw, cph]) => {
                        if (cpw > width) {
                            return cell.s.ft.querySizeOf(width, null)
                                .od(cell.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , shrinkH]) => [width, shrinkH]));
                        }
                        else {
                            cellLeft += alignCellHori === TableHoriAlig.middle ?
                                (width - cpw) >> 1 :
                                alignCellHori === TableHoriAlig.right ?
                                    width - cpw :
                                    0;
                            pos[0] = cellLeft;
                            return rx.of([cpw, cph]);
                        }
                    }), 
                    // align cell vertically
                    rx.map(([cellCompWidth, cellPrefH]) => {
                        let cellCompHeigth = height;
                        if (cellPrefH < height) {
                            cellCompHeigth = cellPrefH;
                            pos[1] = alignCellVert === TableVertAlig.middle ?
                                rowTop + ((height - cellPrefH) >> 1) :
                                alignCellVert === TableVertAlig.bottom ?
                                    rowTop + (height - cellPrefH) :
                                    0;
                        }
                        if (childPos.has(cell)) {
                            throw new Error(`Duplicate table cell found in reflow function for row key: ${rowKey}, row index: ${rowIdx} cell index ${cellIdx}`);
                        }
                        childPos.set(cell, pos);
                        cell.s.ft.onSize(cellCompWidth, cellCompHeigth).dp(m);
                        cellLeft += width;
                        cellLeft += border.has(TableBorderType.columnSeparator) ?
                            colSpacing * 2 + 1 :
                            colSpacing;
                    }));
                }), rx.finalize(() => {
                    rowTop += rowHeights[rowIdx];
                    if (border.has(TableBorderType.rowSeparator))
                        rowTop += rowSpacing * 2 + 1;
                    else
                        rowTop += rowSpacing;
                }));
            }), rx.finalize(() => {
                // service.log('>>> reflow row\'s top positions', [...childPos.values()].map(([, h]) => h).join(' '),
                //   'total', childPos.size);
                s.ft.onChildPositions(childPos).dp(m);
            }));
        }));
    })));
    const renderData = rx.combineLatest([
        table.l.onBorderTypeSet, table.l.setBorderStyle,
        table.l.setRowSpacing, table.l.setColumnSpacing,
        table.l.setBorderPadding, table.l.onSize
    ]);
    r('extend latestRenderData', table.l.latestRenderData.pipe(rx.take(1), rx.map(([m, origData$]) => {
        s.ft.latestRenderData(rx.combineLatest([renderData, origData$])).dp(m);
    })));
    r('onRender', s.pt.onRender.pipe(rx.mergeMap(([m, canvas, trans, renderSelf, clips, masks]) => {
        return renderData.pipe(rx.take(1), rx.mergeMap(([[, bType], [, bStyle], [, rowSpc], [, colSpc], [, paddingX, paddingY], [, width, height]]) => {
            if (renderSelf) {
                s.ft.renderSelf(canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
                let cellsToRender = clips.flatMap(clip => [...cellBoundingTree.searchOverlaps(clip).map(([, c]) => c)]);
                // service.log('masks', masks?.join('\n'));
                const excludedCells = new Set(masks ? masks.map(c => cellBoundingTree.searchForCovered(c).map(([col, row]) => col + ',' + row)).flat() : []);
                cellsToRender = cellsToRender.filter(([col, row]) => !excludedCells.has(col + ',' + row));
                for (const [col, row, rect] of cellsToRender) {
                    const pos = [rect[0], rect[1]];
                    gl_matrix_1.vec2.transformMat4(pos, pos, trans);
                    s.ft.onCellBgRender(col, row, canvas, [...pos, rect[2], rect[3]]).dp(m);
                }
            }
            let childToRender = clips.flatMap(clip => [...childBoundingTree.searchOverlaps(clip)].map(([, c]) => c));
            // service.log('>>>>> childToRender', childToRender.length);
            const excluded = new Set(masks ? masks.map(c => childBoundingTree.searchForCovered(c).map(([, w]) => w)).flat() : []);
            childToRender = childToRender.filter(([, c]) => !excluded.has(c));
            if (renderSelf && bType.size > 0) {
                const [colWidths, rowHeights, , , beforePhHeight, afterPhHeight] = table.getData().didCalcSize;
                const minClipLeft = clips.reduce((min, [x]) => {
                    min = min > x ? x : min;
                    return min;
                }, Number.MAX_SAFE_INTEGER);
                const maxClipRight = clips.reduce((max, [x, , w]) => {
                    const r = x + w;
                    max = max < r ? r : max;
                    return max;
                }, 0);
                const minClipTop = clips.reduce((min, [, y]) => {
                    min = min > y ? y : min;
                    return min;
                }, Number.MAX_SAFE_INTEGER);
                const maxClipBottom = clips.reduce((max, [, y, , h]) => {
                    const r = y + h;
                    max = max < r ? r : max;
                    return max;
                }, 0);
                const top = (beforePhHeight !== null && beforePhHeight !== void 0 ? beforePhHeight : 0) + (bType.has(TableBorderType.border) ? 1 + paddingY : 0);
                let rowSepTop = top;
                let left = bType.has(TableBorderType.border) ? 1 + paddingX : 0;
                let rowIdx = 0;
                const rowEndIdx = rowHeights.length - 1;
                const lineWidth = Math.min(width, maxClipRight - minClipLeft);
                // draw top border line
                if (bType.has(TableBorderType.border) && minClipTop <= 0) {
                    const borderPos = [minClipLeft, 0];
                    gl_matrix_1.vec2.transformMat4(borderPos, borderPos, trans);
                    canvas.s.ft.addString(borderPos[0], borderPos[1], '─'.repeat(lineWidth), bStyle).dp(m);
                    if (minClipLeft <= 0) {
                        const borderPos = [0, 0];
                        gl_matrix_1.vec2.transformMat4(borderPos, borderPos, trans);
                        canvas.s.ft.addString(borderPos[0], borderPos[1], '╭', bStyle).dp(m);
                    }
                    if (maxClipRight > width - 1) {
                        const borderPos = [maxClipRight - 1, 0];
                        gl_matrix_1.vec2.transformMat4(borderPos, borderPos, trans);
                        canvas.s.ft.addString(borderPos[0], borderPos[1], '╮', bStyle).dp(m);
                    }
                }
                // draw horizontal separator lines
                if (bType.has(TableBorderType.rowSeparator)) {
                    for (const rowH of rowHeights) {
                        if (rowIdx >= rowEndIdx)
                            break;
                        rowIdx++;
                        const sepY = rowH + rowSepTop + rowSpc;
                        if (clips.some(([, y, , h]) => sepY >= y && sepY < y + h)) {
                            const pos = [minClipLeft, sepY];
                            gl_matrix_1.vec2.transformMat4(pos, pos, trans);
                            canvas.s.ft.addString(pos[0], pos[1], '─'.repeat(lineWidth), bStyle).dp(m);
                        }
                        rowSepTop = sepY + 1 + rowSpc;
                    }
                }
                // draw bottom border line
                if (bType.has(TableBorderType.border) && maxClipBottom >= height) {
                    const borderPos = [minClipLeft, height - 1];
                    gl_matrix_1.vec2.transformMat4(borderPos, borderPos, trans);
                    canvas.s.ft.addString(borderPos[0], borderPos[1], '─'.repeat(lineWidth), bStyle).dp(m);
                    if (minClipLeft <= 0) {
                        const borderPos = [0, height - 1];
                        gl_matrix_1.vec2.transformMat4(borderPos, borderPos, trans);
                        canvas.s.ft.addString(borderPos[0], borderPos[1], '╰', bStyle).dp(m);
                    }
                    if (maxClipRight > width - 1) {
                        const borderPos = [maxClipRight - 1, height - 1];
                        gl_matrix_1.vec2.transformMat4(borderPos, borderPos, trans);
                        canvas.s.ft.addString(borderPos[0], borderPos[1], '╯', bStyle).dp(m);
                    }
                }
                // draw left border line
                if (bType.has(TableBorderType.border) && minClipLeft <= 0) {
                    const posColBorderTop = [0, minClipTop > 0 ? minClipTop : 1];
                    gl_matrix_1.vec2.transformMat4(posColBorderTop, posColBorderTop, trans);
                    const posColBorderBottom = [0, maxClipBottom < height - 1 ? maxClipBottom : height - 1];
                    gl_matrix_1.vec2.transformMat4(posColBorderBottom, posColBorderBottom, trans);
                    for (let y = posColBorderTop[1]; y < posColBorderBottom[1]; y++) {
                        canvas.s.ft.addString(posColBorderTop[0], y, '│', bStyle).dp(m);
                    }
                }
                // draw vertical (column) separator lines and cross syntax
                if (bType.has(TableBorderType.columnSeparator)) {
                    let vertLineTop = beforePhHeight ? beforePhHeight + 1 : 0;
                    if (vertLineTop < minClipTop)
                        vertLineTop = minClipTop;
                    let vertLineBottom = height - (afterPhHeight ? afterPhHeight + 1 : 0);
                    if (vertLineBottom > maxClipBottom)
                        vertLineBottom = maxClipBottom;
                    for (const colW of colWidths.slice(0, colWidths.length - 1)) {
                        const sepX = colW + left + colSpc;
                        if (clips.some(([x, _y, w, _h]) => sepX >= x && sepX < x + w)) {
                            // draw column separator line
                            const pos = [sepX, vertLineTop];
                            gl_matrix_1.vec2.transformMat4(pos, pos, trans);
                            const pos2 = [sepX, vertLineBottom];
                            gl_matrix_1.vec2.transformMat4(pos2, pos2, trans);
                            for (let i = pos[1]; i < pos2[1]; i++) {
                                canvas.s.ft.addString(pos[0], i, '│', bStyle).dp(m);
                            }
                            // Charaters refer to https://symbl.cc/en/unicode/blocks/box-drawing/
                            // draw "cross" syntax
                            let sepY = top;
                            if (bType.has(TableBorderType.rowSeparator)) {
                                rowIdx = 0;
                                for (const rowH of rowHeights) {
                                    if (rowIdx >= rowEndIdx)
                                        break;
                                    rowIdx++;
                                    sepY += rowH + rowSpc;
                                    // eslint-disable-next-line no-loop-func
                                    if (clips.some(([, y, , h]) => sepY >= y && sepY < y + h)) {
                                        const posCross = [sepX, sepY];
                                        gl_matrix_1.vec2.transformMat4(posCross, posCross, trans);
                                        canvas.s.ft.addString(posCross[0], posCross[1], '┼', bStyle).dp(m);
                                    }
                                    sepY += 1 + rowSpc;
                                }
                            }
                            if ((beforePhHeight == null || beforePhHeight === 0) &&
                                bType.has(TableBorderType.border) && vertLineTop <= 0) {
                                const posTCross = [sepX, 0];
                                gl_matrix_1.vec2.transformMat4(posTCross, posTCross, trans);
                                canvas.s.ft.addString(posTCross[0], posTCross[1], '┬', bStyle).dp(m);
                            }
                            if ((afterPhHeight == null || afterPhHeight === 0) &&
                                bType.has(TableBorderType.border) && vertLineBottom >= height) {
                                const posTCross = [sepX, height - 1];
                                gl_matrix_1.vec2.transformMat4(posTCross, posTCross, trans);
                                canvas.s.ft.addString(posTCross[0], posTCross[1], '┴', bStyle).dp(m);
                            }
                        }
                        left = sepX + 1 + colSpc;
                    }
                }
                // draw right border line
                if (bType.has(TableBorderType.border) && maxClipRight >= width) {
                    const posColBorderTop = [width - 1, minClipTop > 0 ? minClipTop : 1];
                    gl_matrix_1.vec2.transformMat4(posColBorderTop, posColBorderTop, trans);
                    const posColBorderBottom = [width - 1, maxClipBottom < height - 1 ? maxClipBottom : height - 1];
                    gl_matrix_1.vec2.transformMat4(posColBorderBottom, posColBorderBottom, trans);
                    for (let y = posColBorderTop[1]; y < posColBorderBottom[1]; y++) {
                        canvas.s.ft.addString(posColBorderTop[0], y, '│', bStyle).dp(m);
                    }
                }
            }
            let i = 0;
            for (const [idx, chd] of childToRender) {
                if (chd !== moreIndicator) {
                    s.ft.renderChild(idx, chd, canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
                    i++;
                }
            }
            return table.l.overflow.pipe(rx.take(1), rx.map(([, overflow]) => {
                if (overflow) {
                    s.ft.renderChild(i, moreIndicator, canvas, trans, clips, masks !== null && masks !== void 0 ? masks : []).dp(m);
                }
            }));
        }));
    })));
    r('setCellBackground, onCellBgRender', table.l.setCellBackground.pipe(rx.switchMap(([, handler]) => s.pt.onCellBgRender.pipe(rx.map(([m, c, r, canvas, rect]) => {
        var _a;
        const bg = handler(c, r);
        const childComp = (_a = rows.get(rowIds[r])) === null || _a === void 0 ? void 0 : _a[c];
        if (bg) {
            canvas.s.ft.fillRect(...rect, bg).dp(m);
            if (childComp)
                childComp.s.ft.setBackground(bg).dp(m);
        }
        else {
            canvas.s.ft.clearRect(...rect).dp(m);
            if (childComp)
                childComp.s.ft.setBackground(null).dp(m);
        }
    })))));
    r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(rx.mergeMap(([m, ...rect]) => {
        return rx.combineLatest([
            table.l.onPosition,
            table.l.onSize
        ]).pipe(rx.take(1), rx.switchMap(([[, x, y], [, w, h]]) => {
            if (x == null) {
                s.ft.didFindOverlaps([]).dp(m);
                return rx.EMPTY;
            }
            const r = (0, canvas_1.rectIntersection)([x, y, w, h], rect);
            if (r == null) {
                s.ft.didFindOverlaps([]).dp(m);
                return rx.EMPTY;
            }
            return rx.of([r[0] - x, r[1] - y, r[2], r[3]]);
        }), rx.mergeMap(relativeR => {
            // listContainer.log('childBoundingTree', [...childBoundingTree.allRectangles()].map(([r, [[, w]]]) => `${r.join()}: ${w.s.logPrefix}`));
            const children = childBoundingTree.searchOverlaps(relativeR);
            return rx.from(children).pipe(rx.mergeMap(([, [, chd]]) => chd.table.l.isContainer.pipe(rx.take(1), rx.mergeMap(([, isContainer]) => isContainer ?
                chd.s.ft.findOverlaps(...rect)
                    .re(m).od(chd.s.pt.didFindOverlaps).pipe(rx.map(([, chdOfChd]) => chdOfChd), rx.take(1), rx.endWith([chd])) :
                rx.of([chd])))), rx.reduce((acc, it) => {
                acc.push(...it);
                return acc;
            }, []), rx.map(found => s.ft.didFindOverlaps(found).dp(m)));
        }));
    })));
    r('querySizeOf -> prefWidthFor, prefHeightFor', s.pt.querySizeOf.pipe(rx.mergeMap(([m, width, height]) => {
        if (width == null && height != null) {
            return s.ft.calcSize().re(m).od(s.pt.didCalcSize).pipe(rx.take(1), rx.map(([, _colWidths, _rowHeights, width, height]) => {
                s.ft.prefWidthFor(width, height).dp(m);
            }));
        }
        else if (height == null && width != null) {
            return s.ft.calcSize(width).re(m).od(s.pt.didCalcSize).pipe(rx.take(1), rx.map(([, _colWidths, _rowHeights, width, height]) => {
                s.ft.prefHeightFor(width, height).dp(m);
            }));
        }
        return rx.EMPTY;
    })));
    r('onChildPreferredSizeChange', rx.combineLatest([
        s.pt.onChildPreferredSizeChange,
        table.l.setRowSpacing, table.l.onBorderTypeSet,
        table.l.setColumnSpacing
    ]).pipe(rx.mergeMap(([[m1], [m2], [m3]]) => {
        return s.ft.calcSize().re(m1, m2, m3)
            .od(s.pt.didCalcSize).pipe(rx.map(([, , , width, height]) => {
            s.ft.onContentSizeChange(width, height).dp(m1, m2, m3);
        }));
    })));
    s.ft.latestReflowData(reflowData).dp();
    s.ft.latestRenderData(renderData).dp();
    s.ft.onBorderTypeSet(new Set([TableBorderType.border, TableBorderType.columnSeparator])).dp();
    s.ft.setBorderStyle([]).dp();
    s.ft.rowById(rows).dp();
    s.ft.rowIds(rowIds).dp();
    s.ft.setColumnSpacing(1).dp();
    s.ft.setRowSpacing(0).dp();
    s.ft.alignCell(TableHoriAlig.left, TableVertAlig.middle).dp();
    s.ft.setBorderPadding(1, 0).dp();
    s.ft.addChild(moreIndicator).dp();
    s.ft.setCellBackground(() => { }).dp();
    s.ft.isOpaque(true).dp();
    s.ft.setLazyLoad(false).dp();
    function createRow(cells) {
        return cells.map(cell => {
            var _a, _b, _c, _d, _e, _f;
            const isValueString = typeof cell === 'string';
            const comp = isValueString ?
                (0, text_1.createTextWidget)(cell, Object.assign({ name: ((_b = (_a = opts === null || opts === void 0 ? void 0 : opts.default) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'table') + '.cell' }, ((opts === null || opts === void 0 ? void 0 : opts.optsForCellComponent) ? Object.assign({ debug: (_c = opts === null || opts === void 0 ? void 0 : opts.default) === null || _c === void 0 ? void 0 : _c.debug, log: (_d = opts === null || opts === void 0 ? void 0 : opts.default) === null || _d === void 0 ? void 0 : _d.log }, opts.optsForCellComponent) :
                    { debug: (_e = opts === null || opts === void 0 ? void 0 : opts.default) === null || _e === void 0 ? void 0 : _e.debug, log: (_f = opts === null || opts === void 0 ? void 0 : opts.default) === null || _f === void 0 ? void 0 : _f.log }))) :
                cell;
            if (!isValueString && (opts === null || opts === void 0 ? void 0 : opts.optsForCellComponent))
                comp.config(opts === null || opts === void 0 ? void 0 : opts.optsForCellComponent);
            return comp;
        });
    }
    return service;
}
function calcCellSpaceSize(hasBorder, hasSeparator, cellIndex, cellCount, borderPadding, spacing) {
    let size = 0;
    if (cellIndex === 0) {
        if (hasBorder)
            size += borderPadding;
        if (hasSeparator)
            size += spacing;
        else
            size += Math.floor(spacing / 2);
    }
    else if (cellIndex === cellCount - 1) {
        if (hasSeparator) {
            size += spacing;
        }
        else
            size += Math.ceil(spacing / 2);
        if (hasBorder)
            size += borderPadding;
    }
    else {
        size += spacing;
        if (hasSeparator) {
            size += spacing;
        }
    }
    return size;
}
//# sourceMappingURL=table.js.map