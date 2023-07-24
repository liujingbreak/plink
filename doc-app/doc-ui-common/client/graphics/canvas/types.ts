export type ReactiveCanvasConfig = {
  /** default 2 */
  scaleRatio?: number;
  // onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>> | void;
};

export type ReactiveCanvas2State = {
  ctx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  isOffscreen: boolean;
  canvas: HTMLCanvasElement | OffscreenCanvas | null;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  mounted: boolean;
  _animateCounter:  number;
} & ReactiveCanvasConfig;

export type ReactiveCanvas2Actions = {
  /** Dispatch this action once when `Object`s(`Paintable`s) are created and attached to canvas root paintable */
  sceneReady(): void;
  /** render once */
  render(): void;
  resizeViewport(width: number, height: number): void;
  changeRatio(scaleRatio: number): void;
  /** root component should subscribe this event, and start painting all children */
  renderContent(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
  onClicked(segsKey: Array<string>, originPoint: Float32Array): void;
};

export type ReactiveCanvas2InternalActions = {
  _createOffscreen(canvas: OffscreenCanvas): void;
  _createDom(dom: HTMLCanvasElement | null): void;
  _onClick(x: number, y: number): void;
  onDomMount(): void;
  onUnmount(): void;
};

