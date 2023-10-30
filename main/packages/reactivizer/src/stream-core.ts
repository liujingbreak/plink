import * as rx from 'rxjs';

export type ActionFunctions = Record<string, any>; // instead of A indexed access type, since a "class type" can not be assigned to "Indexed access type with function type property"
export type EmptyActionFunctions = Record<string, never>;

export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];

export type ActionMeta = {
  /** id */
  i: number;
  /** reference to other actions */
  r?: number | number[];
};

export type ArrayOrTuple<T> = T[] | readonly T[] | readonly [T, ...T[]];

export type Action<I extends ActionFunctions, K extends keyof I = keyof I & string> = {
  /** type */
  t: string;
  /** payload **/
  p: InferPayload<I[K]>;
} & ActionMeta;

export type InferMapParam<I extends ActionFunctions, K extends keyof I> = [ActionMeta, ...InferPayload<I[K]>];

export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;

export type Dispatch<F> = (...params: InferPayload<F>) => Action<any>['i'];
export type DispatchFor<F> = (origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta>, ...params: InferPayload<F>) => Action<any>['i'];

export type CoreOptions<K extends string[]> = {
  name?: string | boolean;
  /** default is `true`, set to `false` will result in Connectable multicast action observable "action$" not 
  * being automatically connected, you have to manually call `RxController::connect()` or `action$.connect()`,
  * otherwise, any actions that is dispatched to `actionUpstream` will not be observed and emitted by `action$`,
  * Refer to [https://rxjs.dev/api/index/function/connectable](https://rxjs.dev/api/index/function/connectable)
  * */
  autoConnect?: boolean;
  debug?: boolean;
  debugExcludeTypes?: K;
  logStyle?: 'full' | 'noParam';
  log?: (msg: string, ...objs: any[]) => unknown;
};

let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;

export const has = Object.prototype.hasOwnProperty;

export class ControllerCore<I extends ActionFunctions = {[k: string]: never}> {
  actionUpstream = new rx.Subject<Action<I>>();
  interceptor$ = new rx.BehaviorSubject<(up: rx.Observable<Action<I>>) => rx.Observable<Action<I>>>(a => a);
  typePrefix = '#' + SEQ++ + ' ';
  logPrefix: string;
  action$: rx.Observable<Action<I>>;
  debugExcludeSet: Set<string>;

  /** Event when `action$` is first time subscribed */
  actionSubscribed$: rx.Observable<void>;
  /** Event when `action$` is entirely unsubscribed by all observers */
  actionUnsubscribed$: rx.Observable<void>;
  protected dispatcher = {} as {[K in keyof I]: Dispatch<I[keyof I]>};
  protected dispatcherFor = {} as {[K in keyof I]: DispatchFor<I[keyof I]>};
  protected actionSubDispatcher = new rx.Subject<void>();
  protected actionUnsubDispatcher = new rx.Subject<void>();
  private connectableAction$: rx.Connectable<Action<I>>;

  constructor(public opts?: CoreOptions<(string & keyof I)[]>) {
    this.logPrefix = opts?.name ? `[${this.typePrefix}${opts.name}] ` : this.typePrefix;
    this.debugExcludeSet = new Set(opts?.debugExcludeTypes ?? []);

    const debuggableAction$ = opts?.debug
      ? this.actionUpstream.pipe(
        opts?.log ?
          rx.tap(action => {
            const type = nameOfAction(action);
            if (!this.debugExcludeSet.has(type)) {
              opts.log!(this.logPrefix + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
            }
          }) :
          (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
            rx.tap(action => {
              const type = nameOfAction(action);
              if (!this.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log(`%c ${this.logPrefix}rx:action`, 'color: white; background: #8c61ff;',
                  type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
              }
            }) :
            rx.tap(action => {
              const type = nameOfAction(action);
              if (!this.debugExcludeSet.has(type)) {
                // eslint-disable-next-line no-console
                console.log( this.logPrefix + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
              }
            })
      )
      : this.actionUpstream;

    this.connectableAction$ = rx.connectable(this.interceptor$.pipe(
      rx.switchMap(interceptor => interceptor ?
        debuggableAction$.pipe(interceptor) :
        debuggableAction$)
    ));

    this.action$ = rx.merge(
      // merge() helps to leverage a auxiliary Observable to notify when "connectableAction$" is actually being
      // subscribed, since it will be subscribed along together with "connectableAction$"
      this.connectableAction$,
      new rx.Observable<never>(sub => {
        // Notify that action$ is subscribed
        this.actionSubDispatcher.next();
        sub.complete();
      })
    ).pipe(
      rx.finalize(() => {
        this.actionUnsubDispatcher.next();
      }),
      rx.share()
    );

    if (opts?.autoConnect == null || opts?.autoConnect) {
      this.connectableAction$.connect();
    }
    this.actionSubscribed$ = this.actionSubDispatcher.asObservable();
    this.actionUnsubscribed$ = this.actionUnsubDispatcher.asObservable();
  }

  createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, params?: InferPayload<J[K]>) {
    return {
      t: this.typePrefix + (type as string),
      i: ACTION_SEQ++,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      p: params ?? []
    } as Action<J, K>;
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
    const dispatch = (metas: ActionMeta | ArrayOrTuple<ActionMeta>, ...params: InferPayload<I[keyof I]>) => {
      const action = this.createAction(type, params);
      action.r = Array.isArray(metas) ? metas.map(m => m.i) : (metas as ActionMeta).i;
      this.actionUpstream.next(action);
      return action.i;
    };
    this.dispatcherFor[type] = dispatch;
    return dispatch;
  }

  updateInterceptor(
    factory: (
      previous: (up: rx.Observable<Action<I>>) => rx.Observable<Action<I>>
    ) => (up: rx.Observable<Action<I>>) => rx.Observable<Action<I>>
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
  connect() {
    this.connectableAction$.connect();
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
  action: Pick<Action<I>, 't'>
) {
  const match = /(?:#\d+\s+)?(\S+)$/.exec(action.t);
  return (match ? match[1] : action.t) as keyof I & string;
}

export function actionMetaToStr(action: ActionMeta) {
  const {r, i} = action;
  return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}
