import * as rx from 'rxjs';
import {InferPayload, ActionMeta, Action} from './stream-core';
import {ReactorComposite} from './epic';
import {ReactorComposite2} from './reactor-composite';
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
  [P in KS[number]]: InferPayload<I[P]> | []
};

export type PayloadByType<I> = {
  [K in keyof I]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>
};

export type ActionByType<I> = {
  [K in keyof I]: rx.Observable<Action<I[K]>>
};

type InferInputActionsType<R> = R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>;
type InferOutputEventsType<R> = R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>;
type ExtractTupleElement<T> = T extends readonly (infer R)[] ? R : never;
type InferLatestActionType<R> = R extends ReactorComposite<any, any, infer LI, any> ? ExtractTupleElement<LI> : never;
type InferLatestEventsType<R> = R extends ReactorComposite<any, any, any, infer LO> ? ExtractTupleElement<LO> : never;

/** An utility type inference which helps to define a new ReactorComposite type based on extending an existing ReactorComposite type */
export type ReactorCompositeMergeType<
  R extends ReactorComposite<any, any, any, any>,
  ExActions = Record<never, never>,
  ExEvents = Record<never, never>,
  ELI extends readonly (keyof ExActions | keyof InferInputActionsType<R>)[] = readonly [],
  ELO extends readonly (keyof ExEvents | keyof InferOutputEventsType<R>)[] = readonly []
> = ReactorComposite<
(R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>) & ExActions,
(R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>) & ExEvents,
readonly (InferLatestActionType<R> | ExtractTupleElement<ELI>)[],
readonly (InferLatestEventsType<R> | ExtractTupleElement<ELO>)[]
>;

/** An utility type inference which helps to define a new ReactorComposite2 type based on extending an existing ReactorComposite type */
export type ReactorCompositeMergeType2<
  R extends ReactorComposite2<any, any, any, any>,
  ExActions = Record<never, never>,
  ExEvents = Record<never, never>,
  ELI extends readonly (keyof ExActions | keyof InferInputActionsType<R>)[] = readonly [],
  ELO extends readonly (keyof ExEvents | keyof InferOutputEventsType<R>)[] = readonly []
> = ReactorComposite2<
(R extends ReactorComposite2<infer I, any, any, any> ? I : Record<never, never>) & ExActions,
(R extends ReactorComposite2<any, infer O, any, any> ? O : Record<never, never>) & ExEvents,
readonly (InferLatestActionType<R> | ExtractTupleElement<ELI>)[],
readonly (InferLatestEventsType<R> | ExtractTupleElement<ELO>)[]
>;

export type InferFuncReturnEvents<I> = {
  [K in keyof I as `${K & string}Resolved`]: (
    p: I[K] extends (...args: any) => PromiseLike<infer P> ?
      P : I[K] extends (...args: any) =>  rx.Observable<infer OB> ?
        OB : I[K] extends infer R ? R : unknown) => void
} & {
  [K in keyof I as `${K & string}Completed`]: () => void;
};

