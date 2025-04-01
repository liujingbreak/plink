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
        this.config(Object.assign(Object.assign({}, src.opts), { debug: false }));
        src.configChange.pipe(rx.map(c => {
            c.delete('debug');
            return c;
        })).subscribe(this.configChange);
        this.forkedUpStream = this.actionUpstream;
        this.actionUpstream = src.actionUpstream;
        src.appendInterceptor(a$ => {
            return a$.pipe(rx.map(a => {
                // Ensure forked one recieve earlier than current controller
                this.forkedUpStream.next(a);
                // Ensure action emitted later than prependController
                return a;
            }));
        });
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