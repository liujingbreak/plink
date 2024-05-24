/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import * as rx from 'rxjs';
import {Action, InferPayload, ActionMeta,
  ArrayOrTuple, ControllerCore, CoreOptions,
  nameOfAction, InferMapParam, assignActionReferParam} from './stream-core';
import {mapActionToPayload} from './control';
import {actionRelatedToAction} from './context-operators';
import {PayloadByType, ActionByType} from './inferred-types';
import {ActionDataTable} from './action-table';
import {timeoutLog} from './utils';
// import {addConfigurable} from './global-config';

export type ActionFactory = {
  [k: string]: (...args: any[]) => SingleActionFactory;
};

type ActionOrPayloadLike<P extends unknown[]> = {i: Action<unknown>['i']; t: Action<unknown>['t']; p: P} | [ActionMeta, ...P];
type ActionOrPayloadStreamTuple<T extends [...any[]]> = {[K in keyof T]: rx.Observable<ActionOrPayloadLike<T[K]>>};
type ActionStreamTuple<T extends [...any[]]> = {[K in keyof T]: rx.Observable<[ActionMeta, ...T[K]]>};

export interface SingleActionFactory {
  re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>): this;
  /** Dispatch message */
  dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<unknown>;
  /**
   * `Dispatch and observe` response message
   * At the moment this method is called, the message is sent, not the moment that the returned
   * observable is subscribed.
   * Retuened is an observable of ReplaySuvbject(1), NOTE: if you are expecting more than one "associated"
   * responding messages, only first responsive message is recorded by ReplaySubject and returned,
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

class SingleActionFactoryImpl<I, K extends keyof I> implements SingleActionFactory {
  relateToAction: ArrayOrTuple<ActionMeta | ActionMeta['r']> | undefined;
  constructor(
    private type: K,
    private payload: InferPayload<I[K]>,
    private control: RxController2<I>,
    private opts: {
      /** default: 20000 ms */
      slowDispatchObservableTime?: number;
      /** Print a log message or any slow responding message of a dispatched action */
      slowLog?(): void;
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
    this.ddo(response$, referAction).pipe(
      rx.take(1)
    ).subscribe(r$);
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
            this.opts.slowLog ? () => this.opts.slowLog!() : () => console.log('Slow observable action detected')
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
            this.opts.slowLog ? () => this.opts.slowLog!() : () => console.log('Slow observable action detected')
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

export class RxController2<I> extends ControllerCore<I> {
  /** Abbrevation of payloadByType */
  pt: PayloadByType<I>;
  /** Action observable streamby type */
  at: ActionByType<I>;
  /** Action factory by type */
  ft: I;
  /** Rx operator for `do()`, we can change it by emit new value to this observable,
   * you don't need to use this Subject directory, it is meant to be extended by Reactivizer internally
   * */
  doOperator$ = new rx.BehaviorSubject<<A, F>(dispatchingAction: Action<A>) => (response$: rx.Observable<Action<F>>) => rx.Observable<Action<F>>>(
    (_dispatchingAction) => input => input
  );

