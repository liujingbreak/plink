import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {compose, translate} from 'transformation-matrix';
import {Paintable} from './paintable';

type AlignmentValues = 'left' | 'center' | 'right' | 'top' | 'down';

/** change transform  matrix relative to parent size,
 * default is 'center'
 * TODO: implement for 'left', 'right', ...
 */
// eslint-disable-next-line @typescript-eslint/ban-types, space-before-function-paren
export function alignToParent<E>(
  paintable: Paintable<E>,
  _opts: {vertical?: AlignmentValues; horizontal?: AlignmentValues} = {}
) {

  const [{dispatcher}, state, {attached$}] = paintable;

  return rx.merge(
    new rx.Observable(sub => {
      dispatcher.putTransformOperator(
        'position', matrix$ => matrix$.pipe(
          op.map(m => compose(m, translate(state.x, state.y)))
        ));
      sub.complete();
    }),
    attached$().pipe(
      op.switchMap(([state, parentCtrl, pState]) => {
        const {payloadByType: pac} = parentCtrl;

        return rx.merge(
          rx.of([pState.width, pState.height]),
          pac.onResize
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
