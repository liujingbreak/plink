/**
 * User stories:
 * WHEN user press TAB or left, right,...key,
 *  and WHEN there is no existing "onFocus" component,
 *    THEN findFocusable on the most left top (corresponding to the pressed key)
 *    focusable component in viewport.
 *  otherwise findFocusable on "next" right focuable component.
 *
 * WHEN a focusable component is focused,
 *  onFocus event should be dispatched
 */
import * as rx from 'rxjs';
import {SimplexReactor, SingleActionFactory, actionRelatedToAction, ActionMeta,
  BaseReactorFactory, CoreOptions, InferMapParam, SimplexReactorOfFac} from '@wfh/reactivizer';
import {RedBlackTree} from '@wfh/algorithms';
import {BaseWidget} from './base.js';
import {TerminalContainer} from './container.js';
import {Rectangle, Canvas} from './canvas.js';
import {CanvasFilterOutput, CanvasFilterInput} from './canvas-filter.js';
import {KeyEventServcie, KeyEventEnum} from './keyEvent.js';
import {canvasCacheFac, CanvasCacheOptions} from './canvas-cache.js';
import {createRtreeInstance, RTree, BBox} from './rbush.js';

export const ROOT_FOCUS_SERVICE_CONTEXT = '__rootFocus';
export enum SearchDirection {
  down, up, right, left, tabNext
}
export interface FocusMessages {
  forRootComp(rootComp: BaseWidget): SingleActionFactory;
  onFocus(compName: string, comp: BaseWidget | null, srcService: FocusService | null): SingleActionFactory;
  /** Should only be dispatched on top level FocusService */
  switchFocus(srcFocusSvc?: FocusService | null, compName?: string | null, comp?: BaseWidget | null): SingleActionFactory;
  /** Pointing to the only top level findFocusable service, which stores global states */
  removeFocusable(comp: BaseWidget): SingleActionFactory;
  onRectChange(rect: Rectangle, c: BaseWidget): SingleActionFactory;
  onRectRemoved(rect: Rectangle, c: BaseWidget): SingleActionFactory;
  findFocusable(direction: SearchDirection, handleKeyEventsAction: ActionMeta['i']): SingleActionFactory;
  locateFocusable(locateTrace: (readonly [FocusService, BaseWidget])[], index: number): SingleActionFactory;
  focusOnComponent(target: BaseWidget): SingleActionFactory;
  /** In context of "findFocusable" and "locateFocusable", when next focusable is found */
  didFound(resultRect?: Rectangle, component?: BaseWidget, tabIndex?: number): SingleActionFactory;
  /** In context of "findFocusable", "locateFocusable" and handleKeyEvents, dispatched when
   * there is no next focusable on current direction */
  didNotFound(dir: SearchDirection): SingleActionFactory;
  handleKeyEvents(keyService: KeyEventServcie, currDir?: SearchDirection, currKey?: KeyEventEnum | null): SingleActionFactory;
  stopHandleKeyEvents(): SingleActionFactory;
  pauseHandleEvents(): SingleActionFactory;
  resumeHandleEvents(): SingleActionFactory;
  /** default is false, */
  isPaused(paused: boolean): SingleActionFactory;
  // searchTree(xTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>,
  //   yTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>): SingleActionFactory;
  renderFor(comp: BaseWidget): SingleActionFactory;
  clearFor(comp: BaseWidget): SingleActionFactory;
  _emitDidFoundUpToRoot(comp: BaseWidget, rootSvc: FocusService): SingleActionFactory;
  _didEmitDidFoundUpToRoot(): SingleActionFactory;
}
const tableFor = [
  'didFound', 'handleKeyEvents', 'isPaused', 'forRootComp'
] as const;
export type FocusService = SimplexReactor<FocusMessages & CanvasFilterOutput & CanvasFilterInput, typeof tableFor>;
export type FocusServiceOpts = CoreOptions<FocusMessages & CanvasFilterOutput & CanvasFilterInput> & {
  cache?: CanvasCacheOptions;
};
export const focusServiceFac = new BaseReactorFactory<
  FocusMessages & CanvasFilterOutput & CanvasFilterInput,
  typeof tableFor,
  FocusServiceOpts
