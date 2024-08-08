import 'source-map-support/register';
import fs from 'fs';
// import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas, createFlexContainer, createTextWidget, createElevator, DisplayMode} from '../index';

const debug = true;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args: any[]) {
  const date = new Date();
  fout.write(date.toLocaleTimeString());
  fout.write('.');
  fout.write(date.getMilliseconds() + ' - ');
  fout.write(formatToConciseNoColor(...args));
  fout.write('\n');
}

const canvas = createTerminalCanvas({debug, log});
const root = createFlexContainer({name: 'root', debug, log});
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRenderOnRequest(true).dp();

const ev = createElevator({debug, log});
const popupLayer = createFlexContainer({name: 'popup', debug, log});
ev.s.ft.addChild(
  root.asBaseType.asBaseType,
  popupLayer.asBaseType.asBaseType
).dp();

const popupMsg = createTextWidget('POPUP MESSAGE', {name: 'popupMsg', debug, log});
popupLayer.s.ft.justifyContent('center').dp();
popupLayer.s.ft.alignItems('center').dp();
popupLayer.s.ft.addChild(popupMsg.b).dp();
canvas.s.ft.setRootComponent(ev.b.b).dp();
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
const label = createTextWidget('ok', {debug, log});
root.s.ft.addChild(label.b).dp();

canvas.s.ft.requestRender().dp();
setTimeout(() => {
  popupLayer.s.ft.setDisplay(DisplayMode.none).dp();
}, 1000);
setTimeout(() => {
  popupLayer.s.ft.setDisplay(DisplayMode.visible).dp();
}, 2000);

