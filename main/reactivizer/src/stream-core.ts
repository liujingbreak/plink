import * as rx from 'rxjs';
import {CoreOptions} from './base-types';
export {CoreOptions} from './base-types';
export type ActionFunctions = Record<string, any>; // instead of A indexed access type, since a "class type" can not be assigned to "Indexed access type with function type property"
export type EmptyActionFunctions = Record<string, never>;

export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type InferMapParam<F> = [ActionMeta, ...InferPayload<F>];

export interface ActionMeta {
  /** id */
  i: number;
  /** The ActionMeta['i'] of other actions that is referred to by this action */
  r?: number | number[];
}

export type ArrayOrTuple<T> = T[] | readonly T[] | readonly [T, ...T[]];

export class Action<F = unknown> implements ActionMeta {
  static fromJsonObj(obj: ReturnType<Action['toJson']>) {
    const a = new Action(obj.t, obj.p);
    a.i = obj.i;
    a.r = obj.r;
    return a;
  }

  /** id */
  i: number;
  /** The ActionMeta['i'] of other actions that is referred to by this action */
  r?: number | number[];
  /**
  * use RxController2::createAction() instead,
  * otherwise don't forget to assign id number to property "i"
  **/
  constructor(public t: string, public p: InferPayload<F>) {
    this.i = -1;
  }

  toJson() {
    return {
      i: this.i,
      r: this.r,
      t: this.t,
      p: this.p
    };
  }

  copy(override?: Partial<ReturnType<Action['toJson']>>) {
    const c = new Action(this.t, this.p);
    c.i = this.i;
    c.r = this.r;
    if (override)
      Object.assign(this, override);
    return c;
  }
};

// export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>;

export type Dispatch<F> = (...params: InferPayload<F>) => Action<F>;
export type DispatchFor<F> =
  (origActionMeta: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>, ...params: InferPayload<F>) => Action<F>;

let SEQ = 0;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;

// eslint-disable-next-line @typescript-eslint/unbound-method
export const has = Object.prototype.hasOwnProperty;
export type Interceptor = (up: rx.Observable<Action>) => rx.Observable<Action>;

export class ControllerCore<I> {
  actionUpstream = new rx.Subject<Action>();
  _noFilterUpstream = new rx.Subject<Action>();
  /** Insert action "interceptor" operator function
   */
  logPrefix = '';
  action$: rx.Observable<Action>;
  debugIncludeSet: Set<string | number | symbol> | null | undefined;
  debugExcludeSet = new Set<string | number | symbol>();

  /** Event when `action$` is first time subscribed */
  actionSubscribed$: rx.Observable<void>;
  /** Event when `action$` is entirely unsubscribed by all observers */
  actionUnsubscribed$: rx.Observable<void>;
  configChange = new rx.ReplaySubject<Set<keyof CoreOptions<I>>>(1); // using ReplaySubject here, because this controll might be created with "autoConnect" of false, a deferred "connect" results in later describing on this observable
  opts: CoreOptions<unknown> = {}; // Using CoreOption<I> here will results in non-assignable issue of entire controller type, always use <any> instead
  interceptorList$ = new rx.BehaviorSubject<Interceptor[]>([]);
  protected dispatcher = {} as {[K in keyof I]: Dispatch<I[K]>};
  protected dispatcherFor = {} as {[K in keyof I]: DispatchFor<I[K]>};
  private connectableAction$: rx.Connectable<Action>;

