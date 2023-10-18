import * as rx from 'rxjs';
import * as op from 'rxjs';
import {ReactorComposite, serializeAction} from '@wfh/reactivizer';
import type {ReactiveCanvasInputAction, ReactiveCanvas2Actions} from './types';

export type CanvasActions = {
  onDomChange(canvas: HTMLCanvasElement | null): void;
  setWorker(worker: Worker): void;
};

export type CanvasEvents = {
  workerReady(worker: Worker): void;
};

export function createDomControl() {
  const re = new ReactorComposite<CanvasActions & ReactiveCanvasInputAction, ReactiveCanvas2Actions & CanvasEvents>({
    name: 'canvas-control',
    debug: process.env.NODE_ENV === 'development'
  });
  // const ctrl = createActionStreamWithEpic< BaseReactComponentAction & CanvasActions & ReactiveCanvasInputAction & ReactiveCanvas2Actions>({debug: process.env.NODE_ENV === 'development' ? 'canvas-control' : false});
  const onPointerMove$ = new rx.Subject<[number, number]>();

  const {i, o, r} = re;

  r('setWorker', i.pt.setWorker.pipe(
    op.switchMap(([, worker]) => {
      return new rx.Observable<void>(sub => {
        const h = (event: MessageEvent<string>) => {
          if (event.data === 'ready') {
            o.dp.workerReady(worker);
            sub.next();
            sub.complete();
          }
        };
        worker.addEventListener('message', h);
        return () => worker.removeEventListener('message', h);
      });
    })
  ));

  r('onPointerMove', onPointerMove$.pipe(
    op.throttleTime(100),
    op.withLatestFrom(o.pt.workerReady),
    op.map(([[x, y], [, worker]]) => {
      worker.postMessage({type: 'onPointMove', x, y});
    })
  ));

  r(i.pt.onDomChange.pipe(
    op.filter((p): p is [typeof p[0], NonNullable<typeof p[1]>] => p[1] != null),
    op.distinctUntilChanged(),
    op.map(([, canvas]) => {
      const offscreen = canvas.transferControlToOffscreen();
      re.o.dp._createOffscreen(offscreen);
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
          re.o.dp.resizeViewport(vw, vh);
        })
      );
    })
  ));
  // Pass below actions to worker when worker is ready
  r('after worker ready, postMessage', rx.combineLatest([
    rx.merge(i.at.onClick, o.at.resizeViewport, i.at.changeRatio, i.at.onUnmount),
    re.o.pt.workerReady
  ]).pipe(
    rx.map(([action, [, worker]]) => {
      worker.postMessage(serializeAction(action));
    })
  ));

  // Pass below actions to worker when worker is ready
  r(rx.combineLatest([re.o.at._createOffscreen, re.o.pt.workerReady]).pipe(
    rx.map(([action, [, worker]]) => {
      worker.postMessage(serializeAction(action), action.p);
    })
  ));

  re.startAll();

  return [
    re.i,
    function onPointerMove(x: number, y: number) {
      onPointerMove$.next([x, y]);
    }
  ] as const;
}

