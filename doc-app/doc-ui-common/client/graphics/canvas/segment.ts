export * from '../canvas-utils';

type SegmentVertex = [number, number, number] | Float32Array;

/**
 * All vertices and handleIn/Out point are index number, actual float value is
 * stored in vertexArray
 */
export class SegmentIndexed {
  constructor(
    public vertexArray: SegmentVertex[],
    public pointIdx: number,
    public handleInIdx?: number,
    public handleOutIdx?: number
  ) {
  }

  get point() {
    return this.vertexArray[this.pointIdx];
  }

  get handleIn() {
    return this.handleInIdx != null ? this.vertexArray[this.handleInIdx] : null;
  }

  get handleOut() {
    return this.handleOutIdx != null ? this.vertexArray[this.handleOutIdx] : null;
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
