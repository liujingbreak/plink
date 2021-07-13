import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
// import Color from 'color';
import {castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit';
import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
import {quarterCircleCurve, Segment, transSegments, drawSegmentPath, centerOf, createBezierArch} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
import {transform, scale, translate, applyToPoint} from 'transformation-matrix';

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

  const segs = createBezierArch(0, 0.5);
  segs.unshift(new Segment({x: 0, y: 0}));

  const centerOfFanShape = centerOf(segs);

  huePaletteSlice.addEpic(huePaletteSlice => {
    return action$ => {
      const actionByType = castByActionType(huePaletteSlice.actions, action$);
      return rx.merge(
        actionByType.render.pipe(
          op.map(({payload: ctx}) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            const scaleTo = Math.min(pctx.getState().width, pctx.getState().height) * 2 / 3;
            const centerOfFanShapeReal = applyToPoint(scale(scaleTo, scaleTo), centerOfFanShape);
            const transfomedFanShape = [...transSegments(segs, transform(
              translate((pctx.getState().width >> 1) - centerOfFanShapeReal.x, (pctx.getState().height >> 1) - centerOfFanShapeReal.y ),
              scale(scaleTo, scaleTo)))];

            ctx.beginPath();
            drawSegmentPath(transfomedFanShape, ctx, {closed: true, round: true, debug: true});
            ctx.closePath();
            ctx.fill();
          })
        )
      ).pipe(op.ignoreElements());
    };
  });
  return [huePaletteSlice];
}
