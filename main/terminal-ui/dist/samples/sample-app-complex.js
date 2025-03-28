// import 'source-map-support/register';
import fs from 'fs';
import * as rx from 'rxjs';
import { createSimpleIndentLogger } from '@wfh/reactivizer/dist/nodejs-utils';
import { app, createFlexContainer, TableBorderType, createTable, createTextWidget } from '../index.js';
const debug = false;
const fout = fs.createWriteStream('terminal-table-complex.log');
const log = createSimpleIndentLogger(false, false, fout);
const table = createTable({
    default: {
        debug, log
    },
    core: {
        debug
    }
    // optsForCellComponent: {debug: true}
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
    const out$ = new rx.Observable(sub => {
        if (page > 5) {
            sub.complete();
            return;
        }
        setTimeout(() => {
            for (let r = 0; r < SAMPLE_ROW_COUNT; r++) {
                const cells = [];
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
table.s.pt.onRowAdded.pipe(rx.map(([, _idx, _id, cells]) => {
    cells.map(cell => {
        cell.s.ft.setStyle(['black']).dp();
        cell.s.ft.setFocusable(true).dp();
    });
})).subscribe();
table.s.ft.setBorderType(TableBorderType.rowSeparator, true).dp();
table.s.ft.setBorderType(TableBorderType.border, true).dp();
const root = createFlexContainer({
    name: 'root', debug, log
    // debugExcludeTypes: ['ofCanvas', '_saveTransform', 'needRerender', 'renderBackgroundFor']
});
root.s.ft.alignItems('center').dp();
root.s.ft.justifyContent('center').dp();
root.s.ft.addChild(table).dp();
const rp = createFlexContainer({
    name: 'rightPanel', debug, log
});
rp.s.ft.alignItems('start').dp();
rp.s.ft.justifyContent('center').dp();
root.s.ft.addChild(rp).dp();
const rLabel = createTextWidget('choose one item from the table', {
    name: 'rightLabel', debug: true, log
});
rLabel.s.ft.setFocusable(true).dp();
rp.s.ft.addChild(rLabel).dp();
const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
rx.range(0, SAMPLE_ROW_COUNT).pipe(rx.map(i => {
    // const hue = hueInterval * i;
})).subscribe();
table.s.ft.setCellBackground((col, row) => {
    let hue;
    if (row > SAMPLE_ROW_COUNT)
        hue = hueInterval * (row % SAMPLE_ROW_COUNT);
    else
        hue = hueInterval * row;
    let sat;
    if (SAMPLE_COLUMN_CNT < col)
        sat = saturation * (col % SAMPLE_COLUMN_CNT);
    else
        sat = saturation * col;
    return `bgHex(${hue},${30 + sat},70)`;
}).dp();
const { ft } = app.createApp(root, true, {
    default: {
        debug, log
    },
    statusbar: {
        debug: true
    },
    elevator: {
        focusable: {
            debug,
            debugExcludeTypes: ['onRectChange', 'removeFocusable']
        }
    },
    // canvas: {
    //   debug: true,
    //   debugIncludeTypes: ['clearRect']
    // },
    scrollable: {
        // default: {debug},
        container: {
            debug: true,
            debugExcludeTypes: ['ofCanvas', '_saveTransform', 'needRerender']
        },
        focus: {
            debug,
            debugExcludeTypes: ['removeFocusable']
        },
        canvas: {
            debug: false,
            debugIncludeTypes: ['clearRect']
        }
    }
});
const screenWidth = process.argv[2];
const screenHeight = process.argv[3];
if (screenWidth && screenHeight)
    ft.setSize(Number(screenWidth), Number(screenHeight)).dp();
else
    ft.setFullScreenMode().dp();
//# sourceMappingURL=sample-app-complex.js.map