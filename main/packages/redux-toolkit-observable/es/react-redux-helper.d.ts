import { InferableComponentEnhancerWithProps } from 'react-redux';
import { CreateSliceOptions, Draft } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import { EpicFactory, SliceHelper } from './helper';
import { StateFactory, SliceCaseReducers, ofPayloadAction, PayloadAction } from './redux-toolkit-observable';
export { ofPayloadAction };
export { connect, Provider as ReduxProvider } from 'react-redux';
export * from './helper';
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
export declare function useReduxTookitWith<S extends Record<string, any>, R extends SliceCaseReducers<S>>(stateFactory: StateFactory, optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>];
/**
 * Use a dedicated Redux slice store for single component instance
 * @param optsFactory
 * @param epicFactories
 */
export declare function useReduxTookit<S extends Record<string, any>, R extends SliceCaseReducers<S>>(optsFactory: () => CreateSliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [S, SliceHelper<S, R>];
/**
 * Use a dedicated Redux slice store for single component instance.
 * Unlike useReduxTookit, useRtk() accepts a State which extends BaseComponentState,
 *  useRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory
 * @param epicFactories
 * @returns [state, sliceHelper]
 */
export declare function useRtk<Props extends Record<string, any>, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>>(optsFactory: () => CreateSliceOptions<S, R>, props: Props, ...epicFactories: Array<EpicFactory4Comp<Props, S, R> | null | undefined>): [S, SliceHelper<S, R & CompPropsSyncReducer<Props, S>>];
export interface BaseComponentState<Props> {
    componentProps?: Props;
}
export type EpicFactory4Comp<Props, S extends BaseComponentState<Props>, R extends SliceCaseReducers<S>, Name extends string = string> = (slice: SliceHelper<S, R & CompPropsSyncReducer<Props, S>>) => Epic<PayloadAction<any>, any, {
    [Sn in Name]: S;
}> | void;
type CompPropsSyncReducer<Props, S extends BaseComponentState<Props>> = {
    _syncComponentProps(s: S | Draft<S>, action: PayloadAction<Props>): void;
    _willUnmount(s: S | Draft<S>): void;
};
export type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {
    [p: string]: unknown;
}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {
    [p: string]: unknown;
});
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
