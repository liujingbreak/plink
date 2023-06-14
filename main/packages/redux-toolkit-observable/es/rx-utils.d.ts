/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
import { Observable, OperatorFunction } from 'rxjs';
type Plen<T> = (T extends (...a: infer A) => any ? A : [])['length'];
export type ActionTypes<AC> = {
    [K in keyof AC]: {
        type: string;
        payload: InferParam<AC[K]>;
    };
};
type InferParam<F> = Plen<F> extends 1 | 0 ? (F extends (a: infer A) => any ? A : unknown) : Plen<F> extends 2 ? F extends (...p: infer P) => any ? P : unknown : Plen<F> extends 1 | 2 ? F extends (a: infer A, b: infer B) => any ? A | [A, B] : F extends (...p: infer P) => any ? P : unknown : F extends (...p: infer P) => any ? P : unknown;
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
    nameOfAction: <K extends keyof AC>(action: ActionTypes<AC>[K]) => K;
};
type SimpleActionDispatchFactory<AC> = <K extends keyof AC>(type: K) => AC[K];
export type ActionStreamControl<AC> = {
    dispatcher: AC;
    /** use dispatcher.<actionName> instead */
    dispatchFactory: SimpleActionDispatchFactory<AC>;
    actionOfType<T extends keyof AC>(type: T): Observable<ActionTypes<AC>[T]>;
    changeActionInterceptor<T extends keyof AC>(interceptorFactory: (originalInterceptor: OperatorFunction<ActionTypes<AC>[T], ActionTypes<AC>[T]> | null) => OperatorFunction<ActionTypes<AC>[T], ActionTypes<AC>[T]>): void;
    action$: Observable<ActionTypes<AC>[keyof AC]>;
    ofType: OfTypeFn<AC>;
    isActionType<K extends keyof AC>(action: {
        type: unknown;
    }, type: K): action is ActionTypes<AC>[K];
    nameOfAction(action: ActionTypes<AC>[keyof AC]): keyof AC | undefined;
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
export interface OfTypeFn<AC> {
    <T extends keyof AC>(type: T): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
    <T extends keyof AC, T2 extends keyof AC>(type: T, type2: T2): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T] | ActionTypes<AC>[T2]>;
    <T extends keyof AC, T2 extends keyof AC, T3 extends keyof AC>(type: T, type2: T2, type3: T3): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T] | ActionTypes<AC>[T2] | ActionTypes<AC>[T3]>;
    <T extends keyof AC>(...types: T[]): (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
}
export {};
