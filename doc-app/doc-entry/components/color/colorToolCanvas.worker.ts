import {createRootPaintable} from '@wfh/doc-ui-common/client/graphics/canvas/reactiveCanvas2.worker';
import {createHueCircle} from './colorToolCanvasContent';

const [root, engine] = createRootPaintable();

createHueCircle(root);
const {canvasController} = engine;
canvasController.dispatcher.sceneReady();

