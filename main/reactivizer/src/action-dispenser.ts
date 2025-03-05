import * as rx from 'rxjs';
import {Action} from './stream-core';
import {mapActionToPayload} from './control';
import {PayloadByType, ActionByType} from './inferred-types';
import {InferMapParam} from './stream-core';
import {SimplexReactor} from './simplex-reactor';
import {RxController2} from './control2';
import {ForkedRxController} from './forked-control';
import {ForkedPostRxController} from './forked-post-control';

type InferInterface<X> = X extends SimplexReactor<infer Y, any> ?
  Y :
  X extends RxController2<infer I> ?
    I : X extends ForkedRxController<infer I> ? I :
      X extends ForkedPostRxController<infer I> ? I : X;
/**
 * A very core functionality of @reactivizer is splitting action stream
 * by action types.
 * This class is supposed to offer better performance than
 * brutal operators like ofType() and filter(), it avoids
 * large number of subscription on action$ which triggers
 * multiple times of "ofType" (action type comparison operation) calculation on each action message.
 */
export class ActionDispenser<I> {
  static ofRxController<X>(control: RxController2<X>) {
    return new ActionDispenser<X>(control.action$);
  }
  /** you need explicitly specify generic type parameter of this function, it won't inference proper type itself
   * X - SimplexReactor or RxController2
   * */
  static ofAction$<X>(action$: rx.Observable<Action<any>>) {
    return new ActionDispenser<InferInterface<X>>(action$ as rx.Observable<Action<InferInterface<X>[keyof InferInterface<X>]>>);
  }
  /** Action observable streamby type */
  at: ActionByType<I>;
  /** Abbrevation of payloadByType */
  pt: PayloadByType<I>;
  private actionByType: Map<string, [dispener: rx.Subject<Action<(...a: any[]) => any>>, outStream: rx.Observable<Action<(...a: any[]) => any>>]> = new Map();
  private countSubscriber = new rx.BehaviorSubject<number>(0);
  private ofOtherTypesDispenser: rx.Subject<Action<unknown>> | undefined;
  private ofOtherTypesStream: rx.Observable<Action<unknown>> | undefined;

  constructor(source$: rx.Observable<Action<unknown>>) {
    const disconnectSignal = new rx.Subject<void>();
    const connectSignal = new rx.Subject<void>();
    connectSignal.pipe(
      rx.exhaustMap(() => source$.pipe(
        rx.map(action => {
          const control = this.actionByType.get(action.t);
          if (control) {
            const [dispenser] = control;
            dispenser.next(action as Action<I[keyof I]>);
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

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.at = new Proxy(
      {} as{[K in keyof I]: rx.Observable<Action<I[K]>>},
      {
        get(_target, type, _rec) {
          return self.ofType(type as keyof I & string);
        },
        has(_target, key) {
          return self.actionByType.has(key as string);
        },
        ownKeys() {
          return [...self.actionByType.keys()];
        }
      });

    const payloadsByType = new Map<string | symbol, rx.Observable<InferMapParam<I[keyof I]>>>();
    this.pt = new Proxy(
      {} as {[K in keyof I]: rx.Observable<InferMapParam<I[K]>>},
      {
        get(_target, key, _rec) {
          let p$ = payloadsByType.get(key);
          if (p$ == null) {
            const a$ = self.ofType(key as keyof I & string);
            p$ = a$.pipe(
              mapActionToPayload(),
              rx.share()
            );
            payloadsByType.set(key, p$);
          }
          return p$;
        },
        has(_target, key) {
          return typeof key === 'string';
        },
        ownKeys() {
          return [];
        }
      });
  }

  ofType<K extends keyof I & string>(type: K): rx.Observable<Action<I[K]>> {
    const control = this.actionByType.get(type);
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
    this.actionByType.set(type, [dispenser$ as any, stream] as const);
    return stream;
  }

  ofOtherTypes(): rx.Observable<Action<unknown>> {
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
