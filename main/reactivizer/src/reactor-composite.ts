import * as rx from 'rxjs';
import {Action, ActionFunctions, ActionMeta, actionRelatedToAction} from './control';
import {SingleActionFactory, RxController2} from './control2';
import {DuplexController} from './duplex2';
import {ActionTable} from './action-table';
import {ReactorCompositeOpt} from './reactor-base';
import {InferFuncReturnEvents, ActionFactoryOfPlainType, ReactorCompositeMergeType2} from './inferred-types';
// inspector.open(9222, 'localhost', true);

interface BaseEvents {
  /** Internal use, when option `debug` is `true`, this message will be dispatched when
   * ReactorComposite2 is instantiated */
  __onNew(): SingleActionFactory;
  __onErrorFor(err: any): SingleActionFactory;
}

interface BaseActions<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> {
  __config(opts: ReactorCompositeOpt<I, O, LI, LO>): SingleActionFactory;
}

type LOE<LI extends readonly any[]> = readonly (LI[number] | '__onErrorFor')[];

export class ReactorComposite2<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = [],
  LO extends readonly (keyof O)[] | (keyof O)[] = []
> extends DuplexController<I & BaseActions<I, O, LI, LO>, O & BaseEvents> {

  protected errorSubject: rx.Subject<
  [lable: string, originError: any] |
  [lable: string, originError: any, relevantActions: ActionMeta[]
  ]> = new rx.ReplaySubject(20);
  /** All catched error goes here */
  error$ = this.errorSubject.asObservable();
  destory$: rx.Subject<void> = new rx.ReplaySubject(1);
  dispose: () => void;

  get inputTable(): ActionTable<I, LI> {
    if (this.iTable)
      return this.iTable;
    this.iTable = new ActionTable<I, LI>(this.i, [] as unknown as LI);
    return this.iTable;
  }

  get outputTable(): ActionTable<O & BaseEvents, LOE<LO>> {
    if (this.oTable)
      return this.oTable;
    this.oTable = new ActionTable<O & BaseEvents, LOE<LO>>(this.o, ['__onErrorFor'] as unknown as LOE<LO>);
    return this.oTable;
  }

  private iTable: ActionTable<I, LI> | undefined;
  private oTable: ActionTable<O & BaseEvents, LOE<LO>> | undefined;
  // protected static logSubj: rx.Subject<[level: string, ...msg: any[]]>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;

  constructor(private opts?: ReactorCompositeOpt<I, O, LI, LO>) {
    super(opts);
    if (opts?.debug) {
      this.o.ft.__onNew().dp();
    }
    this.reactorSubj = new rx.ReplaySubject();
    const doOperator = <A, F>(dispatchingAction: Action<A>) => (wait$: rx.Observable<Action<F>>) => rx.merge(
      wait$,
      this.o.pt.__onErrorFor.pipe(
        actionRelatedToAction(dispatchingAction),
        rx.map(([, err]) => {
          throw err;
        })
      )
    );
    this.i.doOperator$.next(doOperator);
    this.o.doOperator$.next(doOperator);

    if (opts?.inputTableFor && opts?.inputTableFor.length > 0) {
      this.iTable = new ActionTable(this.i, opts.inputTableFor);
    }
    if (opts?.outputTableFor && opts?.outputTableFor.length > 0) {
      this.oTable = new ActionTable(this.o, [...opts.outputTableFor, '__onErrorFor']);
    }
    rx.merge(
      this.o.pt.__onErrorFor.pipe(
        rx.catchError((err, src) => {
          if (this.opts?.log)
            this.opts.log(err);
          else
            console.error(err);
          return src;
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
      rx.takeUntil(this.destory$),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        return src;
      })
    );
    // this.logSubj = new rx.ReplaySubject(50);
    this.reactorSubj.pipe(
      rx.mergeMap(([label, downStream, noError]) => {
        if (noError == null || !noError) {
          downStream = this.handleError(downStream, label);
        }
        return downStream;
      }),
      rx.takeUntil(this.destory$),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        return src;
      })
    ).subscribe();

    this.dispose = () => {
      this.o.actionUpstream.next(this.o.createAction('ReactorsDisposed' as any));
      this.destory$.next();
    };

    this.r('__config', this.i.pt.__config.pipe(
      rx.map(([, opts]) => this.config(opts))
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
        (this.o as unknown as RxController2<BaseEvents>).ft.__onErrorFor(err).dp(...actionMetas);
        return rx.EMPTY;
      })
    );
  }

  /** Respond an error to actions specified by "actionMeta",
   * be aware that this message is not an Observable's "error" message,
   * it will not terminate observable stream.
   * This method emits an event "__onErrorFor" under the hood.
   */
  dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]) {
    (this.o as unknown as RxController2<BaseEvents>).ft.__onErrorFor(err).dp(actionMeta, ...moreActionMetas);
  }

  protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any) {
    const resolveFuncKey = key + 'Resolved';
    const finishFuncKey = key + 'Completed';
    const dispatchResolved = (this as unknown as ReactorComposite2<Record<string, never>, Record<string, any>>).o.dispatchForFactory(resolveFuncKey as any);
    const dispatchCompleted = (this as unknown as ReactorComposite2<Record<string, never>, Record<string, () => void>>).o.dispatchForFactory(finishFuncKey as any);

    this.r(this.i.pt[key as keyof I].pipe(
      rx.mergeMap(([meta, ...params]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const res = func.apply(funcThisRef, params);
        if (rx.isObservable(res)) {
          return res.pipe(
            rx.map(res => dispatchResolved(meta, res)),
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
          try {
            dispatchResolved(meta, res);
            dispatchCompleted(meta);
          } catch (e) {
            this.dispatchErrorFor(e as Error, meta);
          }
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
    return base as ReactorCompositeMergeType2<G, I, O, LI, LO>;
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
