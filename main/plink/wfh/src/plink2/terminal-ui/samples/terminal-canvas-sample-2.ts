import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget} from '../terminal-text';
// import {createScrollable} from '../terminal-scrollable';
// import {createListContainer} from '../terminal-featured-widget';
import {createListContainer, createBorderContainer} from '../terminal-featured-widget';

const screenWidth = process.argv[2];

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

const canvas = createTerminalCanvas();
canvas.config({debug: true, log});

const root = createListContainer({name: 'root', debug: true, log});
canvas.s.ft.setRootWidget(root).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  fout.write('-----------------\n');
  fout.write(label);
  fout.write('\n');
  fout.write(util.inspect(err));
  fout.close();
  process.exit(0);
});
root.s.ft.justifyContent('center').dp();
root.s.ft.alignItems('center').dp();

const label = createTextWidget('Hello border container');
label.config({debug: true, log});
const border = createBorderContainer(label.asBaseType);
border.config({debug: true, log});

root.s.ft.addChild(border.asBaseType.asBaseType).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
canvas.s.ft.render().dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
  canvas.s.ft.render().dp();
});

setTimeout(() => {
  label.s.ft.setContent('ok'.repeat(20)).dp();
  canvas.s.ft.render().dp();
}, 1000);

setTimeout(() => {
  label.s.ft.setContent('long sentence').dp();
  canvas.s.ft.render().dp();
  canvas.dispose();
  root.dispose();
}, 2000);
