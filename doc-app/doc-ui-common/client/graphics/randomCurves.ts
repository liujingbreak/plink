// import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
// import {Segment} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {compose, applyToPoint, rotate, translate} from 'transformation-matrix';


interface BendOptions {
  /** [min, max], each value must be 0 - 1, min < max */
  vertexPosRange?: [number, number];
  /** value is -1 ~ - 1 */
  vertexNormalRange?: [number, number];
  closed?: boolean;
}

const DEFAULT_BEND_VERTEXT_RANGE: [number, number] = [0.35, 0.65];
const DEFAULT_BEND_VERTEXT_NORMAL_RANGE: [number, number] = [-0.15, 0.15];

export function bend(vertics: Iterable<[number, number]>, opts: BendOptions = {
  vertexNormalRange: DEFAULT_BEND_VERTEXT_NORMAL_RANGE,
  vertexPosRange: DEFAULT_BEND_VERTEXT_RANGE,
  closed: false
}) {
  if (opts.vertexPosRange == null)
    opts = {...opts, vertexPosRange: DEFAULT_BEND_VERTEXT_RANGE};
  if (opts.vertexNormalRange == null)
    opts = {...opts, vertexNormalRange: DEFAULT_BEND_VERTEXT_NORMAL_RANGE};
  if (opts.closed == null) {
    opts = {...opts, closed: !!opts.closed};
  }

  const ver: [number, number][] = [];
  let prevVer: [number, number]| undefined;

  for (const curr of vertics) {
    if (prevVer) {
      const newPoint = randomPointAtEdge(prevVer, curr, opts as Required<BendOptions>);
      ver.push(newPoint);
    }
    ver.push(curr);
    prevVer = curr;
  }
  if (opts.closed && prevVer) {
    ver.push(randomPointAtEdge(prevVer, ver[0], opts as Required<BendOptions>));
  }
  return ver;
}

function randomPointAtEdge(start: [number, number], end: [number, number], opts: Required<BendOptions>): [number, number] {
  const slope = (end[1] - start[1])/ (end[0] - start[0]);
  let slopeAng = Math.atan(slope);
  if (end[0] - start[0] < 0) {
    slopeAng = Math.PI + slopeAng;
  }

  // console.log('original', start, end, slopeAng);
  const toHorizontal = compose(rotate(-slopeAng), translate(-start[0], -start[1]));
  // const start0 = applyToPoint(toHorizontal, start); // should be 0
  const end0 = applyToPoint(toHorizontal, end);
  // console.log(start0, end0);

  const len = Math.abs(opts.vertexPosRange[1] - opts.vertexPosRange[0]);
  const randomPointX = Math.random() * len + opts.vertexPosRange[0];
  const randomPointY = Math.random() * Math.abs(opts.vertexNormalRange[1] - opts.vertexNormalRange[0]) + opts.vertexNormalRange[0];

  const transformBack = compose(translate(start[0], start[1]), rotate(slopeAng));
  // console.log(randomPointX, randomPointY, len);
  return applyToPoint(transformBack, [randomPointX * end0[0], randomPointY * end0[0]]);
}

