/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SingleActionFactory, ActionMeta, Action, InferMapParam, CreateOptsOfFac, SimplexReactorOfFac} from '@wfh/reactivizer';
import {TerminalCanvas, Rectangle, rectIntersection} from './canvas';
import {BaseWidget, baseComponentFac, DisplayMode} from './base';

export interface TerminalContainerInput {
  addChild(...children: BaseWidget[]): SingleActionFactory;
  insertChild(beforeIndex: number, children: BaseWidget[]): SingleActionFactory;
  removeChild(...children: BaseWidget[]): SingleActionFactory;
  /** set those messages which should be considered as "isLayoutDirty" once changed,
   * a "isLayoutDirty" message will be dispatched and follows "clear" and "needRerender" */
  setLayoutCheck(watchTaget: rx.Observable<InferMapParam<any>>): SingleActionFactory;
  /** @deprecated use requestReflowOn, requestReflow instead
   * If following action is dispatched, the next render message must be handled, and relow action will be dispatched along with "render" message */
  addReflowAction(actionOrPayload$: rx.Observable<Action<any> | InferMapParam<any>>): SingleActionFactory;
  /** @deprecated use requestReflowOn, requestReflow instead */
  latestReflowData(data$: rx.Observable<InferMapParam<any>>): SingleActionFactory;
  requestReflow(reason?: string): SingleActionFactory;
  requestReflowOn<P extends [...(rx.Observable<Action<any>> | rx.Observable<InferMapParam<any>>)[]]>(...actionOrPayloads: P): SingleActionFactory;

  /** Respond by didFindOverlaps, coordinate value should be relative to current component's offsetParent (i.e value of onBoundingBox ).
   * Use DFS to lookup all components including all ancestor containers */
  findOverlaps(...rect: Rectangle): SingleActionFactory;
}

