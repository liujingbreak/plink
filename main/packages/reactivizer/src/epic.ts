import * as rx from 'rxjs';
import {RxController, ActionFunctions, PayloadStream} from './control';
import {DuplexController, DuplexOptions} from './duplex';

export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;

export type ReactorCompositeActions = {
  mergeStream(stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string): void;
  stopAll(): void;
};

export type ReactorCompositeOutput = {
  onError(label: string, originError: any): void;
};

export type InferFuncReturnEventNames<I extends ActionFunctions> = {
  [K in keyof I as `${K & string}Done`]: (
    p: ReturnType<I[K]> extends PromiseLike<infer P> ?
      P : ReturnType<I[K]> extends rx.Observable<infer OB> ?
        OB : ReturnType<I[K]>
  ) => void
};

export class ReactorComposite<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>
> extends DuplexController<I & ReactorCompositeActions, O> {
  protected latestCompActPayloads: {[K in 'mergeStream']: PayloadStream<ReactorCompositeActions, K>};
  // protected control: DuplexController<ReactorCompositeActions, ReactorCompositeOutput>;

  constructor(private opts?: DuplexOptions) {
    super(opts);
    this.latestCompActPayloads = (this as ReactorComposite<ReactorCompositeActions, ReactorCompositeOutput>).i.createLatestPayloadsFor('mergeStream');
  }

  startAll() {
    const l = this.latestCompActPayloads;
    return rx.merge(
      l.mergeStream.pipe(
        rx.mergeMap(([_id, downStream, noError, label]) => {
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
        const dispatch = (this as ReactorComposite<ReactorCompositeActions, any>).o.core.dispatcherFactory((key + 'Done') as any);
        (this as ReactorComposite<ReactorCompositeActions>).i.dp.mergeStream(this.i.pt[key as keyof I].pipe(
          rx.mergeMap(([, ...params]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = (func as (...a: any[]) => any).apply(fObject, params);
            if (rx.isObservable(res)) {
              return res;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            } else if (res?.then && res?.catch) {
              return rx.from(res as PromiseLike<unknown>);
            } else {
              dispatch(res);
            }
            return rx.EMPTY;
          }),
          rx.map(res => {
            dispatch(res as any);
          })
        ));
      }
    }
    return this as ReactorComposite<I & F, InferFuncReturnEventNames<F> & O>;
  }

  addReaction(...params: [stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string]) {
    this.r(...params);
  }

  /** Abbrevation of addReaction */
  r(...params: [stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string]) {
    (this as ReactorComposite<ReactorCompositeActions, O>).i.dp.mergeStream(...params);
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
