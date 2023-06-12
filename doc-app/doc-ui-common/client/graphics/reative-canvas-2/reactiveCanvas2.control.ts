import * as rx from 'rxjs';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';

export type ReactiveCanvasProps = {
  /** default 2 */
  scaleRatio?: number;
  // onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>> | void;
};

interface ReactiveCanvas2State {
  ctx?: CanvasRenderingContext2D;
  componentProps: ReactiveCanvasProps;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  rootPaintable?: PositionalPaintableSlice;
  // We want a separate observable store to perform well in animation frames
  animFrameTime$: rx.BehaviorSubject<number | undefined | null>;
  _countAnimatings:  number;
}

export type ReactiveCanvas2Actions = {
  _createDom(dom: HTMLCanvasElement | null): void;
  onDomMount(): void;
  resize(): void;
  _afterResize(): void;
  startAnimating(): void;
  stopAnimating(): void;
  changeContext(newCtx: CanvasRenderingContext2D): void;
  changeRatio(scaleRatio: number): void;
  _componentTreeReady(): void;
};

export function createControl() {
  const state$ = new rx.BehaviorSubject<ReactiveCanvas2State>({
    componentProps: {
      scaleRatio: 2
    },
    canvas: null,
    width: 0,
    height: 0,
    pixelHeight: 0,
    pixelWidth: 0,
    // rootId,
    // rootPaintable: createPaintableSlice('root'),
    // components: [new Map([ [rootId, rootPaintableData] ])],
    _countAnimatings: 0,
    animFrameTime$: new rx.BehaviorSubject<number | null | undefined>(null)
    // rendering: false,
    // animEscapeTime: 0
  });

  const control = createActionStreamByType<ReactiveCanvas2Actions>();

  return [state$, control] as const;
}
