import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamWithEpic, BaseReactComponentAction} from '../../reactive-base';
import type {ReactiveCanvas2InternalActions, ReactiveCanvas2Actions} from './types';

export type CanvasActions = {
  onDomChange(canvas: HTMLCanvasElement | null): void;
  setWorker(worker: Worker): void;
  workerReady(): void;
};

export function createDomControl() {
  const ctrl = createActionStreamWithEpic< BaseReactComponentAction & CanvasActions & ReactiveCanvas2InternalActions & ReactiveCanvas2Actions>({debug: process.env.NODE_ENV === 'development' ? 'canvas-control' : false});
  const onPointerMove$ = new rx.Subject<[number, number]>();

  ctrl.dispatcher.addEpic<CanvasActions & ReactiveCanvas2InternalActions & ReactiveCanvas2Actions>(ctrl => {
    const {dispatcher, payloadByType, actionByType, _actionToObject, isActionType} = ctrl;

    return rx.merge(
      // When `setWorker` is dispatched, wait for worker message of 'ready',
      // then dispatch `workerReady`
      payloadByType.setWorker.pipe(
        op.switchMap(worker => {
          return new rx.Observable(sub => {
            const h = (event: MessageEvent<string>) => {
              if (event.data === 'ready') {
                dispatcher.workerReady();
                sub.next();
                sub.complete();
              }
            };
            worker.addEventListener('message', h);
            return () => worker.removeEventListener('message', h);
          });
        })
      ),
      onPointerMove$.pipe(
        op.throttleTime(100),
        op.withLatestFrom(payloadByType.setWorker),
        op.map(([[x, y], worker]) => {
          worker.postMessage({type: 'onPointMove', x, y});
        })
      ),
      // 1. transferControlToOffscreen
      // 2. listen to windows' resize event
      payloadByType.onDomChange.pipe(
        op.filter((canvas): canvas is NonNullable<typeof canvas> => canvas != null),
        op.distinctUntilChanged(),
        op.map(canvas => {
          const offscreen = canvas.transferControlToOffscreen();
          dispatcher._createOffscreen(offscreen);
          return canvas;
        }),
        op.delay(150), // wait for DOM being rendering
        op.switchMap(canvas => {
          return rx.concat(
            rx.of(null), // always prepend one `onResize` action for every `onDomChange` action
            // payloadByType.onResize
            rx.fromEvent<UIEvent>(window, 'resize').pipe(
              op.throttleTime(333)
            )
          ).pipe(
            op.map(() => {
              const vw = canvas.parentElement!.clientWidth;
              const vh = canvas.parentElement!.clientHeight;
              dispatcher.resizeViewport(vw, vh);
            })
          );
        })
      ),
      // Pass below actions to worker when worker is ready
      rx.merge(...[
        actionByType._onClick,
        actionByType._createOffscreen,
        actionByType.resizeViewport,
        actionByType.changeRatio,
        actionByType.onUnmount
      ].map(actionToWorker$ => rx.combineLatest(
        actionToWorker$,
        actionByType.workerReady.pipe(op.take(1)),
        payloadByType.setWorker.pipe(op.take(1))
      ))).pipe(
        op.map(([action, , worker]) => {
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
    ctrl,
    function onPointerMove(x: number, y: number) {
      onPointerMove$.next([x, y]);
    }
  ] as const;
}

