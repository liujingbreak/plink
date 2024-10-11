/**
 * User stories:
 * WHEN user press TAB or left, right,...key, 
 *  and WHEN there is no existing "onFocus" component,
 *    THEN focus on the most left top (corresponding to the pressed key)
 *    focusable component in viewport.
 *  otherwise focus on "next" right focuable component.
 *
 * WHEN a focusable component is focused,
 *  onFocus event should be dispatched
 */
import * as rx from 'rxjs';
import {SimplexReactor, SingleActionFactory, SimplexReactorExtendType, actionRelatedToAction, ActionMeta,
  SimplexReactorOptions} from '@wfh/reactivizer';
import {RedBlackTree} from '@wfh/algorithms';
import {BaseWidget, OffsetParent} from './base';
import {Rectangle, TerminalCanvas, TextStyle} from './canvas';
import {renderLineBorder} from './border';
import {KeyEventServcie, KeyEventEnum} from './keyEvent';

export enum SearchDirection {
  down, up, right, left
}
export interface FocusableMessages {
  forRootComp(rootComp: BaseWidget): SingleActionFactory;
  /** Pointing to the only top level focus service, which stores global states */
  rootService(root: RootFocusService): SingleActionFactory;
  removeFocusable(comp: BaseWidget): SingleActionFactory;
  addChild(svc: OffsetParent): SingleActionFactory;
  removeChild(svc: OffsetParent): SingleActionFactory;
  onRectChange(rect: Rectangle, c: BaseWidget): SingleActionFactory;
  onRectRemoved(rect: Rectangle, c: BaseWidget): SingleActionFactory;
  focus(direction: SearchDirection, origKey: KeyEventEnum, handleKeyEventsAction: ActionMeta['i']): SingleActionFactory;
  /** In context of "focus" */
  didFocus(resultRect?: Rectangle, component?: BaseWidget): SingleActionFactory;
  /** In context of "focus" and handleKeyEvents */
  didFocusEnd(dir: SearchDirection, origKey: KeyEventEnum): SingleActionFactory;
  isDirtyForRender(dirty: boolean): SingleActionFactory;
  setBorderStyle(...styles: TextStyle): SingleActionFactory;
  render(canvas: TerminalCanvas): SingleActionFactory;

