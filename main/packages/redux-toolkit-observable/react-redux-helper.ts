import {InferableComponentEnhancerWithProps} from 'react-redux';
import {StateFactory, SliceCaseReducers, ofPayloadAction, PayloadAction
} from './redux-toolkit-observable';
import React from 'react';
import {stateFactory} from './state-factory-browser';
import {createSliceHelper, EpicFactory, SliceHelper, castByActionType, createReducers, action$OfSlice} from './helper';
import {CreateSliceOptions, Draft} from '@reduxjs/toolkit';
import {useEffect, useState} from 'react';
import { Epic } from 'redux-observable';
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
  }, [epicFactories]);

  const [state, setState] = React.useState<S>(sliceOptions.initialState);

  const helper = React.useMemo<SliceHelper<S, R>>(() => {
    const helper = createSliceHelper(stateFactory, {...sliceOptions, name: sliceOptions.name + '.' + COMPONENT_ID++});
    stateFactory.sliceStore(helper).pipe(
      op.distinctUntilChanged(),
      op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, epicFactories);

  React.useEffect(() => {
    return () => {
      willUnmountSub.next();
      willUnmountSub.complete();
      helper.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, helper];
}

/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory 
 * @param epicFactories 
 */
export function useReduxTookit<S, R extends SliceCaseReducers<S>>(
  optsFactory: () => CreateSliceOptions<S, R>,
  ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>] {

  return useReduxTookitWith(stateFactory, optsFactory, ...epicFactories);
}

/**
 * Use a dedicated Redux slice store for single component instance.
 * Unlike useReduxTookit, useRtk() accepts a State which extends BaseComponentState, 
 *  useRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory 
 * @param epicFactories 
 * @returns [state, sliceHelper]
 */
export function useRtk<Props, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>>(
  optsFactory: () => CreateSliceOptions<S, R>,
  props: Props,
  ...epicFactories: Array<EpicFactory4Comp<Props, S, R> | null | undefined>):
  [S, SliceHelper<S, R & CompPropsSyncReducer<Props, S>>] {

  const extendOptsFactory = React.useCallback(() => {
    const opts = optsFactory();

    return {
      ...opts,
      reducers: withBaseReducers<Props, S, typeof opts.reducers>(opts.reducers)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (stateAndSlice[1] as SliceHelper<S, CompPropsSyncReducer<Props, S>>).actionDispatcher._syncComponentProps(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props));

  useEffect(() => {
    return () => {(stateAndSlice[1] as SliceHelper<S, CompPropsSyncReducer<Props, S>>).actionDispatcher._willUnmount(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateAndSlice = useReduxTookitWith(stateFactory, extendOptsFactory, ...epicFactories);
  return stateAndSlice;
}

export interface BaseComponentState<Props> {
  componentProps?: Props;
}

export type EpicFactory4Comp<Props, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>> =
  (slice: SliceHelper<S, R & CompPropsSyncReducer<Props, S>>)
  => Epic<PayloadAction<any>, any, unknown> | void;

type CompPropsSyncReducer<Props, S extends BaseComponentState<Props>> = {
  _syncComponentProps(s: S | Draft<S>, action: PayloadAction<Props>): void;
  _willUnmount(s: S | Draft<S>): void;
};

function withBaseReducers<Props, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>>(origReducers: R):
CompPropsSyncReducer<Props, S> & R {
  const reducers = {
    _syncComponentProps(s: S, {payload}: PayloadAction<Props>) {
      s.componentProps = {...payload};
    },
    _willUnmount(s: S) {},
    ...origReducers
  };
  return reducers;
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

interface DemoCompProps {
  className: string;
}
interface DemoState extends BaseComponentState<DemoCompProps> {
  ok?: boolean;
}

const demoState: DemoState = {};

const simpleDemoReducers = {
  hellow(s: DemoState, payload: {data: string}) {},
  world(s: DemoState) {}
};

const demoReducers = createReducers<DemoState, typeof simpleDemoReducers>(simpleDemoReducers);

const demoSlice = createSliceHelper(stateFactory, {
  name: '_internal_',
  initialState: demoState,
  reducers: withBaseReducers<DemoCompProps, DemoState, typeof demoReducers>(demoReducers)
});

demoSlice.addEpic(slice => {
  return action$ => {
    slice.actionDispatcher._willUnmount();
    const actionStreams = castByActionType(slice.actions, action$);
    return rx.merge(
      actionStreams.hellow,
      actionStreams._syncComponentProps,
      action$.pipe(ofPayloadAction(slice.actions.world),
        op.map(action => action)),
      action$.pipe(ofPayloadAction(slice.actions.hellow),
        op.map(action => action))
    );
  };
});

action$OfSlice(demoSlice, 'hellow').pipe(
  op.tap(action => console.log(action))
);
action$OfSlice(demoSlice, 'world').pipe(
  op.tap(action => console.log(action))
);
