import React from 'react';
import { createSlice } from './tiny-redux-toolkit';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
export * from './tiny-redux-toolkit';
function withBaseReducers(origReducers) {
    const reducers = Object.assign({ _syncComponentProps(s, payload) {
            s.componentProps = Object.assign({}, payload);
        },
        _willUnmount(s) { } }, origReducers);
    return reducers;
}
/**
 * Unlike useTinyReduxTookit, useTinyRtk() accepts a State which extends BaseComponentState,
 *  useTinyRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory
 * @param props
 * @param epicFactories
 * @returns
 */
export function useTinyRtk(optsFactory, props, ...epicFactories) {
    const extendOptsFactory = React.useCallback(() => {
        const opts = optsFactory();
        return Object.assign(Object.assign({}, opts), { reducers: withBaseReducers(opts.reducers) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    React.useEffect(() => () => {
        stateAndSlice[1].actionDispatcher._willUnmount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const stateAndSlice = useTinyReduxTookit(extendOptsFactory, ...epicFactories);
    React.useEffect(() => {
        stateAndSlice[1].actionDispatcher._syncComponentProps(props);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.values(props));
    return stateAndSlice;
}
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
export function useTinyReduxTookit(optsFactory, ...epicFactories) {
    // To avoid a mutatable version is passed in
    // const clonedState = clone(opts.initialState);
    const willUnmountSub = React.useMemo(() => new rx.ReplaySubject(1), []);
    const sliceOptions = React.useMemo(optsFactory, [optsFactory]);
    const epic$s = React.useMemo(() => {
        return epicFactories.map(() => new rx.BehaviorSubject(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [state, setState] = React.useState(sliceOptions.initialState);
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    const slice = React.useMemo(() => {
        const slice = createSlice(sliceOptions);
        slice.state$.pipe(op.distinctUntilChanged(), op.observeOn(rx.animationFrameScheduler), // To avoid changes being batched by React setState()
        op.tap(changed => setState(changed)), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        for (const epicFac$ of epic$s) {
            slice.addEpic$(epicFac$);
        }
        // Let's fun epic factory as earlier as possible, so that it will not missing
        // any action dispatched from child component, since child component's useEffect()
        // runs earlier than parent component's
        epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
        return slice;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    React.useEffect(() => {
        epicFactories.forEach((fac, idx) => epic$s[idx].next(fac));
    }, [epic$s, epicFactories]);
    React.useEffect(() => {
        // const sub = slice.state$.pipe(
        //   op.distinctUntilChanged(),
        //   // Important!!! because this stream is subscribed later than Epic,
        //   // "changed" value might
        //   // come in reversed order in case of recursive state changing in "Epic",
        //   // so always use getValue() to get latest state
        //   op.tap(() => setState(slice.state$.getValue()))
        // ).subscribe();
        return () => {
            willUnmountSub.next();
            willUnmountSub.complete();
            // sub.unsubscribe();
            slice.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return [state, slice];
}
