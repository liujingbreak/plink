import * as rx from 'rxjs';
import {CoreOptsOfExtSmplxRctr, SingleActionFactory, ActionDispenser} from '@wfh/reactivizer';
import {createContainerBase, BaseWidget, TerminalContainer, Rectangle, TerminalCanvas,
  createTerminalCanvas, DisplayMode, TextStyle} from './index';

interface ElevatorActions {
  /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
  toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
export function createElevator(opts: CoreOptsOfExtSmplxRctr<TerminalContainer, ElevatorActions>) {
  const base = createContainerBase(opts as any);
  const service = base.config({name: 'Elevator'});
  const {s, r, table} = service;
  const canvasMap = new Map<BaseWidget, TerminalCanvas>();
  // intercept "onRender"
  base.s.interceptor$.next(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof base.s>(action$);
    return rx.merge(
      dispenser.at.onRender.pipe(
        rx.ignoreElements()
      ),
      dispenser.ofOtherTypes()
    );
  });
  const prependCtl = service.s.prependController();
  r('addChild, removeChild -> "canvasMap"', s.pt.addChild.pipe(
    rx.mergeMap(([m, ...chd]) => rx.from(chd).pipe(
      rx.mergeMap(chd => {
        const cv = createTerminalCanvas({
          debug: opts.debug,
          log: opts.log,
          name: 'Elevator.canvas'
        });
        canvasMap.set(chd, cv);
        cv.s.ft.setRootComponent(chd).dp(m);
        return s.pt.removeChild.pipe(
          rx.filter(([, w]) => w === chd),
          rx.take(1),
          rx.map(() => {
            canvasMap.delete(chd);
          })
        );
      })
    ))
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
      s.ft.preferredSize(xw, xh).dp(m);
    })
  ));
  r('reflow', s.pt.reflow.pipe(
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
  r('onRender', prependCtl.pt.onRender.pipe(
    rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => table.l.allDisplayChildren.pipe(
      rx.take(1),
      rx.mergeMap(([, chrd]) => chrd),
      rx.reduce((acc, chr) => {
        acc.push(chr);
        return acc;
      }, [] as BaseWidget[]),
      rx.mergeMap(children => {
        if (renderSelf)
          s.ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
        const allMasks = [] as Rectangle[];
        const last = children.length - 1;
        return rx.concat(
          rx.from(children.slice(0).reverse()).pipe(
            rx.concatMap((chd, i) => {
              const canvasOfChd = canvasMap.get(chd)!;
              const isBottomLayer = i === last;
              const idx = last - i;
              s.ft.renderChild(idx, chd, isBottomLayer ? canvas : canvasOfChd, trans, clips, allMasks).dp(m);
              return isBottomLayer ? rx.EMPTY : getBoundingOfCompTree(chd).pipe(rx.take(1));
            }),
            rx.map(rects => {
              service.log('-- getBoundingOfCompTree', rects.join());
              allMasks.push(...rects);
            })
          ),
          rx.from(children).pipe(
            // rx.tap(chd => service.log('>>>', chd.s.logPrefix)),
            rx.skip(1), // the 1st has been dorectly rendered to outer canvas
            rx.map(chd => canvasMap.get(chd)!),
            rx.concatMap(c => {
              return c.table.l.setBounding.pipe(
                rx.take(1),
                rx.mergeMap(([, , , w, h]) => {
                  return c.s.ft.copyDirtyRectAndClear(0, 0, w, h).re(m).od(c.s.pt.onCopyRect);
                }),
                rx.map(([, lines]) => {
                  for (const [x, , y, units, style] of lines) {
                    canvas.s.ft.addDisplayUnits(x, y, units, [style] as unknown as TextStyle).dp(m);
                  }
                }),
                rx.take(1)
              );
            })
          )
        );
      })
    ))
  ));
  return service;
}
export function getBoundingOfCompTree(c: BaseWidget): rx.Observable<Rectangle[]> {
  return rx.combineLatest([
    c.table.l.setDisplay,
    isContainerWithoutOfflineCanvas(c) ? c.table.l.setBackground : rx.of([null, ''])
  ]).pipe(
    rx.switchMap(([[, d], [, bg]]) => {
      if (d !== DisplayMode.visible)
        return rx.of([] as Rectangle[]);
      else if (bg != null) {
        return c.table.l.onBoundingBox.pipe(
          rx.map(([, r]) => [r])
        );
      } else {
        const p = c as TerminalContainer;
        return rx.concat(
          p.table.l.allChildren.pipe(
            rx.take(1)
          ),
          rx.merge(p.s.pt.addChild, p.s.pt.removeChild).pipe(
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
// export function unionRectangles(rects: Iterable<Rectangle>) {
//   let curr: Rectangle | undefined;
//   for (const rect of rects) {
//     const [x, y, w, h] = rect;
//     if (curr != null) {
//       if (x < curr[0])
//         curr[0] = x;
//       if (y < curr[1])
//         curr[1] = y;
//       if (x + w > curr[0] + curr[2])
//         curr[2] = x + w - curr[0];
//       if (y + h > curr[1] + curr[3])
//         curr[3] = y + h - curr[1];
//     }
//   }
//   return curr;
// }
