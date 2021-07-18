import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import Color from 'color';
import {castByActionType} from '@wfh/redux-toolkit-observable/es/tiny-redux-toolkit';
import {PaintableContext, PaintableSlice} from '@wfh/doc-ui-common/client/graphics/reactiveCanvas.state';
import {Segment, transSegments, drawSegmentPath, createBezierArch} from '@wfh/doc-ui-common/client/graphics/canvas-utils';
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
  const archRatio = 4 / numOfColors;

  const fanShapes = new Array<Iterable<Segment>>(numOfColors);
  const colors: string[] = [];
  const angle = Math.PI * 2 / numOfColors;
  const angleDeg = 360 / numOfColors;
  for (let i = 0; i < numOfColors; i++) {
    const segs = createBezierArch(0, archRatio);
    segs.unshift(new Segment({x: 0, y: 0}));

    fanShapes[i] = transSegments(segs, rotate(angle * i));
    colors.push(new Color().hue(angleDeg * i).lightness(50).saturationl(70).alpha(0.5).toString());
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
