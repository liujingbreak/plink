import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';

export type BaseReactComponentAction = {
  onUnmount(): void;
  /** In case you want to prompt user about error information other than just log them somewhere for mornitoring */
  onError(error: unknown): void;
  /** Extend this controller in a Redux-observable style, `epic` is a concept of Redux-observable */
  addEpic<A extends Record<string, (...a: any[]) => void> = Record<string, never>>(
    factory: (control: ActionStreamControl<BaseReactComponentAction & A>) => rx.Observable<any>
  ): void;
};
// eslint-disable-next-line space-before-function-paren
export function createActionStreamWithEpic(
  opts?: Parameters<typeof createActionStreamByType>[0]
) {
  const ctrl = createActionStreamByType<BaseReactComponentAction>(opts);
  const {dispatcher, payloadByType: pt} = ctrl;

  rx.merge(
    pt.addEpic.pipe(
      op.mergeMap(epic => epic(ctrl))
    )
  ).pipe(
    op.takeUntil(pt.onUnmount),
    op.catchError((err, src) => {
      dispatcher.onError(err);
      // TODO: advanced remote mornitoring (e.g. Snowplow or other tools)
      return src;
    })
  ).subscribe();
  return ctrl;
}

export type {ActionStreamControl};
