import * as rx from 'rxjs';
import {Action, InferPayload, ActionMeta,
  ArrayOrTuple, ControllerCore, CoreOptions,
  nameOfAction} from './stream-core';
import {InferMapParam, mapActionToPayload, actionRelatedToAction} from './control';
import {PayloadByType, ActionByType} from './inferred-types';

export type ActionFactory = {
  [k: string]: (...args: any[]) => SingleActionFactory;
};

export interface SingleActionFactory {
  dp(...origActionMeta: ArrayOrTuple<ActionMeta | undefined>): void;
  /** At the moment this method is called, the message is sent, not the moment that the returned
   * observable is subscribed.
   * Retuened is an observable of ReplaySuvbject(1), NOTE: if you are expecting more than one "associated"
   * responding messages, only first responsive message is recorded by ReplaySubject and returned,
   * see ddo<F> as alternative
   **/
  do<F>(waitForAction$: rx.Observable<Action<F>>,
    origActionMeta?: ActionMeta | ArrayOrTuple<ActionMeta>
  ): rx.Observable<InferMapParam<F>>;

  /** 
   * Unlike `do()`, the message is not sent until the returned observable is subscribed, all associated
   * responding messages will be recieved
   */
  ddo<F>(waitForAction$: rx.Observable<Action<F>>,
    origActionMeta?: ActionMeta | ArrayOrTuple<ActionMeta>
  ): rx.Observable<InferMapParam<F>>;
}

class SingleActionFactoryImpl<I, K extends keyof I> implements SingleActionFactory {

  constructor(
    private type: K,
    private payload: InferPayload<I[K]>,
    private control: RxController2<I>
  ) {}

  dp(...origActionMeta: ArrayOrTuple<ActionMeta | undefined>) {
    const metas = origActionMeta.filter(m => m != null) as ActionMeta[];
    if (metas.length > 0)
      this.control.dispatchForFactory(this.type)(metas, ...this.payload);
    else
      this.control.dispatchFactory(this.type)(...this.payload);
  }

  do<F>(waitForAction$: rx.Observable<Action<F>>,
    referActionMeta?: ActionMeta | ArrayOrTuple<ActionMeta>
  ) {
    const action = this.control.createAction(this.type, this.payload);

    if (referActionMeta)
      action.r = Array.isArray(referActionMeta) ? referActionMeta.map(m => m.i) : (referActionMeta as ActionMeta).i;
    const r$ = new rx.ReplaySubject<InferMapParam<F>>(1);
    this.ddo(waitForAction$, referActionMeta).pipe(
      rx.take(1)
    ).subscribe(r$);
    return r$.asObservable();
  }

  ddo<F>(waitForAction$: rx.Observable<Action<F>>,
    referActionMeta?: ActionMeta | ArrayOrTuple<ActionMeta>
  ) {
    const action = this.control.createAction(this.type, this.payload);

    if (referActionMeta)
      action.r = Array.isArray(referActionMeta) ? referActionMeta.map(m => m.i) : (referActionMeta as ActionMeta).i;
    return rx.merge(
      this.control.doOperator$.pipe(
        rx.take(1),
        rx.switchMap(operator => waitForAction$.pipe(
          operator(action),
          actionRelatedToAction<Action<F>>(action),
          mapActionToPayload(),
          rx.take(1)
        ))
      ),
      new rx.Observable<never>(sub => {
        this.control.actionUpstream.next(action);
        sub.complete();
      })
    );
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

  constructor(public opts?: CoreOptions<I> & {debugTableAction?: boolean}) {
    super(opts);
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
          return new SingleActionFactoryImpl(key as keyof I, args, self);
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
        const groupedRxCtl = new GroupedRxController2<I, K>(grouped.key, {...(groupedCtlOptionsFn ? groupedCtlOptionsFn(grouped.key) : {}), autoConnect: false});

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
  subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>) {
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
   * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
   */
  subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>) {
    const sub = new RxController2<Pick<I, KS[number]>>(opts);
    const typeSet = new Set(excludeActionTypes);
    this.action$.pipe(
      rx.filter(a => !typeSet.has(nameOfAction(a))),
      rx.tap(value => {
        sub.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
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
