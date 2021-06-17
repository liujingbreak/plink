// import glur from 'glur';

// export class GaussianBlurHelper {
//   canvas: HTMLCanvasElement;


// }

/**
 * Create a offscreen canvas to cache/prerender stuff, performance is affected by size of canvas,
 * try to create a canvas in as smaller size as possible
 * https://www.html5rocks.com/en/tutorials/canvas/performance/#toc-pre-render
 * @param origCtx 
 */
export function createCanvas(origCtx: CanvasRenderingContext2D): HTMLCanvasElement;
export function createCanvas(width: number, height: number): HTMLCanvasElement;
export function createCanvas(width: number | CanvasRenderingContext2D, height?: number): HTMLCanvasElement {
  const c = window.document.createElement('canvas');
  if (typeof width === 'number' && height != null) {
    c.width = width;
    c.height = height;
  } else {
    const origCtx = width as CanvasRenderingContext2D;
    c.width = origCtx.canvas.width;
    c.height = origCtx.canvas.height;
  }
  return c;
}

export function gradientFadeOut(width: number, height: number,
  drawFn: (ctx: CanvasRenderingContext2D) => void, grad?: CanvasGradient) {
  const gradCv = createCanvas(width, height);
  const gctx = gradCv.getContext('2d');
  if (!gctx) {
    throw new Error('Can not create Canvas 2D');
  }
  if (grad == null) {
    grad = gctx.createLinearGradient(0,0, 0, gradCv.height);
  }
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0,0,width, height);
  gctx.globalCompositeOperation = 'source-in';
  drawFn(gctx);
  // gctx.drawImage(target, 0,0);
  return gradCv;
}

/**
 * A paper.js segement like structure (http://paperjs.org/reference/segment/)
 * Each segment consists of an anchor point (segment.point) and optionaly an incoming and an outgoing handle (segment.handleIn and segment.handleOut), describing the tangents of the two Curve objects that are connected by this segment.
 */
export class Segment {
  handleIn?: {x: number; y: number;};
  handleOut?: {x: number; y: number;};

  constructor(public point: {x: number, y: number}) {}
}

export function *createSegments(vertices: Iterable<[x: number, y: number]>): Iterable<Segment> {
  for (const p of vertices) {
    yield new Segment({x: p[0], y: p[1]});
  }
}

export function drawSegmentPath(segs: Iterable<Segment>, ctx: CanvasRenderingContext2D , mode: 'line' | 'curve' = 'line') {
  // ctx.beginPath();
  if (mode === 'line') {
    let i = 0;
    let origPoint: Segment['point'];
    for (const seg of segs) {
      const p = seg.point;
      if (i === 0) {
        origPoint = p;
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
      i++;
    }
    ctx.lineTo(origPoint!.x, origPoint!.y);
  }
  // ctx.closePath();
}

