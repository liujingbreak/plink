import * as rx from 'rxjs';
import {Action, ActionMeta, InferPayload} from './stream-core';
import {RxController2} from './control2';
import {ForkedRxController} from './forked-control';
import {actionRelatedToAction} from './context-operators';
import {onAllSubscribed} from './utils';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const EMPTY_FN = () => {};

export class SingleActionInterceptor<I, K extends keyof I = keyof I> {
  private forkStream: ForkedRxController<I> | undefined;
  private emitAction: (...p: any[]) => void;
  private payload: undefined | InferPayload<I[K]>;
  constructor(private s: RxController2<I>, private meta: ActionMeta) {
    if ((s as {interceptSrcAction?: any}).interceptSrcAction) {
      this.forkStream = s as ForkedRxController<I>;
      this.emitAction = this.forkStream.interceptSrcAction(meta);
    } else {
      this.emitAction = EMPTY_FN;
    }
  }

  changePayload(...overridePayload: InferPayload<I[K]>) {
    this.payload = overridePayload;
    return this;
  }

  dp() {
    this.emitAction(...this.payload ?? []);
  }

  /** observe messages related to interecpted action and
  * dipatch intercepted action back to base stream
  **/
  od<Actions extends ([ActionMeta, ...any[]] | Action<any>)[]>(
    ...moreMessages: {[Idx in keyof Actions]: rx.Observable<Actions[Idx]>}
  ): {[Idx in keyof Actions]: rx.Observable<Actions[Idx]>} {
    return onAllSubscribed(
      moreMessages.map(r => this.s.doOperator$.pipe(
        rx.switchMap(operator => r.pipe(
          operator(this.meta),
          actionRelatedToAction(this.meta)
        ))
      )) as typeof moreMessages,
      () => {
        this.emitAction(...this.payload ?? []);
      }
    );
  }
}

