import {StateFactory, ExtraSliceReducers} from './redux-toolkit-observable';
import {CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, Draft} from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import {Observable, EMPTY, of, Subject} from 'rxjs';
import * as op from 'rxjs/operators';

export type EpicFactory<S, R extends SliceCaseReducers<S>> = (slice: SliceHelper<S, R>) => Epic<PayloadAction<any>, any, unknown> | void;

export type SliceHelper<S, R extends SliceCaseReducers<S>> = Slice<S, R> & {
  actionDispatcher: CaseReducerActions<R & ExtraSliceReducers<S>>;
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

  function addEpic$(epicFactory$: Observable<EpicFactory<S, R> | null | undefined>) {
    const sub = epicFactory$.pipe(
      op.distinctUntilChanged(),
      op.switchMap(fac => {
        if (fac) {
          const epic = fac(helper);
          if (epic) {
            return new Observable(() => {
              const release = stateFactory.addEpic(epic, opts.name);
              return release;
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
    actionDispatcher,
    addEpic(epicFactory: EpicFactory<S, R>) {
      return addEpic$(of(epicFactory));
    },
    addEpic$,
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
