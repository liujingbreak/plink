import {StateFactory, ExtraSliceReducers} from './redux-toolkit-observable';
import {CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, PayloadActionCreator, Action, Draft} from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import {Observable, EMPTY, of, Subject, OperatorFunction, defer, Subscription} from 'rxjs';
import * as op from 'rxjs/operators';
import { immerable, Immutable } from 'immer';

export type EpicFactory<S, R extends SliceCaseReducers<S>> = (slice: SliceHelper<S, R>) => Epic<PayloadAction<any>, any, unknown> | void;

export type SliceHelper<S, R extends SliceCaseReducers<S>> = Slice<S, R> & {
  /** You don't have to create en Epic for subscribing action stream, you subscribe this property
   * to react on 'done' reducer action, and you may call actionDispatcher to emit a new action
   */
  action$: Observable<PayloadAction | Action>;
  actionDispatcher: CaseReducerActions<R & ExtraSliceReducers<S>>;
  destroy$: Observable<any>;
  addEpic(epicFactory: EpicFactory<S, R>): () => void;
  addEpic$(epicFactory: Observable<EpicFactory<S, R> | null | undefined>): () => void;
  destroy(): void;
  getStore(): Observable<S>;
  getState(): S;
};

export function createSliceHelper<S, R extends SliceCaseReducers<S>>(
  stateFactory: StateFactory, opts: CreateSliceOptions<S, R>): SliceHelper<S, R> {

  const slice = stateFactory.newSlice(opts);
  const actionDispatcher = stateFactory.bindActionCreators(slice);
  const destory$ = new Subject();
  let action$ = new Subject<PayloadAction | Action>();

  new Observable(() => {
    // Release epic
    return stateFactory.addEpic(_action$ => {
      return _action$.pipe(
        op.tap(action => action$.next(action)),
        op.ignoreElements()
      );
    }, opts.name);
  }).subscribe();

  function addEpic$(epicFactory$: Observable<EpicFactory<S, R> | null | undefined>) {
    const sub = epicFactory$.pipe(
      op.distinctUntilChanged(),
      op.switchMap(fac => {
        if (fac) {
          const epic = fac(helper);
          if (epic) {
            return new Observable(() => {
              // Release epic
              return stateFactory.addEpic(epic, opts.name);
            });
          }
        }
        return EMPTY;
      }),
      op.takeUntil(destory$)
    ).subscribe();
    // releaseEpic.push(() => sub.unsubscribe());
    return () => sub.unsubscribe();
  }

  // let releaseEpic: Array<() => void> = [];
  const helper = {
    ...slice,
    action$: action$.asObservable(),
    actionDispatcher,
    addEpic(epicFactory: EpicFactory<S, R>) {
      return addEpic$(of(epicFactory));
    },
    addEpic$,
    destroy$: destory$.asObservable(),
    destroy() {
      destory$.next();
      destory$.complete();
      stateFactory.removeSlice(slice);
    },
    getStore() {
      return stateFactory.sliceStore(slice);
    },
    getState() {
      return stateFactory.sliceState(slice);
    }
  };
  return helper;
}

interface SimpleReducers<S> {
  [K: string]: (draft: S | Draft<S>, payload?: any) => S | void | Draft<S>;
}

export type RegularReducers<S, R extends SimpleReducers<S>> = {
  [K in keyof R]: R[K] extends (s: any) => any ? (s: Draft<S>) => S | void | Draft<S> :
    R[K] extends (s: any, payload: infer P) => any ? (s: Draft<S>, action: PayloadAction<P>) => void | Draft<S> :
      (s: Draft<S>, action: PayloadAction<unknown>) => void | Draft<S>;
};

/**
 * createReducers helps to simplify how we writing definition of SliceCaseReducers,
 * e.g. A regular SliceCaseReducers takes PayloadAction as parameter, like: 
 * ```ts
 * const reducers = {
 *   reducerName(state: State, {payload}: PayloadAction<number>) {
 *      // update state with payload data
 *    }
 * };
 * ```
 * Normally reducer's logic only care about `payload` instead of `PayloadAction`,
 * createReducers accepts a simpler format:
 * ```ts
 * const reducers = createReducers({
 *   reducerName(draft: State, payload: number) {
 *   }
 * });
 * ```
 * You can declare payload as reducer's parameter instead of a PayloadAction
 * @param simpleReducers
 * @returns SliceCaseReducers which can be part of parameter of createSliceHelper
 */
