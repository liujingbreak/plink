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
    /* @override */
    prependInterceptor(...interceptor) {
        this.src.prependInterceptor(...interceptor);
    }
    /** append interceptor to all source controllers */
    appendInterceptorToSrc(...interceptors) {
        if (isForked(this.src))
            this.src.appendInterceptorToSrc(...interceptors);
        this.src.appendInterceptor(...interceptors);
    }
}
export function isForked(t) {
    return t.appendInterceptorToSrc != null;
}
//# sourceMappingURL=forked-control.js.map