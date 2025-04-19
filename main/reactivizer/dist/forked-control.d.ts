import * as rx from 'rxjs';
import { Interceptor, Action } from './stream-core';
import { RxController2 } from './control2';
/**
 * Use a forked RxController to extend functionality of existing reactors of another RxController or ForkedRxController.
 *
 * A forkes controller shares same message dispatch stream (actionUpstream) from the source controller's
 * So that messages dispatched from both controller can be recieved by both controller's `action$`
 * subscription stream.
 *
 * A message interceptor of source RxController can impact all forked controller.
 */
export declare class ForkedRxController<I> extends RxController2<I> {
    protected src: RxController2<I>;
    /** Any message being emitted to this subject will not be dispatched to "base" controller */
    forkUpStream: rx.Subject<Action>;
    /** The forked base upStream, message being emitted to this stream will not be revieved by any subscriber of current stream or controller */
    srcUpStream: rx.Subject<Action>;
    constructor(src: RxController2<I>);
    /** @override */
    prependInterceptor(...interceptor: Interceptor[]): () => void;
    /** @override */
    removeInterceptor(...interc: Interceptor[]): void;
    /** append interceptor to all source controllers
     * @returns a function to remove added interceptors
    **/
    appendInterceptorToSrc(...interceptors: Interceptor[]): () => void;
    removeInterceptorFromSrc(...interceptors: Interceptor[]): void;
}
