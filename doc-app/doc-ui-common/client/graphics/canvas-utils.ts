/// <reference path="bezier-js.d.ts" />
import {applyToPoint, Matrix, transform, translate} from 'transformation-matrix';
import {Bezier} from 'bezier-js';
import glur from 'glur';
import type Color from 'color';

// float precision significant decimal
const EPSILON = 0.000001;
const {abs} = Math;

export function approximately(a: number, b: number, precision?: number) {
  return abs(a - b) <= (precision || EPSILON);
}
// import {getMinAndMax} from '@wfh/plink/wfh/dist-es5/utils/algorithms';

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
    grad = gctx.createLinearGradient(0, 0, 0, gradCv.height);
  }
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, width, height);
  gctx.globalCompositeOperation = 'source-in';
  drawFn(gctx);
  // gctx.drawImage(target, 0,0);
  return gradCv;
}

export function blur(ctx: CanvasRenderingContext2D, x = 0, y = 0, width = ctx.canvas.width, height = ctx.canvas.height) {
  const imgData = ctx.getImageData(x, y, width, height);
  const {data} = imgData;
  glur(// data.data as any,
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    imgData.width, imgData.height, 55);
  ctx.putImageData(imgData, x, y);
}

const round = Math.round;

export type Point = {x: number; y: number};
export type SegmentNumbers = [
  pointX: number, pointY: number,
  handleInX?: (number | null), handleInY?: (number | null),
  handleOutX?: (number | null), handleOutY?: (number | null)
] | Float32Array;
/**
 * A paper.js segement like structure (http://paperjs.org/reference/segment/)
 * Each segment consists of an anchor point (segment.point) and optionaly an incoming and an outgoing handle (segment.handleIn and segment.handleOut), describing the tangents of the two Curve objects that are connected by this segment.
 */
export class Segment {
  // static from(pointX: number, pointY: number, handleInX: number, handleInY: number, handleOutX: number, handleOutY: number) {
  //   return new Segment({x: pointX, y: pointY}, {x: handleInX, y: handleInY}, {x: handleOutX, y: handleOutY});
  // }
  point: Point = {x: 0, y: 0};
  /** Relative to this.point */
  handleIn?: Point;
  /** Relative to this.point */
  handleOut?: Point;

  constructor(coordinates: SegmentNumbers);
  constructor(point: Point, handleIn?: Point | null, handleOut?: Point);
  constructor(
    point: Point | SegmentNumbers,
    handleIn?: Point | null,
    handleOut?: Point
  ) {
    if (Array.isArray(point) || (point as Float32Array).buffer) {
      const p = point as Float32Array;
      this.point.x = p[0];
      this.point.y = p[1];
      if (p[2] != null && p[3] != null && (p[2] !== 0 && p[3] !== 0)) {
        this.handleIn = {
          x: p[2],
          y: p[3]
        };
      }
      if (p[4] != null && p[5] != null && (p[4] !== 0 && p[5] !== 0)) {
        this.handleOut = {
          x: p[4]!,
          y: p[5]!
        };
      }
    } else {
      this.point = point as Point;
    }
    if (handleIn) {
      this.handleIn = {x: handleIn.x - this.point.x, y: handleIn.y - this.point.y};
    }
    if (handleOut) {
      this.handleOut = {x: handleOut.x - this.point.x, y: handleOut.y - this.point.y};
    }
  }

  round(method = Math.round) {
    const newSeg = new Segment({x: Math.round(this.point.x), y: method(this.point.y)});
    if (this.handleIn) {
      newSeg.handleIn = {
        x: method(this.handleIn.x),
        y: method(this.handleIn.y)
      };
    }
    if (this.handleOut) {
      newSeg.handleOut = {
        x: method(this.handleOut.x),
        y: method(this.handleOut.y)
      };
    }
    return newSeg;
  }

  transform(matrix: Matrix) {
    const newSeg = this.clone();
    // console.log('transform', matrix, newSeg.point);
    newSeg.point = applyToPoint(matrix, newSeg.point);
    // matrix 1 is the actual transformation plus getting a relative position of "handle point" by segment's "point" position
    const matrix1 = transform(
      // 3. Get "handle point"'s x and y coordinate value relative to "point"'s x and y value in absolute coordinate system
      translate(-newSeg.point.x, -newSeg.point.y),
      // 2. Apply actual transformation on "point" (instead of "handle point")
      matrix
    );
    if (newSeg.handleIn) {
      newSeg.handleIn = applyToPoint(transform(
        matrix1,
        // 1. Based on initial coordinate system,
        // `translate` "point" position to "handle point"'s position
        translate(newSeg.handleIn.x, newSeg.handleIn.y)
      ), this.point);
    }
    if (newSeg.handleOut) {
      newSeg.handleOut = applyToPoint(transform(
        matrix1,
        translate(newSeg.handleOut.x, newSeg.handleOut.y)
      ), this.point);
    }
    return newSeg;
  }

