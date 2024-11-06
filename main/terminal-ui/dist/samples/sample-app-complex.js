"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const fs_1 = __importDefault(require("fs"));
const rx = __importStar(require("rxjs"));
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
const index_1 = require("../index");
const debug = false;
const fout = fs_1.default.createWriteStream('terminal-table-complex.log');
const log = (0, nodejs_utils_1.createSimpleIndentLogger)(false, false, fout);
const table = (0, index_1.createTable)({
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
table.s.ft.setBorderType(index_1.TableBorderType.rowSeparator, true).dp();
table.s.ft.setBorderType(index_1.TableBorderType.border, true).dp();
const root = (0, index_1.createFlexContainer)({
    name: 'root', debug, log
    // debugExcludeTypes: ['ofCanvas', '_saveTransform', 'needRerender', 'renderBackgroundFor']
});
root.s.ft.alignItems('center').dp();
root.s.ft.justifyContent('center').dp();
root.s.ft.addChild(table).dp();
const rp = (0, index_1.createFlexContainer)({
    name: 'rightPanel', debug, log
});
rp.s.ft.alignItems('start').dp();
rp.s.ft.justifyContent('center').dp();
root.s.ft.addChild(rp).dp();
const rLabel = (0, index_1.createTextWidget)('choose one item from the table', {
    name: 'rightLabel', debug: true, log
});
rLabel.s.ft.setFocusable(true).dp();
rp.s.ft.addChild(rLabel).dp();
const hueInterval = Math.round(360 / SAMPLE_ROW_COUNT);
const saturation = Math.round(50 / SAMPLE_COLUMN_CNT);
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
    return `bgHsl(${hue},${30 + sat},70)`;
}).dp();
const { canvas } = index_1.app.createApp(root, {
    default: {
        debug, log
    },
    elevator: {
        focusable: {
            debug: true,
            debugExcludeTypes: ['onRectChange', 'removeFocusable']
        }
    },
    focusable: {
        debug: true,
        debugExcludeTypes: ['onRectChange', 'removeFocusable']
    },
    // canvas: {
    //   debug: true,
    //   debugIncludeTypes: ['clearRect']
    // },
    scrollable: {
        // default: {debug},
        core: {
            debugExcludeTypes: ['ofCanvas', '_saveTransform', 'needRerender']
        },
        focusable: {
            debug: true,
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
canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
process.stdout.on('resize', () => {
    canvas.s.ft.setBounding(0, 0, screenWidth ? Number(screenWidth) : process.stdout.columns, screenHeight ? Number(screenHeight) : process.stdout.rows).dp();
});
//# sourceMappingURL=sample-app-complex.js.map