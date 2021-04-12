import React from 'react';
import { createSlice } from './tiny-redux-toolkit';
import * as op from 'rxjs/operators';
import clone from 'lodash/clone';
export * from './tiny-redux-toolkit';
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
export function useTinyReduxTookit(opts) {
    // To avoid a mutatable version is passed in
    const clonedState = clone(opts.initialState);
    const [state, setState] = React.useState(clonedState);
    // const [slice, setSlice] = React.useState<Slice<S, R>>();
    const slice = React.useMemo(() => {
        const slice = createSlice(Object.assign(Object.assign({}, opts), { initialState: clonedState }));
        if (opts.epicFactory) {
            slice.addEpic(opts.epicFactory);
        }
        return slice;
    }, []);
    React.useEffect(() => {
        const sub = slice.state$.pipe(op.distinctUntilChanged(), op.tap(changed => setState(changed))).subscribe();
        return () => {
            // console.log('unmount', slice.name);
            sub.unsubscribe();
            slice.destroy();
        };
    }, []);
    return [state, slice];
}
