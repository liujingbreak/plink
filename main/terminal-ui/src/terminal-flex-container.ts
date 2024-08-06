import * as rx from 'rxjs';
import {vec2, mat4} from 'gl-matrix';
import {CoreOptsOfExtSmplxRctr, SimplexReactorMergeType, SingleActionFactory, ActionDispenser, SimplexReactor} from '@wfh/reactivizer';
import {rectIntersection} from './terminal-canvas';
import {TerminalContainer, createContainerBase, BaseWidget} from './terminal-widget';
import {RectangleOverlapTree} from './rectangle-overlap-tree';

export interface FlexContainerInput {
  setDirection(dir: 'col' | 'row'): SingleActionFactory;
  justifyContent(value: 'stretch' | 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
  alignItems(value: 'start' | 'center' | 'end'): SingleActionFactory;
  setBorderSpacing(value: number): SingleActionFactory;
}

export interface FlexContainerEvents {
  onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}

const tableForFlexContainer = ['setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing'] as const;

export type FlexContainer = SimplexReactorMergeType<TerminalContainer, SimplexReactor<FlexContainerInput & FlexContainerEvents, typeof tableForFlexContainer>>;

export function createFlexContainer(opts: CoreOptsOfExtSmplxRctr<TerminalContainer, FlexContainerInput & FlexContainerEvents> = {}) {
  const base = createContainerBase({name: 'listContainer', ...opts as any});
  const listContainer = base.config<FlexContainerInput & FlexContainerEvents, typeof tableForFlexContainer>({tableFor: tableForFlexContainer});
  let childrenPosition: vec2[];
  // const childToIdx = new Map<unknown, number>();

  // intercept "renderChild, onRender"
  base.s.interceptor$.next(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof base.s>(action$);
    return rx.merge(
      dispenser.at.renderChild.pipe(
        rx.ignoreElements()
      ),
      dispenser.at.onRender.pipe(
        rx.ignoreElements()
      ),
      dispenser.ofOtherTypes()
    );
  });

