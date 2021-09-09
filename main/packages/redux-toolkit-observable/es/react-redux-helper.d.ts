import { InferableComponentEnhancerWithProps } from 'react-redux';
import { StateFactory, SliceCaseReducers, ofPayloadAction, PayloadAction } from './redux-toolkit-observable';
import { EpicFactory, SliceHelper } from './helper';
import { CreateSliceOptions, Draft } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
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
/**
 * Use a dedicated Redux slice store for single component instance.
 * Unlike useReduxTookit, useRtk() accepts a State which extends BaseComponentState,
 *  useRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory
 * @param epicFactories
 * @returns [state, sliceHelper]
 */
export declare function useRtk<Props, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>>(optsFactory: () => CreateSliceOptions<S, R>, props: Props, ...epicFactories: Array<EpicFactory4Comp<Props, S, R> | null | undefined>): [
    S,
    SliceHelper<S, R & CompPropsSyncReducer<Props, S>>
];
export interface BaseComponentState<Props> {
    componentProps?: Props;
}
export declare type EpicFactory4Comp<Props, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>> = (slice: SliceHelper<S, R & CompPropsSyncReducer<Props, S>>) => Epic<PayloadAction<any>, any, unknown> | void;
declare type CompPropsSyncReducer<Props, S extends BaseComponentState<Props>> = {
    _syncComponentProps(s: S | Draft<S>, action: PayloadAction<Props>): void;
    _willUnmount(s: S | Draft<S>): void;
};
export declare type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {
    [p: string]: unknown;
}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {
    [p: string]: unknown;
});
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit").EnhancedStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
