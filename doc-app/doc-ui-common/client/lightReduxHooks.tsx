/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used isolated within any React component in case your component has 
 * complicated async state change logic.
 * 
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not supported by ImmerJS
 */

import React from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export interface ActionAsReducer<S, P = any> {
  type: string;
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
  [type: string]: (state: S, payload: any) => S | void;
}

export type ActionDispatcher<R extends Reducers<S>, S = any> = {
  // [Type in keyof R]: (payload: Parameters<R[Type]>[1]) => ({type: Type; payload: Parameters<R[Type]>[1]});
  [Type in keyof R]: ActionCreator<R, Type, S>;
};


export type ActionCreator<R extends Reducers<S>, Type extends keyof R, S> = Parameters<R[Type]>[1] extends undefined ?
  ActionCreatorWithoutPayload<R, Type, S> : ActionCreatorWithPayload<R, Type, S>;
export interface ActionCreatorWithPayload<R extends Reducers<S>, Type extends keyof R, S> {
  (payload: Parameters<R[Type]>[1]): ({type: Type; payload: Parameters<R[Type]>[1]});
  type: Type;
}

export interface ActionCreatorWithoutPayload<R extends Reducers<S>, Type extends keyof R, S> {
  (): ({type: Type;});
  type: Type;
}


export function useLightReduxObs<S extends {error?: Error}, R extends Reducers<S>>(
  initialState: S,
  reducers: R,
  logPrefix?: string) {
  const [state, setState] = React.useState<S>(initialState);
  const state$ = React.useMemo(() => new rx.BehaviorSubject<S>(initialState), []);
  const unprocessedAction$ = React.useMemo(() => new rx.Subject<ActionAsReducer<S>>(), []);
  const action$ = React.useMemo(() => new rx.Subject<ActionAsReducer<S>>(), []);
  const actionDispatcher = React.useMemo<ActionDispatcher<typeof reducers, S>>(() => {
    const bindActions: Partial<ActionDispatcher<R, S>> = {};

    for (const [type, reducer] of Object.entries(reducers)) {
      const creator: Partial<ActionCreatorWithPayload<R, string, S>> = function(payload?: any) {
        const action = {type, payload, reducer};
        unprocessedAction$.next(action);
        return action;
      };
      creator.type = type;
      bindActions[type as keyof R] = creator as ActionCreator<R, string, S>;
    }
    return bindActions as ActionDispatcher<typeof reducers, S>;
  }, []);

  React.useEffect(() => {
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
        op.tap(state => setState(state))
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
          unprocessedAction$.next({type: 'reducer error',
            reducer(s) {
              return {...s, error: err};
            }
          });
          return caught;
        })
      )
    ).subscribe();

    return () => {
      unprocessedAction$.next({
        type: '__OnDestroy'
      });
      sub.unsubscribe();
    };
  }, []);

  return {
    /** React state, used only for JSX template, its change might not be up-to-date compare with
     * `state$.getValue()` which is RxJS BehaviorSubject.
     */
    state,
    dispatch(action: ActionAsReducer<S>) {
      unprocessedAction$.next(action);
    },
    actionDispatcher,
    /** Rx State */
    state$,
    action$,
    ofAction,
    // We can not define epic as parameter of useLightReduxObs(), because it relies on type inference result when
    // you create an epic with ofAction() 
    useEpic(epic: (actions: rx.Observable<ActionAsReducer<S>>, states: rx.BehaviorSubject<S>) => rx.Observable<ActionAsReducer<S>>) {
      React.useEffect(() => {
        epic(action$, state$).pipe(
          op.takeUntil(action$.pipe(op.filter(action => action.type === '__OnDestroy'), op.take(1))),
          op.tap(action => unprocessedAction$.next(action)),
          op.catchError((err, caught) => {
            console.error(err);
            unprocessedAction$.next({type: 'epic error',
              reducer(s) {
                return {...s, error: err};
              }
            });
            return caught;
          })
        ).subscribe();
      }, []);
    }
  };
}

export function ofAction<R extends Reducers<S>, K extends keyof R, S = any>(actionCreator: ActionCreator<R, K, S>) {
  return function(src: rx.Observable<ActionAsReducer<S>>): rx.Observable<ActionAsReducer<S, Parameters<R[K]>[1]>> {
    return src.pipe(op.filter(action => action.type === actionCreator.type));
  };
}

