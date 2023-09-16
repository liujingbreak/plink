import * as rx from 'rxjs';

// type Mutable<I> = {-readonly [K in keyof I]: I[K]};
export type ActionFunctions = {[k: string]: any}; // instead of A indexed access type, since a "class type" can not be assigned to "Indexed access type with function type property"

type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];

export type ActionMeta = {
  /** id */
  i: number;
  /** reference to other actions */
  r?: number | number[];
};
export type Action<I extends ActionFunctions, K extends keyof I = keyof I & string> = {
  /** type */
  t: string;
  /** payload **/
  p: InferPayload<I[K]>;
} & ActionMeta;

type InferMapParam<I extends ActionFunctions, K extends keyof I> = [ActionMeta, ...InferPayload<I[K]>];

export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;

type Dispatch<F> = (...params: InferPayload<F>) => Action<any>['i'];
type DispatchFor<F> = (referActions: ActionMeta | ActionMeta[], ...params: InferPayload<F>) => Action<any>['i'];
type DispatchAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(
  waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>
) => rx.Observable<InferMapParam<O, R>>;

export type CoreOptions<K extends string[]> = {
  debug?: string | boolean;
  debugExcludeTypes?: K;
  logStyle?: 'full' | 'noParam';
  log?: (msg: string, ...objs: any[]) => unknown;
};

let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;

const has = Object.prototype.hasOwnProperty;

