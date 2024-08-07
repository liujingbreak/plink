import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
// import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas} from '../terminal-canvas';
import {createTextWidget} from '../terminal-text';
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
root.s.ft.alignItems('center').dp();
canvas.s.ft.autoHideCursor().dp();
canvas.s.ft.setRootComponent(root.asBaseType.asBaseType).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  log('-----------------\n', label, util.inspect(err));
  process.exit(0);
});

const thinLabel = createTextWidget('label A', {debug: true, log});
const fatLabel = createTextWidget('Label B');
const border = createBorderContainer(fatLabel.asBaseType, {debug: true, log});
border.s.ft.setFlexGrow(1).dp();
root.s.ft.addChild(thinLabel.asBaseType, border.asBaseType.asBaseType).dp();

canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
  canvas.s.ft.render().dp();
});

canvas.s.ft.render().dp();
canvas.dispose();
root.dispose();
