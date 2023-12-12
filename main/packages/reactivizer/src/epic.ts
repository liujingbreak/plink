// import inspector from 'node:inspector';
import * as rx from 'rxjs';
import {RxController, ActionTable, ActionFunctions} from './control';
import {DuplexController, DuplexOptions} from './duplex';
// inspector.open(9222, 'localhost', true);

export type Reactor<I> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I, O> = (ctl: DuplexController<I, O>) => rx.Observable<any>;

export type InferFuncReturnEvents<I> = {
  [K in keyof I as `${K & string}Resolved`]: (
    p: I[K] extends (...args: any) => PromiseLike<infer P> ?
      P : I[K] extends (...args: any) =>  rx.Observable<infer OB> ?
        OB : I[K] extends infer R ? R : unknown) => void
} & {
  [K in keyof I as `${K & string}Completed`]: () => void;
};

export interface ReactorCompositeOpt<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> extends DuplexOptions<I & O> {
  name: string;
  inputTableFor?: LI;
  outputTableFor?: LO;
}

export class ReactorComposite<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> extends DuplexController<I, O> {
  protected errorSubject: rx.Subject<[lable: string, originError: any]> = new rx.ReplaySubject(20);
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

  get outputTable(): ActionTable<O, LO> {
    if (this.oTable)
      return this.oTable;
    this.oTable = new ActionTable<O, LO>(this.o, [] as unknown as LO);
    return this.oTable;
  }

  private iTable: ActionTable<I, LI> | undefined;
  private oTable: ActionTable<O, LO> | undefined;
  // protected static logSubj: rx.Subject<[level: string, ...msg: any[]]>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;

  constructor(private opts?: ReactorCompositeOpt<I, O, LI, LO>) {
    super(opts);
    this.reactorSubj = new rx.ReplaySubject();

    if (opts?.inputTableFor && opts?.inputTableFor.length > 0) {
      this.iTable = new ActionTable(this.i, opts.inputTableFor);
    }
    if (opts?.outputTableFor && opts?.outputTableFor.length > 0) {
      this.oTable = new ActionTable(this.o, opts.outputTableFor);
    }
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
      this.o.core.actionUpstream.next(this.o.core.createAction('Reactors finalized' as keyof O));
      this.destory$.next();
    };
  }

  /** @deprecated no longer needed, always start automatically after being contructed */
  startAll() {}

  /** @deprecated call dispose() instead */
  destory() {
    this.dispose();
  }

  // eslint-disable-next-line space-before-function-paren
  reactivize<F extends ActionFunctions>(fObject: F) {
    const funcs = Object.entries(fObject);

    for (const [key, func] of funcs) {
      if (typeof func === 'function') {
        this.reactivizeFunction(key, func, fObject);
      }
    }
    return this as unknown as ReactorComposite<I & F, InferFuncReturnEvents<F> & O, LI, LO>;
  }

  reativizeRecursiveFuncs<F extends ActionFunctions>(fObject: F) {
    this.reactivize(fObject);
    return this as unknown as ReactorComposite<InferFuncReturnEvents<F> & I & F, InferFuncReturnEvents<F> & O, LI, LO>;
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

  protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any) {
    const resolveFuncKey = key + 'Resolved';
    const finishFuncKey = key + 'Completed';
    const dispatchResolved = (this as unknown as ReactorComposite<Record<string, never>, Record<string, any>>).o.core.dispatchForFactory(resolveFuncKey as any);
    const dispatchCompleted = (this as unknown as ReactorComposite<Record<string, never>, Record<string, () => void>>).o.core.dispatchForFactory(finishFuncKey as any);

    this.r(this.i.pt[key as keyof I].pipe(
      rx.mergeMap(([meta, ...params]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const res = func.apply(funcThisRef, params);
        if (rx.isObservable(res)) {
          return res.pipe(
            rx.map(res => dispatchResolved(meta, res)),
            rx.finalize(() => dispatchCompleted(meta))
          );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (res?.then != null && res?.catch != null) {
          return rx.defer(() => (res as PromiseLike<unknown>)).pipe(
            rx.map(res => dispatchResolved(meta, res)),
            rx.finalize(() => dispatchCompleted(meta))
          );
        } else {
          dispatchResolved(meta, res);
          dispatchCompleted(meta);
          return rx.EMPTY;
        }
      })
    ));

    return resolveFuncKey;
  }

  protected logError(label: string, err: any) {
    const message = '@' + (this.opts?.name ? this.opts.name + '::' : '') + label;
    (this as unknown as ReactorComposite).errorSubject.next([err, message]);
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

type InferInputActionsType<R> = R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>;
type InferOutputEventsType<R> = R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>;
type ExtractTupleElement<T> = T extends readonly (infer R)[] ? R : never;
type InferLatestActionType<R> = R extends ReactorComposite<any, any, infer LI, any> ? ExtractTupleElement<LI> : never;
type InferLatestEventsType<R> = R extends ReactorComposite<any, any, any, infer LO> ? ExtractTupleElement<LO> : never;

/** An utility type inference which helps to define a new ReactorComposite type based on extending an existing ReactorComposite type */
export type ReactorCompositeMergeType<
  R extends ReactorComposite<any, any, any, any>,
  ExActions = Record<never, never>,
  ExEvents = Record<never, never>,
  ELI extends readonly (keyof ExActions | keyof InferInputActionsType<R>)[] = readonly [],
  ELO extends readonly (keyof ExEvents | keyof InferOutputEventsType<R>)[] = readonly []
> = ReactorComposite<
(R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>) & ExActions,
(R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>) & ExEvents,
readonly (InferLatestActionType<R> | ExtractTupleElement<ELI>)[],
readonly (InferLatestEventsType<R> | ExtractTupleElement<ELO>)[]
>;

// export function mergeReactorComposite<
// I, O,
// LI extends ReadonlyArray<keyof I>, LO extends ReadonlyArray<keyof O>,
// I2, O2,
// LI2 extends ReadonlyArray<keyof I2>,
// LO2 extends ReadonlyArray<keyof O2>
// >(origin: ReactorComposite<I, O, LI, LO>) {
// }
