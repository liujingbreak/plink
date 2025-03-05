import * as rx from 'rxjs';
import {Action, InferPayload, ActionMeta, ArrayOrTuple, assignActionReferParam} from './stream-core';
import {actionRelatedToAction} from './context-operators';
import {timeoutLog} from './utils';
import {RxController2} from './control2';

export type ActionOfUnknownType<P extends any[]> = {i: ActionMeta['i']; r: ActionMeta['r']; p: P};
export type ActionOrPayloadLike<P extends any[], A extends [ActionMeta, ...P] | ActionOfUnknownType<P>> = A;
// type ActionOrPayloadStreamTuple<T extends [...any[]]> = {[K in keyof T]: rx.Observable<ActionOrPayloadLike<T[K]>>};
// type ActionStreamTuple<T extends [...any[]]> = {[K in keyof T]: rx.Observable<[ActionMeta, ...T[K]]>};

export interface SingleActionFactory {
  action: Action;
  re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>): this;
  /** Dispatch message */
  dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<unknown>;
  /**
   * `Dispatch and observe` response message
   * At the moment this method is called, the message is sent, not the moment when the returned
   * observable is subscribed.
   * Returned is an observable of ReplaySubject(1), NOTE: if you are expecting more than one "associated"
   * responding messages, only the lastest responsive message is recorded by ReplaySubject and returned,
   * see od<F> as alternative
   **/
  do<A extends [ActionMeta, ...any[]] | Action<any>>(
    response$: rx.Observable<A>,
    referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ): rx.Observable<A>;

  /**
   * @deprecated use `od(...response$)`
   * `Deferred dispatch and observe` response message.
   * Unlike `do()`, the message is not sent until the returned observable is subscribed, all associated
   * responding messages will be recieved. A new message will be dispatched everytime when the returned
   * observable is subscribed.
   * An asyncronized form of this method is `rx.firstValueFrom(...)` which returns a Promise
   */
  ddo<A extends [ActionMeta, ...any[]] | Action<any>>(
    response$: rx.Observable<A>,
    referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ): rx.Observable<A>;

  /**
   * "Observe and Dispatch", the action message is sent only when response messages are all subscribed.
   * This method accept multiple types of "observable response message" as parameter, and it
   * returns filtered response messages in form of tuple type, or return single observable if
   * there is only one parameter.
   * - The action message will not be dispatched until all of returned response streams are subscribed.
   * - The action message will be dispatched only once, even any of the returned response streams are re-subscribe
   * - A "__cancel" message will be sent with relavent action meta when all the response streams are unsubscribed
   * */
  od<T extends [ActionMeta, ...any[]] | Action<any>, TA extends Array<[ActionMeta, ...any[]] | Action<any>>>(
    response$: rx.Observable<T>, ...moreResponses: [...{[K in keyof TA]: rx.Observable<TA[K]>}]
  ):  TA['length'] extends 0 ? rx.Observable<T> : [rx.Observable<T>, ...{[K in keyof TA]: rx.Observable<TA[K]>}];
  /**
   * Same effect as executing `.od(...).pipe(rx.take(1))`
   */
  odMono<T extends [ActionMeta, ...any[]] | Action<any>, TA extends Array<[ActionMeta, ...any[]] | Action<any>>>(
    response$: rx.Observable<T>, ...moreResponses: [...{[K in keyof TA]: rx.Observable<TA[K]>}]
  ):  TA['length'] extends 0 ? rx.Observable<T> : [rx.Observable<T>, ...{[K in keyof TA]: rx.Observable<TA[K]>}];
}

export class SingleActionFactoryImpl<I, K extends keyof I> implements SingleActionFactory {
  relateToAction: ArrayOrTuple<ActionMeta | ActionMeta['r']> | undefined;
  action: Action<I[K]>;
  private dispatched = false;
  constructor(
    private type: K,
    private payload: InferPayload<I[K]>,
    private control: RxController2<I>,
    private opts: {
      /** default: 20000 ms */
      slowDispatchObservableTime?: number;
      /** Print a log message or any slow responding message of a dispatched action */
      slowLog?(initialAction: Action<I[K]>): void;
    } = {slowDispatchObservableTime: 20000}
  ) {
    this.action = control.createAction(type, payload);
  }

