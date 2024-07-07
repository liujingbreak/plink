import fs from 'fs';
import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget, MultiLineTextWidget} from '../terminal-text';
import {createListContainer} from '../terminal-featured-widget';

const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args: any[]) {
  const date = new Date();
  fout.write(date.toLocaleTimeString());
  fout.write('.');
  fout.write(date.getMilliseconds() + ' - ');
  fout.write(formatToConciseNoColor(...args));
  fout.write('\n');
}

const canvas = createTerminalCanvas();
canvas.config({debug: true, log});
// canvas.s.ft.setAlwaysRerenderAll(true).dp();

const root = createListContainer({debug: true, log});
canvas.s.ft.setRootWidget(root).dp();
root.s.ft.justifyContent('end').dp();

for (let i = 0; i < 2; i++) {
  const text = createTextWidget();
  text.config({debug: true, log, name: 'text-' + i});
  text.s.ft.setContent('This is label ' + i).dp();
  text.s.ft.setStyle([i % 2 === 0 ? 'bgCyan' : 'bgMagenta', 'black']).dp();
  root.s.ft.addChild(text).dp();
}

const size = process.stdout.getWindowSize();
canvas.s.ft.setClientWindowSize(...size).dp();
canvas.s.ft.render().dp();

const [children] = root.table.getData().allChildren;
const timerLabel = children![children!.length - 1];
rx.timer(1000, 1000).pipe(
  rx.map(() => {
    const date = new Date();
    (timerLabel as MultiLineTextWidget).s.ft.setContent(`Current time: ${date.toLocaleTimeString()}.${date.getMilliseconds()}`).dp();
    canvas.s.ft.render().dp();
  }),
  rx.take(20)
).subscribe();
