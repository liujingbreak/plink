import * as rx from 'rxjs';
import {ActionFunctions, ActionMeta, Action} from './control';
import {actionRelatedToAction} from './context-operators';
import {SingleActionFactory, RxController2} from './control2';
import {DuplexController} from './duplex2';
import {ActionTable} from './action-table';
import {ReactorCompositeOpt} from './reactor-base';
import {InferFuncReturnEvents, ActionFactoryOfPlainType, ReactorCompositeExtendType, ExtractTupleElement} from './inferred-types';
// inspector.open(9222, 'localhost', true);

interface BaseEvents {
  /** Internal use, when option `debug` is `true`, this message will be dispatched when
   * ReactorComposite2 is instantiated */
  __onNew(): SingleActionFactory;
  __onError(err: any): SingleActionFactory;
  __onDisposed(): SingleActionFactory;
}

interface BaseActions<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> {
  __config(opts: ReactorCompositeOpt<I, O, LI, LO>): SingleActionFactory;
}

const baseTableFor = ['__onError', '__onDisposed'] as const;
type LOE<LI extends readonly any[]> = readonly (LI[number] | ExtractTupleElement<typeof baseTableFor>)[];

export class ReactorComposite2<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = [],
  LO extends readonly (keyof O)[] | (keyof O)[] = []
