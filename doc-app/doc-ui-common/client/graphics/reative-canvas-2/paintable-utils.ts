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
  paintableCtl: PaintableCtl,
  state: PaintableState,
  _opts: {vertical?: AlignmentValues; horizontal?: AlignmentValues} = {}) {

  const {dispatcher} = paintableCtl;

  return rx.merge(
    new rx.Observable(sub => {
      dispatcher.putTransformOperator(
        'position', matrix$ => matrix$.pipe(
          op.map(m => compose(m, translate(state.x, state.y)))
        ));
      sub.complete();
    }),
    parentChange$(paintableCtl, state).pipe(
      op.switchMap(({payload: [parent, pState]}) => {
        const {actionOfType: pac} = parent;

        return rx.merge(
          rx.of([pState.width, pState.height]),
          pac('onResize').pipe(
            op.map(({payload}) => payload)
          )
        ).pipe(
          op.tap(([w, h]) => {
            state.x = w / 2;
            state.y = h / 2;
            dispatcher.setTransformDirty(true);
          })
        );
      })
    )
  );
}
