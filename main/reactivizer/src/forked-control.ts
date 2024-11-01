import * as rx from 'rxjs';
import {Action, Interceptor} from './stream-core';
import {ActionInterceptor, RxController2} from './control2';

/**
 * Use a forked RxController to extend functionality of existing reactors of another RxController or ForkedRxController.
 *
 * A forkes controller shares same message dispatch stream (actionUpstream) from the source controller's
 * So that messages dispatched from both controller can be recieved by both controller's `action$`
 * subscription stream.
 *
 * A message interceptor of source RxController can impact all forked controller.
 * In a RxCntroller
 *
 */
export class ForkedRxController<I> extends RxController2<I> {
  forkedUpStream: rx.Subject<Action<unknown>>;
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
      return a$.pipe(
        rx.map(a => {
          // Ensure forked one recieve earlier than current controller
          this.forkedUpStream.next(a);
          // Ensure action emitted later than prependController
          return a;
        })
      );
    });
  }

  /* @override */
  prependInterceptor(interceptor: Interceptor): void {
    this.src.prependInterceptor(interceptor);
  }

  /* @override */
  prependInterceptorByType(interceptor: ActionInterceptor<I>): void {
    this.src.prependInterceptorByType(interceptor);
  }

  /** append interceptor to all source controllers */
  appendInterceptorToSrc(interceptor: Interceptor): void {
    if (isForked(this.src))
      this.src.appendInterceptorToSrc(interceptor);
    this.src.appendInterceptor(interceptor);
  }

  appendInterceptorToSrcByType(interceptor: ActionInterceptor<I>): void {
    if (isForked(this.src))
      this.src.appendInterceptorToSrcByType(interceptor);
    this.src.appendInterceptorByType(interceptor);
  }
}

function isForked<I>(t: RxController2<I>): t is ForkedRxController<I> {
  return (t as unknown as ForkedRxController<any>).appendInterceptorToSrc != null;
}