> extends DuplexController<I & BaseActions<I, O, LI, LO>, O & BaseEvents> {

  destory$: rx.Observable<unknown>;
  protected errorSubject: rx.Subject<
  [lable: string, originError: any] |
  [lable: string, originError: any, relevantActions: ActionMeta[]
  ]> = new rx.ReplaySubject(20);
  dispose: () => void;
  error$: rx.Observable<any>;

  get inputTable(): ActionTable<I, LI> {
    return this.it;
  }

  /** alias of inputTable */
  get it(): ActionTable<I, LI> {
    if (this.iTable)
      return this.iTable;
    this.iTable = new ActionTable<I, LI>(this.i, [] as unknown as LI);
    return this.iTable;
  }

  /** alias of outputTable */
  get ot(): ActionTable<O & BaseEvents, LOE<LO>> {
    return this.oTable;
  }
  get outputTable() {
    return this.ot;
  }
  private iTable: ActionTable<I, LI> | undefined;
  private oTable: ActionTable<O & BaseEvents, LOE<LO>>;
  // protected static logSubj: rx.Subject<[level: string, ...msg: any[]]>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;

  constructor(private opts?: ReactorCompositeOpt<I, O, LI, LO>) {
    super(opts);
    const input$ = this.i as unknown as RxController2<BaseActions>;
    const output$ = this.o as unknown as RxController2<BaseEvents>;
    if (opts?.debug) {
      output$.ft.__onNew().dp();
    }
    this.reactorSubj = new rx.ReplaySubject();
    const doOperator = <A>(dispatchingAction: {i: ActionMeta['i']}) => (response$: rx.Observable<A>) => rx.merge(
      response$,
      this.o.pt.__onError.pipe(
        actionRelatedToAction(dispatchingAction),
        rx.map(([, err]) => {
          throw err;
        })
      )
    );
    input$.doOperator$.next(doOperator);
    output$.doOperator$.next(doOperator);

    if (opts?.inputTableFor && opts?.inputTableFor.length > 0) {
      this.iTable = new ActionTable(input$, opts.inputTableFor);
    }
    this.oTable = new ActionTable(this.o, [...(opts?.outputTableFor ?? []), ...baseTableFor] as LOE<LO>);
    rx.merge(
      output$.pt.__onError.pipe(
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
      rx.takeUntil(output$.pt.__onDisposed),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        output$.ft.__onError(err).dp();
        return src;
      })
    ).subscribe();
    // this.logSubj = new rx.ReplaySubject(50);
    this.dispose = () => {
      output$.ft.__onDisposed().dp();
    };
    this.error$ = output$.pt.__onError.pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      rx.map(([, err]) => err),
      rx.share()
    );
    this.destory$ = this.outputTable.l.__onDisposed;

    this.r('__config', input$.pt.__config.pipe(
      rx.map(([, opts]) => this.config(opts as any))
    ));
  }

  /** @deprecated no longer needed, always start automatically after being contructed */
  startAll() {}

  /** @deprecated call dispose() instead */
  destory() {
    this.dispose();
  }

  /**
   * For properties "inputTableFor", "outputTableFor", the elements inside them are considered as being added new action
   * keys to existing action table's structure
   */
  config(opts: Omit<ReactorCompositeOpt<I, O, LI, LO>, 'name' | 'autoConnect'>) {
    if (opts.inputTableFor) {
      this.inputTable.addActions(...opts.inputTableFor);
    }
    if (opts.outputTableFor) {
      this.outputTable.addActions(...opts.outputTableFor);
    }
    super.config(Object.entries(opts).reduce((obj, [p, v]) => {
      if (p !== 'inputTableFor' && p !== 'outputTableFor') {
        obj[p as keyof typeof opts] = v as any;
      }
      return obj;
    }, {} as typeof opts));
  }
  // eslint-disable-next-line space-before-function-paren
  reactivize<F extends ActionFunctions>(fObject: F) {
    const funcs = Object.entries(fObject);

    for (const [key, func] of funcs) {
      if (typeof func === 'function') {
        this.reactivizeFunction(key, func, fObject);
      }
    }
    return this as unknown as ReactorComposite2<I & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F> & O, LI, LO>;
  }

  reativizeRecursiveFuncs<F extends ActionFunctions>(fObject: F) {
    this.reactivize(fObject);
    return this as unknown as ReactorComposite2<InferFuncReturnEvents<F> & I & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F> & O, LI, LO>;
  }

  /**
   * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
   * which will be or has already been observed by `startAll()`.
   * This is where we can add `side effect`s
  * */
  addReaction(...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]) {
    this.r(...params);
  }

  /** Abbrevation of addReaction */
  r = (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => {
    if (typeof params[0] === 'string')
      this.reactorSubj.next(params as [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]);
    else
      this.reactorSubj.next(['', ...params as [stream: rx.Observable<any>, disableCatchError?: boolean]]);
  };

  /**
   * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
   * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
   * errors, you should add your own "catchError" after.
   *
   * `addReaction(lable, ...)` uses this op internally.
   */
  labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError((err) => {
        this.logError(label, err);
        return rx.throwError(() => err instanceof Error ? err : new Error(err));
      })
    );
  }

  catchErrorFor<T>(...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError((err) => {
        (this.o as unknown as RxController2<BaseEvents>).ft.__onError(err).dp(...actionMetas);
        return rx.EMPTY;
      })
    );
  }

  /** Respond an error to actions specified by "actionMeta",
   * be aware that this message is not an Observable's "error" message,
   * it will not terminate observable stream.
   * This method emits an event "__onError" under the hood.
   */
  dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]) {
    (this.o as unknown as RxController2<BaseEvents>).ft.__onError(err).dp(actionMeta, ...moreActionMetas);
  }

  /** Rx operator function, filter action or payload stream by:
   *  action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
   *  invokes "catchErrorFor()" or "dispatchErrorFor()"
   **/
  actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i: ActionMeta['i']}): (up: rx.Observable<T>) => rx.Observable<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const s = this.o;
    return function(up: rx.Observable<T>) {
      return s.doOperator$.pipe(
        rx.switchMap(operator => up.pipe(
          operator(actionOrMeta),
          actionRelatedToAction(actionOrMeta)
        ))
      );
    };
  }
  reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any) {
    const resolveFuncKey = key + 'Resolved';
    const finishFuncKey = key + 'Completed';
    const dispatchResolved = (this as unknown as ReactorComposite2<Record<string, never>, Record<string, any>>).o.dispatchForFactory(resolveFuncKey as any);
    const dispatchCompleted = (this as unknown as ReactorComposite2<Record<string, never>, Record<string, () => void>>).o.dispatchForFactory(finishFuncKey as any);

    this.r(this.i.pt[key as keyof I].pipe(
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

  protected logError(label: string, err: any) {
    const message = '@' + (this.opts?.name ? this.opts.name + '::' : '') + label;
    this.errorSubject.next([err, message]);
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

class ExtendHelper<
  I = Record<never, never>,
  O = Record<never, never>,
  // eslint-disable-next-line space-before-function-paren
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> {
  private defineFn: ((composite: ReactorComposite2<I, O, LI, LO>) => any) | undefined;
  private optsOverride: ReactorCompositeOpt<I, O, LI, LO> | undefined;

  define(fn: (composite: ReactorComposite2<I, O, LI, LO>) => any) {
    this.defineFn = fn;
    return this;
  }

  options(override: Pick<ReactorCompositeOpt<I, O, LI, LO>, 'inputTableFor' | 'outputTableFor' | 'debugIncludeTypes' | 'debugExcludeTypes'>) {
    this.optsOverride = override;
    return this;
  }

  to<G extends ReactorComposite2<any, any, any, any>>(base: G) {
    if (this.optsOverride) {
      const opts = {...this.optsOverride};
      if (this.optsOverride.debugIncludeTypes) {
        opts.debugIncludeTypes = this.optsOverride.debugIncludeTypes.concat(base.i.opts?.debugIncludeTypes as any[] ?? []);
      }
      if (this.optsOverride.debugExcludeTypes) {
        opts.debugExcludeTypes = this.optsOverride.debugExcludeTypes.concat(base.i.opts?.debugExcludeTypes as any[] ?? []);
      }
      base.config(opts);
    }
    if (this.defineFn)
      this.defineFn(base);
    return base as ReactorCompositeExtendType<G, I, O, LI, LO>;
  }
}

/**
 * A function just helps to monkey-patch an existing ReactorComposite2 instance, consider this as similiar functionality of inheritance being used in OO programming
 */
export function patch<
  I = Record<never, never>,
  O = Record<never, never>,
  // eslint-disable-next-line space-before-function-paren
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
>(patchDefinition?: (composite: ReactorComposite2<I, O, LI, LO>) => void): ExtendHelper<I, O, LI, LO>;

export function patch<
  I = Record<never, never>,
  O = Record<never, never>,
  // eslint-disable-next-line space-before-function-paren
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
>(
  options: Pick<ReactorCompositeOpt<I, O, LI, LO>, 'inputTableFor' | 'outputTableFor' | 'debugIncludeTypes' | 'debugExcludeTypes'>,
  patchDefinition?: (composite: ReactorComposite2<I, O, LI, LO>) => void
) : ExtendHelper<I, O, LI, LO>;

export function patch<
  I = Record<never, never>,
  O = Record<never, never>,
  // eslint-disable-next-line space-before-function-paren
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
>(
  optionsOrDef?: Pick<ReactorCompositeOpt<I, O, LI, LO>, 'inputTableFor' | 'outputTableFor' | 'debugIncludeTypes' | 'debugExcludeTypes'> |
  ((composite: ReactorComposite2<I, O, LI, LO>) => void),

  definition?: (composite: ReactorComposite2<I, O, LI, LO>) => void
) {

  const helper = new ExtendHelper<I, O, LI, LO>();
  if (definition) {
    helper.options(optionsOrDef as Pick<ReactorCompositeOpt<I, O, LI, LO>, 'inputTableFor' | 'outputTableFor' | 'debugIncludeTypes' | 'debugExcludeTypes'>);
    helper.define(definition);
  } else if (optionsOrDef) {
    helper.define(optionsOrDef as (composite: ReactorComposite2<I, O, LI, LO>) => void);
  }
  return helper;
}