  absHandleInPoint() {
    return this.handleIn ?
      {x: this.handleIn.x + this.point.x, y: this.handleIn.y + this.point.y}
      : null;
  }

  absHandleOutPoint() {
    return this.handleOut ?
      {x: this.handleOut.x + this.point.x, y: this.handleOut.y + this.point.y}
      : null;
  }

  clone() {
    const newSeg = new Segment({x: this.point.x, y: this.point.y});
    if (this.handleIn) {
      newSeg.handleIn = {...this.handleIn};
    }
    if (this.handleOut) {
      newSeg.handleOut = {...this.handleOut};
    }
    return newSeg;
  }

  toNumbers(): Float32Array {
    // const arr = [this.point.x, this.point.y, null, null, null, null] as [number, number, number | null, number | null, number | null, number | null];
    const arr = Float32Array.of(this.point.x, this.point.y, 0, 0, 0, 0);
    if (this.handleIn) {
      arr[2] = this.handleIn.x;
      arr[3] = this.handleIn.y;
    }
    if (this.handleOut) {
      arr[4] = this.handleOut.x;
      arr[5] = this.handleOut.y;
    }
    return arr;
  }
}

export const CIRCLE_BEZIER_CONST = 0.551915024494;

export const quarterCircleCurve = [
  new Segment({x: 0, y: 1}, {x: -CIRCLE_BEZIER_CONST, y: 1}, {x: CIRCLE_BEZIER_CONST, y: 1}),
  new Segment({x: 1, y: 0}, {x: 1, y: CIRCLE_BEZIER_CONST}, {x: 1, y: -CIRCLE_BEZIER_CONST})
];


/**
 * draw a 1/4 circle starts frome [0, 1] counter-clocl wise 
 * @param startT 0 ~ 1, t value of a qaurter circle bezier curve
 * @param endT 0 ~ 1
 */
export function createBezierArch(startT: number, endT: number): [Segment, Segment] {
  const bez = new Bezier(quarterCircleCurve[0].point, quarterCircleCurve[0].absHandleOutPoint()!, quarterCircleCurve[1].absHandleInPoint()!, quarterCircleCurve[1].point);
  const points = bez.split(startT, endT).points;
  return [new Segment(points[0], null, points[1]), new Segment(points[3], points[2])];
}

export function *transSegments(segs: Iterable<Segment>, matrix: Matrix) {
  for (const seg of segs) {
    yield seg.transform(matrix);
  }
}

export function *createSegments(vertices: Iterable<[x: number, y: number]>): Iterable<Segment> {
  for (const p of vertices) {
    yield new Segment({x: p[0], y: p[1]});
  }
}

export function reverseSegments(segs: Iterable<Segment>) {
  return Array.from(segs).reverse().map(seg => {
    const newSeg = seg.clone();
    const handleIn = newSeg.handleIn;
    newSeg.handleIn = newSeg.handleOut;
    newSeg.handleOut = handleIn;
    return newSeg;
  });
}

export function drawSegmentPath(segs: Iterable<Segment>, ctx: CanvasRenderingContext2D, opts?: {
  closed?: boolean;
  round?: boolean | ((x: number) => number);
  debug?: boolean;
}): Segment[] {
  let i = 0;
  let origPoint: Segment['point'];

  let segements = Array.isArray(segs) ? segs as Segment[] : Array.from(segs);

  if (opts?.round) {
    const round = typeof opts.round === 'function' ? opts.round : Math.round;
    segements = segements.map(seg => seg.round(round));
  }

  for (const seg of segements) {
    const p = seg.point;
    if (i === 0) {
      origPoint = p;
      ctx.moveTo(p.x, p.y);
      if (opts?.debug)
      // eslint-disable-next-line no-console
        console.log('moveTo', p);
    } else {
      const c1 = segements[i - 1].absHandleOutPoint();
      const c2 = seg.absHandleInPoint();

      if (c1 && c2) {
        if (opts?.debug)
          // eslint-disable-next-line no-console
          console.log('bezierCurveTo', c1, c2, p);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
      } else {
        if (opts?.debug)
          // eslint-disable-next-line no-console
          console.log('lineTo', p);
        ctx.lineTo(p.x, p.y);
      }
    }
    i++;
  }
  if (opts?.closed) {
    const lastSeg = segements[segements.length - 1];
    if (segements[0].handleIn && lastSeg.handleOut) {
      const c1 = lastSeg.absHandleOutPoint()!;
      const c2 = segements[0].absHandleInPoint()!;
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, segements[0].point.x, segements[0].point.y);
    } else {
      ctx.lineTo(origPoint!.x, origPoint!.y);
    }
  }
  return segements;
}

