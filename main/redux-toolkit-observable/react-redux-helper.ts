import {InferableComponentEnhancerWithProps} from 'react-redux';
import {StateFactory, Slice, PayloadAction, SliceCaseReducers// , ExtraSliceReducers
} from './redux-toolkit-observable';
// import {stateFactory} from './state-factory-browser';
import {Epic} from 'redux-observable';
// import {CreateSliceOptions} from '@reduxjs/toolkit';
import {ResourceMap} from './resource-map';
import {useEffect, useState} from 'react';
import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';
// import { Observable } from './example/example-slice-store-declaration';

// interface SliceData<S, R extends SliceCaseReducers<S>> {
//   slice: Slice<S, R & ExtraSliceReducers<S>>;
//   epicFactory?: EpicFactory<S, R, string>;
//   actionDispatcher: Slice<S, R & ExtraSliceReducers<S>>['actions'];
//   store: Observable<S>;
//   getState: () => S;
// }
// const existingSliceMap = new Map<string, SliceData<any, any>>();

export type InjectedCompPropsType<ConnectHOC> =
  (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {})
  &
  (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});

export interface ReduxInsideComponent<S> {
  /** The store for non-primative data type and Redux unfriendly objects */
  resourceMap?: ResourceMap;
  getStore(): rx.Observable<S>;
  destory(): void;
}

export type EpicFactory<S, R extends SliceCaseReducers<S>, Name extends string> =
  (slice: Slice<S, R, Name>) => Epic<PayloadAction<any>, PayloadAction<any>, S>;


// let COMPONENT_ID = 0;
/**
 * Use "state" in React rendering template, use `getState()` to get current computed state from Redux Store,
 * be aware, `state` might not be the same as returned value of `getState()` at some moments.
 * 
 * @param name
 * @param sliceFactory 
 */
// export function useInternalReduxForComponent<S extends {[prop: string]: any}, R extends SliceCaseReducers<S>, Name extends string>(
//   opt: CreateSliceOptions<S, R, Name> & {epicFactory?: EpicFactory<S, R, Name>}): [state: S, slice: Slice<S, R & ExtraSliceReducers<S>, Name>] {
//   const resourceMap = useMemo(() => new ResourceMap(), []);
//   const [reactState, setReactState] = useState<S>();

//   useEffect(() => {
//     const compId = COMPONENT_ID++;
//     let existingSlice = existingSliceMap.get(opt.name) as SliceData<{[compId: string]: S}, {}>;
//     if (existingSlice == null) {
//       const newReducers = {} as CreateSliceOptions<{[compId: string]: S}, R, Name>['reducers'];
//       for (const [caseName, reducer] of Object.entries(opt.reducers)) {
//         newReducers[caseName as keyof R] = function(s: {[compId: string]: S}, action: PayloadAction<any>) {
//           return (reducer as any)(s[compId], action) as  {[compId: string]: S};
//         } as any;
//       }
//       const slice = stateFactory.newSlice({
//         name: opt.name,
//         initialState: {[opt.name]: {[compId]: opt.initialState}} as {[compId: string]: S},
//         reducers: newReducers
//       });
//       const actionDispatcher = stateFactory.bindActionCreators(slice);
//       const store = stateFactory.sliceStore(slice);
//       const getState = () => stateFactory.sliceState(slice);
//       existingSlice = {slice, actionDispatcher, store, getState, epicFactory: opt.epicFactory};
//       existingSliceMap.set(opt.name, existingSlice);
//     } else {
//       const sliceData: SliceData<{[compId: string]: S}, {}> = existingSlice;
//       sliceData.actionDispatcher._change((draft) => {
//         s[compId] = opt.initialState;
//       });
//     }

//     if (opt.epicFactory) {
//       // const epic = opt.epicFactory(existingSlice.slice)
//       // stateFactory.addEpic()
//     }

//     return () => {
//       const sliceData: SliceData<{[compId: string]: S}, {}> = existingSlice;
//       sliceData.actionDispatcher._change((draft) => {
//         delete s[compId];
//       });
//     };
//   }, []);

//   return {...toolkit, state: reactState};
// }

export function useStoreOfStateFactory(stateFactory: StateFactory) {
  const [reduxStore, setReduxStore] = useState<ReturnType<StateFactory['getRootStore']>>(undefined);
  useEffect(() => {
    stateFactory.store$.subscribe({
      next(store) {
        setReduxStore(store);
      }
    });

  }, [stateFactory.getRootStore()]);

  return reduxStore;
}
