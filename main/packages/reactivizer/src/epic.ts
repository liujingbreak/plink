// import inspector from 'node:inspector';
import * as rx from 'rxjs';
import {RxController, ActionFunctions} from './control';
import {DuplexController, DuplexOptions} from './duplex';
// inspector.open(9222, 'localhost', true);

export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;

export type InferFuncReturnEvents<I extends ActionFunctions> = {
  [K in keyof I as `${K & string}Resolved`]: (
    p: ReturnType<I[K]> extends PromiseLike<infer P> ?
      P : ReturnType<I[K]> extends rx.Observable<infer OB> ?
        OB : ReturnType<I[K]>) => void
} & {
  [K in keyof I as `${K & string}Completed`]: () => void;
};

export class ReactorComposite<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>
> extends DuplexController<I, O> {
  error$: rx.Subject<[lable: string, originError: any]> = new rx.ReplaySubject();
  destory$: rx.Subject<void> = new rx.ReplaySubject(1);
  // protected static logSubj: rx.Subject<[level: string, ...msg: any[]]>;
  protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;

  constructor(private opts?: DuplexOptions<I & O>) {
    super(opts);
    this.reactorSubj = new rx.ReplaySubject();
    // this.logSubj = new rx.ReplaySubject(50);
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
      rx.takeUntil(this.destory$),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        return src;
      })
    ).subscribe();
  }

  destory() {
    this.destory$.next();
  }

  // eslint-disable-next-line space-before-function-paren
  reactivize<F extends {[s: string]: (...a: any[]) => any}>(fObject: F) {
    const funcs = Object.entries(fObject);

    for (const [key, func] of funcs) {
      if (typeof func === 'function') {
        this.reactivizeFunction(key, func, fObject);
      }
    }
    return this as unknown as ReactorComposite<I & F, InferFuncReturnEvents<F> & O>;
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
    const dispatchResolved = (this as unknown as ReactorComposite<Record<string, never>, Record<string, never>>).o.core.dispatchForFactory(resolveFuncKey as any);
    const dispatchCompleted = (this as unknown as ReactorComposite<Record<string, never>, Record<string, never>>).o.core.dispatchForFactory(finishFuncKey as any);

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

  protected handleError(upStream: rx.Observable<any>, label?: string) {
    return upStream.pipe(
      rx.catchError((err, src) => {
        (this as unknown as ReactorComposite<Record<string, never>, Record<string, never>>).error$.next([err, label]);
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(label ?? '', err);
        return src;
      })
    );
  }
}
