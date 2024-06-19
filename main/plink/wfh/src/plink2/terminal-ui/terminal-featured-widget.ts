import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, ActionDispenser, SimplexReactor} from '@wfh/reactivizer';
import {TerminalCanvas} from './terminal-canvas';
import {TerminalWidget, createWidget} from './terminal-widget';

export interface ListContainerInput {
  setDirection(dir: 'col' | 'row'): SingleActionFactory;
  align(value: 'start' | 'middle' | 'end'): SingleActionFactory;
}

export interface ListContainerEvents {
  onChildPreferredSizeChange(sizes: [w: number, h: number][]): SingleActionFactory;
}

const tableForListContainer = ['setDirection', 'align'] as const;

type ListContainer = SimplexReactorMergeType<TerminalWidget, SimplexReactor<ListContainerInput & ListContainerEvents, typeof tableForListContainer>>;
export function createListContainer(opts: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>) {
  const base = createWidget();
  const listContainer = base.config<ListContainerInput & ListContainerEvents, typeof tableForListContainer>({...opts, tableFor: tableForListContainer});
  const s = listContainer.s.prependController();

  s.interceptor$.next(action$ => {
    const dispenser = ActionDispenser.ofAction$<typeof s>(action$);
    return rx.merge(
      dispenser.at.renderChild.pipe(
        rx.map(a => {
          const [idx, chr] = a.p;
          return a;
        })
      ),
      dispenser.ofOtherTypes()
    );
  });

  const {r, table} = listContainer;
  r('addChild, removeChild, children.preferredSize -> onChildPreferredSizeChange', rx.merge(
    s.pt.addChild,
    s.pt.removeChild
  ).pipe(
    rx.switchMap(() => table.l.allChildren.pipe(
      rx.switchMap(([, children]) => {
        return rx.zip([...children].filter(child => (child as TerminalWidget).s != null)
          .map(widget => (widget as TerminalWidget).table.l.preferredSize));
      }),
      rx.map(preferredSizeOfChildren => {
        s.ft.onChildPreferredSizeChange(preferredSizeOfChildren.map(([, w, h]) => [w, h] as const)).dp();
      })
    )),
  ));

  r('onChildPreferredSizeChange', s.pt.onChildPreferredSizeChange.pipe(
    rx.withLatestFrom(table.l.setDirection),
    rx.map(([[m, sizes], [, direction]]) => {
      // TODO
    })
  ));
  s.ft.setDirection('row').dp();
}
