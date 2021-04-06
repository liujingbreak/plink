import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export interface ActionWithReducer<S, P = any, T = any> {
  type: T;
  payload?: P;
  /** Returning `undefined / void` has same effect of returning old state reference,
   * Returning a brand new state object for immutability in normal case.
   */
  reducer?(old: S, payload: P): S | void;
}

export interface Reducers<S> {
  /** Returning `undefined / void` has same effect of returning old state reference,
   * Returning a brand new state object for immutability in normal case.
   */
  [type: string]: (state: S, payload?: any) => S | void;
}

export type Actions<S, R extends Reducers<S>> = {
  [Type in keyof R]: // Parameters<R[Type]>[1] extends void ? ActionCreatorWithoutPayload<Type> :
    ActionCreator<Parameters<R[Type]>[1] extends undefined ? void : Parameters<R[Type]>[1], Type>;
};


// export type ActionCreator<P, Type> = P extends undefined | never | void ?
//   ActionCreatorWithoutPayload<Type> : ActionCreatorWithPayload<P, Type>;

export interface ActionCreator<P, Type> {
  (payload: P): {type: Type; payload: P};
  type: Type;
}

// export interface ActionCreatorWithoutPayload<Type> {
//   (): ({type: Type; payload: undefined;});
//   type: Type;
// }

export function ofAction<P1, T1>(
  actionCreators1: ActionCreator<P1, T1>):
  (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1, T1>>;
export function ofAction<P1, P2, T1, T2>(
  actionCreators1: ActionCreator<P1, T1>, actionCreators2: ActionCreator<P2, T2>):
  (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1 | P2, T1 | T2>>;
export function ofAction<P1, P2, P3, T1, T2, T3>(
    actionCreators1: ActionCreator<P1, T1>, actionCreators2: ActionCreator<P2, T2>, actionCreators3: ActionCreator<P3, T3>):
    (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1 | P2 | P3, T1 | T2 | T3>>;

    export function ofAction<P1, P2, P3, P4, T1, T2, T3, T4>(
      actionCreators1: ActionCreator<P1, T1>, actionCreators2: ActionCreator<P2, T2>, actionCreators3: ActionCreator<P3, T3>, actionCreators4: ActionCreator<P4, T4>):
      (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1 | P2 | P3 | P4, T1 | T2 | T3 | T4>>;
export function ofAction<P, T>(
  ...actionCreators: ActionCreator<P, T>[]) {
  return function(src: rx.Observable<ActionWithReducer<any>>): rx.Observable<ActionWithReducer<T, P>> {
    return src.pipe(op.filter(action => actionCreators.some(ac => action.type === ac.type)));
  };
}

export interface CreateOptions<S, R extends Reducers<S>> {
  initialState: S;
  reducers: R;
  logPrefix?: string;
  onStateChange(snapshot: S): void;
}
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has 
 * complicated async state change logic.
 * 
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
export default function createTinyReduxToolkit<S extends {error?: Error}, R extends Reducers<S>>(
  {initialState, reducers, logPrefix, onStateChange}: CreateOptions<S, R>) {
  // const [state, setState] = React.useState<S>(initialState);
  const state$ = new rx.BehaviorSubject<S>(initialState);
  const unprocessedAction$ = new rx.Subject<ActionWithReducer<S>>();
  const action$ = new rx.Subject<ActionWithReducer<S>>();

  const bindActions: Partial<Actions<S, R>> = {};

  for (const [type, reducer] of Object.entries(reducers)) {
    const creator: Partial<ActionCreator<any, keyof R>> = function(payload?: any) {
      const action = {type, payload, reducer};
      unprocessedAction$.next(action);
      return action;
    };
    creator.type = type;
    bindActions[type as keyof R] = creator as any;
  }
  const actionDispatcher =  bindActions as Actions<S, R>;

  const sub = rx.merge(
    state$.pipe(
      op.tap(state => {
        if (logPrefix) {
          // tslint:disable-next-line: no-console
          console.log(`%c ${logPrefix} internal:state`, 'color: black; background: #e98df5;', state);
        }
      }),
      op.distinctUntilChanged(),
      // op.tap(() => {
      //   if (logPrefix) {
      //     // tslint:disable-next-line: no-console
      //     console.log(`%c ${logPrefix} sync to React State`, 'color: black; background: #e98df5;');
      //   }
      // }),
      op.tap(state => onStateChange(state))
    ),
    unprocessedAction$.pipe(
      op.tap(action => {
        if (logPrefix) {
          // tslint:disable-next-line: no-console
          console.log(`%c ${logPrefix} internal:action`, 'color: black; background: #fae4fc;', action.type);
        }
      }),
      op.tap(action => {
        if (action.reducer) {
          const newState = action.reducer(state$.getValue(), action.payload);
          if (newState !== undefined)
            state$.next(newState);
        }
        action$.next(action);
      }),
      op.catchError((err, caught) => {
        console.error(err);
        dispatch({type: 'reducer error',
          reducer(s) {
            return {...s, error: err};
          }
        });
        return caught;
      })
    )
  ).subscribe();

  function destroy() {
    dispatch({
      type: '__OnDestroy'
    });
    sub.unsubscribe();
  }

  function addEpic(epic: (actions: rx.Observable<ActionWithReducer<S>>, states: rx.BehaviorSubject<S>) => rx.Observable<ActionWithReducer<S>>) {
    epic(action$, state$).pipe(
      op.takeUntil(action$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))),
      op.tap(action => dispatch(action)),
      op.catchError((err, caught) => {
        console.error(err);
        dispatch({type: 'epic error',
          reducer(s) {
            return {...s, error: err};
          }
        });
        return caught;
      })
    ).subscribe();
  }

  function dispatch(action: ActionWithReducer<S>) {
    unprocessedAction$.next(action);
  }

  return {
    addEpic,
    dispatch,
    destroy,
    actionDispatcher
    // state$,
    // action$
  };
}
