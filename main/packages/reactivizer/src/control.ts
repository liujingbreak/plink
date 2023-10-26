import * as rx from 'rxjs';
import {Action, ActionFunctions, InferMapParam, InferPayload, ActionMeta,
  ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, PayloadStream, CoreOptions,
  has, nameOfAction, actionMetaToStr
} from './stream-core';

export * from './stream-core';

type DispatchAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

type DispatchForAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

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
  payloadByType: {[K in keyof I]: PayloadStream<I, K>};
  /** abbrevation of payloadByType */
  pt: {[K in keyof I]: PayloadStream<I, K>};
  actionByType: {[K in keyof I]: rx.Observable<Action<I, K>>};
  /** abbrevation of actionByType */
  at: {[K in keyof I]: rx.Observable<Action<I, K>>};

  updateInterceptor: ControllerCore<I>['updateInterceptor'];

  constructor(public opts?: CoreOptions<(string & keyof I)[]>) {
    const core = this.core = new ControllerCore(opts);

    this.dispatcher = this.dp = new Proxy({} as {[K in keyof I]: Dispatch<I[K]>}, {
      get(_target, key, _rec) {
        return core.dispatchFactory(key as keyof I);
      }
    });
    this.dispatcherFor = this.dpf = new Proxy({} as {[K in keyof I]: DispatchFor<I[K]>}, {
      get(_target, key, _rec) {
        return core.dispatchForFactory(key as keyof I);
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
      }
    });

    this.dispatchAndObserveRes = this.do = new Proxy({} as {[K in keyof I]: DispatchAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I, R>>, ...params: any[]) => {
          return self.dfo[key as keyof I](action$, null, ...(params as any));
        };
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
        }
      });
    this.updateInterceptor = core.updateInterceptor;
  }

  createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>) {
    return this.core.createAction(type, params);
  }

  /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
  groupControllerBy<K>(keySelector: (action: Action<I>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<(string & keyof I)[]>) {
    return this.core.action$.pipe(
      rx.groupBy(keySelector),
      rx.map(grouped => {
        const groupedRxCtl = new GroupedRxController<I, K>(grouped.key, {...(groupedCtlOptionsFn ? groupedCtlOptionsFn(grouped.key) : {}), autoConnect: false});

        groupedRxCtl.core.actionSubscribed$.pipe(
          rx.mergeMap(() => {
            return grouped.pipe(rx.tap(groupedRxCtl.core.actionUpstream));
          }),
          rx.takeUntil(groupedRxCtl.core.actionUnsubscribed$)
        ).subscribe();

        return groupedRxCtl;
      })
    );
  }

  /**
   * Delegate to `this.core.action$.connect()`
   * "core.action$" is a `connectable` observable, under the hook, it is like `action$ = connectable(actionUpstream)`.
   *
   * By default `connect()` will be immediately invoked in constructor function, when "options.autoConnect" is
   * `undefined` or `true`, in that case you don't need to call this method manually.
   *
   * Refer to [connectable](https://rxjs.dev/api/index/function/connectable)
   */
  connect() {
    this.core.action$.connect();
  }
}

export class GroupedRxController<I extends ActionFunctions, K> extends RxController<I> {
  constructor(public key: K, opts?: CoreOptions<(string & keyof I)[]>) {
    super(opts);
  }
}

export class ActionTable<I extends ActionFunctions, KS extends ReadonlyArray<keyof I>> {
  actionNames: KS;

  latestPayloads = {} as {[K in KS[number]]: PayloadStream<I, K>};
  /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
  l: {[K in KS[number]]: PayloadStream<I, K>};

  get latestPayloadsByName$(): rx.Observable<{[P in KS[number]]: InferMapParam<I, P>}> {
    if (this.#latestPayloadsByName$)
      return this.#latestPayloadsByName$;

    this.#latestPayloadsByName$ = this.actionNamesAdded$.pipe(
      rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))),
      rx.map(() => {
        const paramByName = {} as {[P in KS[number]]: InferMapParam<I, P>};
        for (const [k, v] of this.actionSnapshot.entries()) {
          paramByName[k] = v;
        }
        return paramByName;
      }),
      rx.share()
    );
    return this.#latestPayloadsByName$;
  }

  get latestPayloadsSnapshot$(): rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> {
    if (this.#latestPayloadsSnapshot$)
      return this.#latestPayloadsSnapshot$;

    this.#latestPayloadsSnapshot$ = this.actionNamesAdded$.pipe(
      rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))),
      rx.map(() => this.actionSnapshot)
    );
    return this.#latestPayloadsSnapshot$;
  }

  actionSnapshot = new Map<keyof I, InferMapParam<I, keyof I>>();

  // private
  #latestPayloadsByName$: rx.Observable<{[P in KS[number]]: InferMapParam<I, P>}> | undefined;
  #latestPayloadsSnapshot$: rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> | undefined;
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

  }

  addActions<M extends Array<keyof I>>(...actionNames: M) {
    this.actionNames = this.actionNames.concat(actionNames) as unknown as KS;
    this.actionNamesAdded$.next(actionNames);
    return this as unknown as ActionTable<I, Array<KS[number] | M[number]>>;
  }

  private onAddActions<M extends ReadonlyArray<keyof I>>(actionNames: M) {
    for (const type of actionNames) {
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
 * Create a new Action with same "i" and "r" properties and dispatched to RxController
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
