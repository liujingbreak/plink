/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, ActionMeta, Action, InferMapParam, SimplexReactorOptions} from '@wfh/reactivizer';
import {TerminalCanvas, Rectangle, BackgroundStyle, rectIntersection} from './canvas';

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
}
export interface BaseWidgetEvents extends BaseWidgetInput {
  onSize(width: number, height: number): SingleActionFactory;
  /** Implementation needs to handle this event */
  querySizeOf(width: number | null, height: number | null): SingleActionFactory;
  /** Extended container implementation need to handle this event. */
  preferredSize(width: number, height: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefWidthFor(width: number, constrainHeight: number): SingleActionFactory;
  /** As response to "querySizeOf" */
  prefHeightFor(constrainWidth: number, height: number): SingleActionFactory;
  /** Calculated size based on child components or content, which ignores setPreferredSize value */
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
  /** If following action is dispatched, the next render message must not be skipped on current widget */
  addRerenderAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  /** Get bouding rectangle that is calculated when the lastest "render" message is handled,
   * the coordinate of rectangle is relative to canvas, in case of child component of "scrollable" container,
   * the effect canvas is an offline canvas whose coordinate is different from containing canvas.
   * Also see `TermainlContainerEvents["hasOfflineCanvas"]`
   */
  onBoundingBox(rect: Rectangle): SingleActionFactory;
  onDettached(isDettached: boolean): SingleActionFactory;
  onBgChangeWithParent(color: BackgroundStyle | null | undefined): SingleActionFactory;
}
export const tableForBase = [
  'onSize', 'overflow', 'preferredSize', 'prefHeightFor', 'prefWidthFor', 'setParent', 'needRerender',
  'setPreferredSize', 'setFlexGrow', 'ofCanvas', 'setDisplay', 'onBoundingBox', 'onDettached', 'setFlexShrink',
  'setBackground', 'onBgChangeWithParent'
] as const;
export type BaseWidget = SimplexReactor<BaseWidgetEvents, typeof tableForBase>;

/** Do not prepend controller to returned service, otherwise interceptor won't work */
export function createBase(opts?: Partial<SimplexReactorOptions<BaseWidgetEvents, typeof tableForBase>>) {
  const service = new SimplexReactor<BaseWidgetEvents, typeof tableForBase>({
    ...opts,
    tableFor: tableForBase,
    debugExcludeTypes: ['ofCanvas', ...(opts?.debugExcludeTypes ?? [])]
  });
  const {s, r, table} = service;

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
    s.pt.onSize.pipe(
      rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
    ),
    s.pt.setDisplay.pipe(
      rx.distinctUntilChanged(([, a], [, b]) => a === b)
    ),
    s.pt.addRerenderAction.pipe(
      rx.mergeMap(([, action$]) => action$)
    ).pipe(
      rx.map(actionOrPayload => {
        const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
        s.ft.needRerender(true).dp(m);
      })
    )
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
      if (renderSelf) {
        s.ft.needRerender(false).dp(m);
        if (parent)
          parent.s.ft.renderBackgroundFor(service).dp(m);
      }
      const pos = [0, 0] as [number, number];
      vec2.transformMat4(pos, pos, trans);
      const bounding = [pos[0], pos[1], width, height] as [number, number, number, number];
      s.ft.onBoundingBox(bounding).dp(m);
      if (renderSelf) {
        if (display === DisplayMode.hidden) {
          canvas.s.ft.clearRect(...bounding).dp(m);
        } else
          s.ft.onRender(canvas, trans, renderSelf, clips ?? [[0, 0, width, height]], masks).dp(m);
      }
    })
  ));
  r('setParent, error$, parent.destory$ -> parent.onChildError, dispose()', table.l.setParent.pipe(
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
  r('init', new rx.Observable<never>(() => {
    s.ft.setFlexGrow(0).dp();
    s.ft.setFlexShrink(1).dp();
    s.ft.setPreferredSize(null, null).dp();
    s.ft.needRerender(true).dp();
    s.ft.setParent(null).dp();
    s.ft.ofCanvas(null).dp();
    s.ft.setDisplay(DisplayMode.visible).dp();
    s.ft.onBoundingBox([0, 0, 0, 0]).dp();
    s.ft.onDettached(true).dp();
    s.ft.setBackground(null).dp();
  }));
  return service;
}

export interface TerminalContainerInput {
  addChild(...children: BaseWidget[]): SingleActionFactory;
  insertChild(beforeIndex: number, children: BaseWidget[]): SingleActionFactory;
  removeChild(...children: BaseWidget[]): SingleActionFactory;
  /** If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
  addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
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
  'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions', 'isOpaque'
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
      for (const child of children) {
        child.s.ft.setParent(service).dp(m);
      }
    })
  ));
  r('insertChild', s.pt.insertChild.pipe(
    rx.map(([m, before, children]) => {
      children.splice(before, 0, ...children);
      for (const child of children) {
        child.s.ft.setParent(service).dp(m);
      }
    })
  ));
  r('removeChild', s.pt.removeChild.pipe(
    rx.map(([, ...widgets]) => {
      for (const w of widgets) {
        const idx = children.findIndex(c => c === w);
        if (idx >= 0)
          children.splice(idx, 1);
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
          rx.merge(children.map(widget => widget.table.l.setDisplay.pipe(
            rx.scan(([, prev], curr) => {
              const [m, mode] = curr;
              if (!((prev === DisplayMode.hidden && mode === DisplayMode.visible) ||
                  (mode === DisplayMode.hidden && prev === DisplayMode.visible))) {
                ft.setLayoutValid(false).dp(m);
              }
              return curr;
            }),
            service.labelError('children.setDisplay -> setLayoutValid')
          )))
        );
      })
    ))
  ));
  r('addReflowAction -> needRerender, setLayoutValid', s.pt.addReflowAction.pipe(
    rx.mergeMap(([, action$]) => action$),
    rx.map(actionOrPayload => {
      const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
      ft.needRerender(true).dp(m);
      ft.setLayoutValid(false).dp(m);
    })
  ));
  r('renderSelf, onBgChangeWithParent, onSize -> canvas.addString, canvas.clearRect', s.pt.renderSelf.pipe(
    rx.mergeMap(a => rx.combineLatest([
      table.l.onSize,
      table.l.onBgChangeWithParent
    ]).pipe(
      rx.take(1),
      rx.map(b => [a, ...b] as const)
    )),
    rx.map(([[m, canvas, trans], [, width, height], [, bg]], _idx) => {
      const pos = [0, 0] as vec2;
      vec2.transformMat4(pos, pos, trans);
      if (bg) {
        const fill = ' '.repeat(width);
        for (let i = 0; i < height; i++) {
          canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
        }
      } else {
        canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
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
  r('init', new rx.Observable<never>(() => {
    ft.addReflowAction(s.pt.onSize).dp();
    ft.addReflowAction(s.pt.onChildPreferredSizeChange).dp();
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

