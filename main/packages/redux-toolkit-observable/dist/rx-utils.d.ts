/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
import { Observable, Subject, OperatorFunction } from 'rxjs';
type Plen<T> = (T extends (...a: infer A) => any ? A : [])['length'];
export type ActionTypes<AC> = {
    [K in keyof AC]: {
        type: string;
        payload: InferParam<AC[K]>;
    };
};
type InferParam<F> = Plen<F> extends 1 | 0 ? (F extends (a: infer A) => any ? A : unknown) : Plen<F> extends 2 ? F extends (...p: infer P) => any ? P : unknown : Plen<F> extends 1 | 2 ? F extends (a: infer A, b: infer B) => any ? A | [A, B] : F extends (...p: infer P) => any ? P : unknown : F extends (...p: infer P) => any ? P : unknown;
/**
 * @Deprecated
 * Use createActionStreamByType<R>() instead.
 * create Stream of action stream and action dispatcher,
 * similar to redux-observable Epic concept,
 * What you can get from this function are:
 *   1. An action observable (stream),
 *      so that you can subscribe to it and react with fantastic Reactive operators
 *      to handle complex async logic
 *
 *   2. An action dispatcher,
 *      so that you can emit new action along with paramters (payload) back to action observale stream.
 *
 *   3. An RxJs "filter()" operator to filter action by its type, it provides better Typescript
 *   type definition for downstream action compare bare "filter()"
 */
export declare function createActionStream<AC extends Record<string, ((...payload: any[]) => void)>>(actionCreator: AC, debug?: boolean): {
    dispatcher: AC;
    action$: Observable<ActionTypes<AC>[keyof AC]>;
    ofType: OfTypeFn<AC>;
    isActionType: <K extends keyof AC>(action: {
        type: unknown;
    }, type: K) => action is ActionTypes<AC>[K];
    nameOfAction: <K extends keyof AC>(action: ActionTypes<AC>[K]) => K;
};
type SimpleActionDispatchFactory<AC> = <K extends keyof AC>(type: K) => AC[K];
export type PayloadStreams<AC extends Record<string, (...a: any[]) => void>> = {
    [K in keyof AC]: Observable<InferParam<AC[K]>>;
};
interface CreateReplayableFn<AC extends Record<string, (...a: any[]) => void>> {
    <R extends (keyof AC)[]>(...actionTypes: R): PayloadStreams<Pick<AC, R[number]>>;
}
export type ActionStreamControl<AC extends Record<string, (...a: any[]) => void>> = {
    /** create `ReplaySubject(1)` for each `payloadByType` */
    createLatestPayloads: CreateReplayableFn<AC>;
    dispatcher: AC;
    dispatchStream: Subject<ActionTypes<AC>[keyof AC]>;
    payloadByType: PayloadStreams<AC>;
    actionByType: {
        [T in keyof AC]: Observable<ActionTypes<AC>[T]>;
    };
    /** @Deprecated use dispatcher.<actionName> instead */
    dispatchFactory: SimpleActionDispatchFactory<AC>;
    /** @Deprecated use `actionByType.<actionName>` instead */
    actionOfType<T extends keyof AC>(type: T): Observable<ActionTypes<AC>[T]>;
    changeActionInterceptor<T extends keyof AC>(interceptorFactory: (originalInterceptor: OperatorFunction<ActionTypes<AC>[T], ActionTypes<AC>[T]> | null) => OperatorFunction<ActionTypes<AC>[T], ActionTypes<AC>[T]>): void;
    action$: Observable<ActionTypes<AC>[keyof AC]>;
    createAction<K extends keyof AC>(type: K, ...params: Parameters<AC[K]>): ActionTypes<AC>[K];
    ofType: OfTypeFn<AC>;
    isActionType<K extends keyof AC>(action: {
        type: unknown;
    }, type: K): action is ActionTypes<AC>[K];
    nameOfAction(action: ActionTypes<AC>[keyof AC]): keyof AC | undefined;
    objectToAction(obj: {
        t: string;
        p: any;
    }): ActionTypes<AC>[keyof AC];
    _actionFromObject(obj: {
        t: string;
        p: any;
    }): void;
    _actionToObject(action: ActionTypes<AC>[keyof AC]): {
        t: string;
        p: any;
    };
};
/**
 * Unlike `createActionStream()`, this function only needs an "Action creator" type as generic type parameter,
 * instead of an actual empty "Action creator" object to be parameter
 *
 * create Stream of action stream and action dispatcher,
 * similar to redux-observable Epic concept,
 * What you can get from this function are:
 *   1. An action observable (stream),
 *      so that you can subscribe to it and react with fantastic Reactive operators
 *      to handle complex async logic
 *
 *   2. An action dispatcher,
 *      so that you can emit new action along with paramters (payload) back to action observale stream.
 *
 *   3. An RxJs "filter()" operator to filter action by its type, it provides better Typescript
 *   type definition for downstream action compare bare "filter()"
 */
export declare function createActionStreamByType<AC extends Record<string, ((...payload: any[]) => void)>>(opt?: {
    debug?: string | boolean;
    log?: (msg: string, ...objs: any[]) => unknown;
}): ActionStreamControl<AC>;
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<AC extends Record<string, ((...payload: any[]) => void)>>(action: ActionTypes<AC>[keyof AC]): keyof AC | undefined;
export interface OfTypeFn<AC> {
    <T extends (keyof AC)[]>(...types: T): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T[number]]>;
}
export {};