>({
  name: 'focusSvc',
  tableFor
}).interceptorByType(ac => rx.merge(
  ac.at.onFocus.pipe(
    rx.distinctUntilChanged(({p: [, a]}, {p: [, b]}) => a === b)
  ),
  ac.at.isPaused.pipe(
    rx.distinctUntilChanged(({p: [a]}, {p: [b]}) => a === b)
  ),
  ac.ofOtherTypes()
)).defineReactor(({init, setting}, canvas: Canvas) => {
  const service = init();
  const {ft, pt, r, latest} = service;
  const rectByComponent = new Map<BaseWidget, [bbox: Rectangle, tabIndex: number]>();

  const tabIndexTree = new RedBlackTree<number, BaseWidget[]>();
  const offscreen = canvasCacheFac.setting({
    name: service.s.logPrefix + '.cache',
    enableLog: setting?.enableLog,
    log: setting?.log,
    ...setting?.cache
  }).create();
  const focusableTree$ = createRtreeInstance<BaseWidget>();
  r('forRootComp -> root.provideFocusService...', pt.forRootComp.pipe(
    rx.switchMap(([m, root]) => {
      root.ft.provideFocusService(service).dp(m);
      // service.log('-- forRootComp !!!', root.getLogName(), 'setParent:', root.table.data.setParent);
      return rx.merge(
        root.latest.setParent.pipe(
          // rx.tap(([, p]) => {
          //   service.log('-- forRootComp !!!', root.getLogName(), p?.getLogName());
          // }),
          rx.switchMap(([, p]) => (p?.latest.focusService ?? rx.EMPTY)),
          rx.switchMap(([, pFocusSvc]) => pFocusSvc.latest.forRootComp.pipe(
            rx.map(([, pRoot]) => [pFocusSvc, pRoot] as const)
          )),
          rx.switchMap(([pFocusSvc, pRoot]) => {
            return root.ft.queryAbsBounding(pRoot as TerminalContainer).re(m).od(
              root.pt.didQueryAbsBounding
            ).pipe(
              rx.map(([, r]) => {
                if (r)
                  pFocusSvc.ft.onRectChange(r, root).dp(m);
              })
            );
          })
        ),
        root.destory$.pipe(
          rx.map(() => {
            offscreen.dispose();
            service.dispose();
          })
        )
      );
    })
  ));
  r('removeFocusable', pt.removeFocusable.pipe(
    rx.mergeMap(([m, c]) => focusableTree$.pipe(
      rx.take(1),
      rx.map(rtree => {
        const data = rectByComponent.get(c);
        if (data) {
          const [rect, tabIdx] = data;
          rtree.removeByRect(rect);
          // service.log('>>> remove focusable for', c.s.logPrefix, rect);
          rectByComponent.delete(c);
          ft.onRectRemoved(rect, c).dp(m);
          const tabIdxNode = tabIndexTree.search(tabIdx);
          if (tabIdxNode) {
            const i = tabIdxNode.value.indexOf(c);
            if (i >= 0 && tabIdxNode.value.length > 1)
              tabIdxNode.value.splice(i, 1);
            else
              tabIndexTree.delete(tabIdx);
          }
          // service.log('>>> count xTree', xTree.size(), 'yTree', yTree.size());
        }
      })
    ))
  ));
  // maintain tree
  r('onRectChange -> "xTree","yTree","rightXTree","bottomYTree"', pt.onRectChange.pipe(
    rx.mergeMap(a => focusableTree$.pipe(
      rx.take(1),
      rx.map(b => [a, b] as const)
    )),
    rx.withLatestFrom(canvas.latest.setBounding),
    rx.map(([[[, rect, c], rtree], [, , , , canHeight]]) => {
      const ex = rectByComponent.get(c);
      const tabIndex = rect[1] * canHeight + rect[0];
      // service.log('--- add tabIndex for', c.s.logPrefix, tabIndex);
      const tabNode = tabIndexTree.insert(tabIndex);
      // service.log('--- after add tabIndex for', c.s.logPrefix, tabNode);
      if (tabNode.value)
        service.log('--- add duplicate tabIndex', tabIndex, tabNode.value.map(it => it.s.logPrefix));
      tabNode.value ??= [];
      tabNode.value.push(c);
      rectByComponent.set(c, [rect, tabIndex]);
      if (ex) {
        rtree.changeRect(ex[0], rect, c);
      } else {
        rtree.insert([rect, c]);
      }
      // service.log('-- rbush root:', rtree.getRoot());
    })
  ));

  r('focusOnComponent -> didFound,rootFocus.eventHandlingSvc,rootFocus.switchFocus', pt.focusOnComponent.pipe(
    rx.switchMap(([m, comp]) => {
      return comp.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT).re(m).od(
        comp.pt.onContextChange
      ).pipe(
        rx.take(1),
        rx.mergeMap(([, , rootFocus]) => {
          if (!rectByComponent.has(comp)) {
            // wait for "onRectChange" being handled
            return pt.onRectChange.pipe(
              rx.filter(([, , c]) => c === comp),
              rx.take(1),
              rx.map(() => {
                return rootFocus;
              })
            );
          }
          return rx.of(rootFocus);
        }),
        rx.mergeMap(rootFocus => {
          return ft._emitDidFoundUpToRoot(
            comp, rootFocus as RootFocusService
          ).re(m).od(pt._didEmitDidFoundUpToRoot).pipe(
            rx.take(1),
            rx.map(() => {
              (rootFocus as RootFocusService).ft.eventHandlingSvc(service).dp(m);
              (rootFocus as RootFocusService).ft.switchFocus(
                service, comp.getLogName(), comp).dp(m);
            })
          );
        })
      );
    })
  ));

  r('_emitDidFoundUpToRoot -> didFound,_didEmitDidFoundUpToRoot', pt._emitDidFoundUpToRoot.pipe(
    rx.mergeMap(([m, comp, rootSvc]) => {
      const [r, tabIdx] = rectByComponent.get(comp)!;
      ft.didFound(r, comp, tabIdx).dp(m);
      if (service === rootSvc) {
        ft._didEmitDidFoundUpToRoot().dp(m);
        return rx.EMPTY;
      }
      return latest.forRootComp.pipe(
        rx.switchMap(([, rootComp]) => rootComp.latest.focusService.pipe(
          rx.switchMap(([, pf]) => {
            return pf.ft._emitDidFoundUpToRoot(rootComp, rootSvc).re(m).od(
              pf.pt._didEmitDidFoundUpToRoot
            ).pipe(
              rx.take(1),
              rx.map(() => {ft._didEmitDidFoundUpToRoot().dp(m);})
            );
          }),
          rx.take(1)
        ))
      );
    })
  ));
  // dispatch onFocus event according to didFound result,
  // when the target component is an offsetParent,
  // designate it to handle key events
  const forked = service.s.forkController();
  r('findFocusable,didFound,didNotFound,handleKeyEvents... -> onFocus,rootFocus.switchFocus',
    pt.findFocusable.pipe(
      rx.switchMap(([m, dir]) => {
        return forked.pt.didFound.pipe(
          actionRelatedToAction(m),
          rx.takeUntil(forked.pt.didNotFound.pipe(
            actionRelatedToAction(m),
            rx.mergeMap(([m2]) => latest.forRootComp.pipe(
              rx.mergeMap(([, root]) => rx.combineLatest([
                root.latest.focusService,
                root.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT).re(m)
                  .od(root.pt.onContextChange).pipe(
                    rx.take(1)
                  )
              ]).pipe(
                rx.map(([[, pf], [, , rootFocus]]) => {
                  (rootFocus as RootFocusService).ft.eventHandlingSvc(pf, dir).dp(m2, m);
                })
              ))
            ))
          )),
          rx.take(1),
          // query whether current component is "focusable"
          rx.mergeMap(([, rect, c]) => {
            if (rect && c) {
              return c.latest.setFocusable.pipe(
                rx.take(1),
                rx.map(([, r]) => [c, r] as const)
              );
            }
            return rx.EMPTY;
          }),
          rx.switchMap(([c, r]) => {
            return c.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT).re(m)
              .od(c.pt.onContextChange).pipe(
                rx.take(1),
                rx.map(([, , rootFocus]) => [c, r, rootFocus as RootFocusService] as const)
              );
          }),
          rx.switchMap(([c, r, rootFocus]) => {
            if (r) {
              ft.onFocus(c.s.logPrefix, c, service).dp(m);
              rootFocus.ft.switchFocus(service, c.getLogName(), c).dp(m);
              return rx.EMPTY;
            } else {
              // If current component is not focusable,
              // delegate handling key events job to the sub focusService
              return c.ft.queryContext('focusSvc').re(m).od(
                c.pt.onContextChange
              ).pipe(
                rx.filter(([, , v]) => v != null),
                rx.take(1),
                rx.map(([, , v]) => {
                  const focusService = v as FocusService;
                  rootFocus.ft.eventHandlingSvc(focusService, dir).dp(m);
                })
              );
            }
          })
        );
      })
    ));
  r('findFocusable,didFound -> didFound, didNotFound', pt.findFocusable.pipe(
    rx.withLatestFrom(rx.merge(
      latest.didFound,
      pt.didNotFound.pipe(
        rx.map(([m]) => [m, null, null, null] as const)
      )
    )),
    rx.mergeMap(a => focusableTree$.pipe(
      rx.take(1),
      rx.map(b => [...a, b] as const)
    )),
    rx.map(([[m, dir, handleEventAct], [, lastRect, lastComp, tabIdx], rtree]) => {
      service.log('-- findFocusable, lastComp', lastComp?.getLogName());
      if (dir === SearchDirection.tabNext) {
        if (lastRect == null || lastComp == null || !rectByComponent.has(lastComp)) {
          const node = tabIndexTree.minimum();
          if (node == null) {
            ft.didNotFound(dir).dp(m, handleEventAct);
            return;
          }
          lastComp = node.value[0];
          [lastRect, tabIdx] = rectByComponent.get(lastComp) ?? [undefined, undefined] as const;
          if (tabIdx == null) {
            service.log('All tabIndexTree nodes', [...tabIndexTree.allChildNodeInorder()].map(([n]) => n.key));
            throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
          }
          ft.didFound(lastRect, lastComp, tabIdx).dp(m, handleEventAct);
          return;
        }
        const [, t] = rectByComponent.get(lastComp)!;
        service.log('-- tabNext', t);
        // check if there are more component of same rectangle
        const node = tabIndexTree.search(t)!;
        const idx = node.value.findIndex(it => it === lastComp);
        if (idx >= 0 && idx < node.value.length - 1) {
          const c = node.value[idx + 1];
          const [r, t] = rectByComponent.get(c) ?? [undefined, undefined] as const;
          ft.didFound(r, c, t).dp(m);
          return;
        }
        // move to next node horizontally
        const nextNode = tabIndexTree.successorNode(node);
        if (nextNode == null) {
          ft.didNotFound(dir).dp(m, handleEventAct);
          return;
        }
        const nextComp = nextNode.value[0];
        const nextCompPos = rectByComponent.get(nextComp) ?? [undefined, undefined];
        ft.didFound(nextCompPos[0], nextComp, nextCompPos[1]).dp(m);
        return;
      } else {
        const rtreeRoot = rtree.getRoot();
        if (lastRect == null) {
          const chosen = findNextComp(rtree, lastRect, dir, rtreeRoot);
          if (chosen) {
            const [r, t] = rectByComponent.get(chosen) ?? [undefined, undefined] as const;
            ft.didFound(r, chosen, t).dp(m);
            return;
          }
        } else {
          const bigger = [...lastRect] as Rectangle;
          let min = rtreeRoot.minX;
          let max = rtreeRoot.maxX;
          let upBound = lastRect[0] + lastRect[2] - 1;
          let btmBound = lastRect[0];
          let grow = 4;
          let chosen: BaseWidget | undefined;
          switch (dir) {
            case SearchDirection.up:
            case SearchDirection.down:
              for (;;) {
                bigger[0] = btmBound;
                bigger[2] = upBound - btmBound + 1;
                service.log('-- loop findNextComp', bigger);
                chosen = findNextComp(rtree, bigger, dir, rtreeRoot);
                if (chosen) {
                  break;
                }
                if (upBound === max && btmBound === min)
                  break;
                grow += grow;
                upBound += grow;
                btmBound -= grow;
                if (upBound > max)
                  upBound = max;
                if (btmBound < min)
                  btmBound = min;
              }
              break;
            default:
              grow = 2;
              min = rtreeRoot.minY;
              max = rtreeRoot.maxY;
              upBound = lastRect[1] + lastRect[3] - 1;
              btmBound = lastRect[1];
              service.log('-- loop findNextComp', bigger);
              for (;;) {
                bigger[1] = btmBound;
                bigger[3] = upBound - btmBound + 1;
                chosen = findNextComp(rtree, bigger, dir, rtreeRoot);
                if (chosen) {
                  break;
                }
                if (upBound === max && btmBound === min)
                  break;
                grow += grow;
                upBound += grow;
                btmBound -= grow;
                if (upBound > max)
                  upBound = max;
                if (btmBound < min)
                  btmBound = min;
              }
          }
          if (chosen) {
            const [r, t] = rectByComponent.get(chosen) ?? [undefined, undefined] as const;
            ft.didFound(r, chosen, t).dp(m);
            return;
          }
        }
      }
      ft.didNotFound(dir).dp(m, handleEventAct);
    })
  ));
  r('resumeHandleEvents', pt.resumeHandleEvents.pipe(
    rx.map(([m]) => ft.isPaused(false).dp(m))
  ));
  r('pauseHandleEvents', pt.pauseHandleEvents.pipe(
    rx.map(([m]) => ft.isPaused(true).dp(m))
  ));
  r('handleKeyEvents... -> findFocusable', pt.handleKeyEvents.pipe(
    rx.switchMap(([m, keySvc, dir, currKey]) => rx.concat(
      dir != null ? rx.of([m, dir, currKey, 1 as number] as const) : rx.EMPTY,
      keySvc.pt.onFocusChange.pipe(
        rx.map(([m1, evt, count]) => [m1, null, evt, count] as const)
      )
    ).pipe(
      rx.windowToggle(
        latest.isPaused.pipe(
          rx.map(([, p]) => p),
          rx.filter(p => !p)
        ),
        () => latest.isPaused.pipe(
          rx.map(([, p]) => p),
          rx.filter(p => p)
        )
      ),
      rx.switchMap(events => events),
      rx.mergeMap(([m1, dir, evt, count]) => {
        if (dir != null) {
          return rx.range(0, count).pipe(
            rx.map(() => ft.findFocusable(dir, m.i).dp(m, m1))
          );
        }
        // service.log('--keyevent', m1.i, KeyEventEnum[evt], count);
        switch (evt) {
          case KeyEventEnum.focusUp:
            return rx.range(0, count).pipe(
              rx.map(() => ft.findFocusable(SearchDirection.up, m.i).dp(m, m1))
            );
          case KeyEventEnum.focusDown:
            return rx.range(0, count).pipe(
              rx.map(() => ft.findFocusable(SearchDirection.down, m.i).dp(m, m1))
            );
          case KeyEventEnum.focusLeft:
            return rx.range(0, count).pipe(
              rx.map(() => ft.findFocusable(SearchDirection.left, m.i).dp(m, m1))
            );
          case KeyEventEnum.focusRight:
            return rx.range(0, count).pipe(
              rx.map(() => ft.findFocusable(SearchDirection.right, m.i).dp(m, m1))
            );
          case KeyEventEnum.focusNext:
            return rx.range(0, count).pipe(
              rx.map(() => ft.findFocusable(SearchDirection.tabNext, m.i).dp(m, m1))
            );
        }
      }),
      rx.takeUntil(
        pt.stopHandleKeyEvents
      )
    ))
  ));
  r('renderFor', pt.renderFor.pipe(
    rx.withLatestFrom(latest.forRootComp),
    rx.mergeMap(([[m, c], [, root]]) =>
      c.ft.queryAbsBounding(root as TerminalContainer)
        .re(m).od(c.pt.didQueryAbsBounding).pipe(
          rx.switchMap(([, r]) => {
            if (r == null)
              return rx.EMPTY;
            const [x, y, w, h] = r;
            // service.log('-- onFocus bounding change', x, y, w, h);
            if (h <= 1) {
              return setupCanvasFilterForHighlight(m, r).pipe(
                rx.finalize(() => {
                  restoreCanvasContent(m);
                })
              );
            } else {
              return canvas.latest.setBounding.pipe(
                rx.take(1),
                rx.mergeMap(([, , , bw, bh]) => {
                  const top = y < 1 ? 0 : y - 1;
                  const left = x < 1 ? 0 : x - 1;
                  const right = x + w >= bw ? x + w : x + w + 1;
                  const bottom = y + h >= bh ? y + h : y + h + 1;
                  return [
                    [left, top, right - left, 1] as Rectangle,
                    [left, bottom - 1, right - left, 1] as Rectangle,
                    [left, top + 1, 1, bottom - top - 2] as Rectangle,
                    [right - 1, top + 1, 1, bottom - top - 2] as Rectangle
                  ];
                }),
                rx.mergeMap(border => setupCanvasFilterForHighlight(m, border)),
                rx.finalize(() => {
                  restoreCanvasContent(m);
                })
              );
            }
          }),
          rx.takeUntil(rx.merge(
            pt.clearFor.pipe(
              rx.filter(([, c0]) => c === c0)
            ),
            c.destory$
          ))
        )
    )
  ));
  function restoreCanvasContent(actMeta: ActionMeta) {
    const [onRender, onClear, done$] = offscreen.ft.fetchItems().od(
      offscreen.pt.onRenderItem,
      offscreen.pt.onClearItem,
      offscreen.pt.didFetchItems
    );
    rx.merge(
      onRender.pipe(
        rx.map(([m, x, y, text, style]) => canvas.ft.addDisplayUnits(x, y, text, style).dp(m, actMeta))
      ),
      onClear.pipe(
        rx.map(([m, x, y, w]) => canvas.ft.clearRect(x, y, w, 1).dp(m, actMeta))
      )
    ).pipe(
      rx.takeUntil(done$),
      rx.finalize(() => {
        offscreen.ft.cleanup().dp(actMeta);
      })
    ).subscribe();
  }
  function setupCanvasFilterForHighlight(m: ActionMeta, r: Rectangle) {
    // service.log('--setupCanvasFilterForHighlight', r);
    const addRenderFilter = canvas.ft.addRenderFilter(r, service).re(m);
    const [onRenderForFilter, onClearForFilter] =
        addRenderFilter.od(pt.onRenderForFilter, pt.onClearForFilter);
    return rx.merge(
      onRenderForFilter.pipe(
        rx.map(([m1, x, y, units, style]) => {
          offscreen.ft.add(x, y, units, style).dp(m, m1, addRenderFilter.action);
          service.ft.renderBypassFilter(x, y, units, style.concat(['inverse'])).dp(m, m1, addRenderFilter.action);
        })
      ),
      onClearForFilter.pipe(
        rx.map(([m1, x, y, w]) => {
          offscreen.ft.clear(x, y, w, 1).dp(m, m1, addRenderFilter.action);
          service.ft.allowClear(false).dp(m, m1, addRenderFilter.action);
          service.ft.renderBypassFilter(x, y, new Array(w).fill(' '.codePointAt(0)), ['inverse']).dp(m, m1, addRenderFilter.action);
        })
      )
    ).pipe(
      // debug
      // rx.debounceTime(700),
      // rx.mergeMap(() => {
      //   return canvas.ft.takeSnapshot({noColor: true})
      //     .od(canvas.pt.didTakeSnapshot)
      //     .pipe(
      //       rx.take(1),
      //       rx.map(([, lines]) => {
      //         service.log('--canvas\n', [...lines].join(''));
      //       })
      //     );
      // }),
      // rx.mergeMap(() => offscreen.ft.fetchLines(true, 'X').od(
      //   offscreen.pt.didFetchLines
      // ).pipe(
      //   rx.take(1),
      //   rx.map(([, lines]) => service.log('--offscreen\n', [...lines].join('')))
      // )),
      rx.finalize(() => {
        canvas.ft.removeRenderFilter(addRenderFilter.action).dp(m);
      })
    );
  }

  function findNextComp(
    rtree: RTree<BaseWidget>,
    currRect: Rectangle | undefined | null,
    dir: SearchDirection, bboxOfAll: BBox
  ) {
    if (currRect == null) {
      switch (dir) {
        case SearchDirection.up:
          currRect = [bboxOfAll.minX, bboxOfAll.maxY + 1, bboxOfAll.maxX - bboxOfAll.minX + 1, 0];
          break;
        case SearchDirection.down:
          currRect = [bboxOfAll.minX, bboxOfAll.minY - 1, bboxOfAll.maxX - bboxOfAll.minX + 1, 0];
          break;
        case SearchDirection.left:
          currRect = [bboxOfAll.maxX + 1, bboxOfAll.minY, 0, bboxOfAll.maxY - bboxOfAll.minY + 1];
          break;
        default:
          currRect = [bboxOfAll.minX - 1, bboxOfAll.minY, 0, bboxOfAll.maxY - bboxOfAll.minY + 1];
      }
    }
    const [x, y, w, h] = currRect;
    service.log('-- findNextComp: currRect=', currRect);
    const expandLimit = dir === SearchDirection.up ?
      y - bboxOfAll.minY :
      dir === SearchDirection.down ?
        bboxOfAll.maxY - y - h + 1 :
        dir === SearchDirection.left ?
          x - bboxOfAll.minX :
          bboxOfAll.maxX + 1 - x - w;
    let expandUnits = 3 > expandLimit ? expandLimit : 3;
    let lowSearchBnd = 0;
    let highSearchBnd = lowSearchBnd + expandUnits;
    const searchRect = [...currRect] as Rectangle;
    let closestComp: BaseWidget | undefined;
    switch (dir) {
      case SearchDirection.up:
        while (lowSearchBnd < expandLimit) {
          searchRect[1] = y - highSearchBnd;
          searchRect[3] = highSearchBnd - lowSearchBnd;
          const found = rtree.searchOverlaps(searchRect);
          if (found.length > 0) {
            let bottom = Number.MIN_VALUE;
            let right = Number.MIN_SAFE_INTEGER;
            for (const [r, c] of found) {
              const b = r[1] + r[3];
              if (b > bottom || (b === bottom && r[0] + r[2] > right)) {
                closestComp = c;
                bottom = b;
                right = r[0] + r[2];
              }
            }
            break;
          }
          expandUnits += expandUnits;
          lowSearchBnd = highSearchBnd;
          highSearchBnd += expandUnits;
          if (highSearchBnd > expandLimit)
            highSearchBnd = expandLimit;
        }
        return closestComp;
      case SearchDirection.down:
        while (lowSearchBnd < expandLimit) {
          searchRect[1] = y + h + lowSearchBnd;
          searchRect[3] = highSearchBnd - lowSearchBnd;
          const found = rtree.searchOverlaps(searchRect);
          // service.log('-- search rtree', searchRect, found.map(([r]) => '[' + r.join() + ']'));
          if (found.length > 0) {
            let top = Number.MAX_VALUE;
            let left = Number.MAX_SAFE_INTEGER;
            for (const [r, c] of found) {
              const b = r[1];
              if (b < top || (b === top && r[0] < left)) {
                closestComp = c;
                top = b;
                left = r[0];
              }
            }
            break;
          }

          expandUnits += expandUnits;
          lowSearchBnd = highSearchBnd;
          highSearchBnd += expandUnits;
          if (highSearchBnd > expandLimit)
            highSearchBnd = expandLimit;
        }
        break;
      case SearchDirection.left:
        while (lowSearchBnd < expandLimit) {
          searchRect[0] = x - highSearchBnd;
          searchRect[2] = highSearchBnd - lowSearchBnd;
          const found = rtree.searchOverlaps(searchRect);
          if (found.length > 0) {
            let right = Number.MIN_VALUE;
            let bottom = Number.MIN_VALUE;
            for (const [r, c] of found) {
              const b = r[0] + r[2];
              if (b > right || (b === right && r[1] + r[3] > bottom)) {
                closestComp = c;
                right = b;
                bottom = r[1] + r[3];
              }
            }
            break;
          }

          expandUnits += expandUnits;
          lowSearchBnd = highSearchBnd;
          highSearchBnd += expandUnits;
          if (highSearchBnd > expandLimit)
            highSearchBnd = expandLimit;
        }
        break;
      default:
        while (lowSearchBnd < expandLimit) {
          searchRect[0] = x + w + lowSearchBnd;
          searchRect[2] = highSearchBnd - lowSearchBnd;
          const found = rtree.searchOverlaps(searchRect);
          if (found.length > 0) {
            let left = Number.MAX_VALUE;
            let top = Number.MAX_VALUE;
            for (const [r, c] of found) {
              const b = r[0];
              if (b < left || (b === left && r[1] < top)) {
                closestComp = c;
                left = b;
                top = r[1];
              }
            }
            break;
          }

          expandUnits += expandUnits;
          lowSearchBnd = highSearchBnd;
          highSearchBnd += expandUnits;
          if (highSearchBnd > expandLimit)
            highSearchBnd = expandLimit;
        }
    }
    return closestComp;
  }
  ft.isPaused(false).dp();
  ft.onFocus('', null, null).dp();
  ft.didFound().dp();
  return service;
});

