import {InferableComponentEnhancerWithProps} from 'react-redux';
import {StateFactory, SliceCaseReducers// , ExtraSliceReducers
} from './redux-toolkit-observable';
import React from 'react';
import {stateFactory, ofPayloadAction} from './state-factory-browser';
import {createSliceHelper, EpicFactory, SliceHelper, createReducers} from './helper';
import {CreateSliceOptions} from '@reduxjs/toolkit';
import {useEffect, useState} from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

let COMPONENT_ID = 0;

export {EpicFactory, SliceHelper, ofPayloadAction, createReducers};


export function useReduxTookit<S, R extends SliceCaseReducers<S>>(
  optsFactory: () => CreateSliceOptions<S, R>, epicFactory: EpicFactory<S, R>): [state: S, slice: SliceHelper<S, R>] {
  const willUnmountSub = React.useMemo(() => new rx.ReplaySubject<void>(1), []);
  const sliceOptions = React.useMemo(optsFactory, []);

  const [state, setState] = React.useState<S>(sliceOptions.initialState);

  const helper = React.useMemo<SliceHelper<S, R>>(() => {
    const helper = createSliceHelper(stateFactory, {...sliceOptions, name: sliceOptions.name + '.' + COMPONENT_ID++});
    stateFactory.sliceStore(helper).pipe(
      op.distinctUntilChanged(),
      op.tap(changed => setState(changed)),
      op.takeUntil(willUnmountSub)
    ).subscribe();

    // Important!!
    // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
    // change state, it turns out any subscriber that subscribe state$ later than
    // epic will get a state change event in reversed order !! So epic must be the last one to
    // subscribe state$ stream
    if (epicFactory) {
      helper.setEpic(epicFactory);
    }
    return helper;
  }, []);

  React.useEffect(() => {
    return () => {
      willUnmountSub.next();
      willUnmountSub.complete();
      helper.destroy();
    };
  }, []);
  return [state, helper];
}

export type InjectedCompPropsType<ConnectHOC> =
  (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {})
  &
  (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});


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
