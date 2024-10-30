/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, ActionMeta, Action, InferMapParam, SimplexReactorOptions} from '@wfh/reactivizer';
import {TerminalCanvas, Rectangle, BackgroundStyle} from './canvas';
import {SearchDirection, FocusService} from './focusable';
import {TerminalContainer} from './container';
import {Scrollable} from './scrollable';

export enum DisplayMode {
  visible,
  none, // like CSS display:none, does not take any space in layout
  hidden // it does take space in layout, but with empty content 
}
export interface BaseWidgetInput {
  /** The size set by this message will only affect "preference" size which is by default calculated by its content size,
   * but this size is only a suggestion provided to its container component,
   * the final size is decided by its container according to its layout feature,
   * e.g. In case its parent container is a FlexContainer, this value is acting like "flex-basis" as in Web CSS property,
   * the final size will be calculated also based on "setFlexGrow" or "setFlexShrink".
   **/
  setSize(width: number | `${number}%` | null, height: number | `${number}%` | null): SingleActionFactory;
  setFlexGrow(value: number): SingleActionFactory;
  setFlexShrink(value: number): SingleActionFactory;
  setDisplay(mode: DisplayMode): SingleActionFactory;
  setBackground(color: BackgroundStyle | null): SingleActionFactory;
  /** to override automatical "preferredSize" in layout calculation */
  setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
  setFocusable(focusable: boolean | Rectangle): SingleActionFactory;
  queryAbsBounding(untilParent?: TerminalContainer): SingleActionFactory;
}
export interface BaseWidgetEvents<S = BaseWidgetRenderData> extends BaseWidgetInput {
  isContainer(yes: boolean): SingleActionFactory;
  onSize(width: number, height: number): SingleActionFactory;
  /** The coordinate value is relative to parent container,
   * avaible after parent container's "reflow"
   **/
  onPosition(x: number | null, y: number | null): SingleActionFactory;
  /** available after "render" */
  onTransform(trans: mat4): SingleActionFactory;
  _saveTransform(trans: mat4): SingleActionFactory;
  offsetParent(p: OffsetParent | null): SingleActionFactory;
  isOffsetParent(me: OffsetParent | false): SingleActionFactory;
  /** Implementation needs to handle this event */
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  /** Extended container implementation need to handle this event. */
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  /** Implementation should dispatch this message after calculating size based on child components or content */
  onContentSizeChange(width: number, height: number): SingleActionFactory;
  overflow(yes: boolean): SingleActionFactory;

