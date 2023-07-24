import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Paintable, createPaintable} from '@wfh/doc-ui-common/client/graphics/canvas';
import {createRootPaintable} from '@wfh/doc-ui-common/client/graphics/canvas/reactiveCanvas2.worker';

const [root, engine] = createRootPaintable();

createObjects(root);
const {canvasController} = engine;
canvasController.dispatcher.sceneReady();

function createObjects(root: Paintable) {
  const cube = createPaintable({debug: process.env.NODE_ENV === 'development' ? 'cube' : false});
  const [controller] = cube;
  const {dispatcher} = controller;
  dispatcher.attachTo(root);

  controller.dispatcher.addEpic((controller, state) => {
    const {payloadByType} = controller;
    return rx.merge(
      payloadByType.transformChanged.pipe(
        op.map(() => {})
      )
    );
  });
}