  handleKeyEvents(keyService: KeyEventServcie, currKey: KeyEventEnum | null): SingleActionFactory;
  controlHandleEvents(stop: boolean): SingleActionFactory;
  onFocusOutside(dir: SearchDirection): SingleActionFactory;
  setRenderClips(clips: Rectangle[]): SingleActionFactory;
  latestRenderedRect(...rect: Rectangle): SingleActionFactory;
}
export interface RootFocusableEvents {
  onFocus(comp: BaseWidget): SingleActionFactory;
}
const tableFor = [
  'didFocus', 'isDirtyForRender', 'handleKeyEvents',
  'setBorderStyle', 'rootService', 'controlHandleEvents',
  'setRenderClips', 'latestRenderedRect'
] as const;
export type FocusService = SimplexReactor<FocusableMessages, typeof tableFor>;
const COORD_ROUND_RATIO_X = 3;
const COORD_ROUND_RATIO_Y = 2;
export type FocusableOptions = Partial<SimplexReactorOptions<FocusableMessages, typeof tableFor>>;
export function createFocusService(opts?: FocusableOptions) {
  const service = new SimplexReactor<FocusableMessages, typeof tableFor>({
    name: 'focusSvc',
    debugExcludeTypes: ['removeFocusable', 'setRenderClips'],
    ...opts,
    tableFor
  });
  const {s, r, table} = service;
  const rectByComponent = new Map<BaseWidget, Rectangle>();
  const xTree = new RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>();
  const yTree = new RedBlackTree<number, RedBlackTree<number, BaseWidget[]>>();
  r('removeFocusable -> onRectRemoved', s.pt.removeFocusable.pipe(
    rx.map(([m, c]) => {
      const rect = rectByComponent.get(c);
      if (rect) {
        service.log('remove focusable', c.id);
        rectByComponent.delete(c);
        s.ft.onRectRemoved(rect, c).dp(m);
        const oldCol = Math.round(rect[0] / COORD_ROUND_RATIO_X);
        const oldRow = Math.round(rect[1] / COORD_ROUND_RATIO_Y);
        const xNode = xTree.search(oldCol);
        if (xNode) {
          const yNode = xNode.value.search(oldRow);
          if (yNode) {
            const i = yNode.value.findIndex(it => it === c);
            if (i >= 0) {
              yNode.value.splice(i, 1);
              if (yNode.value.length === 0)
                xTree.deleteNode(xNode);
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
              if (xNode.value.length === 0)
                yTree.deleteNode(yNode);
            }
          }
        }
      }
    })
  ));
  // maintain tree
  r('onRectChange -> "xTree", "yTree"', s.pt.onRectChange.pipe(
    rx.map(([, rect, c]) => {
      let oldCol: number | undefined;
      let oldRow: number | undefined;
      const ex = rectByComponent.get(c);
      if (ex) {
        if (ex[0] === rect[0] && ex[1] === rect[1]) {
          return;
        }
        oldCol = Math.round(ex[0] / COORD_ROUND_RATIO_X);
        oldRow = Math.round(ex[1] / COORD_ROUND_RATIO_Y);
      }
      const newCol = Math.round(rect[0] / COORD_ROUND_RATIO_X);
      const newRow = Math.round(rect[1] / COORD_ROUND_RATIO_Y);
      // remove old node from xTree and yTree
      if (oldCol != null && oldRow != null) {
        const xNode = xTree.search(oldCol);
        if (xNode) {
          const yNode = xNode.value.search(oldRow);
          if (yNode) {
            const idx = yNode.value.findIndex(it => it === c);
            if (idx >= 0)
              yNode.value.splice(idx, 1);
            if (yNode.value.length === 0)
              xTree.deleteNode(xNode);
          }
        }
        const yNode = yTree.search(oldCol);
        if (yNode) {
          const xNode = yNode.value.search(oldCol);
          if (xNode) {
            const idx = xNode.value.findIndex(it => it === c);
            if (idx >= 0)
              xNode.value.splice(idx, 1);
            if (xNode.value.length === 0)
              yTree.deleteNode(yNode);
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
      rectByComponent.set(c, rect);
    })
  ));
  // dispatch onFocus event according to didFocus result,
  // when the target component is a offsetParent,
  // designate it to handle key events
  r('didFocus, handleKeyEvents... -> isDirtyForRender, c.onFocus, c.focus.handleKeyEvents, controlHandleEvents',
    s.pt.focus.pipe(
      rx.switchMap(([m, dir, key, handleKeyAct]) => {
        return s.pt.didFocus.pipe(
          actionRelatedToAction(m),
          rx.takeUntil(s.pt.didFocusEnd.pipe(
            actionRelatedToAction(m)
          )),
          rx.take(1),
          rx.mergeMap(([, rect, c]) => {
            if (rect != null && c) {
              return rx.merge(
                c.table.l.setFocusable.pipe(
                  rx.filter(([, f]) => f !== false),
                  rx.mergeMap(() => {
                    s.ft.isDirtyForRender(true).dp(m);
                    c.s.ft.onFocus(dir).dp(m);
                    return table.l.rootService;
                  }),
                  rx.map(([, root]) => root.s.ft.onFocus(c).dp(m)),
                  rx.take(1),
                  service.labelError('handle "focusable" component is found')
                ),
                c.table.l.isOffsetParent.pipe(
                  rx.take(1),
                  rx.mergeMap(([, childOp]) => {
                    if (childOp) {
                    // pass keyEventService to child offsetParent's focus service,
                    // wait for its returning,
                    // and halt current key event handling process until child service
                    // returns
                      return table.l.handleKeyEvents.pipe(
                        rx.take(1),
                        rx.mergeMap(([m1, keySvc]) => {
                          s.ft.controlHandleEvents(true).dp(m, m1);
                          const c = childOp.focusService.s;
                          return c.ft.handleKeyEvents(keySvc, key).re(m, m1)
                            .od(c.pt.didFocusEnd);
                        }),
                        rx.map(([, dir, origKey]) => {
                          s.ft.controlHandleEvents(false).dp(m);
                          s.ft.focus(dir, origKey, handleKeyAct).dp(m);
                        }),
                        rx.take(1)
                      );
                    }
                    return rx.EMPTY;
                  })
                )
              );
            }
            return rx.EMPTY;
          })
        );
      })
    ));
  r('focus -> didFocus, didFocusEnd', s.pt.focus.pipe(
    rx.map(([m, dir, key, handleEventAct]) => {
      let [lastRect, lastComp] = table.getData().didFocus;
      if (lastRect == null || lastComp == null) {
        const minX = xTree.minimum();
        if (minX == null) {
          s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
          return;
        }
        lastComp = minX.value.minimum()!.value[0];
        lastRect = rectByComponent.get(lastComp);
        s.ft.didFocus(lastRect, lastComp).dp(m, handleEventAct);
        return;
      }
      const [rLeft, rTop] = lastRect;
      const col = Math.round(rLeft / COORD_ROUND_RATIO_X);
      const row = Math.round(rTop / COORD_ROUND_RATIO_Y);
      if (dir === SearchDirection.down) {
        // check if there are more component with same rectangle
        const yNode = yTree.search(row);
        if (yNode) {
          const xNode = yNode.value.search(col);
          if (xNode) {
            const idx = xNode.value.findIndex(it => it === lastComp);
            if (idx >= 0 && idx < xNode.value.length - 1) {
              const c = xNode.value[idx + 1];
              s.ft.didFocus(rectByComponent.get(c), c).dp(m);
              return;
            }
          }
        }
        // move to next node vertically
        const nextNode = yTree.smallestNodeGreaterThanOrEqual(row + 1);
        if (nextNode == null) {
          s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
          return;
        }
        const toRight = nextNode.value.smallestNodeGreaterThanOrEqual(col);
        const toLeft = nextNode.value.greatestNodeSmallerThanOrEqual(col);
        const choosen = chooseClosestLeftOrRight(col, toLeft, toRight);
        if (choosen) {
          const nextComp = choosen.value[0];
          s.ft.didFocus(rectByComponent.get(nextComp), nextComp).dp(m);
          return;
        }
      } else if (dir === SearchDirection.up) {
        // check if there are more component with same rectangle
        const yNode = yTree.search(row);
        if (yNode) {
          const xNode = yNode.value.search(col);
          if (xNode) {
            const idx = xNode.value.findIndex(it => it === lastComp);
            if (idx > 0) {
              const c = xNode.value[idx - 1];
              s.ft.didFocus(rectByComponent.get(c), c).dp(m);
              return;
            }
          }
        }
        // move to next node vertically
        const nextNode = yTree.greatestNodeSmallerThanOrEqual(row - 1);
        if (nextNode == null) {
          s.ft.didFocusEnd(dir, key).dp(m, handleEventAct);
          return;
        }
        const toRight = nextNode.value.smallestNodeGreaterThanOrEqual(col);
        const toLeft = nextNode.value.greatestNodeSmallerThanOrEqual(col);
        const choosen = chooseClosestLeftOrRight(col, toLeft, toRight);
        if (choosen) {
          const nextComp = choosen.value[0];
          s.ft.didFocus(rectByComponent.get(nextComp), nextComp).dp(m);
          return;
        }
      }
    })
  ));
  r('handleKeyEvents... -> focus', s.pt.handleKeyEvents.pipe(
    rx.switchMap(([m, keySvc, currKey]) => rx.concat(
      currKey != null ? rx.of([m, currKey]) : rx.EMPTY,
      keySvc.s.pt.onFocusChange
    ).pipe(
      rx.windowToggle(
        table.l.controlHandleEvents.pipe(
          rx.filter(([, stop]) => !stop)
        ),
        () => table.l.controlHandleEvents.pipe(
          rx.filter(([, stop]) => stop)
        )
      ),
      rx.switchMap(change$ => change$),
      rx.map(([m1, evt]) => {
        if (evt === KeyEventEnum.focusUp)
          s.ft.focus(SearchDirection.up, evt, m.i).dp(m, m1);
        else if (evt === KeyEventEnum.focusDown ||
                evt === KeyEventEnum.focusNext)
          s.ft.focus(SearchDirection.down, evt, m.i).dp(m, m1);
        else if (evt === KeyEventEnum.focusLeft)
          s.ft.focus(SearchDirection.left, evt, m.i).dp(m, m1);
        else if (evt === KeyEventEnum.focusRight)
          s.ft.focus(SearchDirection.right, evt, m.i).dp(m, m1);
      })
    ))
  ));
  r('render -> isDirtyForRender', s.pt.render.pipe(
    rx.withLatestFrom(table.l.isDirtyForRender, table.l.setBorderStyle),
    rx.exhaustMap(([[m, canvas], [, dirty], [, ...style]]) => {
      if (!dirty) {
        return rx.EMPTY;
      }
      s.ft.isDirtyForRender(false).dp(m);
      return rx.combineLatest([
        table.l.didFocus,
        canvas.table.l.setBounding
      ]).pipe(
        rx.take(1),
        rx.map(([[, rect, comp], [, , , canvasWidth, canvasHeight]]) => {
          if (rect == null || comp == null)
            return;
          let [x, y, w, h] = rect;
          if (x > 0) {
            x--;
            w++;
          }
          if (y > 0) {
            y--;
            h++;
          }
          if (w < canvasWidth)
            w++;
          if (h < canvasHeight)
            h++;
          s.ft.latestRenderedRect(x, y, w, h).dp(m);
          renderLineBorder(m, canvas, x, y, w, h, style);
        })
      );
    })
  ));
  r('latestRenderedRect', s.pt.latestRenderedRect.pipe(
    rx.distinctUntilChanged(([, x, y, w, h], [, x2, y2, w2, h2]) => {
      return x === x2 && y === y2 && w === w2 && h === h2;
    })
  ));
  s.ft.isDirtyForRender(false).dp();
  s.ft.controlHandleEvents(false).dp();
  s.ft.setRenderClips([]).dp();
  s.ft.setBorderStyle('yellowBright').dp();
  return service;
}
const tableForRoot = ['onFocus'] as const;
export function createRootService(keyEventService: KeyEventServcie, opts?: FocusableOptions) {
  const base = createFocusService({
    ...opts,
    name: opts?.name ? 'Root' + opts?.name : 'rootFocusSvc'
  });
  const extended = base.config<RootFocusableEvents, typeof tableForRoot>({tableFor: tableForRoot});
  const {r, s} = extended;
  r('forRootComp -> root.isOffsetParent|root.destory$ -> dispose', s.pt.forRootComp.pipe(
    rx.switchMap(([m, root]) => {
      (root as BaseWidget & OffsetParent).focusService = base;
      root.s.ft.isOffsetParent((root as BaseWidget & OffsetParent)).dp(m);
      s.ft.rootService(extended).dp(m);
      return rx.merge(
        root.s.pt.onRender.pipe(
          rx.map(([m, canvas]) => {
            s.ft.render(canvas).dp(m);
          })
        ),
        root.destory$.pipe(
          rx.map(() => extended.dispose())
        )
      );
    })
  ));
  s.ft.handleKeyEvents(keyEventService, null).dp();
  return extended;
}
export type RootFocusService = SimplexReactorExtendType<FocusService, RootFocusableEvents, typeof tableForRoot>;

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

