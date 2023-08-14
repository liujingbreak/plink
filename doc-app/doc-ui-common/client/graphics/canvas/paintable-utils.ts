/* eslint-disable @typescript-eslint/indent */
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {mat4, vec3} from 'gl-matrix';
import {Paintable} from './paintable';
// import {mat4ToStr} from '../canvas-utils';

type AlignmentValues = 'left' | 'center' | 'right' | 'top' | 'down';

/** change 2D transform matrix (ignore z-axis elements) relative to parent size,
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
export function alignToParent2d<E extends Record<string, (...a: any[]) => void>>(
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

export type ActionsOf3d = {
  setPerspectiveMatrix(fovy: number, near: number, far: number): void;
  setLookAtMatrix(...params: Parameters<typeof mat4['lookAt']> extends [m: any, ...rest: infer R] ? R : never): void;
};

type ActionOf3dInteral = {
  setToScreen2dMatrix(m: mat4): void;
};

// eslint-disable-next-line space-before-function-paren
export function transform3dTo2d<E extends Record<string, (...a: any[]) => void>>(topLevel3dPaintable: Paintable<E>) {
  const [controller] = topLevel3dPaintable as unknown as Paintable<ActionsOf3d & ActionOf3dInteral>;
  const rPayloadsFor3d = controller.createLatestPayloads('setToScreen2dMatrix', 'setLookAtMatrix', 'setPerspectiveMatrix');

  const screenMatrixCache = mat4.create();
  const tempSizeM = mat4.create();
  const tempSizeAndPersM = mat4.create();
  const tempPerspectiveM = mat4.create();
  const tempScreenLookatM = mat4.create();
  const tempLookAtM = mat4.create();
  controller.dispatcher.setToScreen2dMatrix(screenMatrixCache);

  controller.dispatcher.putTransformOperator('perspective', up => {
    return up.pipe(
      op.withLatestFrom(rPayloadsFor3d.setToScreen2dMatrix),
      op.map(([m, screenMatrix]) => mat4.mul(screenMatrixCache, screenMatrix, m))
    );
  });

  controller.dispatcher.addEpic((_ctl, state, _rPayloads) => {
    const [, , parentLatestActions] = state.parent;
    return rx.combineLatest(
      rx.combineLatest(
        parentLatestActions.onResize.pipe(
          op.map(([w, h]) => {
            mat4.fromScaling(tempSizeM, [w / 2, -h / 2, 1]); // transform to screen size
            mat4.translate(tempSizeM, tempSizeM, [1, -1, 0]); // move to positive Y and X axis
            return [tempSizeM, w / h] as const;
          })
        ),
        rPayloadsFor3d.setPerspectiveMatrix
      ).pipe(
        op.map(([[tempSizeM, screenAspect], [fovy, near, far]]) => {
          return mat4.mul(tempSizeAndPersM, tempSizeM,
            mat4.perspective(tempPerspectiveM, fovy, screenAspect, near, far));
        })
      ),
      rPayloadsFor3d.setLookAtMatrix.pipe(
        op.map(([eye, center, up]) => mat4.lookAt(tempLookAtM, eye, center, up))
      )
    ).pipe(
      op.map(([m, lookAtParams]) => {
        controller.dispatcher.setToScreen2dMatrix(mat4.mul(tempScreenLookatM, m, lookAtParams));
        controller.dispatcher.setTransformDirty(true);
      })
    );
  });

  return controller.dispatcher as Pick<typeof controller.dispatcher, 'setLookAtMatrix' | 'setPerspectiveMatrix'>;
}
