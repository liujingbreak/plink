/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, ActionMeta, Action, InferMapParam,
  BaseReactorFactory, CoreOptions} from '@wfh/reactivizer';
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
  /** observe the changes of absoulte bounding of component.
   * the change is kept reported by didQueryAbsBounding */
  queryAbsBounding(untilParent?: TerminalContainer): SingleActionFactory;
}
export interface BaseWidgetEvents extends BaseWidgetInput {
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
  /** Implementation should dispatch this message after calculating size based on child components or content,
   * unlike "onSize" which is set by user/caller or layout calculation logic.
   * Along with "setPreferredSize" are used to calculate "preferredSize"*/
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
  beforeRender(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
  clear(canvas: TerminalCanvas, absTransform: mat4): SingleActionFactory;
  /** Implementation needed to handle this event */
  onRender(canvas: TerminalCanvas, absTransform: mat4, renderSelf: boolean, clipArea: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
  needRerender(need: boolean): SingleActionFactory;
  /** Set rendering state data.
   * When this observable state data changes, a "needRerender" message will be triggered and followed by "render", "onRender" messages,
   * the observable value should be derived from table properties or any other observable in form of BehaviorSubject, which provides "current state" without any
   * asynchrouse waiting.
   */
  setRenderChanges(renderDataList: readonly rx.Observable<InferMapParam<any>>[]): SingleActionFactory;
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
  onDetached(isDettached: boolean): SingleActionFactory;
  onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
  /** track whether current component has its background being cleared or rerendered by its parents */
  bgCleared(hasCleared: boolean): SingleActionFactory;
  onFocus(direction: SearchDirection): SingleActionFactory;
  didQueryAbsBounding(rect: Rectangle | null): SingleActionFactory;
}
export const tableForBase = [
  'onSize', 'onTransform', 'onPosition', 'offsetParent', 'isOffsetParent', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
  'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDetached', 'setFlexShrink',
  'setBackground', 'onBgChangeWithParent', 'bgCleared', 'setFocusable', 'setRenderChanges', 'isContainer'
] as const;
export type BaseWidgetRenderData = readonly [
  InferMapParam<BaseWidgetInput['setDisplay']>,
  InferMapParam<BaseWidgetEvents['onSize']>,
  InferMapParam<BaseWidgetEvents['setBackground']>
];
export type BaseWidget = SimplexReactor<BaseWidgetEvents, typeof tableForBase>;
export type BaseWidgetOptions = CoreOptions<BaseWidgetEvents>;

/** Do not prepend controller to returned service, otherwise interceptor won't work */
export const baseComponentFac = new BaseReactorFactory<BaseWidgetEvents, typeof tableForBase>({
  debugExcludeTypes: [
    'ofCanvas', '_saveTransform',
    'queryAbsBounding', 'didQueryAbsBounding'
  ],
  tableFor: tableForBase
}).interceptorByType(ad => {
  return rx.merge(
    ad.at.onPosition.pipe(
      rx.distinctUntilChanged(({p: [ax, ay]}, {p: [bx, by]}) => {
        return ax === bx && ay === by;
      })
    ),
    ad.at.onSize.pipe(
      rx.distinctUntilChanged(({p: [ax, ay]}, {p: [bx, by]}) => {
        return ax === bx && ay === by;
      })
    ),
    ad.at.onContentSizeChange.pipe(
      rx.distinctUntilChanged(({p: [ax, ay]}, {p: [bx, by]}) => {
        return ax === bx && ay === by;
      })
    ),
    ad.at.setBackground.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
    ),
    ad.at.setDisplay.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
    ),
    ad.at.needRerender.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
    ),
    ad.at.bgCleared.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
    ),
    ad.at.setFocusable.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => {
        return a === b;
      })
    ),
    ad.at.setFlexGrow.pipe(
      rx.distinctUntilChanged(({p: [v1]}, {p: [v2]}) => v1 === v2)
    ),
    ad.at.setFlexShrink.pipe(
      rx.distinctUntilChanged(({p: [v1]}, {p: [v2]}) => v1 === v2)
    ),
    ad.ofOtherTypes()
  );
}).defineReactor(init => {
  const service = init();
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
  r('needRerender, ofCanvas -> canvas.requestRender', s.pt.needRerender.pipe(
    rx.filter(([, need]) => need),
    rx.switchMap(([m]) => table.l.onDetached.pipe(
      rx.take(1),
      rx.filter(([, detached]) => !detached),
      rx.map(() => m)
    )),
    rx.switchMap(m => table.l.ofCanvas.pipe(
      rx.map(([, canvas]) => {
        if (canvas)
          canvas.s.ft.requestRender().dp(m);
      })
    ))
  ));
  let lastClips: Rectangle[] | undefined;
  // let lastMasks: Rectangle[] | undefined;
  r('render -> needRerender, onRender, onBoundingBox', s.pt.render.pipe(
    rx.withLatestFrom(table.l.needRerender, table.l.onSize, table.l.setDisplay),
    rx.map(([[m, canvas, trans, clips, masks], [, renderSelf], [, width, height], [, display]]) => {
      s.ft._saveTransform(trans).dp(m);
      if (renderSelf) {
        s.ft.needRerender(false).dp(m);
      }
      const pos = [0, 0] as [number, number];
      vec2.transformMat4(pos, pos, trans);
      const bounding = [pos[0], pos[1], width, height] as [number, number, number, number];
      s.ft.onBoundingBox(bounding).dp(m);
      if (width === 0 || height === 0)
        return;
      if (display === DisplayMode.hidden) {
        s.ft.clear(canvas, trans).dp(m);
      } else {
        clips = clips ?? [[0, 0, width, height]];
        s.ft.beforeRender(canvas, trans, clips, masks ?? []).dp(m);
        const needRerender = !!table.getData().needRerender[0];
        if (!renderSelf && !needRerender) {
          const isClipChanged = lastClips == null || (clips != null && (
            lastClips.length !== clips.length || !isRectangeCover(lastClips[0], clips[0])
          ));
          if (isClipChanged ) {
            renderSelf = true;
          }
        }
        s.ft.onRender(canvas, trans, renderSelf || needRerender, clips, masks).dp(m);
        if (needRerender)
          s.ft.needRerender(false).dp(m);
      }
      s.ft.bgCleared(false).dp(m);
      lastClips = clips;
    })
  ));
  r('clear', s.pt.clear.pipe(
    rx.withLatestFrom(
      table.l.onSize,
      table.l.onBgChangeWithParent,
      table.l.bgCleared
    ),
    rx.map(([[m, canvas, trans], [m2, width, height], [m3, bg], [m4, cleared]], _idx) => {
      const pos = [0, 0] as vec2;
      vec2.transformMat4(pos, pos, trans);
      service.log('>> clear bg:', bg, 'bgCleared:', cleared);
      if (bg) {
        const fill = ' '.repeat(width);
        for (let i = 0; i < height; i++) {
          canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
        }
      } else if (!cleared) {
        canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
      }
      s.ft.bgCleared(true).dp(m, m2, m3, m4);
    })
  ));
  r('setParent, error$, parent.destory$,parent.bgCleared... -> parent.onChildError, dispose()...', table.l.setParent.pipe(
    rx.switchMap(([m, parent]) => {
      if (parent == null) {
        s.ft.ofCanvas(null).dp(m);
        s.ft.onDetached(true).dp(m);
        return rx.EMPTY;
      }
      return rx.merge(
        parent.table.l.onDetached.pipe(
          rx.map(([m, d]) => {
            s.ft.onDetached(d).dp(m);
          })
        ),
        parent.table.l.hasOfflineCanvas.pipe(
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
  r('setParent,setBackground,parent.onBgChangeWithParent -> onBgChangeWithParent', rx.combineLatest([
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
      table.l.onPosition,
      table.l.onSize.pipe(
        rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh)
      )
    ]).pipe(
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
      }),
      rx.takeUntil(s.onCancelOf(m))
    ))
  ));

  r('onDetached -> focusService.removeFocusable', s.pt.onDetached.pipe(
    rx.withLatestFrom(table.l.offsetParent),
    rx.map(([[m], [m2, op]]) => {
      if (op)
        op.focusService.s.ft.removeFocusable(service).dp(m, m2);
    })
  ));
  r('setRenderChanges -> needRerender', s.pt.setRenderChanges.pipe(
    rx.switchMap(([, list]) => rx.merge(list.map(it => it.pipe(
      rx.skip(1)
    )))),
    rx.mergeMap(o => o),
    rx.map(([m]) => s.ft.needRerender(true).dp(m))
  ));
  const renderData = [
    table.l.setDisplay,
    table.l.onSize,
    table.l.setBackground
  ];

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
    s.ft.onDetached(true).dp();
    s.ft.setBackground(null).dp();
    s.ft.isContainer(false).dp();
    s.ft.onBgChangeWithParent(null).dp();
    s.ft.setRenderChanges(renderData).dp();
  }));
});

export interface OffsetParent {
  focusService: FocusService;
}

function isRectangeCover(covering: Rectangle, covered: Rectangle) {
  return covering[0] <= covered[0] && covering[0] + covering[2] >= covered[0] + covered[2] &&
    covering[1] <= covered[1] && covering[1] + covering[3] >= covered[1] + covered[3];
}
