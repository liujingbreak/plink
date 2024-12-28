import * as rx from 'rxjs';
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
export class PostForkedRxController extends RxController2 {
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
            const srcOut$ = new rx.Subject();
            return rx.merge(a$.pipe(rx.map(a => {
                srcOut$.next(a);
                // Ensure forked one recieve later than current controller
                this.forkedUpStream.next(a);
            }), rx.ignoreElements()), srcOut$);
        });
    }
}
//# sourceMappingURL=post-forked-control.js.map