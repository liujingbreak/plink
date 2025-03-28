/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SimplexReactorOfFac, CreateOptsOfFac, SingleActionFactory, CoreOptions} from '@wfh/reactivizer';
import {queryAppContext} from '../app/app-shell.js';
import {querySchemeForComponent} from '../app/color-theme.js';
import {BaseWidget} from './base.js';
import {TerminalContainer, baseContainerFac} from './container.js';
import {CanvasOptions, canvasFac, TextStyle, rectIntersection} from './canvas.js';
import {FocusServiceOpts, focusServiceFac} from './focusable.js';

export interface ScrollActions {
  scrollTo(left: number, top: number): SingleActionFactory;
  scroll(relativeLeft: number, relativeTop: number): SingleActionFactory;
  setScrollbarStyle(width: number, height: number, buttonColor: TextStyle, trackColor: TextStyle): SingleActionFactory;
  /** Set which axis direction is allowed to be scrollabe */
  setScrollable(x: boolean, y: boolean): SingleActionFactory;
}
interface ScrollSignals extends ScrollActions {
  onContent(component: BaseWidget): SingleActionFactory;
  onValidScroll(left: number, top: number): SingleActionFactory;
  onOverflow(xOverflow: boolean, yOverflow: boolean): SingleActionFactory;
  /** true if content size is bigger than scrollable container size */
  isScrollNeeded(needed: boolean): SingleActionFactory;
  onViewPortSize(w: number, h: number): SingleActionFactory;
}
const tableFor = ['onValidScroll', 'setScrollable', 'onOverflow', 'onContent', 'isScrollNeeded',
  'setScrollbarStyle', 'onViewPortSize'] as const;

/** Scrollable is a TerminalContainer which has an offline canvas, child components will only be "render"ed
 * when they are scrolled to become visible, and they are firstly rendered to the offline canvas then will be copied
 * to outsider canvas afterward
 */
