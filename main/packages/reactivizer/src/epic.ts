import * as rx from 'rxjs';
import {Action, RxController, ActionFunctions} from './control';
import {DuplexController, DuplexOptions} from './duplex';

export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;

export type ReactorCompositeActions = {
  // mergeStream(stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string): void;
  stopAll(): void;
};

export type ReactorCompositeOutput = {
  onError(label: string, originError: any): void;
};

export type InferFuncReturnEvents<I extends ActionFunctions> = {
  [K in keyof I as `${K & string}Resolved`]: (
    p: ReturnType<I[K]> extends PromiseLike<infer P> ?
      P : ReturnType<I[K]> extends rx.Observable<infer OB> ?
        OB : ReturnType<I[K]>
    , callerActionId: Action<I>['i']) => void
} & {
  [K in keyof I as `${K & string}Completed`]: (callerActionId: Action<I>['i']) => void;
};

export class ReactorComposite<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>
> extends DuplexController<I & ReactorCompositeActions, O & ReactorCompositeOutput> {
  // protected latestCompActPayloads: {[K in 'mergeStream']: PayloadStream<ReactorCompositeActions, K>};
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
  // protected control: DuplexController<ReactorCompositeActions, ReactorCompositeOutput>;

  constructor(private opts?: DuplexOptions) {
    super(opts);
    // this.latestCompActPayloads = (this as ReactorComposite<ReactorCompositeActions, ReactorCompositeOutput>).i.createLatestPayloadsFor('mergeStream');
    this.reactorSubj = new rx.ReplaySubject(999);
  }

  startAll() {
    return rx.merge(
      this.reactorSubj.pipe(
        rx.mergeMap(([label, downStream, noError]) => {
          if (noError == null || !noError) {
            downStream = this.handleError(downStream, label);
          }
          return downStream;
        })
      )
    ).pipe(
      rx.takeUntil(this.i.pt.stopAll),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        return src;
      })
    ).subscribe();
  }

  // eslint-disable-next-line space-before-function-paren
  reactivize<F extends {[s: string]: (...a: any[]) => any}>(fObject: F) {
    const funcs = Object.entries(fObject);

    for (const [key, func] of funcs) {
      if (typeof func === 'function') {
        this.reactivizeFunction(key, func, fObject);
      }
    }
    return this as ReactorComposite<I & F, InferFuncReturnEvents<F> & O>;
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

  protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any) {
    const resolveFuncKey = key + 'Resolved';
    const finishFuncKey = key + 'Completed';
    const dispatchResolved = (this as unknown as ReactorComposite<ReactorCompositeActions, any>).o.core.dispatcherFactory(resolveFuncKey as any);
    const dispatchCompleted = (this as unknown as ReactorComposite<ReactorCompositeActions, any>).o.core.dispatcherFactory(finishFuncKey as any);
    this.r(this.i.pt[key as keyof I].pipe(
      rx.mergeMap(([id, ...params]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const res = func.apply(funcThisRef, params);
        if (rx.isObservable(res)) {
          return res.pipe(
            rx.map(res => dispatchResolved(res, id)),
            rx.finalize(() => dispatchCompleted(id))
          );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (res?.then && res?.catch) {
          return rx.from((res as PromiseLike<unknown>).then(resolved => {
            dispatchResolved(resolved, id);
            dispatchCompleted(id);
          }));
        } else {
          dispatchResolved(res, id);
          dispatchCompleted(id);
        }
        return rx.EMPTY;
      })
    ));
    return resolveFuncKey;
  }

  protected handleError(upStream: rx.Observable<any>, label?: string) {
    return upStream.pipe(
      rx.catchError((err, src) => {
        (this as unknown as ReactorComposite<ReactorCompositeActions, ReactorCompositeOutput>).o.dp.onError(err, label);
        return src;
      })
    );
  }
}
