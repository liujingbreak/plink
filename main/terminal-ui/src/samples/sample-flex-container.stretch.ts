import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
// import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTerminalCanvas, debugLineTrees} from '../index';
import {createTextWidget} from '../index';
import {createFlexContainer} from '../index';
import {createBorderContainer} from '../index';

const screenWidth = process.argv[2];

const fout = fs.createWriteStream('terminal-canvas-sample.log');
const log = createSimpleIndentLogger(false, false, fout);

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

const thinLabel = createTextWidget('label A', {debug: true, log});
const fatLabel = createTextWidget('Label B', {debug: true, log});
const border = createBorderContainer(fatLabel, {debug: true, log});
border.s.ft.setFlexGrow(1).dp();
root.s.ft.addChild(thinLabel, border).dp();

canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, process.stdout.rows - 1).dp();
  canvas.s.ft.render().dp();
});
canvas.s.pt.render.pipe(
  rx.mergeMap(() => canvas.table.l.internalCache.pipe(
    rx.take(1)
  )),
  rx.map(([, , proLines]) => {
    canvas.log('++ proLines', debugLineTrees(proLines));
  })
).subscribe();

canvas.s.ft.render().dp();
canvas.dispose();
root.dispose();
