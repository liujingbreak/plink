import * as rx from 'rxjs';
import { InferPayload, ActionMeta, Action } from './stream-core';
import { SingleActionFactory } from './control2';
import { ReactorComposite } from './epic';
import { ReactorCompositeOpt, SimplexReactorOptions } from './reactor-base';
import { ReactorComposite2 } from './reactor-composite';
import { SimplexReactor } from './simplex-reactor';
/**
 * If we consider ActionTable a 2-dimentional data structure, this is the infer type of it.
 * Each row is latest action payload of an action type (or name),
 * each column is a element of payload content array.
 *
 * If you use ActionTable as a frontend UI state (like for a UI template), this infer type
 * defines exactly data structure of it.
 *
 */
export type ActionTableDataType<I, KS extends ReadonlyArray<keyof I>> = {
    [P in KS[number]]: InferPayload<I[P]> | [];
};
export type PayloadByType<I> = {
    [K in keyof I]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>;
};
export type ActionByType<I> = {
    [K in keyof I]: rx.Observable<Action<I[K]>>;
};
type InferInputActionsType<R> = R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>;
type InferOutputEventsType<R> = R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>;
type InferLatestInputType<R> = R extends ReactorComposite<any, any, infer LI, any> ? ExtractTupleElement<LI> : never;
type InferLatestOutputType<R> = R extends ReactorComposite<any, any, any, infer LO> ? ExtractTupleElement<LO> : never;
export type ExtractTupleElement<T> = T extends readonly (infer R)[] ? R : never;
type InferInputType2<R> = R extends ReactorComposite2<infer I, any, any, any> ? I : Record<never, never>;
type InferOutputType2<R> = R extends ReactorComposite2<any, infer O, any, any> ? O : Record<never, never>;
type InferLatestInputType2<R> = R extends ReactorComposite2<any, any, infer LI, any> ? ExtractTupleElement<LI> : never;
type InferLatestOutputType2<R> = R extends ReactorComposite2<any, any, any, infer LO> ? ExtractTupleElement<LO> : never;
/** @deprecated
 * An utility type inference which helps to define a new ReactorComposite type based on extending an existing ReactorComposite type */
export type ReactorCompositeExtendType1<R extends ReactorComposite<any, any, any, any>, ExActions = Record<never, never>, ExEvents = Record<never, never>, ELI extends readonly (keyof ExActions | keyof InferInputActionsType<R>)[] = readonly [], ELO extends readonly (keyof ExEvents | keyof InferOutputEventsType<R>)[] = readonly []> = ReactorComposite<(R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>) & ExActions, (R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>) & ExEvents, readonly (InferLatestInputType<R> | ExtractTupleElement<ELI>)[], readonly (InferLatestOutputType<R> | ExtractTupleElement<ELO>)[]>;
/** An utility type inference which helps to define a new ReactorComposite2 type based on extending an existing ReactorComposite type */
export type ReactorCompositeExtendType<R extends ReactorComposite2<any, any, any, any>, ExActions = Record<never, never>, ExEvents = Record<never, never>, ELI extends readonly (keyof ExActions | keyof InferInputType2<R>)[] = readonly [], ELO extends readonly (keyof ExEvents | keyof InferOutputType2<R>)[] = readonly []> = ReactorComposite2<InferInputType2<R> & ExActions, InferOutputType2<R> & ExEvents, readonly (InferLatestInputType2<R> | ExtractTupleElement<ELI>)[], readonly (InferLatestOutputType2<R> | ExtractTupleElement<ELO>)[]>;
export type ReactorCompositeMergeType<R1 extends ReactorComposite2<any, any, any, any>, R2 extends ReactorComposite2<any, any, any, any>> = ReactorComposite2<InferInputType2<R1> & InferInputType2<R2>, InferOutputType2<R1> & InferOutputType2<R2>, readonly (InferLatestInputType2<R1> | InferLatestInputType2<R2>)[], readonly (InferLatestOutputType2<R1> | InferLatestOutputType2<R2>)[]>;
export type ActionFactoryOfPlainType<P> = {
    [K in keyof P]: P[K] extends (...a: infer A) => any ? (...a: A) => SingleActionFactory : undefined;
};
export type InferFuncReturnEvents<I> = {
    [K in keyof I as `${K & string}Resolved`]: (p: I[K] extends (...args: any) => PromiseLike<infer P> ? P : I[K] extends (...args: any) => rx.Observable<infer OB> ? OB : I[K] extends infer R ? R : unknown) => SingleActionFactory;
} & {
    [K in keyof I as `${K & string}Completed`]: () => SingleActionFactory;
};
export type InferRCOptions<R extends ReactorComposite2<any, any, any, any>> = ReactorCompositeOpt<InferInputType2<R>, InferOutputType2<R>, InferLatestInputType2<R>[], InferLatestOutputType2<R>[]>;
/** Infer type of ReactorComposite2 of functions */
export type InferRCOfFuncs<F> = ReactorComposite2<ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F>>;
/** Infer type of ReactorComposite2 of recursive functions */
export type InferRCOfRecursiveFuncs<F> = ReactorComposite2<ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, InferFuncReturnEvents<F>>;
export type InferRCOptionsOfFuncs<F> = ReactorCompositeOpt<ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F>>;
export type InferRCOptionsOfRecursiveFuncs<F> = ReactorCompositeOpt<ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, InferFuncReturnEvents<F>>;
export type InferActionsOfSmplxRctr<R> = R extends SimplexReactor<infer I, any> ? I : unknown;
export type InferTableForSmplxRctr<R> = R extends SimplexReactor<any, infer L> ? ExtractTupleElement<L> : never;
export type SimplexReactorMergeType<R1 extends SimplexReactor<any, any>, R2 extends SimplexReactor<any, any>> = SimplexReactor<InferActionsOfSmplxRctr<R1> & InferActionsOfSmplxRctr<R2>, readonly (InferTableForSmplxRctr<R1> | InferTableForSmplxRctr<R2>)[]>;
export type OptionsOfMergedSmplxRctr<R1 extends SimplexReactor<any, any>, R2 extends SimplexReactor<any, any>> = SimplexReactorOptions<InferActionsOfSmplxRctr<R1> & InferActionsOfSmplxRctr<R2>, readonly (InferTableForSmplxRctr<R1> | InferTableForSmplxRctr<R2>)[]>;
export {};
