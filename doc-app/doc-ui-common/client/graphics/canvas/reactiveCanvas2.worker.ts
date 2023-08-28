import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {ReactorComposite, Action} from '@wfh/reactivizer';
import {createAnimationManager} from '../../animation/ease-functions';
import {createForCanvas} from './paintable-worker-client';
import {createPaintable, PaintableCtl, Paintable} from './paintable';
import {ReactiveCanvas2Actions, ReactiveCanvasInputAction, ReactiveCanvasWorkerOutput} from './types';

export type ReactiveCanvas2Engine = {
  canvasController: ReactorComposite<ReactiveCanvas2Actions, ReactiveCanvasWorkerOutput>;
  onPointerMove$: rx.Observable<[number, number]>;
  workerClient: ReturnType<typeof createForCanvas>;
  animateMgr: ReturnType<typeof createAnimationManager>;
};

function createEngine(): ReactiveCanvas2Engine {
  const comp = new ReactorComposite<ReactiveCanvas2Actions, ReactiveCanvasWorkerOutput>({debug: process.env.NODE_ENV === 'development' ? 'reativeCanvas2.worker' : false});
  const sub = comp.startAll();
  const {r, i, o} = comp;
  const {pt} = i;
  const {dispatcher} = o;
  const lo = comp.o.createLatestPayloadsFor('setIsOffScreen', 'setCanvasSize');
  const li = comp.i.createLatestPayloadsFor('setScaleRatio');
  // const control = createActionStreamByType<ReactiveCanvas2Actions & ReactiveCanvasInputAction>(
  //   {debug: process.env.NODE_ENV === 'development' ? 'reativeCanvas2.worker' : false}
  // );
  const workerClient = createForCanvas();
  const animateMgr = createAnimationManager();

  const onPointerMove$ = new rx.Subject<[number, number]>();
  // const {actionByType, dispatcher, _actionFromObject, createAction} = control;

  const workerMsgHandler = (event: MessageEvent<{type: string; x: number; y: number} | Action<ReactiveCanvas2Actions, keyof ReactiveCanvas2Actions>>) => {
    if ((event.data as {type: string; x: number; y: number}).type === 'onPointMove') {
      const {x, y} = event.data as {type: string; x: number; y: number};
      onPointerMove$.next([x, y]);
    } else {
      const {data} = event as MessageEvent<Action<ReactiveCanvas2Actions, keyof ReactiveCanvas2Actions>>;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (comp.i.dp[data.t as keyof ReactiveCanvas2Actions] as any)(...data.p);
    }
  };

  r(pt.onClick.pipe(
    op.withLatestFrom(li.setScaleRatio),
    op.map(([[, x, y], [, scaleRatio]]) => {
      const ratioToCanvasPoint = scaleRatio ?? 2;
      const pointer = Float32Array.of(Math.round(x) * ratioToCanvasPoint, Math.round(y) * ratioToCanvasPoint);
      workerClient.dispatcher.detectPoint('clicked', pointer);
    })
  ));

  r(workerClient.payloadByType.detectedIntersection.pipe(
    op.map(([id, segs, originPoint]) => {
      if (id === 'clicked') {
        dispatcher.onSegmentsClicked(segs, originPoint);
      }
    })
  ));

  r(pt.resizeViewport.pipe(
    rx.withLatestFrom(li.setScaleRatio),
    op.map(([[, vw, vh], [, scaleRatio]]) => {
      const ratio = scaleRatio;
      const pixelWidth = vw;
      const pixelHeight = vh;
      const width = Math.floor(vw * ratio);
      const height = Math.floor(vh * ratio);
      dispatcher.setCanvasSize(width, height, pixelWidth, pixelHeight);
      dispatcher.render();
    })
  ));

  r(pt._createOffscreen.pipe(
    op.tap(([, canvas]) => {
      dispatcher.setIsOffScreen(true);
      dispatcher.setCanvasAndContext(canvas, canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D);
    })
  ));

  r(o.pt.renderContent.pipe(
    rx.withLatestFrom(lo.setCanvasSize),
    rx.map(([[, ctx], [, width, height]]) => {
      ctx.clearRect(0, 0, width, height);
    })
  ));

  r(rx.combineLatest([
    i.at.sceneReady,
    rx.merge(animateMgr.renderFrame$, o.at.render),
    o.pt.setCanvasAndContext
  ]).pipe(
    rx.map(([, , [, _canvas, ctx]]) => {
      dispatcher.renderContent(ctx);
    })
  ));

  r(rx.combineLatest([
    lo.setCanvasSize,
    o.pt.setCanvasAndContext
  ]).pipe(
    rx.map(([[, w, h, pw, ph], [, canvas]]) => [w, h, pw, ph, canvas] as const),
    rx.distinctUntilChanged(([w1, h1, c1], [w2, h2, c2]) => w1 === w2 && h1 === h2 && c1 === c2),
    rx.withLatestFrom(lo.setIsOffScreen),
    rx.map(([[width, height, pixelWidth, pixelHeight, canvas], [, isOffscreen]]) => {
      if (!isOffscreen) {
        (canvas as HTMLCanvasElement).setAttribute('width', width + '');
        (canvas as HTMLCanvasElement).setAttribute('height', height + '');
        (canvas as HTMLCanvasElement).style.width = pixelWidth + 'px';
        (canvas as HTMLCanvasElement).style.height = pixelHeight + 'px';
      } else {
        canvas.width = width;
        canvas.height = height;
      }
    })
  ));

  r(new rx.Observable(() => {
    postMessage('ready');
    // eslint-disable-next-line no-restricted-globals
    addEventListener('message', workerMsgHandler);
    // eslint-disable-next-line no-restricted-globals
    return () => removeEventListener('message', workerMsgHandler);
  }));

  r(i.at.onUnmount.pipe(rx.map(() => sub.unsubscribe())));

  rx.merge(
    new rx.Observable(() => {
      postMessage('ready');
      // eslint-disable-next-line no-restricted-globals
      addEventListener('message', workerMsgHandler);
      // eslint-disable-next-line no-restricted-globals
      return () => removeEventListener('message', workerMsgHandler);
    })
  ).pipe(
    op.takeUntil(pt.onUnmount.pipe(
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
    canvasController: comp,
    workerClient,
    onPointerMove$: onPointerMove$.asObservable(),
    animateMgr
  };
}

export type ReactiveCanvas2Control = ActionStreamControl<ReactiveCanvas2Actions & ReactiveCanvasInputAction>;

export function createRootPaintable(): [Paintable, ReactiveCanvas2Engine] {
  const engine = createEngine();
  const base = createPaintable({debug: process.env.NODE_ENV === 'development' ? 'root-paintable' : false});
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
