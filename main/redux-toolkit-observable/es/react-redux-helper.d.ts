import { InferableComponentEnhancerWithProps } from 'react-redux';
import { StateFactory } from './redux-toolkit-observable';
import { ResourceMap } from './resource-map';
import * as rx from 'rxjs';
export declare type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});
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
export declare function useInternalReduxForComponent<S extends {
    [prop: string]: any;
}, T extends ReduxInsideComponent<S>>(name: string, sliceFactory: (name: string) => T): T & {
    state: (S & {
        resourceMap?: ResourceMap | undefined;
    }) | undefined;
};
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit").EnhancedStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
