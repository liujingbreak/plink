import * as rx from 'rxjs';
import {Action, ActionMeta, ActionFunctions} from './stream-core';
import {RxController2, ControllerBaseActions} from './control2';
import {SingleActionFactory} from './action-factory';
import {SimplexReactorOptions, SimplexReactorCfgOpts} from './reactor-base';
import {ActionTable} from './action-table';
import {RxControlConfigType} from './global-config';
import {ForkedRxController} from './forked-control';
import {ForkedPostRxController} from './forked-post-control';
import {actionRelatedToAction} from './context-operators';
import {InferFuncReturnEvents, ActionFactoryOfPlainType, ExtractTupleElement} from './inferred-types';

export interface BaseActions<
  I = any,
  LI extends readonly (keyof I)[] = readonly []
> {
  /** This event is when we can dispatch actions for initializing "action table" */
  // __onInit(): SingleActionFactory;
  __onError(err: any): SingleActionFactory;
  __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
  __onDisposed(): SingleActionFactory;
  /** extends ControllerBaseActions */
  __cancel: ControllerBaseActions['__cancel'];
}
const baseTableFor = ['__onError', '__onDisposed'] as const;
type LE<LI extends readonly any[]> = LI[number] | ExtractTupleElement<typeof baseTableFor>;
let SEQ = new Date().getUTCMilliseconds();

export class SimplexReactor<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly []
> {
  /** All catched error goes here, including those from "dispatchErrorFor" */
  error$: rx.Observable<readonly [error: any, label: string | null]>;
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
  /** shortcut to table.l */
  latest: ActionTable<I & BaseActions<I>, LE<LI>>['l'];
  // ft: RxController2<I & BaseActions>['ft'];

  r = (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => {
    if (typeof params[0] === 'string')
      this.reactorSubj.next(params as [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]);
    else
      this.reactorSubj.next(['', ...params as [stream: rx.Observable<any>, disableCatchError?: boolean]]);
  };
  table: ActionTable<I & BaseActions<I>, LE<LI>>;
  id = SEQ++;
  opts?: SimplexReactorOptions<unknown, readonly never[]>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]> = new rx.ReplaySubject();
  protected errorSubject: rx.Subject<[label: string, originError: any]> =
    new rx.ReplaySubject(20);

  constructor(opts?: SimplexReactorOptions<I, LI>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.opts = opts as any;
    this.s = new RxController2<I & BaseActions<I>>({...opts, name: (opts?.name ?? '') + `@${this.id}`});
    this.pt = this.s.pt;
    this.at = this.s.at;
    this.ft = this.s.ft;
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
            downStream = this.handleError(downStream, label);
          }
          return downStream;
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

    this.table = new ActionTable(this.s, [...opts?.tableFor ?? [], ...baseTableFor] as LE<LI>[]);
    this.latest = this.table.l;
    const internalTable = this.table as unknown as ActionTable<BaseActions, (typeof baseTableFor)[number]>;
    this.error$ = rx.merge(
      this.errorSubject.pipe(
        rx.map(([label, err]) => [err, label] as const)
      ),
      internalTable.l.__onError.pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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

  /**
   * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
   * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
   * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
   */
  config<I2 = Record<string, never>, L2 extends(Array<keyof I2 | keyof I> | ReadonlyArray<keyof I2 | keyof I>) = never>(opts: SimplexReactorCfgOpts<I, I2, L2>) {
    if (this.opts) {
      Object.assign(this.opts, opts);
    } else {
      this.opts = opts as unknown as typeof this.opts;
    }
    if (opts.tableFor) {
      this.table.addActions(...opts.tableFor as (keyof I)[]);
    }
    this.s.config(Object.entries(opts).reduce((obj, [p, v]) => {
      if (p !== 'tableFor') {
        if (p === 'name')
          obj.name = opts.name + '@' + this.id;
        else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          obj[p as keyof RxControlConfigType<I>] = v;
        }
      }
      return obj;
    }, {} as RxControlConfigType<I>));
    return this as unknown as SimplexReactor<I & I2, readonly (LI[number] | L2[number])[]>;
  }

  /** Turn current reactors to extend mode,
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
  /**
   * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
   * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
   * errors, you should add your own "catchError" after.
   *
   * `addReaction(label, ...)` uses this op internally.
   */
  labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError((err) => {
        this.logError(label, err);
        return rx.throwError(() => err instanceof Error ? err : new Error(err));
      })
    );
  }

  catchErrorFor<T>(actionMeta: ActionMeta, ...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError((err) => {
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
      if (this.opts?.log)
        this.opts.log((this.s.logPrefix ?? ''), ...msg);
      else {
      // eslint-disable-next-line no-console
        console.log((this.s.logPrefix ?? ''), ...msg);
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
  /** @deprecated no longer needed, always start automatically after being contructed */
  startAll() {
    return this;
  }

  /** @deprecated call dispose() instead */
  destory() {
    this.dispose();
  }
  protected logError(label: string, err: any) {
    const message = 'Error@' + (this.s.logPrefix + '::') + label;
    this.errorSubject.next([message, err.message ?? err]);
    if (this.opts?.log)
      this.opts.log(message, err);
    else
      console.error(message, err);
  }

  protected handleError(upStream: rx.Observable<any>, label = '', hehavior: 'continue' | 'stop' | 'throw' = 'continue') {
    return upStream.pipe(
      rx.catchError((err, src) => {
        this.logError(label, err);
        if (hehavior === 'throw')
          return rx.throwError(() => err instanceof Error ? err : new Error(err));
        return hehavior === 'continue' ? src : rx.EMPTY;
      })
    );
  }
}

/** You should never create instance by constructor of this class,
 **/
export interface DerivedSimplexReactor<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = readonly []
> extends SimplexReactor<I, LI> {
  s: ForkedRxController<I & BaseActions>;
  postBase: ForkedPostRxController<I & BaseActions>;
  /** alias of postBase */
  p: ForkedPostRxController<I & BaseActions>;
}
