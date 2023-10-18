import {createRootAndEngine} from '@wfh/doc-ui-common/client/graphics/canvas/reactiveCanvas2.worker';
import {createHueCircle} from './colorToolCanvasContent';

const [root, engine] = createRootAndEngine();

createHueCircle(root, engine);
const {canvasController} = engine;
canvasController.i.dp.sceneReady();

