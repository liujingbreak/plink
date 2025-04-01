import * as rx from 'rxjs';
import {Action} from './stream-core';
import {RxController2} from './control2';

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
export class ForkedPostRxController<I> extends RxController2<I> {
  /** Any message being emitted to this subject will not be dispatched to "base" controller */
  protected forkedUpStream: rx.Subject<Action>;
  constructor(protected src: RxController2<I>) {
    super();
    this.config({...src.opts as any, debug: false});
    src.configChange.pipe(
      rx.map(c => {
        c.delete('debug');
        return c;
      })
    ).subscribe(this.configChange);
    this.forkedUpStream = this.actionUpstream;
    this.actionUpstream = src.actionUpstream;

    src.appendInterceptor(a$ => {
      const srcOut$ = new rx.Subject<Action<any>>();
      return rx.merge(
        a$.pipe(
          rx.map(a => {
            srcOut$.next(a);
            // Ensure forked one recieve later than current controller
            this.forkedUpStream.next(a);
          }),
          rx.ignoreElements()
        ),
        srcOut$
      );
    });
  }
}

