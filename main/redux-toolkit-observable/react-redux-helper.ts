import {InferableComponentEnhancerWithProps} from 'react-redux';
import {StateFactory, SliceCaseReducers, ofPayloadAction
} from './redux-toolkit-observable';
import React from 'react';
import {stateFactory} from './state-factory-browser';
import {createSliceHelper, EpicFactory, SliceHelper} from './helper';
import {CreateSliceOptions} from '@reduxjs/toolkit';
import {useEffect, useState} from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
export {ofPayloadAction};
let COMPONENT_ID = 0;

export * from './helper';

/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory 
 * @param epicFactories 
 */
export function useReduxTookitWith<S, R extends SliceCaseReducers<S>>(stateFactory: StateFactory,
  optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>] {

  const willUnmountSub = React.useMemo(() => new rx.ReplaySubject<void>(1), []);
  const sliceOptions = React.useMemo(optsFactory, [optsFactory]);
  const epic$s = React.useMemo<rx.BehaviorSubject<EpicFactory<S, R> | null | undefined>[]>(() => {
    return epicFactories.map(() => new rx.BehaviorSubject<EpicFactory<S, R> | null | undefined>(null));
  }, []);

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
    for (const epicFac$ of epic$s) {
      helper.addEpic$(epicFac$);
    }
    // Let's fun epic factory as earlier as possible, so that it will not missing
    // any action dispatched from child component, since child component's useEffect()
    // runs earlier than parent component's
    epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
    return helper;
  }, []);

  React.useEffect(() => {
    epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
  }, epicFactories);

  React.useEffect(() => {
    return () => {
      willUnmountSub.next();
      willUnmountSub.complete();
      helper.destroy();
    };
  }, []);

  return [state, helper];
}


/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory 
 * @param epicFactories 
 */
export function useReduxTookit<S, R extends SliceCaseReducers<S>>(
  optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>] {
  return useReduxTookitWith(stateFactory, optsFactory, ...epicFactories);
}

export type InjectedCompPropsType<ConnectHOC> =
  (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {[p: string]: unknown})
  &
  (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {[p: string]: unknown});


export function useStoreOfStateFactory(stateFactory: StateFactory) {
  const [reduxStore, setReduxStore] = useState<ReturnType<StateFactory['getRootStore']>>(undefined);
  useEffect(() => {
    stateFactory.store$.subscribe({
      next(store) {
        setReduxStore(store);
      }
    });

  }, [stateFactory.store$]);

  return reduxStore;
}
