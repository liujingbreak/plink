import * as rx from 'rxjs';
import {RxControlConfigType, defaultConfig} from './global-config';

export type ActionFunctions = Record<string, any>; // instead of A indexed access type, since a "class type" can not be assigned to "Indexed access type with function type property"
export type EmptyActionFunctions = Record<string, never>;

export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type InferMapParam<F> = [ActionMeta, ...InferPayload<F>];

export type ActionMeta = {
  /** id */
  i: number;
  /** The ActionMeta['i'] of other actions that is referred to by this action */
  r?: number | number[];
};

export type ArrayOrTuple<T> = T[] | readonly T[] | readonly [T, ...T[]];

export type Action<F> = {
  /** type */
  t: string;
  /** payload **/
  p: InferPayload<F>;
} & ActionMeta;

// export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>;

export type Dispatch<F> = (...params: InferPayload<F>) => Action<F>;
export type DispatchFor<F> =
  (origActionMeta: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>, ...params: InferPayload<F>) => Action<F>;

export type CoreOptions<I> = {
  name?: string;
  /** default is `true`, set to `false` will result in Connectable multicast action observable "action$" not 
  * being automatically connected, you have to manually call `RxController::connect()` or `action$.connect()`,
  * otherwise, any actions that is dispatched to `actionUpstream` will not be observed and emitted by `action$`,
  * Refer to [https://rxjs.dev/api/index/function/connectable](https://rxjs.dev/api/index/function/connectable)
  * */
  autoConnect?: boolean;
  /** default is `false`, setting `true` will print message in console log */
  debug?: boolean;
  /** Log all actions whose type is listed in this property, by default "undefined" means actions of all types will be logged. */
  debugIncludeTypes?: (keyof I)[] | null;
  /** Exclude actions of specific types from "debugIncludeTypes" */
  debugExcludeTypes?: (keyof I)[];
  /**
   * "full" - print full message content, including "type" and "payload" tuple
   * "noParam" - print message type, without payload tuple
   */
  logStyle?: 'full' | 'noParam';
  /** Use a customized log function
   */
  log?: null | ((msg: string, ...objs: any[]) => unknown);
};

let SEQ = 0;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;

export const has = Object.prototype.hasOwnProperty;
type Interceptor<I> = (up: rx.Observable<Action<I[keyof I]>>) => rx.Observable<Action<I[keyof I]>>;

export class ControllerCore<I> {
  actionUpstream = new rx.Subject<Action<I[keyof I]>>();
  /** Insert action "interceptor" operator function
   */
  interceptor$ = new rx.Subject<(up: rx.Observable<Action<I[keyof I]>>) => rx.Observable<Action<I[keyof I]>>>();
  logPrefix = '';
  action$: rx.Observable<Action<I[keyof I]>>;
  debugIncludeSet: Set<string | number | symbol> | null | undefined;
  debugExcludeSet: Set<string | number | symbol> = new Set();

  /** Event when `action$` is first time subscribed */
  actionSubscribed$: rx.Observable<void>;
  /** Event when `action$` is entirely unsubscribed by all observers */
  actionUnsubscribed$: rx.Observable<void>;
  configChange = new rx.Subject<Set<keyof RxControlConfigType<I>>>();
  opts: CoreOptions<I> = {};
  protected dispatcher = {} as {[K in keyof I]: Dispatch<I[K]>};
  protected dispatcherFor = {} as {[K in keyof I]: DispatchFor<I[K]>};
  private connectableAction$: rx.Connectable<Action<I[keyof I]>> | undefined;

