import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {SingleActionFactory, actionRelatedToAction, CreateOptsInDef, SimplexReactorOfFac} from '@wfh/reactivizer';
import {BaseWidget} from './base';
import {baseContainerFac, TerminalContainer} from './container';
import {TextStyle, rectIntersection, Rectangle} from './canvas';
import {RectangleOverlapTree} from './rectangle-overlap-tree';

export enum FlexBorderSeparator {
  none, line
}
export interface FlexContainerInput {
  setDirection(dir: 'col' | 'row'): SingleActionFactory;
  justifyContent(value: 'stretch' | 'start' | 'center' | 'end' | 'space-between'): SingleActionFactory;
  alignItems(value: 'stretch' | 'start' | 'center' | 'end'): SingleActionFactory;
  /** Effective only when "setDirection" is `"row"`, default is 1 */
  setBorderSpacing(value: number): SingleActionFactory;
  /** Effective only when "setDirection" is `"row"` */
  setBorderSeparator(separator: FlexBorderSeparator): SingleActionFactory;
  setBorderSeparatorStyle(style: TextStyle): SingleActionFactory;
  setLazyLoad(enableLazy: boolean, handler?: (pageIndex: number) => rx.Observable<[key: unknown, comp: (BaseWidget | string)]>): SingleActionFactory;
}

export interface FlexContainerEvents extends FlexContainerInput {
  onChangeChildrenSize(mainAxisSize: number[], crossAxisSize: number[]): SingleActionFactory;
}

