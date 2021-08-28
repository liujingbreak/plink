import { Reducers, Slice, SliceOptions, EpicFactory, OfTypeFn, Epic } from './tiny-redux-toolkit';
export * from './tiny-redux-toolkit';
export interface BaseComponentState<Props> {
    componentProps?: Props;
    error?: Error;
}
declare type CompPropsSyncReducer<Props, S extends BaseComponentState<Props>> = {
    _syncComponentProps(s: S, payload: Props): void;
    _willUnmount(s: S): void;
};
export declare type EpicFactory4Comp<Props, S extends BaseComponentState<Props>, R extends Reducers<S>> = (slice: Slice<S, R & CompPropsSyncReducer<Props, S>>, ofType: OfTypeFn<S, R & CompPropsSyncReducer<Props, S>>) => Epic<S> | void;
/**
 * Unlike useTinyReduxTookit, useTinyRtk() accepts a State which extends BaseComponentState,
 *  useTinyRtk() will automatically create an extra reducer "_syncComponentProps" for shallow coping
 * React component's properties to this internal RTK store
 * @param optsFactory
 * @param props
 * @param epicFactories
 * @returns
 */
export declare function useTinyRtk<Props, S extends BaseComponentState<Props>, R extends Reducers<S>>(optsFactory: () => SliceOptions<S, R>, props: Props, ...epicFactories: Array<EpicFactory4Comp<Props, S, R> | null | undefined>): [state: S, slice: Slice<S, R & CompPropsSyncReducer<Props, S>>];
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
export declare function useTinyReduxTookit<S extends {
    error?: Error;
}, R extends Reducers<S>>(optsFactory: () => SliceOptions<S, R>, ...epicFactories: Array<EpicFactory<S, R> | null | undefined>): [state: S, slice: Slice<S, R>];