  constructor(opts: CoreOptions<I> = {}) {
    this.setName(opts.name);
    // 1. this.configChange, this.interceptor$, this.actionUpstream => this.connectableAction$
    const upstream = this.actionUpstream;
    // set logger as interceptor
    const logOperator = (a$: rx.Observable<Action>) => this.opts.enableLog ? a$.pipe(
      this.opts.log ?
          rx.tap(action => {
            const type = action.t;
            if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
              if (this.opts.logStyle === 'raw') {
                this.opts.log!(this.logPrefix, action.toJson());
              } else {
                this.opts.log!(this.logPrefix, type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
              }
            }
          }) :
          (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
              rx.tap(action => {
                const type = action.t;
                if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                  // eslint-disable-next-line no-console
                  console.log(`%c ${this.logPrefix}`, 'color: #e0f0e0; background: #8c61ff;',
                    type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                }
              }) :
              rx.tap(action => {
                const type = action.t;
                if ((this.debugIncludeSet == null || this.debugIncludeSet.has(type)) && !this.debugExcludeSet.has(type)) {
                  // eslint-disable-next-line no-console
                  console.log('[' + this.logPrefix + ']', type, actionMetaToStr(action), ...(this.opts.logStyle === 'noParam' ? [] : action.p));
                }
              })
    ) : a$;
    // ForkedRxController will always "append" interceptor to interceptorList$,
    // user defined interceptors are usually "preprend" to interceptorList$,
    // these help to making sure "logOperator" always print messages that dispatched
    // by base and forked stream controller in correct order.
    this.interceptorList$.next([logOperator]);
    this.connectableAction$ = rx.connectable(this.configChange.pipe(
      rx.map((props, i) => {
        let switchActionStream = i === 0; // always create action stream at first time
        if (props.has('name')) {
          this.setName(this.opts.name);
        }
        if (props.has('debugIncludeTypes')) {
          this.debugIncludeSet ??= this.opts.debugIncludeTypes ? new Set(this.opts.debugIncludeTypes) : null;
          if (this.debugIncludeSet && this.opts.debugIncludeTypes) {
            this.opts.debugIncludeTypes.forEach(item => this.debugIncludeSet!.add(item));
          }
        }
        if (props.has('debugExcludeTypes')) {
          if (this.opts.debugExcludeTypes) {
            this.opts.debugExcludeTypes.forEach(item => this.debugExcludeSet.add(item));
          }
        }
        if (props.has('debug') || props.has('log')) {
          switchActionStream = true;
        }
        return switchActionStream;
      }),
      rx.filter(needSwitch => needSwitch),
      rx.switchMap(() => {
        return this.interceptorList$.pipe(
          rx.switchMap(interceptors => {
            return rx.merge(
              this._noFilterUpstream,
              interceptors.length > 0 ? upstream.pipe(
                ...(interceptors as [Interceptor]),
              ) : upstream
            );
          })
        );
      }),
    ));

    const actionSubDispatcher = new rx.ReplaySubject<void>();
    const actionUnsubDispatcher = new rx.ReplaySubject<void>();
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
    if (opts.autoConnect == null || opts.autoConnect) {
      this.connectableAction$.connect();
    }
    this.config({
      name: '',
      debug: false,
      debugIncludeTypes: null,
      debugExcludeTypes: [],
      logStyle: 'full',
      ...opts
    });

    this.actionSubscribed$ = actionSubDispatcher.asObservable();
    this.actionUnsubscribed$ = actionUnsubDispatcher.asObservable();
  }

  createAction<J = I, K extends keyof J = keyof J>(type: K, params: InferPayload<J[K]>) {
    const a = new Action<J[K]>(type as string, params);
    a.i = ACTION_SEQ++;
    return a;
  }

  /** change a debug convenient "name" as previous specified in CoreOptions of constructor */
  setName(name: string | null | undefined) {
    this.logPrefix = name ?? ++SEQ + '';
  }

  /** This method is used to change `this.opts` which is initially provided in constructor.
   * Only changed properties are merged to current options */
  config(opts: CoreOptions<I>) {
    const changedProperties = new Set<keyof CoreOptions>();
    for (const [p, v] of Object.entries(opts)) {
      if (v !== this.opts[p as keyof CoreOptions<I>]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.opts[p as unknown as keyof CoreOptions<I>] = v;
        changedProperties.add(p as keyof CoreOptions);
      }
    }
    if (changedProperties.size > 0) {
      this.configChange.next(changedProperties);
    }
  }

  /** Insert action "interceptor" operator function
  * @returns a function to remove inserted interceptors
  **/
  prependInterceptor(...interceptor: Interceptor[]) {
    const list = this.interceptorList$.getValue();
    list.unshift(...interceptor);
    this.interceptorList$.next(list);
    return () => {
      this.removeInterceptor(...interceptor);
    };
  }

  /** If you want all the action messages go through this interceptor including those go to `forking` controller's reactors,
  * you probably should use `prependInterceptor()` instead, read source of `ForkedRxController`
  * @returns a function to remove inserted interceptors
  **/
  appendInterceptor(...interceptor: Interceptor[]) {
    const list = this.interceptorList$.getValue();
    list.push(...interceptor);
    this.interceptorList$.next(list);
    return () => {
      this.removeInterceptor(...interceptor);
    };
  }

  removeInterceptor(...interc: Interceptor[]) {
    const interSet = new Set(interc);
    const list = this.interceptorList$.getValue();
    this.interceptorList$.next(list.filter(
      it => !interSet.has(it)
    ));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  appendInterceptorToSrc(..._interceptors: Interceptor[]) {
    // toBe extended by sub class
  }

  /** Obsolete: This method is not meant to be used directly */
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

  /** A filter operator function which only allow action with specific types */
  ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[T[number]]>> {
    return (up: rx.Observable<Action<any>>) => {
      const matchTypes = types.map(type => type as string);
      return up.pipe(
        rx.filter((a): a is Action<I[T[number]]> => matchTypes.some(matchType => a.t === matchType))
      );
    };
  }

  notOfType<T extends (keyof I)[]>(...types: T) {
    return (up: rx.Observable<Action<any>>) => {
      const matchTypes = types.map(type => type as string);
      return up.pipe(
        rx.filter((a): a is Action<I[Exclude<(keyof I), T[number]>]> => matchTypes.every(matchType => a.t !== matchType))
      );
    };
  }

  isType<K extends keyof I>(action: Action, type: K): action is Action<I[K]> {
    return action.t === (type as string);
  }

  /** see CoreOption['autoConnect']
   */
  connect() {
    this.connectableAction$.connect();
  }
}

/**
 * @deprecated use "action.t" instead
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function nameOfAction<I = ActionFunctions>(
  action: Pick<Action, 't'>
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

