import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {mat4, vec3} from 'gl-matrix';
import {Paintable} from './paintable';
// import {mat4ToStr} from '../canvas-utils';

type AlignmentValues = 'left' | 'center' | 'right' | 'top' | 'down';

/** change transform  matrix relative to parent size,
 * default is 'center' (which is simply translating origin point to center of parent objects,
 * the transformation matrix depends on: parent object's width and height properties.
 *
 * It assumes the cooridate origin point is center of current paintable object, does not involve
 * calculation of actual center of current paintable object, which is not ideal alignment approach,
 * but the simplest and fastest approach.
 *
 * TODO: implement for 'left', 'right', ...
 */
// eslint-disable-next-line @typescript-eslint/ban-types, space-before-function-paren
export function alignToParent<E>(
  paintable: Paintable<E>,
  _opts: {vertical?: AlignmentValues; horizontal?: AlignmentValues} = {}
) {

  const [{dispatcher}] = paintable;
  const posState: Float32Array = Float32Array.of(0, 0, 0);

  dispatcher.putTransformOperator(
    'position', matrix$ => matrix$.pipe(
      op.map(m => {
        const temp = mat4.create();
        return mat4.mul(temp, m, mat4.fromTranslation(
          temp, posState
        ));
      })
    ));

  dispatcher.addEpic((_control, state) => {
    const [parentCtrl, pState] = state.parent;
    const {payloadByType: pac} = parentCtrl;
    return rx.merge(
      rx.of([pState.width, pState.height]),
      pac.onResize
    ).pipe(
      op.tap(([w, h]) => {
        posState[0] = w / 2;
        posState[1] = h / 2;
        dispatcher.setTransformDirty(true);
      })
    );

  });
}
