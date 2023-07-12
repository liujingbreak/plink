import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {createAnimationManager} from '../../animation/ease-functions';
import {createForCanvas} from './paintable-worker-client';
import {createPaintable, PaintableCtl} from './paintable';

export type ReactiveCanvasConfig = {
  /** default 2 */
  scaleRatio?: number;
  // onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>> | void;
};

export type ReactiveCanvas2State = {
  ctx?: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  _animateCounter:  number;
} & ReactiveCanvasConfig;

export type ReactiveCanvas2Actions = {
  /** render once */
  render(): void;
  onResize(): void;
  changeRatio(scaleRatio: number): void;
  /** root component should subscribe this event, and start painting all children */
  renderContent(ctx: CanvasRenderingContext2D): void;
};

type ReactiveCanvas2InternalActions = {
  _createDom(dom: HTMLCanvasElement | null): void;
  /** TODO: maybe this action is unnecessary due to onResize() */
  _afterResize(): void;
  _onClick(x: number, y: number): void;
  onDomMount(): void;
  onUnmount(): void;
};

export type ReactiveCanvas2Engine = {
  canvasState$: rx.BehaviorSubject<ReactiveCanvas2State>;
  canvasController: ReactiveCanvas2Control;
  onPointerMove(x: number, y: number): void;
  workerClient: ReturnType<typeof createForCanvas>;
  animateMgr: ReturnType<typeof createAnimationManager>;
};

export function create(): ReactiveCanvas2Engine {
  const state$ = new rx.BehaviorSubject<ReactiveCanvas2State>({
    scaleRatio: 2,
    canvas: null,
    width: 0,
    height: 0,
    pixelHeight: 0,
    pixelWidth: 0,
    _animateCounter: 0
  });

  const control = createActionStreamByType<ReactiveCanvas2Actions & ReactiveCanvas2InternalActions>(
    {debug: process.env.NODE_ENV === 'development' ? 'ReativeCanvas2' : false}
  );
  const workerClient = createForCanvas();
  const animateMgr = createAnimationManager();

  const onPointerMove$ = new rx.Subject<[number, number]>();
  const {payloadByType, dispatcher} = control;

  rx.merge(
    onPointerMove$.pipe(
      op.throttleTime(100),
      op.map(([x, y]) => {
        // TODO
      })
    ),
    payloadByType._onClick.pipe(
      op.map(([x, y]) => {
        const s = state$.getValue();
        const ratioToCanvasPoint = s.scaleRatio ?? 2;
        const pointer = Float32Array.of(Math.round(x) * ratioToCanvasPoint, Math.round(y) * ratioToCanvasPoint);
        workerClient.dispatcher.detectPoint(pointer);
      })
    ),
    payloadByType.onResize.pipe(
      op.map(() => {
        const s = {...state$.getValue()};
        if (s.canvas == null)
          return;
        const vw = s.canvas.parentElement!.clientWidth;
        const vh = s.canvas.parentElement!.clientHeight;

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
    payloadByType._createDom.pipe(
      op.map(canvas => {
        if (canvas) {
          const s = state$.getValue();
          state$.next({
            ...s,
            canvas,
            ctx: canvas.getContext('2d')!
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
      op.map((s) => {
        const can = s.canvas!;
        can.setAttribute('width', s.width + '');
        can.setAttribute('height', s.height + '');
        can.style.width = s.pixelWidth + 'px';
        can.style.height = s.pixelHeight + 'px';
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
    )
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

export function createRootPaintable(engine: ReactiveCanvas2Engine) {
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
  return base;
}

export type RootPaintable = PaintableCtl;
