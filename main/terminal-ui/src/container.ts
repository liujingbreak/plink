/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4, vec2} from 'gl-matrix';
import {SingleActionFactory, SimplexReactor, SimplexReactorMergeType, ActionMeta, Action, InferMapParam, OptionsOfSmplxRctr, SimplexReactorOptions} from '@wfh/reactivizer';
import {TerminalCanvas, Rectangle, rectIntersection} from './canvas';
import {BaseWidget, createBase, BaseWidgetRenderData, BaseWidgetEvents, tableForBase, DisplayMode} from './base';

export interface TerminalContainerInput {
  addChild(...children: BaseWidget[]): SingleActionFactory;
  insertChild(beforeIndex: number, children: BaseWidget[]): SingleActionFactory;
  removeChild(...children: BaseWidget[]): SingleActionFactory;
  /** @deprecated use latestReflowData instead.
   * If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
  addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  latestReflowData(data$: rx.Observable<unknown>): SingleActionFactory;

  /** Respond by didFindOverlaps, coordinate value should be relative to current component's offsetParent */
  findOverlaps(...rect: Rectangle): SingleActionFactory;
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
  /** Under context of "relow" action.
   * The coordinate value is relative to container component.
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
  /** In context of findOverlaps */
  didFindOverlaps(children: BaseWidget[]): SingleActionFactory;
}

const tableFor = [
  'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions',
  'isOpaque', 'latestReflowData'
] as const;
export type TerminalContainer = SimplexReactorMergeType<BaseWidget, SimplexReactor<TermainlContainerEvents, typeof tableFor>>;
export type TerminalContainerOpts = Partial<OptionsOfSmplxRctr<TerminalContainer>>;

export function createContainerBase<S = BaseWidgetRenderData>(opts?: TerminalContainerOpts) {
  const base = createBase<S>(opts as SimplexReactorOptions<BaseWidgetEvents, typeof tableForBase>);
  const service = base.config<TermainlContainerEvents, typeof tableFor>({
    tableFor,
    debugExcludeTypes: opts?.debugExcludeTypes ?? [
      'ofCanvas', 'bgCleared', '_saveTransform', 'needRerender', 'renderBackgroundFor'
    ]
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
    rx.map(([[m, canvas, trans], [m2, width, height], [m3, bg], [m4, cleared]], _idx) => {
      const pos = [0, 0] as vec2;
      vec2.transformMat4(pos, pos, trans);
      if (bg) {
        const fill = ' '.repeat(width);
        for (let i = 0; i < height; i++) {
          canvas.s.ft.addString(pos[0], pos[1] + i, fill, [bg]).dp(m);
        }
      } else if (!cleared) {
        service.log('>>> bgCleared');
        canvas.s.ft.clearRect(pos[0], pos[1], width, height).dp(m);
        s.ft.bgCleared(true).dp(m, m2, m3, m4);
      }
    })
  ));
  r('onChildPositions... -> children.onPosition', rx.combineLatest([
    table.l.onChildPositions,
    table.l.allDisplayChildren
  ]).pipe(
    rx.map(([[m, posMap], [m2, chrd]]) => {
      for (const c of chrd) {
        const pos = posMap.get(c);
        if (pos)
          c.s.ft.onPosition(...pos).dp(m, m2);
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
  r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(
    rx.mergeMap(([m, ...rect]) => {
      return rx.combineLatest([
        table.l.isOffsetParent,
        table.l.onSize
      ]).pipe(
        rx.take(1),
        rx.switchMap(([[, asOp], [, w, h]]) => {
          if (asOp) {
            return table.l.onPosition.pipe(
              rx.filter(([, x]) => x != null),
              rx.take(1),
              rx.map(([, x, y]) => rectIntersection([x!, y!, w, h],
                [rect[0] - x!, rect[1] - y!, rect[2], rect[3]] as Rectangle))
            );
          } else {
            return rx.of(rectIntersection([0, 0, w, h], rect));
          }
        }),
        rx.mergeMap(rect => {
          if (rect != null)
            return  table.l.allDisplayChildren.pipe(
              rx.take(1),
              rx.mergeMap(([, chd]) => chd),
              rx.mergeMap(chr => chr.table.l.onBoundingBox.pipe(
                rx.take(1),
                rx.filter(([, bRect]) => {
                  return rectIntersection(rect, bRect) != null;
                }),
                rx.map(() => chr)
              )),

              rx.mergeMap(chr => chr.table.l.isContainer.pipe(
                rx.take(1),
                rx.mergeMap(isContainer => {
                  if (isContainer) {
                    return (chr as TerminalContainer).s.ft.findOverlaps(...rect)
                      .re(m).od((chr as TerminalContainer).s.pt.didFindOverlaps).pipe(
                        rx.take(1),
                        rx.map(([, chdOfChd]) => chdOfChd),
                        rx.endWith([chr])
                      );
                  }
                  return rx.of([chr]);
                })
              )),
              rx.reduce((acc, it) => {
                acc.push(...it);
                return acc;
              }, [] as BaseWidget[]),
              rx.map(found => s.ft.didFindOverlaps(found).dp(m))
            );
          else {
            s.ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
          }
        })
      );
    })
  ));

  const reflowData = rx.combineLatest([
    table.l.onSize.pipe(
      rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
    ),
    table.l.onChildPreferredSizeChange
  ]);

  r('init', new rx.Observable<never>(() => {
    ft.latestReflowData(reflowData).dp();
    ft.isContainer(true).dp();
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

