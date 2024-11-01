import * as rx from 'rxjs';
import {Action, InferPayload, ActionMeta, InferMapParam,
  ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, CoreOptions} from './stream-core';
import {PayloadByType, ActionByType} from './inferred-types';
import {actionRelatedToAction} from './context-operators';

export * from './stream-core';

export type DispatchAndObserveRes<I, K extends keyof I> = <F>(
  waitForAction$: rx.Observable<Action<F>>, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<F>>;

export type DispatchForAndObserveRes<I, K extends keyof I> = <F>(
  waitForAction$: rx.Observable<Action<F>>, relateToActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<F>>;

type Interceptor = (up: rx.Observable<Action<unknown>>) => rx.Observable<Action<unknown>>;

export class RxController<I> {
  core: ControllerCore<I>;
  dispatcher: {[K in keyof I]: Dispatch<I[K]>};
  dispatcherFor: {[K in keyof I]: DispatchFor<I[K]>};
  /** abbrevation of property "dispatcher", exactly same instance of dispatcher */
  dp: {[K in keyof I]: Dispatch<I[K]>};
  /** abbrevation of property "dispatcherFor", exactly same instance of dispatcherFor */
  dpf: {[K in keyof I]: DispatchFor<I[K]>};
  dispatchAndObserveRes: {[K in keyof I]: DispatchAndObserveRes<I, K>};
  /** abbrevation of property "dispatchAndObserveRes", exactly same instance of dispatchAndObserveRes */
  do: {[K in keyof I]: DispatchAndObserveRes<I, K>};
  dispatchForAndObserveRes: {[K in keyof I]: DispatchForAndObserveRes<I, K>};
  /** abbrevation of dispatchForAndObserveRes */
  dfo: {[K in keyof I]: DispatchForAndObserveRes<I, K>};
  payloadByType: PayloadByType<I>;
  /** abbrevation of payloadByType */
  pt: PayloadByType<I>;
  actionByType: ActionByType<I>;
  /** abbrevation of actionByType */
  at: ActionByType<I>;
  opts: CoreOptions<unknown> & {debugTableAction?: boolean};

  interceptorList$: rx.Observable<Interceptor[]>;

  constructor(opts?: CoreOptions<I> & {debugTableAction?: boolean}) {
    const core = this.core = new ControllerCore(opts);
    this.opts = opts as any;
    this.dispatcher = this.dp = new Proxy({} as {[K in keyof I]: Dispatch<I[K]>}, {
      get(_target, key, _rec) {
        return core.dispatchFactory(key as keyof I);
      },
      has(_target, _key) {
        return true;
      },
      ownKeys() {
        return [] as string[];
      }
    });
    this.dispatcherFor = this.dpf = new Proxy({} as {[K in keyof I]: DispatchFor<I[K]>}, {
      get(_target, key, _rec) {
        return core.dispatchForFactory(key as keyof I);
      },
      has(_target, _key) {
        return true;
      },
      ownKeys() {
        return [] as string[];
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.dispatchForAndObserveRes = this.dfo = new Proxy({} as {[K in keyof I]: DispatchForAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I[R]>>, referActions: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: any[]) => {
          const action = self.core.createAction(key as keyof I, params as InferPayload<I[keyof I]>);
          if (referActions)
            action.r = Array.isArray(referActions) ? referActions.map(m => m.i) : (referActions as ActionMeta).i;
          const r$ = new rx.ReplaySubject<InferMapParam<I[R]>>(1);
          rx.merge(
            action$.pipe(
              actionRelatedToAction(action),
              mapActionToPayload()
            ),
            new rx.Observable<never>(sub => {
              self.core.actionUpstream.next(action);
              sub.complete();
            })
          ).subscribe(r$);
          return r$.asObservable();
        };
      },
      has(_target, _key) {
        return true;
      },
      ownKeys() {
        return [] as string[];
      }
    });

    this.dispatchAndObserveRes = this.do = new Proxy({} as {[K in keyof I]: DispatchAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I[R]>>, ...params: any[]) => {
          return self.dfo[key as keyof I](action$, null, ...(params as any));
        };
      },
      has(_target, _key) {
        return true;
      },
      ownKeys() {
        return [] as string[];
      }
    });

    const actionsByType = {} as {[K in keyof I]: rx.Observable<Action<I[K]>>};
    const actionByTypeProxy = new Proxy(
      {} as typeof actionsByType,
      {
        get(_target, type, _rec) {
          let a$ = actionsByType[type as keyof I];
          if (a$ == null) {
            const matchType = type as string;
            a$ = actionsByType[type as keyof I] = (core.action$ as rx.Observable<Action<I[keyof I]>>).pipe(
              rx.filter(({t}) => t === matchType),
              rx.share()
            );
          }
          return a$;
        },
        has(_target, key) {
          return Object.prototype.hasOwnProperty.call(actionsByType, key);
        },
        ownKeys() {
          return Object.keys(actionsByType);
        }
      });

    const payloadsByType = {} as {[K in keyof I]: rx.Observable<InferMapParam<I[K]>>};
    this.actionByType = this.at = actionByTypeProxy;

    this.payloadByType = this.pt = new Proxy(
      {} as typeof payloadsByType,
      {
        get(_target, key, _rec) {
          let p$ = payloadsByType[key as keyof I];
          if (p$ == null) {
            const a$ = actionByTypeProxy[key as keyof I];
            p$ = payloadsByType[key as keyof I] = a$.pipe(
              mapActionToPayload(),
              rx.share()
            );
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
    this.interceptorList$ = core.interceptorList$;
  }

  /** change CoreOptions's "name" property which is displayed in actions log for developer to identify which stream the action log entry
  * belongs to
  */
  setName(value: string) {
    this.core.setName(value);
  }

  createAction<J = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>) {
    return this.core.createAction(type, params);
  }

  /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
  groupControllerBy<K>(keySelector: (action: Action<unknown>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>):
  rx.Observable<[newGroup: GroupedRxController<I, K>, allGroups: Map<K, GroupedRxController<I, K>>]> {
    return this.core.action$.pipe(
      rx.groupBy(keySelector),
      rx.map(grouped => {
        const groupedRxCtl = new GroupedRxController<I, K>(grouped.key, {...(groupedCtlOptionsFn ? groupedCtlOptionsFn(grouped.key) : {}), autoConnect: false});

        // connect to source actionUpstream only when it is subscribed
        rx.concat(
          groupedRxCtl.core.actionSubscribed$.pipe(
            rx.tap(() => {
              groupedRxCtl.connect();
            }),
            rx.take(1)
          ),
          // Then dispatch source action to grouped controller
          grouped.pipe(
            rx.tap(action => deserializeAction(action, groupedRxCtl))
          )
        ).pipe(
          rx.takeUntil(groupedRxCtl.core.actionUnsubscribed$)
        ).subscribe();

        return groupedRxCtl;
      }),
      rx.scan<
      GroupedRxController<I, K>,
      [newGroup: GroupedRxController<I, K>, allGroups: Map<K, GroupedRxController<I, K>>],
      readonly [null, Map<K, GroupedRxController<I, K>>]
      >((acc, el) => {
        const ret = acc as unknown as [GroupedRxController<I, K>, Map<K, GroupedRxController<I, K>>];
        ret[0] = el;
        ret[1].set(el.key, el);
        return ret;
      }, [null, new Map<K, GroupedRxController<I, K>>()] as const)
    );
  }

  /**
   * create a new RxController whose action$ is filtered for action types which are included in `actionTypes`
   */
  subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>) {
    const sub = new RxController<Pick<I, KS[number]>>(opts);
    const typeSet = new Set(actionTypes);
    this.core.action$.pipe(
      rx.filter(a => typeSet.has(a.t as keyof I)),
      rx.tap(value => {
        sub.core.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }

  /**
   * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
   */
  subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>) {
    const sub = new RxController<Pick<I, KS[number]>>(opts);
    const typeSet = new Set(excludeActionTypes);
    this.core.action$.pipe(
      rx.filter(a => !typeSet.has(a.t as keyof I)),
      rx.tap(value => {
        sub.core.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }
  /**
   * Delegate to `this.core.action$.connect()`
   * "core.action$" is a `connectable` observable, under the hood, it is like `action$ = connectable(actionUpstream)`.
   *
   * By default `connect()` will be immediately invoked in constructor function, when "options.autoConnect" is
   * `undefined` or `true`, in that case you don't need to call this method manually.
   *
   * Refer to [connectable](https://rxjs.dev/api/index/function/connectable)
   */
  connect() {
    this.core.connect();
  }
}

export class GroupedRxController<I, K> extends RxController<I> {
  constructor(public key: K, opts?: CoreOptions<I>) {
    super(opts);
  }
}

export function serializeAction<I = any, K extends keyof I = any>(action: Action<I[K]>) {
  const a = {...action, t: action.t};
  // if (a.r instanceof Set) {
  //   a.r = [...a.r.values()];
  // }
  return a;
}

/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export function deserializeAction<I>(actionObj: any, toController: RxController<I>) {
  const newAction = toController.core.createAction(actionObj.t as unknown as keyof I, (actionObj as Action<I[keyof I]>).p);
  newAction.i = (actionObj as Action<any>).i;
  if ((actionObj as Action<any>).r)
    newAction.r = (actionObj as Action<any>).r;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  toController.core.actionUpstream.next(newAction);
  return newAction;
}

export function mapActionToPayload<F>() {
  return (up: rx.Observable<Action<F>>) => up.pipe(
    rx.map(a => [a, ...a.p] as InferMapParam<F>)
  );
}
