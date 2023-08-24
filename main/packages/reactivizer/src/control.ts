import * as rx from 'rxjs';

export type ActionFunctions = object; // use "object" instead of A indexed access type, since a "class type" can not be assigned to "Indexed access type"

type InferPayload<F extends (...a: any[]) => any> = Parameters<F>;

export type Action<I extends ActionFunctions, K extends keyof I = keyof I> = {
  /** id */
  i: number;
  /** type */
  t: string;
  /** payload **/
  p: InferPayload<I[K]>;
};

type InferMapParam<I extends ActionFunctions, K extends keyof I> = [Action<I, K>['i'], ...InferPayload<I[K]>];

export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;

export type CoreOptions = {
  debug?: string | boolean;
  log?: (msg: string, ...objs: any[]) => unknown;
};

let SEQ = 1;
let ACTION_SEQ = 1;

const has = Object.prototype.hasOwnProperty;

export class ControllerCore<I extends ActionFunctions = {[k: string]: never}> {
  actionUpstream = new rx.Subject<Action<I, keyof I>>();
  dispatcher = {} as {[K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i']};
  interceptor$ = new rx.BehaviorSubject<(up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>>(a => a);
  typePrefix = SEQ++ + '/';
  debugName: string;
  action$: rx.Observable<Action<I, keyof I>>;

  constructor(public opts?: CoreOptions) {
    this.debugName = typeof opts?.debug === 'string' ? `[${this.typePrefix}${opts.debug}] ` : this.typePrefix;

    const debuggableAction$ = opts?.debug
      ? this.actionUpstream.pipe(
        opts?.log ?
          rx.tap(action => opts.log!(this.debugName + 'rx:action', nameOfAction(action))) :
          (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
            rx.tap(action => {
            // eslint-disable-next-line no-console
              console.log(`%c ${this.debugName}rx:action `, 'color: white; background: #8c61ff;',
                nameOfAction(action),
                action.p === undefined ? '' : action.p
              );
            })
            :
          // eslint-disable-next-line no-console
            rx.tap(action => console.log(this.debugName + 'rx:action', nameOfAction(action),
              action.p === undefined ? '' : action.p )),
        rx.share()
      )
      : this.actionUpstream;

    this.action$ = this.interceptor$.pipe(
      rx.switchMap(interceptor => interceptor ?
        debuggableAction$.pipe(interceptor, rx.share()) :
        debuggableAction$)
    );
  }

  createAction<K extends keyof I>(type: K, params: InferPayload<I[K]>) {
    return {
      t: this.typePrefix + (type as string),
      i: ACTION_SEQ++,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      p: params
    } as Action<I, K>;
  }

  dispatcherFactory<K extends keyof I>(type: K) {
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

  ofType<T extends keyof I>(...types: [T, ...T[]]) {
    return (up: rx.Observable<Action<any, any>>) => {
      const matchTypes = types.map(type => this.typePrefix + (type as string));
      return up.pipe(
        rx.filter((a): a is Action<I, T> => matchTypes.some(matchType => a.t === matchType))
      );
    };
  }
}

export class RxController<I extends ActionFunctions> {
  core: ControllerCore<I>;
  dispatcher: {[K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i']};
  dp: {[K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i']};
  payloadByType: {[K in keyof I]: PayloadStream<I, K>};
  pt: {[K in keyof I]: PayloadStream<I, K>};
  actionByType: {[K in keyof I]: rx.Observable<Action<I, K>>};
  at: {[K in keyof I]: rx.Observable<Action<I, K>>};
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
          const a$ = actionByTypeProxy[key as keyof I];
          return a$.pipe(
            rx.map(a => [a.i, ...a.p]),
            rx.share()
          );
        }
      });
    this.actionByType = this.at = actionByTypeProxy;
    this.payloadByType = this.pt = payloadByTypeProxy;
    this.replaceActionInterceptor = core.replaceActionInterceptor;
  }

  /**
   * Conceptually, it is a "store store" like Apache Kafka's "table"
   * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
   */
  createLatestPayloadsFor<T extends keyof I>(...types: [T, ...T[]]): {[K in T]: PayloadStream<I, K>} {
    const replayedPayloads = {} as {[K in T]: rx.Observable<InferMapParam<I, T>>};
    const payloadByTypeProxy = this.payloadByType;
    for (const key of types) {
      const r$ = new rx.ReplaySubject<InferMapParam<I, T>>(1);
      replayedPayloads[key] = this.opts?.debug ?
        r$.pipe(this.debugLogLatestActionOperator(key as string)) :
        r$.asObservable();
      payloadByTypeProxy[key].subscribe(r$);
    }
    return replayedPayloads;
  }

  protected  debugLogLatestActionOperator<P>(type: string) {
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
            console.log(this.core.debugName + 'rx:action', type, payload === undefined ? '' : payload);
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
  action: Action<I, keyof I>
): keyof I | undefined {
  return action.t.split('/')[1] as keyof I;
}

