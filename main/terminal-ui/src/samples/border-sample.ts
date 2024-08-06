import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget} from '../terminal-text';
// import {createScrollable} from '../terminal-scrollable';
// import {createFlexContainer} from '../terminal-featured-widget';
import {createFlexContainer} from '../terminal-flex-container';
import {createBorderContainer} from '../terminal-border';

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

const canvas = createTerminalCanvas({debug: true, log});

const root = createFlexContainer({name: 'root', debug: true, log});
canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
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

const label = createTextWidget('8', {debug: true, log});
const border = createBorderContainer(label.asBaseType, {debug: true, log});

root.s.ft.addChild(border.asBaseType.asBaseType).dp();
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
canvas.s.ft.render().dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
  canvas.s.ft.render().dp();
});

setTimeout(() => {
  label.log('HERE WE GO ---> 18');
  label.s.ft.setContent('18').dp();
  canvas.s.ft.render().dp();
  canvas.dispose();
  root.dispose();
}, 1000);

// setTimeout(() => {
//   label.s.ft.setContent('8').dp();
//   canvas.s.ft.render().dp();
// }, 1500);

// setTimeout(() => {
//   label.s.ft.setContent('12').dp();
//   canvas.s.ft.render().dp();
//   canvas.dispose();
//   root.dispose();
// }, 2000);
