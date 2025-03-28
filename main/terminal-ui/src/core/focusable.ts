/* eslint-disable multiline-ternary */
/* eslint-disable array-bracket-newline */
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

export const ROOT_FOCUS_SERVICE_CONTEXT = '__rootFocus';
export enum SearchDirection {
  down, up, right, left, tabNext
}
export interface FocusMessages {
  forRootComp(rootComp: BaseWidget): SingleActionFactory;
  onFocus(compName: string, comp: BaseWidget | null, srcService: FocusService | null): SingleActionFactory;
  /** Should only be dispatched on top level FocusService */
  switchFocus(srcFocusSvc: FocusService | null, compName: string | null, comp: BaseWidget | null): SingleActionFactory;
  /** Pointing to the only top level findFocusable service, which stores global states */
  removeFocusable(comp: BaseWidget): SingleActionFactory;
  onRectChange(rect: Rectangle, c: BaseWidget): SingleActionFactory;
  onRectRemoved(rect: Rectangle, c: BaseWidget): SingleActionFactory;
  findFocusable(direction: SearchDirection, handleKeyEventsAction: ActionMeta['i']): SingleActionFactory;
  locateFocusable(locateTrace: (readonly [FocusService, BaseWidget])[], index: number): SingleActionFactory;
  focusOnComponent(target: BaseWidget): SingleActionFactory;
  /** In context of "findFocusable", when next focusable is found */
  didFound(resultRect?: Rectangle, component?: BaseWidget, tabIndex?: number): SingleActionFactory;
  /** In context of "findFocusable" and handleKeyEvents, dispatched when
   * there is no next focusable on current direction */
  didNotFound(dir: SearchDirection): SingleActionFactory;
  handleKeyEvents(keyService: KeyEventServcie, currDir?: SearchDirection, currKey?: KeyEventEnum | null): SingleActionFactory;
  stopHandleKeyEvents(): SingleActionFactory;
  pauseHandleEvents(): SingleActionFactory;
  resumeHandleEvents(): SingleActionFactory;
  /** default is false, */
  isPaused(paused: boolean): SingleActionFactory;
  searchTree(xTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>,
    yTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>): SingleActionFactory;
  renderFor(comp: BaseWidget): SingleActionFactory;
  clearFor(comp: BaseWidget): SingleActionFactory;
}
const tableFor = [
  'didFound', 'handleKeyEvents', 'searchTree', 'isPaused', 'forRootComp'
] as const;
export type FocusService = SimplexReactor<FocusMessages & CanvasFilterOutput & CanvasFilterInput, typeof tableFor>;
export type FocusServiceOpts = CoreOptions<FocusMessages & CanvasFilterOutput & CanvasFilterInput> & {
  cache?: CanvasCacheOptions;
};
export const focusServiceFac = new BaseReactorFactory<FocusMessages & CanvasFilterOutput & CanvasFilterInput, typeof tableFor>({
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
)).defineReactor((init, canvas: Canvas, opts?: FocusServiceOpts) => {
  const service = init(opts);
  const {ft, pt, r, latest} = service;
  const rectByComponent = new Map<BaseWidget, [cRect: Rectangle, tabIndex: number]>();
  const xTree = new RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>();
  const yTree = new RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>();

  const rightXTree = new RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>();
  const bottomYTree = new RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>();
  const tabIndexTree = new RedBlackTree<number, BaseWidget[]>();
  const offscreen = canvasCacheFac.create({
    name: service.s.logPrefix + '.cache',
    debug: opts?.debug, log: opts?.log,
    ...opts?.cache
  });
  ft.searchTree(xTree, yTree).dp();
  r('forRootComp -> root.provideFocusService...', pt.forRootComp.pipe(
    rx.switchMap(([m, root]) => {
      root.ft.provideFocusService(service).dp(m);
      return root.destory$.pipe(
        rx.map(() => {
          offscreen.dispose();
          service.dispose();
        })
      );
    })
  ));
  r('removeFocusable', pt.removeFocusable.pipe(
    rx.map(([m, c]) => {
      const data = rectByComponent.get(c);
      if (data) {
        const [rect, tabIdx] = data;
        // service.log('>>> remove focusable for', c.s.logPrefix, rect);
        rectByComponent.delete(c);
        ft.onRectRemoved(rect, c).dp(m);
        const [oldCol, oldRow, oldWidth, oldHeight] = rect;
        const oldRight = oldCol + oldWidth;
        const oldBottom = oldRow + oldHeight;
        const xNode = xTree.search(oldCol);
        if (xNode) {
          const yNode = xNode.value.search(oldRow);
          if (yNode) {
            const i = yNode.value.findIndex(it => it === c);
            if (i >= 0) {
              yNode.value.splice(i, 1);
              if (yNode.value.length === 0) {
                xNode.value.deleteNode(yNode);
                if (xNode.value.size() === 0) {
                  // service.log('>>> delete xTree node', xNode.key, 'for', c.s.logPrefix);
                  xTree.deleteNode(xNode);
                }
              }
            }
          }
        }
        const yNode = yTree.search(oldRow);
        if (yNode) {
          const xNode = yNode.value.search(oldCol);
          if (xNode) {
            const i = xNode.value.findIndex(it => it === c);
            if (i >= 0) {
              xNode.value.splice(i, 1);
              if (xNode.value.length === 0) {
                yNode.value.deleteNode(xNode);
                if (yNode.value.size() === 0) {
                  // service.log('>>> delete yTree node', yNode.key, 'for', c.s.logPrefix);
                  yTree.deleteNode(yNode);
                }
              }
            }
          }
        }
        const rightEndNode = rightXTree.search(oldRight);
        if (rightEndNode) {
          const yNode = rightEndNode.value.search(oldBottom);
          if (yNode) {
            const i = yNode.value.findIndex(it => it === c);
            if (i >= 0) {
              yNode.value.splice(i, 1);
              if (yNode.value.length === 0) {
                rightEndNode.value.deleteNode(yNode);
                if (rightEndNode.value.size() === 0) {
                  // service.log('>>> delete xTree node', xNode.key, 'for', c.s.logPrefix);
                  rightXTree.deleteNode(rightEndNode);
                }
              }
            }
          }
        }
        const bottomEndNode = bottomYTree.search(oldBottom);
        if (bottomEndNode) {
          const xNode = bottomEndNode.value.search(oldRight);
          if (xNode) {
            const i = xNode.value.findIndex(it => it === c);
            if (i >= 0) {
              xNode.value.splice(i, 1);
              if (xNode.value.length === 0) {
                bottomEndNode.value.deleteNode(xNode);
                if (bottomEndNode.value.size() === 0) {
                  // service.log('>>> delete yTree node', yNode.key, 'for', c.s.logPrefix);
                  bottomYTree.deleteNode(bottomEndNode);
                }
              }
            }
          }
        }
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
  ));
  // maintain tree
  r('onRectChange -> "xTree","yTree","rightXTree","bottomYTree"', pt.onRectChange.pipe(
    rx.withLatestFrom(canvas.latest.setBounding),
    rx.map(([[, rect, c], [, , , , canHeight]]) => {
      const ex = rectByComponent.get(c);
      updatePosToTree(c, rect[0], rect[1], ex?.[0], xTree, yTree);
      updatePosToTree(c, rect[0] + rect[2], rect[1] + rect[3], ex?.[0], rightXTree, bottomYTree);
      const tabIndex = rect[1] * canHeight + rect[0];
      const tabNode = tabIndexTree.insert(tabIndex);
      // service.log('>>> add tabIndex for', c.s.logPrefix, tabIndex);
      if (tabNode.value) {
        service.log('--- add duplicate tabIndex', tabIndex, tabNode.value.map(it => it.s.logPrefix));
        tabNode.value.push(c);
      } else
        tabNode.value = [c];
      rectByComponent.set(c, [rect, tabIndex]);
    })
  ));
  function updatePosToTree(
    c: BaseWidget,
    x: number, y: number,
    ex: Rectangle | undefined,
    xTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>,
    yTree: RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>
  ) {
    let oldCol: number | undefined;
    let oldRow: number | undefined;
    if (ex) {
      if (ex[0] === x && ex[1] === y) {
        return;
      }
      oldCol = ex[0];
      oldRow = ex[1];
    }
    const newCol = x;
    const newRow = y;
    // remove old node from xTree and yTree
    if (oldCol != null && oldRow != null) {
      // service.log('>>> delete exiting rect for', c.s.logPrefix, oldCol, oldRow);
      const xNode = xTree.search(oldCol);
      if (xNode) {
        const yNode = xNode.value.search(oldRow);
        if (yNode) {
          const idx = yNode.value.findIndex(it => it === c);
          if (idx >= 0)
            yNode.value.splice(idx, 1);
          if (yNode.value.length === 0) {
            xNode.value.deleteNode(yNode);
            if (xNode.value.size() === 0) {
              xTree.deleteNode(xNode);
            }
          }
        }
      }
      const yNode = yTree.search(oldRow);
      if (yNode) {
        const xNode = yNode.value.search(oldCol);
        if (xNode) {
          const idx = xNode.value.findIndex(it => it === c);
          if (idx >= 0)
            xNode.value.splice(idx, 1);
          if (xNode.value.length === 0) {
            yNode.value.deleteNode(xNode);
            if (yNode.value.size() === 0)
              yTree.deleteNode(yNode);
          }
        }
      }
    }
    // add new node to xTree and yTree
    // For x-coordinate first tree
    const newXNode = xTree.search(newCol);
    if (newXNode) {
      const newYNode = newXNode.value.search(newRow);
      if (newYNode) {
        newYNode.value.push(c);
      } else {
        const newYNode = newXNode.value.insert(newRow);
        newYNode.value = [c];
      }
    } else {
      const newXNode = xTree.insert(newCol);
      newXNode.value = new RedBlackTree();
      const newYNode = newXNode.value.insert(newRow);
      newYNode.value = [c];
    }
    // for y-coordinate first tree
    const newYNode = yTree.search(newRow);
    if (newYNode) {
      const newXNode = newYNode.value.search(newCol);
      if (newXNode) {
        newXNode.value.push(c);
      } else {
        const newXNode = newYNode.value.insert(newCol);
        newXNode.value = [c];
      }
    } else {
      const newYNode = yTree.insert(newRow);
      newYNode.value = new RedBlackTree();
      const newXNode = newYNode.value.insert(newCol);
      newXNode.value = [c];
    }
  }

  function getAllParentFocusSvc(curr: FocusService, currComp: BaseWidget, untilRoot: FocusService):
  rx.Observable<(readonly [FocusService, BaseWidget])[]> {
    if (curr === untilRoot) {
      return curr.latest.forRootComp.pipe(
        rx.take(1),
        rx.map(([, root]) => [[curr, currComp]])
      );
    }
    return curr.latest.forRootComp.pipe(
      rx.mergeMap(([, root]) => root.latest.setParent.pipe(
        rx.map(([, p]) => [root, p] as const)
      )),
      rx.take(1),
      rx.mergeMap(([root, p]) => p ? p.latest.focusService.pipe(
        rx.switchMap(([, pf]) => getAllParentFocusSvc(pf, root, untilRoot).pipe(
          rx.map(parentRoots => {
            parentRoots.push([curr, currComp]);
            return parentRoots;
          })
        )),
        rx.take(1),
      ) : rx.of([[curr, currComp] as const]))
    );
  }
  r('focusOnComponent', pt.focusOnComponent.pipe(
    rx.switchMap(([m, c]) => c.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT)
      .re(m).od(
        c.pt.onContextChange
      ).pipe(
        rx.mergeMap(([, , rootFocus]) => {
          return getAllParentFocusSvc(service, c, rootFocus as FocusService).pipe(
            rx.mergeMap(trace => {
              service.log('-- focusOnComponent', trace.map(([f, c]) => f.s.logPrefix + ' -> ' + c.s.logPrefix));
              // must wait for rendered once, so its rectangle is updated to focusService
              return c.latest.render.pipe(
                rx.take(1),
                rx.map(() => {
                  trace[0][0].ft.locateFocusable(trace, 0).dp(m);
                })
              );
            })
          );
        })
      ))
  ));
  r('locateFocusable -> locateFocusable,didFound,handleKeyEvents...', pt.locateFocusable.pipe(
    rx.withLatestFrom(latest.handleKeyEvents),
    rx.switchMap(([[m, trace, idx], [, keyService]]) => {
      if (idx < trace.length) {
        const [, comp] = trace[idx];
        const data = rectByComponent.get(comp);
        service.log('-- locateFocusable rectByComponent', data);
        if (data) {
          const [r, tabIdx] = data;
          ft.didFound(r, comp, tabIdx).dp(m);
          if (idx < trace.length - 1) {
            const [subFocus] = trace[idx + 1];
            ft.stopHandleKeyEvents().dp(m);
            subFocus.ft.handleKeyEvents(keyService).dp(m);
            return rx.merge(
              subFocus.ft.locateFocusable(trace, idx + 1).re(m).od(
                subFocus.pt.didNotFound
              ).pipe(
                rx.take(1),
                rx.map(([, dir]) => {
                  subFocus.ft.stopHandleKeyEvents().dp(m);
                  ft.handleKeyEvents(keyService, dir).dp(m);
                })
              )
            );
          } else {
            return comp.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT).re(m).od(
              comp.pt.onContextChange
            ).pipe(
              rx.take(1),
              rx.map(([, , rootFocus]) => {
                (rootFocus as RootFocusService).ft.switchFocus(
                  service, comp.s.logPrefix, comp).dp(m);
              })
            );
          }
        }
      }
      ft.didNotFound(SearchDirection.down).dp(m);
      return rx.EMPTY;
    })
  ));
  // dispatch onFocus event according to didFound result,
  // when the target component is an offsetParent,
  // designate it to handle key events
  const forked = service.s.forkController();
  r('findFocusable,didFound,didNotFound,handleKeyEvents... -> onFocus,rootFocus.switchFocus',
    pt.findFocusable.pipe(
      rx.withLatestFrom(latest.handleKeyEvents),
      rx.switchMap(([[m, dir], [, keySvc]]) => {
        return forked.pt.didFound.pipe(
          actionRelatedToAction(m),
          rx.takeUntil(forked.pt.didNotFound.pipe(
            actionRelatedToAction(m)
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
            if (r) {
              ft.onFocus(c.s.logPrefix, c, service).dp(m);
              return c.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT).re(m)
                .od(c.pt.onContextChange)
                .pipe(
                  rx.take(1),
                  rx.map(([, , rootFocus]) => {
                    (rootFocus as FocusService).ft.switchFocus(service, c.s.logPrefix, c).dp(m);
                  })
                );
            } else {
              // If current component is not focusable,
              // delegate handling key events job to the sub focusService
              return c.latest.focusService.pipe(
                rx.take(1),
                rx.switchMap(([, focusService]) => {
                  ft.stopHandleKeyEvents().dp(m);
                  return focusService.ft.handleKeyEvents(keySvc, dir)
                    .re(m).od(focusService.pt.didNotFound).pipe(
                      rx.map(([m2, origDir]) => {
                        focusService.ft.stopHandleKeyEvents().dp(m2);
                        ft.handleKeyEvents(keySvc, origDir).dp( m2);
                      }),
                      rx.take(1)
                    );
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
    rx.map(([[m, dir, handleEventAct], [, lastRect, lastComp, tabIdx]]) => {
      // service.log('-- findFocusable, lastComp', m2, lastComp?.s.logPrefix, lastRect);
      if (dir === SearchDirection.down) {
        if (lastRect == null || lastComp == null || !rectByComponent.has(lastComp)) {
          const nodeY = yTree.minimum();
          if (nodeY == null) {
            ft.didNotFound(dir).dp(m, handleEventAct);
            return;
          }
          lastComp = nodeY.value.minimum()!.value[0];
          const lastData = rectByComponent.get(lastComp);
          if (lastData == null) {
            // service.log('All yTree nodes', [...yTree.allChildNodeInorder()].map(([n]) => n.key));
            service.log('>>> yNode key:', nodeY);
            throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
          }
          [lastRect, tabIdx] = lastData;
          ft.didFound(lastRect, lastComp, tabIdx).dp(m, handleEventAct);
          return;
        }
        const [[col, row]] = rectByComponent.get(lastComp)!;
        // check if there are more component with same rectangle
        const yNode = yTree.search(row);
        if (yNode) {
          const xNode = yNode.value.search(col);
          if (xNode) {
            const idx = xNode.value.findIndex(it => it === lastComp);
            if (idx >= 0 && idx < xNode.value.length - 1) {
              const c = xNode.value[idx + 1];
              const [r, tabIdx] = rectByComponent.get(c) ?? [undefined, undefined] as const;
              ft.didFound(r, c, tabIdx).dp(m);
              return;
            }
          }
        }
        // move to next node vertically
        const nextNode = yTree.smallestNodeGreaterThanOrEqual(row + 1);
        if (nextNode == null) {
          ft.didNotFound(dir).dp(m, handleEventAct);
          return;
        }
        const toRight = nextNode.value.smallestNodeGreaterThanOrEqual(col);
        const toLeft = nextNode.value.greatestNodeSmallerThanOrEqual(col);
        const choosen = chooseClosestLeftOrRight(col, toLeft, toRight);
        if (choosen) {
          const nextComp = choosen.value[0];
          const [r, t] = rectByComponent.get(nextComp) ?? [undefined, undefined] as const;
          ft.didFound(r, nextComp, t).dp(m);
          return;
        }
      } else if (dir === SearchDirection.up) {
        if (lastRect == null || lastComp == null || !rectByComponent.has(lastComp)) {
          const nodeY = bottomYTree.maximum();
          if (nodeY == null) {
            ft.didNotFound(dir).dp(m, handleEventAct);
            return;
          }
          lastComp = nodeY.value.maximum()!.value[0];
          [lastRect, tabIdx] = rectByComponent.get(lastComp) ?? [undefined, undefined] as const;
          if (lastRect == null) {
            service.log('All yTree nodes', [...bottomYTree.allChildNodeInorder()].map(([n]) => n.key));
            throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
          }
          ft.didFound(lastRect, lastComp, tabIdx).dp(m, handleEventAct);
          return;
        }
        const [[x, y, width, height]] = rectByComponent.get(lastComp)!;
        const col = x + width;
        const row = y + height;
        // check if there are more component with same rectangle
        const yNode = bottomYTree.search(row);
        if (yNode) {
          const xNode = yNode.value.search(col);
          if (xNode) {
            const idx = xNode.value.findIndex(it => it === lastComp);
            if (idx > 0) {
              const c = xNode.value[idx - 1];
              const [r, t] = rectByComponent.get(c) ?? [undefined, undefined] as const;
              ft.didFound(r, c, t).dp(m);
              return;
            }
          }
        }
        // move to next node vertically
        const nextNode = bottomYTree.greatestNodeSmallerThanOrEqual(row - 1);
        if (nextNode == null) {
          ft.didNotFound(dir).dp(m, handleEventAct);
          return;
        }
        const toRight = nextNode.value.smallestNodeGreaterThanOrEqual(col);
        const toLeft = nextNode.value.greatestNodeSmallerThanOrEqual(col);
        const choosen = chooseClosestLeftOrRight(col, toLeft, toRight);
        if (choosen) {
          const nextComp = choosen.value[0];
          const [r, t] = rectByComponent.get(nextComp) ?? [undefined, undefined] as const;
          ft.didFound(r, nextComp, t).dp(m);
          return;
        }
      } else if (dir === SearchDirection.left) {
        if (lastRect == null || lastComp == null || !rectByComponent.has(lastComp)) {
          const nodeX = rightXTree.maximum();
          if (nodeX == null) {
            ft.didNotFound(dir).dp(m, handleEventAct);
            return;
          }
          lastComp = nodeX.value.maximum()!.value[0];
          [lastRect, tabIdx] = rectByComponent.get(lastComp) ?? [undefined, undefined] as const;
          if (lastRect == null) {
            service.log('All rightXTree nodes', [...rightXTree.allChildNodeInorder()].map(([n]) => n.key));
            throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
          }
          // service.log('-- rightXTree.maximum', nodeX.value.maximum()!.value.map(
          //   c => c.s.logPrefix
          // ));
          ft.didFound(lastRect, lastComp, tabIdx).dp(m, handleEventAct);
          return;
        }
        const [[x, y, width, height]] = rectByComponent.get(lastComp)!;
        const col = x + width;
        const row = y + height;
        // check if there are more component of same rectangle
        const xNode = rightXTree.search(col);
        if (xNode) {
          const yNode = xNode.value.search(row);
          if (yNode) {
            const idx = yNode.value.findIndex(it => it === lastComp);
            if (idx > 0) {
              const c = yNode.value[idx - 1];
              const [r, t] = rectByComponent.get(c) ?? [undefined, undefined] as const;
              ft.didFound(r, c, t).dp(m);
              return;
            }
          }
        }
        // move to next node horizontally
        const nextNode = rightXTree.greatestNodeSmallerThanOrEqual(col - 1);
        if (nextNode == null) {
          ft.didNotFound(dir).dp(m, handleEventAct);
          return;
        }
        const end0 = nextNode.value.smallestNodeGreaterThanOrEqual(row);
        const end1 = nextNode.value.greatestNodeSmallerThanOrEqual(row);
        const choosen = chooseClosestLeftOrRight(row, end0, end1);
        if (choosen) {
          const nextComp = choosen.value[0];
          const [r, t] = rectByComponent.get(nextComp) ?? [undefined, undefined] as const;
          ft.didFound(r, nextComp, t).dp(m);
          return;
        }
      } else if (dir === SearchDirection.right) {
        if (lastRect == null || lastComp == null || !rectByComponent.has(lastComp)) {
          const nodeX = xTree.minimum();
          if (nodeX == null) {
            ft.didNotFound(dir).dp(m, handleEventAct);
            return;
          }
          lastComp = nodeX.value.minimum()!.value[0];
          [lastRect, tabIdx] = rectByComponent.get(lastComp) ?? [undefined, undefined] as const;
          if (lastRect == null) {
            service.log('All xTree nodes', [...xTree.allChildNodeInorder()].map(([n]) => n.key));
            throw new Error(`Inconsistent rectByComponent of missing entry for ${lastComp.s.logPrefix}`);
          }
          ft.didFound(lastRect, lastComp, tabIdx).dp(m, handleEventAct);
          return;
        }
        const [[col, row]] = rectByComponent.get(lastComp)!;
        // check if there are more component of same rectangle
        const xNode = xTree.search(col);
        if (xNode) {
          const yNode = xNode.value.search(row);
          if (yNode) {
            const idx = yNode.value.findIndex(it => it === lastComp);
            if (idx >= 0 && idx < yNode.value.length - 1) {
              const c = yNode.value[idx + 1];
              const [r, t] = rectByComponent.get(c) ?? [undefined, undefined] as const;
              ft.didFound(r, c, t).dp(m);
              return;
            }
          }
        }
        // move to next node horizontally
        const nextNode = xTree.smallestNodeGreaterThanOrEqual(col + 1);
        if (nextNode == null) {
          ft.didNotFound(dir).dp(m, handleEventAct);
          return;
        }
        const end0 = nextNode.value.smallestNodeGreaterThanOrEqual(row);
        const end1 = nextNode.value.greatestNodeSmallerThanOrEqual(row);
        const choosen = chooseClosestLeftOrRight(row, end0, end1);
        if (choosen) {
          const nextComp = choosen.value[0];
          const [r, t] = rectByComponent.get(nextComp) ?? [undefined, undefined];
          ft.didFound(r, nextComp, t).dp(m);
          return;
        }
      } else if (dir === SearchDirection.tabNext) {
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
      }
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
        if (evt)
          service.log('--keyevent', m1.i, KeyEventEnum[evt], count);
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
  ft.isPaused(false).dp();
  ft.onFocus('', null, null).dp();
  ft.didFound().dp();
  return service;
});

export type RootFocusServiceOpts = FocusServiceOpts;
const tableForRoot = ['switchFocus'] as const;
export const rootFocusSvcFac = focusServiceFac.forExtend<Record<string, never>, typeof tableForRoot>({
  name: 'rootFocusSvc',
  debugExcludeTypes: ['renderBypassFilter'],
  tableFor: tableForRoot
}).defineReactor((init, canvas: Canvas, opts?: RootFocusServiceOpts) => {
  const service = init(opts, canvas, opts);
  const {r, pt, ft} = service;
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
    rx.scan((prev, curr) => {
      if (prev == null) {
        const [, , , p] = curr;
        let c: BaseWidget | undefined | null = p;
        while (c) {
          c.ft.onEnter(p!).dp(curr[0]);
          c = c.table.getData().setParent[0];
        }
      } else if (curr == null) {
        let c: BaseWidget | undefined | null = prev[3];
        while (c) {
          c.ft.onLeave(prev[3]!).dp(prev[0]);
          c = c.table.getData().setParent[0];
        }
      } else {
        const blurAncestors = new Set<BaseWidget>();
        let c: BaseWidget | undefined | null = prev[3];
        while (c) {
          blurAncestors.add(c);
          c = c.table.getData().setParent[0];
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
              leaveComp = leaveComp.table.getData().setParent[0];
            }
            break;
          }
          c.ft.onEnter(curr[3]!).dp(curr[0]);
          c = c.table.getData().setParent[0];
        }
      }

      return curr;
    }, null as null | InferMapParam<FocusMessages['switchFocus']>)
  ));

  r('didNotFound', rx.merge(
    pt.didNotFound,
    pt.didFound.pipe(
      rx.map(() => null)
    )
  ).pipe(
    rx.scan((prev, curr) => {
      if (prev == null && curr != null) {
        const [m, dir] = curr;
        let reverseDir: typeof dir;
        switch (dir) {
          case SearchDirection.up:
            reverseDir = SearchDirection.down;
            break;
          case SearchDirection.down:
            reverseDir = SearchDirection.up;
            break;
          case SearchDirection.left:
            reverseDir = SearchDirection.right;
            break;
          case SearchDirection.right:
            reverseDir = SearchDirection.left;
            break;
          default:
            reverseDir = SearchDirection.tabNext;
        }
        service.log('-- top level focus service retry focus for', SearchDirection[reverseDir]);
        // setTimeout avoid recursive invocation of findFocusable
        setTimeout(() => {
          ft.findFocusable(reverseDir, m.i).dp(m);
        }, 0);
      }
      return curr;
    }, null as InferMapParam<FocusMessages['didNotFound']> | null)
  ));
  // ft.switchFocus(null, null, null, null).dp();
  return service;
});

export type RootFocusService = SimplexReactorOfFac<typeof rootFocusSvcFac>;

function chooseClosestLeftOrRight<N extends {key: number}>(x: number, node1: N | null | undefined, node2: N | null | undefined) {
  if (node1 != null && node2 == null)
    return node1;
  else if (node1 == null && node2 != null)
    return node2;
  else if (node1 && node2) {
    return Math.abs(x - node1.key) > Math.abs(x - node2.key) ? node2 : node1;
  }
  return null;
}

export function queryRootFocusService(currComp: BaseWidget, m?: ActionMeta) {
  let fac = currComp.ft.queryContext(ROOT_FOCUS_SERVICE_CONTEXT);
  if (m)
    fac = fac.re(m);
  return fac.od(currComp.pt.onContextChange).pipe(
    rx.map(([, , v]) => v as RootFocusService)
  );
}
