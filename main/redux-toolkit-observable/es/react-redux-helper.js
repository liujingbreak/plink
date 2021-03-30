import { useEffect, useState } from 'react';
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
