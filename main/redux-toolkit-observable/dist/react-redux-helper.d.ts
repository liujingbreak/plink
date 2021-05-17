import { InferableComponentEnhancerWithProps } from 'react-redux';
import { StateFactory, SliceCaseReducers } from './redux-toolkit-observable';
import { ofPayloadAction } from './state-factory-browser';
import { EpicFactory, SliceHelper, createReducers, RegularReducers } from './helper';
import { CreateSliceOptions } from '@reduxjs/toolkit';
export { EpicFactory, SliceHelper, ofPayloadAction, createReducers, RegularReducers };
export declare function useReduxTookit<S, R extends SliceCaseReducers<S>>(optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [state: S, slice: SliceHelper<S, R>];
export declare type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit").EnhancedStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
