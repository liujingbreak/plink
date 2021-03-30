import {InferableComponentEnhancerWithProps} from 'react-redux';
import {StateFactory} from './redux-toolkit-observable';
import {useEffect, useState} from 'react';

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
