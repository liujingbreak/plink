/**
 * @deprecated
 * ReactiveCanvas is successive.
 */
import anime from 'animejs';
import 'canvas-5-polyfill';
// import { Path2DLexer, Path2DParser, PathCommand } from './canvas-core/path2d-parser';
// export * from './canvas-core/paperjs-path';

export class BaseDrawable implements Drawable {
  animating = false;
  inited = false;
  children: Drawable[] | undefined;
  parent: BaseDrawable | undefined;
  mgr: CanvasMgr | undefined;
  protected cache: HTMLCanvasElement | null | undefined;
  protected cacheCtx: CanvasRenderingContext2D | undefined;

  constructor(children: Drawable[] = []) {
    if (children) {
      this.addChild(...children);
    }
  }

  addChild(...child: Drawable[]) {
    if (!this.children) {
      this.children = [];
    }
    this.children.push(...child);
    for (const chr of child) {
      chr.parent = this;
    }
  }
  /**
   * This method will only be executed once before first time renderering,
   * We should create offscreen canvas and cache other object here.
   * We can get Canvas size by `ctx.canvas.width` and `ctx.canvas.height`
   * 
   * @param ctx 
   */
  init?(ctx: CanvasRenderingContext2D) {}

  /**
   * To be overriden
   * @param ctx 
   */
  render?(ctx: CanvasRenderingContext2D) {}
  /**
   * To be overriden.
   * Being called during requestAnimationFrame(), should not repeatly create objects like offscreen canvas, gradients, Path2D
   * in this method.
   * The only job of this method should be rendering pre-cached path and image source based on animatable property.
   * 
   * @param ctx 
   */
  draw(ctx: CanvasRenderingContext2D) {
    if (this.cache) {
      ctx.drawImage(this.cache, 0, 0);
    }
    if (this.render) this.render(ctx);
  }

  onResize(ctx: CanvasRenderingContext2D): void {
    this.cache = null;
  }

  protected createCache(width: number, height: number): CanvasRenderingContext2D;
  protected createCache(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D;
  protected createCache(first: number | CanvasRenderingContext2D, height?: number) {
    if (!this.cache) {
      this.cache = window.document.createElement('canvas');
      if (typeof first === 'object') {
        const origCanvas = (first as CanvasRenderingContext2D).canvas;
        this.cache.height = origCanvas.height;
        this.cache.width = origCanvas.width;
      } else {
        this.cache.height = height!;
        this.cache.width = first;
      }
      this.cacheCtx = this.cache.getContext('2d')!;
    } else {
      this.cacheCtx!.clearRect(0,0,this.cache.width, this.cache.height);
    }
    return this.cacheCtx;
  }

  /**
   * 
   * @param params default `"targets"` should be `this`
   */
  protected runAnim(params: anime.AnimeParams): Promise<any> {
    const drawable = params.targets as Drawable || this;
    drawable.animating = true;
    return anime({
        ...params,
        targets: drawable
      }).finished.then(() => {
        drawable.animating = false;
      });
  }
}

export interface Drawable {
  parent: BaseDrawable | undefined;
  animating: boolean;
  mgr: CanvasMgr | undefined;
  /**
   * Being called during requestAnimationFrame(), should not repeatly create objects like offscreen canvas, gradients, Path2D
   * in this method.
   * The only job of this method should be rendering pre-cached path and image source based on animatable property.
   * 
   * @param ctx 
   */
  draw(ctx: CanvasRenderingContext2D): void;
  onResize(ctx: CanvasRenderingContext2D): void;
}

export class CanvasMgr {
  scaleRatio = 2;
  width = 300;
  height = 150;
  protected animCount = 0;
  ctx: CanvasRenderingContext2D;
  renderStarted = false;
  renderDone: Promise<void> | undefined;
  // paper = paper;
  private _resolveRenderDone?: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  async render(drawables: Drawable[]): Promise<void> {
    if (this.renderStarted) {
      return this.renderDone;
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    this.detectSize();

    this.renderDone = new Promise(resolve => {
      this._resolveRenderDone = resolve;
    });
    this.renderStarted = true;
    this.keepRenderering(drawables);
    return this.renderDone;
  }

  resize(drawables: Drawable[]) {
    this.detectSize();
    for (const chr of drawables) {
      chr.onResize(this.ctx);
      const group = chr as BaseDrawable;
      if (group.children) {
        this.resize(group.children);
      }
    }
  }

  private keepRenderering(drawables: Drawable[]) {
    this.animCount = 0;
    const canvas = this.ctx.canvas;
    this.ctx.clearRect(0,0, canvas.width, canvas.height);
    this._drawAll(drawables);

    if (this.animCount > 0 && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        this.keepRenderering(drawables);
      });
    } else {
      this.renderStarted = false;
      if (this._resolveRenderDone)
        this._resolveRenderDone();
    }
  }

  private _drawAll(drawables: Drawable[]) {
    for (const chr of drawables) {
      if (chr.animating) {
        this.animCount++;
      }
      this.ctx.save();
      chr.mgr = this;
      if ((chr as BaseDrawable).init && (chr as BaseDrawable).inited === false) {
        (chr as BaseDrawable).inited = true;
        this.ctx.save();
        try {
          (chr as BaseDrawable).init!(this.ctx);
        } catch (ex) {
          throw ex;
        } finally {
          this.ctx.restore();
        }
      }

      try {
        chr.draw(this.ctx);
        const group = chr as BaseDrawable;
        if (group.children) {
          this._drawAll(group.children);
        }
      } catch (ex) {
        throw ex;
      } finally {
        this.ctx.restore();
      }
    }
  }

  private detectSize() {
    const vw = this.canvas.clientWidth << 1;
    const vh = this.canvas.clientHeight << 1;
    if (vw !== this.width || vh !== this.height) {
      this.width = vw;
      this.height = vh;
      this.canvas.setAttribute('width', vw + '');
      this.canvas.setAttribute('height', vh + '');
    }
  }
}

// export function parseSvgPath(pathStr: string, onPoint: (x: number, y: number) => [number, number]): PathCommand[] {
//   return new Path2DParser(new Path2DLexer(pathStr)).replacePoints(onPoint);
// }

