import * as rx from 'rxjs';
import {vec2, mat4} from 'gl-matrix';
import {SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, ActionDispenser, SimplexReactor} from '@wfh/reactivizer';
// import {TerminalCanvas} from './terminal-canvas';
import {TerminalWidget, createWidget} from './terminal-widget';

export interface ListContainerInput {
  setDirection(dir: 'col' | 'row'): SingleActionFactory;
  justifyContent(value: 'start' | 'center' | 'end'): SingleActionFactory;
  alignItems(value: 'start' | 'center' | 'end'): SingleActionFactory;
  setMarginWidth(value: number): SingleActionFactory;
}

export interface ListContainerEvents {
  onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
}

const tableForListContainer = ['setDirection', 'alignItems', 'justifyContent', 'setMarginWidth', 'onChildPreferredSizeChange'] as const;

type ListContainer = SimplexReactorMergeType<TerminalWidget, SimplexReactor<ListContainerInput & ListContainerEvents, typeof tableForListContainer>>;
export function createListContainer(opts: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>) {
  const base = createWidget();
  const listContainer = base.config<ListContainerInput & ListContainerEvents, typeof tableForListContainer>({name: 'listContainer', ...opts, tableFor: tableForListContainer});
  let childrenPosition: vec2[];

  base.s.interceptor$.next(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof base.s>(action$);
    return rx.merge(
      dispenser.at.renderChild.pipe(
        rx.ignoreElements()
      ),
      dispenser.ofOtherTypes()
    );
  });

  const s = listContainer.s.prependController();
  const {r, table} = listContainer;
  r('addChild, removeChild, children.preferredSize -> onChildPreferredSizeChange', rx.merge(
    listContainer.s.pt.addChild, // it is important that we use "listContainer.s" instead of prepeneded controller, cuz' we need to handle actions after the original reactors finishes
    listContainer.s.pt.removeChild
  ).pipe(
    rx.switchMap(() => table.l.allChildren.pipe(
      rx.switchMap(([, children]) => {
        return rx.combineLatest([...children].map(widget => {
          return widget.table.l.preferredSize;
        }));
      }),
      rx.map(preferredSizeOfChildren => {
        s.ft.onChildPreferredSizeChange(preferredSizeOfChildren.map(([, w, h]) => [w, h] as const)).dp();
      })
    ))
  ));
  r('querySizeOf -> prefHeightFor, preferredSize', s.pt.querySizeOf.pipe(
    rx.withLatestFrom(
      table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent,
      table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setMarginWidth
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
            s.ft.prefHeightFor(mainAxis, pHeight).dp(m);
          else
            s.ft.prefWidthFor(pWidth, mainAxis).dp(m);
          return rx.EMPTY;
        } else {
          const childrenSizeOfMainAxis = calculateSizeOfEach(
            dir === 'row' ? chrPreferredSizes.map(([w]) => w) : chrPreferredSizes.map(([, h]) => h), mainAxis);
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
                s.ft.prefHeightFor(mainAxis, crossAxisMaxSize).dp(m);
              else
                s.ft.prefWidthFor(crossAxisMaxSize, mainAxis).dp(m);
            })
          );
        }
      } else if (crossAxis != null) {
        if (crossAxis > pCrossAxis) {
          if (dir === 'row')
            s.ft.prefWidthFor(pWidth, crossAxis).dp(m);
          else
            s.ft.prefHeightFor(crossAxis, pHeight).dp(m);
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
                s.ft.prefWidthFor(mainAxisPrefSize + marginWidth * (children.length - 1), crossAxis).dp(m);
              } else
                s.ft.prefHeightFor(crossAxis, mainAxisPrefSize).dp(m);
            })
          );
        }
      }
      return rx.EMPTY;
    })
  ));
  r('setSize -> reflow', table.l.setSize.pipe(
    rx.distinctUntilChanged(([, aw, ah], [, bw, bh]) => aw === bw && ah === bh),
    rx.map(([m]) => s.ft.reflow().dp(m))
  ));
  r('reflow, ... -> setLayoutValid, child.setSize', s.pt.reflow.pipe(
    rx.mergeMap(a => rx.combineLatest([
      table.l.setSize,
      table.l.allChildren, table.l.onChildPreferredSizeChange, table.l.justifyContent,
      table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setMarginWidth
    ]).pipe(
      rx.take(1),
      rx.map(b => [a, ...b] as const)
    )),
    rx.switchMap(([[m], [, w, h], [, children], [, chrPrefSizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
      s.ft.setLayoutValid(true).dp(m);
      childrenPosition = [];
      let mainAxis = w;
      let crossAxis = h;
      let pMainAxis = pWidth;
      const margin = dir === 'row' ? marginWidth : 0;
      if (dir === 'col') {
        mainAxis = h;
        crossAxis = w;
        pMainAxis = pHeight;
      }
      const chrMainAxisSizes = [] as number[];
      const chrMainAxisPrefSizes = dir === 'row' ?
        chrPrefSizes.map(([w]) => w) :
        chrPrefSizes.map(([, h]) => h);
      const chrCrossAxisPrefSizes = dir === 'col' ?
        chrPrefSizes.map(([w]) => w) :
        chrPrefSizes.map(([, h]) => h);
      let calcChildrenPositionOfMainAxis$: rx.Observable<any> = rx.EMPTY;
      if (mainAxis > pMainAxis) {
        // Case: actual space is bigger than preferred size, we need to consider "justifyContent".
        // set children widget postion on main axis
        const space = (mainAxis - pMainAxis) - (dir === 'row' ? marginWidth * (children.length - 1) : 0);
        let pos = justifyContent === 'start' ?
          0 :
          justifyContent === 'center' ?
            space >> 1 :
            space;
        for (let i = 0, l = children.length; i < l; i++) {
          if (dir === 'row')
            childrenPosition.push([pos, 0]);
          else
            childrenPosition.push([0, pos]);
          pos += chrMainAxisPrefSizes[i];
          pos += margin;
          chrMainAxisSizes.push(chrMainAxisPrefSizes[i]);
        }
      } else {
        // if space is smaller than preferred size, for each child, set its size to MIN(space-for-each, child preferred size)
        const totalMargin = margin * (children.length - 1);
        calcChildrenPositionOfMainAxis$ = rx.zip(children.map((chr, i) => {
          return chrCrossAxisPrefSizes[i] < crossAxis ?
            rx.of(chrMainAxisPrefSizes[i]) :
            dir === 'row' ?
              chr.s.ft.querySizeOf(null, crossAxis).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w)) :
              chr.s.ft.querySizeOf(crossAxis, null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h));
        })).pipe(
          rx.take(1),
          rx.map(chrMainAxisSizes => {
            chrMainAxisSizes = calculateSizeOfEach(chrMainAxisSizes, mainAxis - totalMargin);
            let pos = 0;
            for (let i = 0, l = chrMainAxisSizes.length; i < l; i++) {
              if (dir === 'row')
                childrenPosition.push([pos, 0]);
              else
                childrenPosition.push([0, pos]);
              const childSize = chrMainAxisSizes[i];
              chrMainAxisSizes.push(childSize);
              if (dir === 'row')
                childrenPosition.push([pos, 0]);
              else
                childrenPosition.push([0, pos]);
              pos += childSize;
              pos += margin;
            }
          })
        );
      }
      return rx.concat(
        calcChildrenPositionOfMainAxis$,
        // Let's calculate position and size of each child on cross-axis
        rx.forkJoin(children.map((chr, i) => {
          return dir === 'row' ?
            chr.s.ft.querySizeOf(chrMainAxisSizes[i], null).re(m).od(chr.s.pt.prefHeightFor).pipe(rx.take(1), rx.map(([, , h]) => h)) :
            chr.s.ft.querySizeOf(null, chrMainAxisSizes[i]).re(m).od(chr.s.pt.prefWidthFor).pipe(rx.take(1), rx.map(([, w]) => w));
        })).pipe(
          rx.map(contrainedChrCrossAxisPrefSizes => {
            for (let i = 0, l = childrenPosition.length; i < l; i++) {
              let chrCrossAxisSize = 0;
              const chrCrossExisPrefSize = contrainedChrCrossAxisPrefSizes[i];
              if (contrainedChrCrossAxisPrefSizes[i] < crossAxis) {
                const space = crossAxis - chrCrossExisPrefSize;
                const pos = alignItems === 'start' ? 0 : alignItems === 'center' ? space >> 1 : space;
                if (dir === 'row')
                  childrenPosition[i][1] = pos;
                else
                  childrenPosition[i][0] = pos;
                chrCrossAxisSize = chrCrossExisPrefSize;
              } else {
                chrCrossAxisSize = crossAxis;
                // let childrenPosition remains 0
              }
              const childWidget = children[i];
              if (dir === 'row')
                childWidget.s.ft.setSize(chrMainAxisSizes[i], chrCrossAxisSize).dp(m);
              else
                childWidget.s.ft.setSize(chrCrossAxisSize, chrMainAxisSizes[i]).dp(m);
            }
          })
        )
      );
    })
  ));
  r('...-> setLayoutValid', rx.merge(
    s.pt.onChildPreferredSizeChange, s.pt.setDirection, s.pt.setMarginWidth,
    s.pt.alignItems, s.pt.justifyContent
  ).pipe(
    rx.map(([m]) => s.ft.setLayoutValid(false).dp(m))
  ));

  r('onChildPreferredSizeChange,... -> preferredSize', rx.combineLatest([
    s.pt.onChildPreferredSizeChange,
    table.l.setDirection, table.l.setMarginWidth
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
        s.ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
      } else if (direction === 'col') {
        const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
          preferred[1] += h;
          if (w > preferred[0])
            preferred[0] = w;
          return preferred;
        }, [0, 0] as const);
        s.ft.preferredSize(finalPreferredSize[0], finalPreferredSize[1]).dp(m);
      }
    })
  ));

  r('renderChild, "childrenPosition" -> child.render', s.pt.renderChild.pipe(
    rx.map(([m, index, chr, canvas, trans]) => {
      const pos = childrenPosition[index];
      const tranOfChild = mat4.fromTranslation(mat4.create(), [pos[0], pos[1], 0]);
      mat4.mul(tranOfChild, trans, tranOfChild);
      chr.s.ft.render(canvas, tranOfChild).re(m).dp();
    })
  ));
  s.ft.setDirection('row').dp();
  s.ft.alignItems('center').dp();
  s.ft.justifyContent('start').dp();
  s.ft.setMarginWidth(1).dp();
  for (const a$ of [
    s.pt.onChildPreferredSizeChange, s.pt.setDirection, s.pt.setMarginWidth,
    s.pt.alignItems, s.pt.justifyContent
  ]) {
    s.ft.addReflowAction(a$).dp();
  }
  return listContainer;
}

function calculateSizeOfEach(individualPrefSizes: number[], totalSize: number) {
  const prefSizeTotal = individualPrefSizes.reduce((prev, curr) => prev + curr);
  const ratio = totalSize / prefSizeTotal;
  return individualPrefSizes.map(prefOfIndividual => prefOfIndividual * ratio);
}

