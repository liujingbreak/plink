import * as rx from 'rxjs';
import { Action } from './stream-core';
import { PayloadByType, ActionByType } from './inferred-types';
import { SimplexReactor } from './simplex-reactor';
import { RxController2 } from './control2';
import { ForkedRxController } from './forked-control';
type InferInterface<X> = X extends SimplexReactor<infer Y, any> ? Y : X extends RxController2<infer I> ? I : X extends ForkedRxController<infer I> ? I : never;
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
export declare class ActionDispenser<I> {
    static ofRxController<X>(control: RxController2<X>): ActionDispenser<X>;
    /** you need explicitly specify generic type parameter of this function, it won't inference proper type itself
     * X - SimplexReactor or RxController2
     * */
    static ofAction$<X>(action$: rx.Observable<Action<any>>): ActionDispenser<InferInterface<X>>;
    /** Action observable streamby type */
    at: ActionByType<I>;
    /** Abbrevation of payloadByType */
    pt: PayloadByType<I>;
    private actionByType;
    private countSubscriber;
    private ofOtherTypesDispenser;
    private ofOtherTypesStream;
    constructor(source$: rx.Observable<Action<unknown>>);
    ofType<K extends keyof I & string>(type: K): rx.Observable<Action<I[K]>>;
    ofOtherTypes(): rx.Observable<Action<unknown>>;
}
export {};
