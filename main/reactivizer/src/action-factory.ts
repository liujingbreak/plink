import * as rx from 'rxjs';
import {Action, InferPayload, ActionMeta, ArrayOrTuple, assignActionReferParam} from './stream-core';
import {mapActionToPayload} from './control';
import {actionRelatedToAction} from './context-operators';
import {timeoutLog} from './utils';
import {RxController2} from './control2';

type ActionOrPayloadLike<P extends unknown[]> = {i: Action<unknown>['i']; t: Action<unknown>['t']; p: P} | [ActionMeta, ...P];
type ActionOrPayloadStreamTuple<T extends [...any[]]> = {[K in keyof T]: rx.Observable<ActionOrPayloadLike<T[K]>>};
type ActionStreamTuple<T extends [...any[]]> = {[K in keyof T]: rx.Observable<[ActionMeta, ...T[K]]>};

export interface SingleActionFactory {
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
  do<P extends [...any[]]>(
    response$: rx.Observable<ActionOrPayloadLike<P>>,
    referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ): rx.Observable<[ActionMeta, ...P]>;

  /**
   * @deprecated use `od(...response$)`
   * `Deferred dispatch and observe` response message.
   * Unlike `do()`, the message is not sent until the returned observable is subscribed, all associated
   * responding messages will be recieved. A new message will be dispatched everytime when the returned
   * observable is subscribed.
   * An asyncronized form of this method is `rx.firstValueFrom(...)` which returns a Promise
   */
  ddo<P extends [...any[]]>(
    response$: rx.Observable<ActionOrPayloadLike<P>>,
    referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ): rx.Observable<[ActionMeta, ...P]>;

  /**
   * "Observe and Dispatch", the action message is sent only when response messages are all subscribed.
   * This method accept multiple types of "observable response message" as parameter, and it
   * returns filtered response messages in form of tuple type, or return single observable if
   * there is only one parameter.
   * - The action message will not be dispatched until all of returned response streams are subscribed.
   * - The action message will be dispatched only once, even any of the returned response streams are re-subscribe
   * */
  od<P extends unknown[], PA extends any[]>(
    response$: rx.Observable<ActionOrPayloadLike<P>>, ...moreResponses: [...ActionOrPayloadStreamTuple<PA>]
  ):  PA['length'] extends 0 ? rx.Observable<[ActionMeta, ...P]> : [rx.Observable<[ActionMeta, ...P]>, ...ActionStreamTuple<PA>];
}

export class SingleActionFactoryImpl<I, K extends keyof I> implements SingleActionFactory {
  relateToAction: ArrayOrTuple<ActionMeta | ActionMeta['r']> | undefined;
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
  ) {}

  /** Make this action become related to another action message
   */
  re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>) {
    this.relateToAction = actionMeta;
    return this;
  }

  dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>) {
    const metas = actionMetaRelated.filter(m => m != null);
    if (metas.length > 0)
      return this.control.dispatchForFactory(this.type)(metas.length > 1 ? metas : metas[0], ...this.payload);
    else if (this.relateToAction && this.relateToAction.length > 0)
      return this.control.dispatchForFactory(this.type)(this.relateToAction.length > 1 ? this.relateToAction : this.relateToAction[0], ...this.payload);
    else
      return this.control.dispatchFactory(this.type)(...this.payload);
  }

  do<P extends [...any[]]>(response$: rx.Observable<{i: Action<unknown>['i']; t: Action<unknown>['t']; p: P} | [ActionMeta, ...P]>,
    referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ) {
    const action = this.control.createAction(this.type, this.payload);

    if (referAction) {
      assignActionReferParam(action, referAction);
    } else if (this.relateToAction && this.relateToAction.length > 0) {
      assignActionReferParam(action, this.relateToAction);
    }
    const r$ = new rx.ReplaySubject<[ActionMeta, ...P]>(1);
    this.ddo(response$, referAction).subscribe(r$);
    return r$.asObservable();
  }

  ddo<P extends [...any[]]>(
    response$: rx.Observable<ActionOrPayloadLike<P>>,
    referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>
  ) {
    return new rx.Observable<Action<I[K]>>(sub => {
      const action = this.control.createAction(this.type, this.payload);
      if (referAction) {
        assignActionReferParam(action, referAction);
      } else if (this.relateToAction && this.relateToAction.length > 0) {
        assignActionReferParam(action, this.relateToAction);
      }
      sub.next(action);
      sub.complete();
    }).pipe(
      rx.mergeMap(action => rx.merge(
        this.control.doOperator$.pipe(
          rx.take(1),
          rx.switchMap(operator => response$.pipe(
            rx.map(actionOrPayload => {
              if (Array.isArray(actionOrPayload)) {
                const [actionMeta, ...payload] = actionOrPayload;
                (actionMeta as Action<any>).p = payload;
                return actionMeta as Action<any>;
              }
              return actionOrPayload as Action<any>;
            }),
            operator(action),
            actionRelatedToAction(action),
            mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...P]>,
            rx.take(1)
          )),
          timeoutLog<[ActionMeta, ...P]>(
            this.opts.slowDispatchObservableTime ?? 20000,
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog!(action) : () => console.log('Slow observable action detected')
          )
        ),
        new rx.Observable<never>(sub => {
          this.control.actionUpstream.next(action);
          sub.complete();
        })
      ))
    );
  }

  od<P extends unknown[], PA extends any[]>(
    response: rx.Observable<ActionOrPayloadLike<P>>, ...moreResponses: [...ActionOrPayloadStreamTuple<PA>]
  ):  PA['length'] extends 0 ? rx.Observable<[ActionMeta, ...P]> : [rx.Observable<[ActionMeta, ...P]>, ...ActionStreamTuple<PA>] {
    if (moreResponses.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.ddo(response) as any;
    } else {
      const responses = [response, ...moreResponses] as (typeof response)[];
      const action = this.control.createAction(this.type, this.payload);
      if (this.relateToAction && this.relateToAction.length > 0) {
        assignActionReferParam(action, this.relateToAction);
      }
      // when all the returned streams are subscribed, dispatch the new action
      const onSubscribe$ = new rx.Subject<number>();
      onSubscribe$.pipe(
        rx.distinct(),
        rx.take(responses.length)
      ).subscribe({
        complete: () => {
          this.control.actionUpstream.next(action);
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return responses.map((res$, idx) => rx.merge(
        this.control.doOperator$.pipe(
          rx.take(1),
          rx.switchMap(operator => res$.pipe(
            rx.map(actionOrPayload => {
              if (Array.isArray(actionOrPayload)) {
                const [actionMeta, ...payload] = actionOrPayload as [ActionMeta, ...unknown[]];
                (actionMeta as Action<any>).p = payload;
                return actionMeta as Action<any>;
              }
              return actionOrPayload as Action<any>;
            }),
            operator(action),
            actionRelatedToAction(action),
            mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...any[]]>,
            rx.take(1)
          )),
          timeoutLog<[ActionMeta, ...any[]]>(
            this.opts.slowDispatchObservableTime ?? 20000,
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog!(action) : () => console.log('Slow observable action detected')
          )
        ),
        new rx.Observable<never>(sink => {
          onSubscribe$.next(idx);
          sink.complete();
        })
      )) as any;
    }
  }
}
