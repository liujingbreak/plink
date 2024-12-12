import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory, SimplexReactorOfFac, CreateOptsOfFac, ActionMeta} from '@wfh/reactivizer';
import {OffsetParent, DisplayMode} from './base';
import {TerminalContainer} from './container';
import {createFocusService, FocusableOptions, FocusService} from './focusable';
import {baseContainerFac} from './container';
import {BaseWidget, Rectangle, TerminalCanvas,
  createTerminalCanvas, TerminalCanvasOptions, TextStyle} from './index';

interface ElevatorActions {
  /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
  toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
interface ElevatorEvents extends ElevatorActions {
  onFocusServieReady(chd: BaseWidget, focusable: FocusService): SingleActionFactory;
  // onChildLayerHidden(chd: BaseWidget): SingleActionFactory;
}
export const elevatorFac = baseContainerFac.forExtend<ElevatorEvents>({
  name: 'elevator'
}).interceptorForBaseByType(ac => rx.merge(
  rx.merge(
    ac.at.onRender,
    ac.at.findOverlaps
  ).pipe(
    rx.ignoreElements()
  ),
  ac.ofOtherTypes()
)).defineReactor((init, opts?: ElevatorOptions) => {
  const service = init({...opts?.default as any, ...opts?.core});
  const {s, r, table} = service;
  // let lastBottom: BaseWidget | undefined;
  /** Offline canvas by root component */
  const canvasMap = new Map<BaseWidget, TerminalCanvas>();
  r('addChild,insertChild, removeChild -> "canvasMap"', rx.merge(
    s.pt.addChild.pipe(
      rx.map(([m, ...chdn]) => [m, chdn] as const)
    ),
    s.pt.insertChild.pipe(
      rx.map(([m, , chdn]) => [m, chdn] as const)
    )
  ).pipe(
    rx.mergeMap(([m, chd]) => rx.from(chd).pipe(
      rx.mergeMap(chd => {
        const cv = createTerminalCanvas({
          ...opts?.default as TerminalCanvasOptions,
          name: 'Elevator.canvas',
          ...opts?.canvas
        });
        canvasMap.set(chd, cv);
        cv.s.ft.setRootComponent(chd).dp(m);
        return rx.merge(
          // Set chd as an "offsetParent" if it was not already an offset parent
          chd.table.l.isOffsetParent.pipe(
            rx.take(1),
            rx.map(([, isOffsetP]) => isOffsetP ? false : true),
            rx.filter(notOffsetParent => notOffsetParent),
            rx.map(() => {
              const o = chd as BaseWidget & OffsetParent;
              o.focusService = createFocusService({
                ...opts?.default as any,
                ...opts?.focusable
              });
              o.destory$.subscribe(() => o.focusService.dispose());
              s.ft.onFocusServieReady(o, o.focusService).dp(m);
            })
          ),
          // Delete corresponding canvas when chd is removed
          s.pt.removeChild.pipe(
            rx.filter(([, w]) => w === chd),
            rx.take(1),
            rx.map(() => {
              chd.s.ft.isOffsetParent(false).dp(m);
              canvasMap.delete(chd);
            })
          )
        );
      })
    ))
  ));
  r('allDisplayChildren -> last.isOffsetParent', s.pt.allDisplayChildren.pipe(
    rx.filter(([, childrn]) => childrn.length > 0),
    rx.map(([, childrn]) => childrn[childrn.length - 1]),
    rx.distinctUntilChanged(),
    rx.switchMap(last => {
      const waitForFocusService$ = (last as BaseWidget & OffsetParent).focusService != null ?
        rx.of(true) :
        s.pt.onFocusServieReady.pipe(
          rx.filter(() => (last as BaseWidget & OffsetParent).focusService != null),
          rx.take(1),
          rx.map(() => true)
        );
      return waitForFocusService$.pipe(
        rx.map(() => {
          last.s.ft.isOffsetParent(last as BaseWidget & OffsetParent).dp();
        }),
        rx.finalize(() => {
          last.s.ft.isOffsetParent(false).dp();
        })
      );
    })
  ));
  r('querySizeOf', s.pt.querySizeOf.pipe(
    rx.mergeMap(([m, w, h]) => {
      return table.l.allDisplayChildren.pipe(
        rx.take(1),
        rx.mergeMap(([, chdn]) => {
          if (w == null && h != null) {
            return rx.from(chdn).pipe(
              rx.mergeMap(comp => {
                return comp.s.ft.querySizeOf(w, h).re(m).od(
                  comp.s.pt.prefWidthFor
                ).pipe(
                  rx.take(1)
                );
              }),
              rx.reduce((acc, [, w]) => {
                return w > acc ? w : acc;
              }, 0),
              rx.tap(width => s.ft.prefWidthFor(width, h).dp(m))
            );
          } else if (h == null && w != null) {
            return rx.from(chdn).pipe(
              rx.mergeMap(comp => {
                return comp.s.ft.querySizeOf(w, h).re(m).od(
                  comp.s.pt.prefHeightFor
                ).pipe(
                  rx.take(1)
                );
              }),
              rx.reduce((acc, [, , h]) => {
                return h > acc ? h : acc;
              }, 0),
              rx.tap(height => s.ft.prefHeightFor(w, height).dp(m))
            );
          }
          return rx.EMPTY;
        })
      );
    })
  ));
  r('onChildPreferredSizeChange -> preferredSize', table.l.onChildPreferredSizeChange.pipe(
    rx.map(([m, sizes]) => {
      const [xw, xh] = sizes.reduce(([maxW, maxH], [w, h]) => {
        return [maxW > w ? maxW : w, maxH > h ? maxH : h];
      }, [0, 0] as [number, number]);
      s.ft.onContentSizeChange(xw, xh).dp(m);
    })
  ));
  r('reflow -> canvas.setBounding', s.pt.reflow.pipe(
    rx.mergeMap(([m]) => {
      return rx.combineLatest([table.l.onSize, table.l.allDisplayChildren]).pipe(
        rx.take(1),
        rx.map(([[, w, h], [, chdn]]) => {
          s.ft.onChildPositions(new Map<BaseWidget, [number, number]>(chdn.map(chd => [chd, [0, 0] as const] as const))).dp(m);
          for (const cv of canvasMap.values()) {
            cv.s.ft.setBounding(0, 0, w, h).dp(m);
          }
        })
      );
    })
  ));
  /*
  r('addChild,insertChild,c.setDisplay -> onChildLayerHidden', rx.merge(
    s.pt.addChild.pipe(
      rx.map(([, ...chd]) => chd)
    ),
    s.pt.insertChild.pipe(
      rx.map(([, , chd]) => chd)
    )
  ).pipe(
    rx.mergeMap(chd => {
      return rx.from(chd).pipe(
        rx.map(c => c)
      );
    }),
    rx.mergeMap(c => rx.merge(
      c.table.l.setDisplay.pipe(
        rx.scan(([, prevDis], setDisplay) => {
          const [m2, display] = setDisplay;
          if ((prevDis === DisplayMode.visible) && (display === DisplayMode.none || display === DisplayMode.hidden)) {
            s.ft.onChildLayerHidden(c).dp(m2);
          }
          return setDisplay;
        }),
        rx.takeUntil(s.pt.removeChild.pipe(
          rx.filter(([, ...removed]) => removed.some(d => c === d))
        )),
        rx.takeUntil(c.destory$)
      ),
      s.pt.removeChild.pipe(
        rx.map(([m, ...chd]) => {
          for (const c of chd) {
            s.ft.onChildLayerHidden(c).dp(m);
          }
        })
      )
    ))
  ));
  */
  r('onRender', s.pt.onRender.pipe(
    rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => rx.combineLatest(
      table.l.allDisplayChildren.pipe(
        rx.take(1),
        rx.mergeMap(([, chrd]) => chrd),
        rx.reduce((acc, chr) => {
          acc.push(chr);
          return acc;
        }, [] as BaseWidget[])
      ),
      table.l.bgCleared
    ).pipe(
      rx.take(1),
      rx.mergeMap(([children, [, bgCleared]]) => {
        if (!bgCleared) {
          s.ft.clear(canvas, trans).dp();
        }
        if (renderSelf) {
          s.ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
        }
        const allMasks = [] as Rectangle[];
        const last = children.length - 1;
        return rx.concat(
          // From top layer to bottom, render them to corresponding offline canvas,
          // so that get a tree of bounding box of all child compnents of each layer.
          // The bounding box tree is treated as "mask" array being given to next
          // lower layer's rendering parameter
          rx.from(children.slice(0).reverse()).pipe(
            rx.concatMap((chd, i) => {
              const canvasOfChd = canvasMap.get(chd)!;
              const isBottomLayer = i === last;
              const idx = last - i;
              s.ft.renderChild(idx, chd, canvasOfChd, trans, clips, allMasks).dp(m);
              return isBottomLayer ? rx.EMPTY : getBoundingOfCompTree(chd).pipe(rx.take(1));
            }),
            rx.map(rects => {
              service.log('-- getBoundingOfCompTree', rects.join());
              allMasks.push(...rects);
            })
          ),
          rx.from(children).pipe(
            // rx.skip(1), // the 1st has been directly rendered to outer canvas
            rx.map(chd => canvasMap.get(chd)!),
            rx.concatMap(c => {
              return copyCanvas(c, canvas, m);
            })
          )
        );
      })
    ))
  ));
  r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(
    rx.withLatestFrom(s.pt.allDisplayChildren),
    rx.mergeMap(([[m, ...rect], [, chdr]]) => {
      const last = chdr[chdr.length - 1];
      return last.table.l.isContainer.pipe(
        rx.concatMap(([, isContainer]) => {
          if (!isContainer) {
            s.ft.didFindOverlaps([last]).dp(m);
            return rx.EMPTY;
          }
          const comp = last as TerminalContainer;
          return comp.s.ft.findOverlaps(...rect).re(m).od(
            comp.s.pt.didFindOverlaps
          ).pipe(
            rx.take(1),
            rx.map(([m2, comps]) => s.ft.didFindOverlaps(comps.concat(comp)).dp(m, m2))
          );
        })
      );
    })
  ));
  function copyCanvas(source: TerminalCanvas, canvas: TerminalCanvas, m: ActionMeta) {
    return source.table.l.setBounding.pipe(
      rx.take(1),
      rx.mergeMap(([, , , w, h]) => {
        return source.s.ft.copyRect(0, 0, w, h).re(m).od(source.s.pt.onCopyRect);
      }),
      rx.map(([, lines]) => {
        for (const [x, , y, units, style] of lines) {
          canvas.s.ft.addDisplayUnits(x, y, units, [style] as unknown as TextStyle).dp(m);
        }
      }),
      rx.take(1)
    );
  }
  s.ft.hasOfflineCanvas(true).dp();
});
export interface ElevatorOptions {
  default?: CoreOptions;
  core?: CreateOptsOfFac<typeof elevatorFac>;
  /** Internal canvas */
  canvas?: TerminalCanvasOptions;
  focusable?: FocusableOptions;
}
export type ElevatorContainer = SimplexReactorOfFac<typeof elevatorFac>;
export function createElevator(opts?: ElevatorOptions) {
  return elevatorFac.create(opts);
}
export function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]> {
  return rx.combineLatest([
    c.table.l.setDisplay,
    isContainerWithoutOfflineCanvas(c) ?
      rx.combineLatest([c.table.l.setBackground, c.table.l.isOpaque]) :
      rx.of([[null, ''], [null, false]] as const)
  ]).pipe(
    rx.switchMap(([[, d], [[, bg], [, isOpaque]]]) => {
      if (d !== DisplayMode.visible)
        return rx.of([] as Rectangle[]);
      else if (bg != null || isOpaque) {
        return c.table.l.onBoundingBox.pipe(
          rx.map(([, r]) => [r])
        );
      } else {
        const p = c as TerminalContainer;
        return rx.concat(
          p.table.l.allChildren.pipe(
            rx.take(1)
          ),
          rx.merge(p.s.pt.addChild, p.s.pt.insertChild, p.s.pt.removeChild).pipe(
            rx.switchMap(() => p.table.l.allChildren.pipe(
              rx.take(1)
            ))
          )
        ).pipe(
          rx.mergeMap(([, chrd]) => chrd.length > 0 ?
            rx.combineLatest(
              chrd.map(it => getBoundingOfCompTree(it))
            ) :
            rx.of([])),
          rx.map(chrdArr => chrdArr.flat())
        );
      }
    })
  );
}
function isContainerWithoutOfflineCanvas(root: any): root is TerminalContainer {
  const container = (root as TerminalContainer).table.getData();
  return container.allChildren != null &&
    container.hasOfflineCanvas[0] === false;
}
