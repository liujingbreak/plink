// import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
// import {Segment} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {transform, applyToPoint, rotate, translate} from 'transformation-matrix';

const random = Math.random;
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
      const newPoint = randomPointToEdge(prevVer, curr, opts as Required<BendOptions>);
      ver.push(newPoint);
    }
    ver.push(curr);
    prevVer = curr;
  }
  if (opts.closed && prevVer) {
    ver.push(randomPointToEdge(prevVer, ver[0], opts as Required<BendOptions>));
  }
  return ver;
}

function randomPointToEdge(start: [number, number], end: [number, number], opts: Required<BendOptions>): [number, number] {
  const slope = (end[1] - start[1]) / (end[0] - start[0]);
  let slopeAng = Math.atan(slope);
  if (end[0] - start[0] < 0) {
    slopeAng = Math.PI + slopeAng;
  }

  // console.log('original', start, end, slopeAng);
  const toHorizontal = transform(rotate(-slopeAng), translate(-start[0], -start[1]));
  // const startTransformed = applyToPoint(toHorizontal, start); // should be 0

  const endTransformed = applyToPoint(toHorizontal, end);

  // console.log(startTransformed, endTransformed);

  const len = Math.abs(opts.vertexPosRange[1] - opts.vertexPosRange[0]);
  const randomPointX = random() * len + opts.vertexPosRange[0];
  const randomPointY = random() * Math.abs(opts.vertexNormalRange[1] - opts.vertexNormalRange[0]) + opts.vertexNormalRange[0];

  const transformBack = transform(translate(start[0], start[1]), rotate(slopeAng));
  // console.log(randomPointX, randomPointY, len);
  return applyToPoint(transformBack, [randomPointX * endTransformed[0], randomPointY * endTransformed[0]]);
}

export function randomNumbers(min: number, max: number, numOfNum = 1): number[] {
  const delta = max - min;
  const sep = delta / numOfNum;
  let lower = min;

  const result = new Array<number>(numOfNum);
  for (let i = 0; i < numOfNum; i++) {
    result[i] = lower + sep * random();
    lower += sep;
  }
  return result;
}

const TWO_PI = Math.PI * 2;

export function randomePointInsideCircle(origPoint: [number, number], radiusRange: [number, number]) {
  radiusRange = ensureRange(...radiusRange);
  const radius = Math.random() * (radiusRange[1] - radiusRange[0]) + radiusRange[0];
  const angle = Math.random() * TWO_PI;
  const changed = applyToPoint(transform(rotate(angle), translate(radius, 0)), [0,0]);
  return applyToPoint(translate(changed[0], changed[1]), origPoint);
}

function ensureRange(...range: [number, number]) {
  if (range[0] > range[1]) {
    const temp = range[0];
    range[0] = range[1];
    range[1] = temp;
  }
  return range;
}
