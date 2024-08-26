import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {DisplayMode, app, createFlexContainer, createTextWidget, createBorderContainer} from '../index';

const debug = true;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args: any[]) {
  const date = new Date();
  fout.write(date.toLocaleTimeString());
  // console.log(formatToConciseNoColor(...args));
  fout.write('.');
  fout.write(date.getMilliseconds() + ' - ');
  fout.write(formatToConciseNoColor(...args));
  fout.write('\n');
}
const panel = createFlexContainer({name: 'contentPanel', debug, log});
const border = createBorderContainer(panel.asBaseType.asBaseType, {name: 'contentPanelBorder', debug, log});
const {canvas} = app.createApp(border.asBaseType.asBaseType, {default: {debug, log}});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});

const welcome = createTextWidget('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome.asBaseType).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

const thinLabel = createTextWidget('label A', {debug: true, log});
const fatLabel = createTextWidget('Label B');
const hiddenLabel = createTextWidget('Label C');
border.s.ft.setFlexGrow(1).dp();
panel.s.ft.addChild(hiddenLabel.asBaseType, thinLabel.asBaseType, fatLabel.asBaseType).dp();

rx.timer(1000, 1000).pipe(
  rx.take(6),
  rx.map(i => {
    fatLabel.s.ft.setDisplay(i % 2 === 1 ? DisplayMode.none : DisplayMode.visible).dp();
    hiddenLabel.s.ft.setDisplay(i % 2 === 1 ? DisplayMode.hidden : DisplayMode.visible).dp();
  })
).subscribe();

canvas.s.ft.render().dp();