export interface RootFocusEvents {
  eventHandlingSvc(svc: FocusService, dir?: SearchDirection): SingleActionFactory;
}
export type RootFocusServiceOpts = FocusServiceOpts;
const tableForRoot = ['switchFocus', 'eventHandlingSvc'] as const;
export const rootFocusSvcFac = focusServiceFac.forExtend<RootFocusEvents, typeof tableForRoot, RootFocusServiceOpts>({
  name: 'rootFocusSvc',
  debugExcludeTypes: ['renderBypassFilter'],
  tableFor: tableForRoot
}).defineReactor(({init}, canvas: Canvas) => {
  const service = init(null, canvas);
  const {r, pt, ft, latest} = service;
  r('eventHandlingSvc', latest.handleKeyEvents.pipe(
    rx.take(1),
    rx.switchMap(([, eventSvc]) => latest.eventHandlingSvc.pipe(
      rx.distinctUntilChanged(([, a], [, b]) => a === b),
      rx.scan<
        InferMapParam<RootFocusEvents['eventHandlingSvc']>
      >((prev, curr) => {
        const [m, svc, dir] = curr;
        prev[1].ft.stopHandleKeyEvents().dp(m);
        svc.ft.handleKeyEvents(eventSvc, dir).dp(m);
        return curr;
      })
    ))
  ));
  r('switchFocus... -> canvas.addRenderFilter...', pt.switchFocus.pipe(
    rx.switchMap(([m, srcFocus, , c]) => {
      if (c == null || srcFocus == null)
        return rx.EMPTY;
      return rx.merge(
        c.latest.setFocusStyle.pipe(
          rx.take(1),
          rx.mergeMap(([, s]) => {
            if (s === 'inverse') {
              return new rx.Observable(() => {
                srcFocus.ft.renderFor(c).dp(m);
                return () => {
                  srcFocus.ft.clearFor(c).dp(m);
                };
              });
            }
            return rx.EMPTY;
          })
        ),
        new rx.Observable(() => {
          c.ft.onFocus(c).dp(m);
          return () => {
            c.ft.onBlur(c).dp(m);
          };
        })
      );
    })
  ));
  r('switchFocus -> c.onLeave,c.onEnter', pt.switchFocus.pipe(
    rx.distinctUntilChanged(([,,, a], [,,, b]) => a === b),
    rx.scan<InferMapParam<FocusMessages['switchFocus']>>((prev, curr) => {
      if (prev[1] == null && prev[3] == null) {
        const [, , , p] = curr;
        let c: BaseWidget | undefined | null = p;
        while (c) {
          c.ft.onEnter(p!).dp(curr[0]);
          c = c.table.data.setParent[0];
        }
      } else {
        const blurAncestors = new Set<BaseWidget>();
        let c: BaseWidget | undefined | null = prev[3];
        while (c) {
          blurAncestors.add(c);
          c = c.table.data.setParent[0];
        }
        // lookup for common ancestor
        c = curr[3];
        while (c) {
          if (blurAncestors.has(c)) {
            // found common ancestor
            let leaveComp: undefined | typeof prev[3] = prev[3];
            while (leaveComp) {
              // ancestors below the common ancestor should be "onLeave"
              leaveComp.ft.onLeave(prev[3]!).dp(prev[0]);
              leaveComp = leaveComp.table.data.setParent[0];
            }
            break;
          }
          c.ft.onEnter(curr[3]!).dp(curr[0]);
          c = c.table.data.setParent[0];
        }
      }

      return curr;
    })
  ));

  r('switchFocus, didNotFound -> comp.focus', pt.switchFocus.pipe(
    rx.filter(([, , , c]) => c != null),
    rx.switchMap(([m0, , , c]) => pt.didNotFound.pipe(
      rx.map(([m]) => {
        // there is no other focusable, focus the lastest focused component.
        // Always do "focus()" asynchronously, to avoid recursive "didFound", "didNotFound"
        // messing up state of base service, let it to finish subscription of current event first.
        process.nextTick(() => {
          c!.ft.focus().dp(m, m0);
        });
      })
    ))
  ));

  ft.eventHandlingSvc(service).dp();
  ft.switchFocus().dp();
  return service;
});

export type RootFocusService = SimplexReactorOfFac<typeof rootFocusSvcFac>;

// function chooseClosestLeftOrRight<N extends {key: number}>(x: number, node1: N | null | undefined, node2: N | null | undefined) {
//   if (node1 != null && node2 == null)
//     return node1;
//   else if (node1 == null && node2 != null)
//     return node2;
//   else if (node1 && node2) {
//     return Math.abs(x - node1.key) > Math.abs(x - node2.key) ? node2 : node1;
//   }
//   return null;
// }

export function queryRootFocusService(currComp: BaseWidget, m?: ActionMeta) {
  let fac = currComp.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT);
  if (m)
    fac = fac.re(m);
  return fac.od(currComp.pt.onContextChange).pipe(
    rx.map(([, , v]) => v as RootFocusService)
  );
}