export class ControllerCore<I extends ActionFunctions = {[k: string]: never}> {
  actionUpstream = new rx.Subject<Action<I, keyof I>>();
  interceptor$ = new rx.BehaviorSubject<(up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>>(a => a);
  typePrefix = SEQ++ + '/';
  debugName: string;
  action$: rx.Observable<Action<I, keyof I>>;
  debugExcludeSet: Set<string>;
  protected dispatcher = {} as {[K in keyof I]: Dispatch<I[keyof I]>};
  protected dispatcherFor = {} as {[K in keyof I]: DispatchFor<I[keyof I]>};

  constructor(public opts?: CoreOptions<(string & keyof I)[]>) {
    this.debugName = typeof opts?.debug === 'string' ? `[${this.typePrefix}${opts.debug}] ` : this.typePrefix;
    this.debugExcludeSet = new Set(opts?.debugExcludeTypes ?? []);

    const debuggableAction$ = opts?.debug
      ? this.actionUpstream.pipe(
        opts?.log ?
          rx.tap(action => {
            const type = nameOfAction(action);
            if (!this.debugExcludeSet.has(type)) {
              opts.log!(this.debugName + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
            }
          }) :
          (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
            rx.tap(action => {
              const type = nameOfAction(action);
              if (!this.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log(`%c ${this.debugName}rx:action `, 'color: white; background: #8c61ff;',
                  type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
              }
            }) :
            rx.tap(action => {
              const type = nameOfAction(action);
              if (!this.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log( this.debugName + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
              }
            }),
        rx.share()
      )
      : this.actionUpstream;

    this.action$ = this.interceptor$.pipe(
      rx.switchMap(interceptor => interceptor ?
        debuggableAction$.pipe(interceptor, rx.share()) :
        debuggableAction$)
    );
  }

  createAction<K extends keyof I>(type: K, params?: InferPayload<I[K]>) {
    return {
      t: this.typePrefix + (type as string),
      i: ACTION_SEQ++,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      p: params ?? []
    } as Action<I, K>;
  }

  dispatchFactory<K extends keyof I>(type: K): Dispatch<I> {
    if (has.call(this.dispatcher, type)) {
      return this.dispatcher[type];
    }
    const dispatch = (...params: InferPayload<I[keyof I]>) => {
      const action = this.createAction(type, params);
      this.actionUpstream.next(action);
      return action.i;
    };
    this.dispatcher[type] = dispatch;
    return dispatch;
  }

  dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I> {
    if (has.call(this.dispatcherFor, type)) {
      return this.dispatcherFor[type];
    }
    const dispatch = (metas: ActionMeta | ActionMeta[], ...params: InferPayload<I[keyof I]>) => {
      const action = this.createAction(type, params);
      action.r = Array.isArray(metas) ? metas.map(m => m.i) : metas.i;
      this.actionUpstream.next(action);
      return action.i;
    };
    this.dispatcherFor[type] = dispatch;
    return dispatch;
  }

  replaceActionInterceptor(
    factory: (
      origin: (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>
    ) => (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>
  ) {
    const newInterceptor = factory(this.interceptor$.getValue());
    this.interceptor$.next(newInterceptor);
  }

  // eslint-disable-next-line space-before-function-paren
  ofType<T extends (keyof I)[]>(...types: T) {
    return (up: rx.Observable<Action<any, any>>) => {
      const matchTypes = types.map(type => this.typePrefix + (type as string));
      return up.pipe(
        rx.filter((a): a is Action<I, T[number]> => matchTypes.some(matchType => a.t === matchType))
      );
    };
  }

  // eslint-disable-next-line space-before-function-paren
  notOfType<T extends (keyof I)[]>(...types: T) {
    return (up: rx.Observable<Action<any, any>>) => {
      const matchTypes = types.map(type => this.typePrefix + (type as string));
      return up.pipe(
        rx.filter((a): a is Action<I, Exclude<(keyof I), T[number]>> => matchTypes.every(matchType => a.t !== matchType))
      );
    };
  }
}

export class RxController<I extends ActionFunctions> {
  core: ControllerCore<I>;
  dispatcher: {[K in keyof I]: Dispatch<I[K]>};
  dispatcherFor: {[K in keyof I]: DispatchFor<I[K]>};
  dp: {[K in keyof I]: Dispatch<I[K]>};
  dpf: {[K in keyof I]: DispatchFor<I[K]>};
  dispatchAndObserveRes: {[K in keyof I]: DispatchAndObserveRes<I, K>};
  do: {[K in keyof I]: DispatchAndObserveRes<I, K>};
  payloadByType: {[K in keyof I]: PayloadStream<I, K>};
  pt: {[K in keyof I]: PayloadStream<I, K>};
  actionByType: {[K in keyof I]: rx.Observable<Action<I, K>>};
  at: {[K in keyof I]: rx.Observable<Action<I, K>>};
  protected latestActionsCache = {} as {[K in keyof I]?: rx.Observable<Action<I, K>>};
  protected latestPayloadsCache = {} as {[K in keyof I]?: PayloadStream<I, K>};

  replaceActionInterceptor: ControllerCore<I>['replaceActionInterceptor'];

  constructor(private opts?: CoreOptions<(string & keyof I)[]>) {
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
    this.dispatchAndObserveRes = this.do = new Proxy({} as {[K in keyof I]: DispatchAndObserveRes<I, K>}, {
      get(_target, key, _rec) {

        return <R extends keyof I>(action$: rx.Observable<Action<I, R>>, ...params: any[]) => {
          const action = self.core.createAction(key as string, params as InferPayload<I[string]>);
          return rx.merge(
            action$.pipe(
              actionRelatedToAction(action.i),
              mapActionToPayload()
            ),
            new rx.Observable<never>(sub => {
              self.core.actionUpstream.next(action);
              sub.complete();
            })
          );
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
    this.replaceActionInterceptor = core.replaceActionInterceptor;
  }

  createAction<K extends keyof I>(type: K, ...params: InferPayload<I[K]>) {
    return this.core.createAction(type, params);
  }

  /**
   * The function returns a cache which means you may repeatly invoke this method with duplicate parameter
   * without worrying about memory consumption
   */
  // eslint-disable-next-line space-before-function-paren
  createLatestActionsFor<T extends (keyof I)[]>(...types: T): Pick<{
    [K in keyof I]: rx.Observable<Action<I, K>>}, T[number]
  > {
    for (const type of types) {
      if (has.call(this.latestActionsCache, type))
        continue;
      const a$ = new rx.ReplaySubject<Action<I, T[number]>>(1);
      this.actionByType[type].subscribe(a$);
      this.latestActionsCache[type] = this.opts?.debug ?
        a$.pipe(
          this.debugLogLatestActionOperator(type as string)
          // rx.share() DON'T USE share(), SINCE IT WILL TURS ReplaySubject TO A NORMAL Subject
        ) :
        a$.asObservable();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.latestActionsCache as any;
  }

  /**
   * Conceptually, it is a "state store" like Apache Kafka's "table"
   * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
   * @return Pick<...>
   The reason using `Pick<{[K in keyof I]: PayloadStream<I, K>}, T[number]>` instead of `{[K in T[number]]: PayloadStream<I, K>` is that the former expression
   makes Typescript to jump to `I` type definition source code when we perform operation like "Go to definition" in editor, the latter can't
   */
  // eslint-disable-next-line space-before-function-paren
  createLatestPayloadsFor<T extends (keyof I)[]>(...types: T): Pick<{[K in keyof I]: PayloadStream<I, K>}, T[number]> {
    const actions = this.createLatestActionsFor(...types);

    for (const key of types) {
      if (has.call(this.latestPayloadsCache, key))
        continue;
      this.latestPayloadsCache[key] = actions[key].pipe(
        rx.map(a => [{i: a.i, r: a.r}, ...a.p])
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.latestPayloadsCache as any;
  }

  protected debugLogLatestActionOperator<P extends Action<I>>(type: string) {
    return this.opts?.log ?
      rx.map<P, P>((action, idx) => {
        if (idx === 0 && !this.core.debugExcludeSet.has(type)) {
          this.opts!.log!(this.core.debugName + 'rx:latest', type, action);
        }
        return action;
      }) :
      (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
        rx.map<P, P>((action, idx) => {
          if (idx === 0 && !this.core.debugExcludeSet.has(type)) {
            // eslint-disable-next-line no-console
            console.log(`%c ${this.core.debugName}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type,
              actionMetaToStr(action));
          }
          return action;
        }) :
        rx.map<P, P>((action, idx) => {
          if (idx > 0 && !this.core.debugExcludeSet.has(type)) {
            // eslint-disable-next-line no-console
            console.log(this.core.debugName + 'latest:', type, actionMetaToStr(action));
          }
          return action;
        });
  }
}

/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
export function nameOfAction<I extends ActionFunctions>(
  action: Pick<Action<I, keyof I>, 't'>
) {
  const elements = action.t.split('/');
  return (elements.length > 1 ? elements[1] : elements[0]) as keyof I & string;
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

export function serializeAction(action: Action<any>) {
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

function actionMetaToStr(action: Action<any>) {
  const {r, i} = action;
  return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}
