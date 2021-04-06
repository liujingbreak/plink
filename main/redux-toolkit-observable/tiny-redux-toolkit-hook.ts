import React from 'react';
import createTookit, {Reducers, CreateOptions, ActionWithReducer} from './tiny-redux-toolkit';
import * as rx from 'rxjs';
export * from './tiny-redux-toolkit';

export function useTinyReduxTookit<S extends {error?: Error}, R extends Reducers<S>>(opt: Omit<CreateOptions<S, R>, 'onStateChange'>) {
  const [state, setState] = React.useState<S>(opt.initialState);

  const tool = React.useMemo(() => createTookit({...opt, onStateChange: s => setState(s)}), []);

  React.useEffect(() => {
    return tool.destroy;
  }, []);
  return {
    useEpic(epic: (actions: rx.Observable<ActionWithReducer<S>>, states: rx.BehaviorSubject<S>) => rx.Observable<ActionWithReducer<S>>) {
      React.useEffect(() => {
        tool.addEpic(epic);
      }, []);
    },
    ...tool,
    state
  };
}
