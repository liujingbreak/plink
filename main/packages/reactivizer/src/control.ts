import * as rx from 'rxjs';
import {Action, ActionFunctions, InferMapParam, InferPayload, ActionMeta,
  ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, CoreOptions,
  has, nameOfAction, actionMetaToStr
} from './stream-core';

export * from './stream-core';

type DispatchAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

type DispatchForAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

const EMPTY_ARRY = [] as [];

export class RxController<I extends ActionFunctions> {
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
  payloadByType: {[K in keyof I]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>};
  /** abbrevation of payloadByType */
  pt: {[K in keyof I]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>};
  actionByType: {[K in keyof I]: rx.Observable<Action<I, K>>};
  /** abbrevation of actionByType */
  at: {[K in keyof I]: rx.Observable<Action<I, K>>};

  updateInterceptor: ControllerCore<I>['updateInterceptor'];

  constructor(public opts?: CoreOptions<I>) {
    const core = this.core = new ControllerCore(opts);

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
      has(_target, key) {
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

        return <R extends keyof I>(action$: rx.Observable<Action<I, R>>, referActions: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: any[]) => {
          const action = self.core.createAction(key as string, params as InferPayload<I[string]>);
          if (referActions)
            action.r = Array.isArray(referActions) ? referActions.map(m => m.i) : (referActions as ActionMeta).i;
          const r$ = new rx.ReplaySubject<InferMapParam<I, R>>(1);
          rx.merge(
            action$.pipe(
              actionRelatedToAction(action.i),
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
      has(_target, key) {
        return true;
      },
      ownKeys() {
        return [] as string[];
      }
    });

    this.dispatchAndObserveRes = this.do = new Proxy({} as {[K in keyof I]: DispatchAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I, R>>, ...params: any[]) => {
          return self.dfo[key as keyof I](action$, null, ...(params as any));
        };
      },
      has(_target, key) {
        return true;
      },
      ownKeys() {
        return [] as string[];
      }
    });

    const actionsByType = {} as {[K in keyof I]: rx.Observable<Action<I, K>>};
    const actionByTypeProxy = new Proxy(
      {} as typeof actionsByType,
      {
        get(_target, type, _rec) {
          let a$ = actionsByType[type as keyof I];
          if (a$ == null) {
            const matchType = core.typePrefix + (type as string);
            a$ = actionsByType[type as keyof I] = core.action$.pipe(
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

    const payloadsByType = {} as {[K in keyof I]: rx.Observable<InferMapParam<I, K>>};
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
    this.updateInterceptor = core.updateInterceptor;
  }

  /** change CoreOptions's "name" property which is displayed in actions log for developer to identify which stream the action log entry
  * belongs to
  */
  setName(value: string) {
    this.core.setName(value);
  }

  createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>) {
    return this.core.createAction(type, params);
  }

  /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
  groupControllerBy<K>(keySelector: (action: Action<I>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>):
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
   * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
   */
  subForTypes<KS extends Array<keyof I & string> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>) {
    const sub = new RxController<Pick<I, KS[number]>>(opts);
    const typeSet = new Set(actionTypes);
    this.core.action$.pipe(
      rx.filter(a => typeSet.has(nameOfAction(a))),
      rx.tap(value => {
        sub.core.actionUpstream.next(value);
      })
    ).subscribe();
    return sub;
  }

  /**
   * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
   */
  subForExcludeTypes<KS extends Array<keyof I & string> | ReadonlyArray<keyof I & string>>(excludeActionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>) {
    const sub = new RxController<Pick<I, KS[number]>>(opts);
    const typeSet = new Set(excludeActionTypes);
    this.core.action$.pipe(
      rx.filter(a => !typeSet.has(nameOfAction(a))),
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

export class GroupedRxController<I extends ActionFunctions, K> extends RxController<I> {
  constructor(public key: K, opts?: CoreOptions<I>) {
    super(opts);
  }
}

/**
 * If we consider ActionTable a 2-dimentional data structure, this is the infer type of it.
 * Each row is latest action payload of an action type (or name),
 * each column is a element of payload content array.
 *
 * If you use ActionTable as a frontend UI state (like for a UI template), this infer type
 * defines exactly data structure of it.
 * 
 */
export type ActionTableDataType<I extends ActionFunctions, KS extends ReadonlyArray<keyof I>> = {
  [P in KS[number]]: InferPayload<I[P]> | []
};

export class ActionTable<I extends ActionFunctions, KS extends ReadonlyArray<keyof I>> {
  actionNames: KS;

  latestPayloads = {} as {[K in KS[number]]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>};
  /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
  l: {[K in KS[number]]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>};

  get dataChange$(): rx.Observable<ActionTableDataType<I, KS>> {
    if (this.#latestPayloadsByName$)
      return this.#latestPayloadsByName$;

    this.#latestPayloadsByName$ = this.actionNamesAdded$.pipe(
      rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))),
      rx.map(() => {
        this.data = {} as ActionTableDataType<I, KS>;
        for (const k of this.actionNames) {
          const v = this.actionSnapshot.get(k);
          this.data[k] = v ? v.slice(1) as InferPayload<I[keyof I]> : EMPTY_ARRY;
        }
        return this.data;
      }),
      rx.share()
    );
    return this.#latestPayloadsByName$;
  }

  private data: ActionTableDataType<I, KS> = {} as ActionTableDataType<I, KS>;

  // get latestPayloadsSnapshot$(): rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> {
  //   if (this.#latestPayloadsSnapshot$)
  //     return this.#latestPayloadsSnapshot$;

  //   this.#latestPayloadsSnapshot$ = this.actionNamesAdded$.pipe(
  //     rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))),
  //     rx.map(() => this.actionSnapshot)
  //   );
  //   return this.#latestPayloadsSnapshot$;
  // }

  actionSnapshot = new Map<keyof I, InferMapParam<I, keyof I>>();

  // private
  #latestPayloadsByName$: rx.Observable<ActionTableDataType<I, KS>> | undefined;
  // #latestPayloadsSnapshot$: rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> | undefined;
  private actionNamesAdded$ = new rx.ReplaySubject<ReadonlyArray<keyof I>>(1);

  constructor(private streamCtl: RxController<I>, actionNames: KS) {
    this.actionNames = [] as unknown as KS;
    this.l = this.latestPayloads;
    this.addActions(...actionNames);
    this.actionNamesAdded$.pipe(
      rx.map(actionNames => {
        this.onAddActions(actionNames);
      })
    ).subscribe();
    this.dataChange$.subscribe(); // to make sure this.data will be fulfilled even when there is no any external observer
  }

  getData(): ActionTableDataType<I, KS> {
    return this.data;
  }

  /** Add actions to be recoreded in table map, by create `ReplaySubject(1)` for each action payload stream respectively */
  addActions<M extends Array<keyof I>>(...actionNames: M) {
    this.actionNames = this.actionNames.concat(actionNames) as unknown as KS;
    this.actionNamesAdded$.next(actionNames);
    return this as unknown as ActionTable<I, Array<KS[number] | M[number]>>;
  }

  private onAddActions<M extends ReadonlyArray<keyof I>>(actionNames: M) {
    for (const type of actionNames) {
      if (this.data[type] == null)
        this.data[type] = EMPTY_ARRY;
      if (has.call(this.latestPayloads, type))
        continue;

      const a$ = new rx.ReplaySubject<InferMapParam<I, M[number]>>(1);
      this.streamCtl.actionByType[type].pipe(
        rx.map(a => {
          const mapParam = [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I, M[number]>;
          this.actionSnapshot.set(type, mapParam);
          return mapParam;
        })
      ).subscribe(a$);

      this.latestPayloads[type] = this.streamCtl.opts?.debug ?
        a$.pipe(
          this.debugLogLatestActionOperator(type as string)
        ) :
        a$.asObservable();
    }
  }

  getLatestActionOf<K extends KS[number]>(actionName: K): InferMapParam<I, K> | undefined {
    return this.actionSnapshot.get(actionName) as InferMapParam<I, K> | undefined;
  }

  protected debugLogLatestActionOperator<K extends string & keyof I, P extends InferMapParam<I, K>>(type: K) {
    const core = this.streamCtl.core;
    return this.streamCtl.opts?.log ?
      rx.map<P, P>((action, idx) => {
        if (idx === 0 && !core.debugExcludeSet.has(type)) {
          this.streamCtl.opts!.log!(core.logPrefix + 'rx:latest', type, action);
        }
        return action;
      }) :
      (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
        rx.map<P, P>((p, idx) => {
          if (idx === 0 && !core.debugExcludeSet.has(type)) {
            // eslint-disable-next-line no-console
            console.log(`%c ${core.logPrefix}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type,
              actionMetaToStr(p[0]));
          }
          return p;
        }) :
        rx.map<P, P>((p, idx) => {
          if (idx > 0 && !core.debugExcludeSet.has(type)) {
            // eslint-disable-next-line no-console
            console.log(core.logPrefix + 'latest:', type, actionMetaToStr(p[0]));
          }
          return p;
        });
  }
}

/** Rx operator function */
export function actionRelatedToAction<T extends Action<any>>(id: ActionMeta['i']) {
  return function(up: rx.Observable<T>) {
    return up.pipe(
      rx.filter(
        m => (m.r != null && m.r === id) || (
          Array.isArray(m.r) && m.r.some(r => r === id)
        )
      )
    );
  };
}
/** Rx operator function */
export function actionRelatedToPayload<T extends [ActionMeta, ...any[]]>(id: ActionMeta['i']) {
  return function(up: rx.Observable<T>): rx.Observable<T> {
    return up.pipe(
      rx.filter(
        ([m]) => (m.r != null && m.r === id) || (
          Array.isArray(m.r) && m.r.some(r => r === id)
        )
      )
    );
  };
}

export function serializeAction<I extends ActionFunctions = any, K extends keyof I = string>(action: Action<I, K>) {
  const a = {...action, t: nameOfAction(action)};
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
export function deserializeAction<I extends ActionFunctions>(actionObj: any, toController: RxController<I>) {
  const newAction = toController.core.createAction(nameOfAction(actionObj) as keyof I, (actionObj as Action<I>).p);
  newAction.i = (actionObj as Action<any>).i;
  if ((actionObj as Action<any>).r)
    newAction.r = (actionObj as Action<any>).r;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  toController.core.actionUpstream.next(newAction);
  return newAction;
}

function mapActionToPayload<I extends ActionFunctions, K extends keyof I>() {
  return (up: rx.Observable<Action<I, K>>) => up.pipe(
    rx.map(a => [{i: a.i, r: a.r}, ...a.p] as InferMapParam<I, keyof I>)
  );
}
