import { useEffect, useState, useMemo } from 'react';
import * as op from 'rxjs/operators';
/**
 * Use "state" in React rendering template, use `getState()` to get current computed state from Redux Store,
 * be aware, `state` might not be the same as returned value of `getState()` at some moments.
 *
 * @param name
 * @param sliceFactory
 */
export function useInternalReduxForComponent(name, sliceFactory) {
    const [reactState, setReactState] = useState();
    const toolkit = useMemo(() => {
        return sliceFactory(name);
    }, []);
    useEffect(() => {
        const sub = toolkit.getStore().pipe(op.tap(s => setReactState(Object.assign(Object.assign({}, s), { resourceMap: toolkit.resourceMap })))).subscribe();
        return () => {
            sub.unsubscribe();
            toolkit.destory();
        };
    }, []);
    return Object.assign(Object.assign({}, toolkit), { state: reactState });
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
