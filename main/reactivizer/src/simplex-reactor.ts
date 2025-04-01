/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import * as rx from 'rxjs';
import {Action, ActionMeta, ActionFunctions, InferMapParam, InferPayload, CoreOptions} from './stream-core';
import {RxController2, ControllerBaseActions, ActionInterceptor} from './control2';
import {ActionDispenser} from './action-dispenser';
import {SingleActionFactory} from './action-factory';
import {SimplexReactorOptions, SimplexReactorCfgOpts} from './reactor-base';
import {ActionTable} from './action-table';
import {ForkedRxController} from './forked-control';
import {ForkedPostRxController} from './forked-post-control';
import {actionRelatedToAction} from './context-operators';
import {InferFuncReturnEvents, ActionFactoryOfPlainType} from './inferred-types';
import {onAllSubscribed} from './utils';

export interface BaseActions<
  I = any,
  LI extends readonly (keyof I)[] = readonly []
> {
  // __onInit(): SingleActionFactory;
  __onError(err: any): SingleActionFactory;
  __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
  __onDisposed(): SingleActionFactory;
  /** extends ControllerBaseActions */
  __cancel: ControllerBaseActions['__cancel'];
}
const baseActionTypeSet = new Set<keyof BaseActions>(['__onError', '__onDisposed', '__cancel', '__config']);
const internalTableFor = ['__onError', '__onDisposed'] as const;
type LE<LI extends readonly any[]> = LI[number] | (typeof internalTableFor)[number];
let SEQ = new Date().getUTCMilliseconds();
export type PreActionHook<I, K extends keyof I = keyof I> = (...payload: InferMapParam<I[K]>) => rx.Observable<InferPayload<I[K]>>;

type ObsInterceptorNextFn<I, K extends keyof I> = <
  N extends readonly ObsInterceptor<I, any>[],
>(...params: [changedPayload: InferPayload<I[K]>, ...{[NI in keyof N]: N[NI]}]) =>
{[NI in keyof N]: N[NI]};

export type ObsInterceptor<I, K extends keyof I> = rx.Observable<[
  next: ObsInterceptorNextFn<I, K>,
  ActionMeta,
  ...InferPayload<I[K]>
]>;

export class SimplexReactor<
  I = Record<string, never>,
  LI extends readonly (keyof I)[] = []
