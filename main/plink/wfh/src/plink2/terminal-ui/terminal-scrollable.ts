import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, ActionDispenser} from '@wfh/reactivizer';
import {BaseWidget, createContainerBase} from './terminal-widget';
import {createTerminalCanvas, TextStyle} from './terminal-canvas';

export interface ScrollActions {
  scrollTo(left: number, top: number): SingleActionFactory;
  scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
  /** Set which axis direction is allowed to be scrollabe */
  setScrollable(x: boolean, y: boolean): SingleActionFactory;
  onValidScroll(left: number, top: number): SingleActionFactory;
  onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
}
const tableFor = ['onValidScroll', 'setScrollable', 'onOverflow'] as const;
export function createScrollable(comp: BaseWidget) {
  const base = createContainerBase();
  const scrollable = base.config<ScrollActions, typeof tableFor>({name: 'scrollable', tableFor});
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

  const canvas = createTerminalCanvas();
  canvas.config({name: 'scrollable.canvas'});
  r('configChange', s.configChange.pipe(
    rx.map(cfg => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const obj = [...cfg.values()].reduce((obj, key) => {
        obj[key] = s.opts[key];
        return obj;
      }, {} as Record<string, any>);
      obj.debug = false;
      canvas.config(obj);
    })
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
  r('onRender', prepended.pt.onRender.pipe(
    rx.withLatestFrom(table.l.onValidScroll, table.l.setSize),
    rx.mergeMap(([[m, outerCanvas, trans, renderSelf], [, scLeft, scTop], [, width, height]]) => {
      if (renderSelf)
        s.ft.renderSelf(outerCanvas, trans).dp(m);
      comp.s.ft.render(canvas, mat4.create()).dp(m);
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
  r('scrollTo, setSize, canvas.setBounding -> onValidScroll', rx.combineLatest([
    s.pt.scrollTo,
    s.pt.setSize
  ]).pipe(
    rx.switchMap(a => canvas.table.l.setBounding.pipe(
      rx.take(1),
      rx.map(b => [...a, b] as const)
    )),
    rx.map(([[m, x, y], [m2, sWidth, sHeight], [, , , cWidth, cHeight]]) => {
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
      return [x, y, m, m2] as const;
    }),
    rx.distinctUntilChanged(([aX, aY], [bX, bY]) => aX === bX && aY === bY),
    rx.map(([x, y, m1, m2]) => s.ft.onValidScroll(x, y).dp(m1, m2))
  ));
  r('scroll -> scrollTo', s.pt.scroll.pipe(
    rx.withLatestFrom(table.l.onValidScroll),
    rx.map(([[m, x, y], [, currX, currY]]) => {
      s.ft.scrollTo(currX + x, currY + y).dp(m);
    })
  ));
  r('reflow, setSize, comp.preferredSize -> canvas.setBounding, comp.setSize, onOverflow', s.pt.reflow.pipe(
    rx.switchMap(() => rx.combineLatest([
      table.l.setSize, comp.table.l.preferredSize, table.l.setScrollable
    ]).pipe(
      rx.take(1),
      rx.switchMap(([[m1, w, h], [m2, pW, pH], [m3, xScrollable, yScrollable]]) => {
        if (xScrollable && yScrollable) {
          const compWidth = w > pW ? w : pW;
          const compHeight = h > pH ? h : pH;
          canvas.s.ft.setBounding(0, 0, compWidth, compHeight).dp(m1, m2, m3);
          comp.s.ft.setSize(compWidth, compHeight).dp(m1, m2, m3);
          s.ft.onOverflow(w < pW, h < pH).dp(m1, m2, m3);
          return rx.EMPTY;
        } else if (yScrollable) {
          if (w < pW) {
            return comp.s.ft.querySizeOf(w, null).re(m1, m2, m3).od(
              comp.s.pt.prefHeightFor
            ).pipe(
              rx.take(1),
              rx.map(([, , newPrefH]) => {
                canvas.s.ft.setBounding(0, 0, w, newPrefH).dp(m1, m2, m3);
                comp.s.ft.setSize(w, newPrefH).dp(m1, m2, m3);
                s.ft.onOverflow(false, newPrefH > h).dp(m1, m2, m3);
              })
            );
          } else {
            canvas.s.ft.setBounding(0, 0, w, pH).dp(m1, m2, m3);
            comp.s.ft.setSize(w, pH).dp(m1, m2, m3);
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
                canvas.s.ft.setBounding(0, 0, newPrefWidth, h).dp(m1, m2, m3);
                comp.s.ft.setSize(newPrefWidth, h).dp(m1, m2, m3);
                s.ft.onOverflow(newPrefWidth > w, false).dp(m1, m2, m3);
              })
            );
          } else {
            canvas.s.ft.setBounding(0, 0, pW, h).dp(m1, m2, m3);
            comp.s.ft.setSize(pW, h).dp(m1, m2, m3);
            s.ft.onOverflow(w < pW, false).dp(m1, m2, m3);
            return rx.EMPTY;
          }
        }
      })
    ))
  ));
  r('comp.preferredSize -> preferredSize', comp.table.l.preferredSize.pipe(
    rx.map(([m, w, h]) => {
      s.ft.preferredSize(w, h).dp(m);
      // comp.s.ft.setSize(w, h).dp(m);
      // canvas.s.ft.setBounding(0, 0, w, h).dp(m);
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

  r('init', s.pt.init.pipe(
    rx.map(() => {
      s.ft.preferredSize(2, 2).dp();
      s.ft.onValidScroll(0, 0).dp();
      s.ft.setScrollable(true, true).dp();
      s.ft.onOverflow(false, false).dp();
      s.ft.addChild(comp).dp();
      s.ft.addReflowAction(s.at.scrollTo).dp();
      s.ft.addReflowAction(s.at.setScrollable).dp();
      // s.ft.addRerenderAction(comp.s.at.preferredSize).dp();
      canvas.s.ft.setRootWidget(comp).dp();
    })
  ));
  return scrollable;
}
