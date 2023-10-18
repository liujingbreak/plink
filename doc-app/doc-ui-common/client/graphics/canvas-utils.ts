/// <reference path="bezier-js.d.ts" />
import {applyToPoint, Matrix, transform, translate} from 'transformation-matrix';
import {mat4, vec3} from 'gl-matrix';
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

export type Point = {x: number; y: number; z?: number};
export type Point3d = [x: number, y: number, z: number];

export type SegmentNumbers = [
  pointX: number, pointY: number,
  handleInX?: (number | null), handleInY?: (number | null),
  handleOutX?: (number | null), handleOutY?: (number | null)
] | Float32Array;

export type Segment3dNumbers = [
  pointX: number, pointY: number, pointZ: number,
  handleInX?: (number | null), handleInY?: (number | null), handleInZ?: (number | null),
  handleOutX?: (number | null), handleOutY?: (number | null),  handleOutZ?: (number | null)
] | Float32Array;
/**
 * A paper.js segement like structure (http://paperjs.org/reference/segment/)
 * Each segment consists of an anchor point (segment.point) and optionaly an incoming and an outgoing handle (segment.handleIn and segment.handleOut), describing the tangents of the two Curve objects that are connected by this segment.
 */
export class Segment {
  point: Point3d = [0, 0, 0];
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
      this.point[0] = p[0];
      this.point[1] = p[1];
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
      this.point[0] = (point as Point).x;
      this.point[1] = (point as Point).y;
    }
    if (handleIn) {
      this.handleIn = {x: handleIn.x - this.point[0], y: handleIn.y - this.point[1]};
      if (handleIn.z != null)
        this.handleIn.z = handleIn.z - (this.point[2] ?? 0);
    }
    if (handleOut) {
      this.handleOut = {x: handleOut.x - this.point[0], y: handleOut.y - this.point[1]};
      if (handleOut.z != null)
        this.handleOut.z = handleOut.z - (this.point[2] ?? 0);
    }
  }

  round(method = Math.round) {
    const newSeg = new Segment({x: Math.round(this.point[0]), y: method(this.point[1])});
    if (this.handleIn) {
      newSeg.handleIn = {
        x: method(this.handleIn.x),
        y: method(this.handleIn.y)
      };
      if (this.handleIn.z != null)
        newSeg.handleIn.z = method(this.handleIn.z);
    }
    if (this.handleOut) {
      newSeg.handleOut = {
        x: method(this.handleOut.x),
        y: method(this.handleOut.y)
      };
      if (this.handleOut.z != null)
        newSeg.handleOut.z = method(this.handleOut.z);
    }
    return newSeg;
  }

  transform(matrix: Matrix) {
    const newSeg = this.clone();
    const p = applyToPoint(matrix, [newSeg.point[0], newSeg.point[0]]);
    newSeg.point[0] = p[0];
    newSeg.point[1] = p[1];
    newSeg.point[2] = 0;
    // matrix1 is the actual transformation plus getting a relative position of "handle point" by segment's "point" position
    const matrix1 = transform(
      // 3. Get "handle point"'s x and y coordinate value relative to "point"'s x and y value in absolute coordinate system
      translate(-newSeg.point[0], -newSeg.point[1]),
      // 2. Apply actual transformation on "point" (instead of "handle point")
      matrix
    );
    if (newSeg.handleIn) {
      newSeg.handleIn = applyToPoint(transform(
        matrix1,
        // 1. Based on initial coordinate system,
        // `translate` "point" position to "handle point"'s position
        translate(newSeg.handleIn.x, newSeg.handleIn.y)
      ), {x: this.point[0], y: this.point[1]});
    }
    if (newSeg.handleOut) {
      // console.log('matrix:\n', matrix2dToStr(transform( matrix1, translate(newSeg.handleOut.x, newSeg.handleOut.y))));
      newSeg.handleOut = applyToPoint(transform(
        matrix1,
        translate(newSeg.handleOut.x, newSeg.handleOut.y)
      ), {x: this.point[0], y: this.point[1]});
    }
    return newSeg;
  }

  transform3d(matrix: mat4) {
    const newSeg = this.clone();
    // const point3d = [this.point[0], this.point[1], this.point[2]] as vec3;
    const tempM = mat4.create();
    newSeg.point = vec3.transformMat4(vec3.create(), this.point, matrix) as Point3d;

    // matrix1 is the actual transformation plus getting a relative position of "handle point" by segment's "point" position
    const matrix1 = mat4.fromTranslation(mat4.create(), [-newSeg.point[0], -newSeg.point[1], -(newSeg.point[2])]);
    // 3. Get "handle point"'s x and y coordinate value relative to "point"'s x and y value in absolute coordinate system
    // 2. Apply actual transformation on "point" (instead of "handle point")
    mat4.mul(matrix1, matrix1, matrix);
    if (this.handleIn) {
      const vector = [this.handleIn.x, this.handleIn.y, this.handleIn.z ?? 0] as vec3;
      const m = mat4.mul(mat4.create(), matrix1, mat4.fromTranslation(tempM, vector));
      const v = vec3.transformMat4(vec3.create(), this.point, m);
      newSeg.handleIn!.x = v[0];
      newSeg.handleIn!.y = v[1];
      newSeg.handleIn!.z = v[2];
    }
    if (this.handleOut) {
      const vector = [this.handleOut.x, this.handleOut.y, this.handleOut.z ?? 0] as vec3;
      const m = mat4.mul(mat4.create(), matrix1, mat4.fromTranslation(tempM, vector));
      // console.log('point3d', point3d, '\n', mat4ToStr(m));
      const v = vec3.transformMat4(vec3.create(), this.point, m);
      newSeg.handleOut!.x = v[0];
      newSeg.handleOut!.y = v[1];
      newSeg.handleOut!.z = v[2];
    }
    return newSeg;
  }

  absHandleInPoint() {
    return this.handleIn ?
      [
        this.handleIn.x + this.point[0],
        this.handleIn.y + this.point[1],
        (this.handleIn.z ?? 0) + (this.point[2] ?? 0)
      ] as const
      : null;
  }

  absHandleOutPoint() {
    return this.handleOut ?
      [
        this.handleOut.x + this.point[0],
        this.handleOut.y + this.point[1],
        (this.handleOut.z ?? 0) + (this.point[2] ?? 0)
      ] as const
      : null;
  }

  clone() {
    const newSeg = new Segment({x: this.point[0], y: this.point[1]});
    newSeg.point[2] = this.point[2];

    if (this.handleIn) {
      newSeg.handleIn = {...this.handleIn};
    }
    if (this.handleOut) {
      newSeg.handleOut = {...this.handleOut};
    }
    return newSeg;
  }

  toBezier(endSeg: Segment) {
    return new Bezier(
      ...this.point,
      ...this.absHandleOutPoint()!,
      ...endSeg.absHandleInPoint()!,
      ...endSeg.point
    );
  }

  toNumbers(): Float32Array {
    const arr = Float32Array.of(this.point[0], this.point[1], 0, 0, 0, 0);
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
  to3dNumbers(): Float32Array {
    const {point} = this;
    const arr = Float32Array.of(point[0], point[1], (point[2] ?? 0), 0, 0, 0, 0, 0, 0);
    if (this.handleIn) {
      arr[3] = this.handleIn.x;
      arr[4] = this.handleIn.y;
      arr[5] = this.handleIn.z ?? 0;
    }
    if (this.handleOut) {
      arr[6] = this.handleOut.x;
      arr[7] = this.handleOut.y;
      arr[8] = this.handleOut.z ?? 0;
    }
    return arr;
  }
}

