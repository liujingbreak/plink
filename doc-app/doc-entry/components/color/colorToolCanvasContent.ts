import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {compose, scale} from 'transformation-matrix';
import {PaintableCtl, PaintableState, createControl} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/paintable';
import {alignToParent} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/paintable-utils';
import {createBezierArch, Segment, transSegments} from '@wfh/doc-ui-common/client/graphics/canvas-utils';

export function createHueCircle(root: PaintableCtl, rootState: PaintableState) {

  const [singleHueCtrl, singleHueState] = createControl();
  const curveSegs = [new Segment({x: 0, y: 0}), ...createBezierArch(0, 1)];
  console.log(curveSegs);

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
        console.log('renderContent', state, [...transSegments(curveSegs, state.transform)]);
      })
    )
  );
}


