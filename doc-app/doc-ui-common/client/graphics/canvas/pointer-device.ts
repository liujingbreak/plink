import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Paintable, createPaintable} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2';

export function createController(parent: Paintable) {
  const [ctl, state, {attached$}] = createPaintable();
  const {payloadByType: pt} = ctl;

  rx.merge(
    attached$().pipe(
      op.switchMap(([state]) => {
        const {canvasEngine} = state;
        return canvasEngine.canvasController.payloadByType._onClick.pipe(
          // eslint-disable-next-line no-console
          op.map(([x, y]) => console.log(x, y))
        );
      })
    ),
    pt.renderContent.pipe(
      op.map(([ctx, state]) => {
      })
    )
  ).subscribe();
}
