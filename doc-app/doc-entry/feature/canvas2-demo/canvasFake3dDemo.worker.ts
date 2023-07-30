import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {vec3, mat4} from 'gl-matrix';
import {Paintable, createPaintable, mat4ToStr} from '@wfh/doc-ui-common/client/graphics/canvas';
import {SegmentIndexed, drawSegmentIndexedPath} from '@wfh/doc-ui-common/client/graphics/canvas/segment';
import {createRootPaintable} from '@wfh/doc-ui-common/client/graphics/canvas/reactiveCanvas2.worker';

const [root, engine] = createRootPaintable();

createObjects(root);
const {canvasController} = engine;
canvasController.dispatcher.sceneReady();

type CubeActions = {
  changePerspective(v: number): void;
};

function createObjects(root: Paintable) {
  const cube = createPaintable<CubeActions>({debug: process.env.NODE_ENV === 'development' ? 'cube' : false});
  const [controller] = cube;
  const {dispatcher} = controller;
  const vertices: [number, number, number][] = [
    // face front, right-top, right-bottom, left-bottom, left-top
    [1, 1, 0], [1, -1, 0], [-1, -1, 0], [-1, 1, 0],
    // back face
    [1, 1, -2], [1, -1, -2], [-1, -1, -2], [-1, 1, -2]
  ];

  const viewVertices = vertices.map(ver => Float32Array.from(ver));

  const indicesFrontFace = [0, 1, 2, 3];
  const indicesBackFace = [4, 5, 6, 7];

  const frontFaceColor = 'red';
  const backFaceColor = 'blue';

  const perspective = mat4.create();

  const frontFaceSegs = indicesFrontFace.map(idx => new SegmentIndexed(viewVertices, idx));
  const backFaceSegs = indicesBackFace.map(idx => new SegmentIndexed(viewVertices, idx));

  dispatcher.attachTo(root);

  dispatcher.addEpic<CubeActions>((controller, state) => {
    const {payloadByType} = controller;
    const [pControl, _pState] = state.parent;
    dispatcher.putTransformOperator('perspective', up => {
      return up.pipe(
        op.map(m => mat4.mul(mat4.create(), perspective, m))
      );
    });
    return rx.merge(
      rx.combineLatest(
        pControl.payloadByType.onResize.pipe(
          op.map(([w, h]) => {
            return [
              mat4.perspective(mat4.create(), Math.PI * 100 / 180, w / h, 2, 50),
              w, h
            ] as const;
          })
        ),
        rx.concat(rx.of(-2), payloadByType.changePerspective)
      ).pipe(
        op.map(([[perspectiveMatrix, w, h], changedP]) => {
          const tempM = mat4.create();
          mat4.fromScaling(tempM, [w / 2, h / 2, 1]); // transform to screen size
          mat4.translate(tempM, tempM, [1, 1, 0]); // move to positive Y and X axis
          mat4.mul(tempM, tempM, perspectiveMatrix); // Perspective transform
          mat4.translate(perspective, tempM, [0, 0, changedP]); // model view transforma on Z-axis
          dispatcher.setTransformDirty(true);
        })
      ),
      payloadByType.transformChanged.pipe(
        op.map(m => {
          let i = 0;
          for (const ver of vertices) {
            vec3.transformMat4(viewVertices[i], ver, m);
            i++;
          }
        })
      ),
      payloadByType.renderContent.pipe(
        op.map(([ctx]) => {
          ctx.fillStyle = backFaceColor;
          ctx.beginPath();
          drawSegmentIndexedPath(backFaceSegs, ctx, {debug: true});
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = frontFaceColor;
          ctx.beginPath();
          drawSegmentIndexedPath(frontFaceSegs, ctx, {debug: true});
          ctx.closePath();
          ctx.fill();
        }),
        op.filter((_v, i) => i === 0),
        op.delay(1000),
        op.mergeMap(() => {
          return state.canvasEngine.animateMgr.animate(-2, -20, 5000, 'linear');
        }),
        op.map(v => dispatcher.changePerspective(v))
      )
    );
  });
}

