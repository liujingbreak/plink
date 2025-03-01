import 'source-map-support/register';
import fs from 'fs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../core/terminal-canvas';
import {createTextWidget} from '../core/text';
import {createBorderContainer} from '../core/border';
import {createFlexContainer} from '../core/flex-container';
const fout = fs.createWriteStream('terminal-canvas-sample.log', {flush: true});
const log = createSimpleIndentLogger(false, false, fout);
const canvas = createTerminalCanvas({
  debug: true, log
});
const text = createTextWidget('hello', {debug: true, log});
const border = createBorderContainer(text, {name: 'border', debug: true, log});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
const container = createFlexContainer({debug: true, log});

container.s.ft.addChild(border).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(container).dp();
canvas.s.ft.setRenderOnRequest(true).dp();
text.log('-------------------');
canvas.s.ft.requestRender().dp();
setTimeout(() => {
  canvas.dispose();
  container.dispose();
}, 1000);
