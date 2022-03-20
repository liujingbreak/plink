import { OperatorFunction, Observable } from 'rxjs';
export declare function reselect<T, R, R1, R2, R3, R4, R5>(selectors: [
    (current: T) => R1,
    (current: T) => R2,
    (current: T) => R3,
    (current: T) => R4,
    (current: T) => R5,
    ...((current: T) => any)[]
], combine: (...results: [R1, R2, R3, R4, R5, ...any[]]) => R): OperatorFunction<T, R>;
/**
 * redux-observable like async reactive actions, side effect utilities
 * https://redux-observable.js.org/
 */
export declare type ActionTypes<AC> = {
    [K in keyof AC]: {
        type: K;
        payload: AC[K] extends (p: infer P) => any ? P : AC[K] extends (...p: infer PArray) => any ? PArray : unknown;
    };
};
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
export declare function createActionStream<AC>(actionCreator: AC, debug?: boolean): {
    dispatcher: AC;
    action$: Observable<ActionTypes<AC>[keyof AC]>;
    ofType: <T extends keyof AC>(type: T) => (upstream: Observable<any>) => Observable<ActionTypes<AC>[T]>;
};