  /** Make this action become related to another action message
   */
  re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>) {
    this.relateToAction = actionMeta;
    return this;
  }

  dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>) {
    if (this.dispatched) {
      throw new Error('Message has already been dispatched');
    }
    const metas = actionMetaRelated.filter(m => m != null);
    const s = this.control.actionUpstream;
    assignActionReferParam(this.action,
      this.relateToAction && this.relateToAction.length > 0 ?
        this.relateToAction.concat(metas) :
        metas
    );
    s.next(this.action);
    this.dispatched = true;
    return this.action;
  }

  do<A extends [ActionMeta, ...any[]] | Action<any>>(
    response$: rx.Observable<A>,
    referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ): rx.Observable<A> {
    const action = this.control.createAction(this.type, this.payload);

    if (referAction) {
      assignActionReferParam(action, referAction);
    } else if (this.relateToAction && this.relateToAction.length > 0) {
      assignActionReferParam(action, this.relateToAction);
    }
    const r$ = new rx.ReplaySubject<A>(1);
    this.ddo(response$, referAction).subscribe(r$);
    return r$.asObservable();
  }

  ddo<A extends [ActionMeta, ...any[]] | Action<any>>(
    response$: rx.Observable<A>,
    referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ): rx.Observable<A> {
    const action = this.action;
    if (referAction) {
      assignActionReferParam(action, referAction);
    } else if (this.relateToAction && this.relateToAction.length > 0) {
      assignActionReferParam(action, this.relateToAction);
    }
    return new rx.Observable<Action<I[K]>>(sub => {
      sub.next(action);
      sub.complete();
    }).pipe(
      rx.mergeMap(action => rx.merge(
        this.control.doOperator$.pipe(
          rx.take(1),
          rx.switchMap(operator => response$.pipe(
            operator(action),
            actionRelatedToAction(action)
            // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...P]>,
            // rx.take(1)
          )),
          timeoutLog(
            this.opts.slowDispatchObservableTime ?? 20000,
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog!(action) : () => {}
          )
        ),
        new rx.Observable<never>(() => {
          this.control.actionUpstream.next(action);
          return () => {
            // const cancel = this.control.createAction('__cancel' as keyof I, [action.t] as any);
            // assignActionReferParam(cancel, action);
            // this.control.actionUpstream.next(cancel);
            this.control.cancelAction(action);
          };
        })
      ))
    );
  }

  od<T extends [ActionMeta, ...any[]] | Action<any>, TA extends Array<[ActionMeta, ...any[]] | Action<any>>>(
    response: rx.Observable<T>, ...moreResponses: [...{[K in keyof TA]: rx.Observable<TA[K]>}]
  ): TA['length'] extends 0 ? rx.Observable<T> : [rx.Observable<T>, ...{[K in keyof TA]: rx.Observable<TA[K]>}] {
    if (moreResponses.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.ddo(response) as any;
    } else {
      const responses = [response, ...moreResponses] as (typeof response)[];
      if (this.relateToAction && this.relateToAction.length > 0) {
        assignActionReferParam(this.action, this.relateToAction);
      }
      // when all (counted) the returned streams are subscribed, dispatch the new action
      const onSubscribe$ = new rx.Subject<number>();
      onSubscribe$.pipe(
        rx.distinct(),
        rx.take(responses.length)
      ).subscribe({
        complete: () => {
          this.control.actionUpstream.next(this.action);
        }
      });

      const onUnsubscribe$ = new rx.Subject<number>();
      onUnsubscribe$.pipe(
        rx.distinct(),
        rx.take(responses.length)
      ).subscribe({
        complete: () => {
          // const cancel = this.control.createAction('__cancel' as keyof I, [action.t] as any);
          // assignActionReferParam(cancel, action);
          // this.control.actionUpstream.next(cancel);
          this.control.cancelAction(this.action);
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return responses.map((res$, idx) => rx.merge(
        this.control.doOperator$.pipe(
          rx.take(1),
          rx.switchMap(operator => res$.pipe(
            operator(this.action),
            actionRelatedToAction(this.action)
            // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...any[]]>,
            // rx.take(1)
          )),
          timeoutLog(
            this.opts.slowDispatchObservableTime ?? 20000,
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog!(this.action) : () => console.log('Slow observable action detected')
          )
        ),
        new rx.Observable<never>(() => {
          onSubscribe$.next(idx);
        })
      )) as any;
    }
  }

  odMono<T extends [ActionMeta, ...any[]] | Action<any>, TA extends Array<[ActionMeta, ...any[]] | Action<any>>>(
    response: rx.Observable<T>, ...moreResponses: [...{[K in keyof TA]: rx.Observable<TA[K]>}]
  ): TA['length'] extends 0 ? rx.Observable<T> : [rx.Observable<T>, ...{[K in keyof TA]: rx.Observable<TA[K]>}]{
    const res = this.od(response, ...moreResponses);
    if (Array.isArray(res)) {
      return res.map(i => (i as rx.Observable<any>).pipe(rx.take(1))) as any;
    }
    return res.pipe(rx.take(1)) as any;
  }
}