export const scrollableFac = baseContainerFac.forExtend<ScrollSignals, typeof tableFor>({
  name: 'scrollable',
  tableFor
}).defineReactor((init, comp: BaseWidget, opts?: ScrollableOptions) => {
  const scrollable = init({
    debug: opts?.debug,
    log: opts?.log,
    name: opts?.name,
    ...opts?.container
  });
  const {r, ft, pt, latest} = scrollable;
  const canvas = canvasFac.create({
    debug: opts?.debug,
    log: opts?.log,
    name: opts?.name ?? 'scrollable.canvas',
    ...opts?.canvas
  });
  canvas.ft.setRootComponent(comp).dp();
  r('onRender,canvas.clearRect -> outerCanvas.clearRect', pt.onRender.pipe(
    rx.withLatestFrom(latest.onValidScroll, latest.onViewPortSize),
    rx.switchMap(([[mR, oCanvas, trans], [, left, top], [, sw, sh]]) => canvas.pt.clearRect.pipe(
      rx.map(([m, x, y, w, h]) => {
        const x1 = x + left;
        const y1 = y + top;
        const p = vec2.transformMat4([0, 0] as [number, number], [x1, y1], trans);
        const w1 = sw - x1 > w ? w : sw - x1;
        const h1 = sh - y1 > h ? h : sh - y1;
        oCanvas.ft.clearRect(p[0], p[1], w1, h1).dp(m, mR);
      })
    ))
  ));
  r('querySizeOf -> comp.querySizeOf', pt.querySizeOf.pipe(
    rx.mergeMap(([m, w, h]) => {
      if (w == null && h != null) {
        return rx.zip(
          comp.ft.querySizeOf(w, h).re(m).od(
            comp.pt.prefWidthFor
          ),
          latest.setScrollbarStyle,
          latest.setScrollable,
          comp.latest.preferredSize
        ).pipe(
          rx.take(1),
          rx.map(([[, width], [, sw], [, , ys], [, , ph]]) =>
            ft.prefWidthFor(
              ys && ph > h ? width + sw : width, h).dp(m))
        );
      } else if (h == null && w != null) {
        return rx.zip(
          comp.ft.querySizeOf(w, h).re(m).od(
            comp.pt.prefHeightFor
          ),
          latest.setScrollbarStyle,
          latest.setScrollable,
          comp.latest.preferredSize
        ).pipe(
          rx.take(1),
          rx.map(([[, , height], [, , sh], [, xs], [, pw]]) =>
            ft.prefHeightFor(w, xs && pw > w ? height - sh : height).dp(m))
        );
      }
      return rx.EMPTY;
    })
  ));
  const renderData = [
    latest.onValidScroll,
    latest.onSize,
    latest.onBgChangeWithParent,
    latest.setDisplay,
    latest.setScrollbarStyle
  ] as const;

  enum ButtonPixelType {full, topHalf, bottomHalf, no}

  r('onRender -> comp.render,...', pt.onRender.pipe(
    rx.withLatestFrom(...renderData, latest.onOverflow, canvas.latest.setBounding, latest.onViewPortSize),
    rx.mergeMap(([[m, outerCanvas, trans, renderSelf, clips, masks], [, scLeft, scTop], [, width, height],
      , , [, barWidth, barHeight, barCol, barTrack], [, xOverflow, yOverflow], [, , , cw, ch], [, vpWidth, vpHeight]]) => {
      if (renderSelf) {
        ft.clear(outerCanvas, trans).dp(m);
        ft.renderSelf(outerCanvas, trans, clips, masks ?? []).dp(m);
        // render scroll bar
        if (yOverflow) {
          const trackHeight = xOverflow ? height - barHeight : height;
          const leftTop = [width - barWidth, 0] as [number, number];
          vec2.transformMat4(leftTop, leftTop, trans);
          const barBtnTop = trackHeight * scTop / ch;
          const barBtnHeight = Math.ceil(trackHeight * vpHeight / ch);
          const barChars = '█'.repeat(barWidth);
          const trackChars = ' '.repeat(barWidth);
          const btnBottom = barBtnTop + barBtnHeight;
          const iBtnBottom = Math.floor(btnBottom);
          // scrollable.log('>> yScrollbar', 'top', barBtnTop, 'button height', barBtnHeight,
          //   'track height', trackHeight, 'barBtnTop', barBtnTop, 'btnBottom', btnBottom, iBtnBottom);
          for (let i = 0; i < trackHeight; i++) {
            let isButton = ButtonPixelType.no;
            if (i >= Math.ceil(barBtnTop) && i < iBtnBottom) {
              isButton = ButtonPixelType.full;
            } else if (i >= barBtnTop - 0.7 && i < iBtnBottom) {
              isButton = ButtonPixelType.bottomHalf;
            } else if (i >= Math.ceil(barBtnTop) && i < btnBottom - 0.3) {
              isButton = ButtonPixelType.topHalf;
            }
            // scrollable.log('i', i, 'ButtonPixelType', ButtonPixelType[isButton]);
            const style = isButton === ButtonPixelType.no ? barTrack : barCol;
            outerCanvas.ft.addString(leftTop[0], leftTop[1] + i,
              isButton === ButtonPixelType.full ?
                barChars :
                isButton === ButtonPixelType.no ?
                  trackChars :
                  isButton === ButtonPixelType.topHalf ?
                    '▀'.repeat(barWidth) :
                    '▄'.repeat(barWidth)
              , style).dp(m);
          }
        }
        if (xOverflow) {
          const trackWidth = yOverflow ? width - barWidth : width;
          const leftTop = [0, height - barHeight] as [number, number];
          let barBtnLeft = Math.floor(trackWidth * scLeft / cw);
          const barBtnWidth = Math.ceil(trackWidth * vpWidth / cw);
          if (scLeft > 0 && barBtnLeft === 0) {
            // make scroll bar button position more obvious for non-zero value
            barBtnLeft = 1;
          } else if (scLeft + vpWidth < cw && barBtnLeft + barBtnWidth === trackWidth) {
            barBtnLeft = trackWidth - barBtnWidth;
          }
          vec2.transformMat4(leftTop, leftTop, trans);
          const rightWidth = trackWidth - barBtnWidth - barBtnLeft;
          scrollable.log('>> trackWidth', trackWidth, 'barBtnLeft', barBtnLeft, 'barBtnWidth', barBtnWidth,
            'rightWidth', rightWidth, 'y', leftTop[1]);
          for (let i = 0; i < barHeight; i++) {
            const y = leftTop[1] + i;
            if (barBtnLeft > 0)
              outerCanvas.ft.addString(leftTop[0], y, ' '.repeat(barBtnLeft), barTrack).dp(m);
            outerCanvas.ft.addString(leftTop[0] + barBtnLeft, y, '█'.repeat(barBtnWidth), barCol).dp(m);
            if (rightWidth > 0)
              outerCanvas.ft.addString(leftTop[0] + barBtnLeft + barBtnWidth, y, ' '.repeat(rightWidth), barTrack).dp(m);
          }
        }
      } else {
        const p = [0, 0] as [number, number];
        vec2.transformMat4(p, p, trans);
        outerCanvas.ft.clearRect(p[0], p[1], vpWidth, vpHeight).dp(m);
      }
      const clipsOfView = clips.map(c => {
        return rectIntersection([scLeft, scTop, width, height], [c[0] + scLeft, c[1] + scTop, c[2], c[3]]);
      }).filter((c): c is NonNullable<typeof c> => c != null);
      const masksOfView = masks ?
        masks.map(c => {
          return rectIntersection([scLeft, scTop, width, height], [c[0] + scLeft, c[1] + scTop, c[2], c[3]]);
        }).filter((c): c is NonNullable<typeof c> => c != null) :
        [];
      // scrollable.log('>>> clipOfView', clipsOfView.join(';'));
      comp.ft.render(canvas, mat4.create(), clipsOfView, masksOfView).dp(m);
      return canvas.ft.copyRect(scLeft, scTop, vpWidth, vpHeight).re(m).od(
        canvas.pt.didCopyRect
      ).pipe(
        rx.take(1),
        rx.map(([, paintables]) => {
          for (const [x, , y, units, style] of paintables) {
            const point = [x - scLeft, y - scTop] as vec2;
            vec2.transformMat4(point, point, trans);
            outerCanvas.ft.addDisplayUnits(point[0], point[1], units, [style] as unknown as TextStyle).dp(m);
          }
        })
      );
    })
  ));
  r('scrollTo, onSize, canvas.setBounding -> onValidScroll', rx.combineLatest([
    pt.scrollTo,
    pt.onViewPortSize,
    canvas.latest.setBounding
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
    rx.map(([x, y, m1, m2, m3]) => ft.onValidScroll(x, y).dp(m1, m2, m3))
  ));
  r('scroll -> scrollTo', pt.scroll.pipe(
    rx.withLatestFrom(latest.onValidScroll),
    rx.map(([[m, x, y], [, currX, currY]]) => {
      ft.scrollTo(currX + x, currY + y).dp(m);
    })
  ));
  r('reflow... -> canvas.setBounding, onOverflow', pt.reflow.pipe(
    rx.switchMap(() => rx.combineLatest([
      latest.onSize, comp.latest.preferredSize, latest.setScrollable,
      latest.setScrollbarStyle
    ]).pipe(
      rx.take(1),
      rx.switchMap(([[m1, w, h], [m2, pW, pH], [m3, xScrollable, yScrollable], [, barWidth, barHeight]]) => {
        let vpWidth = w;
        let vpHeight = h;
        if (xScrollable && yScrollable) {
          vpWidth -= barWidth;
          vpHeight -= barHeight;
          const hasYScrollBar = pH > h;
          const hasXScrollBar = pW > w;
          let compWidth = pW > w ? pW : w;
          let compHeight = pH > h ? pH : h;
          if (!hasYScrollBar || !hasXScrollBar) {
            if (hasYScrollBar)
              compWidth = compWidth - barWidth;
            if (hasXScrollBar)
              compHeight = compHeight - barHeight;
          }
          scrollable.log('>> hasYScrollBar', hasYScrollBar, 'hasXScrollBar', hasXScrollBar);
          canvas.ft.setBounding(0, 0, compWidth, compHeight).dp(m1, m2, m3);
          ft.onOverflow(w < pW, h < pH).dp(m1, m2, m3);
          return rx.EMPTY;
        } else if (yScrollable) {
          if (w < pW) {
            return comp.ft.querySizeOf(w, null)
              .re(m1, m2, m3)
              .od(comp.pt.prefHeightFor).pipe(
                rx.mergeMap(([, , newPrefH]) => {
                  if (newPrefH > h) {
                    return comp.ft.querySizeOf(w - barWidth, null)
                      .re(m1, m2, m3)
                      .od(comp.pt.prefHeightFor);
                  }
                  return rx.of([null, w, newPrefH] as const);
                }),
                rx.take(1),
                rx.map(([, w, newPrefH]) => {
                  canvas.ft.setBounding(0, 0, w, newPrefH > h ? newPrefH : h).dp(m1, m2, m3);
                  ft.onOverflow(false, newPrefH > h).dp(m1, m2, m3);
                })
              );
          } else {
            canvas.ft.setBounding(0, 0, w, pH > h ? pH : h).dp(m1, m2, m3);
            ft.onOverflow(false, h < pH).dp(m1, m2, m3);
            return rx.EMPTY;
          }
        } else { // xScrollable
          if (h < pH) {
            return comp.ft.querySizeOf(null, h).re(m1, m2, m3).od(
              comp.pt.prefWidthFor
            ).pipe(
              rx.take(1),
              rx.mergeMap(([, newPrefWidth]) => {
                if (newPrefWidth > w) {
                  return comp.ft.querySizeOf(null, h - barHeight).re(m1, m2, m3).od(
                    comp.pt.prefWidthFor
                  );
                }
                return rx.of([null, newPrefWidth, h] as const);
              }),
              rx.map(([, newPrefWidth, h]) => {
                canvas.ft.setBounding(0, 0, newPrefWidth > w ? newPrefWidth : w, h).dp(m1, m2, m3);
                ft.onOverflow(newPrefWidth > w, false).dp(m1, m2, m3);
              })
            );
          } else {
            canvas.ft.setBounding(0, 0, pW > w ? pW : w, h).dp(m1, m2, m3);
            ft.onOverflow(w < pW, false).dp(m1, m2, m3);
            return rx.EMPTY;
          }
        }
      })
    ))
  ));
  r('onOverflow...-> onViewPortSize', rx.combineLatest([
    pt.onOverflow, latest.onSize, latest.setScrollbarStyle
  ]).pipe(
    rx.map(([[m, xOverflow, yOverflow], [, w, h], [, barWidth, barHeight]]) => {
      ft.onViewPortSize(yOverflow ? w - barWidth : w,
        xOverflow ? h - barHeight : h).dp(m, m.r);
    })
  ));
  r('onSize, comp.onSize -> isScrollNeeded', rx.combineLatest([
    latest.onSize,
    comp.latest.onSize
  ]).pipe(
    rx.map(([[m, w, h], [m2, w2, h2]]) => {
      ft.isScrollNeeded(w < w2 || h < h2).dp(m, m2);
    })
  ));
  r('onChildPreferredSizeChange,... -> onContentSizeChange', latest.onChildPreferredSizeChange.pipe(
    rx.map(([m, sizes]) => {
      if (sizes.length > 0)
        ft.onContentSizeChange(sizes[0][0], sizes[0][1]).dp(m);
      else
        ft.onContentSizeChange(0, 0).dp(m);
    })
  ));
  r('canvas.error$', canvas.error$.pipe(
    rx.map(errInfo => ft.onChildError(canvas.s.logPrefix, errInfo))
  ));
  r('destory$ -> focusService.dispose', scrollable.destory$.pipe(
    rx.map(() => {
      canvas.dispose();
    })
  ));
  // When decsendant is focused, scroll to ensure it is visible in viewport
  r('focusService,focusService.onFocus...-> scroll', pt.focusService.pipe(
    rx.switchMap(([m, focusService]) => focusService.pt.onFocus.pipe(
      rx.filter(([, , c]) => c != null),
      rx.mergeMap(([m, , c]) => rx.combineLatest([
        latest.onViewPortSize,
        c!.ft.queryAbsBounding(scrollable).re(m).od(
          c!.pt.didQueryAbsBounding
        ),
        latest.onValidScroll
      ]).pipe(
        rx.take(1)
      )),
      rx.filter(([[, sw, sh], [, cb]]) => sw > 2 && sh > 2 && cb != null),
      rx.map(([[, pw, ph], [, cb], [, scrollX, scrollY]]) => {
        const [x, y] = cb!;
        scrollable.log('--- scrollable focus', x, y, 'viewport', pw, ph, 'scroll', scrollX, scrollY);
        const scrollSideOff = 1;
        let toX = scrollX;
        let toY = scrollY;
        if (x < scrollX + scrollSideOff) {
          toX = x - scrollSideOff;
        } else if (x >= scrollX + pw - scrollSideOff) {
          toX = x - pw + scrollSideOff + 1;
        }
        if (y < scrollY + scrollSideOff) {
          toY = y - scrollSideOff;
        } else if (y >= scrollY + ph - scrollSideOff) {
          toY = y - ph + scrollSideOff + 1;
        }
        if (toX !== scrollX || toY !== scrollY)
          ft.scrollTo(toX, toY).dp(m);
      })
    ))
  ));
  r('onEnter -> keyEventService.bindToScrollable', pt.onEnter.pipe(
    rx.switchMap(([m]) => queryAppContext(scrollable, m).pipe(
      rx.take(1),
      rx.map(({keyEventService, statusbar}) => {
        keyEventService.ft.bindToScrollable(scrollable).dp(m);
        statusbar.ft.trackScrollable(scrollable).dp(m);
      })
    ))
  ));
  r('findOverlaps -> didFindOverlaps', pt.findOverlaps.pipe(
    rx.withLatestFrom(comp.latest.isContainer,
      latest.onBoundingBox,
      latest.onValidScroll
    ),
    rx.mergeMap(([[m, ...rect0], [, isContainer], [, bounding], [, left, top]]) => {
      if (!isContainer) {
        ft.didFindOverlaps([comp]).dp(m);
        return rx.EMPTY;
      }
      const rect = rectIntersection(rect0, bounding);
      if (rect == null) {
        ft.didFindOverlaps([]).dp(m);
        return rx.EMPTY;
      }
      let [x, y] = rect;
      x = x - bounding[0] + left;
      y = y - bounding[1] + top;
      const c = comp as TerminalContainer;
      return c.ft.findOverlaps(x, y, rect[2], rect[3])
        .re(m).od(c.pt.didFindOverlaps).pipe(
          rx.take(1),
          rx.map(([m2, found]) => ft.didFindOverlaps(found.concat(comp)).dp(m, m2))
        );
    })
  ));
  const focusSvc = focusServiceFac.create(canvas, {
    name: scrollable.s.logPrefix + '.focus',
    debug: opts?.debug,
    log: opts?.log,
    ...opts?.focus
  });
  focusSvc.ft.forRootComp(scrollable).dp();
  r('init', new rx.Observable<never>(() => {
    ft.onContentSizeChange(2, 2).dp();
    ft.setPreferredSize(null, null).dp();
    ft.onValidScroll(0, 0).dp();
    ft.setScrollable(true, true).dp();
    ft.onOverflow(false, false).dp();
    ft.addChild(comp).dp();
    ft.onContent(comp).dp();
    // ft.setRenderChanges(renderData).dp();
    ft.addRerenderAction(latest.onValidScroll, latest.setScrollbarStyle).dp();
    // ft.addReflowAction(s.at.onValidScroll).dp();
    // ft.addReflowAction(s.at.setScrollable).dp();
    ft.hasOfflineCanvas(true).dp();
  }));
  r('"theming"', querySchemeForComponent(scrollable).pipe(
    rx.map(([colors, ...m]) => {
      const bg = `bgHex(${colors.secondaryContainer})` as TextStyle[number];
      ft.setScrollbarStyle(1, 1, [`hex(${colors.secondary})`, bg], [bg]).dp(...m);
    })
  ));

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
  debug?: boolean;
  log?: CoreOptions['log'];
  name?: string;
  container?: CreateOptsOfFac<typeof scrollableFac>;
  canvas?: CanvasOptions;
  focus?: FocusServiceOpts;
}

export function createScrollable(comp: BaseWidget, opts?: ScrollableOptions) {
  return scrollableFac.create(comp, opts);
}
