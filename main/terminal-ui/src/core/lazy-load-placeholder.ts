/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory, SimplexReactor, actionRelatedToAction, BaseReactorFactory} from '@wfh/reactivizer';
import {FlexContainer, createFlexContainer, FlexContainerOpts} from './flex-container';
import {Rectangle} from './canvas';
import {createTextWidget, MultiLineTextWidgetOpts} from './text';
import {FocusService} from './focusable';

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
interface PageLoadingState {
  keep: boolean; isHead: boolean; loaded?: boolean; isEmpty?: boolean;
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
const tableFor = ['setExpandDir', 'setLabel', 'setAveragePageSize',
  'onBeforePages', 'onAfterPages', 'beforePageRange', 'afterPageRange',
  'dp_setTotalPageNum', 'setMaxLoadedPages'] as const;

export type LazyLoadPlaceHolderOpts = {
  default?: CoreOptions<any>;
  core?: CoreOptions<PlaceHolderEvents>;
  headPlaceHolder?: Partial<FlexContainerOpts>;
  tailPlaceHolder?: Partial<FlexContainerOpts>;
  headPlaceHolderLabel?: Partial<MultiLineTextWidgetOpts>;
  tailPlaceHolderLabel?: Partial<MultiLineTextWidgetOpts>;
};

export type LazyLoadPlaceHolder = SimplexReactor<PlaceHolderEvents, typeof tableFor>;
export const placeHolderFac = new BaseReactorFactory<PlaceHolderEvents, typeof tableFor>({
  name: 'LazyPlaceHolder',
  tableFor
}).interceptorByType(ad => rx.merge(
  ad.at.onAfterPages.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ad.at.onBeforePages.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ad.ofOtherTypes()
)).defineReactor((init, before: FlexContainer, after: FlexContainer, opts?: LazyLoadPlaceHolderOpts) => {
  const service = init({...opts?.default as any, ...opts?.core});
  const {r, ft, pt, table} = service;
  const labelBefore = createTextWidget('...', {
    name: 'LazyPlaceHolder.headLabel',
    ...opts?.default as any,
    ...opts?.headPlaceHolderLabel
  });
  const labelAfter = createTextWidget('Loading...', {
    name: 'LazyPlaceHolder.tailLabel',
    ...opts?.default as any,
    ...opts?.tailPlaceHolderLabel
  });

  const loadedCompsByPage = new Map<number, unknown[]>();
  const loadingPages = new Map<number, PageLoadingState>();
  const distinctAveragePageSize$ = pt.setAveragePageSize.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.share()
  );
  r('setLabel -> lable.setContent', pt.setLabel.pipe(
    rx.map(([m, text]) => {
      labelBefore.ft.setContent(text).dp(m);
      labelAfter.ft.setContent(text).dp(m);
    })
  ));
  r('setViewportSize -> setMaxLoadedPages', rx.combineLatest([
    pt.setViewportSize.pipe(
      rx.distinctUntilChanged(([, wa, ha], [, wb, hb]) => wa === wb && ha === hb)
    ),
    distinctAveragePageSize$
  ]).pipe(
    rx.switchMap(([[m, w, h], [m2, pageSize]]) => table.l.setExpandDir.pipe(
      rx.take(1),
      rx.map(([m3, dir]) => {
        if (pageSize > Number.EPSILON)
          ft.setMaxLoadedPages(Math.ceil((dir === 'col' ? h : w) / pageSize) + 1)
            .dp(m, m2, m3);
      })
    ))
  ));
  r('queryLoadedPages -> didQueryLoadedPages', pt.queryLoadedPages.pipe(
    rx.map(([m]) => {
      const pages = [...loadedCompsByPage.keys()];
      ft.didQueryLoadedPages(pages).dp(m);
    })
  ));
  r('requestPage -> dp_onLoadPage | dp_didLoad -> onPagesLoaded, dp_setTotalPageNum', pt.requestPage.pipe(
    rx.mergeMap(([m, isHead, pIdx]) => {
      const load$ = ft.dp_onLoadPage(pIdx, isHead ? 'prepend' : 'append')
        .re(m, m.r).od(pt.dp_didLoad).pipe(
          rx.take(1),
          rx.takeUntil(pt.cancelRequestPage.pipe(
            rx.filter(([, idx]) => idx === pIdx)
          )),
          rx.map(([, results]) => {
            loadedCompsByPage.set(pIdx, results);
            const state = loadingPages.get(pIdx);
            if (state) {
              state.loaded = true;
              state.isEmpty = results.length === 0;
            } else {
              service.log(`Error: Why loadingPages misses page #${pIdx}`);
              throw new Error(`Why loadingPages misses page #${pIdx}`);
            }
          }),
          rx.takeUntil(pt.dp_onLoadError.pipe(rx.filter(([, , page]) => page === pIdx))),
          rx.catchError((err) => {
            loadingPages.delete(pIdx);
            return rx.EMPTY;
          })
        );
      return rx.concat(load$, rx.defer(() => {
        const states = [...loadingPages.entries()]
          .filter(([, {isHead: isHead0}]) => isHead0 === isHead)
          .sort(([p], [p2]) => p - p2);
        service.log('<<< after dp_didLoad for', isHead ? 'head' : 'tail', 'filtered loadingPages', ...states.map(([p, state]) => `p: ${p} -> ${JSON.stringify(state)}`));
        if (states.length === 0 || !states.every(([, st]) => st.loaded)) {
          // wait for all loading pages are loaded
          return rx.EMPTY;
        }
        let done$: rx.Observable<unknown> = rx.EMPTY;
        const emptyPageState = states.find(([, state]) => state.isEmpty);
        if (emptyPageState) {
          loadingPages.delete(emptyPageState[0]);
          done$ = table.l.dp_setTotalPageNum.pipe(
            rx.take(1),
            rx.map(([, totalPage]) => {
              if (totalPage === 'unknown' || totalPage > emptyPageState[0])
                ft.dp_setTotalPageNum(emptyPageState[0]).dp(m, m.r);
            })
          );
        }
        const startIdx = states[0][0];
        const endIdx = emptyPageState ? emptyPageState[0] : states[states.length - 1][0] + 1;
        const comps = [] as unknown[];
        for (const [i, state] of states) {
          if (state.isEmpty)
            break;
          if (state.isHead !== isHead)
            continue;
          comps.push(...(loadedCompsByPage.get(i) ?? []));
          loadingPages.delete(i);
        }
        // service.log('<<< startIdx', startIdx, 'endIdx', endIdx);
        if (comps.length > 0)
          ft.onPagesLoaded(isHead, startIdx, endIdx, comps).dp(m, m.r);
        return done$;
      }));
    })
  ));
  r('onPagesLoaded... -> beforePageRange, afterPageRange, dp_onUnload', pt.onPagesLoaded.pipe(
    rx.withLatestFrom(
      table.l.beforePageRange,
      table.l.afterPageRange,
      table.l.setMaxLoadedPages,
      table.l.dp_setTotalPageNum
    ),
    rx.map(([[m, isHead, start, end], [, start1, end1], [, start2, end2], [, maxLoaded], [, totalPages]]) => {
      if (!isHead) {
        ft.afterPageRange(end, totalPages === 'unknown' ? end + 1 : totalPages).dp(m);
        if (start > start2) {
          // In case the pages between start2 and start are skipped (not loaded)
          ft.beforePageRange(start1, start).dp(m);
          // Unload some of previously visible and loaded rows between end1 and start2
          rx.range(end1, start2 - end1).pipe(
            rx.map(pageIdx => {
              const item = loadedCompsByPage.get(pageIdx);
              ft.dp_onUnload(pageIdx, item).dp(m);
              loadingPages.delete(pageIdx);
              loadedCompsByPage.delete(pageIdx);
            })
          ).subscribe();
        } else if (end - end1 > maxLoaded) {
          const changedEnd1 = end - maxLoaded;
          ft.beforePageRange(start1, changedEnd1).dp(m);
          rx.range(end1, changedEnd1 - end1).pipe(
            rx.map(pageIdx => {
              const item = loadedCompsByPage.get(pageIdx);
              ft.dp_onUnload(pageIdx, item).dp(m);
              loadingPages.delete(pageIdx);
              loadedCompsByPage.delete(pageIdx);
            })
          ).subscribe();
        }
      } else {
        ft.beforePageRange(start1, start).dp(m);
        if (end < end1) {
          // In case the pages between end and end1 are skipped
          ft.afterPageRange(end, end2).dp(m);
          // Unload some of previously visible and loaded rows between end1 and start2
          rx.range(end1, start2 - end1).pipe(
            rx.map(pageIdx => {
              const item = loadedCompsByPage.get(pageIdx);
              ft.dp_onUnload(pageIdx, item).dp(m);
              loadingPages.delete(pageIdx);
              loadedCompsByPage.delete(pageIdx);
            })
          ).subscribe();
        } else if (start2 - start > maxLoaded) {
          const changedStart2 = maxLoaded + start;
          ft.afterPageRange(changedStart2, end2).dp(m);
          rx.range(changedStart2, start2 - changedStart2).pipe(
            rx.map(pageIdx => {
              const item = loadedCompsByPage.get(pageIdx);
              ft.dp_onUnload(pageIdx, item).dp(m);
              loadingPages.delete(pageIdx);
              loadedCompsByPage.delete(pageIdx);
            })
          ).subscribe();
        }
      }
    })
  ));
  // Turn cancelRequestPage to "dp_onCancelLoad" with action meta of "dp_onLoadPage" message, it's
  // more convenient for outside consumer to subsribe on "dp_onLoadPage" in the context of "dp_onLoadPage"
  r('dp_onLoadPage, cancelRequestPage, dp_didLoad -> dp_onCancelLoad', pt.dp_onLoadPage.pipe(
    rx.mergeMap(([m, pIdx]) => pt.cancelRequestPage.pipe(
      rx.filter(([, i]) => i === pIdx),
      rx.take(1),
      rx.map(() => {
        ft.dp_onCancelLoad(pIdx).dp(m);
      }),
      rx.timeout(20000),
      rx.takeUntil(pt.dp_didLoad.pipe(
        actionRelatedToAction(m)
      )),
      rx.takeUntil(pt.dp_onLoadError.pipe(rx.filter(([, , page]) => page === pIdx))),
      rx.takeUntil(pt.__onError.pipe(
        actionRelatedToAction(m)
      ))
    ))
  ));
  // Avoid repeatitively request same page, also control to cancel abandonded request,
  // ensure there is only one ongoing request for each page
  r('requestPages, "loadingPages" -> requestPage, cancelRequestPage, "loadingPages"', pt.requestPages.pipe(
    rx.map(([m2, isHeadPlaceHolder, tIdx, tNum]) => {
      service.log('>>> requestPages handling', isHeadPlaceHolder, tIdx, tNum);
      for (let i = tIdx, l = tIdx + tNum; i < l; i++) {
        if (!loadingPages.has(i)) {
          loadingPages.set(i, {keep: true, isHead: isHeadPlaceHolder});
          ft.requestPage(isHeadPlaceHolder, i).dp(m2);
        } else {
          const state = loadingPages.get(i)!;
          state.keep = true;
          state.isHead = isHeadPlaceHolder;
        }
      }
      for (const [idx, state] of loadingPages.entries()) {
        if (state.isHead === isHeadPlaceHolder && !state.keep) {
          ft.cancelRequestPage(idx).dp(m2);
          loadingPages.delete(idx);
        } else {
          state.keep = isHeadPlaceHolder;
        }
      }
      service.log('requestPages >>> loadingPages',
        ...[...loadingPages.entries()].map(([p, obj]) => `${p}: ${JSON.stringify(obj)}`)
      );
    })
  ));
  r('onBeforePages, before.onRender -> requestPages', pt.onBeforePages.pipe(
    rx.map(([, pages]) => pages),
    rx.switchMap(pages => {
      return pages > 0 ? before.pt.onRender.pipe(
        rx.withLatestFrom(table.l.setExpandDir, table.l.beforePageRange, before.table.l.onSize),
        rx.filter(([, , [, r0, r1], [, w, h]]) => r1 > r0 && w > 0 && h > 0),
        rx.concatMap(a => rx.timer(50).pipe(rx.map(() => a))),
        rx.map(([[m, , , _renderSelf, clips], [, dir], [, pageRangeOpen, pageRangeClose], [, w, h]]) => {
          const pageSize = (dir === 'col' ? h : w) / (pageRangeClose - pageRangeOpen);
          const [pIndex0, pIndex1] = clipRangeToPageIndex(dir, clips, pageSize);
          // service.log('>>> head clipRangeToPageIndex(): pIndex0', pIndex0, 'pIndex1', pIndex1, 'pageSize', pageSize, 'clips', clips.join());
          return [pIndex0 + pageRangeOpen, pIndex1 - pIndex0 + 1, m] as const;
        }),
        rx.distinctUntilChanged(([s1, e1], [s2, e2]) => s1 === s2 && e1 === e2),
        rx.map(([start, end, m]) => ft.requestPages(true, start, end).dp(m))
      ) : rx.EMPTY;
    })
  ));
  r('onAfterPages, after.onRender -> requestPages', pt.onAfterPages.pipe(
    rx.switchMap(([, pages]) => {
      return pages > 0 ? after.pt.onRender.pipe(
        rx.withLatestFrom(table.l.setExpandDir, table.l.afterPageRange, after.table.l.onSize),
        rx.filter(([, , [, r0, r1], [, w, h]]) => r1 > r0 && w > 0 && h > 0),
        rx.concatMap(a => rx.timer(50).pipe(rx.map(() => a))),
        rx.map(([[m, , , _renderSelf, clips], [, dir], [, pageRangeOpen, pageRangeClose], [, w, h]]) => {
          const sizeForEachPage =  (dir === 'col' ? h : w) / (pageRangeClose - pageRangeOpen);
          const [pIndex0, pIndex1] = clipRangeToPageIndex(dir, clips, sizeForEachPage);
          // service.log('>>> tail clipRangeToPageIndex(): pIndex0', pIndex0, 'pIndex1', pIndex1, 'pageSize', sizeForEachPage, 'clips', clips.join());
          return [pIndex0 + pageRangeOpen, pIndex1 - pIndex0 + 1, m] as const;
        }),
        rx.distinctUntilChanged(([s1, e1], [s2, e2]) => s1 === s2 && e1 === e2),
        rx.map(([start, end, m]) => ft.requestPages(false, start, end).dp(m))
      ) : rx.EMPTY;
    })
  ));
  r('setAveragePageSize... -> before.setPreferredSize, after.setPreferredSize', rx.combineLatest([
    distinctAveragePageSize$,
    table.l.setExpandDir, before.pt.onContentSizeChange,
    after.pt.onContentSizeChange, table.l.onBeforePages, table.l.onAfterPages
  ]).pipe(
    rx.map(([[m, size], [, dir], [, beforeW, beforeH], [, afterW, afterH], [, bPages], [, aPages]]) => {
      if (dir === 'col') {
        // service.log(`+++ setAveragePageSize: ${size}, head [w:${beforeW}, h:${beforeH}], tail [w:${afterW}, h:${afterH}], aPages: ${aPages}`);
        before.ft.setPreferredSize(beforeW, bPages > 0 ? Math.max(size * bPages, beforeH) : 0).dp(m);
        after.ft.setPreferredSize(afterW, aPages > 0 ? Math.max(size * aPages, afterH) : 0).dp(m);
      } else {
        before.ft.setPreferredSize(bPages > 0 ? Math.max(size * bPages, beforeW) : 0, beforeH).dp(m);
        after.ft.setPreferredSize(aPages > 0 ? Math.max(size * aPages, afterW) : 0, afterH).dp(m);
      }
    })
  ));
  r('afterPageRange -> onAfterPages', pt.afterPageRange.pipe(
    rx.map(([m, start, end]) => ft.onAfterPages(end - start).dp(m))
  ));
  r('dp_setTotalPageNum', pt.dp_setTotalPageNum.pipe(
    rx.map(([m, num]) => {
      if (num !== 'unknown') {
        ft.afterPageRange(table.getData().afterPageRange[0] ?? 0, num).dp(m);
      }
    })
  ));
  r('beforePageRange -> onBeforePages', pt.beforePageRange.pipe(
    rx.map(([m, start, end]) => ft.onBeforePages(end - start).dp(m))
  ));
  r('dp_mgrFocusService', pt.dp_mgrFocusService.pipe(
    rx.switchMap(([m, focusSvc]) => focusSvc.table.l.forRootComp.pipe(
      rx.switchMap(([, r]) => r.table.l.ofCanvas),
      rx.filter(([, c]) => c != null),
      rx.switchMap(([m, canvas]) => rx.merge(
        pt.dp_onLoadPage.pipe(
          rx.map(([m]) => focusSvc.ft.pauseHandleEvents().dp(m))
        ),
        rx.merge(pt.dp_didLoad, pt.dp_onCancelLoad,
          pt.dp_onLoadError
        ).pipe(
          rx.exhaustMap(([m2]) => canvas!.pt.render.pipe(
            rx.take(1),
            rx.switchMap(() => rx.timer(250)),
            rx.map(() => m2)
          )),
          rx.map(m2 => {
            focusSvc.ft.resumeHandleEvents().dp(m, m2);
          })
        )
      ))
    ))
  ));
  before.ft.justifyContent('center').dp();
  before.ft.alignItems('end').dp();
  after.ft.justifyContent('center').dp();
  after.ft.alignItems('start').dp();
  // before.ft.setBackground('bgGreen').dp();
  // after.ft.setBackground('bgBlue').dp();
  before.ft.addChild(labelBefore).dp();
  after.ft.addChild(labelAfter).dp();
  ft.beforePageRange(0, 0).dp();
  ft.afterPageRange(0, 1).dp();
  ft.setLabel('...').dp();
  ft.setExpandDir('col').dp();
  ft.setAveragePageSize(0).dp();
  ft.onBeforePages(0).dp();
  ft.setMaxLoadedPages(Number.MAX_SAFE_INTEGER).dp();
  ft.dp_setTotalPageNum('unknown').dp();
});
export function createPlaceHolder(
  opts?: LazyLoadPlaceHolderOpts
) {
  const before = createFlexContainer({
    ...opts?.default as any,
    name: opts?.default?.name ? opts?.default.name + '.head' : 'LazyPlaceHolder.head',
    ...opts?.headPlaceHolder
  });
  const after = createFlexContainer({
    ...opts?.default as any,
    name: opts?.default?.name ? opts?.default.name + '.tail' : 'LazyPlaceHolder.tail',
    ...opts?.tailPlaceHolder
  });
  const service = placeHolderFac.create(before, after, opts);
  return {before, after, service};
}

function clipRangeToPageIndex(dir: 'col' | 'row', clips: Rectangle[], pageSize: number) {
  const clipRangeOpen = dir === 'col' ?
    clips.reduce((maxTop, [, y]) => maxTop > y ? maxTop : y, 0) :
    clips.reduce((maxLeft, [x]) => maxLeft > x ? maxLeft : x, 0);
  const clipRangeClose = dir === 'col' ?
    clips.reduce((minBottom, [, y, , h]) => {
      const b = y + h;
      return minBottom < b ? minBottom : b;
    }, Number.MAX_SAFE_INTEGER) :
    clips.reduce((minRight, [x, , w]) => {
      const r = x + w;
      return minRight < r ? minRight : r;
    }, Number.MAX_SAFE_INTEGER);
  const pageIndex0 = Math.floor(clipRangeOpen / pageSize);
  const pageIndex1 = Math.floor((clipRangeClose - 1) / pageSize);
  return [pageIndex0, pageIndex1] as const;
}
