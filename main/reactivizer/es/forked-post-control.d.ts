import * as rx from 'rxjs';
import { Action } from './stream-core';
import { RxController2 } from './control2';
/**
 * Use a forked RxController to extend functionality of existing reactors of another RxController or ForkedRxController.
 *
 * A forkes controller shares same message dispatch stream (actionUpstream) from the source controller's
 * So that messages dispatched from both controller can be recieved by both controller's `action$`
 * subscription stream.
 *
 * Unlike ForkedRxController, the subscription to this stream controller always recieves same messages
 * later than subscriptions to the base stream controller
 */
export declare class ForkedPostRxController<I> extends RxController2<I> {
    protected src: RxController2<I>;
    /** Any message being emitted to this subject will not be dispatched to "base" controller */
    forkedUpStream: rx.Subject<Action<unknown>>;
    constructor(src: RxController2<I>);
}
