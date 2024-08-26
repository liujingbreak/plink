import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createBorderContainer, createTerminalCanvas, createScrollable, createTextWidget, createFlexContainer} from '../index';

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

const canvas = createTerminalCanvas({debug: false, log});
const root = createFlexContainer({name: 'root', debug, log});
const border = createBorderContainer(root.b.b, {debug, log});
const scrollable = createScrollable(border.b.b, {default: {debug, log}});
root.s.ft.alignItems('center').dp();
root.s.ft.setDirection('col').dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(scrollable.b.b).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  log('-----------------\n', label, util.inspect(err));
  process.exit(0);
});
const num = 20;
const hueInterval = Math.round(360 / num);
for (let i = 0; i < num; i++) {
  const label = createTextWidget('TEST LABEL ' + i, {name: 'LABEL ' + i, debug: false, log});
  label.s.ft.setStyle([`hsl(${hueInterval * i},65,70)`]).dp();
  root.s.ft.addChild(label.asBaseType).dp();
}
canvas.s.ft.setBounding(0, 0, process.stdout.columns, 10).dp();

canvas.s.ft.render().dp();
setTimeout(() => {
  scrollable.s.ft.scroll(0, 5).dp();
  canvas.s.ft.render().dp();

  canvas.dispose();
  root.dispose();
}, 1000);
