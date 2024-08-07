import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, createTextWidget, createBorderContainer} from '../index';

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
const panel = createFlexContainer({name: 'contentPanel'});
const border = createBorderContainer(panel.asBaseType.asBaseType);
const {canvas} = app.createApp(border.asBaseType.asBaseType, {debug: true, log});

const screenWidth = process.argv[2];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
});

const welcome = createTextWidget('Hello...');
welcome.s.ft.setStyle(['cyan']).dp();
panel.s.ft.addChild(welcome.asBaseType).dp();
// panel.s.ft.setBackground('bgGray').dp();
panel.s.ft.justifyContent('center').dp();
panel.s.ft.alignItems('center').dp();

