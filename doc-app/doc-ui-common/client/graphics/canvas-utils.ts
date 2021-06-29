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
  handleIn?: {x: number; y: number};
  handleOut?: {x: number; y: number};

  constructor(public point: {x: number; y: number}) {}
}

export function *createSegments(vertices: Iterable<[x: number, y: number]>): Iterable<Segment> {
  for (const p of vertices) {
    yield new Segment({x: p[0], y: p[1]});
  }
}

export function drawSegmentPath(segs: Iterable<Segment>, ctx: CanvasRenderingContext2D , closed = false) {
  // ctx.beginPath();
  let i = 0;
  let origPoint: Segment['point'];
  const segements = Array.from(segs);
  for (const seg of segements) {
    const p = seg.point;
    if (i === 0) {
      origPoint = p;
      ctx.moveTo(p.x, p.y);
    } else {
      const c1 = segements[i - 1].handleOut;
      const c2 = seg.handleIn;
      if (c1 && c2) {
        c1.x += segements[i - 1].point.x;
        c1.y += segements[i - 1].point.y;
        c2.x += seg.point.x;
        c2.y += seg.point.y;
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, seg.point.x, seg.point.y);
      } else
        ctx.lineTo(p.x, p.y);
    }
    i++;
  }
  if (closed) {
    const lastSeg = segements[segements.length - 1];
    if (segements[0].handleIn && lastSeg.handleOut) {
      const c1 = lastSeg.handleOut;
      const c2 = segements[0].handleIn;
      c1.x += lastSeg.point.x;
      c1.y += lastSeg.point.y;
      c2.x += segements[0].point.x;
      c2.y += segements[0].point.y;
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, segements[0].point.x, segements[0].point.y);
    } else {
      ctx.lineTo(origPoint!.x, origPoint!.y);
    }
  }
  // ctx.closePath();
}

export function smoothSegments(segments: Segment[], opts: {
  from?: number; to?: number; closed?: boolean; type?: 'asymmetric' | 'continuous';
}) {
  const asymmetric = opts.type === 'asymmetric';

  const loop = opts.closed && opts.from === undefined && opts.to === undefined;
  const from = opts.from == null ? 0 : opts.from;
  const to = opts.to == null ? segments.length - 1 : opts.to;

  // const min = Math.min;
  const amount = to - from + 1;
  let n = amount - 1;
  // Overlap by up to 4 points on closed paths since a current
  // segment is affected by its 4 neighbors on both sides (?).
  const padding = loop ? Math.min(amount, 4) : 1;
  let paddingLeft = padding;
  let paddingRight = padding;
  const knots: {x: number; y: number}[] = [];

  if (opts.closed == null || !opts.closed) {
    // If the path is open and a range is defined, try using a
    // padding of 1 on either side.
    paddingLeft = Math.min(1, from);
    paddingRight = Math.min(1, segments.length - to - 1);
  }

  // Set up the knots array now, taking the paddings into account.
  n += paddingLeft + paddingRight;
  if (n <= 1)
      return;
  for (let i = 0, j = from - paddingLeft; i <= n; i++, j++) {
      knots[i] = segments[(j < 0 ? j + segments.length : j) % segments.length].point;
  }
  let x = knots[0].x + 2 * knots[1].x;
  let y = knots[0].y + 2 * knots[1].y;
  let  f = 2;
  let  n_1 = n - 1;
  let  rx = [x];
  let  ry = [y];
  let  rf = [f];
  let  px: number[] = [];
  let  py: number[] = [];
  // Solve with the Thomas algorithm
  for (let i = 1; i < n; i++) {
      const internal = i < n_1;
      //  internal--(I)  asymmetric--(R) (R)--continuous
      let a = internal ? 1 : asymmetric ? 1 : 2;
      let b = internal ? 4 : asymmetric ? 2 : 7;
      let u = internal ? 4 : asymmetric ? 3 : 8;
      let v = internal ? 2 : asymmetric ? 0 : 1;
      let m = a / f;
      f = rf[i] = b - m;
      x = rx[i] = u * knots[i].x + v * knots[i + 1].x - m * x;
      y = ry[i] = u * knots[i].y + v * knots[i + 1].y - m * y;
  }

  px[n_1] = rx[n_1] / rf[n_1];
  py[n_1] = ry[n_1] / rf[n_1];
  for (let i = n - 2; i >= 0; i--) {
      px[i] = (rx[i] - px[i + 1]) / rf[i];
      py[i] = (ry[i] - py[i + 1]) / rf[i];
  }
  px[n] = (3 * knots[n].x - px[n_1]) / 2;
  py[n] = (3 * knots[n].y - py[n_1]) / 2;

  // Now update the segments
  for (let i = paddingLeft, max = n - paddingRight, j = from;
          i <= max; i++, j++) {
      const segment = segments[j < 0 ? j + segments.length : j];
      const pt = segment.point;
      const hx = px[i] - pt.x;
      const hy = py[i] - pt.y;
      if (loop || i < max)
          segment.handleOut = {x: hx, y: hy};
      if (loop || i > paddingLeft)
          segment.handleIn = {x: -hx, y: -hy};
  }
}