export const CIRCLE_BEZIER_CONST = 0.551915024494;

export const quarterCircleCurve = [
  new Segment({x: 0, y: 1, z: 0}, {x: -CIRCLE_BEZIER_CONST, y: 1, z: 0}, {x: CIRCLE_BEZIER_CONST, y: 1, z: 0}),
  new Segment({x: 1, y: 0, z: 0}, {x: 1, y: CIRCLE_BEZIER_CONST, z: 0}, {x: 1, y: -CIRCLE_BEZIER_CONST, z: 0})
];


/**
 * draw a 1/4 circle starts from [0, 1] counter-clock wise
 * @param startT 0 ~ 1, t value of a qaurter circle bezier curve
 * @param endT 0 ~ 1
 */
export function createBezierArch(startT: number, endT: number): [Segment, Segment] {
  const bez = quarterCircleCurve[0].toBezier(quarterCircleCurve[1]);
  const points = bez.split(startT, endT).points;
  return [new Segment(points[0], null, points[1]), new Segment(points[3], points[2])];
}

export function *transSegments(segs: Iterable<Segment>, matrix: Matrix) {
  for (const seg of segs) {
    yield seg.transform(matrix);
  }
}

export function *transSegments3d(segs: Iterable<Segment>, matrix: mat4) {
  for (const seg of segs) {
    yield seg.transform3d(matrix);
  }
}

