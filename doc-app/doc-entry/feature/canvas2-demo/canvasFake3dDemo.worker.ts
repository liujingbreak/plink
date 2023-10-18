import * as rx from 'rxjs';
import {vec3} from 'gl-matrix';
import {Paintable, createPaintable, transform3dTo2d} from '@wfh/doc-ui-common/client/graphics/canvas';
import {SegmentIndexed, drawSegmentIndexedPath} from '@wfh/doc-ui-common/client/graphics/canvas/segment';
import {createRootAndEngine} from '@wfh/doc-ui-common/client/graphics/canvas/reactiveCanvas2.worker';

const [root, engine] = createRootAndEngine();

createObjects(root);
const {canvasController} = engine;
canvasController.i.dp.sceneReady();

type CubeActions = {
  changePerspective(v: number): void;
};

function createObjects(root: Paintable) {
  const cube = createPaintable<CubeActions>({debug: process.env.NODE_ENV === 'development' ? 'cube' : false});
  const {dispatcher} = cube.i;
  const vertices: [number, number, number][] = [
    // face front, right-top, right-bottom, left-bottom, left-top
    [1, 1, 0], [1, -1, 0], [-1, -1, 0], [-1, 1, 0],
    // back face
    [1, 1, -2], [1, -1, -2], [-1, -1, -2], [-1, 1, -2]
  ];

  const viewVertices = vertices.map(ver => Float32Array.from(ver));

  const indicesFrontFace = [0, 1, 2, 3];
  const indicesBackFace = [4, 5, 6, 7];

  const frontFaceColor = 'rgba(240, 20, 20, 0.5)';
  const backFaceColor = 'rgba(20, 20, 240, 0.5)';


  const frontFaceSegs = indicesFrontFace.map(idx => new SegmentIndexed(viewVertices[idx], 0));
  const backFaceSegs = indicesBackFace.map(idx => new SegmentIndexed(viewVertices[idx], 0));

  dispatcher.attachTo(root);

  const {setLookAtMatrix, setPerspectiveMatrix} = transform3dTo2d(cube);
  setPerspectiveMatrix(Math.PI * 70 / 180, 2, 50);
  // setLookAtMatrix([0, 0, 2], [0, 0.5, 0], [0, 1, 0]);
  cube.r(cube.o.pt.setAbsoluteTransform.pipe(
    rx.map(([, m]) => {
      let i = 0;
      for (const ver of vertices) {
        vec3.transformMat4(viewVertices[i], ver, m);
        i++;
      }
    })
  ));

  cube.r(cube.o.pt.renderContent.pipe(
    rx.map(([, ctx]) => {
      ctx.fillStyle = backFaceColor;
      ctx.beginPath();
      drawSegmentIndexedPath(backFaceSegs, ctx, {debug: false});
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = frontFaceColor;
      ctx.beginPath();
      drawSegmentIndexedPath(frontFaceSegs, ctx, {debug: false});
      ctx.closePath();
      ctx.fill();
    }),
    rx.filter((_v, i) => i === 0),
    rx.delay(1000),
    rx.mergeMap(() => {
      return engine.animateMgr.animate(0, 2, 3000, 'linear');
    }),
    rx.map(v => setLookAtMatrix([0, v, 2], [0, 0.5, 0], [0, 1, 0]))
  ));
}

