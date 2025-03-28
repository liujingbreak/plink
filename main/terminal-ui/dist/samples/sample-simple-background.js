import 'source-map-support/register';
import fs from 'fs';
import { createSimpleIndentLogger } from '@wfh/reactivizer/dist/nodejs-utils';
import { createTerminalCanvas } from '../core/terminal-canvas.js';
import { createTextWidget } from '../core/text.js';
import { createFlexContainer } from '../core/flex-container.js';
const fout = fs.createWriteStream('terminal-canvas-sample.log', { flush: true });
const log = createSimpleIndentLogger(false, false, fout);
const canvas = createTerminalCanvas({
    debug: true, log
});
const text = createTextWidget('hello', { debug: true, log });
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const container = createFlexContainer({
    debug: true,
    name: 'background',
    log
});
container.s.ft.addChild(text).dp();
container.s.ft.setBackground('bgHex(#303030)').dp();
text.s.ft.setStyle(['hex(#ffd0d0)']).dp();
// text.s.ft.setStyle(['white']).dp();
container.s.ft.justifyContent('center').dp();
container.s.ft.alignItems('center').dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(container).dp();
canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
setTimeout(() => {
    canvas.dispose();
    container.dispose();
}, 650);
//# sourceMappingURL=sample-simple-background.js.map