const tableForFlexContainer = [
  'setDirection', 'alignItems', 'justifyContent', 'setBorderSpacing', 'setBorderSeparator',
  'setBorderSeparatorStyle'
] as const;
export const flexContainerFac = baseContainerFac.forExtend<FlexContainerEvents, typeof tableForFlexContainer>({
  name: 'flexContainer',
  tableFor: tableForFlexContainer
}).interceptorForBaseByType(ac => rx.merge(
  ac.at.onRender.pipe(
    rx.ignoreElements()
  ),
  ac.at.findOverlaps.pipe(
    rx.ignoreElements()
  ),
  ac.ofOtherTypes()
)).defineReactor((init, opts?: FlexContainerOpts) => {
  const listContainer = init(opts);
  const childBoundingTree = new RectangleOverlapTree<[number, BaseWidget]>();
  const {r, table, s} = listContainer;
  const {ft} = s;
  const separatorPos = [] as number[];
  r('querySizeOf,... -> prefHeightFor, prefWidthFor', listContainer.s.pt.querySizeOf.pipe(
    rx.withLatestFrom(
      table.l.allDisplayChildren,
      table.l.onChildPreferredSizeChange, table.l.justifyContent,
      table.l.alignItems, table.l.preferredSize,
      table.l.setDirection, table.l.setBorderSpacing,
      table.l.setBorderSeparator
    ),
    rx.switchMap(([[m, w, h], [, children], [, chrPreferredSizes], [, _justifyContent], [, _alignItems], [, pWidth, pHeight], [, dir], [, marginWidth], [, borderSep]]) => {
      let mainAxis = w;
      let crossAxis = h;
      let pMainAxis = pWidth;
      const pCrossAxis = pHeight;
      if (dir === 'col') {
        mainAxis = h;
        crossAxis = w;
        pMainAxis = pHeight;
        marginWidth = 0;
        borderSep = FlexBorderSeparator.none;
      }
      if (mainAxis != null) {
        if (mainAxis > pMainAxis) {
          if (dir === 'row')
            ft.prefHeightFor(mainAxis, pHeight).dp(m);
          else
            ft.prefWidthFor(pWidth, mainAxis).dp(m);
          return rx.EMPTY;
        } else {
          const sep = borderSep === FlexBorderSeparator.line ? 1 + 2 * marginWidth : marginWidth;
          const availableSpace = mainAxis - (children.length > 1 ? sep * children.length - 1 : 0);
          const childrenSizeOfMainAxis$ = rx.combineLatest(children.map(
            chd => chd.table.l.setFlexShrink.pipe(
              rx.map(([, v]) => v)
            )
          )).pipe(
            rx.take(1),
            rx.map(shrinks => shrinkEachSize(
              dir === 'row' ? chrPreferredSizes.map(([w]) => w) : chrPreferredSizes.map(([, h]) => h),
              shrinks,
              availableSpace
            ))
          );
          return childrenSizeOfMainAxis$.pipe(
            rx.mergeMap(childrenSizeOfMainAxis => rx.merge(...children.map((chr, idx) => {
              return dir === 'row' ?
                chr.s.ft.querySizeOf(childrenSizeOfMainAxis[idx], null).re(m).od(chr.s.pt.prefHeightFor).pipe(
                  rx.take(1),
                  rx.map(([, , h]) => h)
                ) :
                chr.s.ft.querySizeOf(null, childrenSizeOfMainAxis[idx]).re(m).od(chr.s.pt.prefWidthFor).pipe(
                  rx.take(1),
                  rx.map(([, w]) => w)
                );
            }))),
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
                const sep = borderSep === FlexBorderSeparator.line ? 1 + 2 * marginWidth : marginWidth;
                ft.prefWidthFor(mainAxisPrefSize + sep * (children.length - 1), crossAxis).dp(m);
              } else
                ft.prefHeightFor(crossAxis, mainAxisPrefSize).dp(m);
            })
          );
        }
      }
      return rx.EMPTY;
    })
  ));
  r('reflow -> "childBoundingTree"', s.pt.reflow.pipe(
    rx.switchMap(([m]) => {
      childBoundingTree.clear();
      return rx.combineLatest([
        s.pt.onChildPositions.pipe(
          actionRelatedToAction(m)
        ),
        table.l.allDisplayChildren
      ]).pipe(
        rx.take(1),
        rx.mergeMap(([[, pos], [, children]]) => children.map((chd) => [chd, pos.get(chd)!] as const)),
        rx.mergeMap(([chd, pos], idx) => chd.table.l.onSize.pipe(
          rx.take(1),
          rx.map(([, w, h]) => {
            const [x, y] = pos;
            childBoundingTree.addContent([x, y, w, h], [idx, chd]);
          })
        ))
      );
    })
  ));
  r('reflow, ... -> onChildPositions, child.onSize, onChangeChildrenSize', listContainer.s.pt.reflow.pipe(
    rx.mergeMap(a => rx.combineLatest(reflowData).pipe(
      rx.take(1),
      rx.map(b => [a, ...b] as const)
    )),
    rx.switchMap(([
      [m], [, w, h], [children, growOfEach, shrinkOfEach], [, chrPrefSizes], [, justifyContent],
      [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth], [, borderSep]
    ]) => {
      const childrenPosition = new Map<BaseWidget, [number, number]>();
      let mainAxis = w;
      let crossAxis = h;
      let pMainAxis = pWidth;
      let pCrossAxis = pHeight;
      let margin = dir === 'row' ? marginWidth : 0;
      if (dir === 'col') {
        mainAxis = h;
        crossAxis = w;
        pMainAxis = pHeight;
        pCrossAxis = pWidth;
        borderSep = FlexBorderSeparator.none;
      } else {
        margin = borderSep === FlexBorderSeparator.line ? 1 + 2 * margin : margin;
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
        let chdPrefMainChanged$ = rx.of(chrMainAxisPrefSizes);
        listContainer.log('::case mainAxis < pMainAxis');
        if (crossAxis < pCrossAxis) {
          listContainer.log('::case mainAxis < pMainAxis && crossAxis < pCrossAxis');
          chdPrefMainChanged$ = rx.zip(children.map((chd, i) => dir === 'row' ?
            chd.s.ft.querySizeOf(null, chrCrossAxisPrefSizes[i] > crossAxis ? crossAxis : chrCrossAxisPrefSizes[i])
              .re(m).od(chd.s.pt.prefWidthFor).pipe(
                rx.map(([, w]) => w)
              ) :
            chd.s.ft.querySizeOf(chrCrossAxisPrefSizes[i] > crossAxis ? crossAxis : chrCrossAxisPrefSizes[i], null)
              .re(m).od(chd.s.pt.prefHeightFor).pipe(
                rx.map(([, , h]) => h)
              )
          )).pipe(rx.take(1));
        }
        let remainSpace = mainAxis - margin * (children.length > 0 ? children.length - 1 : 0);
        if (remainSpace < 0)
          remainSpace = 0;
        calcChdSizes$ = chdPrefMainChanged$.pipe(
          rx.mergeMap(chdMainPrefSize => {
            chrMainAxisSizes = shrinkEachSize(chdMainPrefSize, shrinkOfEach, remainSpace);
            listContainer.log(':: chdMainPrefSize', chdMainPrefSize.join(),
              'shrinkOfEach=', shrinkOfEach,
              'remainSpace=', remainSpace,
              'chrMainAxisSizes', chrMainAxisSizes);
            return rx.forkJoin(dir === 'row' ?
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
            );
          }),
          rx.map((prefCrossSizeOfEach) => {
            if (alignItems !== 'stretch') {
              chrCrossAxisSizes.push(...prefCrossSizeOfEach.map(pref => pref > crossAxis ? crossAxis : pref));
              return rx.EMPTY;
            } else {
              chrCrossAxisSizes = children.map(() => crossAxis);
            }
          })
        );
      } else if (crossAxis < pCrossAxis) {
        chrMainAxisSizes = [];
        if (alignItems === 'stretch') {
          chrCrossAxisSizes = children.map(() => crossAxis);
        } else {
          for (const v of chrCrossAxisPrefSizes) {
            chrCrossAxisSizes.push(Math.min(v, crossAxis));
          }
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
          rx.take(1),
          rx.switchMap(values => values),
          rx.reduce((sum, value) => {
            chrMainAxisSizes.push(value);
            sum += value;
            return sum;
          }, 0),
          rx.mergeMap(sum => {
            if (sum > mainAxis) {
              chrMainAxisSizes = shrinkEachSize(chrMainAxisSizes, shrinkOfEach, mainAxis - margin * (children.length - 1));
              return rx.EMPTY;
            } else {
              chrMainAxisSizes = stretchEachSize(chrMainAxisSizes, growOfEach, shrinkOfEach, mainAxis - margin * (children.length - 1));
              return rx.EMPTY;
            }
          })
        );
      } else {
        chrCrossAxisSizes = [...chrCrossAxisPrefSizes];
        chrMainAxisSizes = stretchEachSize(chrMainAxisPrefSizes, growOfEach, shrinkOfEach, mainAxis - margin * (children.length - 1), (...text) => listContainer.log(...text));
        // listContainer.log('-- chrMainAxisSizes', chrMainAxisSizes);
        if (alignItems === 'stretch') {
          for (let i = 0, l = children.length; i < l; i++) {
            chrCrossAxisSizes[i] = crossAxis;
          }
        }
        calcChdSizes$ = rx.EMPTY;
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
            childrenPosition.set(children[i], [pos, crossPos]);
          else
            childrenPosition.set(children[i], [crossPos, pos]);
          if (i !== l - 1) {
            const fSpaceBetween = justifyContent === 'space-between' ? space / (l - 1 - i) : 0;
            baseSpaceBetween = Math.floor(fSpaceBetween);
            pos += chrMainAxisSizes[i];
            if (dir === 'row') {
              separatorPos[i] = borderSep === FlexBorderSeparator.line ?
                marginWidth + pos + (justifyContent === 'space-between' ? fSpaceBetween >> 1 : 0) :
                pos;
            }
            pos += margin + baseSpaceBetween;
            space -= baseSpaceBetween;
          }
          if (dir === 'row')
            children[i].s.ft.onSize(chrMainAxisSizes[i] ?? 0, chrCrossAxisSizes[i] ?? 0).dp(m);
          else
            children[i].s.ft.onSize(chrCrossAxisSizes[i] ?? 0, chrMainAxisSizes[i] ?? 0).dp(m);
        }
        // listContainer.log('childrenPosition:', ...childrenPosition.map(pos => '[' + pos.join(', ') + ']'));
        ft.onChildPositions(childrenPosition).dp(m);
        sub.complete();
      });
      return rx.concat(
        calcChdSizes$.pipe(
          rx.finalize(() => s.ft.onChangeChildrenSize(chrMainAxisSizes, chrCrossAxisSizes).dp(m))
        ),
        setPositions$
      ).pipe(
        listContainer.catchErrorFor(m)
      );
    })
  ));
  r('onChildPreferredSizeChange,... -> onContentSizeChange', rx.combineLatest([
    listContainer.s.pt.onChildPreferredSizeChange,
    table.l.setDirection, table.l.setBorderSpacing,
    table.l.setBorderSeparator
  ]).pipe(
    rx.map(([[m, sizes], [, direction], [, marginWidth], [, borderSeq]]) => {
      if (direction === 'row') {
        // eslint-disable-next-line prefer-const
        let [fw, fh] = sizes.reduce((preferred, [w, h]) => {
          preferred[0] += w;
          if (h > preferred[1])
            preferred[1] = h;
          return preferred;
        }, [0, 0] as const);
        fw += (borderSeq === FlexBorderSeparator.line ? 2 + marginWidth + 1 : marginWidth) * (sizes.length - 1);
        ft.onContentSizeChange(fw, fh).dp(m);
      } else if (direction === 'col') {
        const [fw, fh] = sizes.reduce((preferred, [w, h]) => {
          preferred[1] += h;
          if (w > preferred[0])
            preferred[0] = w;
          return preferred;
        }, [0, 0] as const);
        ft.onContentSizeChange(fw, fh).dp(m);
      }
    })
  ));
  r('onRender -> renderSelf, renderChild', s.pt.onRender.pipe(
    rx.withLatestFrom(table.l.setDirection, table.l.onSize, table.l.setBorderSeparator, table.l.setBorderSeparatorStyle),
    rx.map(([[m, canvas, trans, renderSelf, clips, masks], [, dir], [, , h], [, borderSep], [, sepStyle]]) => {
      if (masks == null)
        masks = [];
      if (renderSelf) {
        s.ft.renderSelf(canvas, trans, clips, masks).dp(m);
      }
      if (dir === 'row' && borderSep === FlexBorderSeparator.line) {
        const orig = vec2.create();
        vec2.transformMat4(orig, orig, trans);
        for (const sepPos of separatorPos) {
          for (let i = 0; i < h; i++)
            canvas.s.ft.addString(orig[0] + sepPos, orig[1] + i, '│', sepStyle).dp(m);
        }
      }
      let chrToRender = clips.flatMap(clip => [...childBoundingTree.searchOverlaps(clip)])
        .map(([, c]) => c);
      const excluded = new Set(masks ? masks.map(c => childBoundingTree.searchForCovered(c).map(([, w]) => w)).flat() : []);
      chrToRender = chrToRender.filter(([, c]) => !excluded.has(c));
      for (let i = 0, l = chrToRender.length; i < l; i++) {
        const [idx, chr] = chrToRender[i];
        s.ft.renderChild(idx, chr, canvas, trans, clips, masks).dp(m);
      }
    })
  ));
  r('findOverlaps -> didFindOverlaps', s.pt.findOverlaps.pipe(
    rx.mergeMap(([m, ...rect]) => table.l.onBoundingBox.pipe(
      rx.take(1),
      rx.switchMap(([, [x, y, w, h]]) => {
        if (x == null) {
          s.ft.didFindOverlaps([]).dp(m);
          return rx.EMPTY;
        }
        const r = rectIntersection([x, y, w, h], rect);
        if (r == null) {
          s.ft.didFindOverlaps([]).dp(m);
          return rx.EMPTY;
        }
        return rx.of([r[0] - x, r[1] - y, r[2], r[3]] as Rectangle);
      }),
      rx.mergeMap(relativeR => {
        // listContainer.log('childBoundingTree', [...childBoundingTree.allRectangles()].map(([r, [[, w]]]) => `${r.join()}: ${w.s.logPrefix}`));
        const children = childBoundingTree.searchOverlaps(relativeR);
        return rx.from(children).pipe(
          rx.mergeMap(([, [, chd]]) => chd.table.l.isContainer.pipe(
            rx.take(1),
            rx.mergeMap(([, isContainer]) => isContainer ?
              (chd as TerminalContainer).s.ft.findOverlaps(...rect)
                .re(m).od((chd as TerminalContainer).s.pt.didFindOverlaps).pipe(
                  rx.map(([, chdOfChd]) => chdOfChd),
                  rx.take(1),
                  rx.endWith([chd])
                ) :
              rx.of([chd])
            )
          )),
          rx.reduce((acc, it) => {
            acc.push(...it);
            return acc;
          }, [] as BaseWidget[]),
          rx.map(found => s.ft.didFindOverlaps(found).dp(m))
        );
      })
    ))
  ));

  const reflowData = [
    table.l.onSize,
    table.l.allDisplayChildren.pipe(
      rx.switchMap(([, chdn]) => {
        return rx.combineLatest([
          rx.combineLatest(chdn.map(chd => chd.table.l.setFlexGrow.pipe(rx.map(([, v]) => v)))),
          rx.combineLatest(chdn.map(chd => chd.table.l.setFlexShrink.pipe(rx.map(([, v]) => v))))
        ]).pipe(
          rx.map(([grows, shrinks]) => [chdn, grows, shrinks] as const)
        );
      })
    ),
    table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems,
    table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator
  ] as const;
  r('allDisplayChildren,...-> requestReflow', s.pt.allDisplayChildren.pipe(
    rx.switchMap(([, chdn]) => {
      return rx.merge(...chdn.map(
        chd => rx.merge(chd.s.pt.setFlexGrow, chd.s.pt.setFlexShrink)
      ));
    }),
    rx.map(([m]) => s.ft.requestReflow().dp(m))
  ));
  r('init', new rx.Observable<never>(() => {
    ft.setDirection('row').dp();
    ft.alignItems('stretch').dp();
    ft.justifyContent('stretch').dp();
    ft.setBorderSpacing(1).dp();
    ft.setBorderSeparator(FlexBorderSeparator.none).dp();
    ft.setBorderSeparatorStyle([]).dp();
    ft.requestReflowOn(
      s.pt.onSize,
      table.l.onChildPreferredSizeChange, table.l.justifyContent, table.l.alignItems,
      table.l.preferredSize, table.l.setDirection, table.l.setBorderSpacing, table.l.setBorderSeparator
    ).dp();
  }));
});