> {
  /** All catched error goes here, including those from "dispatchErrorFor" */
  error$: rx.Observable<readonly [error: any, label: string | null]>;
  /** When "dispose" method is invoked, __onDisposed message will be emitted,
  * subscribing this observable is equivalent to subscribing "__onDisposed" message.
  * Be aware, any subscription created through current service's `r()` is "rx.takeUntil(pt.__onDisposed)`,
  * so don't define "reactor" against `destory$` or `pt.__onDisposed` through `r()`,
  * any logic inside it will never be triggered. The subscription to destory$ will
  * take effect if it is through plain observable `subscribe()` or another service's `r()` method.
  **/
  destory$: rx.Observable<unknown>;
  dispose: () => void;
  /** default stream controller used also as Reactor's internal message stream */
  s: RxController2<I & BaseActions>;
  /** shortcut to s.pt */
  pt: RxController2<I & BaseActions>['pt'];
  /** shortcut to s.at */
  at: RxController2<I & BaseActions>['at'];
  /** shortcut to s.ft */
  ft: RxController2<I & BaseActions>['ft'];
  /** Add a "pre-hook" of specific message type, all returned observable of provided hook functions
   * of that specific message type will be `rx.concat()` together,
   * thus the returned an Observable must be completed in the future, otherwise it will block
   * messages being recieved by reactors.
   * Any subscription to that specific message type (aka reactor) will recieved message after all
   * pre-hooks completes.
   *
   * the value function returns a function to remove pre-hook previously added.
   * e.g.
   * ```
   *    const service = someFactory.create();
   *    const {preHooks} = service;
   *    const removeHook = preHooks.actionFoobar('prehook for actionFoobar', (m, params) => {
   *        // do something about params...
   *        // Remove current hook setting of message "actionFoobar"
   *        removeHook();
   *    });
  **/
  preHooks: {[K in keyof I]: (labelOrPreHook: string | PreActionHook<I, K>, preHook?: PreActionHook<I, K>) => () => void};
  interceptors: {[K in keyof I]: ObsInterceptor<I, K>};

  /** shortcut to table.l */
  latest: ActionTable<I & BaseActions<I>, LE<LI>>['l'];
  postBase: RxController2<I & BaseActions>;
  /** alias of postBase */
  p: RxController2<I & BaseActions>;

  /** Define an reactor (RxJS observable subscription) */
  r = (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => {
    if (typeof params[0] === 'string')
      this.reactorSubj.next(params as [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]);
    else
      this.reactorSubj.next(['', ...params as [stream: rx.Observable<any>, disableCatchError?: boolean]]);
  };

  table: ActionTable<I & BaseActions<I>, LE<LI>>;
  id = SEQ++;
  opts?: CoreOptions<any>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]> = new rx.ReplaySubject();
  protected errorSubject: rx.Subject<[label: string, originError: any]> =
    new rx.ReplaySubject(20);

  private preActionHook$ = new rx.Subject<[type: string, hookFn: PreActionHook<I>, label: string]>();
  private removePreActionHook$ = new rx.Subject<[type: string, hookFn: PreActionHook<I>]>();

  constructor(opts?: SimplexReactorOptions<I, LI>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.opts = opts as any;
    this.s = new RxController2<I & BaseActions>({...opts, name: (opts?.name ?? '') + `@${this.id}`} as any);
    this.postBase = this.p = this.s;
    this.table = new ActionTable<I & BaseActions<I>, LE<LI>>(this.s, [...opts?.tableFor ?? [], ...internalTableFor] as any);
    this.pt = this.s.pt;
    this.at = this.s.at;
    this.ft = this.s.ft;
    this.latest = this.table.l;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.preHooks = new Proxy({} as typeof this.preHooks, {
      get(_target, key) {
        return (labelOrDefine: string | PreActionHook<I>, define?: PreActionHook<I>) => {
          let label = '';
          if (typeof labelOrDefine === 'string') {
            label = labelOrDefine;
          } else {
            define = labelOrDefine;
          }
          return self.addPreHook(label, key as keyof I, define!);
        };
      },
      has(_target, key) {
        return typeof key === 'string';
      },
      ownKeys() {
        return [];
      }
    });

    this.interceptors = new Proxy({} as typeof this.interceptors, {
      get(_target, key) {
        return new rx.Observable<[
          next: ObsInterceptorNextFn<I, keyof I>,
          ActionMeta,
          ...InferPayload<I[keyof I]>
        ]>(s => {
          console.log('-- intercept', key);
          const removeInter$ = new rx.ReplaySubject<void>(1);
          const remove = self.prependInterceptor(ad => rx.merge(
            ad.at[key as keyof I].pipe(
              rx.mergeMap(a => {
                const next$ = new rx.Subject<InferPayload<I[keyof I]>>();
                next$.subscribe(p => {
                  console.log('-- subscribed next$ emits', p);
                });
                return rx.merge(
                  next$.pipe(
                    rx.take(1),
                    rx.tap(p => {
                      console.log('-- next$:', p);
                    }),
                    rx.map(p => ({...a, p}))
                  ),
                  new rx.Observable<never>(s0 => {
                    s.next([
                      (payload: InferPayload<I[keyof I]>, ...nextInterceptors: any[]) => {
                        console.log('-- next called', ...payload);
                        if (nextInterceptors.length == 0) {
                          next$.next(payload);
                          return [];
                        }
                        return onAllSubscribed(
                          nextInterceptors,
                          () => {
                            console.log('-- all subscribed');
                            next$.next(payload);
                          }
                        );
                      },
                      {i: a.i}, ...a.p
                    ] as any);
                    s0.complete();
                  }),
                  // remove event must be checked after next$ event, otherwise "remove" might happens earlier
                  removeInter$.pipe(
                    rx.map(() => {
                      console.log('-- remove');
                      remove();
                    }),
                    rx.ignoreElements()
                  )
                ).pipe(
                  rx.catchError(err => {
                    console.log('-- error', err);
                    return rx.EMPTY;
                  }),
                  rx.finalize(() => {
                    debugger;
                    console.log('-- final');
                  })
                );
              })
            ),
            ad.ofOtherTypes()
          ));
          return () => {
            removeInter$.next();
          };
        });
      },
      has(_target, key) {
        return typeof key === 'string';
      },
      ownKeys() {
        return [];
      }
    });
    const internalMsgCtl = this.s as unknown as RxController2<BaseActions>;
    const doOperator = <A>(dispatchingAction: {i: ActionMeta['i']}) => (response$: rx.Observable<A>) => rx.merge(
      response$,
      internalMsgCtl.pt.__onError.pipe(
        actionRelatedToAction(dispatchingAction),
        rx.map(([, err]) => {
          throw err;
        })
      )
    );
    this.s.doOperator$.next(doOperator);

    const hooksByType = new Map<string, [PreActionHook<I>, string | null | undefined][]>();
    this.s.prependInterceptor(a$ => {
      return rx.concat(
        rx.of(null), // the observable content is not important
        rx.merge(
          this.preActionHook$,
          this.removePreActionHook$
        )
      ).pipe(
        rx.switchMap(() => a$.pipe(
          rx.mergeMap(a => {
            const hooks = hooksByType.get(a.t);
            if (hooks) {
              let payload = a.p as InferPayload<I[keyof I]>;
              return rx.concat(
                rx.from(hooks).pipe(
                  rx.concatMap(([hook, label]) => hook(a, ...payload).pipe(
                    rx.map(retPayload => {
                      payload = retPayload;
                    }),
                    this.handleErrorOp(label ?? 'Unlabled prehook', 'stop')
                  )),
                  rx.ignoreElements()
                ),
                rx.defer(() => rx.of({...a, p: payload}))
              );
            } else {
              return rx.of(a);
            }
          })
        ))
      );
    });
    // Everthing internally observables should goes here
    rx.merge(
      internalMsgCtl.pt.__onError.pipe(
        rx.map(([, err]) => {
          if (this.opts?.log)
            this.opts.log(err);
          else
            console.error(err);
        })
      ),
      this.reactorSubj.pipe(
        rx.mergeMap(([label, downStream, noError]) => {
          if (noError == null || !noError) {
            return downStream.pipe(
              this.handleErrorOp(label)
            );
          }
          return downStream;
        })
      ),
      this.preActionHook$.pipe(
        rx.map(([type, hook, label]) => {
          let hooks = hooksByType.get(type);
          if (hooks == null) {
            hooks = [] as [PreActionHook<I>, string][];
            hooksByType.set(type, hooks);
          }
          hooks.push([hook, label]);
        })
      ),
      this.removePreActionHook$.pipe(
        rx.map(([type, hook]) => {
          let hooks = hooksByType.get(type);
          if (hooks) {
            hooks = hooks.filter(([h]) => h !== hook);
            if (hooks.length === 0) {
              hooksByType.delete(type);
            }
          }
        })
      )
    ).pipe(
      rx.takeUntil(internalMsgCtl.pt.__onDisposed),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        return src;
      })
    ).subscribe();

    const internalTable = this.table as unknown as ActionTable<BaseActions, (typeof internalTableFor)[number]>;
    this.error$ = rx.merge(
      this.errorSubject.pipe(
        rx.map(([label, err]) => [err, label] as const)
      ),
      internalTable.l.__onError.pipe(
        rx.map(([, err]) => [err, null] as const)
      )
    ).pipe(
      rx.share()
    );
    this.destory$ = internalMsgCtl.pt.__onDisposed;
    this.dispose = () => {
      internalMsgCtl.ft.__onDisposed().dp();
    };
    this.r('__config', internalMsgCtl.pt.__config.pipe(
      rx.map(([, opts]) => this.config(opts as any))
    ));
  }

  protected createRxControllers<I0, LI0 extends readonly (keyof I0)[]>(opts?: SimplexReactorOptions<I0, LI0>): RxController2<I0> {
    return new RxController2<I0>({...opts, name: (opts?.name ?? '') + `@${this.id}`} as any);
  }

  getLogName() {
    return this.s.logPrefix;
  }

  /**
   * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
   * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
   * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
   */
  config<
    I2 = Record<string, never>,
    L2 extends readonly (keyof I2 | keyof I)[] = []
  >(opts: SimplexReactorCfgOpts<I, I2, L2>) {
    const updatedThis = this as unknown as SimplexReactor<I & I2, readonly (LI[number] | L2[number])[]>;
    if (this.opts) {
      Object.assign(this.opts, opts);
    } else {
      updatedThis.opts = opts as unknown as typeof this.opts;
    }
    if (opts.tableFor) {
      updatedThis.table.addActions(...opts.tableFor);
    }
    updatedThis.s.config(Object.entries(opts).reduce<CoreOptions<I>>((obj, [p, v]) => {
      if (p !== 'tableFor') {
        if (p === 'name')
          obj.name = opts.name + '@' + this.id;
        else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          obj[p as keyof CoreOptions<I>] = v;
        }
      }
      return obj;
    }, {}));
    return updatedThis;
  }

  /** @deprecated use toExtend instead
   * Turn current reactors to extend mode,
   * fork a stream RxController2 to ForkedRxController, so that we can create new reactors by subscribing to
   * new forked stream controller, and be able to manipulate previously created reactors by "appendInterceptorToSrc()"
   **/
  forExtend() {
    const baseS = this.s;
    const s = this.s = new ForkedRxController(baseS);
    const baseTable = this.table;
    this.table = new ActionTable(s, [...this.table.actionNames] as LE<LI>[]);
    for (const [type, [m, ...p]] of baseTable.actionSnapshot) {
      const latestAct = s.createAction(type as keyof I, p as any);
      latestAct.i = m.i;
      latestAct.r = m.r;
      s.forkedUpStream.next(latestAct);
    }
    this.pt = s.pt;
    this.ft = s.ft;
    this.at = s.at;
    this.latest = this.table.l;
    let cachePostBase: ForkedPostRxController<I & BaseActions> | undefined;

    function ensurePostBase() {
      if (cachePostBase)
        return cachePostBase;
      cachePostBase = new ForkedPostRxController(baseS);
      return cachePostBase;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if ((this as unknown as DerivedSimplexReactor<I, LI>).postBase == null) {
      Object.defineProperty(this, 'postBase', {
        get: ensurePostBase,
        configurable: true
      });
      Object.defineProperty(this, 'p', {
        get: ensurePostBase,
        configurable: true
      });
    }
    return this as unknown as DerivedSimplexReactor<I, LI>;
  }

  toExtend<
    I2 = Record<string, never>,
    LI2 extends readonly (keyof I2 | keyof I)[] = []
  >() {
    const baseS = this.s;
    this.s = new ForkedRxController<I & BaseActions>(baseS);
    this.postBase = this.p = new ForkedPostRxController<I & BaseActions>(baseS);
    this.table = new ActionTable<I & BaseActions<I>, LE<LI>>(this.s, this.table);
    this.pt = this.s.pt;
    this.at = this.s.at;
    this.ft = this.s.ft;
    this.latest = this.table.l;
    const internalMsgCtl = this.s as unknown as RxController2<BaseActions>;
    const doOperator = <A>(dispatchingAction: {i: ActionMeta['i']}) => (response$: rx.Observable<A>) => rx.merge(
      response$,
      internalMsgCtl.pt.__onError.pipe(
        actionRelatedToAction(dispatchingAction),
        rx.map(([, err]) => {
          throw err;
        })
      )
    );
    this.s.doOperator$.next(doOperator);
    return this as unknown as SimplexReactor<I & I2, readonly (LI2[number] | LI[number])[]>;
  }

  private addPreHook<K extends keyof I>(label: string, type: K, hook: PreActionHook<I, K>) {
    if (baseActionTypeSet.has(type as keyof BaseActions))
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    this.preActionHook$.next([type as string, hook, label]);
    return () => {
      this.removePreActionHook$.next([type as string, hook]);
    };
  }

  /**
   * prepend action stream interceptor by action type, the interceptors will intercept messages
   * before they reach all inherited and current SimplexReactor
   */
  prependInterceptor(inter: ActionInterceptor<I>) {
    return this.s.prependInterceptor(a$ => {
      const ac = ActionDispenser.ofAction$<RxController2<I>>(a$);
      return inter(ac);
    });
  }

  /**
   * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
   * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
   * errors, you should add your own "catchError" after.
   *
   * `addReaction(label, ...)` uses this op internally.
   */
  labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError(err => {
        this.logError(label, err);
        return rx.throwError(() => err instanceof Error ? err : new Error(err));
      })
    );
  }

  catchErrorFor<T>(actionMeta: ActionMeta, ...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError(err => {
        this.dispatchErrorFor(err, actionMeta, ...actionMetas);
        return rx.EMPTY;
      })
    );
  }

  /** Rx operator function, filter action or payload stream by:
  * action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
  * invokes "catchErrorFor()" or "dispatchErrorFor()"
  */
  actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i: ActionMeta['i']}): (up: rx.Observable<T>) => rx.Observable<T> {
    const s = this.s;
    return function(up: rx.Observable<T>) {
      return s.doOperator$.pipe(
        rx.switchMap(operator => up.pipe(
          operator(actionOrMeta),
          actionRelatedToAction(actionOrMeta)
        ))
      );
    };
  }

  /** Respond an error to actions specified by "actionMeta",
   * be aware that this message is not an Observable's "error" message,
   * it will not terminate observable stream.
   * This method emits an event "__onError" under the hood.
   */
  dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]) {
    (this.s as unknown as RxController2<BaseActions>).ft.__onError(err).dp(actionMeta, ...moreActionMetas);
  }

  reactivize<F extends ActionFunctions>(fObject: F) {
    const funcs = Object.entries(fObject);
    for (const [key, func] of funcs) {
      if (typeof func === 'function') {
        this.reactivizeFunction(key, func, fObject);
      }
    }
    return this as SimplexReactor<I & ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, LI>;
  }

  log(...msg: any[]) {
    if (this.opts?.debug) {
      if (this.opts.log)
        this.opts.log((this.s.logPrefix), ...msg);
      else {
      // eslint-disable-next-line no-console
        console.log((this.s.logPrefix), ...msg);
      }
    }
  }

  reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any) {
    const resolveFuncKey = key + 'Resolved';
    const finishFuncKey = key + 'Completed';
    const dispatchResolved = (this as unknown as SimplexReactor<Record<string, unknown>>).s.dispatchForFactory(resolveFuncKey as any);
    const dispatchCompleted = (this as unknown as SimplexReactor<Record<string, unknown>>).s.dispatchForFactory(finishFuncKey as any);

    this.r(this.s.pt[key as keyof I].pipe(
      rx.mergeMap(([meta, ...params]) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const res = func.apply(funcThisRef, params);
          if (rx.isObservable(res)) {
            return res.pipe(
              rx.map(resValue => dispatchResolved(meta, resValue)),
              this.catchErrorFor(meta),
              rx.finalize(() => dispatchCompleted(meta))
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          } else if (res?.then != null && res?.catch != null) {
            return rx.defer(() => (res as PromiseLike<unknown>)).pipe(
              rx.map(res => dispatchResolved(meta, res)),
              this.catchErrorFor(meta),
              rx.finalize(() => dispatchCompleted(meta))
            );
          } else {
            dispatchResolved(meta, res);
            dispatchCompleted(meta);
            return rx.EMPTY;
          }
        } catch (err) {
          this.dispatchErrorFor(err as Error, meta);
          return rx.EMPTY;
        }
      })
    ));

    return resolveFuncKey;
  }

  toString() {
    return this.getLogName();
  }

  /** @deprecated no longer needed, always start automatically after being contructed */
  startAll() {
    return this;
  }

  /** @deprecated call dispose() instead */
  destory() {
    this.dispose();
  }

  protected logError(label: string, err: {message?: string}) {
    const message = 'Error@' + (this.s.logPrefix + '::') + label;
    this.errorSubject.next([message, err.message ?? err]);
    if (this.opts?.log)
      this.opts.log(message, err);
    else
      console.error(message, err);
  }

  protected handleErrorOp(label = '', hehavior: 'continue' | 'stop' | 'throw' = 'continue') {
    return (upStream: rx.Observable<any>) => upStream.pipe(
      rx.catchError((err, src) => {
        this.logError(label, err);
        if (hehavior === 'throw')
          return rx.throwError(() => err instanceof Error ? err : new Error(err));
        return hehavior === 'continue' ? src : rx.EMPTY;
      })
    );
  }
}

/** @deprecated
 * should never create instance by constructor of this class,
 **/
export interface DerivedSimplexReactor<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] = []
> extends SimplexReactor<I, LI> {
  s: ForkedRxController<I & BaseActions>;
  postBase: ForkedPostRxController<I & BaseActions>;
  /** alias of postBase */
  p: ForkedPostRxController<I & BaseActions>;
}
