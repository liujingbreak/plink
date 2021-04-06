import {InferableComponentEnhancerWithProps} from 'react-redux';
import {StateFactory} from './redux-toolkit-observable';
import {ResourceMap} from './resource-map';
import {useEffect, useState, useMemo} from 'react';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

export type InjectedCompPropsType<ConnectHOC> =
  (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {})
  &
  (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});

export interface ReduxInsideComponent<S> {
  resourceMap?: ResourceMap;
  getStore(): rx.Observable<S>;
  destory(): void;
}

/**
 * Use "state" in React rendering template, use `getState()` to get current computed state from Redux Store,
 * be aware, `state` might not be the same as returned value of `getState()` at some moments.
 * 
 * @param name
 * @param sliceFactory 
 */
export function useInternalReduxForComponent<S extends {[prop: string]: any}, T extends ReduxInsideComponent<S>>(
  name: string, sliceFactory: (name: string) => T) {

  const [reactState, setReactState] = useState<S & {resourceMap?: ResourceMap}>();

  const toolkit = useMemo(() => {
    return sliceFactory(name);
  }, []);

  useEffect(() => {
    const sub = toolkit.getStore().pipe(
      op.tap(s => setReactState({...s, resourceMap: toolkit.resourceMap}))
    ).subscribe();

    return () => {
      sub.unsubscribe();
      toolkit.destory();
    };
  }, []);

  return {...toolkit, state: reactState};
}

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
