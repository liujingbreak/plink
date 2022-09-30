/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
import { Observable } from 'rxjs';
declare type Plen<T> = (T extends (...a: infer A) => any ? A : [])['length'];
export declare type ActionTypes<AC> = {
    [K in keyof AC]: {
        type: K;
        payload: InferParam<AC[K]>;
    };
};
declare type InferParam<F> = Plen<F> extends 1 | 0 ? (F extends (a: infer A) => any ? A : unknown) : Plen<F> extends 2 ? F extends (...p: infer P) => any ? P : unknown : Plen<F> extends 1 | 2 ? F extends (a: infer A, b: infer B) => any ? A | [A, B] : F extends (...p: infer P) => any ? P : unknown : F extends (...p: infer P) => any ? P : unknown;
/**
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
};
declare type SimpleActionDispatchFactory<AC> = <K extends keyof AC>(type: K) => AC[K];
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
}): {
    dispatcher: AC;
    dispatchFactory: SimpleActionDispatchFactory<AC>;
    action$: Observable<ActionTypes<AC>[keyof AC]>;
    actionOfType: <T extends keyof AC>(type: T) => Record<keyof AC, Observable<ActionTypes<AC>[keyof AC]>>[T];
    ofType: OfTypeFn<AC>;
    isActionType: <K extends keyof AC>(action: {
        type: unknown;
    }, type: K) => action is ActionTypes<AC>[K];
};
export interface OfTypeFn<AC> {
    <T extends keyof AC>(type: T): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
    <T extends keyof AC, T2 extends keyof AC>(type: T, type2: T2): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T] | ActionTypes<AC>[T2]>;
    <T extends keyof AC, T2 extends keyof AC, T3 extends keyof AC>(type: T, type2: T2, type3: T3): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T] | ActionTypes<AC>[T2] | ActionTypes<AC>[T3]>;
    <T extends keyof AC>(...types: T[]): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
}
export {};
