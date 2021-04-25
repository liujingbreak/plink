import {StateFactory, ExtraSliceReducers} from './redux-toolkit-observable';
import {CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, Draft} from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import {Observable} from 'rxjs';

export type EpicFactory<S, R extends SliceCaseReducers<S>> = (slice: SliceHelper<S, R>) => Epic<PayloadAction<any>, any, S>;

export type SliceHelper<S, R extends SliceCaseReducers<S>> = Slice<S, R> & {
  actionDispatcher: CaseReducerActions<R & ExtraSliceReducers<S>>;
  setEpic(epicFactory: EpicFactory<S, R>): void;
  destroy(): void;
  getStore(): Observable<S>;
  getState(): S;
};

export function createSliceHelper<S, R extends SliceCaseReducers<S>>(
  stateFactory: StateFactory, opts: CreateSliceOptions<S, R>): SliceHelper<S, R> {

  const slice = stateFactory.newSlice(opts);
  const actionDispatcher = stateFactory.bindActionCreators(slice);

  let releaseEpic: (() => void) | undefined;
  const helper = {
    ...slice,
    actionDispatcher,
    setEpic(epicFactory: EpicFactory<S, R>) {
      const epic = epicFactory(helper);
      releaseEpic = stateFactory.addEpic(epic, opts.name);
    },
    destroy() {
      stateFactory.removeSlice(slice);
      if (releaseEpic)
        releaseEpic();
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
  [K: string]: (draft: Draft<S>, payload?: any) => void | Draft<S>;
}

type RegularReducers<S, R> = {
  [K in keyof R]: R[K] extends (s: any) => any ? (s: Draft<S>) => void | Draft<S> :
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