export function drawSegmentCtl(segs: Iterable<Segment>, ctx: CanvasRenderingContext2D, opts: {closed?: boolean; round?: boolean; size?: number} = {}) {
  let i = 0;
  let segements = Array.from(segs).map(seg => seg.round());

  if (opts?.round)
    segements = segements.map(seg => seg.round());

  if (opts.size == null)
    opts.size = 10;

  for (const seg of segements) {
    const p = seg.point;
    if (i === 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, opts.size >> 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    } else {
      const c1 = segements[i - 1].absHandleOutPoint();
      const c2 = seg.absHandleInPoint();
      if (c1 && c2) {
        ctx.beginPath();
        ctx.arc(c1.x, c1.y, opts.size >> 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(c2.x, c2.y, opts.size >> 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, opts.size >> 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    }
    i++;
  }
  if (opts.closed) {
    const lastSeg = segements[segements.length - 1];
    if (segements[0].handleIn && lastSeg.handleOut) {
      const c1 = lastSeg.absHandleOutPoint()!;
      const c2 = segements[0].absHandleInPoint()!;
      ctx.beginPath();
      ctx.arc(c1.x, c1.y, opts.size >> 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.arc(c2.x, c2.y, opts.size >> 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();
    }
  }
}

export function drawBounds(segs: Iterable<Segment>, ctx: CanvasRenderingContext2D) {
  const rect = boundsOf(segs);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

export function smoothSegments(segments: Segment[], opts: {
  from?: number; to?: number; closed?: boolean; type?: 'asymmetric' | 'continuous';
}): void {
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
  const  n_1 = n - 1;
  const  rx = [x];
  const  ry = [y];
  const  rf = [f];
  const  px: number[] = [];
  const  py: number[] = [];
  // Solve with the Thomas algorithm
  for (let i = 1; i < n; i++) {
    const internal = i < n_1;
    //  internal--(I)  asymmetric--(R) (R)--continuous
    const a = internal ? 1 : asymmetric ? 1 : 2;
    const b = internal ? 4 : asymmetric ? 2 : 7;
    const u = internal ? 4 : asymmetric ? 3 : 8;
    const v = internal ? 2 : asymmetric ? 0 : 1;
    const m = a / f;
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

export type Rectangle = {x: number; y: number; w: number; h: number};

export function boundsOf(segs: Iterable<Segment>, roundResult = false): Rectangle {
  let lastSeg: Segment | undefined;
  let firstSeg: Segment | undefined;
  const bounds: {x: {min: number; max: number}[]; y: {min: number; max: number}[]} = {x: [], y: []};
  // console.log([...segs].map(seg => seg.point));
  for (const seg of segs) {
    if (firstSeg == null)
      firstSeg = seg;
    if (lastSeg ) {
      if (seg.handleIn && lastSeg.handleOut) {
        const bei = new Bezier(lastSeg.point, lastSeg.absHandleOutPoint()!,
          seg.absHandleInPoint()!, seg.point);
        const box = bei.bbox();
        bounds.x.push(box.x);
        bounds.y.push(box.y);
      } else {
        let coord = {min: 0, max: 0};
        if (lastSeg.point.x < seg.point.x) {
          coord.min = lastSeg.point.x;
          coord.max = seg.point.x;
        } else {
          coord.max = lastSeg.point.x;
          coord.min = seg.point.x;
        }
        bounds.x.push(coord);
        coord = {min: 0, max: 0};
        if (lastSeg.point.y < seg.point.y) {
          coord.min = lastSeg.point.y;
          coord.max = seg.point.y;
        } else {
          coord.max = lastSeg.point.y;
          coord.min = seg.point.y;
        }
        bounds.y.push(coord);
      }
    }
    lastSeg = seg;
  }
  if (firstSeg?.handleIn && lastSeg?.handleOut && firstSeg !== lastSeg) {
    const bei = new Bezier(lastSeg.point, lastSeg.absHandleOutPoint()!, firstSeg.absHandleInPoint()!, firstSeg.point);
    const box = bei.bbox();
    // console.log(box);
    bounds.x.push(box.x);
    bounds.y.push(box.y);
  }
  // console.log(bounds);
  const minOfXMins = bounds.x.reduce((prev, curr) => {
    return prev.min < curr.min ? prev : curr;
  }).min;

  const maxOfXMaxs = bounds.x.reduce((prev, curr) => {
    return prev.max > curr.max ? prev : curr;
  }).max;

  const minOfYMins = bounds.y.reduce((prev, curr) => {
    return prev.min < curr.min ? prev : curr;
  }).min;

  const maxOfYMaxs = bounds.y.reduce((prev, curr) => {
    return prev.max > curr.max ? prev : curr;
  }).max;

  return roundResult ?
    {
      x: round(minOfXMins), y: round(minOfYMins),
      w: round(maxOfXMaxs - minOfXMins),
      h: round(maxOfYMaxs - minOfYMins)
    }
    : {
      x: minOfXMins, y: minOfYMins,
      w: maxOfXMaxs - minOfXMins,
      h: maxOfYMaxs - minOfYMins
    };
}

export function centerOf(segs: Iterable<Segment>): {x: number; y: number} {
  const bounds = boundsOf(segs);

  return {x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2};
}

export function isInsideSegments(x: number, y: number, segements: Array<Segment> | SegmentNumbers[]) {
  const testLine = {p1: {x, y}, p2: {x, y: Number.MAX_VALUE}}; // test line starts from (x,y) and pointing to upside vertically
  // const intersectSegments = [] as [Float32Array, Float32Array][];
  let countIntersect = 0;
  let lastVertex = segements[0] instanceof Segment ?
    segements[segements.length - 1] as Segment :
    new Segment(segements[segements.length - 1] as Float32Array);

  for (let i = 0, l = segements.length; i < l; i++) {
    const vertex = segements[i];
    const seg = vertex instanceof Segment ? vertex : new Segment(vertex as Float32Array);
    if (lastVertex.handleOut != null && seg.handleIn != null) {
      // In case of bezier curve
      const bezier = new Bezier(lastVertex.point, lastVertex.absHandleOutPoint()!, seg.absHandleInPoint()!, seg.point);
      const tArr = bezier.lineIntersects(testLine);
      countIntersect += tArr.length;
      // if (tArr.length > 0) {
      //   intersectSegments.push([lastVertex.toNumbers(), seg.toNumbers()]);
      //   // console.log('intersect bezier curve', `t: (${tArr.join(',')})`, lastVertex.point, lastVertex.handleOut, seg.handleIn, seg.point);
      // }
    } else {
      // a straight line
      let minX = lastVertex.point.x;
      let maxX = seg.point.x;
      if (minX > maxX) {
        const temp = minX;
        minX = maxX;
        maxX = temp;
      }
      if (minX <= x - EPSILON && x + EPSILON <= maxX) {
        // intersection point's x value must be between minimum X and maximum X of straight line segment
        const dX = seg.point.x - lastVertex.point.x;
        if (abs(dX) < EPSILON) {
          // A vertical line, slope will become infinite big, we only need to compare x value
          countIntersect++;
          // intersectSegments.push([lastVertex.toNumbers(), seg.toNumbers()]);
        } else {
          const slope = (seg.point.y - lastVertex.point.y) / (seg.point.x - lastVertex.point.x);
          const intersectionY = slope * (x - lastVertex.point.x) + lastVertex.point.y;
          if (intersectionY >= y - EPSILON) {
            // intersectSegments.push([lastVertex.toNumbers(), seg.toNumbers()]);
            countIntersect++;
          }
        }
      }
    }
    lastVertex = seg;
  }
  // console.log('count intersections', countIntersect);
  return countIntersect % 2 !== 0;
}

export function colorToRgbaStr(color: Color) {
  return `rgba(${Math.round(color.red())},${Math.round(color.green())},${Math.round(color.blue())},${color.alpha().toFixed(2)})`;
}
