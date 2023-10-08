import * as rx from 'rxjs';
import {mat4} from 'gl-matrix';
import {ReactorComposite, Action, deserializeAction} from '@wfh/reactivizer';
import {createAnimationManager} from '../../animation/ease-functions';
import {createForCanvas} from './paintable-worker-client';
import {createPaintable} from './paintable';
import {ReactiveCanvas2Actions, ReactiveCanvasWorkerInput, ReactiveCanvasWorkerOutput} from './types';

export type ReactiveCanvas2Engine = {
  canvasController: ReactorComposite<ReactiveCanvasWorkerInput, ReactiveCanvasWorkerOutput, never[], typeof outputTableFor>;
  onPointerMove$: rx.Observable<[number, number]>;
  workerClient: ReturnType<typeof createForCanvas>;
  animateMgr: ReturnType<typeof createAnimationManager>;
};

const outputTableFor = ['setIsOffScreen', 'setCanvasSize'] as const;

function createEngine(): ReactiveCanvas2Engine {
  const comp = new ReactorComposite<ReactiveCanvasWorkerInput, ReactiveCanvasWorkerOutput, never[], typeof outputTableFor>({
    name: 'reativeCanvas2.worker',
    debug: process.env.NODE_ENV === 'development',
    outputTableFor
  });
  const {r, i, o} = comp;
  const {pt} = i;
  const {dispatcher} = o;
  const lo = comp.outputTable.l;
  // const li = comp.i.createLatestPayloadsFor('setScaleRatio');
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
      deserializeAction(data, comp.i);
    }
  };

  r(pt.onClick.pipe(
    // rx.withLatestFrom(li.setScaleRatio),
    rx.map(([, x, y]) => {
      const ratioToCanvasPoint = 2;
      const pointer = Float32Array.of(Math.round(x) * ratioToCanvasPoint, Math.round(y) * ratioToCanvasPoint);
      workerClient.i.dp.detectPoint('clicked', pointer);
    })
  ));

  // r(workerClient.payloadByType.detectedIntersection.pipe(
  //   rx.map(([id, segs, originPoint]) => {
  //     if (id === 'clicked') {
  //       dispatcher.onSegmentsClicked(segs, originPoint);
  //     }
  //   })
  // ));

  r(pt.resizeViewport.pipe(
    // rx.withLatestFrom(li.setScaleRatio),
    rx.map(([, vw, vh]) => {
      const ratio = 2;
      const pixelWidth = vw;
      const pixelHeight = vh;
      const width = Math.floor(vw * ratio);
      const height = Math.floor(vh * ratio);
      dispatcher.setCanvasSize(width, height, pixelWidth, pixelHeight);
      dispatcher.render();
    })
  ));

  r(pt._createOffscreen.pipe(
    rx.tap(([, canvas]) => {
      dispatcher.setIsOffScreen(true);
      dispatcher.setCanvasAndContext(canvas, canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D);
    })
  ));

  r('clear canvas', o.pt.renderContent.pipe(
    rx.withLatestFrom(lo.setCanvasSize),
    rx.map(([[, ctx], [, width, height]]) => {
      ctx.clearRect(0, 0, width, height);
    })
  ));

  r('dispatch renderContent', rx.combineLatest([
    i.at.sceneReady,
    rx.merge(animateMgr.renderFrame$, o.at.render),
    o.pt.setCanvasAndContext
  ]).pipe(
    rx.map(([m, , [, _canvas, ctx]]) => {
      o.dpf.renderContent(m, ctx);
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

  // r(i.at.onUnmount.pipe(rx.map(() => {
  //   workerClient.dispatcher.canvasDestroyed();
  //   comp.destory();
  // })));

  return {
    canvasController: comp,
    workerClient,
    onPointerMove$: onPointerMove$.asObservable(),
    animateMgr
  };
}

export function createRootAndEngine() {
  const engine = createEngine();
  const root = createPaintable({
    name: 'root-paintable',
    debug: process.env.NODE_ENV === 'development'});
  const {i, o, r} = root;
  o.dp.isDetached(false);
  o.dp.setTreeAttached(true);
  o.dp.setAbsoluteTransform(mat4.create());

  r(engine.canvasController.o.pt.setCanvasSize.pipe(
    rx.distinctUntilChanged(([, w1, h1], [, w2, h2]) => w1 === w2 && h1 === h2),
    rx.tap(([m, w, h]) => o.dpf.onResize(m, w, h))
  ));

  r(engine.canvasController.o.pt.renderContent.pipe(
    rx.map(([m, ctx]) => o.dpf.afterRender(m, ctx))
  ));

  r(engine.canvasController.i.at.onUnmount.pipe(
    rx.tap(a => i.dpf.detach(a))
  ));

  // rx.merge(
  //   canvasPayloads.renderContent.pipe(
  //     rx.map(ctx => {
  //       rootCtl.dispatcher.afterRender(ctx);
  //     })
  //   ),
  //   canvasPayloads.onUnmount.pipe(
  //     rx.map(() => {
  //       rootCtl.dispatcher.detach();
  //     })
  //   )
  // ).subscribe();
  return [root, engine] as const;
}

