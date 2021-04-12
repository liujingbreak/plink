import { InferableComponentEnhancerWithProps } from 'react-redux';
import { StateFactory, Slice, PayloadAction, SliceCaseReducers } from './redux-toolkit-observable';
import { Epic } from 'redux-observable';
import { ResourceMap } from './resource-map';
import * as rx from 'rxjs';
export declare type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});
export interface ReduxInsideComponent<S> {
    /** The store for non-primative data type and Redux unfriendly objects */
    resourceMap?: ResourceMap;
    getStore(): rx.Observable<S>;
    destory(): void;
}
export declare type EpicFactory<S, R extends SliceCaseReducers<S>, Name extends string> = (slice: Slice<S, R, Name>) => Epic<PayloadAction<any>, PayloadAction<any>, S>;
/**
 * Use "state" in React rendering template, use `getState()` to get current computed state from Redux Store,
 * be aware, `state` might not be the same as returned value of `getState()` at some moments.
 *
 * @param name
 * @param sliceFactory
 */
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit").EnhancedStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
