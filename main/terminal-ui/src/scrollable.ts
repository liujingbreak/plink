/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SimplexReactorOfFac, CreateOptsOfFac, OptionsOfSmplxRctr, SingleActionFactory, CoreOptions} from '@wfh/reactivizer';
import {BaseWidget, OffsetParent} from './base';
import {TerminalContainer, baseContainerFac} from './container';
import {createTerminalCanvas, TerminalCanvasOptions, TextStyle, rectIntersection} from './canvas';
import {createFocusService, FocusService} from './focusable';

export interface ScrollActions {
  scrollTo(left: number, top: number): SingleActionFactory;
  scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
  /** Set which axis direction is allowed to be scrollabe */
  setScrollable(x: boolean, y: boolean): SingleActionFactory;
}
interface ScrollSignals extends ScrollActions {
  onContent(component: BaseWidget): SingleActionFactory;
  onValidScroll(left: number, top: number): SingleActionFactory;
  onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
  /** true if content size is bigger than scrollable container size */
  isScrollNeeded(needed: boolean): SingleActionFactory;
}
const tableFor = ['onValidScroll', 'setScrollable', 'onOverflow', 'onContent', 'isScrollNeeded'] as const;

/** Scrollable is a TerminalContainer which has an offline canvas, child components will only be "render"ed
 * when they are scrolled to become visible, and they are firstly rendered to the offline canvas then will be copied
 * to outsider canvas afterward
 */
