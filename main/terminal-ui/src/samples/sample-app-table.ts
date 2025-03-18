import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import {createSimpleIndentLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import {app, createFlexContainer, TableBorderType, createTable, MultiLineTextWidget} from '../index';

const debug = false;
const fout = fs.createWriteStream('terminal-table-sample.log');
const log = createSimpleIndentLogger(false, true, fout);
const table = createTable({
  default: {
    debug, log
  },
  core: {
    debug
  },
  optsForCellComponent: {
    debug
  },
  lazy: {
    // default: {debug},
    core: {
      debug: true,
      debugIncludeTypes: ['dp_didLoad', 'dp_onLoadPage', 'dp_onCancelLoad']
    }
    // headPlaceHolder: {debug: true},
    // tailPlaceHolder: {debug: true}
    // headPlaceHolderLabel: {
    //   debug: false
    // },
    // tailPlaceHolderLabel: {
    //   debug: false
    // }
  }
});
const SAMPLE_ROW_COUNT = 10;
const SAMPLE_COLUMN_CNT = 2;
table.ft.setLazyLoad(true, page => {
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
    }, Math.round(Math.random() * 300));
  });
  return out$;
}).dp();

table.pt.onRowAdded.pipe(
  rx.map(([, _idx, _id, cells]) => {
    cells.map(cell => {
      // (cell as MultiLineTextWidget).ft.setStyle(['black']).dp();
      cell.ft.setFocusable(true).dp();
      cell.pt.onFocus.pipe(
        rx.switchMap(() => (cell as MultiLineTextWidget).table.l.setContent),
        rx.map(([, text]) => {
          log('--- focus label', text);
          // statusbar.ft.setMessage(' ' + text).dp();
        })
      ).subscribe();
      (cell as MultiLineTextWidget).ft.setStyle(['rgb(0,0,0)']).dp();
    });
  })
).subscribe();
table.ft.setBorderType(TableBorderType.rowSeparator, true).dp();
table.ft.setBorderType(TableBorderType.border, true).dp();

const root = createFlexContainer({name: 'root', debug, log});
root.ft.alignItems('center').dp();
root.ft.justifyContent('center').dp();
root.ft.addChild(table).dp();

const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
table.ft.setCellBackground((col, row) => {
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
const {ft} = app.createApp(root, true, {
  default: {
    debug, log
  },
  elevator: {
    focusable: {
      debug: true
    },
    canvas: {
      debugIncludeTypes: ['render', 'requestRender', 'clearRect', 'copyRect']
    }
  },
  canvas: {
    name: 'outerCan',
    debugIncludeTypes: ['render', 'requestRender', 'clearRect']
  },
  keyService: {debug: true},
  scrollable: {
    container: {debug: true, log},
    focus: {
      debug: true,
      cache: {debug}
    }
    // default: {debug: true, log}
    // canvas: {
    //   debug
    // }
  }
});

const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
  ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
  ft.setFullScreenMode().dp();
