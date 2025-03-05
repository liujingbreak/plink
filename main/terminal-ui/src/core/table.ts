/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {SingleActionFactory, actionRelatedToAction, SimplexReactorOfFac,
  CoreOptions, CreateOptsInDef} from '@wfh/reactivizer';
import {createRtreeInstance} from './rbush';
import {createPlaceHolder, LazyLoadPlaceHolder, LazyLoadPlaceHolderOpts} from './lazy-load-placeholder';
import {createTextWidget, MultiLineTextWidgetOpts} from './text';
import {baseContainerFac} from './container';
import {rectIntersection} from './canvas';
import {FlexContainerOpts} from './flex-container';
import {BaseWidget, createFlexContainer, TerminalContainer,
  TextStyle, BackgroundStyle, Rectangle} from '../index';

export enum TableBorderType {
  border, rowSeparator, columnSeparator
}
export enum TableHoriAlig {
  left, middle, right
}
export enum TableVertAlig {
  top, middle, bottom
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
const tableFor = ['rowById', 'setColumnSpacing', 'onBorderTypeSet', 'setRowSpacing', 'setLazyLoad',
  'setBorderStyle', 'setBorderPadding', 'alignCell', 'didCalcSize', 'setCellBackground', 'rowIds'
] as const;
export type TableCoreOptions = CreateOptsInDef<TableEvents, typeof baseContainerFac>;
export type TableOptions = {
  default?: CoreOptions;
  core?: TableCoreOptions;
  moreIndicator?: Partial<FlexContainerOpts>;
  lazy?: LazyLoadPlaceHolderOpts;
  optsForCellComponent?: MultiLineTextWidgetOpts;
};
export const tableFac = baseContainerFac.forExtend<TableEvents, typeof tableFor>({
  name: 'table',
  tableFor,
  debugExcludeTypes: ['renderChild']
}).interceptorForBaseByType(ad => rx.merge(
  rx.merge(
    ad.pt.onRender,
    ad.pt.findOverlaps
  ).pipe(rx.ignoreElements()),
  ad.ofOtherTypes()
)).defineReactor((init, opts?: TableOptions) => {
  const service = init({...opts?.default as any, ...opts?.core});
  const {ft, pt, r, table, s} = service;
  const preContrl = s.forkController();
  const rows = new Map<unknown, BaseWidget[]>();
  const rowIds = [] as unknown[];
  const childBoundingTree$ = createRtreeInstance<[number, BaseWidget]>();
  const cellBoundingTree$ = createRtreeInstance<[col: number, row: number, rect: Rectangle]>();
  let rowIdSeed = 0;
  const moreIndicator = createFlexContainer({
    ...opts?.default as any,
    name: 'table.more',
    ...opts?.moreIndicator
  });
  moreIndicator.ft.justifyContent('center').dp();
  const moreText = createTextWidget('More...', {
    ...opts as any,
    name: 'table.more.text'
  });
  moreIndicator.ft.addChild(moreText).dp();
  let lazyService: LazyLoadPlaceHolder | undefined;
  let beforePlaceHolder: BaseWidget | undefined;
  let afterPlaceHolder: BaseWidget | undefined;

  r('setLazyLoad, "lazyService".dp_onLoadPage -> "lazyService", addChild, insertChild...', pt.setLazyLoad.pipe(
    rx.switchMap(([m, enabled, handler]) => {
      if (enabled && lazyService == null) {
        const {service: lazyService0, before, after} = createPlaceHolder({
          ...opts?.lazy,
          default: {
            name: 'table.lazy',
            ...opts?.default,
            ...opts?.lazy?.default
          }
        });
        lazyService = lazyService0;
        beforePlaceHolder = before;
        afterPlaceHolder = after;
        // ft.insertChild(0, [beforePlaceHolder]).dp(m);
        ft.addChild(beforePlaceHolder, afterPlaceHolder).dp(m);
        if (handler) {
          return rx.merge(
            lazyService.pt.dp_onLoadPage.pipe(
              rx.mergeMap(([m, pageIdx, _type]) => handler(pageIdx).pipe(
                rx.takeUntil(lazyService0.pt.dp_onCancelLoad.pipe(
                  rx.filter(([, page]) => page === pageIdx)
                )),
                rx.reduce((all, row) => { all.push(row); return all; }, [] as [unknown, (string | BaseWidget)[]][]),
                rx.map(rowWithKeys => {
                  for (const [k, row] of rowWithKeys) {
                    if (rows.has(k)) {
                      service.log('current rows', [...rows.keys()]);
                      throw new Error(`Duplicate key is used on different rows, key: "${rowWithKeys.map(([key]) => key as string).join()}"`);
                    }
                    rows.set(k, createRow(row));
                  }
                  // if (rowWithKeys.length > 0) {
                  //   pageLoaded.add(pageIdx);
                  // }
                  lazyService0.ft.dp_didLoad(rowWithKeys.map(([key]) => key)).dp(m);
                }),
                rx.catchError(err => {
                  lazyService0.ft.dp_onLoadError(err, pageIdx).dp(m, m.r);
                  return rx.EMPTY;
                })
              ))
            ),
            lazyService.pt.onPagesLoaded.pipe(
              rx.map(([m, isHead, _pStart, _pEnd, rowKeys]) => {
                for (const key of rowKeys) {
                  ft.onRowAdded(isHead ? 0 : rowIds.length, key, rows.get(key)!).dp(m);
                  ft.addChild(...rows.get(key)!).dp(m);
                }
                if (isHead) {
                  rowIds.unshift(...rowKeys);
                } else
                  rowIds.push(...rowKeys);
                // service.log('>>> after onPagesLoaded, rowIds', rowIds.length, 'rows.size', rows.size);
              })
            )
          );
        }
      } else if (!enabled && lazyService != null && beforePlaceHolder && afterPlaceHolder) {
        ft.removeChild(beforePlaceHolder, afterPlaceHolder).dp(m);
        beforePlaceHolder.dispose();
        afterPlaceHolder.dispose();
        lazyService.dispose();
        lazyService = undefined;
        beforePlaceHolder = undefined;
        afterPlaceHolder = undefined;
        // pageLoaded.clear();
      }
      return rx.EMPTY;
    })
  ));
  r('setLazyLoad, lazyService.dp_onUnload... ' +
    '-> removeRow, lazyService.setAveragePageSize', pt.setLazyLoad.pipe(
    rx.distinctUntilChanged(([, enabledA], [, enabledB]) => enabledA === enabledB),
    rx.switchMap(([, enable]) => {
      if (enable && lazyService) {
        return rx.merge(
          // dp_onUnload -> removeRow
          lazyService.pt.dp_onUnload.pipe(
            rx.map(([m, _pIdx, ids]) => {
              // pageLoaded.delete(pIdx);
              if (ids == null)
                return;
              const idSet = new Set(ids ?? []);
              let idx = 0;
              const toDel = [] as number[];
              for (const id of rowIds) {
                if (idSet.has(id)) {
                  idSet.delete(id);
                  toDel.push(idx);
                }
                idx++;
              }
              ft.removeRow(toDel, true).dp(m);
            })
          ),
          // onRender -> setAveragePageSize,setViewportSize
          pt.onRender.pipe(
            rx.mergeMap(a => rx.combineLatest([
              table.l.onSize,
              table.l.setBorderPadding,
              table.l.onBorderTypeSet,
              beforePlaceHolder!.table.l.onSize,
              afterPlaceHolder!.table.l.onSize
            ]).pipe(
              rx.mergeMap(params => lazyService!.ft.queryLoadedPages().re(a[0]).od(
                lazyService!.pt.didQueryLoadedPages
              ).pipe(
                rx.map(([, pageLoaded]) => [pageLoaded, a, ...params] as const)
              )),
              rx.take(1)
            )),
            rx.map(([pageLoaded, [m, , , , clips], [, , th], [, , paddingY], [, border], [, , bh], [, , ah]]) => {
              if (pageLoaded.length === 0)
                return;
              let height = th - bh - ah;
              if (border.has(TableBorderType.border))
                height -= (paddingY + 1) << 1;
              const pageHeight = Math.floor(height / pageLoaded.length);
              // service.log('>>> onRender height:', height, 'pageLoaded', pageLoaded.size, 'rowIds', rowIds.join());
              lazyService!.ft.setAveragePageSize(pageHeight).dp(m);
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
              }, [0, 0, Number.MAX_VALUE, Number.MAX_VALUE] as const);
              lazyService!.ft.setViewportSize(minRect[2], minRect[3]).dp(m);
            })
          )
        );
      } else
        return rx.EMPTY;
    })
  ));
  r('setLazyLoad,focusService -> dp_mgrFocusService', pt.setLazyLoad.pipe(
    rx.switchMap(([m]) => {
      if (lazyService) {
        return table.l.focusService.pipe(
          rx.map(([m2, f]) => lazyService!.ft.dp_mgrFocusService(f).dp(m, m2))
        );
      }
      return rx.EMPTY;
    })
  ));
  r('setBorderType', pt.setBorderType.pipe(
    rx.withLatestFrom(table.l.onBorderTypeSet),
    rx.map(([[m, type, enabled], [, typeSet]]) => {
      if (enabled)
        typeSet.add(type);
      else
        typeSet.delete(type);
      ft.onBorderTypeSet(typeSet).dp(m);
    })
  ));
  r('reflow,calcSize,didCalcSize..->"cellBoundingTree"', pt.reflow.pipe(
    rx.mergeMap(a => cellBoundingTree$.pipe(
      rx.take(1),
      rx.map(b => [...a, b] as const)
    )),
    // preContrl here makes sure the later subscription to "calcSize" will recieve message earlier than other subscriber
    rx.switchMap(([m, , , cellBoundingTree]) => preContrl.pt.calcSize.pipe(
      actionRelatedToAction(m),
      rx.mergeMap(([m2]) => preContrl.pt.didCalcSize.pipe(
        actionRelatedToAction(m2)
      )),
      rx.withLatestFrom(table.l.setRowSpacing, table.l.setColumnSpacing, table.l.setBorderPadding, table.l.onBorderTypeSet),
      rx.map(([[, colWidths, rowHeights, , , beforePhHeight], [, rowSpc], [, colSpc], [, paddingX, paddingY], [, border]]) => {
        // service.log('>>>> table cell sizes:', colWidths.length, rowHeights.length);
        cellBoundingTree.clear();
        let rowIdx = 0;
        let y = beforePhHeight ?? 0;
        if (border.has(TableBorderType.border))
          y += 1;
        for (let rowH of rowHeights) {
          rowH += calcCellSpaceSize(border.has(TableBorderType.border),
            border.has(TableBorderType.rowSeparator),
            rowIdx, rowHeights.length, paddingY, rowSpc
          );
          let colIdx = 0;
          let x = border.has(TableBorderType.border) ? 1 : 0;
          for (let colW of colWidths) {
            colW += calcCellSpaceSize(border.has(TableBorderType.border),
              border.has(TableBorderType.columnSeparator), colIdx, colWidths.length, paddingX, colSpc);
            const r = [x, y, colW, rowH] as Rectangle;
            cellBoundingTree.insert([r, [colIdx, rowIdx, r]] as const);
            // service.log('>>> cellBoundingTree add', r, cellBoundingTree.xIntervalTree.minimum()?.value.size());
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
      }),
      rx.take(1)
    ))
  ));
  r('calcSize -> didCalcSize', pt.calcSize.pipe(
    rx.mergeMap(([m, contrainWidth]) => {
      const rowArr = [...rows.values()];
      // service.log('>>> rowArr rows =', rowArr.length);
      return rx.combineLatest([
        // eslint-disable-next-line multiline-ternary
        rowArr.length === 0 ? rx.of([]) :
          rx.combineLatest(rowArr.map(
            cells => rx.combineLatest(cells.map(c => c.table.l.preferredSize)).pipe(
              rx.take(1),
              rx.map(colSizes => colSizes.map(([, w, h]) => [w, h] as const))
            )
          )),
        table.l.setRowSpacing,
        table.l.onBorderTypeSet,
        table.l.setColumnSpacing,
        table.l.setBorderPadding,
        beforePlaceHolder ? beforePlaceHolder.table.l.preferredSize.pipe(rx.map(([, w, h]) => [w, h] as const)) : rx.of([0, 0]),
        afterPlaceHolder ? afterPlaceHolder.table.l.preferredSize.pipe(rx.map(([, w, h]) => [w, h] as const)) : rx.of([0, 0])
      ]).pipe(
        rx.take(1),
        rx.mergeMap(([rowPrefSizes, [, rowSp], [, border], [, colSp], [, paddingX, paddingY],
          [beforeW, beforeH], [afterW, afterH]]) => {
          // service.log('>>> rowPrefSizes =', rowPrefSizes.length);
          let placeholderWidth = Math.max(beforeW, afterW);
          if (contrainWidth)
            placeholderWidth = contrainWidth < placeholderWidth ? contrainWidth : placeholderWidth;
          if (rowPrefSizes.length === 0 || rowPrefSizes[0].length === 0) {
            ft.didCalcSize([], [], placeholderWidth + (border.has(TableBorderType.border) ? (1 + paddingX) * 2 : 0),
              beforeH + afterH + (border.has(TableBorderType.border) ? (1 + paddingY) * 2 : 0),
              beforeH, afterH
            ).dp(m);
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
            ft.didCalcSize(maxColWidths.map(() => 0), rowPrefSizes.map(() => 0), contrainWidth,
              beforeH + afterH + (border.has(TableBorderType.border) ? (1 + paddingY) * 2 : 0),
              beforeH, afterH).dp(m);
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
            return rx.combineLatest(rowArr.map(r => rx.combineLatest(
              r.map((cell, col) => cell.ft.querySizeOf(shrinkedColW[col], null)
                .od(cell.pt.prefHeightFor).pipe( rx.take(1)))
            ).pipe(
              rx.map(prefSizes => {
                const maxHtOfRow = prefSizes.reduce((max, [, , h]) => {
                  if (max < h)
                    max = h;
                  return max;
                }, 0);
                return maxHtOfRow;
              })
            ))).pipe(
              rx.take(1),
              rx.mergeMap(rowHeights => {
                const sum = rowHeights.reduce((sum, h) => {
                  sum += h;
                  return sum;
                }, 0);
                if (beforePlaceHolder && afterPlaceHolder) {
                  return rx.combineLatest([
                    beforePlaceHolder.ft.querySizeOf(contrainWidth, null).re(m).od(
                      beforePlaceHolder.pt.prefHeightFor
                    ),
                    afterPlaceHolder.ft.querySizeOf(contrainWidth, null).re(m).od(
                      afterPlaceHolder.pt.prefHeightFor
                    )
                  ]).pipe(
                    rx.take(1),
                    rx.map(([[, , beforeH], [, , afterH]]) => {
                      return [rowHeights, sum + beforeH + afterH, beforeH, afterH] as const;
                    })
                  );
                } else {
                  return rx.of([rowHeights, sum] as const);
                }
              }),
              rx.map(([allHeights, totalH, beforeH, afterH]) => {
                ft.didCalcSize(shrinkedColW, allHeights, contrainWidth, totalH + spHeight, beforeH, afterH).dp(m);
              })
            );
          } else {
            const rowHeights = rowPrefSizes.map(rowSizes => rowSizes.map(([, h]) => h).reduce((max, h) => {
              if (max < h)
                max = h;
              return max;
            }, 0));
            const extraHeight$ = (beforePlaceHolder && afterPlaceHolder) ?
              rx.combineLatest([
                beforePlaceHolder.table.l.preferredSize,
                afterPlaceHolder.table.l.preferredSize
              ]).pipe(
                rx.map(([[, , h1], [, , h2]]) => {
                  return [h1 + h2, h1, h2] as [number, number, number];
                })
              ) :
              rx.of([0, undefined, undefined] as [number, number | undefined, number | undefined]);
            return extraHeight$.pipe(
              rx.take(1),
              rx.map(([h, beforeH, afterH]) => {
                ft.didCalcSize(maxColWidths, rowHeights, sumColWidths + spWidth, rowHeights.reduce((sum, h) => {
                  sum += h;
                  return sum;
                }, spHeight + h), beforeH, afterH).dp(m);
              })
            );
          }
        })
      );
    })
  ));
  r('addRow, insertRow -> rowById, onRowAdded, addChild', rx.merge(
    pt.addRow.pipe(
      rx.map(([m, cells]) => [m, -1, cells] as const)
    ),
    pt.insertRow
  ).pipe(
    rx.map(([m, idx, cells]) => {
      const cellComps = createRow(cells);
      rows.set(rowIdSeed, cellComps);
      ft.rowById(rows).dp(m);
      ft.onRowAdded(idx === -1 ? rowIds.length : idx, rowIdSeed, cellComps).dp(m);
      ft.addChild(...cellComps).dp(m);
      if (idx === -1)
        rowIds.push(rowIdSeed);
      else
        rowIds.splice(idx, 0, rowIdSeed);
      rowIdSeed++;
    })
  ));
  r('removeRow -> removeChild, onRowRemoved', pt.removeRow.pipe(
    rx.map(([m, idxes, autoDispose]) => {
      const rowsToRemove = idxes.map(idx => {
        const id = rowIds[idx];
        const row = rows.get(id);
        if (row)
          rows.delete(id);
        else
          throw new Error(`Can't remove row for key ${id as string}`);
        ft.onRowRemoved(id, row ?? []).dp(m);
        return row;
      });
      for (const cells of rowsToRemove ?? []) {
        if (cells == null)
          continue;
        ft.removeChild(...cells).dp(m);
        if (autoDispose)
          cells.map(cell => cell.dispose());
      }
      for (const idx of [...idxes].sort().reverse())
        rowIds.splice(idx, 1);
      if (rowIds.length !== rows.size)
        service.log('>> after remove row, not matched rowIds: ', rowIds, 'with rows', [...rows.keys()]);
    })
  ));
  r('getRowByIndex -> didGetRowByIndex', pt.getRowByIndex.pipe(
    rx.map(([m, idx]) => ft.didGetRowByIndex(rows.get(rowIds[idx]) ?? []).dp(m))
  ));
  r('reflow, onChildPositions, child.onSize -> "childBoundingTree"', pt.reflow.pipe(
    rx.mergeMap(a => childBoundingTree$.pipe(
      rx.take(1),
      rx.map(b => [...a, b] as const)
    )),
    rx.switchMap(([m, , , childBoundingTree]) => {
      childBoundingTree.clear();
      return rx.combineLatest([
        pt.onChildPositions.pipe(
          actionRelatedToAction(m)
        ),
        table.l.allDisplayChildren
      ]).pipe(
        rx.take(1),
        // rx.tap(([[, pos], [, children]]) => {
        //   service.log('>>> childBoundingTree positions', pos.size, 'vs children', children.length);
        // }),
        rx.mergeMap(([[, pos], [, children]]) => children.map(chd => [chd, pos.get(chd)] as const)),
        rx.filter(([, pos]) => pos != null),
        rx.mergeMap(([chd, pos], idx) => chd.table.l.onSize.pipe(
          rx.take(1),
          rx.map(([, w, h]) => {
            const [x, y] = pos!;
            childBoundingTree.insert([[x, y, w, h], [idx, chd]]);
            // service.log('add child', idx, 'bounding box to tree', x, y, w, h);
          })
        ))
      );
    })
  ));
  const reflowData = rx.combineLatest([
    table.l.onSize, table.l.alignCell, table.l.setColumnSpacing, table.l.setRowSpacing, table.l.setBorderPadding, table.l.onBorderTypeSet,
    table.l.onChildPreferredSizeChange
  ]);
  r('reflow -> overflow, onChildPositions, child.onSize', pt.reflow.pipe(
    rx.switchMap(([m, _clips, _masks]) => {
      return reflowData.pipe(
        rx.mergeMap(([[, w, h], [, alignCellHori, alignCellVert], [, colSpacing], [, rowSpacing], [, paddingX, paddingY], [, border]]) => {
          return ft.calcSize(w).re(m).od(pt.didCalcSize).pipe(
            rx.mergeMap(([, ...calcResults]) => {
              const [, , , totalHeight] = calcResults;
              ft.overflow(totalHeight > h).dp(m);
              if (totalHeight > h) {
                return moreIndicator.ft.querySizeOf(border.has(TableBorderType.border) ? w - 2 : w, null).re(m).od(
                  moreIndicator.pt.prefHeightFor
                ).pipe(
                  rx.map(([, moreIdcW, moreIdcH]) => [w, h, alignCellHori, alignCellVert, colSpacing, rowSpacing, paddingX, paddingY, border, moreIdcW, moreIdcH, ...calcResults] as const)
                );
              }
              return rx.of([w, h, alignCellHori, alignCellVert, colSpacing, rowSpacing, paddingX, paddingY, border, 0, 0, ...calcResults] as const);
            })
          );
        }),
        rx.take(1),
        rx.mergeMap(([tableW, tableH, alignCellHori, alignCellVert, colSpacing, rowSpacing, paddingX, paddingY, border, moreW, moreH, colWidths, rowHeights, _totalWidth, _totalHeight, beforeH, afterH]) => {
          const childPos = new Map<BaseWidget, [number, number]>();
          let rowTop = border.has(TableBorderType.border) ?
            1 + paddingY :
            0;
          const hasBorder = border.has(TableBorderType.border);
          if (beforePlaceHolder) {
            childPos.set(beforePlaceHolder, [
              hasBorder ? 1 + paddingX : 0,
              rowTop
            ]);
            beforePlaceHolder.ft.onSize(
              hasBorder ? tableW - 2 - (paddingX << 1) : tableW,
              beforeH!
            ).dp(m);
            rowTop += beforeH!;
          }
          if (afterPlaceHolder) {
            childPos.set(afterPlaceHolder, [
              hasBorder ? 1 + paddingX : 0,
              hasBorder ? tableH - afterH! - 1 - paddingY : tableH - afterH!
            ]);
            afterPlaceHolder.ft.onSize(
              hasBorder ? tableW - 2 - (paddingX << 1) : tableW,
              afterH!
            ).dp(m);
          }
          let heightCon = tableH;
          if (moreH > 0) {
            const moreTop = border.has(TableBorderType.border) ? tableH - moreH - 1 : tableH - moreH;
            childPos.set(moreIndicator, [border.has(TableBorderType.border) ? 1 : 0, moreTop]);
            moreIndicator.ft.onSize(moreW, moreH).dp(m);
            heightCon = moreTop;
          }
          // service.log('>>> reflow rowIds count:', rowIds.length, 'rowTop', rowTop, 'beforeH', beforeH, 'height', heightCon, 'row IDs:', rowIds.join());
          return rx.from(rowIds).pipe(
            rx.takeWhile(() => rowTop < heightCon),
            rx.concatMap((rowKey, rowIdx) => {
              const row = rows.get(rowKey);
              let cellLeft = border.has(TableBorderType.border) ?
                1 + paddingX :
                0;
              if (row == null)
                throw new Error(`Unknown error of missing row of key: "${rowKey as string}", row index: "${rowIdx}"`);
              return rx.from(row).pipe(
                rx.concatMap((cell, cellIdx) => {
                  const width = colWidths[cellIdx];
                  const height = rowHeights[rowIdx];
                  const pos = [cellLeft, rowTop] as [number, number];
                  return cell.table.l.preferredSize.pipe(
                    rx.take(1),
                    // align cell horizontally
                    rx.mergeMap(([, cpw, cph]) => {
                      if (cpw > width) {
                        return cell.ft.querySizeOf(width, null)
                          .od(cell.pt.prefHeightFor).pipe(
                            rx.take(1),
                            rx.map(([, , shrinkH]) => [width, shrinkH] as const)
                          );
                      } else {
                        cellLeft += alignCellHori === TableHoriAlig.middle ?
                          (width - cpw) >> 1 :
                          alignCellHori === TableHoriAlig.right ?
                            width - cpw :
                            0;
                        pos[0] = cellLeft;
                        return rx.of([cpw, cph] as const);
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
                        throw new Error(`Duplicate table cell found in reflow function for row key: ${rowKey as string}, row index: ${rowIdx} cell index ${cellIdx}`);
                      }
                      childPos.set(cell, pos);
                      cell.ft.onSize(cellCompWidth, cellCompHeigth).dp(m);
                      cellLeft += width;
                      cellLeft += border.has(TableBorderType.columnSeparator) ?
                        colSpacing * 2 + 1 :
                        colSpacing;
                    })
                  );
                }),
                rx.finalize(() => {
                  rowTop += rowHeights[rowIdx];
                  if (border.has(TableBorderType.rowSeparator))
                    rowTop += rowSpacing * 2 + 1;
                  else
                    rowTop += rowSpacing;
                })
              );
            }),
            rx.finalize(() => {
              // service.log('>>> reflow row\'s top positions', [...childPos.values()].map(([, h]) => h).join(' '),
              //   'total', childPos.size);
              ft.onChildPositions(childPos).dp(m);
            })
          );
        })
      );
    })
  ));
  const renderData = [
    table.l.onBorderTypeSet, table.l.setBorderStyle,
    table.l.setRowSpacing, table.l.setColumnSpacing,
    table.l.setBorderPadding, table.l.onSize,
    table.l.setDisplay,
    table.l.setBackground,
    table.l.onChildPreferredSizeChange
  ] as const;
  r('onRender', pt.onRender.pipe(
    rx.mergeMap(a => rx.combineLatest([cellBoundingTree$, childBoundingTree$]).pipe(
      rx.take(1),
      rx.map(b => [...a, ...b] as const)
    )),
    rx.mergeMap(([m, canvas, trans, renderSelf, clips, masks, cellBoundingTree, childBoundingTree]) => {
      return rx.combineLatest(renderData).pipe(
        rx.take(1),
        rx.mergeMap(([[, bType], [, bStyle], [, rowSpc], [, colSpc], [, paddingX, paddingY], [, width, height]]) => {
          if (renderSelf) {
            ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
          }

          let cellsToRender = clips.flatMap(clip => [...cellBoundingTree.searchOverlaps(clip).map(([, c]) => c)]);
          // service.log('>> clips', clips?.join('\n'), 'cellBoundingTree', cellBoundingTree.xIntervalTree.minimum()?.value.size());
          service.log('>>> rows of cellsToRender', cellsToRender.map(([, r]) => r));
          const excludedCells = new Set(masks ? masks.map(c => cellBoundingTree.searchForCovered(c).map(([col, row]) => col + ',' + row)).flat() : []);
          cellsToRender = cellsToRender.filter(([col, row]) => !excludedCells.has(col + ',' + row));
          for (const [col, row, rect] of cellsToRender) {
            const pos = [rect[0], rect[1]] as [number, number];
            vec2.transformMat4(pos, pos, trans);
            ft.onCellBgRender(col, row).dp(m);
          }
          let childToRender = clips.flatMap(clip => [...childBoundingTree.searchOverlaps(clip)].map(([, c]) => c));
          // service.log('>>>>> childToRender', childToRender.length);
          const excluded = new Set(masks ? masks.map(c => childBoundingTree.searchForCovered(c).map(([, [, w]]) => w)).flat() : []);
          childToRender = childToRender.filter(([, c]) => !excluded.has(c));
          if (bType.size > 0) {
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
            const top = (beforePhHeight ?? 0) + (bType.has(TableBorderType.border) ? 1 + paddingY : 0);
            let rowSepTop = top;
            let left = bType.has(TableBorderType.border) ? 1 + paddingX : 0;
            let rowIdx = 0;
            const rowEndIdx = rowHeights!.length - 1;
            const lineWidth = Math.min(width, maxClipRight - minClipLeft);

            // draw top border line
            if (bType.has(TableBorderType.border) && minClipTop <= 0) {
              const borderPos = [minClipLeft, 0] as vec2;
              vec2.transformMat4(borderPos, borderPos, trans);
              canvas.ft.addString(borderPos[0], borderPos[1], '─'.repeat(lineWidth), bStyle).dp(m);
              if (minClipLeft <= 0) {
                const borderPos = [0, 0] as vec2;
                vec2.transformMat4(borderPos, borderPos, trans);
                canvas.ft.addString(borderPos[0], borderPos[1], '╭', bStyle).dp(m);
              }
              if (maxClipRight > width - 1) {
                const borderPos = [maxClipRight - 1, 0] as vec2;
                vec2.transformMat4(borderPos, borderPos, trans);
                canvas.ft.addString(borderPos[0], borderPos[1], '╮', bStyle).dp(m);
              }
            }
            // draw horizontal separator lines
            if (bType.has(TableBorderType.rowSeparator)) {
              for (const rowH of rowHeights!) {
                if (rowIdx >= rowEndIdx)
                  break;
                rowIdx++;
                const sepY = rowH + rowSepTop + rowSpc;
                if (clips.some(([, y, , h]) => sepY >= y && sepY < y + h)) {
                  const pos = [minClipLeft, sepY] as vec2;
                  vec2.transformMat4(pos, pos, trans);
                  canvas.ft.addString(pos[0], pos[1], '─'.repeat(lineWidth), bStyle).dp(m);
                }
                rowSepTop = sepY + 1 + rowSpc;
              }
            }
            // draw bottom border line
            if (bType.has(TableBorderType.border) && maxClipBottom >= height) {
              const borderPos = [minClipLeft, height - 1] as vec2;
              vec2.transformMat4(borderPos, borderPos, trans);
              canvas.ft.addString(borderPos[0], borderPos[1], '─'.repeat(lineWidth), bStyle).dp(m);
              if (minClipLeft <= 0) {
                const borderPos = [0, height - 1] as vec2;
                vec2.transformMat4(borderPos, borderPos, trans);
                canvas.ft.addString(borderPos[0], borderPos[1], '╰', bStyle).dp(m);
              }
              if (maxClipRight > width - 1) {
                const borderPos = [maxClipRight - 1, height - 1] as vec2;
                vec2.transformMat4(borderPos, borderPos, trans);
                canvas.ft.addString(borderPos[0], borderPos[1], '╯', bStyle).dp(m);
              }
            }
            // draw left border line
            if (bType.has(TableBorderType.border) && minClipLeft <= 0) {
              const posColBorderTop = [0, minClipTop > 0 ? minClipTop : 1] as vec2;
              vec2.transformMat4(posColBorderTop, posColBorderTop, trans);
              const posColBorderBottom = [0, maxClipBottom < height - 1 ? maxClipBottom : height - 1] as vec2;
              vec2.transformMat4(posColBorderBottom, posColBorderBottom, trans);

              for (let y = posColBorderTop[1]; y < posColBorderBottom[1]; y++) {
                canvas.ft.addString(posColBorderTop[0], y, '│', bStyle).dp(m);
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
              for (const colW of colWidths!.slice(0, colWidths!.length - 1)) {
                const sepX = colW + left + colSpc;
                if (clips.some(([x, _y, w, _h]) => sepX >= x && sepX < x + w)) {
                  // draw column separator line
                  const pos = [sepX, vertLineTop] as vec2;
                  vec2.transformMat4(pos, pos, trans);
                  const pos2 = [sepX, vertLineBottom] as vec2;
                  vec2.transformMat4(pos2, pos2, trans);
                  for (let i = pos[1]; i < pos2[1]; i++) {
                    canvas.ft.addString(pos[0], i, '│', bStyle).dp(m);
                  }
                  // Charaters refer to https://symbl.cc/en/unicode/blocks/box-drawing/
                  // draw "cross" syntax
                  let sepY = top;
                  if (bType.has(TableBorderType.rowSeparator)) {
                    rowIdx = 0;
                    for (const rowH of rowHeights!) {
                      if (rowIdx >= rowEndIdx)
                        break;
                      rowIdx++;
                      sepY += rowH + rowSpc;
                      // eslint-disable-next-line no-loop-func
                      if (clips.some(([, y, , h]) => sepY >= y && sepY < y + h)) {
                        const posCross = [sepX, sepY] as vec2;
                        vec2.transformMat4(posCross, posCross, trans);
                        canvas.ft.addString(posCross[0], posCross[1], '┼', bStyle).dp(m);
                      }
                      sepY += 1 + rowSpc;
                    }
                  }
                  if ((beforePhHeight == null || beforePhHeight === 0) &&
                      bType.has(TableBorderType.border) && vertLineTop <= 0
                  ) {
                    const posTCross = [sepX, 0] as vec2;
                    vec2.transformMat4(posTCross, posTCross, trans);
                    canvas.ft.addString(posTCross[0], posTCross[1], '┬', bStyle).dp(m);
                  }
                  if ((afterPhHeight == null || afterPhHeight === 0) &&
                      bType.has(TableBorderType.border) && vertLineBottom >= height
                  ) {
                    const posTCross = [sepX, height - 1] as vec2;
                    vec2.transformMat4(posTCross, posTCross, trans);
                    canvas.ft.addString(posTCross[0], posTCross[1], '┴', bStyle).dp(m);
                  }
                }
                left = sepX + 1 + colSpc;
              }
            }
            // draw right border line
            if (bType.has(TableBorderType.border) && maxClipRight >= width) {
              const posColBorderTop = [width - 1, minClipTop > 0 ? minClipTop : 1] as vec2;
              vec2.transformMat4(posColBorderTop, posColBorderTop, trans);
              const posColBorderBottom = [width - 1, maxClipBottom < height - 1 ? maxClipBottom : height - 1] as vec2;
              vec2.transformMat4(posColBorderBottom, posColBorderBottom, trans);

              for (let y = posColBorderTop[1]; y < posColBorderBottom[1]; y++) {
                canvas.ft.addString(posColBorderTop[0], y, '│', bStyle).dp(m);
              }
            }
          }
          let i = 0;
          for (const [idx, chd] of childToRender) {
            if (chd !== moreIndicator) {
              ft.renderChild(idx, chd, canvas, trans, clips, masks ?? []).dp(m);
              i++;
            }
          }
          return table.l.overflow.pipe(
            rx.take(1),
            rx.map(([, overflow]) => {
              if (overflow) {
                ft.renderChild(i, moreIndicator, canvas, trans, clips, masks ?? []).dp(m);
              }
            })
          );
        })
      );
    })
  ));
  r('setCellBackground, onCellBgRender', table.l.setCellBackground.pipe(
    rx.switchMap(([, handler]) => pt.onCellBgRender.pipe(
      rx.map(([m, c, r]) => {
        const bg = handler(c, r);
        const childComp = rows.get(rowIds[r])?.[c];
        // TODO: childComp should be extended to implement painting cell background
        // a false value of `needRerender` can not guarantee childComp won't rerender itself, there is chance `beforeRender` causes
        // that child component rerender itself, the background might be incorrently overridden
        if (childComp?.table.getData().needRerender[0]) {
          if (bg) {
            childComp.ft.setBackground(bg).dp(m);
          } else {
            // childComp.ft.clear(canvas, trans).dp(m);
            childComp.ft.setBackground(null).dp(m);
          }
        }
      })
    ))
  ));
  r('findOverlaps -> didFindOverlaps', pt.findOverlaps.pipe(
    rx.mergeMap(([m, ...rect]) => {
      return rx.combineLatest([table.l.onBoundingBox, childBoundingTree$]).pipe(
        rx.take(1),
        rx.switchMap(([[, [x, y, w, h]], childBoundingTree]) => {
          const r = rectIntersection([x, y, w, h], rect);
          if (r == null) {
            ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
          }
          return rx.of([[r[0] - x, r[1] - y, r[2], r[3]] as Rectangle, childBoundingTree] as const);
        }),
        rx.mergeMap(([relativeR, childBoundingTree]) => {
          service.log('findOverlaps in childBoundingTree', [...childBoundingTree.all()].map(([r, [, w]]) => `${r.join()}: ${w.s.logPrefix}`));
          const children = childBoundingTree.searchOverlaps(relativeR);
          return rx.from(children).pipe(
            rx.mergeMap(([, [, chd]]) => chd.table.l.isContainer.pipe(
              rx.take(1),
              rx.mergeMap(([, isContainer]) => isContainer ?
                (chd as TerminalContainer).ft.findOverlaps(...rect)
                  .re(m).od((chd as TerminalContainer).pt.didFindOverlaps).pipe(
                    rx.map(([, chdOfChd]) => chdOfChd),
                    rx.take(1),
                    rx.endWith([chd])
                  ) :
                rx.of([chd])
              )
            )),
            rx.reduce((acc, it) => {
              acc.push(...it);
              return acc;
            }, [] as BaseWidget[]),
            rx.map(found => ft.didFindOverlaps(found).dp(m))
          );
        })
      );
    })

  ));
  r('querySizeOf -> prefWidthFor, prefHeightFor', pt.querySizeOf.pipe(
    rx.mergeMap(([m, width, height]) => {
      if (width == null && height != null) {
        return ft.calcSize().re(m).od(pt.didCalcSize).pipe(
          rx.take(1),
          rx.map(([, _colWidths, _rowHeights, width, height]) => {
            ft.prefWidthFor(width, height).dp(m);
          })
        );
      } else if (height == null && width != null) {
        return ft.calcSize(width).re(m).od(pt.didCalcSize).pipe(
          rx.take(1),
          rx.map(([, _colWidths, _rowHeights, width, height]) => {
            ft.prefHeightFor(width, height).dp(m);
          })
        );
      }
      return rx.EMPTY;
    })
  ));
  r('onChildPreferredSizeChange... -> onContentSizeChange', rx.combineLatest([
    pt.onChildPreferredSizeChange,
    table.l.setRowSpacing, table.l.onBorderTypeSet,
    table.l.setColumnSpacing
  ]).pipe(
    rx.switchMap(([[m1], [m2], [m3]]) => {
      return ft.calcSize().re(m1, m2, m3)
        .od(pt.didCalcSize).pipe(
          rx.take(1),
          rx.map(([, , , width, height]) => {
            ft.onContentSizeChange(width, height).dp(m1, m2, m3);
          })
        );
    })
  ));
  ft.requestReflowOn(
    table.l.onSize, table.l.alignCell, table.l.setColumnSpacing, table.l.setRowSpacing, table.l.setBorderPadding, table.l.onBorderTypeSet,
    table.l.onChildPreferredSizeChange
  ).dp();
  ft.setRenderChanges(renderData).dp();
  ft.onBorderTypeSet(new Set([TableBorderType.border, TableBorderType.columnSeparator])).dp();
  ft.setBorderStyle([]).dp();
  ft.rowById(rows).dp();
  ft.rowIds(rowIds).dp();
  ft.setColumnSpacing(1).dp();
  ft.setRowSpacing(0).dp();
  ft.alignCell(TableHoriAlig.left, TableVertAlig.middle).dp();
  ft.setBorderPadding(1, 0).dp();
  ft.addChild(moreIndicator).dp();
  ft.setCellBackground(() => {}).dp();
  ft.isOpaque(true).dp();
  ft.setLazyLoad(false).dp();
  function createRow(cells: Array<string | BaseWidget>) {
    return cells.map(cell => {
      const isValueString = typeof cell === 'string';
      const comp = isValueString ?
        createTextWidget(cell, {
          name: (opts?.default?.name ?? 'table') + '.cell',
          ...(opts?.optsForCellComponent ?
            {
              debug: opts?.default?.debug, log: opts?.default?.log,
              ...opts.optsForCellComponent
            } :
            {debug: opts?.default?.debug, log: opts?.default?.log})
        }) :
        cell;
      if (!isValueString && opts?.optsForCellComponent)
        comp.config(opts?.optsForCellComponent as any);
      return comp;
    });
  }
});
export type Table = SimplexReactorOfFac<typeof tableFac>;
export function createTable(opts?: TableOptions) {
  return tableFac.create(opts);
}

function calcCellSpaceSize(hasBorder: boolean, hasSeparator: boolean, cellIndex: number, cellCount: number, borderPadding: number, spacing: number) {
  let size = 0;
  if (cellIndex === 0) {
    if (hasBorder)
      size += borderPadding;
    if (hasSeparator)
      size += spacing;
    else
      size += Math.floor(spacing / 2);
  } else if (cellIndex === cellCount - 1) {
    if (hasSeparator) {
      size += spacing;
    } else
      size += Math.ceil(spacing / 2);
    if (hasBorder)
      size += borderPadding;
  } else {
    size += spacing;
    if (hasSeparator) {
      size += spacing;
    }
  }
  return size;
}
