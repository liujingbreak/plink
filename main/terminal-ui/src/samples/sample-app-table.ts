import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, MultiLineTextWidget, TableBorderType, createTable} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-table-sample.log');
const log = createSimpleIndentLogger(false, false, fout);
const table = createTable({
  default: {
    debug, log
  },
  core: {
    // debug: true
  }
  // lazy: {
  //   core: {debug: true},
  //   headPlaceHolder: {debug: true, debugIncludeTypes: ['onRender']},
  //   headPlaceHolderLabel: {
  //     debug: false
  //   },
  //   tailPlaceHolderLabel: {
  //     debug: false
  //   }
  // }
});
const SAMPLE_ROW_COUNT = 10;
const SAMPLE_COLUMN_CNT = 3;
table.s.ft.setLazyLoad(true, page => {
  table.log('*** handle onLoadPage', page);
  const out$ = new rx.Observable<[string, string[]]>(sub => {
    if (page > 5) {
      sub.complete();
      return;
    }
    setTimeout(() => {
      for (let r = 0; r < SAMPLE_ROW_COUNT; r++) {
        const cells = [] as string[];
        for (let i = 0; i < SAMPLE_COLUMN_CNT; i++) {
          cells.push(`page ${page}, ${r}:${i}`);
        }
        sub.next([page + ':' + r, cells]);
      }
      sub.complete();
    }, Math.round(Math.random() * 700));
  });
  return out$;
}).dp();
table.s.pt.onRowAdded.pipe(
  rx.map(([, _idx, _id, cells]) => {
    cells.map(cell => {
      (cell as MultiLineTextWidget).s.ft.setStyle(['black']).dp();
    });
  })
).subscribe();
table.s.ft.setBorderType(TableBorderType.rowSeparator, true).dp();
table.s.ft.setBorderType(TableBorderType.border, true).dp();

const root = createFlexContainer({name: 'root', debug, log});
root.s.ft.alignItems('center').dp();
root.s.ft.justifyContent('center').dp();
root.s.ft.addChild(table.b.b).dp();

const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
table.s.ft.setCellBackground((col, row) => {
  let hue: number;
  if (row > SAMPLE_ROW_COUNT)
    hue = hueInterval * (row % SAMPLE_ROW_COUNT);
  else
    hue = hueInterval * row;

  let sat: number;
  if (SAMPLE_COLUMN_CNT < col)
    sat = saturation * (col % SAMPLE_COLUMN_CNT);
  else
    sat = saturation * col;
  return `bgHsl(${hue},${30 + sat},70)`;
}).dp();
const {canvas} = app.createApp(root.b.b, {
  default: {
    debug, log
  },
  canvas: {
    debug: true,
    debugIncludeTypes: ['clearRect']
  },
  scrollable: {
    default: {debug},
    core: {debug: true},
    canvas: {
      debug: true,
      debugIncludeTypes: ['clearRect']
    }
  }
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();

process.stdout.on('resize', () => {
  canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});

