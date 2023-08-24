import * as rx from 'rxjs';
import {RxController, ActionFunctions, PayloadStream} from './control';
import {DuplexController, DuplexOptions} from './duplex';

export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;

export type ReactorCompositeActions = {
  mergeStream(stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string): void;
  // addReactor(epic: Reactor<I>, disableCatchError?: boolean, errorLabel?: string): void;
  // reactor: ReactorCompositeActions<I, O>['addReactor'];

  // addDuplexReactor(epic: DuplexReactor<I, O>, disableDefaultCatchError?: boolean, errorLabel?: string): void;
  // dReactor: ReactorCompositeActions<I, O>['addDuplexReactor'];

  stopAll(): void;
};

export type ReactorCompositeOutput = {
  onError(label: string, originError: any): void;
};

export class ReactorComposite<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>> {
  latestPayloads: {[K in 'mergeStream']: PayloadStream<ReactorCompositeActions, K>};
  l: ReactorComposite<I, O>['latestPayloads'];
  protected control: DuplexController<ReactorCompositeActions, ReactorCompositeOutput>;

  constructor(private opts?: DuplexOptions) {
    this.control = new DuplexController(opts);
    this.l = this.latestPayloads = this.control.i.createLatestPayloadsFor('mergeStream');
  }

  startAll() {
    return rx.merge(
      this.l.mergeStream.pipe(
        rx.mergeMap(([_id, downStream, noError, label]) => {
          if (noError == null || !noError) {
            downStream = this.handleError(downStream, label);
          }
          return downStream;
        })
      )
    ).pipe(
      rx.takeUntil(this.control.i.pt.stopAll),
      rx.catchError((err, src) => {
        if (this.opts?.log)
          this.opts.log(err);
        else
          console.error(err);
        return src;
      })
    ).subscribe();
  }

  getControl() {
    return this.control as DuplexController<ReactorCompositeActions & I, ReactorCompositeOutput & O>;
  }

  protected handleError(upStream: rx.Observable<any>, label?: string) {
    return upStream.pipe(
      rx.catchError((err, src) => {
        this.control.o.dispatcher.onError(err, label);
        return src;
      })
    );
  }
}
