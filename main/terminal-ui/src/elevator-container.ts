import * as rx from 'rxjs';
import {CoreOptions, SingleActionFactory, SimplexReactorOfFac, CreateOptsOfFac, ActionMeta} from '@wfh/reactivizer';
import {DisplayMode} from './base';
import {TerminalContainer} from './container';
import {rootFocusSvcFac, RootFocusServiceOpts, RootFocusService} from './focusable';
import {baseContainerFac} from './container';
import {KeyEventServcie} from './keyEvent';
import {BaseWidget, Rectangle, TerminalCanvas,
  createTerminalCanvas, TerminalCanvasOptions, TextStyle} from './index';

interface ElevatorActions {
  /** @param layerIndex 0 based number, this message simply triggers "setDisplay" on child component */
  toggleLayer(layerIndex: number, visible: boolean): SingleActionFactory;
}
interface ElevatorEvents extends ElevatorActions {
  onFocusServieReady(chd: BaseWidget): SingleActionFactory;
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
)).defineReactor((init, keyEventSvc: KeyEventServcie, opts?: ElevatorOptions) => {
  const service = init({...opts?.default as any, ...opts?.core});
  const {ft, pt, s, r, table} = service;
  // let lastBottom: BaseWidget | undefined;
  /** Offline canvas by root component */
  const canvasMap = new Map<BaseWidget, TerminalCanvas>();
  const focusSvcMap = new Map<BaseWidget, RootFocusService>();
  r('addChild,insertChild, removeChild -> "canvasMap"', rx.merge(
    pt.addChild.pipe(
      rx.map(([m, ...chdn]) => [m, chdn] as const)
    ),
    pt.insertChild.pipe(
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
        cv.ft.setRootComponent(chd).dp(m);
        const rootFoc = rootFocusSvcFac.create(cv, {
          name: s.logPrefix + '.focus',
          ...(opts?.default as RootFocusServiceOpts | undefined),
          ...opts?.focusable
        });
        focusSvcMap.set(chd, rootFoc);
        rootFoc.ft.forRootComp(chd).dp(m);
        chd.ft.provideContext('rootFocus', rootFoc).dp(m);
        rootFoc.ft.handleKeyEvents(keyEventSvc).dp(m);
        ft.onFocusServieReady(chd).dp(m);
        // Delete corresponding canvas when chd is removed
        return pt.removeChild.pipe(
          rx.filter(([, w]) => w === chd),
          rx.take(1),
          rx.map(() => {
            canvasMap.delete(chd);
            rootFoc.dispose();
            cv.dispose();
          })
        );
      })
    ))
  ));
  r('allDisplayChildren -> last.isOffsetParent', pt.allDisplayChildren.pipe(
    rx.filter(([, childrn]) => childrn.length > 0),
    rx.map(([, childrn]) => childrn[childrn.length - 1]),
    rx.distinctUntilChanged(),
    rx.switchMap(last => {
      const waitForFocusService$ = rx.concat(
        rx.of(focusSvcMap.get(last)),
        pt.onFocusServieReady.pipe(
          rx.filter(([, readyChd]) => readyChd === last),
          rx.take(1),
          rx.map(() => focusSvcMap.get(last))
        )
      ).pipe(
        rx.filter(focusSvc => focusSvc != null),
        rx.take(1)
      );
      return waitForFocusService$.pipe(
        rx.mergeMap(focusSvc => {
          focusSvc.ft.resumeHandleEvents().dp();
          return new rx.Observable(() => () => {
            focusSvc.ft.pauseHandleEvents().dp();
          });
        })
      );
    })
  ));
  r('querySizeOf', pt.querySizeOf.pipe(
    rx.mergeMap(([m, w, h]) => {
      return table.l.allDisplayChildren.pipe(
        rx.take(1),
        rx.mergeMap(([, chdn]) => {
          if (w == null && h != null) {
            return rx.from(chdn).pipe(
              rx.mergeMap(comp => {
                return comp.ft.querySizeOf(w, h).re(m).od(
                  comp.pt.prefWidthFor
                ).pipe(
                  rx.take(1)
                );
              }),
              rx.reduce((acc, [, w]) => {
                return w > acc ? w : acc;
              }, 0),
              rx.tap(width => ft.prefWidthFor(width, h).dp(m))
            );
          } else if (h == null && w != null) {
            return rx.from(chdn).pipe(
              rx.mergeMap(comp => {
                return comp.ft.querySizeOf(w, h).re(m).od(
                  comp.pt.prefHeightFor
                ).pipe(
                  rx.take(1)
                );
              }),
              rx.reduce((acc, [, , h]) => {
                return h > acc ? h : acc;
              }, 0),
              rx.tap(height => ft.prefHeightFor(w, height).dp(m))
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
      ft.onContentSizeChange(xw, xh).dp(m);
    })
  ));
  r('reflow -> canvas.setBounding', pt.reflow.pipe(
    rx.mergeMap(([m]) => {
      return rx.combineLatest([table.l.onSize, table.l.allDisplayChildren]).pipe(
        rx.take(1),
        rx.map(([[, w, h], [, chdn]]) => {
          ft.onChildPositions(new Map<BaseWidget, [number, number]>(chdn.map(chd => [chd, [0, 0] as const] as const))).dp(m);
          for (const cv of canvasMap.values()) {
            cv.ft.setBounding(0, 0, w, h).dp(m);
          }
        })
      );
    })
  ));
  r('onRender', pt.onRender.pipe(
    rx.switchMap(([m, canvas, trans, renderSelf, clips, masks]) => rx.combineLatest([
      table.l.allDisplayChildren.pipe(
        rx.take(1),
        rx.mergeMap(([, chrd]) => chrd),
        rx.reduce((acc, chr) => {
          acc.push(chr);
          return acc;
        }, [] as BaseWidget[])
      ),
      table.l.bgCleared
    ]).pipe(
      rx.take(1),
      rx.mergeMap(([children, [, bgCleared]]) => {
        if (!bgCleared) {
          ft.clear(canvas, trans).dp();
        }
        if (renderSelf) {
          ft.renderSelf(canvas, trans, clips, masks ?? []).dp(m);
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
              ft.renderChild(idx, chd, canvasOfChd, trans, clips, allMasks).dp(m);
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
              // c.ft.takeSnapshot({noColor: true, type: 'pro'})
              //   .od(c.pt.didTakeSnapshot).pipe(
              //     rx.take(1),
              //     rx.map(([, lineIt]) => {
              //       service.log('--layer snapshot\n', [...lineIt].join(''));
              //     })
              //   ).subscribe();
              return copyCanvas(c, canvas, m);
            })
          )
        );
      })
    ))
  ));
  r('findOverlaps -> didFindOverlaps', pt.findOverlaps.pipe(
    rx.withLatestFrom(pt.allDisplayChildren),
    rx.mergeMap(([[m, ...rect], [, chdr]]) => {
      const last = chdr[chdr.length - 1];
      return last.table.l.isContainer.pipe(
        rx.concatMap(([, isContainer]) => {
          if (!isContainer) {
            ft.didFindOverlaps([last]).dp(m);
            return rx.EMPTY;
          }
          const comp = last as TerminalContainer;
          return comp.ft.findOverlaps(...rect).re(m).od(
            comp.pt.didFindOverlaps
          ).pipe(
            rx.take(1),
            rx.map(([m2, comps]) => ft.didFindOverlaps(comps.concat(comp)).dp(m, m2))
          );
        })
      );
    })
  ));
  function copyCanvas(source: TerminalCanvas, canvas: TerminalCanvas, m: ActionMeta) {
    return source.table.l.setBounding.pipe(
      rx.take(1),
      rx.mergeMap(([, , , w, h]) => {
        return source.ft.copyRect(0, 0, w, h).re(m).od(source.pt.didCopyRect);
      }),
      rx.map(([, lines]) => {
        for (const [x, , y, units, style] of lines) {
          canvas.ft.addDisplayUnits(x, y, units, [style] as unknown as TextStyle).dp(m);
        }
      }),
      rx.take(1)
    );
  }
  ft.hasOfflineCanvas(true).dp();
});
export interface ElevatorOptions {
  default?: CoreOptions;
  core?: CreateOptsOfFac<typeof elevatorFac>;
  /** Internal canvas */
  canvas?: TerminalCanvasOptions;
  focusable?: RootFocusServiceOpts;
}
export type ElevatorContainer = SimplexReactorOfFac<typeof elevatorFac>;
export function createElevator(keyEventSvc: KeyEventServcie, opts?: ElevatorOptions) {
  return elevatorFac.create(keyEventSvc, opts);
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
          rx.merge(p.pt.addChild, p.pt.insertChild, p.pt.removeChild).pipe(
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