  const prependCtl = listContainer.s.prependController();
  const childBoundingTree = new RectangleOverlapTree<BaseWidget>();
  const {r, table, s} = listContainer;
  const {ft} = s;
  r('querySizeOf -> prefHeightFor, preferredSize', listContainer.s.pt.querySizeOf.pipe(
    rx.withLatestFrom(
      table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent,
      table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing
    ),
    rx.switchMap(([[m, w, h], [, children], [, chrPreferredSizes], [, _justifyContent], [, _alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
      let mainAxis = w;
      let crossAxis = h;
      let pMainAxis = pWidth;
      const pCrossAxis = pHeight;
      if (dir === 'col') {
        mainAxis = h;
        crossAxis = w;
        pMainAxis = pHeight;
      }
      if (mainAxis != null) {
        if (mainAxis > pMainAxis) {
          if (dir === 'row')
            ft.prefHeightFor(mainAxis, pHeight).dp(m);
          else
            ft.prefWidthFor(pWidth, mainAxis).dp(m);
          return rx.EMPTY;
        } else {
          const childrenSizeOfMainAxis = shrinkEachSize(
            dir === 'row' ? chrPreferredSizes.map(([w]) => w) : chrPreferredSizes.map(([, h]) => h), mainAxis - marginWidth * (children.length - 1));
          return rx.merge(...children.map((chr, idx) => {
            return dir === 'row' ?
              chr.s.ft.querySizeOf(childrenSizeOfMainAxis[idx], null).re(m).od(chr.s.pt.prefHeightFor).pipe(
                rx.take(1),
                rx.map(([, , h]) => h)
              ) :
              chr.s.ft.querySizeOf(null, childrenSizeOfMainAxis[idx]).re(m).od(chr.s.pt.prefWidthFor).pipe(
                rx.take(1),
                rx.map(([, w]) => w)
              );
          })).pipe(
            rx.reduce((max, size) => {
              return Math.max(max, size);
            }, 0),
            rx.map(crossAxisMaxSize => {
              if (dir === 'row')
                ft.prefHeightFor(mainAxis, crossAxisMaxSize).dp(m);
              else
                ft.prefWidthFor(crossAxisMaxSize, mainAxis).dp(m);
            })
          );
        }
      } else if (crossAxis != null) {
        if (crossAxis > pCrossAxis) {
          if (dir === 'row')
            ft.prefWidthFor(pWidth, crossAxis).dp(m);
          else
            ft.prefHeightFor(crossAxis, pHeight).dp(m);
          return rx.EMPTY;
        } else {
          const chrPrefSizeOfCrossAxis = dir === 'row' ? chrPreferredSizes.map(([, h]) => h) : chrPreferredSizes.map(([w]) => w);
          return rx.merge(...children.map((chr, i) => {
            if (chrPrefSizeOfCrossAxis[i] < crossAxis)
              return rx.of(dir === 'row' ? chrPreferredSizes[i][0] : chrPreferredSizes[i][1]);
            return dir === 'row' ?
              chr.s.ft.querySizeOf(null, crossAxis).re(m).od(chr.s.pt.prefWidthFor).pipe(
                rx.take(1),
                rx.map(([, w]) => w)
              ) :
              chr.s.ft.querySizeOf(crossAxis, null).re(m).od(chr.s.pt.prefHeightFor).pipe(
                rx.take(1),
                rx.map(([, , h]) => h)
              );
          })).pipe(
            rx.reduce((mainAxisSize, childMainAxisSize) => {
              mainAxisSize += childMainAxisSize;
              return mainAxisSize;
            }, 0),
            rx.map(mainAxisPrefSize => {
              if (dir === 'row') {
                ft.prefWidthFor(mainAxisPrefSize + marginWidth * (children.length - 1), crossAxis).dp(m);
              } else
                ft.prefHeightFor(crossAxis, mainAxisPrefSize).dp(m);
            })
          );
        }
      }
      return rx.EMPTY;
    })
  ));
  r('reflow, ... -> setLayoutValid, child.onSize, onChangeChildrenSize', listContainer.s.pt.reflow.pipe(
    rx.mergeMap(a => rx.combineLatest([
      table.l.onSize,
      table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent,
      table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing
    ]).pipe(
      rx.take(1),
      rx.map(b => [a, ...b] as const)
    )),
    rx.switchMap(([[m], [, w, h], [, children], [, chrPrefSizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
      ft.setLayoutValid(true).dp(m);
      childrenPosition = [];
      let mainAxis = w;
      let crossAxis = h;
      let pMainAxis = pWidth;
      let pCrossAxis = pHeight;
      const margin = dir === 'row' ? marginWidth : 0;
      if (dir === 'col') {
        mainAxis = h;
        crossAxis = w;
        pMainAxis = pHeight;
        pCrossAxis = pWidth;
      }
      let chrMainAxisSizes: number[];
      let chrCrossAxisSizes = [] as number[];
      const chrMainAxisPrefSizes = dir === 'row' ?
        chrPrefSizes.map(([w]) => w) :
        chrPrefSizes.map(([, h]) => h);
      const chrCrossAxisPrefSizes = dir === 'col' ?
        chrPrefSizes.map(([w]) => w) :
        chrPrefSizes.map(([, h]) => h);
      let calcChdSizes$: rx.Observable<any>;
      if (mainAxis < pMainAxis) {
        chrMainAxisSizes = shrinkEachSize(chrMainAxisPrefSizes, mainAxis - margin * (children.length - 1));
        calcChdSizes$ = rx.forkJoin(dir === 'row' ?
          children.map((chr, i) => chr.s.ft.querySizeOf(chrMainAxisSizes[i], null)
            .re(m).od(chr.s.pt.prefHeightFor).pipe(
              rx.take(1),
              rx.map(([, , h]) => h)
            )
          ) :
          children.map((chr, i) => chr.s.ft.querySizeOf(null, chrMainAxisSizes[i])
            .re(m).od(chr.s.pt.prefWidthFor).pipe(
              rx.take(1),
              rx.map(([, w]) => w)
            )
          )
        ).pipe(
          rx.switchMap(values => values),
          rx.map((value, i) => {
            chrCrossAxisSizes[i] = value > crossAxis ? crossAxis : value;
          })
        );
      } else if (crossAxis < pCrossAxis) {
        chrMainAxisSizes = [];
        for (const v of chrCrossAxisPrefSizes) {
          chrCrossAxisSizes.push(Math.min(v, crossAxis));
        }

        calcChdSizes$ = rx.zip(dir === 'row' ?
          children.map((chr, i) => chr.s.ft.querySizeOf(null, chrCrossAxisSizes[i]).re(m)
            .od(chr.s.pt.prefWidthFor).pipe(
              rx.take(1),
              rx.map(([, w]) => w)
            )) :
          children.map((chr, i) => chr.s.ft.querySizeOf(chrCrossAxisSizes[i], null).re(m)
            .od(chr.s.pt.prefHeightFor).pipe(
              rx.take(1),
              rx.map(([, , h]) => h)
            ))
        ).pipe(
          rx.switchMap(values => values),
          rx.reduce((sum, value) => {
            chrMainAxisSizes.push(value);
            sum += value;
            return sum;
          }, 0),
          rx.mergeMap(sum => {
            if (sum > mainAxis) {
              chrMainAxisSizes = shrinkEachSize(chrMainAxisSizes, mainAxis - margin * (children.length - 1));
              return rx.EMPTY;
            } else {
              return rx.zip(children.map(
                chd => chd.table.l.setFlexGrow.pipe(
                  rx.map(([, grow]) => grow)
                )
              )).pipe(
                rx.take(1),
                rx.map(growOfEach => {
                  chrMainAxisSizes = stretchEachSize(chrMainAxisSizes, growOfEach, mainAxis - margin * (children.length - 1));
                })
              );
            }
          })
        );
      } else {
        chrCrossAxisSizes = [...chrCrossAxisPrefSizes];
        calcChdSizes$ = rx.zip(children.map(
          chd => chd.table.l.setFlexGrow.pipe(
            rx.map(([, grow]) => grow)
          )
        )).pipe(
          rx.take(1),
          rx.map(growOfEach => {
            listContainer.log('growOfEach', growOfEach, 'pref sizes', chrMainAxisPrefSizes);
            chrMainAxisSizes = stretchEachSize(chrMainAxisPrefSizes, growOfEach, mainAxis - margin * (children.length - 1));
            listContainer.log('chrMainAxisSizes', chrMainAxisSizes);
          })
        );
      }
      const setPositions$ = new rx.Observable<void>(sub => {
        let space = mainAxis - (margin * (children.length - 1)) - chrMainAxisSizes.reduce((sum, v) => {
          sum += v;
          return sum;
        }, 0);

        let pos = (justifyContent === 'start' || justifyContent === 'stretch') ?
          0 :
          justifyContent === 'center' ?
            space >> 1 :
            justifyContent === 'end' ?
              space :
              0;

        let baseSpaceBetween = 0;
        for (let i = 0, l = children.length; i < l; i++) {
          const crossSpace = crossAxis - chrCrossAxisSizes[i];
          const crossPos = alignItems === 'start' ? 0 : alignItems === 'center' ? crossSpace >> 1 : crossSpace;
          if (dir === 'row')
            childrenPosition.push([pos, crossPos]);
          else
            childrenPosition.push([crossPos, pos]);
          if (i !== l - 1) {
            const fSpaceBetween = justifyContent === 'space-between' ? space / (l - 1 - i) : 0;
            baseSpaceBetween = Math.floor(fSpaceBetween);
            pos += chrMainAxisSizes[i];
            pos += margin + baseSpaceBetween;
            space -= baseSpaceBetween;
          }
          if (dir === 'row')
            children[i].s.ft.onSize(chrMainAxisSizes[i], chrCrossAxisSizes[i]).dp(m);
          else
            children[i].s.ft.onSize(chrCrossAxisSizes[i], chrMainAxisSizes[i]).dp(m);
        }
        listContainer.log('childrenPosition:', ...childrenPosition.map(pos => '[' + pos.join(', ') + ']'));
        sub.complete();
      });
      return rx.concat(calcChdSizes$.pipe(
        rx.finalize(() => s.ft.onChangeChildrenSize(chrMainAxisSizes, chrCrossAxisSizes).dp(m))
      ), setPositions$).pipe(
        listContainer.catchErrorFor(m)
      );
    })
  ));
  r('reflow -> "childBoundingTree"', s.pt.reflow.pipe(
    rx.switchMap(() => {
      childBoundingTree.clear();
      return table.l.allChildren.pipe(
        rx.take(1),
        rx.mergeMap(([, children]) => children),
        rx.mergeMap((chd, idx) => chd.table.l.onSize.pipe(
          rx.take(1),
          rx.map(([, w, h]) => {
            const [x, y] = childrenPosition[idx];
            childBoundingTree.addContent([x, y, w, h], chd);
            base.log('add child', idx, 'bounding box to tree', x, y, w, h);
          })
        ))
      );
    })
  ));
  r('onChildPreferredSizeChange,... -> preferredSize', rx.combineLatest([
    listContainer.s.pt.onChildPreferredSizeChange,
    table.l.setDirection, table.l.setBorderSpacing
  ]).pipe(
    rx.map(([[m, sizes], [, direction], [, marginWidth]]) => {
      if (direction === 'row') {
        const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
          preferred[0] += w;
          if (h > preferred[1])
            preferred[1] = h;
          return preferred;
        }, [0, 0] as const);
        finalPreferredSize[0] += marginWidth * (sizes.length - 1);
        ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
      } else if (direction === 'col') {
        const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
          preferred[1] += h;
          if (w > preferred[0])
            preferred[0] = w;
          return preferred;
        }, [0, 0] as const);
        ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
      }
    })
  ));
  r('onRender -> renderSelf, renderChild', prependCtl.pt.onRender.pipe(
    rx.withLatestFrom(table.l.allChildren),
    rx.map(([[m, canvas, trans, renderSelf, area], [, children]]) => {
      if (renderSelf)
        s.ft.renderSelf(canvas, trans, area).dp(m);
      const chrToRender = childBoundingTree.searchOverlaps(area);
      for (let i = 0, l = chrToRender.length; i < l; i++) {
        const chr = children[i];
        s.ft.renderChild(i, chr, canvas, trans, area).dp(m);
      }
    })
  ));
  r('renderChild, "childrenPosition" -> child.render', prependCtl.pt.renderChild.pipe(
    rx.switchMap(([m, index, chr, canvas, trans, renderArea]) => chr.table.l.onSize.pipe(
      rx.take(1),
      rx.map(([, width, height]) => {
      // listContainer.log('.renderChild', index, ': childrenPosition:', ...childrenPosition[index]);
        const [x, y] = childrenPosition[index];
        const intersection = rectIntersection([x, y, width, height], renderArea);
        if (intersection) {
          intersection[0] -= x;
          intersection[1] -= y;
        }
        const tranOfChild = mat4.fromTranslation(mat4.create(), [x, y, 0]);
        mat4.mul(tranOfChild, trans, tranOfChild);
        chr.s.ft.render(canvas, tranOfChild, intersection ?? undefined).re(m).dp();
      })
    ))
  ));
  r('init', new rx.Observable<never>(() => {
    ft.setDirection('row').dp();
    ft.alignItems('center').dp();
    ft.justifyContent('stretch').dp();
    ft.setBorderSpacing(1).dp();
    for (const a$ of [
      s.pt.setDirection, s.pt.setBorderSpacing,
      s.pt.alignItems, s.pt.justifyContent, s.pt.setBackground
    ]) {
      ft.addReflowAction(a$).dp();
    }
  })
  );
  return listContainer;
}