export interface TermainlContainerEvents extends TerminalContainerInput {
  renderSelf(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
  // beforeRenderSelf(canvas: TerminalCanvas, transform: mat4, clips: Rectangle[], masks: Rectangle[]): SingleActionFactory;
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
  /** set to true if expecting "reflow" during next rendering phase */
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
  /** isLayoutDirty represents the actual layout change after "reflow" is handled,
   *
   * Value is changed against the observable of "setLayoutCheck", which
   * can be used to configure what should considered as "layout changed", default is 
   * merged observable of values change of children position, size and current component's
   * size
   */
  isLayoutDirty(yes: boolean): SingleActionFactory;
  /** Being relied by ElevatorContainer */
  isOpaque(yes: boolean): SingleActionFactory;
  /** In context of findOverlaps */
  didFindOverlaps(children: BaseWidget[]): SingleActionFactory;
}

const tableFor = [
  'allChildren', 'allDisplayChildren', 'setLayoutValid', 'onChildPreferredSizeChange', 'hasOfflineCanvas', 'onChildPositions',
  'isOpaque', 'latestReflowData', 'isLayoutDirty', 'setLayoutCheck'
] as const;

export const baseContainerFac = baseComponentFac.forExtend<TermainlContainerEvents, typeof tableFor>({
  tableFor,
  debugExcludeTypes: ['ofCanvas', '_saveTransform', 'renderChild'
    // 'queryAbsBounding', 'didQueryAbsBounding'
  ]
}).interceptorByType(ad => rx.merge(
  ad.at.setLayoutValid.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ad.ofOtherTypes()
)).defineReactor(init => {
  const service = init();
  const {r, s, table} = service;
  const {ft} = s;
  const children = [] as BaseWidget[];
  r('addChild -> child.setParent', s.pt.addChild.pipe(
    rx.map(([m, ...added]) => {
      // service.log('>>> add child of', service.s.logPrefix, 'action', m.i);
      children.push(...added);
      for (const child of added) {
        // service.log('>>>> loop child', child.s.logPrefix, ', setParent', service.s.logPrefix);
        child.s.ft.setParent(service).dp(m);
      }
      ft.allChildren(children).dp(m);
    })
  ));
  r('insertChild', s.pt.insertChild.pipe(
    rx.map(([m, before, added]) => {
      children.splice(before, 0, ...added);
      for (const child of added) {
        child.s.ft.setParent(service).dp(m);
      }
      ft.allChildren(children).dp(m);
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
      ft.allChildren(children).dp(m);
    })
  ));
  r('addChild, removeChild, allChildren, children.preferredSize, children.setDisplay' +
    '-> onChildPreferredSizeChange, setLayoutValid, allDisplayChildren', rx.merge(
    s.pt.addChild, s.pt.insertChild, s.pt.removeChild
  ).pipe(
    rx.switchMap(([m]) => table.l.allChildren.pipe(
      rx.switchMap(([, children]) => {
        return rx.merge(
          // -> allDisplayChildren
          rx.combineLatest(children.map(c => c.table.l.setDisplay.pipe(
            rx.map(([, d]) => d === DisplayMode.none ? null : c)
          ))).pipe(
            rx.map(chdn => chdn.filter((c): c is NonNullable<typeof c> => c != null)),
            rx.switchMap(chdn => {
              ft.allDisplayChildren(chdn).dp();
              return rx.combineLatest(chdn.map(c => {
                return c.table.l.preferredSize.pipe(
                  rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
                );
              }));
            }),
            rx.map(sizes => ft.onChildPreferredSizeChange(sizes.map(([, w, h]) => [w, h] as const)).dp(m))
          )
        );
      })
    ))
  ));
  r('addReflowAction -> needRerender, setLayoutValid, bgCleared', s.pt.addReflowAction.pipe(
    rx.mergeMap(([, action$]) => action$),
    rx.map(actionOrPayload => {
      const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
      ft.setLayoutValid(false).dp(m);
      ft.bgCleared(false).dp(m);
    })
  ));
  r('requestReflowOn', s.pt.requestReflowOn.pipe(
    rx.switchMap(([, ...a$]) => rx.merge(...a$)),
    rx.map(actionOrPayload => {
      const m = Array.isArray(actionOrPayload) ? (actionOrPayload as unknown as [ActionMeta, ...unknown[]])[0] : actionOrPayload as Action<unknown>;
      ft.requestReflow().dp(m);
    })
  ));
  r('requestReflow', s.pt.requestReflow.pipe(
    rx.map(([m]) => {
      ft.setLayoutValid(false).dp(m.r);
      ft.bgCleared(false).dp(m.r);
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
  // If not "setLayoutValid", then "reflow", and if "isLayoutDirty", then "clear"
  r('beforeRender,setLayoutValid -> isLayoutDirty,reflow,clear,needRerender', s.pt.beforeRender.pipe(
    rx.withLatestFrom(table.l.setLayoutValid),
    rx.mergeMap(([[m, canvas, trans, clips, masks], [, valid]]) => {
      if (!valid) {
        s.ft.isLayoutDirty(false).dp(m);
        s.ft.reflow(clips, masks).dp(m);
        s.ft.setLayoutValid(true).dp(m);
        // get changed "isLayoutDirty"
        return table.l.isLayoutDirty.pipe(
          rx.map(([, dirty]) => dirty),
          rx.take(1),
          rx.filter(d => d),
          rx.map(() => [m, canvas, trans] as const)
        );
      }
      return rx.EMPTY;
    }),
    rx.map(([m, canvas, trans], _idx) => {
      s.ft.clear(canvas, trans).dp(m);
      s.ft.needRerender(true).dp(m);
    })
  ));
  r('onRender -> beforeRenderSelf,renderSelf, renderChild', s.pt.onRender.pipe(
    // rx.observeOn(rx.queueScheduler),
    rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(
      rx.take(1),
      rx.map(([, children]) => {
        if (renderSelf) {
          s.ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
        }
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
        }).filter((c): c is NonNullable<typeof c> => c != null);
        const masksOfCh = masks.map(mk => {
          const intersection = rectIntersection([x, y, width, height], mk);
          if (intersection) {
            intersection[0] -= x;
            intersection[1] -= y;
          }
          return intersection;
        }).filter((c): c is NonNullable<typeof c> => c != null);
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
    rx.switchMap(([, isValid]) => isValid ? table.l.latestReflowData.pipe(
      rx.switchMap(([m2, data$]) => data$.pipe(
        rx.skip(1),
        rx.take(1),
        rx.map(() => {
          s.ft.setLayoutValid(false).dp(m2);
          s.ft.bgCleared(false).dp(m2);
        })
      ))
    ) : rx.EMPTY)
  ));
  r('setLayoutValid(false), ofCanvas -> canvas.requestRender', s.pt.setLayoutValid.pipe(
    rx.filter(([, valid]) => !valid),
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
  r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(
    rx.mergeMap(([m, ...rect]) => {
      return table.l.onBoundingBox.pipe(
        rx.take(1),
        rx.mergeMap(([, [x, y, w, h]]) => {
          const interction = rectIntersection([x, y, w, h], rect);
          if (interction == null) {
            s.ft.didFindOverlaps([]).dp(m);
            return rx.EMPTY;
          }
          return table.l.allDisplayChildren.pipe(
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
        })
      );
    })
  ));
  // When "setLayoutCheck" is changed, set "isLayoutDirty" to true
  r('isLayoutDirty(false),setLayoutCheck -> isLayoutDirty(true)', s.pt.isLayoutDirty.pipe(
    rx.switchMap(([, dirty]) => dirty ?
      rx.EMPTY :
      table.l.setLayoutCheck.pipe(
        rx.switchMap(([, target]) => target)
      )),
    rx.map(([m]) => s.ft.isLayoutDirty(true).dp(m))
  ));

  r('init', new rx.Observable<never>(() => {
    ft.requestReflowOn(
      s.pt.onSize.pipe(
        rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2)
      ),
      s.pt.onChildPreferredSizeChange
    ).dp();
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
    ft.setLayoutCheck(rx.merge(
      s.pt.onSize,
      table.l.allDisplayChildren.pipe(
        rx.switchMap(([, chd]) => rx.merge(chd).pipe(
          rx.mergeMap(c => rx.merge(
            c.s.pt.onSize, c.s.pt.onPosition
          ))
        ))
      ),
      s.pt.allDisplayChildren
    )).dp();
    ft.isOpaque(false).dp();
  }));
});
export type TerminalContainerOpts = CreateOptsOfFac<typeof baseContainerFac>;
export type TerminalContainer = SimplexReactorOfFac<typeof baseContainerFac>;

