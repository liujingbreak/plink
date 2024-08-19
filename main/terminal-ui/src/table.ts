/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {ActionDispenser, SingleActionFactory, CoreOptsOfExtSmplxRctr, actionRelatedToAction} from '@wfh/reactivizer';
import {RectangleOverlapTree} from './rectangle-overlap-tree';
import {BaseWidget, createFlexContainer, createContainerBase, TerminalContainer,
  TextStyle, createTextWidget} from './index';

export enum TableBorderType {
  none, cellSeparator, rowSeparator, columnSeparator
}
export enum TableHoriAlig {
  left, middle, right
}
export enum TableVertAlig {
  top, middle, bottom
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
const tableFor = ['setHeaders', 'rowById', 'setColumnSpacing', 'setBorderType', 'setRowSpacing',
  'setBorderStyle', 'alignCell'] as const;
export function createTable(opts: CoreOptsOfExtSmplxRctr<TerminalContainer, TableEvents>) {
  const base = createContainerBase({
    name: 'table',
    ...opts as any
  });
  const service = base.config<TableEvents, typeof tableFor>({
    tableFor
  });
  const {s, r, table} = service;
  base.s.prependInterceptor(action$ => {
    const ad = ActionDispenser.ofAction$<typeof base>(action$);
    return rx.merge(
      ad.pt.onRender.pipe(rx.ignoreElements()),
      ad.ofOtherTypes()
    );
  });
  const prependCtrl = service.s.prependController();
  const rows = new Map<number, BaseWidget[]>();
  const rowIds = [] as number[];
  const childBoundingTree = new RectangleOverlapTree<[number, BaseWidget]>();
  let rowIdSeed = 0;
  const moreIndicator = createFlexContainer({
    name: 'table.more',
    ...opts as any
  });
  r('calcSize -> didCalcSize', s.pt.calcSize.pipe(
    rx.mergeMap(([m, contrainWidth]) => {
      const rowArr = [...rows.values()];
      return rx.combineLatest([
        rx.combineLatest(rowArr.map(
          cells => rx.combineLatest(cells.map(c => c.table.l.preferredSize)).pipe(
            rx.take(1),
            rx.map(colSizes => colSizes.map(([, w, h]) => [w, h] as const))
          )
        )),
        table.l.setRowSpacing,
        table.l.setBorderType,
        table.l.setColumnSpacing
      ]).pipe(
        rx.take(1),
        rx.mergeMap(([cellSizes, [, rowSp], [, border], [, colSp]]) => {
          if (cellSizes.length === 0 || cellSizes[0].length === 0) {
            s.ft.didCalcSize([], [], 0, 0).dp(m);
            return rx.EMPTY;
          }
          const spHeight = (border === TableBorderType.cellSeparator || border === TableBorderType.rowSeparator) ?
            (rowSp * 2 + 1) * (cellSizes.length - 1) :
            rowSp * (cellSizes.length - 1);
          const spWidth = (border === TableBorderType.cellSeparator) ?
            (colSp * 2 + 1) * (cellSizes[0].length - 1) :
            colSp * (cellSizes[0].length - 1);
          const maxColWidths = cellSizes[0].map((_s, colIdx) => {
            return cellSizes.map(row => row[colIdx][0]).reduce((max, w) => {
              if (max < w)
                max = w;
              return max;
            }, 0);
          });
          const sumColWidths = maxColWidths.reduce((sum, it) => sum += it, 0);
          if (contrainWidth != null && (contrainWidth - spWidth) > sumColWidths) {
            service.log('Shrink table width');
            const sumMaxColWd = maxColWidths.reduce((sum, it) => sum += it, 0);
            const shrinkRatio = sumMaxColWd / (contrainWidth - spWidth);
            const shrinkedColW = maxColWidths.map(w => w * shrinkRatio);
            return rx.combineLatest(rowArr.map(r => rx.combineLatest(
              r.map((cell, col) => cell.s.ft.querySizeOf(shrinkedColW[col], null)
                .od(cell.s.pt.prefHeightFor).pipe(
                  rx.take(1)
                ))
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
              rx.map(allHeights => {
                s.ft.didCalcSize(shrinkedColW, allHeights, contrainWidth, allHeights.reduce((sum, h) => {
                  sum += h;
                  return sum;
                }, 0) + spHeight).dp(m);
              })
            );
          } else {
            const rowHeights = cellSizes.map(rowSizes => rowSizes.map(([, h]) => h).reduce((max, h) => {
              if (max < h)
                max = h;
              return max;
            }, 0));
            s.ft.didCalcSize(maxColWidths, rowHeights, sumColWidths + spWidth, rowHeights.reduce((sum, h) => {
              sum += h;
              return sum;
            }, 0) + spHeight).dp(m);
            return rx.EMPTY;
          }
        })
      );
    })
  ));
  r('addRow -> rowById, onRowAdded, addChild', s.pt.addRow.pipe(
    rx.map(([m, cells]) => {
      const cellComps = cells.map(cell => typeof cell === 'string' ?
        createTextWidget(cell, {name: 'table.cell', debug: opts.debug, log: opts.log}).b :
        cell);
      rows.set(rowIdSeed, cellComps);
      s.ft.rowById(rows).dp(m);
      s.ft.onRowAdded(rowIdSeed, cellComps).dp(m);
      s.ft.addChild(...cellComps).dp(m);
      rowIds.push(rowIdSeed);
      rowIdSeed++;
    })
  ));
  r('removeRow', s.pt.removeRow.pipe(
    rx.map(([m, idx]) => {
      const id = rowIds[idx];
      const cells = rows.get(id);
      for (const c of cells ?? []) {
        s.ft.removeChild(c).dp(m);
        c.dispose();
      }
      rows.delete(id);
    })
  ));
  r('reflow, onChildPositions, child.onSize -> "childBoundingTree"', s.pt.reflow.pipe(
    rx.switchMap(([m]) => {
      childBoundingTree.clear();
      return rx.combineLatest([
        s.pt.onChildPositions.pipe(
          actionRelatedToAction(m)
        ),
        table.l.allDisplayChildren
      ]).pipe(
        rx.take(1),
        rx.mergeMap(([[, pos], [, children]]) => children.map(chd => [chd, pos.get(chd)] as const)),
        rx.filter(([, pos]) => pos != null),
        rx.mergeMap(([chd, pos], idx) => chd.table.l.onSize.pipe(
          rx.take(1),
          rx.map(([, w, h]) => {
            const [x, y] = pos!;
            childBoundingTree.addContent([x, y, w, h], [idx, chd]);
            service.log('add child', idx, 'bounding box to tree', x, y, w, h);
          })
        ))
      );
    })
  ));
  r('reflow -> overflow, onChildPositions, child.onSize', s.pt.reflow.pipe(
    rx.switchMap(([m, _clips, _masks]) => {
      return rx.combineLatest([
        table.l.onSize, table.l.alignCell, table.l.setColumnSpacing, table.l.setRowSpacing, table.l.setBorderType
      ]).pipe(
        rx.take(1),
        rx.mergeMap(([[, w, h], [, alignCellHori, alignCellVert], [, colSpacing], [, rowSpacing], [, border]]) => {
          return s.ft.calcSize(w).re(m).od(s.pt.didCalcSize).pipe(
            rx.mergeMap(([, colWidths, rowHeights, totalWidth, totalHeight]) => {
              s.ft.overflow(totalHeight > h).dp(m);
              if (totalHeight > h) {
                return moreIndicator.s.ft.querySizeOf(w, null).re(m).od(
                  moreIndicator.s.pt.prefHeightFor
                ).pipe(
                  rx.map(a => [w, h, alignCellHori, alignCellVert, colSpacing, rowSpacing, border, ...a, colWidths, rowHeights, totalWidth, totalHeight] as const)
                );
              }
              return rx.of([w, h, alignCellHori, alignCellVert, colSpacing, rowSpacing, border, null, null, 0, colWidths, rowHeights, totalWidth, totalHeight] as const);
            })
          );
        }),
        rx.take(1),
        rx.mergeMap(([_tableW, tableH, alignCellHori, alignCellVert, colSpacing, rowSpacing, border, , , moreH, colWidths, rowHeights, _totalWidth, _totalHeight]) => {
          const heightCon = tableH - moreH;
          let rowTop = 0;
          const childPos = new Map<BaseWidget, [number, number]>();
          return rx.from(rowIds).pipe(
            rx.concatMap((rowId, rowIdx) => {
              const cells = rows.get(rowId)!;
              let cellLeft = 0;
              return rx.from(cells).pipe(
                rx.concatMap((cell, cellIdx) => {
                  const width = colWidths[cellIdx];
                  const height = rowHeights[rowIdx];
                  const pos = [cellLeft, rowTop] as [number, number];
                  return cell.table.l.preferredSize.pipe(
                    rx.take(1),
                    // align cell horizontally
                    rx.mergeMap(([, cpw, cph]) => {
                      if (cpw > width) {
                        return cell.s.ft.querySizeOf(width, null)
                          .od(cell.s.pt.prefHeightFor).pipe(
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
                      childPos.set(cell, pos);
                      cell.s.ft.onSize(cellCompWidth, cellCompHeigth).dp(m);
                      cellLeft += width;
                      cellLeft += border === TableBorderType.cellSeparator ?
                        (colSpacing << 1) + 1 :
                        colSpacing;
                    })
                  );
                }),
                rx.finalize(() => {
                  rowTop += rowHeights[rowIdx];
                  if (border === TableBorderType.rowSeparator || border === TableBorderType.cellSeparator)
                    rowTop += rowSpacing * 2 + 1;
                  else
                    rowTop += rowSpacing;
                })
              );
            }),
            rx.takeWhile(() => rowTop < heightCon),
            rx.finalize(() => {
              s.ft.onChildPositions(childPos).dp(m);
            })
          );
        })
      );
    })
  ));
  r('onRender', prependCtrl.pt.onRender.pipe(
    rx.mergeMap(([m, canvas, trans, renderSelf, clips, masks]) => {
      return rx.combineLatest([
        table.l.onChildPositions, table.l.setBorderType, table.l.setBorderStyle, table.l.overflow,
        table.l.setRowSpacing, table.l.onSize
      ]).pipe(
        rx.take(1),
        rx.map(([[, posMap], [, bType], [, bStyle], [, overflow], [, rowSpc], [, width]]) => {
          if (renderSelf) {
            s.ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
          }
          service.log('>>>>>', clips[0], childBoundingTree.toString());
          let childToRender = clips.flatMap(clip => childBoundingTree.searchOverlaps(clip));
          service.log('>>>>> childToRender', childToRender.length);
          const excluded = new Set(masks ? masks.map(c => childBoundingTree.searchForCovered(c).map(([, w]) => w)).flat() : []);
          childToRender = childToRender.filter(([, c]) => !excluded.has(c));
          let i = 0;
          for (const [idx, row] of childToRender) {
            s.ft.renderChild(idx, row, canvas, trans, clips, masks ?? []).dp(m);
            i++;
          }
          if (!renderSelf)
            return;
          if (bType === TableBorderType.cellSeparator || bType === TableBorderType.rowSeparator) {
            for (const [, ch] of childToRender) {
              const [, y] = posMap.get(ch)!;
              const sepY = y - rowSpc - 1;
              if (sepY >= 0) {
                const sepPos = [0, sepY] as vec2;
                vec2.transformMat4(sepPos, sepPos, trans);
                if (sepPos[1] >= 0) {
                  // TODO: optimized by calculate intersection with clips
                  canvas.s.ft.addString(sepPos[0], sepPos[1], '─'.repeat(width), bStyle).dp(m);
                }
              }
            }
          }
          if (overflow) {
            s.ft.renderChild(i, moreIndicator.b.b, canvas, trans, clips, masks ?? []).dp(m);
          }
        })
      );
    })
  ));
  r('querySizeOf -> prefWidthFor, prefHeightFor', s.pt.querySizeOf.pipe(
    rx.mergeMap(([m, width, height]) => {
      if (width == null && height != null) {
        return s.ft.calcSize().od(s.pt.didCalcSize).pipe(
          rx.take(1),
          rx.map(([, _colWidths, _rowHeights, width, height]) => {
            s.ft.prefWidthFor(width, height).dp(m);
          })
        );
      } else if (height == null && width != null) {
        return s.ft.calcSize(width).od(s.pt.didCalcSize).pipe(
          rx.take(1),
          rx.map(([, _colWidths, _rowHeights, width, height]) => {
            s.ft.prefWidthFor(width, height).dp(m);
          })
        );
      }
      return rx.EMPTY;
    })
  ));
  r('onChildPreferredSizeChange', rx.combineLatest([
    s.pt.onChildPreferredSizeChange,
    table.l.setRowSpacing, table.l.setBorderType
  ]).pipe(
    rx.mergeMap(([[m1], [m2], [m3]]) => {
      return s.ft.calcSize().re(m1, m2, m3)
        .od(s.pt.didCalcSize).pipe(
          rx.map(([, , , width, height]) => {
            s.ft.preferredSize(width, height).dp(m1, m2, m3);
          })
        );
    })
  ));
  s.ft.setBorderType(TableBorderType.columnSeparator).dp();
  s.ft.setBorderStyle([]).dp();
  s.ft.setHeaders(null).dp();
  s.ft.rowById(rows).dp();
  s.ft.setColumnSpacing(1).dp();
  s.ft.setRowSpacing(0).dp();
  s.ft.alignCell(TableHoriAlig.left, TableVertAlig.middle).dp();
  s.ft.addChild(moreIndicator.b.b).dp();
  return service;
}