export type FlexContainer = SimplexReactorOfFac<typeof flexContainerFac>;
export type FlexContainerOpts = CreateOptsInDef<FlexContainerEvents, typeof baseContainerFac>;
export function createFlexContainer(opts: FlexContainerOpts = {}) {
  return flexContainerFac.create(opts);
}

export function shrinkEachSize(chdPrefSizes: number[], shrinkOfEach: number[], availableSpace: number) {
  if (chdPrefSizes.length === 0)
    return [];
  if (availableSpace < 0) {
    availableSpace = 0;
  }
  const prefSizeTotal = chdPrefSizes.reduce((prev, curr) => prev + curr, 0);
  const spaceToShrink = prefSizeTotal - availableSpace;
  const numOfShrinkUnit = chdPrefSizes.reduce((prev, curr, i) => prev + (curr * shrinkOfEach[i]), 0);
  const shrinkUnit = numOfShrinkUnit > 0 ? spaceToShrink / numOfShrinkUnit : 0;
  const chrSizes = [] as number[];
  let floatGap = 0;
  let i = 0;
  for (const preSize of chdPrefSizes) {
    const units = preSize * shrinkOfEach[i];
    const fSize = preSize - shrinkUnit * units;
    let size = Math.round(fSize);
    floatGap += fSize - size;
    if (floatGap > 0.5) {
      size++;
      floatGap--;
    } else if (floatGap < -0.5) {
      size--;
      floatGap++;
    }

    chrSizes.push(size < 0 ? 0 : size);
    i++;
  }
  return chrSizes;
}

function stretchEachSize(prefSizes: number[], growOfEach: number[], shrinkOfEach: number[], availableSpace: number, log?: (...text: any[]) => void) {
  const remaining = availableSpace - prefSizes.reduce((sum, size) => {
    sum += size;
    return sum;
  }, 0);
  // if (log)
  //   log('--stretchEachSize remaining', remaining, shrinkOfEach, prefSizes, availableSpace);
  if (remaining <= 0)
    return shrinkEachSize(prefSizes, shrinkOfEach, availableSpace);

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
    let iGrowSize = Math.round(growSize);
    floatGap += growSize - iGrowSize;
    if (floatGap > 0.5) {
      iGrowSize += 1;
      floatGap--;
    } else if (floatGap < -0.5) {
      iGrowSize -= 1;
      floatGap++;
    }
    return iGrowSize + pref;
  });
}

