import 'source-map-support/register';
import util from 'util';
import fs from 'fs';
import * as rx from 'rxjs';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
import {createTable, createTerminalCanvas, TableBorderType, createFlexContainer,
  MultiLineTextWidget} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-canvas-sample.log');
function log(...args: any[]) {
  const date = new Date();
  fout.write(date.toLocaleTimeString());
  fout.write('.');
  fout.write(date.getMilliseconds() + ' - ');
  fout.write(formatToConciseNoColor(...args));
  fout.write('\n');
}

const canvas = createTerminalCanvas({debug, debugIncludeTypes: ['fillRect'], log});
const root = createFlexContainer({name: 'root', debug, log});
root.ft.alignItems('center').dp();

const table = createTable({
  core: {name: 'table', debug: true, log, debugExcludeTypes: ['onCellBgRender']},
  default: {debug: false, log}
});
const SAMPLE_ROW_COUNT = 6;
const SAMPLE_COLUMN_CNT = 7;
table.pt.onRowAdded.pipe(
  rx.map(([, idx, id, cells]) => {
    cells.map(cell => {
      (cell as MultiLineTextWidget).ft.setStyle(['black']).dp();
    });
  })
).subscribe();
for (let r = 0; r < SAMPLE_ROW_COUNT; r++) {
  const cells = [] as string[];
  for (let i = 0; i < 7; i++) {
    cells.push(`Cell ${r}:${i}`);
  }
  table.ft.addRow(cells).dp();
}
table.ft.setBorderType(TableBorderType.rowSeparator, true).dp();
table.ft.setBorderType(TableBorderType.border, true).dp();
const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
table.ft.setCellBackground((col, row) => `bgHsl(${hueInterval * row},${30 + saturation * col},70)`).dp();
root.ft.addChild(table).dp();
root.ft.setDirection('col').dp();
canvas.ft.autoHideCursor().dp();
canvas.ft.setRootComponent(root).dp();
canvas.error$.subscribe(([err, label]) => {
  process.stdout.clearScreenDown();
  console.error(label, err);
  log('-----------------\n', label, util.inspect(err));
  process.exit(0);
});
canvas.ft.setBounding(0, 0, process.stdout.columns, process.stdout.rows).dp();

canvas.ft.render().dp();
canvas.dispose();
root.dispose();