export const scrollableFac = baseContainerFac.forExtend<ScrollSignals, typeof tableFor>({
  name: 'scrollable',
  tableFor
}).defineReactor((init, comp: BaseWidget, opts?: ScrollableOptions) => {
  const scrollable = init({...opts?.default as any, ...opts?.core});
  const {r, s, table} = scrollable;
  const canvas = createTerminalCanvas({
    ...opts?.default as TerminalCanvasOptions,
    name: 'scrollable.canvas',
    ...opts?.canvas
  });
  const cTable = canvas.table.addActions('requestRender');
  canvas.s.ft.setRootComponent(comp).dp();
  r('canvas,requestRender -> outerCanvas.requestRender', s.pt.onRender.pipe(
    rx.take(1),
    rx.mergeMap(([, outerCanvas]) => cTable.l.requestRender.pipe(
      rx.map(([m]) => outerCanvas.s.ft.requestRender().dp(m))
    ))
  ));
  r('onRender,canvas.clearRect -> outerCanvas.clearRect', s.pt.onRender.pipe(
    rx.withLatestFrom(s.pt.onValidScroll),
    rx.mergeMap(([[, oCanvas], [, left, top]]) => canvas.s.pt.clearRect.pipe(
      rx.map(([m, x, y, w, h]) => {
        oCanvas.s.ft.clearRect(x + left, y + top, w, h).dp(m);
      })
    ))
  ));
  r('querySizeOf -> comp.querySizeOf', s.pt.querySizeOf.pipe(
    rx.mergeMap(([m, w, h]) => {
      if (w == null && h != null) {
        return comp.s.ft.querySizeOf(w, h).re(m).od(
          comp.s.pt.prefWidthFor
        ).pipe(
          rx.take(1),
          rx.map(([, width]) => s.ft.prefWidthFor(width, h).dp(m))
        );
      } else if (h == null && w != null) {
        return comp.s.ft.querySizeOf(w, h).re(m).od(
          comp.s.pt.prefHeightFor
        ).pipe(
          rx.take(1),
          rx.map(([, , height]) => s.ft.prefHeightFor(w, height).dp(m))
        );
      }
      return rx.EMPTY;
    })
  ));
  const renderData = [table.l.onValidScroll, table.l.onSize];

  r('onRender -> comp.render,...', s.pt.onRender.pipe(
    rx.withLatestFrom(...renderData),
    rx.mergeMap(([[m, outerCanvas, trans, renderSelf, clips, masks], [, scLeft, scTop], [, width, height]]) => {
      if (renderSelf)
        s.ft.renderSelf(outerCanvas, trans, clips, masks ?? []).dp(m);
      const clipsOfView = clips.map(c => {
        return rectIntersection([scLeft, scTop, width, height], [c[0] + scLeft, c[1] + scTop, c[2], c[3]]);
      }).filter(c => c != null);
      const masksOfView = masks ?
        masks.map(c => {
          return rectIntersection([scLeft, scTop, width, height], [c[0] + scLeft, c[1] + scTop, c[2], c[3]]);
        }).filter(c => c != null) :
        [];
      // scrollable.log('>>> clipOfView', clipsOfView.join(';'));
      s.ft.clear(outerCanvas, trans).dp(m);
      comp.s.ft.render(canvas, mat4.create(), clipsOfView, masksOfView).dp(m);
      return canvas.s.ft.copyRect(scLeft, scTop, width, height).re(m).od(
        canvas.s.pt.onCopyRect
      ).pipe(
        rx.take(1),
        rx.map(([, paintables]) => {
          for (const [x, , y, units, style] of paintables) {
            const point = [x, y] as vec2;
            vec2.transformMat4(point, point, trans);
            outerCanvas.s.ft.addDisplayUnits(point[0], point[1], units, [style] as unknown as TextStyle).dp(m);
          }
        })
      );
    })
  ));
  r('scrollTo, onSize, canvas.setBounding -> onValidScroll', rx.combineLatest([
    s.pt.scrollTo,
    s.pt.onSize,
    canvas.table.l.setBounding
  ]).pipe(
    rx.map(([[m, x, y], [m2, sWidth, sHeight], [m3, , , cWidth, cHeight]]) => {
      // base.log(sWidth, sHeight, cWidth, cHeight);
      if (x < 0)
        x = 0;
      if (y < 0)
        y = 0;
      const maxScrollX = cWidth - sWidth;
      if (x > maxScrollX)
        x = maxScrollX;
      const maxScrollY = cHeight - sHeight;
      if (y > maxScrollY)
        y = maxScrollY;
      if (x < 0)
        x = 0;
      if (y < 0)
        y = 0;
      return [x, y, m, m2, m3] as const;
    }),
    rx.distinctUntilChanged(([aX, aY], [bX, bY]) => aX === bX && aY === bY),
    rx.map(([x, y, m1, m2, m3]) => s.ft.onValidScroll(x, y).dp(m1, m2, m3))
  ));
  r('scroll -> scrollTo', s.pt.scroll.pipe(
    rx.withLatestFrom(table.l.onValidScroll),
    rx.map(([[m, x, y], [, currX, currY]]) => {
      s.ft.scrollTo(currX + x, currY + y).dp(m);
    })
  ));
  r('reflow... -> canvas.setBounding, comp.onSize, onOverflow', s.pt.reflow.pipe(
    rx.switchMap(() => rx.combineLatest([
      table.l.onSize, comp.table.l.preferredSize, table.l.setScrollable
    ]).pipe(
      rx.take(1),
      rx.switchMap(([[m1, w, h], [m2, pW, pH], [m3, xScrollable, yScrollable]]) => {
        if (xScrollable && yScrollable) {
          const compWidth = w > pW ? w : pW;
          const compHeight = h > pH ? h : pH;
          canvas.s.ft.setBounding(0, 0, compWidth, compHeight).dp(m1, m2, m3);
          s.ft.onOverflow(w < pW, h < pH).dp(m1, m2, m3);
          return rx.EMPTY;
        } else if (yScrollable) {
          if (w < pW) {
            return comp.s.ft.querySizeOf(w, null).re(m1, m2, m3).od(
              comp.s.pt.prefHeightFor
            ).pipe(
              rx.take(1),
              rx.map(([, , newPrefH]) => {
                canvas.s.ft.setBounding(0, 0, w, newPrefH > h ? newPrefH : h).dp(m1, m2, m3);
                s.ft.onOverflow(false, newPrefH > h).dp(m1, m2, m3);
              })
            );
          } else {
            canvas.s.ft.setBounding(0, 0, w, pH > h ? pH : h).dp(m1, m2, m3);
            s.ft.onOverflow(false, h < pH).dp(m1, m2, m3);
            return rx.EMPTY;
          }
        } else { // xScrollable
          if (h < pH) {
            return comp.s.ft.querySizeOf(null, h).re(m1, m2, m3).od(
              comp.s.pt.prefWidthFor
            ).pipe(
              rx.take(1),
              rx.map(([, newPrefWidth]) => {
                canvas.s.ft.setBounding(0, 0, newPrefWidth > w ? newPrefWidth : w, h).dp(m1, m2, m3);
                s.ft.onOverflow(newPrefWidth > w, false).dp(m1, m2, m3);
              })
            );
          } else {
            canvas.s.ft.setBounding(0, 0, pW > w ? pW : w, h).dp(m1, m2, m3);
            s.ft.onOverflow(w < pW, false).dp(m1, m2, m3);
            return rx.EMPTY;
          }
        }
      })
    ))
  ));
  r('onSize, comp.onSize -> isScrollNeeded', rx.combineLatest([
    table.l.onSize,
    comp.table.l.onSize
  ]).pipe(
    rx.map(([[m, w, h], [m2, w2, h2]]) => {
      s.ft.isScrollNeeded(w < w2 || h < h2).dp(m, m2);
    })
  ));
  r('onChildPreferredSizeChange,... -> onContentSizeChange', table.l.onChildPreferredSizeChange.pipe(
    rx.map(([m, sizes]) => {
      if (sizes.length > 0)
        s.ft.onContentSizeChange(sizes[0][0], sizes[0][1]).dp(m);
      else
        s.ft.onContentSizeChange(0, 0).dp(m);
    })
  ));
  r('canvas.error$', canvas.error$.pipe(
    rx.map(errInfo => s.ft.onChildError(canvas.s.logPrefix, errInfo))
  ));
  const focusService = createFocusService({
    ...opts?.default as any,
    name: opts?.default?.name ? opts?.default?.name + '.focusSvc' : 'scrollable.focusSvc',
    ...opts?.focusable
  });
  r('destory$ -> focusService.dispose', scrollable.destory$.pipe(
    rx.map(() => {
      focusService.dispose();
      canvas.dispose();
    })
  ));
  const service = scrollable as unknown as (Scrollable & OffsetParent);
  service.focusService = focusService;
  r('rootService, rootService.onFocus', focusService.table.l.rootService.pipe(
    rx.switchMap(([, root]) => root.table.l.onFocus.pipe(
      rx.distinctUntilChanged(([, a], [, b]) => a === b),
      rx.filter(([, , c]) => c != null),
      rx.mergeMap(([m, , c]) => rx.combineLatest([
        c!.s.ft.queryAbsBounding().re(m).od(
          c!.s.pt.didQueryAbsBounding
        ),
        scrollable.s.ft.queryAbsBounding().re(m).od(
          scrollable.s.pt.didQueryAbsBounding
        )
      ]).pipe(
        rx.take(1),
        rx.filter(([[, cb], [, sb]]) => cb != null && sb != null),
        rx.map(([[, cb], [, sb]]) => {
          const [x, y, w, h] = sb!;
          return [m, cb, [x + 1, y + 1, w - 2, h - 2]] as const;
        })
      )),
      rx.filter(([, , [, , w, h]]) => w > 2 && h > 2),
      rx.map(([m, cb, [px, py, pw, ph]]) => {
        const [x, y] = cb!;
        service.log('<<< abs of scrollable', x, y, px, py, pw, ph);
        if (x < px || y < py) {
          const scrollX = x < px ? x - px : 0;
          const scrollY = y < px ? y - py : 0;
          s.ft.scroll(scrollX, scrollY).dp(m);
        } else {
          let toX = 0;
          let toY = 0;
          if (x >= px + pw) {
            toX = x - (px + pw) + 1;
          }
          if (y >= py + ph) {
            toY = y - (py + ph) + 1;
          }
          if (toX !== 0 || toY !== 0)
            s.ft.scroll(toX, toY).dp(m);
        }
      })
    ))
  ));
  r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(
    rx.withLatestFrom(comp.table.l.isContainer,
      table.l.onBoundingBox,
      table.l.onValidScroll
    ),
    rx.mergeMap(([[m, ...rect0], [, isContainer], [, bounding], [, left, top]]) => {
      if (!isContainer) {
        s.ft.didFindOverlaps([comp]).dp(m);
        return rx.EMPTY;
      }
      const rect = rectIntersection(rect0, bounding);
      if (rect == null) {
        s.ft.didFindOverlaps([]).dp(m);
        return rx.EMPTY;
      }
      let [x, y] = rect;
      x = x - bounding[0] + left;
      y = y - bounding[1] + top;
      return (comp as TerminalContainer).s.ft.findOverlaps(x, y, rect[2], rect[3])
        .re(m).od((comp as TerminalContainer).s.pt.didFindOverlaps).pipe(
          rx.take(1),
          rx.map(([m2, found]) => s.ft.didFindOverlaps(found.concat(comp)).dp(m, m2))
        );
    })
  ));
  r('init', new rx.Observable<never>(() => {
    s.ft.isOffsetParent(service).dp();
    s.ft.onContentSizeChange(2, 2).dp();
    s.ft.setPreferredSize(null, null).dp();
    s.ft.onValidScroll(0, 0).dp();
    s.ft.setScrollable(true, true).dp();
    s.ft.onOverflow(false, false).dp();
    s.ft.addChild(comp).dp();
    s.ft.onContent(comp).dp();
    s.ft.setRenderChanges(renderData).dp();
    // s.ft.addReflowAction(s.at.onValidScroll).dp();
    // s.ft.addReflowAction(s.at.setScrollable).dp();
    s.ft.hasOfflineCanvas(true).dp();
  }));
}).interceptorForBaseByType(dispenser => {
  return rx.merge(
    rx.merge(
      dispenser.at.onRender,
      dispenser.at.findOverlaps
    ).pipe(
      rx.ignoreElements()
    ),
    dispenser.ofOtherTypes()
  );
});
export type Scrollable = SimplexReactorOfFac<typeof scrollableFac>;
export interface ScrollableOptions {
  default?: CoreOptions;
  core?: CreateOptsOfFac<typeof scrollableFac>;
  canvas?: TerminalCanvasOptions;
  focusable?: Partial<OptionsOfSmplxRctr<FocusService>>;
}

export function createScrollable(comp: BaseWidget, opts?: ScrollableOptions) {
  return scrollableFac.create(comp, opts);
}
