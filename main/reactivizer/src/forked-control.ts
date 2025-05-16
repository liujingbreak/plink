import * as rx from 'rxjs';
import {Interceptor, Action} from './stream-core';
import {RxController2} from './control2';

/**
 * Use a forked RxController to extend functionality of existing reactors of another RxController or ForkedRxController.
 *
 * A forkes controller shares same message dispatch stream (actionUpstream) from the source controller's
 * So that messages dispatched from both controller can be recieved by both controller's `action$`
 * subscription stream.
 *
 * A message interceptor of source RxController can impact all forked controller.
 */
export class ForkedRxController<I> extends RxController2<I> {
  /** Any message being emitted to this subject will not be dispatched to "base" controller */
  forkUpStream: rx.Subject<Action>;
  /** The forked base upStream, message being emitted to this stream will not be revieved by any subscriber of current stream or controller */
  srcUpStream: rx.Subject<Action>;
  constructor(protected src: RxController2<I>) {
    super();
    this.config({...src.opts as any, debug: false});
    src.configChange.pipe(
      rx.map(c => {
        c.delete('debug');
        return c;
      })
    ).subscribe(this.configChange);
    this.forkUpStream = this.actionUpstream;
    this.actionUpstream = src.actionUpstream;
    if (src instanceof ForkedRxController) {
      this.srcUpStream = new rx.Subject<Action>();
      this.srcUpStream.pipe(
        rx.tap(src.srcUpStream),
        rx.tap(src._noFilterUpstream)
      ).subscribe();
    } else {
      this.srcUpStream = src._noFilterUpstream;
    }
    src.appendInterceptor(a$ => {
      return a$.pipe(
        rx.map(a => {
          // Ensure forked one recieve earlier than current controller
          this.forkUpStream.next(a);
          // Ensure action emitted later than prependController
          return a;
        })
      );
    });
  }

  /** @override */
  prependInterceptor(...interceptor: Interceptor[]) {
    return this.src.prependInterceptor(...interceptor);
  }

  /** @override */
  removeInterceptor(...interc: Interceptor[]) {
    this.src.removeInterceptor(...interc);
  }

  /** append interceptor to all source controllers
   * @returns a function to remove added interceptors
  **/
  appendInterceptorToSrc(...interceptors: Interceptor[]) {
    if (this.src instanceof ForkedRxController)
      this.src.appendInterceptorToSrc(...interceptors);
    this.src.appendInterceptor(...interceptors);
    return () => {
      this.removeInterceptorFromSrc(...interceptors);
    };
  }

  removeInterceptorFromSrc(...interceptors: Interceptor[]) {
    if (this.src instanceof ForkedRxController)
      this.src.removeInterceptorFromSrc(...interceptors);
    this.src.removeInterceptor(...interceptors);
  }
}

