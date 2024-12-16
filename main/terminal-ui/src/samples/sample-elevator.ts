import 'source-map-support/register';
import fs from 'fs';
// import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas, createFlexContainer, createTextWidget, createElevator, DisplayMode} from '../index';

const debug = true;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);

const canvas = createTerminalCanvas({debug, log});
const root = createFlexContainer({name: 'root', debug, log});
canvas.s.ft.autoHideCursor().dp();

const ev = createElevator({default: {debug, log}});
const popupLayer = createFlexContainer({name: 'popup', debug, log});
ev.s.ft.addChild(root, popupLayer).dp();

const popupMsg = createTextWidget('<POPUP MESSAGE>', {name: 'popupMsg', debug, log});
popupLayer.s.ft.justifyContent('center').dp();
popupLayer.s.ft.alignItems('center').dp();
popupLayer.s.ft.addChild(popupMsg).dp();
canvas.s.ft.setRootComponent(ev).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  process.exit(0);
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];

canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});

root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();
const label = createTextWidget('~~~ The bottom layer ~~~', {debug, log});
root.s.ft.addChild(label).dp();

canvas.s.ft.setRenderOnRequest(true).dp();
canvas.s.ft.requestRender().dp();
setTimeout(() => {
  popupLayer.log('--------------- change display ----');
  popupMsg.s.ft.setContent('xx').dp();
}, 1000);
setTimeout(() => {
  popupLayer.s.ft.setDisplay(DisplayMode.none).dp();
  label.s.ft.setContent('bottom layer').dp();
}, 3000);

