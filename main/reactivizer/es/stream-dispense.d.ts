import * as rx from 'rxjs';
import { Action } from './stream-core';
import { RxController2 } from './control2';
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
export declare class ActionDispenser<I> {
    private typePrefix;
    static ofRxController<X>(control: RxController2<X>): ActionDispenser<X>;
    private actionByType;
    private countSubscriber;
    private ofOtherTypesDispenser;
    private ofOtherTypesStream;
    constructor(source$: rx.Observable<Action<I[keyof I]>>, typePrefix: string);
    ofType<K extends keyof I & string>(type: K): rx.Observable<Action<I[K]>>;
    ofOtherTypes(): rx.Observable<Action<I[keyof I]>>;
}
