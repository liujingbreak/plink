import React from 'react';
import { createSlice } from './tiny-redux-toolkit';
import * as op from 'rxjs/operators';
export * from './tiny-redux-toolkit';
import * as rx from 'rxjs';
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
export function useTinyReduxTookit(optsFactory, epicFactory) {
    // To avoid a mutatable version is passed in
    // const clonedState = clone(opts.initialState);
    const willUnmountSub = React.useMemo(() => new rx.ReplaySubject(1), []);
    const sliceOptions = React.useMemo(optsFactory, []);
    const [state, setState] = React.useState(sliceOptions.initialState);
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    const slice = React.useMemo(() => {
        const slice = createSlice(sliceOptions);
        slice.state$.pipe(op.distinctUntilChanged(), op.tap(changed => setState(changed)), op.takeUntil(willUnmountSub)).subscribe();
        // Important!!
        // Epic might contain recurive state changing logic, like subscribing on state$ stream and 
        // change state, it turns out any subscriber that subscribe state$ later than
        // epic will get a state change event in reversed order !! So epic must be the last one to
        // subscribe state$ stream
        if (epicFactory) {
            slice.addEpic(epicFactory);
        }
        return slice;
    }, []);
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
    }, []);
    return [state, slice];
}