function shrinkEachSize(individualPrefSizes: number[], totalSpace: number) {
  const prefSizeTotal = individualPrefSizes.reduce((prev, curr) => prev + curr);
  const ratio = totalSpace / prefSizeTotal;
  const chrSizes = [] as number[];
  let floatGap = 0;
  for (const preSize of individualPrefSizes) {
    const fSize = preSize * ratio;
    let size = Math.floor(fSize);
    floatGap += fSize - size;
    if (floatGap > 1) {
      size++;
      floatGap--;
    }
    chrSizes.push(size);
  }
  return chrSizes;
}

function stretchEachSize(prefSizes: number[], growOfEach: number[], totalSpace: number) {
  const remaining = totalSpace - prefSizes.reduce((sum, size) => {
    sum += size;
    return sum;
  }, 0);
  if (remaining <= 0)
    return shrinkEachSize(prefSizes, totalSpace);

  const totalGrow = growOfEach.reduce((total, grow) => {
    total += grow;
    return total;
  }, 0);
  if (totalGrow <= 0)
    return prefSizes;
  const growUnit = remaining / totalGrow;
  let floatGap = 0;
  return prefSizes.map((pref, i) => {
    const growSize = growUnit * growOfEach[i];
    let iGrowSize = Math.floor(growSize);
    floatGap += growSize - iGrowSize;
    if (floatGap > 1) {
      iGrowSize += 1;
      floatGap -= 1;
    }
    return iGrowSize + pref;
  });
}

