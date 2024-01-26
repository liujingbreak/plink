import * as rx from 'rxjs';
import {InferPayload, ActionMeta, Action} from './stream-core';
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
