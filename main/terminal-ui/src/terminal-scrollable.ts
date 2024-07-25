import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SimplexReactorExtendType, SingleActionFactory, ActionDispenser, CoreOptsOfExtSmplxRctr} from '@wfh/reactivizer';
import {BaseWidget, TerminalContainer, createContainerBase} from './terminal-widget';
import {createTerminalCanvas, TextStyle, rectIntersection} from './terminal-canvas';

export interface ScrollActions {
  scrollTo(left: number, top: number): SingleActionFactory;
  scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
  /** Set which axis direction is allowed to be scrollabe */
  setScrollable(x: boolean, y: boolean): SingleActionFactory;
  onContent(component: BaseWidget): SingleActionFactory;
  onValidScroll(left: number, top: number): SingleActionFactory;
  onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
}
const tableFor = ['onValidScroll', 'setScrollable', 'onOverflow', 'onContent'] as const;

export type Scrollable = SimplexReactorExtendType<TerminalContainer, ScrollActions, typeof tableFor>;

export function createScrollable(comp: BaseWidget, opts?: CoreOptsOfExtSmplxRctr<TerminalContainer, ScrollActions>) {
  const base = createContainerBase({name: 'scrollable', ...opts as any});
  const scrollable = base.config<ScrollActions, typeof tableFor>({tableFor});
  const {r, s, table} = scrollable;

  s.prependInterceptor(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof base.s>(action$);
    return rx.merge(
      dispenser.at.onRender.pipe(
        rx.ignoreElements()
      ),
      dispenser.ofOtherTypes()
    );
  });
  const prepended = s.prependController();

  const canvas = createTerminalCanvas({
    name: 'scrollable.canvas',
    ...(opts ? {debug: opts.debug, log: opts.log} : {})
  });
  canvas.s.ft.setRootWidget(comp).dp();
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
  r('onRender', prepended.pt.onRender.pipe(
    rx.withLatestFrom(table.l.onValidScroll, table.l.onSize),
    rx.mergeMap(([[m, outerCanvas, trans, renderSelf, renderArea], [, scLeft, scTop], [, width, height]]) => {
      if (renderSelf)
        s.ft.renderSelf(outerCanvas, trans, renderArea).dp(m);
      const intersection = rectIntersection([scLeft, scTop, width, height], [renderArea[0] + scLeft, renderArea[1] + scTop, renderArea[2], renderArea[3]]);
      comp.s.ft.render(canvas, mat4.create(), intersection!).dp(m);
      const orig = [0, 0] as vec2;
      vec2.transformMat4(orig, orig, trans);
      // canvas.s.ft.clearRect(orig[0], orig[1], width, height).dp(m);
      return canvas.s.ft.copyDirtyRectAndClear(scLeft, scTop, width, height).re(m).od(
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
    s.pt.onSize
  ]).pipe(
    rx.switchMap(a => canvas.table.l.setBounding.pipe(
      rx.take(1),
      rx.map(b => [...a, b] as const)
    )),
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
  r('reflow, onSize, comp.preferredSize -> canvas.setBounding, comp.onSize, onOverflow', s.pt.reflow.pipe(
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
  r('onChildPreferredSizeChange,... -> preferredSize', table.l.onChildPreferredSizeChange.pipe(
    rx.map(([m, sizes]) => {
      s.ft.preferredSize(sizes[0][0], sizes[0][1]).dp(m);
    })
  ));
  r('canvas.error$', canvas.error$.pipe(
    rx.map(errInfo => s.ft.onChildError(canvas.s.logPrefix, errInfo))
  ));
  scrollable.destory$.pipe(
    rx.map(() => {
      canvas.dispose();
    }),
    rx.take(1)
  ).subscribe();

  r('init', new rx.Observable<never>(() => {
    s.ft.preferredSize(2, 2).dp();
    s.ft.setPreferredSize(null, null).dp();
    s.ft.onValidScroll(0, 0).dp();
    s.ft.setScrollable(true, true).dp();
    s.ft.onOverflow(false, false).dp();
    s.ft.addChild(comp).dp();
    s.ft.onContent(comp).dp();
    s.ft.addReflowAction(s.at.scrollTo).dp();
    s.ft.addReflowAction(s.at.setScrollable).dp();
  }));
  return scrollable;
}
