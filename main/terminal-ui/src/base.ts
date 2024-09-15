/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, ActionMeta, Action, InferMapParam, SimplexReactorOptions} from '@wfh/reactivizer';
import {TerminalCanvas, Rectangle, BackgroundStyle, rectIntersection} from './canvas';
import {FocusService, SearchDirection} from './focusable';

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
}
export interface BaseWidgetEvents extends BaseWidgetInput {
  onSize(width: number, height: number): SingleActionFactory;
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
  latestRenderData(renderData$: rx.Observable<unknown>): SingleActionFactory;
  /** @deprecated use latestRenderData instead
   * If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  /** Get bouding rectangle that is calculated when the lastest "render" message is handled,
   * the coordinate of rectangle is relative to canvas, in case of child component of "scrollable" container,
   * the effect canvas is an offline canvas whose coordinate is different from containing canvas.
   * Also see `TermainlContainerEvents["hasOfflineCanvas"]`
   */
  onBoundingBox(rect: Rectangle): SingleActionFactory;
  onDettached(isDettached: boolean): SingleActionFactory;
  onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
  bgCleared(hasCleared: boolean): SingleActionFactory;
  onFocus(direction: SearchDirection): SingleActionFactory;
}
export const tableForBase = [
  'onSize', 'onTransform', 'offsetParent', 'isOffsetParent', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
  'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDettached', 'setFlexShrink',
  'setBackground', 'onBgChangeWithParent', 'bgCleared', 'setFocusable', 'latestRenderData'
] as const;
export type BaseWidget = SimplexReactor<BaseWidgetEvents, typeof tableForBase>;

