import {createRootPaintable} from '@wfh/doc-ui-common/client/graphics/reative-canvas-2/reactiveCanvas2.worker';
import {createHueCircle} from './colorToolCanvasContent';

const [root, engine] = createRootPaintable();

createHueCircle(root);
const {canvasController} = engine;
canvasController.dispatcher.render();

