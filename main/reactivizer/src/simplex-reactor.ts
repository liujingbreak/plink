import * as rx from 'rxjs';
import {Action, ActionMeta, ActionFunctions} from './stream-core';
import {RxController2} from './control2';
import {SingleActionFactory} from './action-factory';
import {SimplexReactorOptions} from './reactor-base';
import {ActionTable} from './action-table';
import {RxControlConfigType} from './global-config';
import {actionRelatedToAction} from './context-operators';
import {InferFuncReturnEvents, ActionFactoryOfPlainType, ExtractTupleElement} from './inferred-types';

export interface BaseActions<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] = readonly []
> {
  /** Internal use, when option `debug` is `true`, this message will be dispatched when
   * ReactorComposite2 is instantiated */
  __onNew(): SingleActionFactory;
  __onError(err: any): SingleActionFactory;
  __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
  __onDisposed(): SingleActionFactory;
}

const baseTableFor = ['__onError', '__onDisposed'] as const;

type LE<LI extends readonly any[]> = readonly (LI[number] | ExtractTupleElement<typeof baseTableFor>)[];
let SEQ = new Date().getUTCMilliseconds();

export class SimplexReactor<
  I = Record<never, never>,
  LI extends readonly (keyof I)[] | (keyof I)[] = []
> {
  protected errorSubject: rx.Subject<[lable: string, originError: any] | [lable: string, originError: any, relevantActions: ActionMeta[] ]> =
    new rx.ReplaySubject(20);
  /** All catched error goes here, including those from "dispatchErrorFor" */
  error$: rx.Observable<any>;
  destory$: rx.Observable<unknown>;
  dispose: () => void;
  /** default stream controller used also as Reactor's internal message stream */
  s: RxController2<I>;
  r = (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => {
    if (typeof params[0] === 'string')
      this.reactorSubj.next(params as [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]);
    else
      this.reactorSubj.next(['', ...params as [stream: rx.Observable<any>, disableCatchError?: boolean]]);
  };
  table: ActionTable<I & BaseActions<I>, LE<LI>>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]> = new rx.ReplaySubject();
  private id = SEQ++;

  constructor(public opts?: SimplexReactorOptions<I & BaseActions<LI>, LE<LI>>) {
    this.s = new RxController2<I & BaseActions<I>>({...opts, name: (opts?.name ?? '') + `#${this.id}`}) as RxController2<I>;
    const internalMsg$ = this.s as unknown as RxController2<BaseActions>;
    if (opts?.debug) {
      internalMsg$.ft.__onNew().dp();
    }

    const doOperator = <A>(dispatchingAction: {i: ActionMeta['i']}) => (response$: rx.Observable<A>) => rx.merge(
      response$,
      internalMsg$.pt.__onError.pipe(
        actionRelatedToAction(dispatchingAction),
        rx.map(([, err]) => {
          throw err;
        })
      )
    );
    this.s.doOperator$.next(doOperator);
    // Everthing internally observables should goes here
    rx.merge(
      internalMsg$.pt.__onError.pipe(
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
      rx.takeUntil(internalMsg$.pt.__onDisposed),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        internalMsg$.ft.__onError(err).dp();
        return src;
      })
    ).subscribe();

    this.table = new ActionTable(this.s, [...opts?.tableFor ?? [], ...baseTableFor]);
    const internalTable = this.table as unknown as ActionTable<BaseActions, typeof baseTableFor>;
    this.error$ = internalTable.l.__onError.pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      rx.map(([, err]) => err)
    );
    this.destory$ = internalTable.l.__onDisposed;
    this.dispose = () => {
      internalMsg$.ft.__onDisposed().dp();
    };
    this.r('__config', internalMsg$.pt.__config.pipe(
      rx.map(([, opts]) => this.config(opts))
    ));
  }

  config(opts: RxControlConfigType<I>) {
    this.opts = opts;
    this.s.config(opts);
  }
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

  catchErrorFor<T>(actionMeta: ActionMeta, ...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T> {
    return (upStream: rx.Observable<T>): rx.Observable<T> => upStream.pipe(
      rx.catchError((err) => {
        this.dispatchErrorFor(err, actionMeta, ...actionMetas);
        return rx.EMPTY;
      })
    );
  }
  /** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
 *  invokes "catchErrorFor()" or "dispatchErrorFor()"
 **/
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
  startAll() {}

  /** @deprecated call dispose() instead */
  destory() {
    this.dispose();
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