/** Do not prepend controller to returned service, otherwise interceptor won't work */
export function createBase(opts?: Partial<SimplexReactorOptions<BaseWidgetEvents, typeof tableForBase>>) {
  const service = new SimplexReactor<BaseWidgetEvents, typeof tableForBase>({
    ...opts,
    tableFor: tableForBase,
    debugExcludeTypes: ['ofCanvas', 'bgCleared', ...(opts?.debugExcludeTypes ?? [])]
  });
  const {s, r, table} = service;
  r('transform signals', rx.merge(
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

  r('setSize', s.pt.setSize.pipe(
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
        parent.s.pt.bgCleared.pipe(
          rx.map(([m, cleared]) => {
            if (cleared) {
              s.ft.bgCleared(true).dp(m);
              s.ft.needRerender(true).dp(m);
            }
          })
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
    rx.switchMap(([m, op]) => {
      if (op) {
        return rx.combineLatest([
          table.l.setFocusable,
          table.l.isOffsetParent
        ]).pipe(
          rx.switchMap(([[m2, focusable], [m1, isOffsetParent]]) => {
            // service.log('dispatch onRectChange for', focusable, 'isOffsetParent', isOffsetParent);
            if (focusable) {
              if (focusable === true) {
                return rx.combineLatest([table.l.onTransform, table.l.onSize]).pipe(
                  rx.map(([[, trans], [, w, h]]) => {
                    const point = [0, 0] as [number, number];
                    vec2.transformMat4(point, point, trans);
                    const rect = [...point, w, h] as Rectangle;
                    op.focusService.s.ft.onRectChange(rect, service).dp(m2);
                  })
                );
              } else {
                return table.l.onTransform.pipe(
                  rx.map(([, trans]) => {
                    const rect = focusable;
                    const point = [rect[0], rect[1]] as [number, number];
                    vec2.transformMat4(point, point, trans);
                    op.focusService.s.ft.onRectChange([...point, rect[2], rect[3]], service).dp(m2);
                  })
                );
              }
            } else if (isOffsetParent) {
              return rx.combineLatest([table.l.onTransform, table.l.onSize]).pipe(
                rx.map(([[, trans], [, w, h]]) => {
                  const pos = [0, 0] as [number, number];
                  vec2.transformMat4(pos, pos, trans);
                  op.focusService.s.ft.onRectChange([...pos, w, h], service).dp(m1);
                })
              );
            } else {
              op.focusService.s.ft.removeFocusable(service).dp(m);
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
    s.ft.latestRenderData(renderData).dp();
  }));
  return service;
}

export interface TerminalContainerInput {
  addChild(...children: BaseWidget[]): SingleActionFactory;
  insertChild(beforeIndex: number, children: BaseWidget[]): SingleActionFactory;
  removeChild(...children: BaseWidget[]): SingleActionFactory;
  /** @deprecated use latestReflowData instead.
   * If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
  addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  latestReflowData(data$: rx.Observable<unknown>): SingleActionFactory;
}

export interface TermainlContainerEvents extends TerminalContainerInput {
  /** implement should dispatch this event in "onRender" hanlder,
   * Default implementation is about: reflow, clear background, set flags
   **/
  renderSelf(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
  renderChild(index: number, child: BaseWidget, canvas: TerminalCanvas, absTransform: mat4, clipArea: Rectangle[], maskArea: Rectangle[]): SingleActionFactory;
  allChildren(children: Array<BaseWidget>): SingleActionFactory;
  /** all children whose "setDisplay" is not `none` */
  allDisplayChildren(children: Array<BaseWidget>): SingleActionFactory;
  /** Under context of "relow" action
   * @param positions the length of this parameter must equals to "allDisplayChildren"'s length
   **/
  onChildPositions(positions: Map<BaseWidget, [number, number]>): SingleActionFactory;
  onChildError(childId: string, errInfo: readonly [err: any, label: string | null]): SingleActionFactory;
  /** size of component which is "setDisplay" `none` is excluded */
  onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
  setLayoutValid(isValid: boolean): SingleActionFactory;
  /** Implementation container should set proper initial value, for container like "scrollable" whose child
   * component is actually rendered to another canvas other than the containing one, they must set this 
   * value to `true`, so that consumer knowns whether child components of this type of container has a different
   * rendering coordinate. Also see `BaseWidgetEvents["onBoundingBox"]`
   */
  hasOfflineCanvas(yes: boolean): SingleActionFactory;
  /** This message is when to calculate layout information like postion and size of children component, for later rendering,
   * this message is only signaled when latest "setLayoutValid" is `false`.
   * Implementation must handle this event to finish 2 tasks:
   *    1) For every "allDisplayChildren" dispatch "onSize" of child component
   *    2) Dispatch corresponding "onChildPositions" for latest "allDisplayChildren"
   **/
  reflow(clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
  /** No reaction yet , preserve for the future */
  renderBackgroundFor(child: BaseWidget): SingleActionFactory;
  /** Being relied by ElevatorContainer */
  isOpaque(yes: boolean): SingleActionFactory;
}

const tableFor = [
  'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions',
  'isOpaque', 'latestReflowData'
] as const;
export type TerminalContainer = SimplexReactorMergeType<BaseWidget, SimplexReactor<TermainlContainerEvents, typeof tableFor>>;

export function createContainerBase(opts?: Partial<TerminalContainer['opts']>) {
  const base = createBase(opts as BaseWidget['opts']);
  const service = base.config<TermainlContainerEvents, typeof tableFor>({
    tableFor,
    debugExcludeTypes: ['renderBackgroundFor']
  });

  const {r, s, table} = service;
  const {ft} = s;
  const children = [] as BaseWidget[];

  r('addChild -> child.setParent', s.pt.addChild.pipe(
    rx.map(([m, ...added]) => {
      children.push(...added);
      for (const child of added) {
        child.s.ft.setParent(service).dp(m);
      }
    })
  ));
  r('insertChild', s.pt.insertChild.pipe(
    rx.map(([m, before, added]) => {
      children.splice(before, 0, ...added);
      for (const child of added) {
        child.s.ft.setParent(service).dp(m);
      }
    })
  ));
  r('removeChild', s.pt.removeChild.pipe(
    rx.map(([m, ...widgets]) => {
      for (const w of widgets) {
        const idx = children.findIndex(c => c === w);
        if (idx >= 0)
          children.splice(idx, 1);
        w.s.ft.setParent(null).dp(m);
      }
    })
  ));
  r('addChild, removeChild, allChildren, children.preferredSize, children.setDisplay -> onChildPreferredSizeChange, setLayoutValid, allDisplayChildren', rx.merge(
    s.pt.addChild, s.pt.insertChild, s.pt.removeChild
  ).pipe(
    rx.switchMap(([m]) => table.l.allChildren.pipe(
      rx.switchMap(([, children]) => {
        return rx.merge(
          // -> allDisplayChildren
          rx.combineLatest(children.map(c => c.table.l.setDisplay.pipe(
            rx.map(([, d]) => d === DisplayMode.none ? null : c)
          ))).pipe(
            rx.map(chdn => chdn.filter(c => c != null)),
            rx.switchMap(chdn => {
              ft.allDisplayChildren(chdn).dp();
              return rx.combineLatest(chdn.map(widget => {
                return widget.table.l.preferredSize.pipe(
                  rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
                );
              }));
            }),
            rx.map(sizes => ft.onChildPreferredSizeChange(sizes.map(([, w, h]) => [w, h] as const)).dp(m))
          ),
          // watch display property change of each child component, dispatch setLayoutValid(false)
          ...children.map(widget => widget.table.l.setDisplay.pipe(
            rx.scan(([, prev], curr) => {
              const [m, mode] = curr;
              if (!((prev === DisplayMode.hidden && mode === DisplayMode.visible) ||
                  (mode === DisplayMode.hidden && prev === DisplayMode.visible))) {
                ft.setLayoutValid(false).dp(m);
              }
              return curr;
            }),
            service.labelError('children.setDisplay -> setLayoutValid')
          ))
        );
      })
    ))
  ));
  r('addReflowAction -> needRerender, setLayoutValid, bgCleared', s.pt.addReflowAction.pipe(
    rx.mergeMap(([, action$]) => action$),
    rx.map(actionOrPayload => {
      const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
      ft.needRerender(true).dp(m);
      ft.setLayoutValid(false).dp(m);
      ft.bgCleared(false).dp(m);
    })
  ));
  r('renderSelf, onBgChangeWithParent, onSize -> canvas.addString, canvas.clearRect', s.pt.renderSelf.pipe(
    rx.mergeMap(a => rx.combineLatest([
      table.l.onSize,
      table.l.onBgChangeWithParent,
      table.l.bgCleared
    ]).pipe(
      rx.take(1),
      rx.map(b => [a, ...b] as const)
    )),
    rx.map(([[m, canvas, trans], [, width, height], [, bg], [, cleared]], _idx) => {
      const pos = [0, 0] as vec2;
      vec2.transformMat4(pos, pos, trans);
      if (bg) {
        const fill = ' '.repeat(width);
        for (let i = 0; i < height; i++) {
          canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
        }
      } else if (!cleared) {
        canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
        s.ft.bgCleared(true).dp(m);
      }
    })
  ));
  r('renderSelf -> reflow, setLayoutValid, child.needRerender', s.pt.renderSelf.pipe(
    rx.withLatestFrom(table.l.setLayoutValid),
    rx.mergeMap(([[m, , , clips, masks], [, valid]]) => {
      if (!valid) {
        return table.l.allDisplayChildren.pipe(
          rx.take(1),
          rx.map(([, allChildren]) => {
            s.ft.setLayoutValid(true).dp(m);
            s.ft.reflow(clips, masks).dp(m);
            for (const child of allChildren)
              child.s.ft.needRerender(true).dp(m);
          })
        );
      } else {
        return rx.EMPTY;
      }
    })
  ));
  r('onRender -> renderSelf, renderChild', s.pt.onRender.pipe(
    rx.observeOn(rx.queueScheduler),
    rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(
      rx.take(1),
      rx.map(([, children]) => {
        if (renderSelf)
          s.ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
        for (let i = 0, l = children.length; i < l; i++) {
          const chr = children[i];
          s.ft.renderChild(i, chr, canvas, trans, clips, masks ?? []).dp(m);
        }
      })
    ))
  ));
  r('renderChild, onChildPositions -> child.render', s.pt.renderChild.pipe(
    rx.switchMap(([m, , chr, canvas, trans, clips, masks]) => rx.combineLatest([
      chr.table.l.onSize,
      table.l.onChildPositions
    ]).pipe(
      rx.take(1),
      rx.map(([[, width, height], [, childrenPosition]]) => {
        // listContainer.log('.renderChild', index, ': childrenPosition:', ...childrenPosition[index]);
        const [x, y] = childrenPosition.get(chr)!;
        const clipsOfCh = clips.map(cp => {
          const intersection = rectIntersection([x, y, width, height], cp);
          if (intersection) {
            intersection[0] -= x;
            intersection[1] -= y;
          }
          return intersection;
        }).filter(c => c != null);
        const masksOfCh = masks.map(mk => {
          const intersection = rectIntersection([x, y, width, height], mk);
          if (intersection) {
            intersection[0] -= x;
            intersection[1] -= y;
          }
          return intersection;
        }).filter(c => c != null);
        if (clipsOfCh.length > 0) {
          const tranOfChild = mat4.fromTranslation(mat4.create(), [x, y, 0]);
          mat4.mul(tranOfChild, trans, tranOfChild);
          chr.s.ft.render(canvas, tranOfChild, clipsOfCh, masksOfCh).re(m).dp();
        }
      })
    ))
  ));
  r('onChildError -> parent.onChildError', s.pt.onChildError.pipe(
    rx.withLatestFrom(s.pt.setParent),
    rx.map(([[, childId, errInfo], [, parent]]) => {
      if (parent)
        parent.s.ft.onChildError(childId, errInfo);
    })
  ));
  r('setLayoutValid, latestReflowData -> setLayoutValid', s.pt.setLayoutValid.pipe(
    rx.map(([, valid]) => valid),
    rx.distinctUntilChanged(),
    rx.switchMap(isValid => isValid ? table.l.latestReflowData.pipe(
      rx.switchMap(([, data$]) => data$),
      rx.skip(1),
      rx.take(1),
      rx.map(() => {
        s.ft.setLayoutValid(false).dp();
        s.ft.needRerender(true).dp();
        s.ft.bgCleared(false).dp();
      })
    ) : rx.EMPTY)
  ));

  const reflowData = rx.combineLatest([
    table.l.onSize.pipe(
      rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
    ),
    table.l.onChildPreferredSizeChange
  ]);

  r('init', new rx.Observable<never>(() => {
    ft.latestReflowData(reflowData).dp();
    // ft.addReflowAction(onSize$).dp();
    // ft.addReflowAction(s.pt.onChildPreferredSizeChange).dp();
    ft.latestRenderData(reflowData).dp();
    ft.addRerenderAction(s.pt.onBgChangeWithParent).dp();
    ft.allChildren(children).dp();
    ft.onSize(0, 0).dp();
    ft.onContentSizeChange(0, 0).dp();
    ft.overflow(false).dp();
    ft.setLayoutValid(false).dp();
    ft.hasOfflineCanvas(false).dp();
    ft.onChildPositions(new Map()).dp();
    ft.allDisplayChildren([]).dp();
    ft.onChildPreferredSizeChange([]).dp();
    ft.isOpaque(false).dp();
  }));
  return service;
}
export interface OffsetParent {
  focusService: FocusService;
}
