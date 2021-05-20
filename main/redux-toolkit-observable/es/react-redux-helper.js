import { ofPayloadAction } from './redux-toolkit-observable';
import React from 'react';
import { stateFactory } from './state-factory-browser';
import { createSliceHelper } from './helper';
import { useEffect, useState } from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
export { ofPayloadAction };
let COMPONENT_ID = 0;
export * from './helper';
export function useReduxTookit(optsFactory, ...epicFactories) {
    const willUnmountSub = React.useMemo(() => new rx.ReplaySubject(1), []);
    const sliceOptions = React.useMemo(optsFactory, []);
    const epic$s = React.useMemo(() => {
        return epicFactories.map(() => new rx.BehaviorSubject(null));
    }, []);
    const [state, setState] = React.useState(sliceOptions.initialState);
    const helper = React.useMemo(() => {
        const helper = createSliceHelper(stateFactory, Object.assign(Object.assign({}, sliceOptions), { name: sliceOptions.name + '.' + COMPONENT_ID++ }));
        stateFactory.sliceStore(helper).pipe(op.distinctUntilChanged(), op.tap(changed => setState(changed)), op.takeUntil(willUnmountSub)).subscribe();
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
export function useStoreOfStateFactory(stateFactory) {
    const [reduxStore, setReduxStore] = useState(undefined);
    useEffect(() => {
        stateFactory.store$.subscribe({
            next(store) {
                setReduxStore(store);
            }
        });
    }, [stateFactory.getRootStore()]);
    return reduxStore;
}
