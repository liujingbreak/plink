export type ReactiveCanvasConfig = {
  /** default 2 */
  scaleRatio?: number;
  // onReady?(paintCtx: PaintableContext): Iterable<PaintableSlice<any, any>> | void;
};

export type ReactiveCanvas2State = {
  // ctx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  // isOffscreen: boolean;
  // canvas: HTMLCanvasElement | OffscreenCanvas | null;
  // width: number;
  // height: number;
  // pixelWidth: number;
  // pixelHeight: number;
  mounted: boolean;
  // _animateCounter:  number;
} & ReactiveCanvasConfig;

export type ReactiveCanvas2Actions = {
  _createOffscreen(canvas: OffscreenCanvas): void;
  setScaleRatio(value: number): void;
  /** Dispatch this action once when `Object`s(`Paintable`s) are created and attached to canvas root paintable */
  sceneReady(): void;
  resizeViewport(width: number, height: number): void;
  /** root component should subscribe this event, and start painting all children */
  onClick: ReactiveCanvasInputAction['onClick'];
  changeRatio: ReactiveCanvasInputAction['changeRatio'];
  onUnmount: ReactiveCanvasInputAction['onUnmount'];
};

export type ReactiveCanvasWorkerOutput = {
  setCanvasAndContext(canvas: HTMLCanvasElement | OffscreenCanvas, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
  setIsOffScreen(yes: boolean): void;
  setCanvasSize(width: number, height: number, pixelWidth: number, pixelHeight: number): void;
  onSegmentsClicked(segsKey: Array<string>, originPoint: Float32Array): void;
  renderContent(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
  /** render once */
  render(): void;
};

export type ReactiveCanvasInputAction = {
  changeRatio(scaleRatio: number): void;
  // _createDom(dom: HTMLCanvasElement | null): void;
  onClick(x: number, y: number): void;
  onDomMount(): void;
  onUnmount(): void;
};

