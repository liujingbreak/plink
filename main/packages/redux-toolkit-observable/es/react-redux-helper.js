import { ofPayloadAction } from './redux-toolkit-observable';
import React from 'react';
import { stateFactory } from './state-factory-browser';
import { createSliceHelper, castByActionType, createReducers } from './helper';
import { useEffect, useState } from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
export { ofPayloadAction };
let COMPONENT_ID = 0;
export * from './helper';
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
export function useReduxTookitWith(stateFactory, optsFactory, ...epicFactories) {
    const willUnmountSub = React.useMemo(() => new rx.ReplaySubject(1), []);
    const sliceOptions = React.useMemo(optsFactory, [optsFactory]);
    const epic$s = React.useMemo(() => {
        return epicFactories.map(() => new rx.BehaviorSubject(null));
    }, [epicFactories]);
    const [state, setState] = React.useState(sliceOptions.initialState);
    const helper = React.useMemo(() => {
        const helper = createSliceHelper(stateFactory, Object.assign(Object.assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
        stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
        op.tap(changed => setState(changed)), op.takeUntil(willUnmountSub)).subscribe();
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
export function useReduxTookit(optsFactory, ...epicFactories) {
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
export function useRtk(optsFactory, props, ...epicFactories) {
    const extendOptsFactory = React.useCallback(() => {
        const opts = optsFactory();
        return Object.assign(Object.assign({}, opts), { reducers: withBaseReducers(opts.reducers) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        stateAndSlice[1].actionDispatcher._syncComponentProps(props);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));
    useEffect(() => {
        return () => { stateAndSlice[1].actionDispatcher._willUnmount(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const stateAndSlice = useReduxTookitWith(stateFactory, extendOptsFactory, ...epicFactories);
    return stateAndSlice;
}
function withBaseReducers(origReducers) {
    const reducers = Object.assign({ _syncComponentProps(s, { payload }) {
            s.componentProps = Object.assign({}, payload);
        },
        _willUnmount(s) { } }, origReducers);
    return reducers;
}
export function useStoreOfStateFactory(stateFactory) {
    const [reduxStore, setReduxStore] = useState(undefined);
    useEffect(() => {
        stateFactory.store$.subscribe({
            next(store) {
                setReduxStore(store);
            }
        });
    }, [stateFactory.store$]);
    return reduxStore;
}
const demoState = {};
const simpleDemoReducers = {
    hellow(s, payload) { }
};
const demoReducers = createReducers(simpleDemoReducers);
const demoSlice = createSliceHelper(stateFactory, {
    name: '_internal_',
    initialState: demoState,
    reducers: withBaseReducers(demoReducers)
});
demoSlice.addEpic(slice => {
    return action$ => {
        slice.actionDispatcher._willUnmount();
        const actionStreams = castByActionType(slice.actions, action$);
        return rx.merge(actionStreams.hellow, actionStreams._syncComponentProps);
    };
});
