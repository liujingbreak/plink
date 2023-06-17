import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {compose, translate} from 'transformation-matrix';
import {PaintableCtl, PaintableState, parentChange$} from './paintable';

type AlignmentValues = 'left' | 'center' | 'right' | 'top' | 'down';

/** change transform  matrix relative to parent size,
 * default is 'center'
 * TODO: implement for 'left', 'right', ...
 */
export function alignToParent(
  targetPaintable: PaintableCtl,
  targetPaintableState: PaintableState,
  _opts: {vertical?: AlignmentValues; horizontal?: AlignmentValues} = {}) {

  const {actionOfType: act, dispatcher} = targetPaintable;
  return parentChange$(targetPaintable, targetPaintableState).pipe(
    op.switchMap(({payload: [parent, pState]}) => {
      const {actionOfType: pac} = parent;
      dispatcher.addTransformOperator(
        'position', matrix$ => matrix$.pipe(
          op.map(m => compose(m, translate(targetPaintableState.x, targetPaintableState.y)))
        ));

      return rx.concat(
        rx.of([pState.width, pState.height]),
        pac('onResize').pipe(
          op.map(({payload}) => payload)
        )
      ).pipe(
        op.tap(([w, h]) => {
          targetPaintableState.x = w / 2;
          targetPaintableState.y = h / 2;
        }),
        op.finalize(() => {
          const idx = targetPaintableState.transPipeline.indexOf('position');
          targetPaintableState.transPipeline.splice(idx, 1);
          targetPaintableState.transPipelineByName.delete('position');
        })

      );
    })
  );
}
