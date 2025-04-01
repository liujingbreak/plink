import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, ActionMeta, Action, InferMapParam,
  BaseReactorFactory, CoreOptions} from '@wfh/reactivizer';
import {Canvas, Rectangle, BackgroundStyle, TextStyle} from './canvas.js';
import {FocusService, ROOT_FOCUS_SERVICE_CONTEXT} from './focusable.js';
import {TerminalContainer} from './container.js';
// import {Scrollable, scrollableFac} from './scrollable.js';

export enum DisplayMode {
  visible,
  /** like CSS display:none, does not take any space in layout */
  none,
  /** it does take space in layout, but with empty content */
  hidden
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
  /** If value is null, the actual background color will inherit parents' color */
  setBackground(color: BackgroundStyle | null): SingleActionFactory;
  /** If value is null, the actual foreground color will inherit parents' color */
  setForeground(color: TextStyle | null): SingleActionFactory;
  /** to override automatical "preferredSize" in layout calculation */
  setPreferredSize(width: number | null, height: number | null): SingleActionFactory;
  /** Set to true to allow current component to be focused by user */
  setFocusable(focusable: boolean | Rectangle): SingleActionFactory;
  /** default 'inverse' */
  setFocusStyle(style: 'inverse' | null): SingleActionFactory;
  focus(): SingleActionFactory;
  /** observe the changes of absoulte bounding of component.
   * the change is kept reported by didQueryAbsBounding */
  queryAbsBounding(untilParent?: TerminalContainer): SingleActionFactory;
  /** Response message is "onContextChange" */
  queryContext(key: string): SingleActionFactory;
  provideContext(key: string, value: any): SingleActionFactory;
  provideFocusService(focusSvc: FocusService): SingleActionFactory;
  /**
   * Stops the propagation of events which is bubbling to containing components,
   * this message must be dispatched with corresponding action meta of event message.
   * ```
   * service.pt.onFocus.pipe(
   *    rx.map(([m, src]) => service.ft.stopEventPropagation().dp(m))
   * ).subscribe();
   * ```
   * */
  stopEventPropagation(): SingleActionFactory;
}
export interface BaseWidgetEvents extends BaseWidgetInput {
  isContainer(yes: boolean): SingleActionFactory;
  onSize(width: number, height: number): SingleActionFactory;
  /** The coordinate value is relative to parent container,
   * available after parent container's "reflow"
   **/
  onPosition(x: number | null, y: number | null): SingleActionFactory;
  /** available after "render" */
  onTransform(trans: mat4): SingleActionFactory;
  _saveTransform(trans: mat4): SingleActionFactory;
  // offsetParent(p: OffsetParent | null): SingleActionFactory;
  // isOffsetParent(me: OffsetParent | false): SingleActionFactory;
  /** Implementation needs to handle this event */
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  /** Extended container implementation need to handle this event. */
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  depth(componentTreeDepth: number): SingleActionFactory;
  /** Implementation should dispatch this message after calculating size based on child components or content,
   * unlike "onSize" which is set by user/caller or layout calculation logic.
   * Along with "setPreferredSize" are used to calculate "preferredSize" */
  onContentSizeChange(width: number, height: number): SingleActionFactory;
  overflow(yes: boolean): SingleActionFactory;

