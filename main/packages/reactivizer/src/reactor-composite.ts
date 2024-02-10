import * as rx from 'rxjs';
import {Action, ActionFunctions, ActionMeta, actionRelatedToAction} from './control';
import {SingleActionFactory, RxController2} from './control2';
import {DuplexController} from './duplex2';
import {ActionTable} from './action-table';
import {ReactorCompositeOpt} from './reactor-base';
import {InferFuncReturnEvents, ActionFactoryOfPlainType} from './inferred-types';
// inspector.open(9222, 'localhost', true);

interface BaseEvents {
  _onErrorFor(err: any): SingleActionFactory;
}

type LOE<LI extends readonly any[]> = readonly (LI[number] | '_onErrorFor')[];

export class ReactorComposite2<
  I = Record<never, never>,
  O = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly [],
  LO extends readonly (keyof O)[] = readonly []
> extends DuplexController<I, O & BaseEvents> {

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
    this.oTable = new ActionTable<O & BaseEvents, LOE<LO>>(this.o, ['_onErrorFor'] as unknown as LOE<LO>);
    return this.oTable;
  }

  private iTable: ActionTable<I, LI> | undefined;
  private oTable: ActionTable<O & BaseEvents, LOE<LO>> | undefined;
  // protected static logSubj: rx.Subject<[level: string, ...msg: any[]]>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;

  constructor(private opts?: ReactorCompositeOpt<I, O, LI, LO>) {
    super(opts);
    this.reactorSubj = new rx.ReplaySubject();
    const doOperator = <A, F>(dispatchingAction: Action<A>) => (wait$: rx.Observable<Action<F>>) => rx.merge(
      wait$,
      this.o.pt._onErrorFor.pipe(
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
      this.oTable = new ActionTable(this.o, [...opts.outputTableFor, '_onErrorFor']);
    }
    this.o.pt._onErrorFor.pipe(
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
      this.o.actionUpstream.next(this.o.createAction('Reactors finalized' as any));
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
        (this.o as unknown as RxController2<BaseEvents>).ft._onErrorFor(err).dp(...actionMetas);
        // this.errorSubject.next(['', err instanceof Error ? err : new Error(err), actionMetas]);
        return rx.EMPTY;
      })
    );
  }

  dispatchErrorFor(err: any, ...actionMetas: ActionMeta[]) {
    (this.o as unknown as RxController2<BaseEvents>).ft._onErrorFor(err).dp(...actionMetas);
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

