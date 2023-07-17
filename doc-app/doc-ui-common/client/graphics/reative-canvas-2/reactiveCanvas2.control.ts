import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamWithEpic, ActionStreamControl, BaseReactComponentAction} from '../../reactive-base';
import type {ReactiveCanvas2InternalActions, ReactiveCanvas2Actions} from './types';

export type CanvasActions = {
  onDomChange(canvas: HTMLCanvasElement | null): void;
  setWorker(worker: Worker): void;
  onResize(): void;
};

export function createDomControl() {
  const ctrl = createActionStreamWithEpic({debug: 'canvas-control'});
  const onPointerMove$ = new rx.Subject<[number, number]>();

  ctrl.dispatcher.addEpic<CanvasActions & ReactiveCanvas2InternalActions & ReactiveCanvas2Actions>(ctrl => {
    const {dispatcher, payloadByType, actionByType, _actionToObject, isActionType} = ctrl;
    let mainWorker: Worker | undefined;

    return rx.merge(
      onPointerMove$.pipe(
        op.throttleTime(100),
        op.withLatestFrom(payloadByType.setWorker),
        op.map(([[x, y], worker]) => {
          worker.postMessage({type: 'onPointMove', x, y});
        })
      ),
      payloadByType.onDomChange.pipe(
        op.filter((canvas): canvas is NonNullable<typeof canvas> => canvas != null),
        op.distinctUntilChanged(),
        op.map(canvas => {
          const offscreen = canvas.transferControlToOffscreen();
          dispatcher._createOffscreen(offscreen);
          return canvas;
        }),
        op.switchMap(canvas => {
          return payloadByType.onResize.pipe(
            op.map(() => {
              const vw = canvas.parentElement!.clientWidth;
              const vh = canvas.parentElement!.clientHeight;
              dispatcher.resizeViewport(vw, vh);
            })
          );
        })
      ),
      rx.combineLatest(
        payloadByType.onDomMount.pipe(
          op.delay(150), // wait for DOM being rendering
          op.map(() => {
            dispatcher.onResize(); // let other paintable react on "resize" action first
          })
        ),
        payloadByType.render.pipe(op.take(1))
      ).pipe(
        op.map(() => {
        // Maybe _afterResize is unnecessary, since dispatching onResize is enough for other subscriber to react on it
        // before dispatching 'renderContent'
          dispatcher._afterResize(); // trigger re-render
        }),
        op.switchMap(() => rx.fromEvent<UIEvent>(window, 'resize')),
        op.throttleTime(333),
        op.map(_event => {
          dispatcher.onResize();
          dispatcher._afterResize();
        })
      ),
      // Pass below actions to worker
      rx.merge(
        actionByType._createOffscreen,
        actionByType.resizeViewport,
        actionByType.changeRatio,
        actionByType.onUnmount,
        actionByType.onDomMount
      ).pipe(
        op.mergeMap(action => {
          return rx.concat(rx.of(mainWorker), payloadByType.setWorker).pipe(
            op.filter((worker): worker is Worker => worker != null),
            op.take(1),
            op.map(worker => [worker, action] as const)
          );
        }),
        op.map(([worker, action]) => {
          const serialized = _actionToObject(action);
          if (isActionType(action, '_createOffscreen')) {
            worker.postMessage(serialized, [action.payload]);
          } else {
            worker.postMessage(serialized);
          }
        })
      )
    );
  });

  return [
    ctrl as ActionStreamControl< BaseReactComponentAction & CanvasActions & ReactiveCanvas2InternalActions & ReactiveCanvas2Actions>,
    function onPointerMove(x: number, y: number) {
      onPointerMove$.next([x, y]);
    }
  ] as const;
}

