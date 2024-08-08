import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer} from '../index';

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
const {canvas} = app.createApp(border.asBaseType.asBaseType, {debug, log});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});

setTimeout(() => {
  panel.s.ft.removeChild(welcome.asBaseType).dp();
  panel.s.ft.setDirection('col').dp();
  const num = 40;
  const hueInterval = Math.round(360 / num);
  for (let i = 0; i < 40; i++) {
    const label = createTextWidget('TEST LABEL ' + i, {name: 'LABEL ' + i, debug, log});
    label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
    panel.s.ft.addChild(label.asBaseType).dp();
  }
}, 1000);

const welcome = createTextWidget('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome.asBaseType).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

