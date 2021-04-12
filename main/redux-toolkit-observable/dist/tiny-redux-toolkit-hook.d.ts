import { Reducers, Slice, SliceOptions, EpicFactory } from './tiny-redux-toolkit';
export * from './tiny-redux-toolkit';
/**
 * For performance reason, better define opts.reducers outside of component rendering function
 * @param opts
 * @returns
 */
export declare function useTinyReduxTookit<S extends {
    error?: Error;
}, R extends Reducers<S>>(opts: SliceOptions<S, R> & {
    epicFactory?: EpicFactory<S, R>;
}): [
    state: S,
    slice: Slice<S, R>
];