export function createReducers<S, R extends SimpleReducers<S>>(simpleReducers: R): RegularReducers<S, R> {
  const rReducers = {} as {[key: string]: any};
  for (const [key, sReducer] of Object.entries(simpleReducers)) {
    rReducers[key] = (s: Draft<S>, {payload}: PayloadAction<any>) => {
      return sReducer(s, payload);
    };
  }
  return rReducers as RegularReducers<S, R>;
}


/**
 * Map action stream to multiple action streams by theire action type.
 * This is an alternative way to categorize action stream, compare to "ofPayloadAction()"
 * Usage:
```
slice.addEpic(slice => action$ => {
  const actionsByType = castByActionType(slice.actions, action$);
  return merge(
    actionsByType.REDUCER_NAME_A.pipe(
      ...
    ),
    actionsByType.REDUCER_NAME_B.pipe(
      ...
    ),
  )
})
```
 * @param actionCreators 
 * @param action$ 
 */
export function castByActionType<S, R extends SliceCaseReducers<S>>(actionCreators: CaseReducerActions<R>,
  action$: Observable<PayloadAction | Action>):
  {
    [K in keyof R]:
      Observable<
        CaseReducerActions<R>[K] extends PayloadActionCreator<infer P> ?
          PayloadAction<P> : PayloadAction<unknown>
      >
  } {

    let sourceSub: Subscription | undefined;
    const multicaseActionMap: {[K: string]: Subject<PayloadAction<S, any> | Action> | undefined} = {};
    const splitActions: {[K in keyof R]?: Observable<PayloadAction<S, any>>} = {};
    for (const reducerName of Object.keys(actionCreators)) {
      const subject = multicaseActionMap[(actionCreators[reducerName] as PayloadActionCreator).type] = new Subject<PayloadAction<S, any>  | Action>();
      // eslint-disable-next-line no-loop-func
      splitActions[reducerName as keyof R] = defer(() => {
        if (sourceSub == null)
          sourceSub = source.subscribe();
        return subject.asObservable() as Observable<any>;
      }).pipe(
        // eslint-disable-next-line no-loop-func
        op.finalize(() => {
          if (sourceSub) {
            sourceSub.unsubscribe();
            sourceSub = undefined;
          }
        })
      );
    }
    const source = action$.pipe(
      op.share(),
      op.map(action => {
        const match = multicaseActionMap[action.type as string];
        if (match) {
          match.next(action);
        }
      })
    );
    return splitActions as {
      [K in keyof R]: Observable<CaseReducerActions<R>[K] extends PayloadActionCreator<infer P> ?
        PayloadAction<P> : PayloadAction<unknown>>
    };
}

/**
 * Add an epicFactory to another component's sliceHelper
 * e.g.
 * ```
 * action$.pipe(ofPayloadAction(slice.actionDispatcher._onChildSliceRef),
 *  childSliceOp((childSlice) => {
 *    return childAction$ => {
 *      return childAction$.pipe(...);
 *    };
 *  })
 * ```
 * @param epicFactory 
 */
export function sliceRefActionOp<S, R extends SliceCaseReducers<S>>(epicFactory: EpicFactory<S, R>):
  OperatorFunction<PayloadAction<SliceHelper<S, R>>, PayloadAction<any>> {
  return function(in$: Observable<PayloadAction<SliceHelper<S, R>>>) {
    return in$.pipe(
      op.switchMap(({payload}) => {
        const release = payload.addEpic(epicFactory);
        return new Observable<PayloadAction<never>>(sub => release);
      })
    );
  };
}

/**
 * ImmerJS does not work with some large object (like HTMLElement), meaning you can not directly defined a
 * Redux-toolkit state to contain such a large object, this class provides a wrapper to those
 * "large object", and avoid ImmerJs to recursively freeze it by pre-freeze itself. 
 */
export class Refrigerator<T> {
  private ref: Immutable<T>;
  [immerable]: false;

  constructor(originRef: T) {
    this.ref = originRef as Immutable<T>;
    Object.freeze(this);
  }
  getRef(): T {
    return this.ref as T;
  }
}
Refrigerator[immerable] = false;
