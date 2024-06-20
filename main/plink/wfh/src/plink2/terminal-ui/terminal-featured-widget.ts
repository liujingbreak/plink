import * as rx from 'rxjs';
import {vec2} from 'gl-matrix';
import {SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, ActionDispenser, SimplexReactor} from '@wfh/reactivizer';
// import {TerminalCanvas} from './terminal-canvas';
import {TerminalWidget, createWidget, isStaticTextLabel} from './terminal-widget';

export interface ListContainerInput {
  setDirection(dir: 'col' | 'row'): SingleActionFactory;
  justifyContent(value: 'start' | 'center' | 'end'): SingleActionFactory;
  alignItems(value: 'start' | 'center' | 'end'): SingleActionFactory;
  setMarginWidth(value: number): SingleActionFactory;
}

export interface ListContainerEvents {
  onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
}

const tableForListContainer = ['setDirection', 'alignItems', 'justifyContent', 'setMarginWidth'] as const;

type ListContainer = SimplexReactorMergeType<TerminalWidget, SimplexReactor<ListContainerInput & ListContainerEvents, typeof tableForListContainer>>;
export function createListContainer(opts: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>) {
  const base = createWidget();
  const listContainer = base.config<ListContainerInput & ListContainerEvents, typeof tableForListContainer>({...opts, tableFor: tableForListContainer});
  const childrenPosition = [] as vec2[];

  base.s.interceptor$.next(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof base.s>(action$);
    return rx.merge(
      dispenser.at.renderChild.pipe(
        rx.ignoreElements()
        // rx.map(a => {
        //   const [idx, chr] = a.p;
        //   // TODO
        //   return a;
        // })
      ),
      dispenser.ofOtherTypes()
    );
  });

  const s = listContainer.s.prependController();
  const {r, table} = listContainer;
  r('addChild, removeChild, children.preferredSize -> onChildPreferredSizeChange', rx.merge(
    s.pt.addChild,
    s.pt.removeChild
  ).pipe(
    rx.switchMap(() => table.l.allChildren.pipe(
      rx.switchMap(([, children]) => {
        return rx.combineLatest([...children].map(widget => {
          if (isStaticTextLabel(widget))
            return rx.of([null, widget.displayLength, 1] as const);
          else
            return widget.table.l.preferredSize;
        }));
      }),
      rx.map(preferredSizeOfChildren => {
        s.ft.onChildPreferredSizeChange(preferredSizeOfChildren.map(([, w, h]) => [w, h] as const)).dp();
      })
    ))
  ));

  r('setSize, onChildPreferredSizeChange -> "childrenPosition", child.setSize', s.pt.setSize.pipe(
    rx.withLatestFrom(
      table.l.allChildren, s.pt.onChildPreferredSizeChange, table.l.justifyContent,
      table.l.alignItems, table.l.preferredSize, table.l.setDirection, table.l.setMarginWidth
    ),
    rx.map(([[m, w, h], [, children], [, sizes], [, justifyContent], [, alignItems], [, pWidth, pHeight], [, dir], [, marginWidth]]) => {
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
        sizes.map(([w]) => w) :
        sizes.map(([, h]) => h);
      const chrCrossAxisPrefSizes = dir === 'col' ?
        sizes.map(([w]) => w) :
        sizes.map(([, h]) => h);
      if (mainAxis > pMainAxis) {
        // when actual space is bigger than preferred size, we need to consider "justifyContent"

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
        let averageSize = Math.floor((mainAxis + totalMargin) / children.length);
        let pos = 0;
        for (let i = 0, l = chrMainAxisPrefSizes.length; i < l; i++) {
          if (dir === 'row')
            childrenPosition.push([pos, 0]);
          else
            childrenPosition.push([0, pos]);
          const childSize = chrMainAxisPrefSizes[i] < averageSize ? chrMainAxisPrefSizes[i] : averageSize;
          chrMainAxisSizes.push(childSize);
          const remainingMargin = margin * (children.length - 1 - i);
          if (dir === 'row')
            childrenPosition.push([pos, 0]);
          else
            childrenPosition.push([0, pos]);
          averageSize = Math.floor((mainAxis + remainingMargin) / children.length);
          pos += childSize;
          pos += margin;
        }
      }
      // Let's calculate position and size of each child on cross-axis
      for (let i = 0, l = childrenPosition.length; i < l; i++) {
        let chrCrossAxisSize = 0;
        if (chrCrossAxisPrefSizes[i] < crossAxis) {
          const space = crossAxis - chrCrossAxisPrefSizes[i];
          const pos = alignItems === 'start' ? 0 : alignItems === 'center' ? space >> 1 : space;
          if (dir === 'row')
            childrenPosition[i][1] = pos;
          else
            childrenPosition[i][0] = pos;
          chrCrossAxisSize = chrCrossAxisPrefSizes[i];
        } else {
          chrCrossAxisSize = crossAxis;
          // let childrenPosition remains 0
        }
        const childWidget = children[i];
        if (isStaticTextLabel(childWidget)) {
          childWidget.width = chrMainAxisSizes[i];
        } else {
          if (dir === 'row')
            childWidget.s.ft.setSize(chrMainAxisSizes[i], chrCrossAxisSize).dp(m);
          else
            childWidget.s.ft.setSize(chrCrossAxisSize, chrMainAxisSizes[i]).dp(m);
        }
      }
    })
  ));

  r('onChildPreferredSizeChange -> preferredSize', s.pt.onChildPreferredSizeChange.pipe(
    rx.withLatestFrom(table.l.setDirection, table.l.setMarginWidth),
    rx.map(([[m, sizes], [, direction], [, marginWidth]]) => {
      if (direction === 'row') {
        const finalPreferredSize = sizes.reduce((preferred, [w, h]) => {
          preferred[0] += w;
          preferred[0] += marginWidth;
          if (h > preferred[1])
            preferred[1] = h;
          return preferred;
        }, [0, 0] as const);
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
  s.ft.setDirection('row').dp();
  s.ft.alignItems('center').dp();
  s.ft.justifyContent('start').dp();
  s.ft.setMarginWidth(1).dp();
}
