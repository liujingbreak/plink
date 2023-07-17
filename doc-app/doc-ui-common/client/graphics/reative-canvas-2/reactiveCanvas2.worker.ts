import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {createAnimationManager} from '../../animation/ease-functions';
import {createForCanvas} from './paintable-worker-client';
import {createPaintable, PaintableCtl, Paintable} from './paintable';
import {ReactiveCanvas2State, ReactiveCanvas2Actions, ReactiveCanvas2InternalActions} from './types';

export type ReactiveCanvas2Engine = {
  canvasState$: rx.BehaviorSubject<ReactiveCanvas2State>;
  canvasController: ReactiveCanvas2Control;
  onPointerMove(x: number, y: number): void;
  workerClient: ReturnType<typeof createForCanvas>;
  animateMgr: ReturnType<typeof createAnimationManager>;
};

function createEngine(): ReactiveCanvas2Engine {
  const state$ = new rx.BehaviorSubject<ReactiveCanvas2State>({
    isOffscreen: false,
    scaleRatio: 2,
    canvas: null,
    width: 0,
    height: 0,
    pixelHeight: 0,
    pixelWidth: 0,
    mounted: false,
    _animateCounter: 0
  });

  const control = createActionStreamByType<ReactiveCanvas2Actions & ReactiveCanvas2InternalActions>(
    {debug: process.env.NODE_ENV === 'development' ? 'reativeCanvas2.worker' : false}
  );
  const workerClient = createForCanvas();
  const animateMgr = createAnimationManager();

  const onPointerMove$ = new rx.Subject<[number, number]>();
  const {payloadByType, dispatcher, _actionFromObject} = control;

  const workerMsgHandler = (event: MessageEvent<{p: string; t: string; type?: string; x?: number; y?: number}>) => {
    if (event.data.type === 'onPointMove') {
      const {x, y} = event.data;
      onPointerMove$.next([x!, y!]);
    } else {
      _actionFromObject(event.data);
    }
  };

  rx.merge(
    payloadByType._onClick.pipe(
      op.map(([x, y]) => {
        const s = state$.getValue();
        const ratioToCanvasPoint = s.scaleRatio ?? 2;
        const pointer = Float32Array.of(Math.round(x) * ratioToCanvasPoint, Math.round(y) * ratioToCanvasPoint);
        workerClient.dispatcher.detectPoint(pointer);
      })
    ),
    payloadByType.resizeViewport.pipe(
      op.map(([vw, vh]) => {
        const s = {...state$.getValue()};

        if (vw !== s.pixelWidth || vh !== s.pixelHeight) {
          const ratio = s.scaleRatio!;
          s.pixelWidth = vw;
          s.pixelHeight = vh;
          s.width = Math.floor(vw * ratio);
          s.height = Math.floor(vh * ratio);
        }
        state$.next(s);
      })
    ),
    rx.merge(
      payloadByType._createDom,
      payloadByType._createOffscreen.pipe(
        op.tap(() => {
          state$.next({...state$.getValue(), isOffscreen: true});
        })
      )
    ).pipe(
      op.map(canvas => {
        if (canvas) {
          const s = state$.getValue();
          state$.next({
            ...s,
            canvas,
            ctx: canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
          });
        }
      })
    ),
    payloadByType.changeRatio.pipe(
      op.map(scaleRatio => {
        state$.next({...state$.getValue(), scaleRatio});
      })
    ),
    payloadByType._afterResize.pipe(
      op.map(() => {
        const ctx = state$.getValue().ctx;
        if (ctx)
          dispatcher.renderContent(ctx);
      })
    ),
    payloadByType.renderContent.pipe(
      op.map(ctx => {
        const s = state$.getValue();
        ctx.clearRect(0, 0, s.width, s.height);
      })
    ),
    animateMgr.renderFrame$.pipe(
      op.withLatestFrom(state$.pipe(
        op.map(s => s.ctx),
        op.distinctUntilChanged(),
        op.filter(ctx => ctx != null),
        op.take(1)
      )),
      op.map(([, ctx]) => dispatcher.renderContent(ctx!))
    ),
    state$.pipe(
      op.distinctUntilChanged((x, y) => x.width === y.width && x.height === y.height && x.canvas !== y.canvas),
      op.filter(s => s.canvas != null),
      op.map(s => {
        if (!s.isOffscreen) {
          const can = s.canvas as HTMLCanvasElement;
          can.setAttribute('width', s.width + '');
          can.setAttribute('height', s.height + '');
          can.style.width = s.pixelWidth + 'px';
          can.style.height = s.pixelHeight + 'px';
        } else {
          const can = s.canvas as OffscreenCanvas;
          can.width = s.width;
          can.height = s.height;
        }
      })
    ),
    new rx.Observable(sub => {
      // eslint-disable-next-line no-restricted-globals
      addEventListener('message', workerMsgHandler);
      sub.complete();
      // eslint-disable-next-line no-restricted-globals
      return () => removeEventListener('message', workerMsgHandler);
    })
  ).pipe(
    op.takeUntil(payloadByType.onUnmount.pipe(
      op.tap(() => {
        workerClient.dispatcher.canvasDestroyed();
      })
    )),
    op.catchError((err, src) => {
      void Promise.resolve().then(() => {
        if (err instanceof Error)
          throw err;
        else
          throw new Error(err);
      });
      return src;
    })
  ).subscribe();

  return {
    canvasState$: state$,
    canvasController: control,
    onPointerMove(x: number, y: number) { onPointerMove$.next([x, y]); },
    workerClient,
    animateMgr
  };
}

export type ReactiveCanvas2Control = ActionStreamControl<ReactiveCanvas2Actions & ReactiveCanvas2InternalActions>;

export function createRootPaintable(): [Paintable, ReactiveCanvas2Engine] {
  const engine = createEngine();
  const base = createPaintable();
  const [baseCtl, baseState] = base;
  baseState.detached = false;
  baseState.treeDetached = false;
  const {payloadByType: canvasPayloads} = engine.canvasController;
  const canvasState = engine.canvasState$.getValue();
  baseState.width = canvasState.width;
  baseState.height = canvasState.height;
  baseState.canvasEngine = engine;

  rx.merge(
    engine.canvasState$.pipe(
      op.distinctUntilChanged((s1, s2) => s1.width === s2.width && s1.height === s2.height),
      op.tap(s => {
        baseState.width = s.width;
        baseState.height = s.height;
        baseCtl.dispatcher.onResize(s.width, s.height);
      })
    ),
    canvasPayloads.renderContent.pipe(
      op.map(ctx => {
        baseCtl.dispatcher.afterRender(ctx);
      })
    ),
    canvasPayloads.onUnmount.pipe(
      op.map(() => {
        baseCtl.dispatcher.detach();
      })
    )
  ).subscribe();
  return [base, engine];
}

export type RootPaintable = PaintableCtl;
