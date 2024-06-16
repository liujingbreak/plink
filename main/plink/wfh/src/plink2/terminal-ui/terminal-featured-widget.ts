import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {SimplexReactorMergeType, OptionsOfSmplxRctr, SingleActionFactory, ActionDispenser, SimplexReactor} from '@wfh/reactivizer';
import {TerminalCanvas} from './terminal-canvas';
import {TerminalWidget, createWidget} from './terminal-widget';

export interface ListContainerInput {
  setDirection(dir: 'col' | 'row'): SingleActionFactory;
  align(value: 'start' | 'middle' | 'end'): SingleActionFactory;
}

const tableForListContainer = ['setDirection', 'align'] as const;

type ListContainer = SimplexReactorMergeType<TerminalWidget, SimplexReactor<ListContainerInput, typeof tableForListContainer>>;
export function createListContainer(opts: Omit<OptionsOfSmplxRctr<ListContainer>, 'tableFor'>) {
  const base = createWidget();
  const listContainer = base.config<ListContainerInput, typeof tableForListContainer>({...opts, tableFor: tableForListContainer});
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

  const {r} = base;
}
