import * as rx from 'rxjs';

// type Mutable<I> = {-readonly [K in keyof I]: I[K]};
export type ActionFunctions = {[k: string]: any}; // instead of A indexed access type, since a "class type" can not be assigned to "Indexed access type with function type property"

type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];

export type Action<I extends ActionFunctions, K extends keyof I = keyof I> = {
  /** id */
  i: number;
  /** type */
  t: string;
  /** payload **/
  p: InferPayload<I[K]>;
};

type InferMapParam<I extends ActionFunctions, K extends keyof I> = [Action<any>['i'], ...InferPayload<I[K]>];

export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;

type Dispatch<I extends ActionFunctions> = (...params: InferPayload<I[keyof I]>) => Action<any>['i'];
// type DispatchAndObserveFn<I extends ActionFunctions, K extends keyof I> = {
//   id: Action<I, K>['i'];
//   observe<T>(target: rx.Observable<T>, predicate: (
//     requestActionId: Action<I, K>['i'],
//     targetValue: T
//   ) => boolean): rx.Observable<T>;
// };

export type CoreOptions = {
  debug?: string | boolean;
  debugExcludeTypes?: string[];
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
  protected dispatcher = {} as {[K in keyof I]: Dispatch<I>};

  constructor(public opts?: CoreOptions) {
    this.debugName = typeof opts?.debug === 'string' ? `[${this.typePrefix}${opts.debug}] ` : this.typePrefix;
    this.debugExcludeSet = new Set(opts?.debugExcludeTypes ?? []);

    const debuggableAction$ = opts?.debug
      ? this.actionUpstream.pipe(
        opts?.log ?
          rx.tap(action => opts.log!(this.debugName + 'rx:action', nameOfAction(action))) :
          (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
            rx.tap(action => {
              const type = nameOfAction(action);
              if (!this.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log(`%c ${this.debugName}rx:action `, 'color: white; background: #8c61ff;', type, [action.i, ...action.p]);
              }
            })
            :
            rx.tap(action => {
              const type = nameOfAction(action);
              if (!this.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log( this.debugName + 'rx:action', type, action.p === undefined ? '' : [action.i, ...action.p] );
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

  dispatcherFactory<K extends keyof I>(type: K): Dispatch<I> {
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
}

export class RxController<I extends ActionFunctions> {
  core: ControllerCore<I>;
  dispatcher: {[K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i']};
  dp: {[K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i']};
  // dispatchAndObserve: {[K in keyof I]: (...params: InferPayload<I[K]>) => DispatchAndObserveFn<I, K>};
  // dpno: {[K in keyof I]: (...params: InferPayload<I[K]>) => DispatchAndObserveFn<I, K>};
  payloadByType: {[K in keyof I]: PayloadStream<I, K>};
  pt: {[K in keyof I]: PayloadStream<I, K>};
  actionByType: {[K in keyof I]: rx.Observable<Action<I, K>>};
  at: {[K in keyof I]: rx.Observable<Action<I, K>>};
  protected latestActionsCache = {} as {[K in keyof I]?: rx.Observable<Action<I, K>>};
  protected latestPayloadsCache = {} as {[K in keyof I]?: PayloadStream<I, K>};

  replaceActionInterceptor: ControllerCore<I>['replaceActionInterceptor'];

  constructor(private opts?: CoreOptions) {
    const core = this.core = new ControllerCore(opts);

    this.dispatcher = this.dp = new Proxy({} as {[K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i']}, {
      get(_target, key, _rec) {
        return core.dispatcherFactory(key as keyof I);
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

    const payloadsByType = {} as {[K in keyof I]: rx.Observable<[Action<I, K>['i'], ...Action<I, K>['p']]>};
    const payloadByTypeProxy = new Proxy(
      {} as typeof payloadsByType,
      {
        get(_target, key, _rec) {
          let p$ = payloadsByType[key as keyof I];
          if (p$ == null) {
            const a$ = actionByTypeProxy[key as keyof I];
            p$ = payloadsByType[key as keyof I] = a$.pipe(
              rx.map(a => [a.i, ...a.p] as any),
              rx.share()
            );
          }
          return p$;
        }
      });
    this.actionByType = this.at = actionByTypeProxy;
    this.payloadByType = this.pt = payloadByTypeProxy;
    this.replaceActionInterceptor = core.replaceActionInterceptor;
  }

  // eslint-disable-next-line space-before-function-paren
  createLatestActionsFor<T extends (keyof I)[]>(...types: T): Pick<
  {
    [K in keyof I]:
    rx.Observable<Action<I, K>>
  },
  T[number]
  > {
    for (const type of types) {
      if (has.call(this.latestActionsCache, type))
        continue;
      const a$ = this.latestActionsCache[type] =
        new rx.ReplaySubject(1);
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
    const replayedPayloads = {} as {[K in keyof I]: rx.Observable<InferMapParam<I, K>>};
    const payloadByTypeProxy = this.payloadByType;

    for (const key of types) {
      let r$ = this.latestActionsCache.get(key);
      if (r$ == null) {
        r$ = new rx.ReplaySubject<Action<I, keyof I>>(1);
        this.latestActionsCache.set(key, r$);
      }
      replayedPayloads[key] = this.opts?.debug ?
        r$.pipe(this.debugLogLatestActionOperator(key as string)) :
        r$.asObservable();
      payloadByTypeProxy[key].subscribe(r$);
    }
    return replayedPayloads;
  }

  protected debugLogLatestActionOperator<P>(type: string) {
    return this.opts?.log ?
      rx.map<P, P>((payload, idx) => {
        if (idx === 0) {
          this.opts!.log!(this.core.debugName + 'rx:latest', type);
        }
        return payload;
      }) :
      (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
        rx.map<P, P>((payload, idx) => {
          if (idx === 0) {
            // eslint-disable-next-line no-console
            console.log(`%c ${this.core.debugName}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type,
              payload === undefined ? '' : payload
            );
          }
          return payload;
        }) :
        rx.map<P, P>((payload, idx) => {
          if (idx === 0) {
            // eslint-disable-next-line no-console
            console.log(this.core.debugName + 'rx:latest', type, payload === undefined ? '' : payload);
          }
          return payload;
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

export function serializeAction(action: Action<any>):
Action<any> {
  return {...action, t: nameOfAction(action)};
}

export function deserializeAction<I extends ActionFunctions>(actionObj: any, toController: RxController<I>) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return toController.dispatcher[actionObj.t as keyof I](...actionObj.p as InferPayload<I[keyof I]>);
}