export function concatSegments(segs: Iterable<Segment>) {
  const res = [] as Segment[];
  let lastSeg: Segment | undefined;
  for (const seg of segs) {
    if (lastSeg) {
      if (abs(lastSeg.point[0] - seg.point[0]) <= EPSILON && abs(lastSeg.point[1] - seg.point[1]) <= EPSILON) {
        if (lastSeg.handleOut == null && seg.handleOut) {
          lastSeg.handleOut = seg.handleOut;
        }
      } else {
        res.push(seg);
        lastSeg = seg;
      }
    } else {
      res.push(seg);
      lastSeg = seg;
    }
  }
  if (res.length >= 3) {
    const seg = res[0];
    if (abs(lastSeg!.point[0] - seg.point[0]) <= EPSILON && abs(lastSeg!.point[1] - seg.point[1]) <= EPSILON) {
      res.pop();
      if (lastSeg?.handleIn && res[0].handleIn == null)
        res[0].handleIn = lastSeg?.handleIn;
    }
  }
  return res;
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

export function drawSegmentPath(segs: Iterable<Segment>, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, opts?: {
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
      ctx.moveTo(p[0], p[1]);
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
        ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
      } else {
        if (opts?.debug)
          // eslint-disable-next-line no-console
          console.log('lineTo', p);
        ctx.lineTo(p[0], p[1]);
      }
    }
    i++;
  }
  if (opts?.closed) {
    const lastSeg = segements[segements.length - 1];
    if (segements[0].handleIn && lastSeg.handleOut) {
      const c1 = lastSeg.absHandleOutPoint()!;
      const c2 = segements[0].absHandleInPoint()!;
      ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], segements[0].point[0], segements[0].point[1]);
    } else {
      ctx.lineTo(origPoint![0], origPoint![1]);
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
      ctx.arc(p[0], p[1], opts.size >> 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    } else {
      const c1 = segements[i - 1].absHandleOutPoint();
      const c2 = seg.absHandleInPoint();
      if (c1 && c2) {
        ctx.beginPath();
        ctx.arc(c1[0], c1[1], opts.size >> 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(c2[0], c2[1], opts.size >> 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
      }
      ctx.beginPath();
      ctx.arc(p[0], p[1], opts.size >> 1, 0, Math.PI * 2);
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
      ctx.arc(c1[0], c1[1], opts.size >> 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.arc(c2[0], c2[1], opts.size >> 1, 0, Math.PI * 2);
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
    const [x, y] = segments[(j < 0 ? j + segments.length : j) % segments.length].point;
    knots[i] = {x, y};
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
    const hx = px[i] - pt[0];
    const hy = py[i] - pt[1];
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
        const bei = new Bezier(...lastSeg.point, ...lastSeg.absHandleOutPoint()!,
          ...seg.absHandleInPoint()!, ...seg.point);
        const box = bei.bbox();
        bounds.x.push(box.x);
        bounds.y.push(box.y);
      } else {
        let coord = {min: 0, max: 0};
        if (lastSeg.point[0] < seg.point[0]) {
          coord.min = lastSeg.point[0];
          coord.max = seg.point[0];
        } else {
          coord.max = lastSeg.point[0];
          coord.min = seg.point[0];
        }
        bounds.x.push(coord);
        coord = {min: 0, max: 0};
        if (lastSeg.point[1] < seg.point[1]) {
          coord.min = lastSeg.point[1];
          coord.max = seg.point[1];
        } else {
          coord.max = lastSeg.point[1];
          coord.min = seg.point[1];
        }
        bounds.y.push(coord);
      }
    }
    lastSeg = seg;
  }
  if (firstSeg?.handleIn && lastSeg?.handleOut && firstSeg !== lastSeg) {
    const bei = new Bezier(...lastSeg.point, ...lastSeg.absHandleOutPoint()!, ...firstSeg.absHandleInPoint()!, ...firstSeg.point);
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

export function centerOf(segs: Iterable<Segment>): [x: number, y: number] {
  const bounds = boundsOf(segs);

  return [bounds.x + bounds.w / 2, bounds.y + bounds.h / 2];
}

/** For 2d segments (including bezier curve)
 */
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
      const bezier = new Bezier(...lastVertex.point, ...lastVertex.absHandleOutPoint()!, ...seg.absHandleInPoint()!, ...seg.point);
      const tArr = bezier.lineIntersects(testLine);
      countIntersect += tArr.length;
      // if (tArr.length > 0) {
      //   intersectSegments.push([lastVertex.toNumbers(), seg.toNumbers()]);
      //   // console.log('intersect bezier curve', `t: (${tArr.join(',')})`, lastVertex.point, lastVertex.handleOut, seg.handleIn, seg.point);
      // }
    } else {
      // a straight line
      let minX = lastVertex.point[0];
      let maxX = seg.point[0];
      if (minX > maxX) {
        const temp = minX;
        minX = maxX;
        maxX = temp;
      }
      if (minX <= x - EPSILON && x + EPSILON <= maxX) {
        // intersection point's x value must be between minimum X and maximum X of straight line segment
        const dX = seg.point[0] - lastVertex.point[0];
        if (abs(dX) < EPSILON) {
          // A vertical line, slope will become infinite big, we only need to compare x value
          countIntersect++;
          // intersectSegments.push([lastVertex.toNumbers(), seg.toNumbers()]);
        } else {
          const slope = (seg.point[1] - lastVertex.point[1]) / (seg.point[0] - lastVertex.point[0]);
          const intersectionY = slope * (x - lastVertex.point[0]) + lastVertex.point[1];
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

export function mat4ToStr(m: mat4) {
  return [
    ['x:', m[0], m[4], m[8], m[12]].join(' '),
    ['y:', m[1], m[5], m[9], m[13]].join(' '),
    ['z:', m[2], m[6], m[10], m[14]].join(' '),
    ['w:', m[3], m[7], m[11], m[15]].join(' ')
  ].join('\n');
}

export function matrix2dToStr(m: Matrix) {
  return [
    ['x:', m.a, m.c, m.e].join(' '),
    ['y:', m.b, m.d, m.f].join(' ')
  ].join('\n');
}