  setParent(p: TerminalContainer | null): SingleActionFactory;
  ofCanvas(canvas: Canvas | null): SingleActionFactory;
  /** this message will be intercepted and skipped if there is no "Rerender" action dispatched after last "render" message is handled,
   * @param clips - Rectangle to be rerendered, the coordinate is relative to target (this), clip could be smaller than the size of current component,
   *    e.g. When the container is a scrollable component, clip is the viewport area intersects with complete space taken by current component.
   * @param masks - Rectangle indicates the space being masked by any elevator component, may not render masks area to improve performance
   */
  render(canvas: Canvas, absTransform: mat4, clips?: Rectangle[], masks?: Rectangle[]): SingleActionFactory;
  /** Meant for being extended, @see container */
  beforeRender(canvas: Canvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
  clear(canvas: Canvas, absTransform: mat4): SingleActionFactory;
  /** Implementation needed to handle this event */
  onRender(canvas: Canvas, absTransform: mat4, renderSelf: boolean, clipArea: Rectangle[], maskArea?: Rectangle[]): SingleActionFactory;
  needRerender(need: boolean): SingleActionFactory;
  /** Set "needRerender" state on not only current component, but also all its children */
  needRerenderTree(): SingleActionFactory;
  /** Set rendering state data.
   * When this observable state data changes, a "needRerender" message will be triggered and followed by "render", "onRender" messages,
   * the observable value should be derived from table properties or any other observable in form of BehaviorSubject, which provides "current state" without any
   * asynchrouse waiting.
   */
  setRenderChanges(renderDataList: readonly rx.Observable<InferMapParam<any>>[]): SingleActionFactory;
  /** If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(...actionOrPayloads: rx.Observable<Action<any> | InferMapParam<any>>[]): SingleActionFactory;
  /** Get bounding rectangle that is calculated when the lastest "render" message is handled,
   * the coordinate of rectangle is relative to canvas which is attached with closest offset parent,
   * in case of child component of "scrollable" container,
   * the effect canvas is an offline canvas whose coordinate is different from containing canvas.
   * Also see `TermainlContainerEvents["hasOfflineCanvas"]`
   */
  onBoundingBox(rect: Rectangle): SingleActionFactory;
  onDetached(isDettached: boolean): SingleActionFactory;
  onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
  onFgChangeWithParent(style: TextStyle | null): SingleActionFactory;
  /** track whether current component has its background being cleared or rerendered by its parents */
  bgCleared(hasCleared: boolean): SingleActionFactory;
  onFocus(src: BaseWidget): SingleActionFactory;
  onBlur(src: BaseWidget): SingleActionFactory;
  onEnter(src: BaseWidget): SingleActionFactory;
  onLeave(src: BaseWidget): SingleActionFactory;
  didQueryAbsBounding(rect: Rectangle | null): SingleActionFactory;
  /**
   * @param value could be null, you need to explicitly cast type to what you are expecting
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  onContextChange(key: string, value: unknown | undefined): SingleActionFactory;
  focusService(focusSvc: FocusService): SingleActionFactory;
}
export const tableForBase = [
  'onSize', 'onTransform', 'onPosition', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
  'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDetached', 'setFlexShrink', 'render', 'setFocusStyle',
  'setBackground', 'setForeground', 'onFgChangeWithParent', 'onBgChangeWithParent', 'bgCleared', 'setFocusable', 'setRenderChanges', 'isContainer', 'depth', 'focusService'
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
    ad.at.setForeground.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
    ),
    ad.at.setDisplay.pipe(
      rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
    ),
    ad.at.setFocusStyle.pipe(
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
}).defineReactor(({init}) => {
  const service = init();
  const {ft, at, pt, r, s, table, latest} = service;
  r('_saveTransform -> onTransform', rx.merge(
    pt._saveTransform.pipe(
      rx.distinctUntilChanged(([, t1], [, t2]) => mat4.equals(t1, t2)),
      rx.map(([m, t]) => ft.onTransform(t).dp(m))
    )
  ));
  r('setPreferredSize, onContentSizeChange -> preferredSize', rx.combineLatest([
    latest.setPreferredSize, pt.onContentSizeChange
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
      ft.preferredSize(w, h).dp();
    })
  ));
  r('setSize,onSize,setParent -> setPreferredSize', pt.setSize.pipe(
    rx.switchMap(([m, w, h]) => {
      if (typeof w === 'string' && typeof h === 'string') {
        const percW = /(\d+)%/.exec(w)![0];
        const percH = /(\d+)%/.exec(h)![0];
        return latest.setParent.pipe(
          rx.switchMap(([, p]) => p ?
              p.latest.onSize.pipe(
                rx.map(([, w0, h0]) => {
                  ft.setPreferredSize(
                    Math.round(w0 * Number(percW) / 100),
                    Math.round(h0 * Number(percH) / 100)
                  ).dp(m);
                })
              ) :
            rx.EMPTY)
        );
      } else if (typeof w === 'string') {
        const percW = /(\d+)%/.exec(w)![0];
        return latest.setParent.pipe(
          rx.switchMap(([, p]) => p ?
              p.latest.onSize.pipe(
                rx.map(([, w0]) => {
                  ft.setPreferredSize(
                    Math.round(w0 * Number(percW) / 100),
                    h as (number | null)
                  ).dp(m);
                })
              ) :
            rx.EMPTY)
        );
      } else if (typeof h === 'string') {
        const percH = /(\d+)%/.exec(h)![0];
        return latest.setParent.pipe(
          rx.switchMap(([, p]) => p ?
              p.latest.onSize.pipe(
                rx.map(([, , h0]) => {
                  ft.setPreferredSize(
                    w,
                    Math.round(h0 * Number(percH) / 100)
                  ).dp(m);
                })
              ) :
            rx.EMPTY)
        );
      } else {
        ft.setPreferredSize(w, h).dp(m);
        return rx.EMPTY;
      }
    })
  ));
  let lastClips: Rectangle[] | undefined;
  r('render -> needRerender, onRender, onBoundingBox', pt.render.pipe(
    rx.withLatestFrom(latest.needRerender, latest.onSize, latest.setDisplay),
    rx.map(([[m, canvas, trans, clips, masks], [, renderSelf], [, width, height], [, display]]) => {
      ft._saveTransform(trans).dp(m);
      if (renderSelf) {
        ft.needRerender(false).dp(m);
      }
      const pos = [0, 0] as [number, number];
      vec2.transformMat4(pos, pos, trans);
      const bounding = [pos[0], pos[1], width, height] as [number, number, number, number];
      ft.onBoundingBox(bounding).dp(m);
      if (width === 0 || height === 0)
        return;
      if (display === DisplayMode.hidden) {
        ft.clear(canvas, trans).dp(m);
      } else {
        clips = clips ?? [[0, 0, width, height]];
        ft.beforeRender(canvas, trans, clips, masks ?? []).dp(m);
        const needRerender = !!table.data.needRerender[0];
        if (!renderSelf && !needRerender) {
          // service.log('--lastClips', lastClips, ',clips', clips);
          const isClipChanged = lastClips == null || (
            lastClips.length !== clips.length || !isRectangeCover(lastClips[0], clips[0])
          );
          if (isClipChanged) {
            renderSelf = true;
          }
        }
        ft.onRender(canvas, trans, renderSelf || needRerender, clips, masks).dp(m);
        if (needRerender)
          ft.needRerender(false).dp(m);
      }
      ft.bgCleared(false).dp(m);
      lastClips = clips;
    })
  ));
  r('clear... -> bgCleared...', pt.clear.pipe(
    rx.withLatestFrom(
      latest.onSize,
      latest.onBgChangeWithParent,
      latest.bgCleared
    ),
    rx.map(([[m, canvas, trans], [m2, width, height], [m3, bg], [m4, cleared]]) => {
      const pos = [0, 0] as vec2;
      vec2.transformMat4(pos, pos, trans);
      // service.log('>> clear bg:', bg, 'bgCleared:', cleared);
      if (bg) {
        const fill = ' '.repeat(width);
        for (let i = 0; i < height; i++) {
          canvas.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
        }
      } else if (!cleared) {
        canvas.ft.clearRect(pos[0], pos[1], width, height).dp(m);
      }
      ft.bgCleared(true).dp(m, m2, m3, m4);
    })
  ));
  r('setParent, error$, parent.destory$,parent.bgCleared... -> parent.onChildError, dispose()...', latest.setParent.pipe(
    rx.switchMap(([m, parent]) => {
      if (parent == null) {
        ft.ofCanvas(null).dp(m);
        ft.onDetached(true).dp(m);
        ft.depth(0).dp(m);
        return rx.EMPTY;
      }
      return rx.merge(
        parent.latest.depth.pipe(
          rx.map(([mp, d]) => ft.depth(d + 1).dp(mp))
        ),
        parent.latest.onDetached.pipe(
          rx.map(([m, d]) => {
            ft.onDetached(d).dp(m);
          })
        ),
        parent.latest.hasOfflineCanvas.pipe(
          rx.switchMap(([, has]) => has ?
            rx.EMPTY :
              parent.pt.bgCleared.pipe(
                rx.map(([m, cleared]) => {
                  if (cleared) {
                    ft.bgCleared(true).dp(m);
                    ft.needRerender(true).dp(m);
                  }
                })
              ))
        ),
        parent.latest.ofCanvas.pipe(
          rx.map(([m, canvas]) => ft.ofCanvas(canvas).dp(m))
        ),
        service.error$.pipe(
          rx.tap(errInfo => parent.ft.onChildError(service.s.logPrefix, errInfo))
        ),
        parent.destory$.pipe(
          rx.map(() => {service.dispose();})
        ),
        parent.pt.needRerenderTree.pipe(
          rx.map(([m]) => ft.needRerenderTree().dp(m))
        )
      );
    })
  ));
  r('setParent,setBackground,parent.onBgChangeWithParent -> onBgChangeWithParent', rx.combineLatest([
    latest.setParent.pipe(
      rx.switchMap(([, parent]) => parent?.latest.onBgChangeWithParent ?? rx.of([null, null] as const))
    ),
    latest.setBackground
  ]).pipe(
    rx.map(([[m, pBg], [m2, ownBg]]) => {
      if (ownBg)
        ft.onBgChangeWithParent(ownBg).dp(m2);
      else if (m && pBg)
        ft.onBgChangeWithParent(pBg).dp(m, m2);
      else
        ft.onBgChangeWithParent(null).dp(m2);
    })
  ));
  r('foreground,onBgChangeWithParent...-> onFgChangeWithParent', rx.combineLatest([
    latest.setForeground,
    latest.onBgChangeWithParent
  ]).pipe(
    rx.switchMap(([[fm, fg], [, bg]]) => fg && fg.length > 0 ?
        rx.of([fm, [...fg, bg]] as [typeof fm, typeof fg]) :
        latest.setParent.pipe(
          rx.switchMap(([m, p]) => p ? p.latest.onFgChangeWithParent : rx.of([m, null] as const))
        )
    ),
    rx.map(([m, style]) => {
      ft.onFgChangeWithParent(style).dp(m);
    })
  ));
  // dispatch onRectChange to offsetParent when setFocusable is not false or "isOffsetParent" is true
  function disableParentFocusable(thisComp: BaseWidget, m: ActionMeta): rx.Observable<any> {
    return thisComp.latest.setParent.pipe(
      rx.switchMap(([, p]) => p ? rx.merge(
        disableParentFocusable(p, m),
        p.latest.setFocusable.pipe(
          rx.take(1),
          rx.map(([, isFocusable]) => {
            if (isFocusable)
              p.ft.setFocusable(false).dp(m);
          })
        )
      ) : rx.EMPTY)
    );
  }
  r('setFocusable', pt.setFocusable.pipe(
    rx.switchMap(([m, focusable]) => focusable ?
        rx.merge(
          disableParentFocusable(service, m),
          latest.focusService.pipe(
            rx.switchMap(([, focusSvc]) => focusSvc.latest.forRootComp.pipe(
              rx.map(([, rootComp]) => [focusSvc, rootComp] as const)
            )),
            rx.switchMap(([focusSvc, rootComp]) => ft.queryAbsBounding(
              rootComp as TerminalContainer
            ).re(m).od(pt.didQueryAbsBounding).pipe(
              rx.switchMap(([, r]) => {
                return new rx.Observable(() => {
                  if (r) {
                    if (focusable === true) {
                      focusSvc.ft.onRectChange(r, service).dp(m);
                    } else {
                      const [x, y] = r;
                      const rect = focusable;
                      focusSvc.ft.onRectChange([rect[0] + x, rect[1] + y, rect[2], rect[3]], service).dp(m);
                    }
                  }
                  return () => {
                    focusSvc.ft.removeFocusable(service).dp(m);
                  };
                });
              })
            ))
          )
        ) :
      rx.EMPTY
    )
  ));
  // Refer "rootService" to offset parent's focusService's "rootService"
  r('queryAbsBounding -> didQueryAbsBounding', pt.queryAbsBounding.pipe(
    rx.mergeMap(([m, topParent]) => rx.combineLatest([
      latest.setParent,
      latest.onPosition,
      latest.onSize.pipe(
        rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh)
      )
    ]).pipe(
      rx.switchMap(([[, p], [, x, y], [, w, h]]) => {
        if (x == null || y == null) {
          ft.didQueryAbsBounding(null).dp(m);
          return rx.EMPTY;
        }
        if (p == null) {
          ft.didQueryAbsBounding([x, y, w, h] as Rectangle).dp(m);
          return rx.EMPTY;
        }
        if (topParent != null && topParent === p) {
          ft.didQueryAbsBounding([x, y, w, h] as const).dp(m);
          return rx.EMPTY;
        } else {
          return p.ft.queryAbsBounding(topParent).re(m).od(
            p.pt.didQueryAbsBounding
          ).pipe(
            rx.switchMap(([m2, r]) => {
              if (r == null) {
                ft.didQueryAbsBounding([x, y, w, h] as Rectangle).dp(m, m2);
                return rx.EMPTY;
              }
              const [px, py] = r;
              // if (scrollableFac.isFactoryOf(p)) {
              //   const scrollData = (p as Scrollable).table.getData().onValidScroll;
              //   // service.log('-- queryAbsBounding()', s.logPrefix, 'p', p.s.logPrefix);
              //   if (scrollData[0] != null) {
              //     return (p as Scrollable).latest.onValidScroll.pipe(
              //       rx.map(([, scrLeft, scrTop]) => {
              //         const res = [x + px - scrLeft, y + py - scrTop, w, h] as Rectangle;
              //         ft.didQueryAbsBounding(res).dp(m, m2);
              //       })
              //     );
              //   }
              // }
              const res = [x + px, y + py, w, h] as Rectangle;
              ft.didQueryAbsBounding(res).dp(m, m2);
              return rx.EMPTY;
            })
          );
        }
      }),
      rx.takeUntil(s.onCancelOf(m))
    ))
  ));

  r('onDetached -> focusService.removeFocusable', pt.onDetached.pipe(
    rx.withLatestFrom(latest.setFocusable, latest.focusService),
    rx.map(([[m], [, focusable], [, focusSvc]]) => {
      if (focusable)
        focusSvc.ft.removeFocusable(service).dp(m);
    })
  ));
  r('setRenderChanges -> needRerender', pt.setRenderChanges.pipe(
    rx.switchMap(([, list]) => rx.merge(
      list.map(it => it.pipe(
        rx.skip(1)
      )),
      pt.addRerenderAction.pipe(
        rx.mergeMap(([, ...a$s]) => a$s.map(it => it.pipe(rx.skip(1))))
      )
    )),
    rx.mergeMap(o => o),
    rx.map(actionOrPayload => {
      if (Array.isArray(actionOrPayload)) {
        ft.needRerender(true).dp(actionOrPayload[0]);
        return actionOrPayload[0];
      } else {
        ft.needRerender(true).dp(actionOrPayload);
        return actionOrPayload;
      }
    }),
    rx.withLatestFrom(table.l.ofCanvas),
    rx.map(([m, [, canvas]]) => {
      canvas?.ft.requestRender().dp(m);
    })
  ));
  r('needRerenderTree -> needRerender', pt.needRerenderTree.pipe(
    rx.map(([m]) => ft.needRerender(true).dp(m))
  ));
  let contextData: Map<string, any> | undefined;
  r('provideContext', pt.provideContext.pipe(
    rx.map(([, key, value]) => {
      contextData ??= new Map();
      contextData.set(key, value);
    })
  ));
  r('queryContext -> onContextChange', pt.queryContext.pipe(
    rx.mergeMap(([m, key]) => {
      return rx.concat(
        rx.of(contextData?.has(key) ?
            contextData.get(key) :
          undefined),
        pt.provideContext.pipe(
          rx.filter(([, k]) => k === key),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          rx.map(([, , v]) => v)
        )
      ).pipe(
        rx.switchMap(value => value !== undefined ?
            rx.of(value) :
            latest.setParent.pipe(
              rx.switchMap(([, p]) => p ?
                  p.ft.queryContext(key).re(m).od(
                    p.pt.onContextChange).pipe(
                    rx.map(([, , v]) => v)
                  ) :
                  rx.of(undefined)
              )
            )),
        rx.map(v => ft.onContextChange(key, v).dp(m)),
        rx.takeUntil(service.s.onCancelOf(m))
      );
    })
  ));
  r('provideFocusService,parent.focusService,queryAbsBounding...', pt.provideFocusService.pipe(
    rx.switchMap(([m, focusSvc]) => {
      ft.provideContext('focusSvc', focusSvc).dp(m);
      return latest.setParent.pipe(
        rx.switchMap(([, p]) => p ? p.latest.focusService : rx.EMPTY),
        rx.switchMap(([, pFocusSvc]) => {
          // disableParentFocusable(service, m),
          return pFocusSvc.latest.forRootComp.pipe(
            rx.map(([, root]) => [pFocusSvc, root] as const)
          );
        }),
        rx.switchMap(([pFocusSvc, root]) => {
          return rx.merge(
            pFocusSvc.pt.pauseHandleEvents.pipe(
              rx.map(([ms]) => focusSvc.ft.pauseHandleEvents().dp(ms))
            ),
            pFocusSvc.pt.resumeHandleEvents.pipe(
              rx.map(([ms]) => focusSvc.ft.resumeHandleEvents().dp(ms))
            ),
            ft.queryAbsBounding(root as TerminalContainer).re(m)
              .od(pt.didQueryAbsBounding).pipe(
                rx.filter(([, r]) => r != null),
                rx.map(([, r]) => {
                  service.log('--- onRectChange for context focusSvc', r, service.s.logPrefix);
                  pFocusSvc.ft.onRectChange(r!, service).dp(m);
                }),
                rx.finalize(() => {
                  pFocusSvc.ft.removeFocusable(service).dp(m);
                })
              )
          );
        })
      );
    })
  ));
  r('focus', pt.focus.pipe(
    rx.exhaustMap(([m]) => table.l.focusService.pipe(
      rx.take(1),
      rx.map(([, focus]) =>
        focus.ft.focusOnComponent(service).dp(m))
    ))
  ));

  const lastStopFocusPropaAction = new Set<ActionMeta['i']>();
  r('stopEventPropagation', pt.stopEventPropagation.pipe(
    rx.map(([m]) => {
      if (Array.isArray(m.r)) {
        for (const i of m.r)
          lastStopFocusPropaAction.add(i);
      } else if (m.r != null) {
        lastStopFocusPropaAction.add(m.r);
      } else {
        throw new Error('stopEventPropagation must be dispatched with related action meta');
      }
    })
  ));
  r('onFocus,stopEventPropagation -> parent.onFocus', rx.merge(
    at.onFocus, at.onBlur
  ).pipe(
    rx.mergeMap(a => {
      return new rx.Observable(sub => {
        setTimeout(() => {
          // service.log('-- lastStopFocusPropaAction', m.i, lastStopFocusPropaAction);
          if (!lastStopFocusPropaAction.has(a.i)) {
            // service.log('-- propagation', m.i);
            sub.next();
          } else {
            lastStopFocusPropaAction.delete(a.i);
          }
          sub.complete();
        }, 0);
      }).pipe(
        rx.switchMap(() => latest.setParent),
        rx.take(1),
        rx.map(([, p]) => {
          if (p) {
            const pa = s.createAction(a.t as any, a.p);
            p.s.actionUpstream.next(pa);
          }
        })
      );
    })
  ));
  const renderData = [
    latest.setDisplay,
    latest.onBgChangeWithParent,
    latest.onFgChangeWithParent
  ];
  r('...-> focusService', rx.combineLatest([
    ft.queryContext('focusSvc').od(pt.onContextChange),
    ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT).od(pt.onContextChange)
  ]).pipe(
    rx.switchMap(([[m, , v], [, , rv]]) => {
      if (v == null || rv == null) {
        return rx.EMPTY;
      }
      const rootFocusSvc = rv as FocusService;
      return (v as FocusService).latest.forRootComp.pipe(
        rx.take(1),
        rx.mergeMap(([, rComp]) => {
          // If current service is not a "rootComp" of the focusService
          // or focusService of context is the root focusService,
          // then the focusService is the effective one for current component,
          // otherwise the focusService stored in parent container's context should
          // be the effective focusService for current component
          if (rComp !== service || v === rootFocusSvc) {
            ft.focusService(v as FocusService).dp(m);
            return rx.EMPTY;
          } else {
            // If current component is a "rootComp" of focusService, use its parent's focusService instead
            return service.latest.setParent;
          }
        }),
        rx.switchMap(([, parent]) => parent ?
            parent.ft.queryContext('focusSvc').re(m).od(
              parent.pt.onContextChange
            ) : rx.EMPTY
        ),
        rx.map(([m2, , pFocusSvc]) => {
          if (pFocusSvc != null)
            ft.focusService(pFocusSvc as FocusService).dp(m, m2);
        }),
        rx.take(1)
      );
    })
  ));

  r('init', new rx.Observable<never>(() => {
    ft.depth(0).dp();
    ft.bgCleared(false).dp();
    ft.onPosition(null, null).dp();
    ft.setFocusStyle('inverse').dp();
    ft.setFlexGrow(0).dp();
    ft.setFlexShrink(1).dp();
    ft.setPreferredSize(null, null).dp();
    ft.needRerender(true).dp();
    ft.setParent(null).dp();
    ft.ofCanvas(null).dp();
    ft.setDisplay(DisplayMode.visible).dp();
    ft.onBoundingBox([0, 0, 0, 0]).dp();
    ft.setFocusable(false).dp();
    ft.onDetached(true).dp();
    ft.setBackground(null).dp();
    ft.setForeground(null).dp();
    ft.isContainer(false).dp();
    ft.onBgChangeWithParent(null).dp();
    ft.setRenderChanges(renderData).dp();
  }));
});

function isRectangeCover(covering: Rectangle, covered: Rectangle) {
  return covering[0] <= covered[0] && covering[0] + covering[2] >= covered[0] + covered[2] &&
    covering[1] <= covered[1] && covering[1] + covering[3] >= covered[1] + covered[3];
}
