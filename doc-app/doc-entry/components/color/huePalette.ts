import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import Color from 'color';
import {castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit';
import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
import {Segment, transSegments, reverseSegments, drawSegmentPath, createBezierArch} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {transform, scale, translate, applyToPoint, rotate} from 'transformation-matrix';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface huePaletteState {
}

const huePaletteReducers = {
};

export function createPaintables(pctx: PaintableContext): Iterable<PaintableSlice<any, any>> {
  const hueState: huePaletteState = {};
  const huePaletteSlice = pctx.createPosPaintable({
    name: 'huePalette',
    extendInitialState: hueState,
    extendReducers: huePaletteReducers,
    debug: true
  });

  const numOfColors = 24;
  const archRatio = 1 / (numOfColors / 4);

  const fanShapes = [] as Iterable<Segment>[];
  const colors: string[] = [];
  const angle = Math.PI * 2 / numOfColors;
  const angleDeg = 360 / numOfColors;

  const curveSegs = createBezierArch(0, archRatio);

  const smallCurveSegs = [...transSegments(curveSegs, scale(0.7))];
  // const originSeg = new Segment({x: 0, y: 0});
  let lastCurveEnd = curveSegs[0];
  let lastSmallCurveEnd = smallCurveSegs[0];

  const shape = [...reverseSegments(smallCurveSegs), ...curveSegs];

  for (let i = 0, last = numOfColors - 1; i < numOfColors; i++) {
    const rotatedShape = Array.from(transSegments(shape, rotate(-angle * i)));

    rotatedShape[1].point = lastSmallCurveEnd.point; // make twe adjacent curve share some point, so that avoid T-joint issue
    rotatedShape[2].point = lastCurveEnd.point;
    if (i === last) {
      rotatedShape[0].point = smallCurveSegs[0].point;
      rotatedShape[3].point = curveSegs[0].point;
    }
    lastSmallCurveEnd = rotatedShape[0];
    lastCurveEnd = rotatedShape[3];
    fanShapes[i] = rotatedShape;

    colors.push(new Color().hue(angleDeg * i).lightness(50).saturationl(70).alpha(0.8).toString());
  }

  const centerOfFanShape = {x: 0, y: 0}; // centerOf(segs);

  huePaletteSlice.addEpic(huePaletteSlice => {
    return action$ => {
      const actionByType = castByActionType(huePaletteSlice.actions, action$);
      return rx.merge(
        actionByType.render.pipe(
          op.map(({payload: ctx}) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            const scaleTo = Math.min(pctx.getState().width, pctx.getState().height) / 2;
            const centerOfFanShapeReal = applyToPoint(scale(scaleTo, scaleTo), centerOfFanShape);
            const transformMatrix = transform(
              translate((pctx.getState().width >> 1) - centerOfFanShapeReal.x, (pctx.getState().height >> 1) - centerOfFanShapeReal.y ),
              scale(scaleTo, scaleTo));

            let i = 0;
            for (const segs of fanShapes) {
              const transfomedFanShape = [...transSegments(segs, transformMatrix)];
              ctx.fillStyle = colors[i];
              ctx.beginPath();
              drawSegmentPath(transfomedFanShape, ctx, {closed: true, round: true, debug: false});
              ctx.closePath();
              ctx.fill();
              i++;
            }
          })
        )
      ).pipe(op.ignoreElements());
    };
  });
  return [huePaletteSlice];
}
