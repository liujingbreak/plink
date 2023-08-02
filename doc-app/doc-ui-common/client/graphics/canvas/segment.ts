import {Bezier} from 'bezier-js';
import {mat4, vec3} from 'gl-matrix';
import {getMinAndMax} from '@wfh/plink/wfh/dist-es/share/algorithms/minMax';
import {CIRCLE_BEZIER_CONST} from '../canvas-utils';
export * from '../canvas-utils';

// type SegmentVertex = [number, number, number] | Float32Array;

/**
 * All vertices and handleIn/Out point are index number, actual float value is
 * stored in vertexArray
 */
export class SegmentIndexed {
  constructor(
    public vertexArray: Float32Array,
    public pointIdx: number,
    public handleInIdx?: number | null,
    public handleOutIdx?: number | null
  ) {
  }

  get point() {
    return this.vertexArray.slice(this.pointIdx, this.pointIdx + 3);
  }

  get handleIn() {
    return this.handleInIdx != null ? this.vertexArray.slice(this.handleInIdx, this.handleInIdx + 3) : null;
  }

  get handleOut() {
    return this.handleOutIdx != null ? this.vertexArray.slice(this.handleOutIdx, this.handleOutIdx + 3) : null;
  }

  toBezier(endSeg: SegmentIndexed) {
    return new Bezier(
      ...this.point,
      ...this.handleOut!,
      ...endSeg.handleIn!,
      ...endSeg.point
    );
  }
}

// export function transformSegmentIndexed(segs: Iterable<SegmentIndexed>, m: mat4) {
//   const doneVertices = new Set<Float32Array>();
//   for (const seg of segs) {
//     const {vertexArray} = seg;
//     if (!doneVertices.has(vertexArray)) {
//       doneVertices.add(vertexArray);
//       const temp = vec3.create();
//       for (let i = 0, l = vertexArray.length; i < l; i += 3) {
//         vec3.transformMat4(temp, seg.vertexArray.slice(i, i + 3), m);
//       }
//     }
//   }
// }

export function transVertecArr(arr: Float32Array | number[], m: mat4, arrOffset = 0, numOfVertices?: number) {
  const temp = vec3.create();
  for (let i = arrOffset, l = numOfVertices != null ? arrOffset + numOfVertices * 3 : arr.length; i < l; i += 3) {
    vec3.transformMat4(temp, arr.slice(i, i + 3) as [number, number, number], m);
    arr[i] = temp[0];
    arr[i + 1] = temp[1];
    arr[i + 2] = temp[2];
  }
}

export function drawSegmentIndexedPath(
  segs: Iterable<SegmentIndexed>,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  opts?: {
    closed?: boolean;
    // round?: boolean | ((x: number) => number);
    debug?: boolean;
  }
) {
  let i = 0;
  let origPoint: SegmentIndexed['point'];

  const segements = Array.isArray(segs) ? segs as SegmentIndexed[] : Array.from(segs);

  // if (opts?.round) {
  //   const round = typeof opts.round === 'function' ? opts.round : Math.round;
  //   segements = segements.map(seg => seg.round(round));
  // }

  for (const seg of segements) {
    const p = seg.point;
    if (i === 0) {
      origPoint = p;
      ctx.moveTo(p[0], p[1]);
      if (opts?.debug)
      // eslint-disable-next-line no-console
        console.log('moveTo', p[0], p[1]);
    } else {
      const c1 = segements[i - 1].handleOut;
      const c2 = seg.handleOut;

      if (c1 && c2) {
        if (opts?.debug)
          // eslint-disable-next-line no-console
          console.log('bezierCurveTo', c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
        ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
      } else {
        if (opts?.debug)
          // eslint-disable-next-line no-console
          console.log('lineTo', p[0], p[1]);
        ctx.lineTo(p[0], p[1]);
      }
    }
    i++;
  }
  if (opts?.closed) {
    const lastSeg = segements[segements.length - 1];
    if (segements[0].handleIn && lastSeg.handleOut) {
      const c1 = lastSeg.handleOut;
      const c2 = segements[0].handleIn;
      ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], segements[0].point[0], segements[0].point[1]);
    } else {
      ctx.lineTo(origPoint![0], origPoint![1]);
    }
  }
  return segements;
}

export function boundsOf3dSurface(segs: Iterable<SegmentIndexed>) {
  const [minX, maxX] = getMinAndMax<SegmentIndexed>(segs, (a, b) => {
    return a.point[0] - b.point[0];
  });

  const [minY, maxY] = getMinAndMax<SegmentIndexed>(segs, (a, b) => {
    return a.point[1] - b.point[1];
  });

  const [minZ, maxZ] = getMinAndMax<SegmentIndexed>(segs, (a, b) => {
    return a.point[2] - b.point[2];
  });

  return minX != null ?
    {
      x: minX.point[0],
      y: minY!.point[1],
      z: minZ!.point[2],
      w: maxX!.point[0] - minX.point[0],
      h: maxY!.point[1] - minY!.point[1],
      d: maxZ!.point[2] - minZ!.point[2]
    }
    : null;
}

const CIRCLE_CURVE_VERTEX_ARR = Float32Array.of(
  0, 1, 0,
  -CIRCLE_BEZIER_CONST, 1, 0,
  CIRCLE_BEZIER_CONST, 1, 0,

  1, 0, 0,
  1, CIRCLE_BEZIER_CONST, 0,
  1, -CIRCLE_BEZIER_CONST, 0
);

export function createQuarterCircleCurve() {
  const segmentVertexArr = Float32Array.from(CIRCLE_CURVE_VERTEX_ARR);
  return [
    new SegmentIndexed(segmentVertexArr, 0, 3, 6),
    new SegmentIndexed(segmentVertexArr, 9, 12, 15)
  ];
}


/**
 * draw a 1/4 circle starts from [0, 1] counter-clock wise
 * @param startT 0 ~ 1, t value of a qaurter circle bezier curve
 * @param endT 0 ~ 1
 */
export function createBezierArchIndexed(startT: number, endT: number): [SegmentIndexed, SegmentIndexed] {
  const quarterCircleCurve = createQuarterCircleCurve();
  const bez = quarterCircleCurve[0].toBezier(quarterCircleCurve[1]);
  const points = bez.split(startT, endT).points;
  const vertexArr = Float32Array.of(
    points[0].x, points[0].y, points[0].z ?? 0,
    points[1].x, points[1].y, points[1].z ?? 0,
    points[3].x, points[3].y, points[3].z ?? 0,
    points[2].x, points[2].y, points[2].z ?? 0
  );
  return [new SegmentIndexed(vertexArr, 0, null, 1), new SegmentIndexed(vertexArr, 3, 2)];
}
