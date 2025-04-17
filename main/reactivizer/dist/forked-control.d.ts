import * as rx from 'rxjs';
import { Interceptor, Action, ActionMeta, InferPayload } from './stream-core';
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
    /** The forked base upStream, message being emitted to this stream will not go to any subscriber of current stream or controller */
    srcUpStream: rx.Subject<Action>;
    protected haltActionId: ActionMeta['i'] | null;
    protected interceptableAction: Action | undefined;
    constructor(src: RxController2<I>);
    /**
     * This method is supposed to be invoked when a certain Action message is recieved, at the moment
     * source forked stream has not recieved the same message yet.
     * By executing this method, current action message will be prevented from being emitted to any subscribers
     * of source forked stream.
     *
     * @return a function to continue emitting the intercepted message to source forked stream with chance to
     *    change the payload content of the message.
     *    the returned emit function has one parameter to allow replacing action payload, or executed with no
     *    parameter to emit same action message without any change.
    **/
    interceptSrcAction<K extends keyof I>(metaOrId: ActionMeta | ActionMeta['i']): (...overridePayload: InferPayload<I[K]>) => void;
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
export declare function isForked<I>(t: RxController2<I>): t is ForkedRxController<I>;