  constructor(opts?: CoreOptions<I> & {debugTableAction?: boolean}) {
    super(opts);
    // addConfigurable(this);
    const actionsByType = new Map<string | symbol, rx.Observable<Action<I[keyof I]>>>();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const actionByTypeProxy = new Proxy(
      {} as{[K in keyof I]: rx.Observable<Action<I[K]>>},
      {
        get(_target, type, _rec) {
          let a$ = actionsByType.get(type);
          if (a$ == null) {
            const matchType = self.typePrefix + (type as string);
            a$ = self.action$.pipe(
              rx.filter(({t}) => t === matchType),
              rx.share()
            );
            actionsByType.set(type, a$);
          }
          return a$;
        },
        has(_target, key) {
          return actionsByType.has(key);
        },
        ownKeys() {
          return [...actionsByType.keys()];
        }
      });

    const payloadsByType = new Map<string | symbol, rx.Observable<InferMapParam<I[keyof I]>>>();
    this.at = actionByTypeProxy;

    this.pt = new Proxy(
      {} as {[K in keyof I]: rx.Observable<InferMapParam<I[K]>>},
      {
        get(_target, key, _rec) {
          let p$ = payloadsByType.get(key);
          if (p$ == null) {
            const a$ = actionByTypeProxy[key as keyof I];
            p$ = a$.pipe(
              mapActionToPayload(),
              rx.share()
            );
            payloadsByType.set(key, p$);
          }
          return p$;
        },
        has(_target, key) {
          return Object.prototype.hasOwnProperty.call(actionByTypeProxy, key);
        },
        ownKeys() {
          return Object.keys(actionByTypeProxy);
        }
      });

    const factories = new Map<string | symbol, (...args: any[]) => any>();

    this.ft = new Proxy({}, {
      get(_target, key, _rec) {
        if (factories.has(key)) {
          return factories.get(key);
        }
        const fn = (...args: InferPayload<I[keyof I]>): SingleActionFactory => {
          return new SingleActionFactoryImpl(key as keyof I, args, self, {
            slowLog() {
              const msg = `Detected a slow responding message of dispatched action of "${self.logPrefix} ${key as string}"`;
              if (self.opts?.log) {
                self.opts!.log(msg);
              } else {
                // eslint-disable-next-line no-console
                console.log(msg);
              }
            }
          });
        };
        factories.set(key, fn);
        return fn;
      },

      has(_target, key) {
        return Object.prototype.hasOwnProperty.call(actionByTypeProxy, key);
      },
      ownKeys() {
        return Object.keys(actionByTypeProxy);
      }
    }) as I;
  }
  /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
  groupControllerBy<K>(keySelector: (action: Action<I[keyof I]>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>):
  rx.Observable<[newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>]> {
    return this.action$.pipe(
      rx.groupBy(keySelector),
      rx.map(grouped => {
        const opts = groupedCtlOptionsFn ?
          groupedCtlOptionsFn(grouped.key) :
          this.opts ?
            Object.entries(this.opts)
              .filter(([p]) => p !== 'name' && p !== 'autoConnect')
              .reduce((obj, [p, v]) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                obj[p as keyof CoreOptions<I>] = v as any;
                return obj;
              }, {} as CoreOptions<I>) :
            {};

        const groupedRxCtl = new GroupedRxController2<I, K>(
          grouped.key,
          {...opts, autoConnect: false});

        // connect to source actionUpstream only when it is subscribed
        rx.concat(
          groupedRxCtl.actionSubscribed$.pipe(
            rx.tap(() => {
              groupedRxCtl.connect();
            }),
            rx.take(1)
          ),
          // Then dispatch source action to grouped controller
          grouped.pipe(
            rx.tap(action => deserializeAction2(action, groupedRxCtl))
          )
        ).pipe(
          rx.takeUntil(groupedRxCtl.actionUnsubscribed$)
        ).subscribe();

        return groupedRxCtl;
      }),
      rx.scan<
      GroupedRxController2<I, K>,
      [newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>],
      readonly [null, Map<K, GroupedRxController2<I, K>>]
      >((acc, el) => {
        const ret = acc as unknown as [GroupedRxController2<I, K>, Map<K, GroupedRxController2<I, K>>];
        ret[0] = el;
        ret[1].set(el.key, el);
        return ret;
      }, [null, new Map<K, GroupedRxController2<I, K>>()] as const)
    );
  }
  /**
   * create a new RxController whose action$ is filtered for action types which are included in `actionTypes`
   */
  subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]>> {
    const sub = new RxController2<Pick<I, KS[number]>>(opts);
    const typeSet = new Set(actionTypes);
    this.action$.pipe(
      rx.filter(a => typeSet.has(nameOfAction(a))),
      rx.tap(value => {
        sub.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }

  /**
   * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
   * a table which retains latest action by "key"
   **/
  createDataTable<T extends keyof I, K>(actionType: T, keySelector: (action: InferMapParam<I[T]>) => K) {
    return new ActionDataTable(this.at[actionType], keySelector);
  }

  /**
   * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
   */
  subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Omit<I, KS[number]>>): RxController2<Omit<I, KS[number]>> {
    const sub = new RxController2<Omit<I, KS[number]>>(opts);
    const typeSet = new Set(excludeActionTypes);
    this.action$.pipe(
      rx.filter(a => !typeSet.has(nameOfAction(a))),
      rx.tap(value => {
        sub.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }

  /**
   * Create a variant of calling .ft(...).dp(...)`
   **/
  createDispatcherFor<K extends keyof I>(type: K, ...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): (...params: InferPayload<I[K]>) => void {
    return (...params) => (this.ft[type] as (...p: any[]) => SingleActionFactory)(...params).dp(...actionMetaRelated);
  }

  /**
   * Create a variant of interface of functions `<I>.ft(...).dp(...)`
   **/
  createDispatchers(...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): {[K in keyof I]: (...params: InferPayload<I[K]>) => void} {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const dispatchers = new Map<string | symbol, (...p: InferPayload<I[keyof I]>) => void>();
    return new Proxy({} as {[K in keyof I]: (...params: InferPayload<I[K]>) => void}, {
      get(_target, key, _rec) {
        const existing = dispatchers.get(key);
        if (existing)
          return existing;
        const d = self.createDispatcherFor(key as keyof I, ...actionMetaRelated);
        dispatchers.set(key, d);
        return self.createDispatcherFor(key as keyof I, ...actionMetaRelated);
      },
      has(_target, key) {
        return Object.prototype.hasOwnProperty.call(self.ft, key);
      },
      ownKeys() {
        return Object.keys(self.ft as object);
      }
    });
  }
}

export class GroupedRxController2<I, K> extends RxController2<I> {
  constructor(public key: K, opts?: CoreOptions<I>) {
    super(opts);
  }
}
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export function deserializeAction2<I>(actionObj: any, toController: RxController2<I>) {
  const newAction = toController.createAction(nameOfAction(actionObj) as unknown as keyof I, (actionObj as Action<I[keyof I]>).p);
  newAction.i = (actionObj as Action<any>).i;
  if ((actionObj as Action<any>).r)
    newAction.r = (actionObj as Action<any>).r;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  toController.actionUpstream.next(newAction);
  return newAction;
}
