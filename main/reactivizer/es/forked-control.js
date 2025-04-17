import * as rx from 'rxjs';
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
export class ForkedRxController extends RxController2 {
    constructor(src) {
        super();
        this.src = src;
        /** The forked base upStream, message being emitted to this stream will not go to any subscriber of current stream or controller */
        this.srcUpStream = new rx.Subject();
        this.haltActionId = null;
        this.config(Object.assign(Object.assign({}, src.opts), { debug: false }));
        src.configChange.pipe(rx.map(c => {
            c.delete('debug');
            return c;
        })).subscribe(this.configChange);
        this.forkUpStream = this.actionUpstream;
        this.actionUpstream = src.actionUpstream;
        src.appendInterceptor(a$ => {
            return rx.merge(a$.pipe(rx.map(a => {
                this.interceptableAction = a;
                // Ensure forked one recieve earlier than current controller
                this.forkUpStream.next(a);
                // Ensure action emitted later than prependController
                return a;
            }), rx.filter(a => a.i !== this.haltActionId)), this.srcUpStream);
        });
    }
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
    interceptSrcAction(metaOrId) {
        var _a;
        const actionId = typeof metaOrId === 'number' ? metaOrId : metaOrId.i;
        if (actionId !== ((_a = this.interceptableAction) === null || _a === void 0 ? void 0 : _a.i)) {
            throw new Error(`Current interceptable action is ${this.interceptableAction ? '[id: ' + this.interceptableAction.i + ', type: ' + this.interceptableAction.t + ']' : this.interceptableAction}, ` +
                'which does not match action ID: ' + actionId);
        }
        this.haltActionId = actionId;
        return (...overridePayload) => {
            this.srcUpStream.next(overridePayload.length > 0 ? Object.assign(Object.assign({}, this.interceptableAction), { p: overridePayload }) :
                this.interceptableAction);
        };
    }
    /** @override */
    prependInterceptor(...interceptor) {
        return this.src.prependInterceptor(...interceptor);
    }
    /** @override */
    removeInterceptor(...interc) {
        this.src.removeInterceptor(...interc);
    }
    /** append interceptor to all source controllers
     * @returns a function to remove added interceptors
    **/
    appendInterceptorToSrc(...interceptors) {
        if (isForked(this.src))
            this.src.appendInterceptorToSrc(...interceptors);
        this.src.appendInterceptor(...interceptors);
        return () => {
            this.removeInterceptorFromSrc(...interceptors);
        };
    }
    removeInterceptorFromSrc(...interceptors) {
        if (isForked(this.src))
            this.src.removeInterceptorFromSrc(...interceptors);
        this.src.removeInterceptor(...interceptors);
    }
}
export function isForked(t) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return t.appendInterceptorToSrc != null;
}
//# sourceMappingURL=forked-control.js.map