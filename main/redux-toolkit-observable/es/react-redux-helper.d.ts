import { InferableComponentEnhancerWithProps } from 'react-redux';
import { StateFactory, SliceCaseReducers, ofPayloadAction } from './redux-toolkit-observable';
import { EpicFactory, SliceHelper } from './helper';
import { CreateSliceOptions } from '@reduxjs/toolkit';
export { ofPayloadAction };
export * from './helper';
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
export declare function useReduxTookitWith<S, R extends SliceCaseReducers<S>>(stateFactory: StateFactory, optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>];
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
export declare function useReduxTookit<S, R extends SliceCaseReducers<S>>(optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>];
export declare type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit").EnhancedStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