  constructor(opts: CoreOptions<I> = {}) {
    this.setName(opts?.name);
    const interceptorList$ = this.interceptor$.pipe(
      rx.startWith(a$ => a$),
      rx.scan((arr, it) => {
        arr.push(it);
        return arr;
      }, [] as Interceptor<I>[])
    );
    // 1. this.configChange, this.interceptor$, this.actionUpstream => this.connectableAction$
    this.connectableAction$ = rx.connectable(
      this.configChange.pipe(
        rx.map((props, i) => {
          let switchActionStream = i === 0; // always create action stream at first time
          if (props.has('debugIncludeTypes')) {
            if (this.debugIncludeSet == null)
              this.debugIncludeSet = this.opts?.debugIncludeTypes ? new Set(this.opts.debugIncludeTypes) : null;
            if (this.debugIncludeSet && this.opts?.debugIncludeTypes) {
              this.opts.debugIncludeTypes.forEach(item => this.debugIncludeSet!.add(item));
            }
          }
          if (props.has('debugExcludeTypes')) {
            if (this.debugExcludeSet == null)
              this.debugExcludeSet = new Set([]);
            if (this.opts?.debugExcludeTypes) {
              this.opts.debugExcludeTypes.forEach(item => this.debugExcludeSet.add(item));
            }
          }
          if (props.has('debug') || props.has('log')) {
            switchActionStream = true;
          }
          return switchActionStream;
        }),
        rx.filter(needSwitch => needSwitch),
        rx.combineLatestWith(interceptorList$),
        rx.switchMap(([, interceptors]) => {
          const debuggableAction$ = this.opts.debug ?
            this.actionUpstream.pipe(
              this.opts.log ?
                rx.tap(action => {
                  const type = nameOfAction(action);
                  if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                    this.opts.log!(this.logPrefix, 'rx:', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                  }
                }) :
                (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                  rx.tap(action => {
                    const type = nameOfAction(action);
                    if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                      // eslint-disable-next-line no-console
                      console.log(`%c ${this.logPrefix} rx:`, 'color: #e0f0e0; background: #8c61ff;',
                        type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                    }
                  }) :
                  rx.tap(action => {
                    const type = nameOfAction(action);
                    if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                      // eslint-disable-next-line no-console
                      console.log('[' + this.logPrefix, '] ', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                    }
                  })
            )
            : this.actionUpstream;

          return interceptors ?
            debuggableAction$.pipe(...(interceptors.reverse() as [Interceptor<I>])) :
            debuggableAction$;
        })
      ));

    const actionSubDispatcher = new rx.Subject<void>();
    const actionUnsubDispatcher = new rx.Subject<void>();
    // 2. this.connectableAction$ => this.action$, this.actionSubDispatcher, this.actionUnsubDispatcher
    this.action$ = rx.merge(
      // merge() helps to leverage a auxiliary Observable to notify when "connectableAction$" is actually being
      // subscribed, since it will be subscribed along together with "connectableAction$"
      this.connectableAction$,
      new rx.Observable<never>(sub => {
        // Notify that action$ is subscribed
        actionSubDispatcher.next();
        sub.complete();
      })
    ).pipe(
      rx.finalize(() => {
        actionUnsubDispatcher.next();
      }),
      rx.share()
    );
    if (opts?.autoConnect == null || opts?.autoConnect) {
      this.connectableAction$.connect();
    }
    this.config({...defaultConfig as RxControlConfigType<I>, ...opts});

    this.actionSubscribed$ = actionSubDispatcher.asObservable();
    this.actionUnsubscribed$ = actionUnsubDispatcher.asObservable();
  }

  createAction<J = I, K extends keyof J = keyof J>(name: K, params?: InferPayload<J[K]>) {
    return {
      t: name as string,
      i: ACTION_SEQ++,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      p: params ?? []
    } as Action<J[K]>;
  }

  /** action id is also copied */
  copyActionFrom(source: Action<any>) {
    const copied = this.createAction<I, keyof I>(nameOfAction(source), source.p as any);
    copied.i = source.i;
    copied.r = source.r;
    return copied;
  }

  /** change the "name" as previous specified in CoreOptions of constructor */
  setName(name: string | null | undefined) {
    this.logPrefix = name ?? ++SEQ + '';
  }

  config(opts: RxControlConfigType<I>) {
    const changedProperties = new Set<keyof RxControlConfigType>();
    for (const [p, v] of Object.entries(opts)) {
      if (v !== this.opts[p as keyof RxControlConfigType<I>]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.opts[p as unknown as keyof RxControlConfigType<I>] = v as any;
        changedProperties.add(p as keyof RxControlConfigType);
      }
    }
    if (changedProperties.size > 0) {
      this.configChange.next(changedProperties);
    }
  }

  /** This method is not meant to be used directly */
  dispatchFactory<K extends keyof I>(type: K): Dispatch<I[K]> {
    if (has.call(this.dispatcher, type)) {
      return this.dispatcher[type];
    }
    const dispatch = (...params: InferPayload<I[keyof I]>) => {
      const action = this.createAction(type, params);
      this.actionUpstream.next(action);
      return action;
    };
    this.dispatcher[type] = dispatch;
    return dispatch;
  }

  /** This method is not meant to be used directly */
  dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I[K]> {
    if (has.call(this.dispatcherFor, type)) {
      return this.dispatcherFor[type];
    }
    const dispatch = (metas: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>, ...params: InferPayload<I[keyof I]>) => {
      const action = this.createAction(type, params);
      assignActionReferParam(action, metas);
      this.actionUpstream.next(action);
      return action;
    };
    this.dispatcherFor[type] = dispatch;
    return dispatch;
  }

  // eslint-disable-next-line space-before-function-paren
  ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[T[number]]>> {
    return (up: rx.Observable<Action<any>>) => {
      const matchTypes = types.map(type => type as string);
      return up.pipe(
        rx.filter((a): a is Action<I[T[number]]> => matchTypes.some(matchType => a.t === matchType))
      );
    };
  }

  // eslint-disable-next-line space-before-function-paren
  notOfType<T extends (keyof I)[]>(...types: T) {
    return (up: rx.Observable<Action<any>>) => {
      const matchTypes = types.map(type => type as string);
      return up.pipe(
        rx.filter((a): a is Action<I[Exclude<(keyof I), T[number]>]> => matchTypes.every(matchType => a.t !== matchType))
      );
    };
  }

  isType<K extends keyof I>(action: Action<I[keyof I]>, type: K): action is Action<I[K]> {
    return action.t === (type as string);
  }

  connect() {
    rx.concat(
      rx.of(this.connectableAction$),
      this.configChange
    ).pipe(
      rx.filter(() => this.connectableAction$ != null),
      rx.map(() => this.connectableAction$),
      rx.take(1)
    ).subscribe(() => this.connectableAction$!.connect());
  }
}

/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
export function nameOfAction<I = ActionFunctions>(
  action: Pick<Action<I[keyof I]>, 't'>
): keyof I {
  // const match = /(?:#\d+\s+)?(\S+)$/.exec(action.t);
  // return (match ? match[1] : action.t) as keyof I;
  return action.t as keyof I;
}

export function actionMetaToStr(action: ActionMeta) {
  const {r, i} = action;
  return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}

export function assignActionReferParam(action: Action<any>, metas: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>) {
  action.r = Array.isArray(metas) ?
    metas.flatMap(m => Array.isArray(m) ? m : m != null ? [m] : []).map(m => typeof m === 'number' ? m : m.i) :
    typeof metas === 'number' ? metas : (metas as ActionMeta).i;
  return action;
}

