import {StateFactory, ExtraSliceReducers} from './redux-toolkit-observable';
import {CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, Draft, Action} from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import {Observable, EMPTY, of, Subject, OperatorFunction} from 'rxjs';
import * as op from 'rxjs/operators';

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
  [K: string]: (draft: Draft<S>, payload?: any) => S | void | Draft<S>;
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
  const rReducers = {} as any;
  for (const [key, sReducer] of Object.entries(simpleReducers)) {
    rReducers[key] = (s: Draft<S>, {payload}: PayloadAction<any>) => {
      return sReducer(s, payload);
    };
  }
  return rReducers;
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
