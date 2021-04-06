import { Reducers, CreateOptions, ActionWithReducer } from './tiny-redux-toolkit';
import * as rx from 'rxjs';
export * from './tiny-redux-toolkit';
export declare function useTinyReduxTookit<S extends {
    error?: Error;
}, R extends Reducers<S>>(opt: Omit<CreateOptions<S, R>, 'onStateChange'>): {
    state: S;
    addEpic: (epic: (actions: rx.Observable<ActionWithReducer<S, any, any>>, states: rx.BehaviorSubject<S>) => rx.Observable<ActionWithReducer<S, any, any>>) => void;
    dispatch: (action: ActionWithReducer<S, any, any>) => void;
    destroy: () => void;
    actionDispatcher: import("./tiny-redux-toolkit").Actions<S, R>;
    useEpic(epic: (actions: rx.Observable<ActionWithReducer<S>>, states: rx.BehaviorSubject<S>) => rx.Observable<ActionWithReducer<S>>): void;
};
