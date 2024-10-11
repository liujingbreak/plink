import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../index';
import {createTextWidget} from '../index';
import {createFlexContainer} from '../index';
import {createBorderContainer} from '../index';

const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args: any[]) {
  const date = new Date();
  fout.write(date.toLocaleTimeString());
  fout.write('.');
  fout.write(date.getMilliseconds() + ' - ');
  fout.write(formatToConciseNoColor(...args));
  fout.write('\n');
}

const canvas = createTerminalCanvas({debug: true, log});
const root = createFlexContainer({name: 'root', debug: true, log});
root.s.ft.alignItems('center').dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(root).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  log('-----------------\n', label, util.inspect(err));
  process.exit(0);
});

const thinLabel = createTextWidget('~~~~label A~~~~', {debug: true, log});
thinLabel.s.ft.setStyle(['bgYellow', 'black']).dp();
thinLabel.s.ft.setFlexShrink(1).dp();
const fatLabel = createTextWidget('Label B');
const border = createBorderContainer(fatLabel, {debug: true, log});
border.s.ft.setFlexShrink(0).dp();
root.s.ft.addChild(thinLabel, border).dp();

canvas.s.ft.setBounding(0, 0, 15, process.stdout.rows - 1).dp();

canvas.s.ft.render().dp();
canvas.dispose();
root.dispose();
