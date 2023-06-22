import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {compose, scale} from 'transformation-matrix';
import {PaintableCtl, PaintableState, createPaintable, ReactiveCanvas2Control} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/reactiveCanvas2.control';
import {alignToParent} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/paintable-utils';
import {animate} from '@wfh/doc-ui-common/client/animation/ease-functions';
import {createBezierArch, Segment, transSegments, drawSegmentPath} from '@wfh/doc-ui-common/client/graphics/canvas-utils';

export function createHueCircle(root: PaintableCtl, rootState: PaintableState, canvasCtl: ReactiveCanvas2Control) {

  const [singleHueCtrl, singleHueState] = createPaintable();
  let curveSegs = [new Segment({x: 0, y: 0}), ...createBezierArch(0, 1)];

  const {dispatcher, actionOfType: aot} = singleHueCtrl;
  dispatcher.attachTo(root, rootState);
  dispatcher.setRelativeSize(0.25, 0.25);
  let scaleRatio = 1;

  return rx.merge(
    alignToParent(singleHueCtrl, singleHueState),
    new rx.Observable(sub => {
      dispatcher.putTransformOperator( 'scale',
        matrix$ => matrix$.pipe(
          op.map(m => compose(m, scale(scaleRatio)))
        )
      );
      sub.complete();
    }),

    rx.concat(
      rx.of({payload: [singleHueState.width, singleHueState.height] as const}),
      aot('onResize')
    ).pipe(
      op.tap(({payload: [w, h]}) => {
        const size = Math.min(w, h);
        scaleRatio = size;
        dispatcher.setTransformDirty(true);
      })
    ),

    aot('renderContent').pipe(
      op.map(({payload: [ctx, state]}) => {
        const transformed = [...transSegments(curveSegs, state.transform)];
        ctx.fillStyle = 'red';
        ctx.beginPath();
        drawSegmentPath(transformed, ctx, {round: true});
        ctx.closePath();
        ctx.fill();
      })
    ),
    aot('renderContent').pipe(
      op.take(1),
      op.switchMap(() => animate(0, 1, 2000, 'ease-out')),
      op.map(v => {
        curveSegs = [new Segment({x: 0, y: 0}), ...createBezierArch(0, v)];
      })
    )
  );
}


