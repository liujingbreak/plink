import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';

export type ReactiveCanvasProps = {
  /** default 2 */
  scaleRatio?: number;
  // onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>> | void;
};

type ReactiveCanvas2State = {
  ctx?: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  // We want a separate observable store to perform well in animation frames
  animFrameTime$: rx.BehaviorSubject<number | undefined | null>;
  _countAnimatings:  number;
} & ReactiveCanvasProps;

export type ReactiveCanvas2Actions = {
  _createDom(dom: HTMLCanvasElement | null): void;
  onDomMount(): void;
  resize(): void;
  _afterResize(): void;
  startAnimating(): void;
  stopAnimating(): void;
  changeRatio(scaleRatio: number): void;
  /** root component should subscribe this event, and start painting all children */
  renderContent(ctx: CanvasRenderingContext2D): void;
};

export function createControl() {
  const state$ = new rx.BehaviorSubject<ReactiveCanvas2State>({
    scaleRatio: 2,
    canvas: null,
    width: 0,
    height: 0,
    pixelHeight: 0,
    pixelWidth: 0,
    _countAnimatings: 0,
    animFrameTime$: new rx.BehaviorSubject<number | null | undefined>(null)
  });

  const control = createActionStreamByType<ReactiveCanvas2Actions>();
  const {actionOfType} = control;
  const sub = rx.merge(
    actionOfType('resize').pipe(
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
    actionOfType('startAnimating').pipe(
      op.map(() => {
        const s = state$.getValue();
        state$.next({...s, _countAnimatings: s._countAnimatings + 1});
      })
    ),
    actionOfType('stopAnimating').pipe(
      op.map(() => {
        const s = state$.getValue();
        state$.next({...s, _countAnimatings: s._countAnimatings - 1});
      })
    ),
    actionOfType('_createDom').pipe(
      op.map(({payload: canvas}) => {
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
    actionOfType('changeRatio').pipe(
      op.map(({payload: scaleRatio}) => {
        state$.next({...state$.getValue(), scaleRatio});
      })
    ),
    actionOfType('_afterResize').pipe(
      op.map(() => {
        const ctx = state$.getValue().ctx;
        if (ctx)
          control.dispatcher.renderContent(ctx);
      })
    ),
    actionOfType('renderContent').pipe(
      op.map(() => {
        const s = state$.getValue();
        ctx.clearRect(0, 0, s.width, s.height);
      })
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
    actionOfType('onDomMount').pipe(
      op.switchMap(() => rx.timer(150)),
      op.map(() => {
        control.dispatcher.resize(); // let other paintable react on "resize" action first
        control.dispatcher._afterResize(); // trigger re-render
      }),
      op.switchMap(() => rx.fromEvent<UIEvent>(window, 'resize')),
      op.map(_event => {
        control.dispatcher.resize();
        control.dispatcher._afterResize();
      })

    )
  ).subscribe();
  return [state$, control, () => sub.unsubscribe()] as const;
}
