import * as rx from 'rxjs';
import {Action} from './stream-core';
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
export class ActionDispenser<I> {
  private actionByType: Map<string, [rx.Subject<Action<I[keyof I]>>, rx.Observable<Action<I[keyof I]>>]> = new Map();
  private countSubscriber = new rx.BehaviorSubject<number>(0);
  private ofOtherTypesDispenser: rx.Subject<Action<I[keyof I]>> | undefined;
  private ofOtherTypesStream: rx.Observable<Action<I[keyof I]>> | undefined;

  constructor(source$: rx.Observable<Action<I[keyof I]>>, private typePrefix: string) {
    const disconnectSignal = new rx.Subject<void>();
    const connectSignal = new rx.Subject<void>();
    connectSignal.pipe(
      rx.exhaustMap(() => source$.pipe(
        rx.map(action => {
          const control = this.actionByType.get(action.t);
          if (control) {
            const [dispenser] = control;
            dispenser.next(action);
          } else if (this.ofOtherTypesDispenser) {
            this.ofOtherTypesDispenser.next(action);
          }
        }),
        rx.takeUntil(disconnectSignal)
      ))
    ).subscribe();

    this.countSubscriber.pipe(
      rx.scan((prev, v) => {
        if (prev === 0 && v === 1)
          connectSignal.next();
        else if (prev === 1 && v === 0)
          disconnectSignal.next();
        return v;
      })
    ).subscribe();
  }

  ofType<K extends keyof I & string>(type: K) {
    const key = this.typePrefix + type;
    const control = this.actionByType.get(key);
    if (control) {
      const [, stream] = control;
      return stream as rx.Observable<Action<I[K]>>;
    }
    const dispenser$ = new rx.Subject<Action<I[K]>>();
    const stream = rx.merge(
      dispenser$,
      new rx.Observable<never>(() => {
        this.countSubscriber.next(this.countSubscriber.getValue() + 1);
      })
    ).pipe(
      rx.finalize(() => {
        this.countSubscriber.next(this.countSubscriber.getValue() - 1);
      })
    );
    this.actionByType.set(key, [dispenser$, stream] as const);
    return stream;
  }

  ofOtherTypes() {
    if (this.ofOtherTypesStream)
      return this.ofOtherTypesStream;
    const dispenser$ = this.ofOtherTypesDispenser = new rx.Subject();
    this.ofOtherTypesStream = rx.merge(
      dispenser$,
      new rx.Observable<never>(() => {
        this.countSubscriber.next(this.countSubscriber.getValue() + 1);
      })
    ).pipe(
      rx.finalize(() => {
        this.countSubscriber.next(this.countSubscriber.getValue() - 1);
      })
    );
    return this.ofOtherTypesStream;
  }
}
