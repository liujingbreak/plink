import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTable, createTerminalCanvas, createFlexContainer} from '../index';

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
// const scrollable = createScrollable(border.b.b, {debug, log});
root.s.ft.alignItems('center').dp();
const table = createTable({debug, log});
table.s.ft.addRow(['12345', 'abcde']).dp();
table.s.ft.addRow(['123459876', '-----abcde\nokok']).dp();
root.s.ft.addChild(table.b.b).dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(root.b.b).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  log('-----------------\n', label, util.inspect(err));
  process.exit(0);
});
// const num = 10;
// const hueInterval = Math.round(360 / num);
// for (let i = 0; i < num; i++) {
//   const label = createTextWidget('TEST LABEL ' + i, {name: 'LABEL ' + i, debug: false, log});
//   label.s.ft.setStyle([`bgHsl(${hueInterval * i},65,70)`]).dp();
//   root.s.ft.addChild(label.asBaseType).dp();
// }
canvas.s.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp();

canvas.s.ft.render().dp();
canvas.dispose();
root.dispose();