  setParent(p: TerminalContainer | null): SingleActionFactory;
  ofCanvas(canvas: TerminalCanvas | null): SingleActionFactory;
  /** this message will be intercepted and skipped if there is no "Rerender" action dispatched after last "render" message is handled,
   * @param clips - Rectangle to be rerendered, the coordinate is relative to target (this), clip could be smaller than the size of current component,
   *    e.g. When the container is a scrollable component, clip is the viewport area intersects with complete space taken by current component.
   * @param masks - Rectangle indicates the space being masked by any elevator component, may not render masks area to improve performance
   */
  render(canvas: TerminalCanvas, absTransform: mat4, clips?: Rectangle[], masks?: Rectangle[]): SingleActionFactory;
  /** Implementation needed to handle this event */
  onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, clipArea: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
  needRerender(need: boolean): SingleActionFactory;
  /** Set rendering state data.
   * When this observable state data changes, a "needRerender" message will be triggered and followed by "render", "onRender" messages,
   * the observable should be derived from table properties or any other observable in form BehaviorSubject, which provides "current state" without any
   * asynchrouse waiting.
   */
  latestRenderData(renderData$: rx.Observable<S>): SingleActionFactory;
  /** @deprecated use addRenderData or latestRenderData instead
   * If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  /** Get bouding rectangle that is calculated when the lastest "render" message is handled,
   * the coordinate of rectangle is relative to canvas which is attached with closest offset parent,
   * in case of child component of "scrollable" container,
   * the effect canvas is an offline canvas whose coordinate is different from containing canvas.
   * Also see `TermainlContainerEvents["hasOfflineCanvas"]`
   */
  onBoundingBox(rect: Rectangle): SingleActionFactory;
  onDettached(isDettached: boolean): SingleActionFactory;
  onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
  bgCleared(hasCleared: boolean): SingleActionFactory;
  onFocus(direction: SearchDirection): SingleActionFactory;
  didQueryAbsBounding(rect: Rectangle | null): SingleActionFactory;
}
export const tableForBase = [
  'onSize', 'onTransform', 'onPosition', 'offsetParent', 'isOffsetParent', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
  'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDettached', 'setFlexShrink',
  'setBackground', 'onBgChangeWithParent', 'bgCleared', 'setFocusable', 'latestRenderData', 'isContainer'
] as const;
export type BaseWidgetRenderData = readonly [
  InferMapParam<BaseWidgetInput['setDisplay']>,
  InferMapParam<BaseWidgetEvents['onSize']>,
  InferMapParam<BaseWidgetEvents['setBackground']>
];
export type BaseWidget<S = unknown> = SimplexReactor<BaseWidgetEvents<S>, typeof tableForBase>;
export type BaseWidgetOptions = SimplexReactorOptions<BaseWidgetEvents, typeof tableForBase>;
/** Do not prepend controller to returned service, otherwise interceptor won't work */
export function createBase<S = BaseWidgetRenderData>(opts?: Partial<BaseWidgetOptions>) {
  const service = new SimplexReactor<BaseWidgetEvents<S>, typeof tableForBase>({
    ...opts,
    tableFor: tableForBase,
    debugExcludeTypes: opts?.debugExcludeTypes ?? ['ofCanvas', 'bgCleared', '_saveTransform', 'needRerender']
  });
  const {s, r, table} = service;
  r('_saveTransform -> onTransform', rx.merge(
    s.pt._saveTransform.pipe(
      rx.distinctUntilChanged(([, t1], [, t2]) => mat4.equals(t1, t2)),
      rx.map(([m, t]) => s.ft.onTransform(t).dp(m))
    )
  ));
  r('setPreferredSize, onContentSizeChange -> preferredSize', rx.combineLatest([
    table.l.setPreferredSize, s.pt.onContentSizeChange
  ]).pipe(
    rx.map(([[, w, h], [, cW, cH]]) => {
      const override = [cW, cH] as [number, number];
      if (w != null && cW !== w)
        override[0] = w;
      if (h != null && cH !== h)
        override[1] = h;
      return override;
    }),
    rx.distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]),
    rx.map(([w, h]) => {
      s.ft.preferredSize(w, h).dp();
    })
  ));
  r('needRerender, latestRenderData -> needRerender', s.pt.needRerender.pipe(
    rx.map(([, need]) => need),
    rx.distinctUntilChanged(),
    rx.switchMap(need => need ? rx.EMPTY :
      table.l.latestRenderData.pipe(
        rx.switchMap(([, data$]) => data$),
        rx.skip(1),
        rx.take(1),
        rx.map(() => s.ft.needRerender(true).dp())
      ))
  ));
  r('addRerenderAction', rx.merge(
    s.pt.addRerenderAction.pipe(
      rx.mergeMap(([, action$]) => action$)
    )
  ).pipe(
    rx.map(actionOrPayload => {
      const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
      s.ft.needRerender(true).dp(m);
    })
  ));

  r('setSize,onSize,setParent -> setPreferredSize', s.pt.setSize.pipe(
    rx.switchMap(([m, w, h]) => {
      if (typeof w === 'string' && typeof h === 'string') {
        const percW = /(\d+)%/.exec(w)![0];
        const percH = /(\d+)%/.exec(h)![0];
        return table.l.setParent.pipe(
          rx.switchMap(([, p]) => p ?
            p.table.l.onSize.pipe(
              rx.map(([, w0, h0]) => {
                s.ft.setPreferredSize(
                  Math.round(w0 * Number(percW) / 100),
                  Math.round(h0 * Number(percH) / 100)
                ).dp(m);
              })
            ) :
            rx.EMPTY)
        );
      } else if (typeof w === 'string') {
        const percW = /(\d+)%/.exec(w)![0];
        return table.l.setParent.pipe(
          rx.switchMap(([, p]) => p ?
            p.table.l.onSize.pipe(
              rx.map(([, w0]) => {
                s.ft.setPreferredSize(
                  Math.round(w0 * Number(percW) / 100),
                  h as (number | null)
                ).dp(m);
              })
            ) :
            rx.EMPTY)
        );
      } else if (typeof h === 'string') {
        const percH = /(\d+)%/.exec(h)![0];
        return table.l.setParent.pipe(
          rx.switchMap(([, p]) => p ?
            p.table.l.onSize.pipe(
              rx.map(([, , h0]) => {
                s.ft.setPreferredSize(
                  w,
                  Math.round(h0 * Number(percH) / 100)
                ).dp(m);
              })
            ) :
            rx.EMPTY)
        );
      } else {
        s.ft.setPreferredSize(w, h).dp(m);
        return rx.EMPTY;
      }
    })
  ));
  r('needRerender, ofCanvas', s.pt.needRerender.pipe(
    rx.withLatestFrom(table.l.ofCanvas),
    rx.map(([[m, need], [, canvas]]) => {
      if (canvas && need)
        canvas.s.ft.requestRender().dp(m);
    })
  ));
  r('render -> needRerender, onRender, renderBackgroundFor, onBoundingBox', s.pt.render.pipe(
    rx.withLatestFrom(table.l.needRerender, table.l.setParent, table.l.onSize, table.l.setDisplay),
    rx.map(([[m, canvas, trans, clips, masks], [, renderSelf], [, parent], [, width, height], [, display]]) => {
      s.ft._saveTransform(trans).dp(m);
      if (renderSelf) {
        s.ft.needRerender(false).dp(m);
        if (parent)
          parent.s.ft.renderBackgroundFor(service).dp(m);
      }
      const pos = [0, 0] as [number, number];
      vec2.transformMat4(pos, pos, trans);
      const bounding = [pos[0], pos[1], width, height] as [number, number, number, number];
      s.ft.onBoundingBox(bounding).dp(m);
      // if (renderSelf) {
      if (display === DisplayMode.hidden) {
        canvas.s.ft.clearRect(...bounding).dp(m);
        s.ft.bgCleared(true).dp(m);
      } else
        s.ft.onRender(canvas, trans, renderSelf, clips ?? [[0, 0, width, height]], masks).dp(m);
      // }
    })
  ));
  r('setParent, error$, parent.destory$... -> parent.onChildError, dispose()...', table.l.setParent.pipe(
    rx.switchMap(([m, parent]) => {
      if (parent == null) {
        s.ft.ofCanvas(null).dp(m);
        s.ft.onDettached(true).dp(m);
        return rx.EMPTY;
      }
      return rx.merge(
        parent.table.l.onDettached.pipe(
          rx.map(([m, d]) => {
            s.ft.onDettached(d).dp(m);
          })
        ),
        parent.s.pt.hasOfflineCanvas.pipe(
          rx.switchMap(([, has]) => has ?
            rx.EMPTY :
            parent.s.pt.bgCleared.pipe(
              rx.map(([m, cleared]) => {
                if (cleared) {
                  s.ft.bgCleared(true).dp(m);
                  s.ft.needRerender(true).dp(m);
                }
              })
            ))
        ),
        parent.table.l.ofCanvas.pipe(
          rx.map(([m, canvas]) => s.ft.ofCanvas(canvas).dp(m))
        ),
        service.error$.pipe(
          rx.tap(errInfo => parent.s.ft.onChildError(service.s.logPrefix, errInfo))
        ),
        parent.destory$.pipe(
          rx.map(() => service.dispose())
        )
      );
    })
  ));
  r('setParent, parent.onBgChangeWithParent -> onBgChangeWithParent', rx.combineLatest([
    table.l.setParent.pipe(
      rx.switchMap(([, parent]) => parent?.table.l.onBgChangeWithParent ?? rx.of([null, null] as const))
    ),
    table.l.setBackground
  ]).pipe(
    rx.map(([[m, pBg], [m2, ownBg]]) => {
      if (ownBg)
        s.ft.onBgChangeWithParent(ownBg).dp(m2);
      else if (m && pBg)
        s.ft.onBgChangeWithParent(pBg).dp(m, m2);
      else
        s.ft.onBgChangeWithParent(null).dp(m2);
    })
  ));
  // observe parent, when parent is a "offsetParent", set "offsetParent" to it,
  // otherwise set offsetParent to parent's offsetParent
  r('setParent, p.isOffsetParent, p.offsetParent -> offsetParent', s.pt.setParent.pipe(
    rx.switchMap(([m, p]) => {
      if (p) {
        return rx.combineLatest([
          p.table.l.isOffsetParent,
          p.table.l.offsetParent
        ]).pipe(
          rx.map(([[m1, ofp], [m2, op]]) => {
            if (ofp) {
              s.ft.offsetParent(ofp).dp(m1);
            } else {
              s.ft.offsetParent(op).dp(m1, m2);
            }
          })
        );
      } else {
        s.ft.offsetParent(null).dp(m);
        return rx.EMPTY;
      }
    })
  ));

  // dispatch onRectChange to offsetParent when setFocusable is not false or "isOffsetParent" is true
  r('offsetParent, isOffsetParent, setFocusable -> onRectChange, removeFocusable', table.l.offsetParent.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.switchMap(([m, op]) => {
      if (op) {
        return rx.combineLatest([
          table.l.setFocusable,
          table.l.isOffsetParent
        ]).pipe(
          rx.switchMap(([[m2, focusable], [m1, isOffsetParent]]) => {
            // service.log('>>> dispatch onRectChange for', focusable, 'isOffsetParent', isOffsetParent);
            if (focusable) {
              if (focusable === true) {
                // service.log('>>> let me queryAbsBounding');
                return s.ft.queryAbsBounding(op as TerminalContainer & OffsetParent)
                  .re(m, m2, m1)
                  .od(s.pt.didQueryAbsBounding).pipe(
                    rx.filter(([, r]) => r != null),
                    rx.map(([, r]) => {
                      // service.log('>>> onRectChange', r, service.opts?.name);
                      op.focusService.s.ft.onRectChange(r!, service).dp(m1, m2, m);
                    })
                  );
              } else {
                return s.ft.queryAbsBounding(op as TerminalContainer & OffsetParent).re(
                  m, m2, m1
                ).od(
                  s.pt.didQueryAbsBounding
                ).pipe(
                  rx.filter(([, r]) => r != null),
                  rx.map(([, r]) => {
                    const [x, y] = r!;
                    const rect = focusable;
                    op.focusService.s.ft.onRectChange([rect[0] + x, rect[1] + y, rect[2], rect[3]], service).dp(m2, m1, m);
                  })
                );
              }
            } else if (isOffsetParent) {
              return s.ft.queryAbsBounding(op as TerminalContainer & OffsetParent)
                .re(m, m2, m1).od(
                  s.pt.didQueryAbsBounding
                ).pipe(
                  rx.filter(([, r]) => r != null),
                  rx.map(([, r]) => {
                    op.focusService.s.ft.onRectChange(r!, service).dp(m1, m2, m);
                  })
                );
            } else {
              op.focusService.s.ft.removeFocusable(service).dp(m, m1, m2);
              return rx.EMPTY;
            }
          }),
          rx.finalize(() => {
            op.focusService.s.ft.removeFocusable(service).dp(m);
          })
        );
      }
      return rx.EMPTY;
    })
  ));
  // Refer "rootService" to offset parent's focusService's "rootService"
  r('offsetParent, isOffsetParent... -> focusService.rootService', rx.combineLatest([
    s.pt.offsetParent,
    s.pt.isOffsetParent
  ]).pipe(
    rx.switchMap(([[, op], [, isOffsetParent]]) => {
      return op && isOffsetParent
        ? op.focusService.table.l.rootService.pipe(
          rx.map(([m, rootFocus]) => isOffsetParent.focusService.s.ft.rootService(rootFocus).dp(m))
        )
        : rx.EMPTY;
    })
  ));
  r('queryAbsBounding -> didQueryAbsBounding', s.pt.queryAbsBounding.pipe(
    rx.mergeMap(([m, topParent]) => rx.combineLatest([
      table.l.setParent,
      table.l.onPosition.pipe(
        rx.distinctUntilChanged(([, ax, ay], [, bx, by]) => {
          return ax === bx && ay === by;
        })
      ),
      table.l.onSize.pipe(
        rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh)
      )
    ]).pipe(
      rx.takeUntil(s.onCancelOf(m)),
      rx.switchMap(([[, p], [, x, y], [, w, h]]) => {
        if (x == null || y == null) {
          s.ft.didQueryAbsBounding(null).dp(m);
          return rx.EMPTY;
        }
        if (p == null) {
          s.ft.didQueryAbsBounding([x, y, w, h] as Rectangle).dp(m);
          return rx.EMPTY;
        }
        let left = x;
        let top = y;
        if (topParent != null && topParent === p) {
          s.ft.didQueryAbsBounding([left, top, w, h] as const).dp(m);
          return rx.EMPTY;
        } else {
          return p.s.ft.queryAbsBounding(topParent).re(m).od(
            p.s.pt.didQueryAbsBounding
          ).pipe(
            rx.map(([m2, r]) => {
              if (r == null) {
                s.ft.didQueryAbsBounding([x, y, w, h] as Rectangle).dp(m, m2);
                return rx.EMPTY;
              }
              const [px, py] = r;
              const scrollData = (p as Scrollable).table.getData().onValidScroll;
              // service.log('queryAbsBounding()', s.logPrefix, 'has scrollData', scrollData);
              // eslint-disable-next-line prefer-const
              if (scrollData?.[0] != null) {
                const [sx, sy] = scrollData;
                left -= sx;
                top -= sy!;
              }
              const res = [left + px, top + py, w, h] as Rectangle;
              s.ft.didQueryAbsBounding(res).dp(m, m2);
            })
          );
        }
      })
    ))
  ));

  r('onDettached -> focusService.removeFocusable', s.pt.onDettached.pipe(
    rx.withLatestFrom(table.l.offsetParent),
    rx.map(([[m], [m2, op]]) => {
      if (op)
        op.focusService.s.ft.removeFocusable(service).dp(m, m2);
    })
  ));

  const renderData = rx.combineLatest([
    table.l.setDisplay,
    table.l.onSize.pipe(
      rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
    ),
    table.l.setBackground
  ]);

  r('init', new rx.Observable<never>(() => {
    s.ft.bgCleared(false).dp();
    s.ft.onPosition(null, null).dp();
    s.ft.isOffsetParent(false).dp();
    s.ft.offsetParent(null).dp();
    s.ft.setFlexGrow(0).dp();
    s.ft.setFlexShrink(1).dp();
    s.ft.setPreferredSize(null, null).dp();
    s.ft.needRerender(true).dp();
    s.ft.setParent(null).dp();
    s.ft.ofCanvas(null).dp();
    s.ft.setDisplay(DisplayMode.visible).dp();
    s.ft.onBoundingBox([0, 0, 0, 0]).dp();
    s.ft.setFocusable(false).dp();
    s.ft.onDettached(true).dp();
    s.ft.setBackground(null).dp();
    s.ft.isContainer(false).dp();
    s.ft.latestRenderData(renderData as rx.Observable<S>).dp();
  }));
  return service;
}

export interface OffsetParentMessages {
  findOverlapComponent(...rect: Rectangle): SingleActionFactory;
}
export type OffsetParent = SimplexReactor<OffsetParentMessages> & {
  focusService: FocusService;
};
